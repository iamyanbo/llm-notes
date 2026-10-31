import {matmul,dot,residualWalkthrough} from './week-models.mjs';
import {expertExample} from './expert-model.mjs';
export function residualAlternatives(fraction=.5){
 if(!Number.isFinite(fraction)||fraction<0||fraction>1)throw new RangeError('Choose an update fraction from zero through one');
 const e=expertExample(),input=[...e.input],update=[...e.output],ordinary=input.map((v,i)=>v+update[i]);
 const retained=[input,ordinary],oneRow=input.map((v,i)=>v+fraction*update[i]),read=retained[0].map((v,i)=>(1-fraction)*v+fraction*retained[1][i]);
 return {fraction,input,update,ordinary,retained,oneRow,read,concatenated:retained.flat(),inputWidth:input.length};
}
export function repeatedCarry(gain,steps=4){
 if(!Number.isFinite(gain)||gain<0||!Number.isInteger(steps)||steps<0||steps>20)throw new RangeError('Choose a nonnegative finite gain and zero through twenty steps');
 const input=expertExample().input;
 return Array.from({length:steps+1},(_,step)=>input.map(v=>v*gain**step));
}
export function hcWiringExample(stage=0){
 if(!Number.isInteger(stage)||stage<0||stage>3)throw new RangeError('Choose an HC wiring stage from zero through three');
 const X=[[1,2],[0,1]],A=stage===0?[[1,0]]:[[.5,.5]],B=stage<3?[[1,0],[0,1]]:[[.75,.25],[.25,.75]],C=stage<2?[[1],[0]]:[[.5],[1]],input=matmul(A,X)[0],weights=expertExample();
 const gateRaw=matmul([input],weights.gateMatrix)[0],features=matmul([input],weights.featureMatrix)[0],gated=gateRaw.map((v,i)=>v/(1+Math.exp(-v))*features[i]),update=matmul([gated],weights.returnMatrix)[0],transport=matmul(B,X),injection=matmul(C,[update]),result=transport.map((r,i)=>r.map((v,j)=>v+injection[i][j]));
 return {stage,X,A,B,C,input,update,transport,injection,result};
}
export const totals=matrix=>({rows:matrix.map(r=>r.reduce((s,v)=>s+v,0)),columns:matrix[0].map((_,j)=>matrix.reduce((s,r)=>s+r[j],0))});
export function transportCases(){
 const input=hcWiringExample().X.map(r=>r[0]);
 return [
  ['Unrestricted gain',[[1.2,0],[0,1.2]]],
  ['Signed rows summing to one',[[2,-1],[-1,2]]],
  ['Nonnegative row averages',[[1,0],[1,0]]],
  ['Rows and columns constrained',[[.75,.25],[.25,.75]]],
 ].map(([label,matrix])=>{const output=matmul(matrix,input.map(v=>[v])).map(r=>r[0]);return {label,matrix,input,output,squaredLength:dot(output,output),inputMean:input.reduce((s,v)=>s+v,0)/input.length,outputMean:output.reduce((s,v)=>s+v,0)/output.length,...totals(matrix)};});
}
export function transportReplay(coefficient=.75,steps=1){
 if(!Number.isFinite(coefficient)||coefficient<0||coefficient>1||!Number.isInteger(steps)||steps<1||steps>6)throw new RangeError('Choose a coefficient from zero through one and one through six applications');
 const matrix=[[coefficient,1-coefficient],[1-coefficient,coefficient]],initial=hcWiringExample().X.map(r=>r[0]),history=[[...initial]];
 for(let i=0;i<steps;i++)history.push(matmul(matrix,history.at(-1).map(v=>[v])).map(r=>r[0]));
 const input=history.at(-2),output=history.at(-1);
 return {coefficient,steps,matrix,initial,history,input,output,inputMean:(input[0]+input[1])/2,outputMean:(output[0]+output[1])/2,difference:output[0]-output[1],...totals(matrix)};
}
export function sinkhornStep(step=0){
 if(!Number.isInteger(step)||step<0||step>40)throw new RangeError('Choose a division from zero through forty');
 const seed=[[1,2],[3,4]],logits=seed.map(r=>r.map(Math.log));let matrix=seed.map(r=>[...r]),previous=matrix,divisors=[];
 for(let s=1;s<=step;s++){
  previous=matrix;const t=totals(matrix);divisors=s%2?t.rows:t.columns;
  matrix=matrix.map((r,i)=>r.map((v,j)=>v/divisors[s%2?i:j]));
 }
 const sums=totals(matrix);
 return {step,seed,logits,previous,matrix,divisors,axis:step===0?'none':step%2?'rows':'columns',...sums,maxError:Math.max(...[...sums.rows,...sums.columns].map(v=>Math.abs(v-1)))};
}
export function coefficientExample(kind='input'){
 if(!['input','injection'].includes(kind))throw new RangeError('Unknown coefficient');
 const X=residualWalkthrough().X,v=X.flat(),column=kind==='input'?[0,0,0,1,0,0,-1,0]:[1,0,0,0,0,0,0,0],products=v.map((x,i)=>x*column[i]),measurement=products.reduce((s,v)=>s+v,0),epsilon=1e-6,meanSquare=dot(v,v)/v.length,rms=Math.sqrt(meanSquare+epsilon),z=measurement/rms,alpha=.5,beta=kind==='input'?-.5:.5,logit=alpha*z+beta,sigmoid=1/(1+Math.exp(-logit)),result=kind==='input'?sigmoid+epsilon:2*sigmoid;
 return {kind,X,v,column,products,measurement,epsilon,meanSquare,rms,z,alpha,beta,logit,sigmoid,result};
}
export function blockExample(){
 const m=residualWalkthrough(),normalize=v=>{const rms=Math.sqrt(dot(v,v)/v.length+1e-6);return {rms,row:v.map(x=>x/rms)};};
 return {...m,attentionNorm:normalize(m.input[0]),expertNorm:normalize(m.nextInput[0])};
}
