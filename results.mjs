import {csvCell,scoringFormula} from './core.mjs';
const mean=xs=>xs.length?xs.reduce((a,x)=>a+x,0)/xs.length:null;
const done=x=>!x.invalid&&x.coverage>=1-1e-9;
export function summariseResults(policy,roster,overview,{reviewer='all',completion='all'}={}){
 const groups=roster.groups.map(g=>{
  const o=overview.find(x=>x.group===g.id),students=o?.students||[];
  const conflictCount=o?.conflicts||0,coverage=mean(students.map(s=>s.coverage))??0;
  const complete=!conflictCount&&students.length===g.students.length&&students.every(s=>s.complete);
  const status=conflictCount?'conflict':complete?'complete':coverage>0?'partial':'not-started';
  const domains=policy.criteria.map(c=>{
   const scores=students.map(s=>s.criteria.find(x=>x.id===c.id)).filter(Boolean);
   const valid=conflictCount?[]:scores.filter(done);
   return {id:c.id,title:c.title,meanCompleted:mean(valid.map(x=>x.low)),completed:valid.length,total:g.students.length,coverage:mean(scores.map(x=>x.coverage))??0,low:mean(scores.map(x=>x.low))??0,high:mean(scores.map(x=>x.high))??10,complete:!conflictCount&&scores.length===g.students.length&&scores.every(done)};
  });
  return {id:g.id,reviewer:g.reviewer,students,studentCount:g.students.length,coverage,complete,status,conflicts:conflictCount,dirty:!!o?.dirty,refreshedAt:o?.refreshedAt||null,completedStudents:conflictCount?0:students.filter(s=>s.complete).length,low:mean(students.map(s=>s.low))??0,high:mean(students.map(s=>s.high))??10,domains};
 }).filter(g=>(reviewer==='all'||g.reviewer===reviewer)&&(completion==='all'||g.status===completion));
 const students=groups.flatMap(g=>g.students.map(s=>({...s,group:g.id,reviewer:g.reviewer,conflicts:g.conflicts})));
 const completed=students.filter(s=>s.complete&&!s.conflicts);
 const domains=policy.criteria.map(c=>{
  const scores=students.map(s=>({score:s.criteria.find(x=>x.id===c.id),conflicts:s.conflicts})).filter(x=>x.score);
  const completed=scores.filter(x=>!x.conflicts&&done(x.score));
  return {id:c.id,title:c.title,weight:c.weight,total:students.length,completed:completed.length,meanCompleted:mean(completed.map(x=>x.score.low)),coverage:mean(scores.map(x=>x.score.coverage))??0,low:scores.some(x=>x.conflicts)?null:mean(scores.map(x=>x.score.low)),high:scores.some(x=>x.conflicts)?null:mean(scores.map(x=>x.score.high))};
 });
 return {groups,students,domains,stats:{groups:groups.length,students:students.length,completedStudents:completed.length,meanCompleted:mean(completed.map(x=>x.low)),coverage:mean(students.map(x=>x.coverage))??0,low:mean(students.map(x=>x.low)),high:mean(students.map(x=>x.high)),conflicts:groups.reduce((n,g)=>n+g.conflicts,0),dirtyGroups:groups.filter(g=>g.dirty).length}};
}
const fixed=x=>x===null?'':x.toFixed(2);
export function resultsCsv(summary,kind='groups'){
 let rows;
 if(kind==='domains')rows=[['domain','criterion_weight_percent','completed_student_scores','total_students','mean_completed_scores','checklist_coverage_percent','provisional_mean_lower','provisional_mean_upper'],...summary.domains.map(d=>[d.title,100*d.weight,d.completed,d.total,fixed(d.meanCompleted),(d.coverage*100).toFixed(1),fixed(d.low),fixed(d.high)])];
 else if(kind==='students')rows=[['student_id','group_id','reviewer','status','coverage_percent','final_grade','provisional_lower','provisional_upper'],...summary.students.map(s=>[s.id,s.group,s.reviewer,s.conflicts?'Conflict':s.complete?'Complete':'Pending',(s.coverage*100).toFixed(1),s.complete&&!s.conflicts?fixed(s.low):'',s.conflicts?'':fixed(s.low),s.conflicts?'':fixed(s.high)])];
 else rows=[['group_id','reviewer','students','status','coverage_percent','completed_students','final_student_mean','provisional_mean_lower','provisional_mean_upper',...summary.domains.flatMap(d=>[d.title+' — mean/range',d.title+' — completed/total'])],...summary.groups.map(g=>[g.id,g.reviewer,g.studentCount,g.status,(g.coverage*100).toFixed(1),g.completedStudents,g.complete?fixed(g.low):'',g.conflicts?'':fixed(g.low),g.conflicts?'':fixed(g.high),...g.domains.flatMap(d=>[g.conflicts?'Conflict':d.complete?fixed(d.low):`${fixed(d.low)}–${fixed(d.high)} (pending)`,`${d.completed}/${d.total}`])])];
 rows=rows.map((row,i)=>[...row,i===0?'scoring_formula':scoringFormula]);
 return '\uFEFF'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n');
}
