import {stages,teachers,key,value} from './core.mjs';
export const recordStages=[...stages,'questions'];
export const linkedQuestionId=(objective,subject)=>`linked:${objective}:${subject}`;
export const questionKey=(id,field)=>`${id}|${field}`;
export const questionValue=(doc,id,field)=>doc?.fields?.[questionKey(id,field)]?.value??'';
export function questionCatalogue(policy,group){
 const entries=new Map();
 for(const criterion of policy.criteria)for(const comp of criterion.components)for(const tier of ['sufficient','excellence'])for(const objective of comp[tier])for(const subject of comp.scope==='group'?['group']:group.students.map(s=>s.id)){
  const id=linkedQuestionId(objective.id,subject);entries.set(id,{id,kind:'linked',domain:criterion.title,component:comp.id,objective:objective.id,objectiveText:objective.text,conditional:objective.conditional,recordStage:comp.stage,subject,tier});
 }
 return entries;
}
export function validateQuestions(doc,policy,group){
 const catalogue=questionCatalogue(policy,group);
 for(const [k,e]of Object.entries(doc.fields)){
  const pieces=k.split('|');if(pieces.length!==2)throw new Error('Invalid defence-question field');const [id,field]=pieces;
  const linked=catalogue.has(id),extra=/^extra:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if((!linked&&!extra)||!['active','prompt','answer','state',...(extra?['subject']:[])].includes(field))throw new Error('Invalid defence-question reference');
  if(!e||!teachers.includes(e.by)||typeof e.at!=='string'||typeof e.value!=='string'||e.value.length>20000)throw new Error('Invalid defence-question value');
  if(/\b[^\s@]+@[^\s@]+\.[^\s@]+\b|https?:\/\//i.test(e.value))throw new Error('Use neutral question text and evidence codes, without emails or web/repository links.');
  if(field==='active'&&!['yes','no'].includes(e.value))throw new Error('Invalid question marker');
  if(field==='state'&&!['open','resolved'].includes(e.value))throw new Error('Invalid question state');
  if(field==='subject'&&e.value!=='group'&&!group.students.some(s=>s.id===e.value))throw new Error('Question target must belong to this group');
 }
 return doc;
}
export function collectQuestions(doc,policy,group,assessmentDocs={}){
 const catalogue=questionCatalogue(policy,group),ids=new Set(Object.keys(doc?.fields||{}).map(k=>k.split('|')[0]));
 const linked=[...catalogue.keys()].filter(id=>ids.has(id)),extra=[...ids].filter(id=>!catalogue.has(id)).sort((a,b)=>(doc.fields[questionKey(a,'prompt')]?.at||'').localeCompare(doc.fields[questionKey(b,'prompt')]?.at||''));
 return [...linked,...extra].filter(id=>questionValue(doc,id,'active')==='yes').map(id=>{
  const context=catalogue.get(id)||{id,kind:'extra',domain:'Additional question',subject:questionValue(doc,id,'subject')||'group'};
  return {...context,prompt:questionValue(doc,id,'prompt'),answer:questionValue(doc,id,'answer'),resolved:questionValue(doc,id,'state')==='resolved',gradingNote:context.kind==='linked'?value(assessmentDocs[context.recordStage],context.objective,context.subject,'note'):'',attainment:context.kind==='linked'?value(assessmentDocs[context.recordStage],context.objective,context.subject):null};
 });
}
