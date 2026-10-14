export const r=[.6,.8],h=[4,3],W=[[1,2],[3,4]];
export function projection(fraction=1){
  const dot=r[0]*h[0]+r[1]*h[1],removed=r.map(v=>fraction*v*dot),retained=h.map((v,i)=>v-removed[i]);
  const P=r.map((v,i)=>r.map((u,j)=>(i===j?1:0)-fraction*v*u));
  const edited=P.map(row=>W[0].map((_,j)=>row.reduce((sum,v,k)=>sum+v*W[k][j],0)));
  return {r,h,dot,removed,retained,P,W,edited,fraction,remainingDot:r.reduce((sum,v,i)=>sum+v*retained[i],0)};
}
export function intervention(x1=2,choice=0){
  const x=[x1,1],original=[x1,x1+1],hidden=original.map((v,i)=>choice===i+1?0:v);
  const baseline=2*original[0]-original[1],output=2*hidden[0]-hidden[1];
  return {x,original,hidden,baseline,output,delta:output-baseline,choice};
}
export const safetySpecs={
  'refusal-projection':{steps:10,initial:10,choice:['Vector geometry','Matrix entries'],label:'Removal (%)',min:0,max:100,default:100},
  'causal-intervention':{steps:3,initial:3,choice:['Observe baseline','Set h₁ to zero','Set h₂ to zero'],label:'Input x₁',min:0,max:3,default:2},
  'reasoning-channel':{steps:4,choice:['Visible token trace','Displayed summary','Latent intermediate state'],label:null},
};
export function safetyModel(kind,{step=0,amount,choice=0}){
  if(kind==='decision-objectives')return {kind,step,p:.9,cost:amount,review:2,act:(1-.9)*amount,better:(1-.9)*amount<=2?'Act':'Review'};
  if(kind==='incident-boundaries')return {kind,step,stages:['Assigned evaluation goal','Intended isolation boundary','Unauthorized coordination','External effects','Detection and response']};
  if(kind==='refusal-projection')return {kind,step,choice,...projection(amount/100*step/10)};
  if(kind==='causal-intervention')return {kind,step,...intervention(amount,choice)};
  if(kind==='reasoning-channel')return {kind,step,choice};
  if(kind==='unlearning-mean'){const data=[1,2,9],removed=data[choice],remaining=data.filter((_,i)=>i!==choice);return {kind,step,data,removed,remaining,before:4,sum:12-removed,after:(12-removed)/2,retrained:remaining.reduce((a,b)=>a+b,0)/remaining.length};}
  return null;
}
