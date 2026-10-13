import {dot,mv,softmax} from './models.js';
export const TRAIN_TOKENS=['〈bos〉','the','dog','chased','the','cat','〈eos〉'];
export const TRAIN_IDS=[0,1,2,3,1,4,5];
export const TARGET_NAMES=['cat','dog','the'];
export const SFT_TOKENS=['〈bos〉','User:','Who','chased','whom?','Assistant:','The','dog','chased','the','cat.','〈eos〉'];
export function shiftedExample(row=4){
  const probabilities=[.8,.5,.6,.7,.3,.9];
  const examples=TRAIN_TOKENS.slice(0,-1).map((input,i)=>({input,id:TRAIN_IDS[i],target:TRAIN_TOKENS[i+1],p:probabilities[i],loss:-Math.log(probabilities[i]),visible:i<=row}));
  return {row,examples,prefix:TRAIN_TOKENS.slice(0,row+1),prefixIds:TRAIN_IDS.slice(0,row+1),loss:examples.reduce((s,e)=>s+e.loss,0)/examples.length};
}
export function readoutStep(W,h,target,rate){
  const logits=mv(W,h),p=softmax(logits),loss=-Math.log(p[target]);
  const dz=p.map((v,i)=>v-Number(i===target));
  const gradient=dz.map(v=>h.map(x=>v*x));
  const next=W.map((row,i)=>row.map((w,j)=>w-rate*gradient[i][j]));
  return {W,h,logits,p,loss,dz,gradient,next};
}
export function trainingExample({updates=1,rate=.6,target=0,h2=.5}={}){
  const h=[1,h2],held=[0,1],history=[];let W=Array.from({length:3},()=>[0,0]),last;
  for(let n=0;n<=updates;n++){
    const sample=readoutStep(W,h,target,rate);
    history.push({n,train:sample.loss,held:-Math.log(softmax(mv(W,held))[1])});
    if(n<updates){last=sample;W=sample.next;}
  }
  const before=last??readoutStep(W,h,target,rate),after=readoutStep(W,h,target,rate);
  return {h,W,before,after,history,updates,rate,target};
}
export function supervisedExample({row=5,completionOnly=1}={}){
  const probabilities=[.9,.65,.5,.7,.8,.8,.9,.7,.8,.85,.6];
  const examples=SFT_TOKENS.slice(0,-1).map((input,i)=>({input,target:SFT_TOKENS[i+1],p:probabilities[i],active:!completionOnly||i+1>=6,visible:i<=row}));
  const count=examples.filter(e=>e.active).length;
  return {examples,row,count,loss:examples.reduce((s,e)=>s+(e.active?-Math.log(e.p):0),0)/count};
}
export const sigmoid=x=>x>=0?1/(1+Math.exp(-x)):Math.exp(x)/(1+Math.exp(x));
export const softplus=x=>Math.max(x,0)+Math.log1p(Math.exp(-Math.abs(x)));
export function preferenceStep(u,reference,beta,rate){
  const referenceLogOdds=Math.log(reference/(1-reference)),margin=beta*(u-referenceLogOdds);
  const preference=sigmoid(margin),loss=softplus(-margin),gradient=beta*(preference-1);
  return {u,reference,beta,margin,preference,loss,gradient,next:u-rate*gradient,p:sigmoid(u)};
}
export function preferenceExample({updates=1,rate=.5,beta=1,reference=.5}={}){
  let u=0,last;const history=[];
  for(let n=0;n<=updates;n++){
    const sample=preferenceStep(u,reference,beta,rate);history.push({n,loss:sample.loss,p:sample.p});
    if(n<updates){last=sample;u=sample.next;}
  }
  const before=last??preferenceStep(u,reference,beta,rate),after=preferenceStep(u,reference,beta,rate);
  const p=after.p,ref=reference;
  return {before,after,history,updates,reference,logs:[Math.log(p),Math.log(1-p)],refLogs:[Math.log(ref),Math.log(1-ref)]};
}
export const BASE_W=[[1,0],[0,1]];
const outer=(a,b)=>a.map(x=>b.map(y=>x*y));
const mm=(A,B)=>A.map(row=>B[0].map((_,c)=>row.reduce((s,v,k)=>s+v*B[k][c],0)));
export function loraExample({x1=1,x2=2,rank=1,scale=1,initialization='worked'}={}){
  const x=[x1,x2],A=rank===1?[[1,-1]]:[[1,-1],[0,1]];
  let B=rank===1?[[.5],[1]]:[[.5,.2],[1,-.5]];
  if(initialization!=='worked')B=B.map(row=>row.map(()=>0));
  if(initialization==='both-zero')A.forEach(row=>row.fill(0));
  const intermediate=mv(A,x),raw=mv(B,intermediate),delta=raw.map(v=>scale*v),base=mv(BASE_W,x),output=base.map((v,i)=>v+delta[i]);
  const update=mm(B,A).map(row=>row.map(v=>v*scale)),merged=BASE_W.map((row,i)=>row.map((v,j)=>v+update[i][j]));
  const error=output.map((v,i)=>v-[2,3][i]),BtError=B[0].map((_,j)=>B.reduce((s,row,i)=>s+row[j]*error[i],0));
  const dB=outer(error,intermediate).map(row=>row.map(v=>scale*v)),dA=outer(BtError,x).map(row=>row.map(v=>scale*v));
  return {x,A,B,intermediate,delta,base,output,update,merged,mergedOutput:mv(merged,x),rank,scale,alpha:scale*rank,trainable:4*rank,error,loss:dot(error,error)/2,dA,dB};
}
export function thoughtExample({a=17,b=23,error=0}={}){
  const tens=Math.floor(b/10)*10,units=b%10,left=a*tens,expectedRight=a*units,right=expectedRight+(error?10:0),answer=left+right;
  const chunks=[`${a} × ${tens} = ${left}`,`${a} × ${units} = ${right}`,`${left} + ${right} = ${answer}`,`Answer: ${answer}`];
  return {a,b,tens,units,left,right,expectedRight,answer,correct:a*b,chunks,checks:[true,right===expectedRight,true,answer===a*b]};
}
export const IMAGE_PROJECTOR=[[1,-1,0],[0,1,-1],[1/3,1/3,1/3],[.2,-.3,.1]];
export const TEXT_ROWS=[[.2,-.1,.4,0],[.1,.3,-.2,.1],[.5,.2,.1,-.1],[0,.1,.3,.2]];
export function imageExample(patches,{patch=7}={}){
  const features=patches[patch].meanRGB,projected=mv(IMAGE_PROJECTOR,features);
  const rows=patches.map(p=>mv(IMAGE_PROJECTOR,p.meanRGB)).concat(TEXT_ROWS);
  return {patch,features,projected,rows,columns:4,patches:patches.length,text:['What','is','happening','?']};
}
