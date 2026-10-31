export const softmax = xs => { if (!xs.length) return []; const m=Math.max(...xs), e=xs.map(x=>Math.exp(x-m)), z=e.reduce((a,b)=>a+b,0); return e.map(x=>x/z); };
export function poolRows(values,scores,ratio){
  const out=[]; for(let j=0;j+ratio<=values.length;j+=ratio){
    out.push(values[0].map((_,c)=>{const p=softmax(scores.slice(j,j+ratio).map(r=>r[c]));return p.reduce((s,w,r)=>s+w*values[j+r][c],0);}));
  } return out;
}
export const visibleBlock=(query,block,ratio)=>(block+1)*ratio<=query+1;
export function topK(scores,k){return scores.map((s,i)=>({s,i})).sort((a,b)=>b.s-a.s||a.i-b.i).slice(0,k).map(x=>x.i);}
export function attentionExample(k=2,sink=true){
  const indexScores=[.2,.8,.6,1.2,.1], logits=[0,Math.log(3),1,.4,-1], values=[1,4,2,8,5];
  const selected=topK(indexScores,k), real=selected.map(i=>Math.exp(logits[i])), denominator=real.reduce((a,b)=>a+b,0)+(sink?1:0);
  const weights=values.map((_,i)=>selected.includes(i)?Math.exp(logits[i])/denominator:0);
  return {indexScores,logits,values,selected,weights,sinkWeight:sink?1/denominator:0,output:weights.reduce((s,w,i)=>s+w*values[i],0)};
}
export {moeExample as routeExample} from './moe-model.mjs';
export function residualExample(a=.7){const matrix=[[a,1-a],[1-a,a]], input=[3,1], output=matrix.map(row=>row.reduce((s,v,i)=>s+v*input[i],0));return{matrix,input,output,inputNorm:Math.hypot(...input),outputNorm:Math.hypot(...output)};}
const kvSources=[2,8,14,20], indexSources=[2,8,14,20,24,28,32,36];
export function layerOwners(layer){if(layer<2)return{mode:'Local only',kv:null,index:null,ratio:0};const kv=kvSources.filter(i=>i<=layer).at(-1),index=indexSources.filter(i=>i<=layer).at(-1);return{mode:kvSources.includes(layer)?'Full':indexSources.includes(layer)?'Reindex':'Reuse',kv,index,ratio:layer<20?2:1};}
export function packedGlobalBytes(tokens){return (3*Math.floor(tokens/2)+tokens)*(288+68);}
export function cedWork(tokens,window=128,layers=40){return{full:tokens*layers,encoder:tokens*layers/2,tail:Math.min(tokens,window)*layers/2};}
export function visionLayout(rows,cols){return{rows:Math.ceil(rows/3),cols:Math.ceil(cols/3),tokens:Math.ceil(rows/3)*Math.ceil(cols/3),paddedRows:Math.ceil(rows/3)*3,paddedCols:Math.ceil(cols/3)*3};}
const positive=[0,.5,1,1.5,2,3,4,6];
export const e2m1=[...positive.slice(1).map(x=>-x).reverse(),...positive];
export function quantizeExample(x,scale=1){const q=e2m1.reduce((best,v)=>Math.abs(v-x/scale)<Math.abs(best-x/scale)?v:best,e2m1[0]);return{code:q,reconstructed:q*scale,error:q*scale-x};}
export function speculationExample(q0=.7){const p=[.5,.3,.2],q=[q0,(1-q0)*.6,(1-q0)*.4],accepted=p.map((x,i)=>Math.min(x,q[i])),residual=p.map((x,i)=>Math.max(x-q[i],0)),rejection=residual.reduce((a,b)=>a+b,0),r=residual.map(x=>rejection?x/rejection:0),reconstructed=accepted.map((x,i)=>x+rejection*r[i]);return{p,q,accepted,residual,r,rejection,reconstructed};}
