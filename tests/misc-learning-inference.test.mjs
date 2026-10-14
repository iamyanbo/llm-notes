import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scalingResources,learningModel,gradientStep,studentSteps} from '../miscellaneous/learning-models.js';
import {scheduleRequests,blockBudget,cacheBudget} from '../miscellaneous/inference-models.js';
test('resource scaling counts actual parameter-token work and later inference can equal training',()=>{
  const model=scalingResources(2,0),data=scalingResources(2,1),both=scalingResources(2,2);
  assert.deepEqual([model.parameters,model.tokens,model.compute],[4,100,2.4]);
  assert.deepEqual([data.parameters,data.tokens,data.compute],[2,200,2.4]);
  assert.deepEqual([both.parameters,both.tokens,both.compute,both.multiplier],[4,200,4.8,4]);
  const use=learningModel('lifetime-compute',{amount:3,step:6});
  assert(Math.abs(use.inference-use.training)<1e-12);
  assert(Math.abs(use.total-8.4)<1e-12);
  const released=learningModel('model-history',{step:7});
  assert.equal(released.selected.billions,2400);assert.equal(released.selected.active,95);
});
test('gradient recurrence and soft-target update match the prose',()=>{
  assert(Math.abs(gradientStep(1).weight-.6)<1e-12);assert(Math.abs(gradientStep(1).loss-1.62)<1e-12);
  const student=studentSteps(1);for(let i=0;i<3;i++)assert(Math.abs(student.logits[i]-[.08,-.01,-.07][i])<1e-12);
  assert(Math.abs(student.probabilities.reduce((s,p)=>s+p,0)-1)<1e-12);
});
test('schedules respect arrivals, causal iterations, capacity, and stated completions',()=>{
  const serial=scheduleRequests(2,true),batched=scheduleRequests(2,false);assert.deepEqual(serial.completion,[3,5,6]);assert.deepEqual(batched.completion,[3,3,4]);assert.equal(serial.mean,11/3);assert.equal(batched.mean,7/3);
  for(const row of batched.timeline){assert(row.selected.length<=2);for(const i of row.selected)assert(row.time>=[0,1,2][i]);}
});
test('block sharing counts the physical prefix once and TTL example has explicit boundary',()=>{
  assert.deepEqual([blockBudget().physical,blockBudget().waste],[3,4]);
  const shared=blockBudget(5,true);assert.deepEqual([shared.physical,shared.unique,shared.waste],[3,8,4]);
  assert.equal(cacheBudget(4).cost,12);assert.equal(cacheBudget(5).cost,102);assert.equal(cacheBudget(4,5,false).cached,0);
});
