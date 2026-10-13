import {PRESETS} from './sentence-model.js';
import {exampleEmbeddings,orderedVectors} from './representation-model.js';
import {softmax} from './context-model.js';

export const WORKED_SCORES=[1,0,1,1,-1];
export function scoreStudy(scores=WORKED_SCORES,shift=0){
  const shifted=scores.map(s=>s+shift),amounts=shifted.map(Math.exp);
  const total=amounts.reduce((s,v)=>s+v,0),weights=softmax(shifted);
  const vectors=orderedVectors(PRESETS.dog,exampleEmbeddings());
  const terms=vectors.map((v,j)=>v.map(x=>x*weights[j]));
  const partials=[[0,0]];
  for(const term of terms)partials.push(partials.at(-1).map((v,r)=>v+term[r]));
  return {scores:shifted,amounts,total,weights,vectors,terms,partials,output:partials.at(-1)};
}
export function valueStudy(swap=false){
  const data=scoreStudy(),values=data.vectors.map(v=>swap?[v[1],v[0]]:[...v]);
  const output=[0,1].map(r=>values.reduce((s,v,j)=>s+data.weights[j]*v[r],0));
  return {...data,values,output};
}
export function positionStudy(key='dog',positions=false){
  const tokens=PRESETS[key],embeddings=orderedVectors(tokens,exampleEmbeddings());
  const p=tokens.map((_,i)=>positions?[i/4,0]:[0,0]);
  const X=embeddings.map((v,i)=>v.map((x,r)=>x+p[i][r]));
  const receiver=tokens.indexOf('dog'),query=X[receiver][1],keys=X.map(v=>v[0]);
  const scores=keys.map(k=>query*k),weights=softmax(scores);
  const output=[0,1].map(r=>X.reduce((s,v,j)=>s+weights[j]*v[r],0));
  return {tokens,embeddings,p,X,receiver,query,keys,scores,weights,output};
}
export function scaleStudy(factor=1){
  if(!Number.isFinite(factor)||factor<0)throw new RangeError('Expected a nonnegative scale');
  const scores=[factor,0],weights=softmax(scores);
  return {scores,weights,ratio:Math.exp(factor)};
}
