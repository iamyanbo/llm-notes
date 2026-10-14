// This is a topic map, not a model execution trace or measured benchmark.
export const TOPICS=[
  {id:'hardware',label:'Hardware',short:'Chips · clusters · electricity',question:'What makes compute available?',description:'A lab needs processors, memory, and a facility that can power and cool them throughout an experiment. The development and availability of these resources determine how much computation it can obtain.'},
  {id:'compute',label:'Compute & learning',short:'Scaling · data · budgets',question:'Why should more compute mean better models?',description:'Once we understand the effort to supply compute, we can ask what learning gains it buys. The illustrative curve leads into scaling, allocation, and the value of each update.'},
  {id:'inference',label:'Inference systems',short:'Access · control · serving',question:'Who can use a model, and on what terms?',description:'Begin with where a model runs and who can inspect or change it. Then follow an answer into the work, memory, scheduling, and cost needed to make it available.'},
  {id:'evidence',label:'Evaluating claims',short:'Reports · benchmarks · confidence',question:'What has a model release actually established?',description:'Start with the claimed capability, then reconstruct the experiment behind it. Reports, benchmarks, and calibration each answer a different part of that question.'},
  {id:'agents',label:'Harnesses & agents',short:'Tasks · tools · memory',question:'What does it take to entrust a task to an agent?',description:'Begin with completing a task over time. Tools, verification, memory, and compaction become necessary when work has consequences and must survive beyond one model call.'},
  {id:'safety',label:'Ethics & safety',short:'People · objectives · interventions',question:'What should success mean, and for whom?',description:'Begin with the people affected by an application. Then examine how objectives, explanations, and interventions address particular concerns, and what evidence supports relying on them.'}
];
export const TOUR_DURATION=18000;
export function tourFrame(elapsed){
  const time=Math.max(0,Math.min(TOUR_DURATION,Number.isFinite(elapsed)?elapsed:0));
  const scaled=time/TOUR_DURATION*TOPICS.length;
  return {index:Math.min(TOPICS.length-1,Math.floor(scaled)),phase:time===TOUR_DURATION?1:scaled%1,finished:time===TOUR_DURATION};
}
export function topicMotion(index,phase){
  const p=Math.max(0,Math.min(1,Number.isFinite(phase)?phase:0));
  return {tile:Math.min(11,Math.floor(p*12)),curveX:12+190*p,curveY:6+26*(1-Math.exp(-p*3)),cache:Math.min(8,Math.floor(p*9)),context:p,check:Math.min(4,Math.floor(p*5)),decision:p<.5?0:1,index};
}
