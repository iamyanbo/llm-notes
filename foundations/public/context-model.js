import {PRESETS} from './sentence-model.js';
import {exampleEmbeddings,orderedVectors} from './representation-model.js';

export const MANUAL_CONTRIBUTIONS=[0,2,1,0,1];
export const HEAD_PROJECTIONS={
  Q:[[1,0],[.5,1]], K:[[1,.5],[0,1]], V:[[.5,1],[1,-.5]],
};
export function weightedContext(vectors,contributions){
  if(vectors.length!==contributions.length||!contributions.every(v=>Number.isFinite(v)&&v>=0))throw new RangeError('Invalid contributions');
  const total=contributions.reduce((sum,v)=>sum+v,0);
  if(!total)return {weights:null,output:null};
  const weights=contributions.map(v=>v/total);
  const output=vectors[0].map((_,r)=>vectors.reduce((sum,v,j)=>sum+weights[j]*v[r],0));
  return {weights,output};
}
export function softmax(scores){
  const maximum=Math.max(...scores),positive=scores.map(s=>Math.exp(s-maximum)),total=positive.reduce((s,v)=>s+v,0);
  return positive.map(v=>v/total);
}
const project=(vectors,matrix)=>vectors.map(vector=>matrix.map(row=>row.reduce((sum,value,j)=>sum+value*vector[j],0)));
const dot=(a,b)=>a.reduce((sum,v,j)=>sum+v*b[j],0);
export function sequenceAttention(key='dog',withPositions=true){
  if(!['dog','cat'].includes(key))throw new RangeError('Unknown sentence');
  const tokens=PRESETS[key],embeddings=orderedVectors(tokens,exampleEmbeddings());
  const positions=tokens.map((_,i)=>withPositions?[i/4,0]:[0,0]);
  const X=embeddings.map((row,i)=>row.map((v,r)=>v+positions[i][r]));
  const Q=project(X,HEAD_PROJECTIONS.Q),K=project(X,HEAD_PROJECTIONS.K),V=project(X,HEAD_PROJECTIONS.V);
  const scores=Q.map(query=>K.map(key=>dot(query,key)/Math.sqrt(query.length)));
  const weights=scores.map(softmax),H=weights.map(row=>weightedContext(V,row).output);
  return {tokens,embeddings,positions,X,Q,K,V,scores,weights,H};
}
