export const stages=['global','report','repository','defence'];
export const stageLabel=s=>s==='global'?'All objectives':s[0].toUpperCase()+s.slice(1);
export function viewComponents(policy,stage){
 return policy.criteria.flatMap(c=>c.components.flatMap(comp=>{
  if(stage==='global'||comp.stage===stage)return [{c,comp}];
  if(comp.stage!=='global'||stage==='global')return [];
  const visible={...comp};
  for(const tier of ['sufficient','excellence'])visible[tier]=comp[tier].filter(o=>o.evidenceStages.includes(stage));
  return visible.sufficient.length||visible.excellence.length?[{c,comp:visible}]:[];
 }));
}
export const teachers=['Ricard','David','Nuria'];
export const key=(id,subject,field)=>`${id}|${subject}|${field}`;
export function value(doc,id,subject,field='status'){return doc?.fields?.[key(id,subject,field)]?.value ?? (field==='status'?'pending':'');}
export function subjectFor(comp,email){return comp.scope==='group'?'group':email;}
export function calculate(policy,docs,email){
 let low=0,high=0,coverage=0; const criteria=[];
 for(const c of policy.criteria){
  let sLow=0,sHigh=0,eLow=0,eHigh=0,covered=0,invalid=false;
  for(const comp of c.components){
   const doc=docs[comp.stage],subject=subjectFor(comp,email);let answered=0,total=0;
   for(const tier of ['sufficient','excellence']){
    const states=comp[tier].map(o=>value(doc,o.id,subject)).filter(v=>v!=='na');
    if(!states.length){invalid=true;continue;}
    total+=states.length;answered+=states.filter(v=>v!=='pending').length;
    const l=states.filter(v=>v==='met').length/states.length;
    const h=states.filter(v=>v==='met'||v==='pending').length/states.length;
    if(tier==='sufficient'){sLow+=comp.weight*l;sHigh+=comp.weight*h;}else{eLow+=comp.weight*l;eHigh+=comp.weight*h;}
   }
   covered+=comp.weight*(total?answered/total:0);
  }
  const unlocked=sLow>=1-1e-9;
  const l=unlocked?5+5*eLow:5*sLow;
  const h=sHigh>=1-1e-9?5+5*eHigh:5*sHigh;
  low+=c.weight*l;high+=c.weight*h;coverage+=c.weight*covered;
  criteria.push({id:c.id,title:c.title,low:l,high:h,coverage:covered,unlocked,invalid});
 }
 const invalid=criteria.some(c=>c.invalid);
 return {low,high,coverage,complete:!invalid&&coverage>=1-1e-9,invalid,criteria};
}
export function mergeThree(base={},local={},remote={}){
 const merged={},conflicts=[];
 for(const k of new Set([...Object.keys(base),...Object.keys(local),...Object.keys(remote)])){
  const b=base[k],l=local[k],r=remote[k];
  const same=(x,y)=>JSON.stringify(x?.value)===JSON.stringify(y?.value);
  if(same(l,r)||same(r,b)){if(l!==undefined)merged[k]=l;}
  else if(same(l,b)){if(r!==undefined)merged[k]=r;}
  else{conflicts.push({key:k,base:b??null,local:l??null,remote:r??null});if(l!==undefined)merged[k]=l;}
 }
 return {merged,conflicts};
}
export function csvCell(v){return '"'+String(v??'').replaceAll('"','""')+'"';}
