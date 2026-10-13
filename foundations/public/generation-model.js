import {softmax} from './context-model.js';
export const GENERATION_TOKENS=['the','dog','chased','cat'];
export const GENERATION_E=[[1,0],[0,1],[1,1],[-1,0]];
export const GENERATION_U=[[0,1],[1,-.4],[1.5,1],[-1,1]];
export const GENERATION_STEPS=['Represent the prefix','Compare the last query','Gather the values','Read vocabulary probabilities','Append and look up'];
export const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
export function generationData(ids=[0,1],temperature=1){
  if(!ids.length||ids.some(id=>!Number.isInteger(id)||!GENERATION_E[id]))throw new Error('Unknown token in prefix');
  if(!(temperature>0))throw new Error('Temperature must be positive');
  const X=ids.map((id,i)=>GENERATION_E[id].map((v,c)=>v+(c===0?.1:.05)*i));
  const q=X.at(-1),scores=X.map(k=>dot(q,k)/Math.sqrt(2)),weights=softmax(scores);
  const h=[0,1].map(c=>weights.reduce((sum,a,j)=>sum+a*X[j][c],0));
  const logits=GENERATION_U.map(w=>dot(w,h)),probabilities=softmax(logits.map(z=>z/temperature));
  return {ids:[...ids],X,q,scores,weights,h,logits,probabilities,temperature};
}
export function chooseToken(probabilities,{sample=false,random=Math.random}={}){
  if(!sample)return probabilities.indexOf(Math.max(...probabilities));
  const draw=random();let cumulative=0;
  for(let i=0;i<probabilities.length;i++){cumulative+=probabilities[i];if(draw<cumulative)return i;}
  return probabilities.length-1;
}
export const TRAINING_INPUT=['BOS','the','dog','chased','the','cat'];
export const TRAINING_TARGET=['the','dog','chased','the','cat','EOS'];
export const TEXT_PIECES=['The',' dog',' and',' cat',' are',' rest','ing','.'];
export const decodeToyPieces=count=>TEXT_PIECES.slice(0,count).join('');
