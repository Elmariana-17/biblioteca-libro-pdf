import { DatabaseSync, backup } from 'node:sqlite';
import { existsSync, mkdirSync, readFileSync, copyFileSync, readdirSync, rmSync, writeFileSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash, randomUUID, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
const exec = promisify(execFile);
export const hashPassword = password => { const salt=randomBytes(16).toString('hex');return {salt,hash:scryptSync(password,salt,64).toString('hex')}; };
export function verifyPassword(password, credential) { return !!credential && typeof password==='string' && password.length<=256 && timingSafeEqual(Buffer.from(credential.hash,'hex'),scryptSync(password,credential.salt,64)); }
export function openStore(dir, root) {
 mkdirSync(dir,{recursive:true,mode:0o700});for(const p of ['books','covers','backups'])mkdirSync(join(dir,p),{recursive:true,mode:0o700});
 const db=new DatabaseSync(join(dir,'library.sqlite'));db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
 db.exec(`CREATE TABLE IF NOT EXISTS accounts(role TEXT PRIMARY KEY,salt TEXT NOT NULL,hash TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,role TEXT NOT NULL REFERENCES accounts(role),expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS books(id TEXT PRIMARY KEY,title TEXT NOT NULL,author TEXT NOT NULL,category TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',dedication TEXT NOT NULL DEFAULT '',format TEXT NOT NULL DEFAULT 'pdf',pages INTEGER NOT NULL,file TEXT NOT NULL,sha256 TEXT UNIQUE,cover TEXT,added TEXT NOT NULL,deleted TEXT,color TEXT DEFAULT 'sage');
 CREATE TABLE IF NOT EXISTS states(role TEXT NOT NULL REFERENCES accounts(role),book_id TEXT NOT NULL REFERENCES books(id),page INTEGER NOT NULL DEFAULT 1,position REAL NOT NULL DEFAULT 0,started INTEGER NOT NULL DEFAULT 0,finished INTEGER NOT NULL DEFAULT 0,favorite INTEGER NOT NULL DEFAULT 0,wishlist INTEGER NOT NULL DEFAULT 0,updated TEXT NOT NULL,PRIMARY KEY(role,book_id));
 CREATE TABLE IF NOT EXISTS notes(id TEXT PRIMARY KEY,role TEXT NOT NULL REFERENCES accounts(role),book_id TEXT NOT NULL REFERENCES books(id),page INTEGER NOT NULL,position REAL NOT NULL DEFAULT 0,text TEXT NOT NULL DEFAULT '',kind TEXT NOT NULL,updated TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);`);
 const setting=(k, fallback=null)=>{const row=db.prepare('SELECT value FROM settings WHERE key=?').get(k);return row?JSON.parse(row.value):fallback;};
 const setSetting=(k,v)=>db.prepare('INSERT INTO settings VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(k,JSON.stringify(v));
 if(!setting('libraryId'))setSetting('libraryId',randomUUID());
 if(!setting('migrated')){
   const legacy=join(dir,'library.json'), creds=join(dir,'credentials.json');
   if(existsSync(legacy))copyFileSync(legacy,join(dir,'library.pre-v2.json'));
   db.exec('BEGIN');try{
    if(existsSync(creds)){const values=JSON.parse(readFileSync(creds));for(const role of ['admin','reader'])if(values[role])db.prepare('INSERT OR IGNORE INTO accounts(role,salt,hash) VALUES(?,?,?)').run(role,values[role].salt,values[role].hash);}
    const old=existsSync(legacy)?JSON.parse(readFileSync(legacy)):{books:[],progress:{}};
    if(!existsSync(legacy)&&existsSync(join(root,'seed/sample.pdf'))){copyFileSync(join(root,'seed/sample.pdf'),join(dir,'books/sample.pdf'));old.books.push({id:'sample',title:'Donde empieza la calma',author:'Entre páginas',category:'Relatos',pages:5,added:new Date().toISOString()});}
    for(const b of old.books){const file=b.id+'.pdf',path=join(dir,'books',file);const hash=existsSync(path)?createHash('sha256').update(readFileSync(path)).digest('hex'):null;const duplicate=hash&&db.prepare('SELECT id FROM books WHERE sha256=?').get(hash);db.prepare('INSERT OR IGNORE INTO books(id,title,author,category,description,pages,file,sha256,added,color) VALUES(?,?,?,?,?,?,?,?,?,?)').run(b.id,b.title,b.author||'Autor desconocido',b.category||'Sin categoría',b.description||'',b.pages,file,duplicate?null:hash,b.added||new Date().toISOString(),b.color||'sage');
    const p=old.progress?.[b.id];if(p&&db.prepare("SELECT role FROM accounts WHERE role='reader'").get())db.prepare('INSERT OR IGNORE INTO states(role,book_id,page,started,finished,updated) VALUES(?,?,?,?,?,?)').run('reader',b.id,p.page,1,p.finished?1:0,p.updated||new Date().toISOString());}
    setSetting('migrated',true);db.exec('COMMIT');
   }catch(e){db.exec('ROLLBACK');throw e;}
 }
 // Keep immutable account IDs so existing notes, progress and sessions survive renaming.
 const accountColumns=new Set(db.prepare('PRAGMA table_info(accounts)').all().map(c=>c.name));
 if(!accountColumns.has('username'))db.exec('ALTER TABLE accounts ADD COLUMN username TEXT');
 if(!accountColumns.has('display_name'))db.exec('ALTER TABLE accounts ADD COLUMN display_name TEXT');
 if(!accountColumns.has('permission'))db.exec("ALTER TABLE accounts ADD COLUMN permission TEXT NOT NULL DEFAULT 'reader'");
 db.prepare("UPDATE accounts SET username=CASE WHEN role='reader' THEN 'lectora' ELSE role END WHERE username IS NULL").run();
 db.prepare("UPDATE accounts SET display_name=CASE WHEN role='admin' THEN 'Administrador' WHEN role='reader' THEN 'Lectora' ELSE username END WHERE display_name IS NULL").run();
 db.prepare("UPDATE accounts SET permission='admin' WHERE role='admin'").run();
 db.exec('CREATE UNIQUE INDEX IF NOT EXISTS accounts_username ON accounts(username COLLATE NOCASE)');
 const list=(role,trash=false)=>db.prepare(`SELECT b.*,s.page,s.position,s.started,s.finished,s.favorite,s.wishlist,s.updated AS progress_updated FROM books b LEFT JOIN states s ON s.book_id=b.id AND s.role=? WHERE b.deleted IS ${trash?'NOT ':''}NULL ORDER BY b.added DESC`).all(role).map(row=>serialize(row));
 function serialize(r){return {id:r.id,publishAt:r.publish_at||null,title:r.title,author:r.author,category:r.category,description:r.description,dedication:r.dedication,format:r.format,pages:r.pages,added:r.added,deleted:r.deleted,color:r.color,hasCover:!!r.cover,coverVersion:r.cover,favorite:!!r.favorite,wishlist:!!r.wishlist,progress:r.started?{page:r.page,position:r.position,finished:!!r.finished,updated:r.progress_updated}:null};}
 let backupPromise=null;
 async function makeBackup(){if(backupPromise)return backupPromise;backupPromise=(async()=>{
   const stamp=new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomBytes(3).toString('hex'),folder=join(dir,'backups',stamp);mkdirSync(folder,{mode:0o700});
   try{await backup(db,join(folder,'library.sqlite'));const snap=new DatabaseSync(join(folder,'library.sqlite'),{readOnly:true});const rows=snap.prepare('SELECT file,cover FROM books').all();snap.close();for(const sub of ['books','covers'])mkdirSync(join(folder,sub));for(const row of rows){for(const [sub,name] of [['books',row.file],['covers',row.cover]])if(name&&existsSync(join(dir,sub,name)))copyFileSync(join(dir,sub,name),join(folder,sub,name));}
   writeFileSync(join(folder,'RESTORE.txt'),'Detén el servidor. Conserva un respaldo de DATA_DIR. Copia library.sqlite, books y covers a un DATA_DIR vacío. Inicia con DATA_DIR apuntando a esa carpeta. Las sesiones se invalidan al restaurar con npm run restore.\n');
   await exec('tar',['-czf',join(dir,'backups',stamp+'.tar.gz'),'-C',folder,'.']);setSetting('lastBackup',new Date().toISOString());
   const archives=readdirSync(join(dir,'backups')).filter(n=>n.endsWith('.tar.gz')).sort().reverse();for(const name of archives.slice(7))rmSync(join(dir,'backups',name));return stamp+'.tar.gz';
   }finally{rmSync(folder,{recursive:true,force:true});}
 })().finally(()=>backupPromise=null);return backupPromise;}
 return {db,setting,setSetting,list,makeBackup,dir};
}
