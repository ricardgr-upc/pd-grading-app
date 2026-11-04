// Recovery drafts overwrite their latest value; only flush commits an audit edit.
export function createTextDrafts({initial=[],persist,commit,randomUUID=()=>crypto.randomUUID()}){
 let edits=structuredClone(initial),writes=Promise.resolve(),committing=Promise.resolve(),saving=0;
 const snapshot=()=>structuredClone(edits);
 function save(){const data=snapshot();saving++;const task=writes.catch(()=>{}).then(()=>persist(data));writes=task;task.then(()=>saving--,()=>saving--);return task;}
 function stage(batch){const keys=Object.keys(batch.changes),existing=edits.find(e=>e.group===batch.group&&e.stage===batch.stage&&e.teacher===batch.teacher&&e.takeover===batch.takeover&&Object.keys(e.changes).length===keys.length&&keys.every(k=>k in e.changes));if(existing)existing.changes=structuredClone(batch.changes);else edits.push({...structuredClone(batch),id:randomUUID()});return save();}
 function flush(){const task=committing.catch(()=>{}).then(async()=>{await save();for(const batch of snapshot()){await commit(batch);edits=edits.filter(e=>e.id!==batch.id||JSON.stringify(e.changes)!==JSON.stringify(batch.changes));await save();}});committing=task;return task;}
 return {stage,flush,snapshot,get pending(){return edits.length>0||saving>0;}};
}
