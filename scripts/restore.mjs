import {resolve,join} from 'node:path';
import {existsSync,mkdirSync,copyFileSync,cpSync,readFileSync,readdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
const [sourceArg,targetArg]=process.argv.slice(2);
if(!sourceArg||!targetArg){console.error('Uso: npm run restore -- /carpeta/descomprimida /nuevo/directorio/de/datos\nDetén el servidor primero. El destino debe estar vacío.');process.exit(1);}
const source=resolve(sourceArg),target=resolve(targetArg);
if(!existsSync(join(source,'library.sqlite')))throw new Error('La carpeta de origen no contiene library.sqlite.');
if(existsSync(target)&&readdirSync(target).length)throw new Error('El destino debe estar vacío para no sobrescribir tu biblioteca.');
const verify=new DatabaseSync(join(source,'library.sqlite'),{readOnly:true});if(verify.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw new Error('La base de datos no supera la comprobación de integridad.');verify.close();
mkdirSync(target,{recursive:true,mode:0o700});copyFileSync(join(source,'library.sqlite'),join(target,'library.sqlite'));for(const sub of ['books','covers'])if(existsSync(join(source,sub)))cpSync(join(source,sub),join(target,sub),{recursive:true});
const db=new DatabaseSync(join(target,'library.sqlite'));db.exec('DELETE FROM sessions');db.close();console.log('Copia restaurada. Configura DATA_DIR con el nuevo directorio y arranca el servidor.');
