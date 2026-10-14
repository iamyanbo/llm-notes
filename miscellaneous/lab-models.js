import {learningSpecs,learningModel} from './learning-models.js';
import {inferenceSpecs,inferenceModel,scheduleRequests} from './inference-models.js';
import {evidenceAgentSpecs,evidenceAgentModel} from './evidence-agent-models.js';
import {safetySpecs,safetyModel} from './safety-models.js';
export const A=[[1,2],[3,4]],B=[[2,0],[1,2]];
export const product=(a=A,b=B)=>a.map(row=>b[0].map((_,j)=>row.reduce((sum,x,k)=>sum+x*b[k][j],0)));
export function matrixFrame(step=0,selected=null){
  const complete=step>=32,cell=selected??Math.min(3,Math.floor(step/8)),row=Math.floor(cell/2),column=cell%2;
  const local=complete?7:step%8,term=Math.floor(local/4),phase=local%4;
  const terms=A[row].map((value,k)=>value*B[k][column]);
  const partial=terms.slice(0,term).reduce((s,x)=>s+x,0)+(phase>=2?terms[term]:0);
  const output=product(),stored=output.map((r,i)=>r.map((v,j)=>complete||i*2+j<Math.floor(step/8)?v:(i*2+j===cell&&local===7?v:null)));
  return {row,column,term,phase,terms,partial,output,stored,complete,left:A[row][term],right:B[term][column],value:terms[term]};
}
export function energyBudget({devices=8,busy=.7,idle=.2,utilization=1,host=1.4,hours=6,pue=1.2}={}){
  const deviceAverage=idle+utilization*(busy-idle),itPower=devices*deviceAverage+host,itEnergy=itPower*hours;
  return {deviceAverage,itPower,itEnergy,facilityEnergy:itEnergy*pue,facilityPower:itPower*pue,overheadEnergy:itEnergy*(pue-1)};
}
export function memoryBudget({parameters=7e9,weightBytes=2,layers=32,batch=1,tokens=4096,kvHeads=8,width=128,cacheBytes=2,training=false}={}){
  const weights=parameters*weightBytes,cache=training?0:2*layers*batch*tokens*kvHeads*width*cacheBytes;
  const gradients=training?parameters*2:0,moments=training?parameters*8:0,master=training?parameters*4:0;
  return {weights,cache,gradients,moments,master,total:weights+cache+gradients+moments+master};
}
export function supplyBudget(chips=800,racks=600,power=500){return {chips,racks,power,available:Math.min(chips,racks,power)};}
export function yieldBudget(area=1,density=.5){return {area,density,expectedDefects:area*density,yield:Math.exp(-area*density)};}
export function rooflineBudget(intensity=1,peak=100,bandwidth=10){return {intensity,peak,bandwidth,bound:Math.min(peak,bandwidth*intensity),memoryBound:bandwidth*intensity<peak};}
export function parallelBudget(devices=4,fraction=.9,communication=.05){const overhead=devices>1?communication:0;return {devices,fraction,communication:overhead,time:1-fraction+fraction/devices+overhead,speedup:1/(1-fraction+fraction/devices+overhead),ideal:1/(1-fraction+fraction/devices)};}
export const LAB_SPECS={
  ...learningSpecs,...inferenceSpecs,...evidenceAgentSpecs,...safetySpecs,
  'gpu-inside':{steps:7,choice:['Assembled package','Exploded package']}
};
export function modelFor(kind,{step=0,amount=LAB_SPECS[kind]?.default,choice=0}={}){
  if(kind==='gpu-inside')return {kind,step,choice,output:product()};
  if(kind==='matrix-tile')return {kind,...matrixFrame(choice===1?Math.min(step,7):step,choice===1?0:null),single:choice===1,complete:choice===1?step>=8:step>=32};
  if(kind==='cuda-thread')return {kind,...matrixFrame(Math.min(step,7),choice),complete:step>=8};
  if(kind==='energy')return {kind,...energyBudget({utilization:amount/100}),step};
  if(kind==='memory-budget')return {kind,...memoryBudget({batch:amount,training:choice===1}),step,batch:amount,training:choice===1};
  if(kind==='chip-yield')return {kind,...yieldBudget(amount*step/10),targetArea:amount,step};
  if(kind==='compute-supply')return {kind,...supplyBudget(800,600,amount),step};
  if(kind==='roofline')return {kind,...rooflineBudget(1+(amount-1)*step/5),targetIntensity:amount,step};
  if(kind==='distributed')return {kind,...parallelBudget(amount),step,choice,gradients:[2,6],mean:4,partials:[[[2,0],[6,0]],[[2,4],[4,8]]],result:product()};
  if(kind==='hardware-history')return {kind,resources:amount,rate:choice===1?Math.min(2,amount):amount,stepsNeeded:Math.ceil(16/(choice===1?Math.min(2,amount):amount)),step,memoryLimited:choice===1};
  if(kind==='fabrication')return {kind,step,choice,aperture:amount/100,resolution:.4*13.5/(amount/100)};
  const learned=learningModel(kind,{step,amount,choice});if(learned)return learned;
  const served=inferenceModel(kind,{step,amount,choice});if(served)return served;
  const observed=evidenceAgentModel(kind,{step,amount,choice});if(observed)return observed;
  const safe=safetyModel(kind,{step,amount,choice});if(safe)return safe;
  throw new Error('Unknown worked example '+kind);
}
export function lastLabStep(kind,state){
  if(kind==='agent-coordination')return state.amount;
  if(kind==='request-schedule')return scheduleRequests(state.amount,state.choice===0).duration;
  if(kind==='hardware-history'){const rate=state.choice===1?Math.min(2,state.amount):state.amount;return Math.ceil(16/rate);}
  if(kind==='matrix-tile'&&state.choice===1)return 8;
  return LAB_SPECS[kind].steps;
}
