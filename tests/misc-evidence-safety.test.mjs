import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedScore,calibrationValues,coordination,evidenceAgentModel,propagation} from '../miscellaneous/evidence-agent-models.js';
import {projection,intervention,safetyModel} from '../miscellaneous/safety-models.js';
import {modelFor,product} from '../miscellaneous/lab-models.js';
const near=(a,b)=>assert(Math.abs(a-b)<1e-10,a+' ≠ '+b);
test('branching distinguishes contaminated counts from bounded probabilities and honors verification',()=>{
  assert.deepEqual(propagation(3,0,3).counts,[1,3,9,27]);
  assert.equal(propagation(3,0,3).total,40);
  assert.deepEqual(propagation(3,.75,3).counts,[1,.75,.5625,.421875]);
  assert.deepEqual(propagation(3,1,3).counts,[1,0,0,0]);
  assert.deepEqual(propagation(3,0,1).counts,[1,1,1,1]);
});
test('selection calculation has the correct single-candidate expectation and monotone maximum',()=>{
  near(selectedScore(1).accuracy,.7);
  let previous=.7;
  for(let k=2;k<=20;k++){const score=selectedScore(k);assert(score.accuracy>=previous&&score.accuracy<=1);previous=score.accuracy;}
  const matched=evidenceAgentModel('release-conditions',{step:10,choice:1});
  const reported=evidenceAgentModel('release-conditions',{step:10,choice:0});
  assert.equal(matched.a,7);assert.equal(matched.b,5);assert.equal(reported.b,9);
});
test('calibration changes probabilities without silently changing the fixed groups or decisions',()=>{
  const base=calibrationValues();near(base.brier,.365);near(base.ece,.25);
  for(const temperature of [.5,1,3]){
    const values=calibrationValues(temperature);assert.equal(values.bins[0].count,5);
    assert(values.probabilities.every(p=>p>.5&&p<1));near(values.bins[0].accuracy,.4);near(values.bins[1].accuracy,.6);
  }
});
test('compaction loses exactly the local-versus-upload distinction when the constraint is removed',()=>{
  const state={step:3,amount:2};
  const local=evidenceAgentModel('context-compaction',{...state,choice:0}),upload=evidenceAgentModel('context-compaction',{...state,choice:1});
  assert.notEqual(local.required,upload.required);
  assert.deepEqual(local.fields.filter(f=>f.retained),upload.fields.filter(f=>f.retained));
  assert.equal(local.decisionKnown,false);
  assert.equal(evidenceAgentModel('context-compaction',{step:3,amount:0,choice:0}).decisionKnown,true);
  for(let n=1;n<=8;n++){near(coordination(n,0).success,.9**n);near(coordination(n,1).success,1-.1**n);near(coordination(n,2).success,.9**n*.98**(n*(n-1)/2));}
});
test('projection is orthogonal, conserves the orthogonal decomposition, and edits the output dimension',()=>{
  const full=projection();near(full.dot,4.8);near(full.remainingDot,0);
  near(full.retained[0],1.12);near(full.retained[1],-.84);
  near(full.removed.reduce((s,v)=>s+v*v,0)+full.retained.reduce((s,v)=>s+v*v,0),25);
  const expected=[[-.8,-.64],[.6,.48]];
  full.edited.forEach((row,i)=>row.forEach((v,j)=>near(v,expected[i][j])));
  const none=projection(0);assert.deepEqual(none.retained,[4,3]);assert.deepEqual(none.edited,[[1,2],[3,4]]);
  for(const fraction of [0,.25,.5,1])near(projection(fraction).remainingDot,4.8*(1-fraction));
});
test('causal interventions and sufficient-statistic removal agree with the independently calculated references',()=>{
  assert.equal(intervention(2,0).output,1);assert.equal(intervention(2,1).output,-3);assert.equal(intervention(2,2).output,4);
  for(let choice=0;choice<3;choice++){
    const model=safetyModel('unlearning-mean',{step:4,choice});assert.equal(model.after,model.retrained);
  }
  assert.equal(safetyModel('unlearning-mean',{step:4,choice:2}).after,1.5);
  const split=modelFor('distributed',{step:4,amount:2,choice:1});
  assert.deepEqual(split.partials[0].map((row,i)=>row.map((v,j)=>v+split.partials[1][i][j])),product());
});
