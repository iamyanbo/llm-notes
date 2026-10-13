export const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
export const softmax=x=>{const m=Math.max(...x),e=x.map(v=>Math.exp(v-m)),s=e.reduce((a,b)=>a+b,0);return e.map(v=>v/s);};
export const mv=(W,x)=>W.map(row=>dot(row,x));
export function cacheExample(n=4){
  const K=Array.from({length:n},(_,i)=>[1+(i%3)/4,(i%2)*.5]);
  const V=K.map(([a,b])=>[a*.5,b+.25]),q=K.at(-1);
  const scores=K.map(k=>dot(q,k)/Math.sqrt(2)),weights=softmax(scores);
  const output=[0,1].map(c=>weights.reduce((s,a,i)=>s+a*V[i][c],0));
  return {K,V,q,scores,weights,output,recomputedRows:n*(n+1),cachedRows:2*n};
}
export const cacheBytes=({B=1,L=32,T=4096,H=8,d=128,b=2}={})=>2*B*L*T*H*d*b;
export const TILE_SCORES=[1,.3,-.5,1.2],TILE_VALUES=[[1,0],[0,1],[1,1],[-1,.5]];
export function onlineAttention(chunks){
  let m=-Infinity,l=0,o=[0,0];const frames=[{m,l,o:[...o],seen:0}];let seen=0;
  for(const chunk of chunks){
    const next=Math.max(m,...chunk.map(v=>v.score));
    const rescale=l===0?0:Math.exp(m-next);
    l=rescale*l;o=o.map(v=>v*rescale);
    for(const {score,value} of chunk){const e=Math.exp(score-next);l+=e;o=o.map((v,c)=>v+e*value[c]);seen++;}
    m=next;frames.push({m,l,o:[...o],seen});
  }
  return {frames,output:o.map(v=>v/l)};
}
export const tileExample=()=>onlineAttention([0,2].map(i=>TILE_SCORES.slice(i,i+2).map((score,j)=>({score,value:TILE_VALUES[i+j]}))));
export const EXPERTS=[[[2,0],[0,1]],[[0,1],[3,0]],[[1,1],[1,-1]],[[-1,1],[2,0]]];
export const ROUTER=[[Math.log(.5),0],[Math.log(.25),.4],[Math.log(.15),-.7],[Math.log(.1),.8]];
export function expertExample(x=[1,0],k=2){
  const logits=mv(ROUTER,x),r=softmax(logits);
  const selected=r.map((v,i)=>i).sort((a,b)=>r[b]-r[a]||a-b).slice(0,k),sum=selected.reduce((s,i)=>s+r[i],0);
  const gates=r.map((v,i)=>selected.includes(i)?v/sum:0);
  const outputs=EXPERTS.map(W=>mv(W,x).map(v=>Math.max(0,v)));
  const weighted=outputs.map((o,i)=>o.map(v=>v*gates[i]));
  const output=[0,1].map(c=>weighted.reduce((s,v)=>s+v[c],0));
  return {x,k,logits,r,selected,gates,outputs,weighted,output,total:300,active:100+50*k};
}
export const QUANT_W=[[-.63,-.18],[.26,.70]],QUANT_X=[1,2];
export const roundAway=v=>Math.sign(v)*Math.floor(Math.abs(v)+.5);
export function quantExample(bits=4,scale=.1){
  if(bits<2||bits>8||scale<=0)throw Error('Invalid grid');
  const max=2**(bits-1)-1;
  const integer=QUANT_W.map(row=>row.map(w=>Math.max(-max,Math.min(max,roundAway(w/scale)))));
  const restored=integer.map(row=>row.map(q=>q*scale)),exact=mv(QUANT_W,QUANT_X),approx=mv(restored,QUANT_X);
  const clipped=QUANT_W.map(row=>row.map(w=>Math.abs(roundAway(w/scale))>max));
  return {bits,scale,max,integer,restored,exact,approx,clipped,errors:restored.map((row,i)=>row.map((v,j)=>v-QUANT_W[i][j])),payload:4*bits/8};
}
export const TARGET=[.5,.3,.2];
export function speculativeExample(p=TARGET,q=[.6,.1,.3]){
  const accepted=p.map((v,i)=>Math.min(v,q[i])),acceptance=p.map((v,i)=>q[i]===0?1:Math.min(1,v/q[i]));
  const missing=p.map((v,i)=>Math.max(v-q[i],0)),rejection=missing.reduce((s,v)=>s+v,0);
  const residual=rejection>1e-12?missing.map(v=>v/rejection):null;
  return {p,q,accepted,acceptance,missing,rejection,residual,recovered:accepted.map((v,i)=>v+missing[i])};
}
