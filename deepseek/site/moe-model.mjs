import {expertExample} from './expert-model.mjs';
export function moeExample(bias=0,scale=1.5){
 const input=[1,2],routerMatrix=[[1,0,-1],[0,1,0]];
 const scores=routerMatrix[0].map((_,j)=>input.reduce((sum,x,i)=>sum+x*routerMatrix[i][j],0));
 const affinity=scores.map(s=>Math.sqrt(Math.log1p(Math.exp(s))));
 const selection=affinity.map((a,i)=>a+(i===2?bias:0));
 const selected=selection.map((s,i)=>({s,i})).sort((a,b)=>b.s-a.s||a.i-b.i).slice(0,2).map(v=>v.i);
 const denominator=selected.reduce((s,i)=>s+affinity[i],0);
 const normalized=affinity.map((a,i)=>selected.includes(i)?a/denominator:0),weights=normalized.map(w=>scale*w);
 const expertOutputs=[[2,0],[0,4],[-2,2]],shared=expertExample().output;
 const contributions=expertOutputs.map((row,i)=>row.map(v=>v*weights[i]));
 const routed=shared.map((_,j)=>contributions.reduce((sum,row)=>sum+row[j],0));
 return {input,routerMatrix,scores,affinity,selection,selected,denominator,normalized,weights,expertOutputs,shared,contributions,routed,output:routed.map((v,j)=>v+shared[j]),scale};
}
