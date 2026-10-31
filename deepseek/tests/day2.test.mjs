import test from 'node:test';
import assert from 'node:assert/strict';
import {sinkhornTrial,predictorTrial,expertAt,blockTrace} from '../site/day2-model.mjs';
import {sinkhornStep} from '../site/residual-model.mjs';
import {expertExample} from '../site/expert-model.mjs';
import {divisionDiagram,preferenceDiagram,measurementDiagram,coefficientDiagram,blockDiagram,initializeDay2} from '../site/day2-study.mjs';
const near=(a,b,tol=1e-10)=>assert.ok(Math.abs(a-b)<tol,`${a} differs from ${b}`);
test('the baseline corrections retain the worked fractions and both constraint errors',()=>{
 for(const n of [0,1,2,3,40])assert.deepEqual(sinkhornTrial(n).matrix,sinkhornStep(n).matrix);
 const m=sinkhornTrial(2);near(m.matrix[0][0],7/16);near(m.matrix[0][1],7/13);
 near(m.rows[0],203/208);near(m.rows[1],213/208);near(m.columnError,0);assert.ok(m.rowError>.02);
 assert.throws(()=>sinkhornTrial(41),RangeError);assert.throws(()=>sinkhornTrial(1,3),RangeError);
});
test('changed scores alter the constrained family and preserve its two by two cross ratio',()=>{
 let previous=-Infinity;
 for(const shift of [-2,-1,0,1,2]){
  const m=sinkhornTrial(40,shift),a=Math.sqrt(4*Math.exp(shift)),b=Math.sqrt(6),expected=a/(a+b);
  near(m.matrix[0][0],expected);assert.ok(m.matrix[0][0]>previous);previous=m.matrix[0][0];
  assert.ok(m.rowError<1e-10);assert.ok(m.columnError<1e-10);
  near(m.matrix[0][0]*m.matrix[1][1]/(m.matrix[0][1]*m.matrix[1][0]),4*Math.exp(shift)/6);
  near(m.output[0]+m.output[1],1);
 }
});
test('stream order survives flattening while a common scale approximately cancels',()=>{
 const a=predictorTrial(),b=predictorTrial({swapped:true}),scaled=predictorTrial({scale:10});
 assert.deepEqual(a.streamMean,b.streamMean);assert.deepEqual(a.v,[1,2,0,1]);
 assert.equal(a.measurement,1);assert.equal(b.measurement,-1);near(a.normalization.meanSquare,1.5);
 near(a.z,-b.z);near(a.z,scaled.z,3e-7);assert.equal(scaled.measurement,10);
 near(a.inputCoefficient,.6006687448380497);assert.ok(b.inputCoefficient<a.inputCoefficient);
 near(predictorTrial({dynamic:0}).inputCoefficient,predictorTrial({swapped:true,dynamic:0}).inputCoefficient);
 near(predictorTrial({dynamic:0}).outputCoefficient,1);
 assert.throws(()=>predictorTrial({scale:0}),RangeError);
});
test('the block uses the actual Day 1 expert weights on the changed normalized input',()=>{
 const e=expertExample();expertAt(e.input).output.forEach((v,i)=>near(v,e.output[i]));
 const m=blockTrace(),zero=blockTrace(0);
 assert.deepEqual(m.Y,[[1.75,1.25],[2.25,.25]]);assert.deepEqual(m.expertInput,[2,.75]);
 near(m.expertNorm.divisor,Math.sqrt(2.28125+1e-6));
 near(m.expert.output[0],2.9259962778480304);near(m.expert.output[1],-2.2079289220732083);
 near(m.result[0][0],3.337998138924015);near(m.result[1][1],-1.7079289220732083);
 assert.deepEqual(zero.Y,m.attentionCarry);assert.notDeepEqual(zero.expertInput,m.expertInput);assert.notDeepEqual(zero.expert.output,m.expert.output);
 assert.throws(()=>blockTrace(-1),RangeError);
});
test('all continuation diagrams expose finite values and accessible descriptions',()=>{
 const diagrams=[measurementDiagram(),...Array.from({length:41},(_,i)=>divisionDiagram(i)),...[-2,0,2].map(preferenceDiagram),...[false,true].flatMap(s=>[false,true].map(d=>coefficientDiagram(s,d))),...[0,1].flatMap(s=>[0,1].map(a=>blockDiagram(s,a)))];
 for(const d of diagrams){assert.match(d,/role="img"/);assert.match(d,/<title>.+<\/title>/);assert.doesNotMatch(d,/undefined|NaN|Infinity/);}
});
function study(){const nodes=new Map();return {querySelector(s){if(!nodes.has(s))nodes.set(s,{value:'0',checked:true,innerHTML:'',textContent:'',disabled:false,events:{},addEventListener(t,fn){this.events[t]=fn;}});return nodes.get(s);}};}
test('the correction inspector advances from the worked case and stops and restarts',()=>{
 const s=study();s.querySelector('[data-d2-division]').value='2';initializeDay2({querySelectorAll:q=>q==='[data-d2-sinkhorn]'?[s]:[]});
 const next=s.querySelector('[data-d2-next]'),range=s.querySelector('[data-d2-division]');
 next.events.click();assert.equal(range.value,'3');assert.match(s.querySelector('[data-d2-detail]').textContent,/corrects the columns/);
 range.value='40';range.events.input();assert.equal(next.disabled,true);next.events.click();assert.equal(range.value,'40');
 s.querySelector('[data-d2-reset]').events.click();assert.equal(range.value,'0');assert.equal(next.disabled,false);
});
test('preference and predictor controls change the actual calculated values',()=>{
 const p=study(),c=study();initializeDay2({querySelectorAll:q=>q==='[data-d2-preference]'?[p]:q==='[data-d2-coefficient]'?[c]:[]});
 const score=p.querySelector('[data-d2-score]');score.value='1';score.events.input();assert.match(p.querySelector('[data-d2-svg]').innerHTML,/Score change: 1/);assert.equal(p.querySelector('[data-d2-score-reset]').disabled,false);
 p.querySelector('[data-d2-score-reset]').events.click();assert.equal(score.value,'0');
 const state=c.querySelector('[data-d2-arrangement]');state.value='swapped';state.events.change();assert.match(c.querySelector('[data-d2-svg]').innerHTML,/0.399333/);
 const dynamic=c.querySelector('[data-d2-dynamic]');dynamic.checked=false;dynamic.events.change();assert.match(c.querySelector('[data-d2-svg]').innerHTML,/0.500001/);
});
test('the block comparison recomputes the downstream expert and both linked tables',()=>{
 const s=study(),result={innerHTML:''},expert={innerHTML:''};s.querySelector('[data-d2-attention]').value='1';
 initializeDay2({querySelectorAll:q=>q==='[data-d2-block]'?[s]:q==='[data-d2-block-result]'?[result]:q==='[data-d2-expert-table]'?[expert]:[]});
 s.querySelector('[data-d2-block-next]').events.click();assert.equal(s.querySelector('[data-d2-block-stage]').value,'1');assert.equal(s.querySelector('[data-d2-block-next]').disabled,true);
 assert.match(s.querySelector('[data-d2-svg]').innerHTML,/2.926/);assert.match(result.innerHTML,/3.338/);assert.match(expert.innerHTML,/2.926/);
 const strength=s.querySelector('[data-d2-attention]');strength.value='0';strength.events.change();assert.doesNotMatch(result.innerHTML,/3.338/);assert.doesNotMatch(expert.innerHTML,/2.926/);
 assert.match(result.innerHTML,/attention output \(0, 0\)/);assert.match(s.querySelector('[data-d2-detail]').textContent,/from Y/);
});
