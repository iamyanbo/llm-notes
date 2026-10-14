export const DENSE_MODELS=[
  {year:2018,name:'GPT',billions:.117},{year:2019,name:'GPT-2',billions:1.542},
  {year:2020,name:'GPT-3',billions:175},{year:2021,name:'Gopher',billions:280},
  {year:2022,name:'Chinchilla',billions:70},{year:2024,name:'Llama 3.1',billions:405},
  {year:2025,name:'Qwen3-32B',billions:32.8,scope:'total'},
  {year:2026,name:'Qwen3.8-27B',billions:27,scope:'language model only; vision encoder excluded'}
];
export const COMPARISON_MODELS=[
  {year:2019,name:'GPT-2',billions:1.542},
  {year:2020,name:'GPT-3',billions:175},
  {year:2024,name:'Llama 3.1 405B',billions:405},
  {year:2024,name:'DeepSeek-V3',billions:671,active:37},
  {year:2025,name:'Kimi K2',billions:1000,active:32},
  {year:2026,name:'Qwen3.8-2.4T-A95B',billions:2400,active:95}
];
export function scalingResources(factor=1,choice=0){
  const parameters=2*(choice===1?1:factor),tokens=100*(choice===0?1:factor);
  return {factor,parameters,tokens,compute:6*parameters*tokens/1000,multiplier:parameters*tokens/200};
}
export function gradientStep(step=0,rate=.1){const optimum=1.5,factor=1-4*rate,weight=optimum*(1-factor**step);return {weight,rate,factor,step,prediction:2*weight,loss:.5*(2*weight-3)**2,error:Math.abs(weight-optimum),convergent:Math.abs(factor)<1};}
export function softmax(logits){const max=Math.max(...logits),e=logits.map(x=>Math.exp(x-max)),sum=e.reduce((s,x)=>s+x,0);return e.map(x=>x/sum);}
export function studentSteps(steps=0,hard=false,rate=.3){const target=hard?[1,0,0]:[.6,.3,.1];let logits=[0,0,0],probabilities=softmax(logits),gradient=probabilities.map((v,i)=>v-target[i]);for(let i=0;i<steps;i++){gradient=probabilities.map((v,j)=>v-target[j]);logits=logits.map((v,j)=>v-rate*gradient[j]);probabilities=softmax(logits);}return {target,logits,probabilities,gradient,steps,hard};}
export const learningSpecs={
  'scaling-fit':{steps:8,initial:8,label:'Scale factor',min:2,max:8,default:2,choice:['Increase parameters','Increase training tokens','Increase both']},
  'model-history':{steps:7,initial:7,choice:['Dense and MoE comparison','Earlier dense-model sizes']},
  'lifetime-compute':{steps:6,initial:6,label:'Later tokens, trillions',min:0,max:6,default:3},
  'learning-update':{steps:12,label:'Learning rate × 100',min:1,max:60,default:10},
  'learning-curves':{steps:20,initial:20,label:'Target update count',min:1,max:20,default:12},
  distillation:{steps:8,choice:['Soft target','Hard target']}
};
export function learningModel(kind,{amount=learningSpecs[kind]?.default,step=0,choice=0}={}){
  if(kind==='scaling-fit')return {kind,...scalingResources(1+(amount-1)*step/8,choice),target:amount,choice,step};
  if(kind==='model-history'){const models=choice===1?DENSE_MODELS:COMPARISON_MODELS;return {kind,step,choice,models,selected:models[Math.min(models.length-1,step)]};}
  if(kind==='lifetime-compute'){const tokens=amount*step/6;return {kind,tokens,training:4.2,inference:1.4*tokens,total:4.2+1.4*tokens,step};}
  if(kind==='learning-update')return {kind,...gradientStep(step,amount/100),series:Array.from({length:13},(_,i)=>gradientStep(i,amount/100))};
  if(kind==='learning-curves'){const updates=Math.floor(amount*step/20),curves=Array.from({length:21},(_,u)=>({updates:u,training:.2+Math.exp(-u/4),heldOut:.45+Math.exp(-u/5)+.015*Math.max(0,u-7)**2}));return {kind,...curves[updates],curves,step};}
  if(kind==='distillation')return {kind,...studentSteps(step,choice===1),step};
  return null;
}
