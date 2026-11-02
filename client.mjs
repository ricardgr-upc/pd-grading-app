import {recordStages,validateQuestions} from './questions.mjs';
import {stages,teachers,key,value,mergeThree,calculate,csvCell,scoringFormula} from './core.mjs';
export const repository='ricardgr-upc/pd_grading_ibteam';
const enc=x=>Array.from(new TextEncoder().encode(x),b=>String.fromCharCode(b)).join('');
export const encode64=x=>btoa(enc(x));
export const decode64=x=>new TextDecoder().decode(Uint8Array.from(atob(x.replace(/\s/g,'')),c=>c.charCodeAt(0)));
export async function fingerprint(x,cryptoImpl=globalThis.crypto){return Array.from(new Uint8Array(await cryptoImpl.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(x)))),b=>b.toString(16).padStart(2,'0')).join('');}
export function createClient({fetchImpl=globalThis.fetch.bind(globalThis),storage=globalThis.localStorage,cryptoImpl=globalThis.crypto}={}){
 let token='',identity=null,bootstrap=null,policyHash='',rosterHash='',namespace='locked',queue=Promise.resolve();
 const serial=fn=>{const task=queue.then(fn);queue=task.catch(()=>{});return task;};
 async function github(endpoint,options={}){
  const r=await fetchImpl(`https://api.github.com/${endpoint}`,{...options,headers:{'Accept':'application/vnd.github+json','Authorization':`Bearer ${token}`,'X-GitHub-Api-Version':'2022-11-28',...(options.body?{'Content-Type':'application/json'}:{})},signal:AbortSignal.timeout(30000),cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
  if(r.status===404&&options.missing)return null;
  if(!r.ok){
   let detail='';try{detail=String((await r.json()).message||'');}catch{}
   detail=detail.split(token).join('[redacted]').replace(/github_pat_[A-Za-z0-9_]+|gh[pousr]_[A-Za-z0-9_]+/g,'[redacted]').slice(0,240);
   const action=endpoint==='user'?'checking your GitHub account':endpoint.includes('/contents/')?(options.method==='PUT'?'saving assessment files':'reading private assessment files'):'checking private repository access';
   if((r.status===403||r.status===429)&&(r.headers.get('x-ratelimit-remaining')==='0'||r.headers.get('retry-after')||/rate limit|abuse detection/i.test(detail))){
    const reset=Number(r.headers.get('x-ratelimit-reset'));const when=reset?` Retry after ${new Date(reset*1000).toLocaleTimeString()}.`:' Wait before retrying.';
    throw new Error(`GitHub rate limit reached while ${action}.${when} Local work is retained.`);
   }
   const messages={401:'GitHub sign-in expired or the token is invalid. Reconnect; locally saved work is retained.',403:`GitHub refused access while ${action} (403). ${detail||'Access was denied.'} Check the token resource owner is ricardgr-upc, selected repository is pd_grading_ibteam, and repository Contents permission is Read and write. If the token shows Pending, its owner must approve it.`,404:'Private repository or file is unavailable. Check your token’s selected repository.',409:'GitHub changed during this sync. Retry to fetch and reconcile the latest version.',422:'GitHub rejected the update. Retry after checking the latest repository state.'};
   throw new Error(messages[r.status]||`GitHub request failed while ${action} (${r.status}). Local work is retained.`);
  }
  return r.json();
 }
 const repoApi=()=>`repos/${repository}`;
 async function remoteFile(p){
  const r=await github(`${repoApi()}/contents/${p}`,{missing:true});if(!r)return {sha:null,data:null};
  // Contents responses omit inline data above 1 MB. Read the immutable blob
  // identified by the returned SHA, keeping content and sync revision together.
  const payload=r.encoding==='none'||!r.content?await github(`${repoApi()}/git/blobs/${r.sha}`):r;
  if(typeof payload.content!=='string'||!payload.content.trim())throw new Error(`GitHub returned empty content for ${p}. Local work is retained; retry without clearing browser data.`);
  let data;try{data=JSON.parse(decode64(payload.content));}catch{throw new Error(`Cannot read JSON in ${p}. The saved file may be incomplete or invalid. Local work is retained; do not clear browser data.`);}
  return {sha:r.sha,data};
 }
 const getGroup=g=>{const x=bootstrap.roster.groups.find(x=>x.id===g);if(!x)throw new Error('Unknown group');return x;};
 const checkStage=s=>{if(!recordStages.includes(s))throw new Error('Unknown assessment view');};
 const empty=(g,s)=>({schemaVersion:1,policyVersion:bootstrap.policy.version,policyHash,rosterHash,group:g,stage:s,fields:{},history:[]});
 const recordKey=(g,s)=>{getGroup(g);checkStage(s);return `${namespace}:record:${g}:${s}`;};
 const fresh=(g,s)=>({doc:empty(g,s),base:empty(g,s),sha:null,dirty:false,lastSync:null,conflicts:[],takeovers:[]});
 function state(g,s){const text=storage.getItem(recordKey(g,s));if(!text)return fresh(g,s);const st=JSON.parse(text);validate(st.doc);validate(st.base);if(!Array.isArray(st.conflicts))throw new Error('Invalid local conflict record. Restore a backup.');return st;}
 function save(g,s,st){storage.setItem(recordKey(g,s),JSON.stringify(st));}
 function assertOwner(g,teacher,takeover){if(!teachers.includes(teacher))throw new Error('Select a teacher');if(getGroup(g).reviewer!==teacher&&!takeover)throw new Error('Explicit takeover is required for another teacher’s group');}
 function validate(doc){
  if(!doc||doc.schemaVersion!==1||doc.policyVersion!==bootstrap.policy.version||doc.policyHash!==policyHash||doc.rosterHash!==rosterHash)throw new Error('Incompatible assessment, policy or coded roster. Migration is required.');
  const g=getGroup(doc.group);checkStage(doc.stage);
  if(!doc.fields||typeof doc.fields!=='object'||Array.isArray(doc.fields)||!Array.isArray(doc.history))throw new Error('Invalid assessment');
  if(doc.history.some(x=>!x||typeof x.id!=='string'||!teachers.includes(x.by)||typeof x.at!=='string'))throw new Error('Invalid assessment history');
  if(doc.stage==='questions')return validateQuestions(doc,bootstrap.policy,g);
  const allowed=new Map();
  for(const c of bootstrap.policy.criteria)for(const comp of c.components.filter(x=>x.stage===doc.stage))for(const tier of ['sufficient','excellence'])for(const o of comp[tier])for(const subject of comp.scope==='group'?['group']:g.students.map(x=>x.id))for(const field of ['status','note','evidence'])allowed.set(key(o.id,subject,field),{o,subject,field});
  for(const [k,e]of Object.entries(doc.fields)){
   const a=allowed.get(k);if(!a||!e||!teachers.includes(e.by)||typeof e.at!=='string'||typeof e.value!=='string'||e.value.length>20000)throw new Error('Invalid assessment field');
   if(/\b[^\s@]+@[^\s@]+\.[^\s@]+\b|https?:\/\//i.test(e.value))throw new Error('Use neutral evidence codes or page numbers. Do not store emails or web/repository links.');
   if(a.field==='status'){
    if(!['pending','met','not','na'].includes(e.value))throw new Error('Invalid objective response');
    if(e.value==='na'&&(!a.o.conditional||!value(doc,a.o.id,a.subject,'note').trim()))throw new Error('N/A requires a conditional objective and an explanatory note');
   }
  }
  for(const c of bootstrap.policy.criteria)for(const comp of c.components.filter(x=>x.stage===doc.stage))for(const subject of comp.scope==='group'?['group']:g.students.map(x=>x.id))for(const tier of ['sufficient','excellence'])if(comp[tier].every(o=>value(doc,o.id,subject)==='na'))throw new Error('An entire tier cannot be excluded. Review the policy.');
  if(doc.history.some(x=>!x||typeof x.id!=='string'||!teachers.includes(x.by)||typeof x.at!=='string'))throw new Error('Invalid assessment history');
  return doc;
 }
 const history=(...lists)=>[...new Map(lists.flat().map(x=>[x.id,x])).values()].sort((a,b)=>a.at.localeCompare(b.at));
 const allDocs=g=>Object.fromEntries(stages.map(s=>[s,state(g,s).doc]));
 async function verifyMetadata(){for(const [p,expected]of [['data/policy.json',policyHash],['data/pseudonymous-roster.json',rosterHash]]){const r=await remoteFile(p);if(!r.data||await fingerprint(r.data,cryptoImpl)!==expected)throw new Error('The grading policy or coded roster changed. Back up your work and reload before syncing.');}}
 async function sync(b){
  assertOwner(b.group,b.teacher,b.takeover);await verifyMetadata();const st=state(b.group,b.stage);if(st.conflicts.length)return st;const p=`coded-assessments/${bootstrap.roster.datasetId}/${b.group}/${b.stage}.json`,r=await remoteFile(p),rd=r.data||empty(b.group,b.stage);validate(rd);
  const m=mergeThree(st.base.fields,st.doc.fields,rd.fields);st.doc={...st.doc,fields:m.merged,history:history(st.doc.history,rd.history)};st.base=rd;st.sha=r.sha;st.conflicts=m.conflicts;st.dirty=JSON.stringify(st.doc)!==JSON.stringify(rd);save(b.group,b.stage,st);
  if(m.conflicts.length)return st;
  validate(st.doc);
  if(st.dirty){const input={message:`Assessment: ${b.group} / ${b.stage} — ${b.teacher}`,content:encode64(JSON.stringify(st.doc,null,2)+'\n'),...(r.sha?{sha:r.sha}:{})};const result=await github(`${repoApi()}/contents/${p}`,{method:'PUT',body:JSON.stringify(input)});st.sha=result.content.sha;st.base=structuredClone(st.doc);st.dirty=false;}
  st.lastSync=new Date().toISOString();st.lastFetch=st.lastSync;save(b.group,b.stage,st);return st;
 }
 async function refreshAll(onProgress){
  await verifyMetadata();
  const meta={startedAt:new Date().toISOString(),finishedAt:null,processed:0,total:bootstrap.roster.groups.length*recordStages.length,error:null};
  const metaKey=`${namespace}:refresh-meta`;storage.setItem(metaKey,JSON.stringify(meta));
  for(const g of bootstrap.roster.groups)for(const s of recordStages){
   try{
    const st=state(g.id,s),p=`coded-assessments/${bootstrap.roster.datasetId}/${g.id}/${s}.json`,r=await remoteFile(p),rd=r.data||empty(g.id,s);validate(rd);
    if(!r.data&&Object.keys(st.base.fields).length)throw new Error('A previously saved assessment file is missing on GitHub. Local work has been preserved; review the repository before refreshing this group.');
    // Never clear an outstanding conflict merely because a second fetch sees the same remote base.
    if(!st.conflicts.length){
     const m=mergeThree(st.base.fields,st.doc.fields,rd.fields);
     const doc={...st.doc,fields:m.merged,history:history(st.doc.history,rd.history)};
     if(!m.conflicts.length)validate(doc);
     st.doc=doc;st.base=rd;st.sha=r.sha;st.conflicts=m.conflicts;st.dirty=JSON.stringify(doc)!==JSON.stringify(rd);st.lastFetch=new Date().toISOString();save(g.id,s,st);
    }
    meta.processed++;storage.setItem(metaKey,JSON.stringify(meta));onProgress?.({...meta});
   }catch(e){meta.error=e.message;storage.setItem(metaKey,JSON.stringify(meta));return meta;}
  }
  meta.finishedAt=new Date().toISOString();storage.setItem(metaKey,JSON.stringify(meta));return meta;
 }
 async function connect(secret){
  if(typeof secret!=='string'||!secret.trim())throw new Error('Enter your repository-scoped token');
  token=secret.trim();try{
   const user=await github('user');const meta=await github(repoApi());if(!meta.private)throw new Error('Assessment storage must be a private repository');if(meta.permissions?.push===false)throw new Error('Your account needs write access to the assessment repository');
   const p=await remoteFile('data/policy.json'),r=await remoteFile('data/pseudonymous-roster.json'),c=await remoteFile('data/course.json');
   if(!p.data||!r.data?.pseudonymous)throw new Error('The coded assessment dataset has not been configured');
   const localPolicy=await(await fetchImpl('./policy.json',{cache:'no-store'})).json();policyHash=await fingerprint(p.data,cryptoImpl);rosterHash=await fingerprint(r.data,cryptoImpl);
   if(policyHash!==await fingerprint(localPolicy,cryptoImpl))throw new Error('The published application and private policy differ. Reload the latest application.');
   if(!/^PD-[A-F0-9]{8}$/.test(r.data.datasetId)||!Array.isArray(r.data.groups))throw new Error('Invalid coded dataset');
   const ids=new Set();for(const g of r.data.groups){if(!/^G-[A-Z2-9]{4}$/.test(g.id)||!teachers.includes(g.reviewer)||Object.keys(g).some(k=>!['id','reviewer','students'].includes(k)))throw new Error('Roster must contain only coded group identifiers');for(const s of g.students){if(!/^S-[A-Z2-9]{6}$/.test(s.id)||ids.has(s.id)||Object.keys(s).length!==1)throw new Error('Roster must contain unique coded student identifiers');ids.add(s.id);}}
   identity={login:user.login,id:user.id};namespace=`pd-coded:${repository}:${user.id}:${rosterHash}`;bootstrap={policy:p.data,roster:r.data,course:c.data||{version:1,reportFormat:'',referenceStyle:'',deadlines:''},repo:repository};return structuredClone(identity);
  }catch(e){token='';identity=null;bootstrap=null;namespace='locked';throw e;}
 }
 async function api(p,b){
  if(!token||!identity||!bootstrap)throw new Error('Connect to GitHub before accessing assessments');
  const url=new URL(p,'https://local.invalid');
  if(url.pathname==='/api/bootstrap')return structuredClone(bootstrap);
  if(url.pathname==='/api/auth')return structuredClone(identity);
  if(url.pathname==='/api/group'){const g=url.searchParams.get('id');return Object.fromEntries(recordStages.map(s=>[s,state(g,s)]));}
  if(url.pathname==='/api/overview')return bootstrap.roster.groups.map(g=>{
   const records=stages.map(s=>state(g.id,s)),dates=records.map(st=>st.lastFetch||st.lastSync).filter(Boolean);
   return {group:g.id,students:g.students.map(s=>({id:s.id,...calculate(bootstrap.policy,allDocs(g.id),s.id)})),conflicts:records.reduce((n,st)=>n+st.conflicts.length,0),dirty:records.some(st=>st.dirty)||state(g.id,'questions').dirty,questionConflicts:state(g.id,'questions').conflicts.length,refreshedAt:dates.length===stages.length?dates.sort()[0]:null};
  });
  if(url.pathname==='/api/refresh-status'){const raw=storage.getItem(`${namespace}:refresh-meta`);if(!raw)return null;const meta=JSON.parse(raw),total=bootstrap.roster.groups.length*recordStages.length;return meta.total===total?meta:{...meta,total,finishedAt:null,error:'Defence questions were added after this refresh. Refresh all groups again.'};}
  if(url.pathname==='/api/refresh-all')return serial(()=>refreshAll(b?.onProgress));
  if(url.pathname==='/api/response')return serial(()=>{
   assertOwner(b.group,b.teacher,b.takeover);const st=state(b.group,b.stage);if(st.conflicts.length)throw new Error('Resolve conflicts before editing this record');const at=new Date().toISOString();
   for(const [k,v]of Object.entries(b.changes||{})){const old=st.doc.fields[k]?.value??null;if(old===v)continue;st.doc.fields[k]={value:v,by:b.teacher,at,login:identity.login};st.doc.history.push({id:cryptoImpl.randomUUID(),key:k,old,value:v,by:b.teacher,login:identity.login,at,takeover:!!b.takeover});}
   validate(st.doc);st.dirty=true;save(b.group,b.stage,st);return st;
  });
  if(url.pathname==='/api/sync')return serial(()=>sync(b));
  if(url.pathname==='/api/resolve')return serial(()=>{
   assertOwner(b.group,b.teacher,b.takeover);const st=state(b.group,b.stage),at=new Date().toISOString();
   for(const c of st.conflicts){const choice=b.choices?.[c.key];if(!['local','remote'].includes(choice))throw new Error('Choose a version for every conflict');const selected=c[choice];if(selected===null)delete st.doc.fields[c.key];else st.doc.fields[c.key]=selected;st.doc.history.push({id:cryptoImpl.randomUUID(),by:b.teacher,login:identity.login,at,key:c.key,action:'conflict resolution',choice,takeover:!!b.takeover});}
   validate(st.doc);st.conflicts=[];st.dirty=true;save(b.group,b.stage,st);return st;
  });
  if(url.pathname==='/api/backup')return {schemaVersion:1,policyHash,rosterHash,scoringFormula,exportedAt:new Date().toISOString(),docs:bootstrap.roster.groups.flatMap(g=>recordStages.map(s=>state(g.id,s).doc))};
  if(url.pathname==='/api/import')return serial(()=>{
   if(!teachers.includes(b.teacher)||b.backup?.schemaVersion!==1||b.backup?.policyHash!==policyHash||b.backup?.rosterHash!==rosterHash||!Array.isArray(b.backup?.docs))throw new Error('Incompatible backup');
   const seen=new Set(),prepared=[];
   for(const doc of b.backup.docs){validate(doc);const id=doc.group+'/'+doc.stage;if(seen.has(id))throw new Error('Duplicate assessment record');seen.add(id);const st=state(doc.group,doc.stage);if(st.conflicts.length)throw new Error('Resolve existing conflicts before importing');for(const [k,e]of Object.entries(doc.fields))if(st.doc.fields[k]&&st.doc.fields[k].value!==e.value)throw new Error('Backup conflicts with local work. Review it in a separate browser profile.');st.doc.fields={...st.doc.fields,...doc.fields};st.doc.history=history(st.doc.history,doc.history);validate(st.doc);st.dirty=true;prepared.push([doc.group,doc.stage,st]);}
   storage.setItem(`${namespace}:pre-import:${Date.now()}`,JSON.stringify(bootstrap.roster.groups.flatMap(g=>recordStages.map(s=>state(g.id,s)))));for(const [g,s,st]of prepared)save(g,s,st);return {imported:prepared.length};
  });
  if(url.pathname==='/api/export.csv'){
   const rows=[['student_id','group_id','reviewer','status','checklist_coverage','minimum_secured','possible_maximum','final_grade','scoring_formula',...bootstrap.policy.criteria.map(c=>c.title)]];
   for(const g of bootstrap.roster.groups)for(const s of g.students){const x=calculate(bootstrap.policy,allDocs(g.id),s.id);rows.push([s.id,g.id,g.reviewer,x.complete?'Complete':'Pending',(100*x.coverage).toFixed(1),x.low.toFixed(2),x.high.toFixed(2),x.complete?x.low.toFixed(2):'',scoringFormula,...x.criteria.map(c=>c.coverage>=1-1e-9?c.low.toFixed(2):`${c.low.toFixed(2)}–${c.high.toFixed(2)} (pending)`)]);}
   return '\uFEFF'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n');
  }
  throw new Error('Unknown application operation');
 }
 return {connect,api,get scopeKey(){return namespace;},disconnect(){token='';identity=null;bootstrap=null;namespace='locked';},get connected(){return !!identity;}};
}
