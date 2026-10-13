import {PRESETS} from './sentence-model.js';

export const REPRESENTATION_VOCABULARY=['the','dog','chased','cat'];
export function exampleEmbeddings(dogVector=[0,1]){
  if(!Array.isArray(dogVector)||dogVector.length!==2||!dogVector.every(Number.isFinite))throw new RangeError('Expected two finite coordinates');
  return {the:[1,0],dog:[...dogVector],chased:[1,1],cat:[-1,0]};
}
export function orderedVectors(tokens,embeddings){
  return tokens.map(token=>{
    if(!Object.hasOwn(embeddings,token))throw new RangeError('Unknown token');
    return [...embeddings[token]];
  });
}
export function sumVectors(tokens,embeddings){
  const rows=orderedVectors(tokens,embeddings);
  return rows.reduce((sum,row)=>sum.map((value,i)=>value+row[i]),[0,0]);
}
export function compareRepresentations(rightKey='cat',dogVector=[0,1]){
  if(!['cat','scrambled'].includes(rightKey))throw new RangeError('Unknown comparison');
  const embeddings=exampleEmbeddings(dogVector),left=PRESETS.dog,right=PRESETS[rightKey];
  const leftMatrix=orderedVectors(left,embeddings),rightMatrix=orderedVectors(right,embeddings);
  const matricesEqual=leftMatrix.every((row,i)=>row.every((value,j)=>value===rightMatrix[i][j]));
  return {left,right,leftMatrix,rightMatrix,leftSum:sumVectors(left,embeddings),rightSum:sumVectors(right,embeddings),embeddings,matricesEqual};
}
