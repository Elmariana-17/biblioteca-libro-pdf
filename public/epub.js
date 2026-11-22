import {unzipSync,strFromU8} from '/vendor/fflate.mjs';
import DOMPurify from '/vendor/purify.mjs';
const decoder=new TextDecoder();
const parse=(s)=>new DOMParser().parseFromString(s,'application/xml');
const nodes=(d,name)=>[...d.getElementsByTagNameNS('*',name)];
function path(base,relative){const result=new URL(relative,'https://epub.invalid/'+base);if(result.origin!=='https://epub.invalid')return null;return decodeURIComponent(result.pathname.slice(1));}
export function readEpub(bytes){
 let total=0,count=0;const files=unzipSync(bytes,{filter:f=>{count++;total+=f.originalSize;if(count>5000||f.originalSize>30*1024*1024||total>150*1024*1024)throw new Error('Este EPUB supera el límite de contenido descomprimido (150 MB).');return true;}});
 const xml=name=>{if(!files[name])throw new Error('El EPUB está incompleto: '+name);return decoder.decode(files[name]);};
 if(files['META-INF/encryption.xml'])throw new Error('Este EPUB contiene recursos cifrados. Usa una copia sin DRM ni fuentes cifradas.');
 const container=parse(xml('META-INF/container.xml'));const opfPath=nodes(container,'rootfile')[0]?.getAttribute('full-path');if(!opfPath)throw new Error('No se encontró el índice del EPUB.');
 const opf=parse(xml(opfPath)),items=new Map(nodes(opf,'item').map(n=>[n.getAttribute('id'),{path:path(opfPath,n.getAttribute('href')),type:n.getAttribute('media-type'),properties:n.getAttribute('properties')||''}]));
 const chapters=nodes(opf,'itemref').filter(n=>n.getAttribute('linear')!=='no').map(n=>items.get(n.getAttribute('idref'))).filter(n=>n&&files[n.path]&&/html/.test(n.type));if(!chapters.length)throw new Error('Este EPUB no tiene capítulos legibles.');
 const urls=new Map();
 function imageURL(name){if(!name||!files[name])return null;if(urls.has(name))return urls.get(name);const ext=name.split('.').pop().toLowerCase(),type={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp'}[ext];if(!type)return null;const url=URL.createObjectURL(new Blob([files[name]],{type}));urls.set(name,url);return url;}
 function documentFor(index){const chapter=chapters[index];const source=new DOMParser().parseFromString(xml(chapter.path),'text/html');source.querySelectorAll('script,style,link,iframe,object,embed,form,svg,math,video,audio').forEach(n=>n.remove());for(const el of source.querySelectorAll('*')){el.removeAttribute('style');el.removeAttribute('class');for(const attr of [...el.attributes])if(/^on/i.test(attr.name))el.removeAttribute(attr.name);}
 for(const img of source.querySelectorAll('img')){const src=imageURL(path(chapter.path,img.getAttribute('src')||''));img.removeAttribute('srcset');if(src)img.setAttribute('src',src);else img.remove();}
 for(const a of source.querySelectorAll('a')){const href=a.getAttribute('href');a.removeAttribute('href');if(href&&!/^(?:https?:|javascript:|data:|mailto:)/i.test(href)){const target=path(chapter.path,href);const i=chapters.findIndex(c=>c.path===target);if(i>=0){a.dataset.chapter=String(i+1);a.dataset.anchor=href.split('#')[1]||'';a.setAttribute('href','#');}}}
 return DOMPurify.sanitize(source.body.innerHTML,{USE_PROFILES:{html:true},ADD_ATTR:['data-chapter','data-anchor'],FORBID_TAGS:['style','form','input','button','textarea','select'],FORBID_ATTR:['style','srcset'],ALLOW_UNKNOWN_PROTOCOLS:false});}
 const textFor=i=>{const doc=new DOMParser().parseFromString(xml(chapters[i].path),'text/html');doc.querySelectorAll('script,style').forEach(x=>x.remove());return doc.body.textContent.replace(/\s+/g,' ').trim();};
 const coverId=nodes(opf,'meta').find(n=>n.getAttribute('name')==='cover')?.getAttribute('content');const cover=[...items.values()].find(n=>n.properties.split(/\s+/).includes('cover-image'))||items.get(coverId);const coverURL=cover?imageURL(cover.path):null;
 return {title:nodes(opf,'title')[0]?.textContent||'',author:nodes(opf,'creator')[0]?.textContent||'',chapters,coverURL,html:documentFor,text:textFor,titleFor:i=>{const doc=new DOMParser().parseFromString(xml(chapters[i].path),'text/html');return doc.querySelector('h1,h2,h3,title')?.textContent?.trim()||`Capítulo ${i+1}`;},destroy(){for(const url of urls.values())URL.revokeObjectURL(url);}};
}
