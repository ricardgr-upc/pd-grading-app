// The synchronous cache is hydrated before connect completes. Writes become
// visible to callers only after the IndexedDB transaction has committed.
export function createAssessmentStorage({legacy=globalThis.localStorage,idb=globalThis.indexedDB,database='pd-assessments-v1'}={}){
 let db,scope='',cache=new Map(),queue=Promise.resolve(),channel;
 const serial=fn=>{const task=queue.then(fn);queue=task.catch(()=>{});return task;};
 const failure=e=>new Error(`Local database could not save your work (${e?.name||'storage error'}). Keep this tab open and download an emergency backup. Do not clear website data.`);
 async function databaseOpen(){
  if(db)return db;if(!idb)throw new Error('This browser cannot open IndexedDB. Keep existing website data and use your backup for recovery.');
  db=await new Promise((resolve,reject)=>{const r=idb.open(database,1);r.onupgradeneeded=()=>r.result.createObjectStore('records');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(failure(r.error));r.onblocked=()=>reject(new Error('Close other assessment tabs before opening the local database.'));});
  db.onversionchange=()=>{db.close();db=null;};return db;
 }
 async function readAll(prefix){const database=await databaseOpen();return new Promise((resolve,reject)=>{const tx=database.transaction('records','readonly'),out=new Map(),r=tx.objectStore('records').openCursor();r.onsuccess=()=>{const c=r.result;if(c){if(String(c.key).startsWith(prefix))out.set(c.key,c.value);c.continue();}};tx.oncomplete=()=>resolve(out);tx.onabort=()=>reject(failure(tx.error));tx.onerror=()=>{};});}
 async function write(entries){const database=await databaseOpen();await new Promise((resolve,reject)=>{const tx=database.transaction('records','readwrite');for(const [k,v]of entries)tx.objectStore('records').put(v,k);tx.oncomplete=resolve;tx.onabort=()=>reject(failure(tx.error));tx.onerror=()=>{};});}
 return {
  async open(namespace){return serial(async()=>{
   const prefix=namespace+':',existing=await readAll(prefix),old=[];
   // Enumerate only the authenticated account/dataset. Never migrate tokens.
   for(let i=0;i<legacy.length;i++){const k=legacy.key(i);if(k?.startsWith(prefix)){const v=legacy.getItem(k);if(v!==null){JSON.parse(v);if(existing.has(k)&&existing.get(k)!==v)throw new Error('Old and new local records differ. Keep both browser copies and your backups; close other assessment tabs before recovery.');old.push([k,v]);}}}
   if(old.length)await write(old);
   const verified=await readAll(prefix);for(const [k,v]of old)if(verified.get(k)!==v)throw new Error('Local migration verification failed. Original browser records have been retained.');
   scope=namespace;cache=verified;
   // Retain a value if another tab changed it during migration.
   for(const [k,v]of old)if(legacy.getItem(k)===v)legacy.removeItem(k);
   if(typeof BroadcastChannel!=='undefined'){channel?.close();channel=new BroadcastChannel('pd-assessment-storage');channel.onmessage=e=>{if(e.data?.scope===scope&&Array.isArray(e.data.entries))for(const [k,v]of e.data.entries)cache.set(k,v);};}
   return {migrated:old.length};
  });},
  getItem(k){return cache.get(k)??null;},
  setItem(k,v){return this.setItems([[k,String(v)]]);},
  setItems(entries){return serial(async()=>{if(!scope||entries.some(([k])=>!k.startsWith(scope+':')))throw new Error('Local database is not connected to this account.');try{await write(entries);}catch(e){throw failure(e);}for(const [k,v]of entries)cache.set(k,v);channel?.postMessage({scope,entries});});},
  close(){channel?.close();db?.close();db=null;cache.clear();scope='';}
 };
}
