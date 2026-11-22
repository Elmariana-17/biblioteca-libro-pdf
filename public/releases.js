export function setupReleases({api,json,toast,escape,isAdmin,getBooks,reload}){
 const $=s=>document.querySelector(s);let items=[],push={},subscribed={};
 try{subscribed=JSON.parse(localStorage.getItem('release-watches')||'{}');}catch{}
 const format=date=>new Date(date).toLocaleString('es-MX',{dateStyle:'long',timeStyle:'short'});
 const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone;
 $('#release-zone').textContent='Horario de tu dispositivo: '+timezone;
 const reset=()=>{$('#release-form').reset();$('#release-id').value='';$('#release-status').textContent='';};
 $('#release-reset').onclick=reset;
 function render(){
  const visible=items.filter(r=>!r.cancelled);$('#releases-section').hidden=!visible.length;
  $('#releases-list').innerHTML=visible.map(r=>`<article class="release-card"><div><span class="eyebrow">${r.available?'YA DISPONIBLE':'PRÓXIMAMENTE'}</span><h3>${escape(r.title)}</h3><p>${escape(r.description)}</p><p><time datetime="${r.publishAt}">${escape(format(r.publishAt))}</time> · ${escape(timezone)}</p>${!r.available&&Date.parse(r.publishAt)<=Date.now()?'<p class="muted">Estamos preparando la publicación. Te avisaremos cuando esté disponible.</p>':''}</div>${r.available?`<button class="primary" data-open="${r.bookId}">Leer ahora</button>`:`<button class="secondary" data-watch="${r.id}">${subscribed[r.id]?'Cancelar aviso':'Avisarme'}</button>`}</article>`).join('');
  $('#push-help').textContent=push.enabled?'Avisos opcionales en este teléfono, sin crear cuenta. En iPhone, abre la web desde su icono en la pantalla de inicio.':'Los avisos del teléfono estarán disponibles cuando esta biblioteca tenga una dirección HTTPS.';
  if(isAdmin()){
   const selected=$('#release-book').value;$('#release-book').innerHTML='<option value="">Lo subiré después</option>'+getBooks().map(b=>`<option value="${b.id}">${escape(b.title)}</option>`).join('');$('#release-book').value=selected;
   $('#release-admin-list').innerHTML=items.map(r=>`<article class="release-card"><div><h3>${escape(r.title)}</h3><p>${escape(format(r.publishAt))} · ${r.cancelled?'Cancelado':r.available?'Publicado':r.bookId?'Programado':'Falta vincular el libro'}</p><p class="muted">${r.subscribers} avisos solicitados · ${r.sent} enviados</p></div>${r.cancelled?'':`<div><button class="secondary" data-release-edit="${r.id}">Editar anuncio</button><button class="text-button" data-release-cancel="${r.id}">Cancelar publicación</button></div>`}</article>`).join('');
  }
 }
 async function refresh(){try{const result=await api('/releases');const newlyReady=result.releases.some(r=>r.available&&!items.some(old=>old.id===r.id&&old.available)&&!getBooks().some(b=>b.id===r.bookId));items=result.releases;push=result.push;render();if(newlyReady)await reload();}catch{}}
 $('#release-form').onsubmit=async e=>{e.preventDefault();e.submitter.disabled=true;try{const date=new Date($('#release-date').value);if(!Number.isFinite(date.getTime()))throw new Error('Elige una fecha válida.');const id=$('#release-id').value;await api('/releases'+(id?'/'+id:''),json(id?'PUT':'POST',{title:$('#release-title').value,publishAt:date.toISOString(),description:$('#release-description').value,bookId:$('#release-book').value||null}));reset();await reload();$('#release-status').textContent='Publicación guardada. '+format(date);}catch(e){$('#release-status').textContent=e.message;}finally{e.submitter.disabled=false;}};
 $('#release-admin-list').onclick=async e=>{const b=e.target.closest('button');if(!b)return;const id=b.dataset.releaseEdit||b.dataset.releaseCancel,r=items.find(r=>r.id===id);if(!r)return;if(b.dataset.releaseEdit){$('#release-id').value=id;$('#release-title').value=r.title;$('#release-description').value=r.description;const date=new Date(r.publishAt);$('#release-date').value=new Date(date-date.getTimezoneOffset()*60000).toISOString().slice(0,16);$('#release-book').value=r.bookId||'';$('#release-title').focus();}else{b.disabled=true;try{await api('/releases/'+id,{method:'DELETE'});await reload();toast('Anuncio cancelado. Si aún no se publicaba, el libro permanece como borrador.');}catch(e){toast(e.message);}finally{b.disabled=false;}}};
 $('#releases-list').addEventListener('click',async e=>{const b=e.target.closest('[data-watch]');if(!b)return;const id=b.dataset.watch;b.disabled=true;
  try{
   if(!push.enabled)throw new Error('Aún falta activar la dirección HTTPS de esta biblioteca para recibir avisos.');
   const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1;
   if(ios&&!matchMedia('(display-mode: standalone)').matches&&!navigator.standalone)throw new Error('En iPhone: abre en Safari, toca Compartir → Añadir a pantalla de inicio y vuelve desde ese icono para tocar Avisarme.');
   if(!isSecureContext||!('serviceWorker'in navigator)||!('PushManager'in window)||!('Notification'in window))throw new Error('Este navegador no admite estos avisos. Prueba con Safari en iPhone o Chrome en Android.');
   // Ask in the click gesture before awaiting service-worker readiness (required by iOS).
   if(!subscribed[id]&&Notification.permission!=='granted'&&await Notification.requestPermission()!=='granted')throw new Error('No se activó el aviso. Puedes permitir las notificaciones desde los ajustes del navegador.');
   const reg=await navigator.serviceWorker.ready;let subscription=await reg.pushManager.getSubscription();
   if(!subscription&&!subscribed[id]){const key=Uint8Array.from(atob(push.publicKey.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));subscription=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});}
   if(!subscription){delete subscribed[id];localStorage.setItem('release-watches',JSON.stringify(subscribed));render();throw new Error('El permiso anterior ya no está activo. Pulsa Avisarme para renovarlo.');}
   let token=localStorage.getItem('push-device-token');if(!token){token=crypto.randomUUID();localStorage.setItem('push-device-token',token);}
   const remove=!!subscribed[id];await api('/releases/'+id+'/watch',json(remove?'DELETE':'POST',{subscription:subscription.toJSON(),token}));if(remove)delete subscribed[id];else subscribed[id]=true;localStorage.setItem('release-watches',JSON.stringify(subscribed));render();toast(remove?'Aviso cancelado.':'Te avisaremos en este teléfono cuando la historia esté publicada.');
  }catch(e){toast(e.message);}finally{b.disabled=false;}
 });
 // Refresh upcoming publications while the library is open, without disturbing the reader.
 setInterval(()=>{if(!document.hidden)refresh();},60000);
 return {refresh};
}
