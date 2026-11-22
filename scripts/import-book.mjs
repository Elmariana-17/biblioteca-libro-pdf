// Import a local PDF from the trusted administrator's terminal, without copying it into source control.
import {resolve,dirname,join,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {randomBytes,createHash} from 'node:crypto';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {openStore} from '../lib/store.mjs';
const args=process.argv.slice(2),source=args[0];const option=name=>{const i=args.indexOf('--'+name);return i>=0?args[i+1]:undefined;};
if(!source||extname(source).toLowerCase()!=='.pdf')throw new Error('Uso: npm run import -- /ruta/libro.pdf [--title título] [--author autor] [--category categoría] [--cover /ruta/portada.png]');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),store=openStore(resolve(process.env.DATA_DIR||join(root,'data')),root),db=store.db;
try{const bytes=readFileSync(resolve(source));if(bytes.length>50*1024*1024)throw new Error('El límite es de 50 MB.');const hash=createHash('sha256').update(bytes).digest('hex');const existing=db.prepare('SELECT id,title,deleted FROM books WHERE sha256=?').get(hash);if(existing){console.log('El libro ya existe:',existing.title,existing.deleted?'(en la papelera)':'');process.exitCode=0;}else{
 const task=getDocument({data:new Uint8Array(bytes),isEvalSupported:false});let info,pages;try{const pdf=await task.promise;pages=pdf.numPages;info=(await pdf.getMetadata()).info;}finally{await task.destroy();}
 const title=option('title')||info.Title||source.split('/').pop().replace(/\.pdf$/i,''),author=option('author')||info.Author||'Autor desconocido',id=randomBytes(12).toString('hex'),file=id+'.pdf';let cover=null;
 if(option('cover')){const image=readFileSync(resolve(option('cover')));if(!image.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw new Error('La portada local debe ser PNG.');cover=id+'.png';writeFileSync(join(store.dir,'covers',cover),image);}
 writeFileSync(join(store.dir,'books',file),bytes);db.prepare('INSERT INTO books(id,title,author,category,description,format,pages,file,sha256,cover,added,color) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(id,title.slice(0,150),author.slice(0,100),(option('category')||'Sin categoría').slice(0,60),(option('description')||'').slice(0,600),'pdf',pages,file,hash,cover,new Date().toISOString(),'rose');console.log(`Importado: ${title} · ${pages} páginas. El archivo original no se ha modificado.`);
 }}finally{db.close();}
