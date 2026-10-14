export const ATTEMPTS=[[1,0,0,0],[0,1,0,0],[0,0,1,0],[1,0,0,0],[1,0,0,0],[0,0,0,1],[1,0,0,0],[0,0,1,0],[1,0,0,0],[0,0,0,0]];
export function selectedScore(k=1,n=10,p=.7){
  let mass=(1-p)**n,cdf=mass,expected=0;
  for(let r=1;r<=n;r++){expected+=1-cdf**k;mass*=((n-r+1)/r)*(p/(1-p));cdf=Math.min(1,cdf+mass);}
  return {expected,accuracy:expected/n,p,k,n};
}
export const REPORTS=[
  {name:'Gopher',parameters:280,tokens:300,year:2021},
  {name:'Chinchilla',parameters:70,tokens:1400,year:2022},
  {name:'Llama 3.1',parameters:405,tokens:15600,year:2024}
];
export function calibrationValues(temperature=1){
  const raw=[.9,.9,.9,.9,.9,.6,.6,.6,.6,.6],labels=[1,1,0,0,0,1,1,1,0,0];
  const probabilities=raw.map(p=>1/(1+Math.exp(-Math.log(p/(1-p))/temperature)));
  const bins=[0,5].map(start=>({confidence:probabilities[start],accuracy:labels.slice(start,start+5).reduce((a,b)=>a+b,0)/5,count:5}));
  return {temperature,probabilities,labels,bins,brier:probabilities.reduce((sum,p,i)=>sum+(p-labels[i])**2,0)/10,ece:bins.reduce((sum,b)=>sum+.5*Math.abs(b.confidence-b.accuracy),0),accuracy:.5};
}
export const RECORDS=[
  {id:'dataset',label:'Current dataset',vector:[2,1],valid:true},
  {id:'constraint',label:'Current constraint',vector:[1,2],valid:true},
  {id:'obsolete',label:'Superseded version',vector:[-1,2],valid:false}
];
export const cosine=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0)/(Math.hypot(...a)*Math.hypot(...b));
export const SUMMARY_FIELDS=['Goal','Constraint','Decision','Result','Pending work','Source'];
export function coordination(n=4,rule=0,s=.9,r=.98){
  const pairs=n*(n-1)/2,required=s**n,redundant=1-(1-s)**n;
  return {n,rule,s,r,pairs,required,redundant,success:rule===0?required:rule===1?redundant:required*r**pairs};
}
export function propagation(depth=3,verification=0,branching=3,adoption=1){
  const multiplier=branching*adoption*(1-verification),counts=Array.from({length:depth+1},(_,g)=>multiplier**g),potential=Array.from({length:depth+1},(_,g)=>branching**g);
  return {depth,verification,branching,adoption,multiplier,counts,potential,total:counts.reduce((sum,v)=>sum+v,0)};
}
export const evidenceAgentSpecs={
  'harness-loop':{steps:4,label:null},
};
export function evidenceAgentModel(kind,{step=0,amount,choice=0}){
  if(kind==='release-conditions')return {kind,step,choice,attempts:choice===0?4:1,a:Math.min(step,7),b:ATTEMPTS.slice(0,step).filter(row=>row.slice(0,choice===0?4:1).some(Boolean)).length};
  if(kind==='selection-bias')return {kind,step,target:amount,...selectedScore(1+Math.floor((amount-1)*step/10))};
  if(kind==='report-comparison'){const report=REPORTS[choice];return {kind,step,...report,computeProxy:6*report.parameters*report.tokens/1000};}
  if(kind==='calibration'){
    const values=calibrationValues(amount/10),observed=Math.min(10,step);
    const shownBins=[0,5].map(start=>{const count=Math.max(0,Math.min(5,observed-start));return {confidence:values.probabilities[start],accuracy:count?values.labels.slice(start,start+count).reduce((a,b)=>a+b,0)/count:0,count};});
    return {kind,step,...values,shownBins,observed};
  }
  if(kind==='harness-loop')return {kind,step,stages:['Model proposes read_file','Harness checks and dispatches','Environment reads data.csv','Tool returns total = 42','Next context includes result']};
  if(kind==='cloud-agent')return {kind,step,remote:choice===0,clientOpen:step<2,processRunning:choice===0||step<2,artifactExists:step>=1};
  if(kind==='memory-retrieval'){const query=[[1,1],[1,0],[0,1]][choice];return {kind,step,query,records:RECORDS.map((record,i)=>({...record,score:cosine(query,record.vector),order:i})).sort((a,b)=>b.score-a.score||a.order-b.order),count:amount};}
  if(kind==='context-compaction'){
    const fields=SUMMARY_FIELDS.map((label,i)=>({label,retained:amount!==i+1,value:['Finish report',choice===0?'Return locally':'Upload to project','Use dataset v2','Draft complete','Return result','data-v2.csv'][i]}));
    return {kind,step,fields,choice,omitted:amount,required:choice===0?'Return locally':'Upload to project',decisionKnown:fields[1].retained};
  }
  if(kind==='agent-coordination')return {kind,step,target:amount,...coordination(Math.min(amount,Math.max(1,step)),choice)};
  if(kind==='error-propagation')return {kind,step,...propagation(step,choice===1?.75:0,amount)};
  return null;
}
