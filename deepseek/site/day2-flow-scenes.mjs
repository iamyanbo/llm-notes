import {scene,linear,unary,zip,copyShape,definition,ref,term,fmt} from './trace-scene.mjs';
import {hcWiringExample,transportCases,transportReplay} from './residual-model.mjs';
import {sinkhornTrial,predictorTrial,blockTrace,expertAt} from './day2-model.mjs';
import {expertExample} from './expert-model.mjs';
import {hcOverviewTraceDefinition} from './hc-overview-trace.mjs';
import {alternativesTraceDefinition} from './residual-alternatives-trace.mjs';
const row=v=>[v];
const add=(title,A,B,output)=>zip(title,'Carried state',A,'New contribution',B,(a,b)=>a+b,'+',{output});
function expertScenes(x){
 const e=expertExample(),m=expertAt(x);
 return [linear('Form the expert features','Expert input',row(x),e.featureMatrix,{map:'W₃ · feature weights',output:'xW₃'}),
 linear('Form the expert gate','Same expert input',row(x),e.gateMatrix,{map:'W₁ · gate weights',output:'xW₁'}),
 unary('Apply SiLU to the gate','Gate before activation',row(m.gateRaw),v=>v/(1+Math.exp(-v)),{operation:'s / (1 + exp(−s))',output:'SiLU(xW₁)'}),
 zip('Gate the intermediate features','Activated gate',row(m.gate),'Feature branch',row(m.features),(a,b)=>a*b,'×',{output:'Gated features'}),
 linear('Return the expert output','Gated features',row(m.products),e.returnMatrix,{map:'W₂ · return weights',output:'Expert output'})];
}
function normalize(title,label,v,divisor,epsilon=1e-6){
 const mean=v.reduce((s,x)=>s+x*x,0)/v.length;
 return [scene(title,[{label,values:row(v)}],[[divisor]],[{row:0,col:0,result:divisor,terms:v.map((x,j)=>term(x*x,`${fmt(x)}²`,[ref(0,0,j)])),finish:`√(${fmt(mean*v.length)}/${v.length} + ${epsilon}) = ${fmt(divisor)}`}],{output:'RMS divisor',operation:'Square → mean → square root',note:`Use ${v.length} coordinates and epsilon ${epsilon}.`}),
 unary('Divide by the RMS',label,row(v),x=>x/divisor,{output:'Normalized row',operation:`÷ ${fmt(divisor)}`})];
}
function divideScene(n,change=0){
 const m=sinkhornTrial(n,change);if(n===0)return unary('Begin with positive connection amounts','Positive amounts',m.seed,v=>v,{output:'Starting matrix',operation:'Copy chosen starting amounts'});
 return scene(`Division ${n}: normalize ${m.axis}`,[{label:'Before this division',values:m.previous}],m.matrix,m.matrix.flatMap((r,i)=>r.map((v,j)=>({row:i,col:j,result:v,terms:[term(v,`${fmt(m.previous[i][j])} ÷ ${fmt(m.divisors[n%2?i:j])}`,[ref(0,i,j)])]}))),{output:'After this division',operation:n%2?'Divide by the row total':'Divide by the column total',lines:[`Totals before division: ${m.divisors.map(fmt).join(', ')}`],note:`${n%2?'Rows':'Columns'} are corrected using their totals before this operation. The other totals need not yet be one.`});
}
function transport(m,label='Transport one feature'){
 return linear(label,'One value per stream',m.input.map(v=>[v]),m.matrix,{left:true,map:'B · destination rows / source columns',output:'Destination values',note:'Each row of B supplies the contributions to one destination. Follow each source value into its coefficient, then add.'});
}
export function flowDefinition(kind,p={}){
 if(kind==='hc-overview')return hcOverviewTraceDefinition();
 if(kind==='alternatives')return alternativesTraceDefinition(p.fraction??.5);
 let scenes;
 if(kind==='hc-wiring'||kind==='block'){
  let X,A,B,C,input,update,carry,injection,norm;
  if(kind==='block'){
   const m=blockTrace(p.strength??1),second=(p.stage??0)===1;
   ({A,B,C}=m);X=second?m.Y:m.X;input=second?m.expertInput:m.attentionInput;norm=second?m.expertNorm:m.attentionNorm;update=second?m.expert.output:m.attentionOutput;carry=second?m.expertCarry:m.attentionCarry;injection=second?m.expertInjection:m.attentionInjection;
  }else{const m=hcWiringExample(p.stage??0);({X,A,B,C,input,update,transport:carry,injection}=m);}
  scenes=[linear('Read one mixture of the streams','Retained streams X',X,A,{left:true,map:'A · input coefficients',output:'One sublayer input AX'})];
  if(norm)scenes.push(...normalize('Find the sublayer RMS','Mixed input AX',input,norm.divisor));
  if(kind==='block'&&(p.stage??0)===0)scenes.push(unary('Use the supplied attention output','Chosen attention output',row(update),v=>v,{output:'Attention update',operation:'Supplied for this wiring example',note:'This example isolates residual wiring. It does not calculate the attention function.'}));
  else scenes.push(...expertScenes(norm?norm.row:input));
  scenes.push(linear('Carry the existing state','Old streams X',X,B,{left:true,map:'B · bypass coefficients',output:'Carried streams BX'}),
   linear('Distribute the returned update','One sublayer output',row(update),C,{left:true,map:'C · output coefficients',output:'Update per destination'}),
   add('Add the two paths',carry,injection,'New retained streams'));
 }else if(kind==='feature'){
  const X=hcWiringExample().X;
  scenes=[copyShape('Follow feature 0 across streams','Two stream rows X',X,[[1],[0]],[[0,0],[1,0]],{output:'Feature 0 · one value per stream',note:'The two result cells belong to different streams. They are the same feature coordinate of the original rows.'})];
 }else if(kind==='transport'){scenes=[transport(transportCases()[p.index??3])];
 }else if(kind==='replay'){
  const m=transportReplay(p.coefficient??.75,p.applications??1);
  scenes=m.history.slice(1).map((out,i)=>transport({input:m.history[i],matrix:m.matrix},`Bypass application ${i+1}`));
 }else if(kind==='division'){
  const n=p.division??2,m=sinkhornTrial(n);
  if(n===0)scenes=[divideScene(0)];else{
   const isRow=n%2===1,values=isRow?m.divisors.map(v=>[v]):[m.divisors];
   scenes=[scene(`Find the ${m.axis} totals`,[{label:'Before this division',values:m.previous}],values,m.divisors.map((v,a)=>({row:isRow?a:0,col:isRow?0:a,result:v,terms:[0,1].map(b=>{const i=isRow?a:b,j=isRow?b:a;return term(m.previous[i][j],fmt(m.previous[i][j]),[ref(0,i,j)]);})})),{output:'Divisors',operation:'Add entries along the chosen axis'}),divideScene(n)];
  }
 }else if(kind==='preference'){
  const change=p.change??0,m=sinkhornTrial(0,change);
  scenes=[unary('Turn connection scores into positive amounts','Connection scores',m.logits,Math.exp,{operation:'exp(score)',output:'Positive amounts'})];
  for(let n=1;n<=40;n++)scenes.push(divideScene(n,change));
  const last=sinkhornTrial(40,change);scenes.push(transport({input:[1,0],matrix:last.matrix},'Use the normalized connections'));
 }else if(kind==='measurement'||kind==='coefficient'){
  const m=predictorTrial({swapped:p.swapped??false,dynamic:(p.dynamic??true) ? .5 : 0});
  scenes=[copyShape('Keep stream order while flattening','Retained streams',m.X,row(m.v),[[0,0],[0,1],[1,0],[1,1]],{output:'Flattened coordinates v'}),
   linear('Measure the first-feature difference','Flattened coordinates',row(m.v),m.column.map(v=>[v]),{map:'Learned measurement column w',output:'Measurement vw'})];
  if(kind==='coefficient')scenes.push(...normalize('Find the predictor RMS','Flattened coordinates',m.v,m.normalization.divisor).slice(0,1),
   unary('Normalize the measurement','Measurement vw',[[m.measurement]],v=>v/m.normalization.divisor,{operation:`÷ RMS ${fmt(m.normalization.divisor)}`,output:'Normalized measurement z'}),
   unary('Adjust the learned default','Normalized measurement',[[m.z]],v=>m.bias+m.dynamic*v,{operation:`β + αz · β=${fmt(m.bias)}, α=${fmt(m.dynamic)}`,output:'Connection score'}),
   unary('Convert to an input coefficient','Connection score',[[m.score]],()=>m.inputCoefficient,{operation:'sigmoid(score) + 0.000001',output:'Input coefficient A₀'}),
   unary('Use this input coefficient','Stream 0',row(m.X[0]),v=>v*m.inputCoefficient,{operation:`× A₀ = ${fmt(m.inputCoefficient)}`,output:'Stream 0 contribution',note:'Other input coefficients supply their own contributions; add them to form the one sublayer input.'}));
 }else throw new RangeError('Unknown Day 2 trace: '+kind);
 return definition(scenes);
}
