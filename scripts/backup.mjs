import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {openStore} from '../lib/store.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');const store=openStore(resolve(process.env.DATA_DIR||join(root,'data')),root);
try{console.log('Copia creada:',await store.makeBackup());}finally{store.db.close();}
