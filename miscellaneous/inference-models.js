export const REQUESTS=[{id:'A',arrival:0,tokens:3},{id:'B',arrival:1,tokens:2},{id:'C',arrival:2,tokens:1}];
export function scheduleRequests(capacity=2,serial=false){
  const remaining=REQUESTS.map(r=>r.tokens),completion=Array(3).fill(null),timeline=[];
  let time=0;
  while(remaining.some(v=>v>0)&&time<30){const ready=REQUESTS.map((r,i)=>({r,i})).filter(({r,i})=>r.arrival<=time&&remaining[i]>0),selected=ready.slice(0,serial?1:capacity).map(({i})=>i);for(const i of selected){remaining[i]--;if(remaining[i]===0)completion[i]=time+1;}timeline.push({time,selected,remaining:[...remaining]});time++;}
  return {timeline,completion,latencies:completion.map((c,i)=>c-REQUESTS[i].arrival),mean:completion.reduce((s,c,i)=>s+c-REQUESTS[i].arrival,0)/3,duration:time};
}
export function blockBudget(a=5,shared=false){
  const b=shared?7:3,blockSize=4,canShare=shared&&a>=4,aBlocks=Math.ceil(a/blockSize),bBlocks=Math.ceil(b/blockSize),physical=aBlocks+bBlocks-(canShare?1:0),unique=a+b-(canShare?4:0);
  return {a,b,blockSize,aBlocks,bBlocks,physical,unique,logical:a+b,allocated:physical*4,waste:physical*4-unique,shared:canShare};
}
export function cacheBudget(gap=6,ttl=5,stable=true){const hit=stable&&gap<ttl,cached=hit?10000:0,uncached=10200-cached;return {gap,ttl,stable,hit,cached,uncached,cost:cached/1000+uncached/1000*10};}
export const inferenceSpecs={
  'request-schedule':{steps:6,choice:['Serial','Continuous batching'],label:'Available decode slots',min:1,max:4,default:2},
};
export function inferenceModel(kind,{amount=inferenceSpecs[kind]?.default,step=0,choice=0}={}){
  if(kind==='deployment')return {kind,step,choice};
  if(kind==='request-phases'){const length=choice===1?amount+step:amount;return {kind,step,choice,prompt:amount,length,queryRows:choice===1?1:amount,pairs:choice===1?length:amount*(amount+1)/2};}
  if(kind==='request-schedule')return {kind,...scheduleRequests(amount,choice===0),step,capacity:amount,serial:choice===0};
  if(kind==='cache-blocks')return {kind,...blockBudget(Math.floor(amount*step/3),choice===1),step};
  if(kind==='cache-expiry')return {kind,...cacheBudget(amount*step/10,choice===1?60:5,choice!==2),step};
  return null;
}
