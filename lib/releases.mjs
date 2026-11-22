import * as webpush from 'web-push';
import {createHash, randomBytes} from 'node:crypto';
const digest=s=>createHash('sha256').update(s).digest('hex');
const error=(status,message)=>Object.assign(new Error(message),{status});
export function validSubscription(s){
 try {const u=new URL(s.endpoint);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&u.href.length<2048&&(
 ['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'].includes(u.hostname)||u.hostname.endsWith('.push.apple.com')||u.hostname.endsWith('.notify.windows.com'))&&/^[\w-]{87}$/.test(s.keys?.p256dh)&&/^[\w-]{22}$/.test(s.keys?.auth);}catch{return false;}
}
export function createReleases(store,{send=webpush.sendNotification.bind(webpush)}={}){
 const db=store.db;
 if(!db.prepare('PRAGMA table_info(books)').all().some(c=>c.name==='publish_at'))db.exec('ALTER TABLE books ADD COLUMN publish_at TEXT');
 db.exec(`CREATE TABLE IF NOT EXISTS releases(id TEXT PRIMARY KEY,title TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',publish_at TEXT NOT NULL,book_id TEXT UNIQUE REFERENCES books(id),cancelled INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS push_subscriptions(id TEXT PRIMARY KEY,owner TEXT NOT NULL,subscription TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS release_watchers(release_id TEXT REFERENCES releases(id),subscriber_id TEXT REFERENCES push_subscriptions(id) ON DELETE CASCADE,sent INTEGER NOT NULL DEFAULT 0,attempts INTEGER NOT NULL DEFAULT 0,retry_at INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(release_id,subscriber_id));`);
 let keys=store.setting('pushKeys');if(!keys){keys=webpush.generateVAPIDKeys();store.setSetting('pushKeys',keys);}
 // Public URL must be supplied by deployment; no user-provided destination is used.
 const subject=process.env.PUBLIC_URL;
 const enabled=!!subject&&/^https:\/\//.test(subject);
 const publicConfig=()=>({enabled,publicKey:keys.publicKey});
 const list=(admin=false)=>db.prepare(`SELECT r.*,b.deleted,b.publish_at AS book_publish_at FROM releases r LEFT JOIN books b ON b.id=r.book_id ${admin?'':'WHERE r.cancelled=0'} ORDER BY r.publish_at DESC`).all().map(r=>({id:r.id,title:r.title,description:r.description,publishAt:r.publish_at,bookId:r.book_id,cancelled:!!r.cancelled,available:!!r.book_id&&!r.deleted&&r.book_publish_at<=new Date().toISOString(),...(admin?{subscribers:db.prepare('SELECT count(*) n FROM release_watchers WHERE release_id=?').get(r.id).n,sent:db.prepare('SELECT count(*) n FROM release_watchers WHERE release_id=? AND sent=1').get(r.id).n}: {})}));
 function save(v,id=randomBytes(12).toString('hex')){
  const title=typeof v.title==='string'?v.title.trim().slice(0,150):'',date=new Date(v.publishAt),bookId=v.bookId||null;
  if(!title||!Number.isFinite(date.getTime()))throw error(400,'Escribe el título, el día y la hora.');
  const old=db.prepare('SELECT * FROM releases WHERE id=?').get(id);
  if(old?.cancelled)throw error(400,'Este anuncio está cancelado. Crea uno nuevo.');
  if(bookId&&!db.prepare('SELECT id FROM books WHERE id=? AND deleted IS NULL').get(bookId))throw error(400,'Elige un libro disponible.');
  if(bookId&&db.prepare('SELECT id FROM releases WHERE book_id=? AND id<>?').get(bookId,id))throw error(409,'Ese libro ya tiene un anuncio. Edita el anuncio existente.');
  const publishAt=date.toISOString();
  db.exec('BEGIN');try{
   if(old?.book_id&&old.book_id!==bookId)db.prepare('UPDATE books SET publish_at=? WHERE id=?').run('9999-12-31T23:59:59.999Z',old.book_id);
   db.prepare('INSERT INTO releases(id,title,description,publish_at,book_id) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,description=excluded.description,publish_at=excluded.publish_at,book_id=excluded.book_id').run(id,title,String(v.description||'').slice(0,600),publishAt,bookId);
   if(bookId)db.prepare('UPDATE books SET publish_at=? WHERE id=?').run(publishAt,bookId);
   db.exec('COMMIT');return {id};
  }catch(e){db.exec('ROLLBACK');throw e;}
 }
 function cancel(id){const r=db.prepare('SELECT * FROM releases WHERE id=?').get(id);if(!r)throw error(404,'Anuncio no encontrado.');db.exec('BEGIN');try{db.prepare('UPDATE releases SET cancelled=1 WHERE id=?').run(id);if(r.book_id&&r.publish_at>new Date().toISOString())db.prepare('UPDATE books SET publish_at=? WHERE id=?').run('9999-12-31T23:59:59.999Z',r.book_id);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}}
 function watch(id,v,remove=false){
  if(typeof v.token!=='string'||!/^[\w-]{32,128}$/.test(v.token))throw error(400,'Dispositivo no válido.');
  if(!validSubscription(v.subscription))throw error(400,'Suscripción de notificaciones no válida.');
  const sid=digest(v.subscription.endpoint),owner=digest(v.token),existing=db.prepare('SELECT owner FROM push_subscriptions WHERE id=?').get(sid);
  if(existing&&existing.owner!==owner)throw error(403,'La suscripción pertenece a otro dispositivo.');
  if(remove){db.prepare('DELETE FROM release_watchers WHERE release_id=? AND subscriber_id=?').run(id,sid);return {ok:true};}
  if(!enabled)throw error(503,'Los avisos estarán disponibles al publicar la web con HTTPS.');
  if(!db.prepare('SELECT id FROM releases WHERE id=? AND cancelled=0').get(id))throw error(404,'Anuncio no disponible.');
  db.prepare('INSERT INTO push_subscriptions VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET subscription=excluded.subscription').run(sid,owner,JSON.stringify({endpoint:v.subscription.endpoint,keys:v.subscription.keys}));
  db.prepare('INSERT OR IGNORE INTO release_watchers(release_id,subscriber_id) VALUES(?,?)').run(id,sid);return {ok:true};
 }
 let running=false;
 async function tick(){if(running||!enabled)return;running=true;try{
  const pending=db.prepare(`SELECT w.*,s.subscription,r.title,r.book_id FROM release_watchers w JOIN push_subscriptions s ON s.id=w.subscriber_id JOIN releases r ON r.id=w.release_id JOIN books b ON b.id=r.book_id WHERE w.sent=0 AND w.retry_at<=? AND r.cancelled=0 AND r.publish_at<=? AND b.deleted IS NULL AND b.publish_at<=? LIMIT 30`).all(Date.now(),new Date().toISOString(),new Date().toISOString());
  for(const r of pending){try{await send(JSON.parse(r.subscription),JSON.stringify({title:'Una nueva historia te espera',body:r.title,url:'/?book='+encodeURIComponent(r.book_id),tag:'release-'+r.release_id}),{TTL:86400,timeout:10000,vapidDetails:{subject,publicKey:keys.publicKey,privateKey:keys.privateKey}});db.prepare('UPDATE release_watchers SET sent=1 WHERE release_id=? AND subscriber_id=?').run(r.release_id,r.subscriber_id);}catch(e){if([404,410].includes(e.statusCode))db.prepare('DELETE FROM push_subscriptions WHERE id=?').run(r.subscriber_id);else db.prepare('UPDATE release_watchers SET attempts=attempts+1,retry_at=? WHERE release_id=? AND subscriber_id=?').run(Date.now()+Math.min(86400000,60000*2**Math.min(r.attempts,10)),r.release_id,r.subscriber_id);}}
 }finally{running=false;}}
 return {list,save,cancel,watch,tick,publicConfig};
}
