import {test} from 'node:test';
import assert from 'node:assert/strict';
import {product,matrixFrame,energyBudget,memoryBudget,yieldBudget,supplyBudget,rooflineBudget,parallelBudget,lastLabStep,LAB_SPECS,modelFor} from '../miscellaneous/lab-models.js';
import {viewFor} from '../miscellaneous/lab-view.js';
test('every matrix accumulation matches its consumed products and outputs are written after the second sum',()=>{
  assert.deepEqual(product(),[[4,4],[10,8]]);
  for(let step=0;step<32;step++){const frame=matrixFrame(step),expected=frame.terms.slice(0,frame.term).reduce((s,x)=>s+x,0)+(frame.phase>=2?frame.terms[frame.term]:0);assert.equal(frame.partial,expected);assert.equal(frame.stored[frame.row][frame.column],step%8===7?frame.output[frame.row][frame.column]:null);}
  assert.deepEqual(matrixFrame(32).stored,product());
  assert.equal(lastLabStep('matrix-tile',{choice:1}),8);
});
test('energy units and idle contribution agree with the worked examples',()=>{
  const busy=energyBudget();assert.equal(busy.itPower,7);assert.equal(busy.itEnergy,42);assert.equal(busy.facilityEnergy,50.4);
  const half=energyBudget({utilization:.5});assert.equal(half.itPower,5);assert.equal(half.facilityEnergy,36);
});
test('memory terms preserve bytes, head counts, and shared weights',()=>{
  const one=memoryBudget(),four=memoryBudget({batch:4});assert.equal(one.weights,14e9);assert.equal(one.cache,536870912);assert.equal(four.cache,4*one.cache);assert.equal(four.weights,one.weights);
  assert.equal(memoryBudget({training:true}).total,112e9);
});
test('bounds reflect their stated bottlenecks and assumptions',()=>{
  assert.equal(supplyBudget().available,500);assert.equal(rooflineBudget(2).bound,20);assert.equal(rooflineBudget(20).bound,100);
  assert(Math.abs(yieldBudget(4).yield-Math.exp(-2))<1e-12);
  assert.equal(parallelBudget(1).speedup,1);assert(Math.abs(parallelBudget(4).ideal-1/.325)<1e-12);
});
test('every current demo produces finite values at control boundaries through its last step',()=>{
  for(const [kind,spec] of Object.entries(LAB_SPECS))for(const amount of new Set([spec.default,...(spec.label?[spec.min,spec.max]:[])]))for(let choice=0;choice<(spec.choice?.length??1);choice++){
    const state={amount,choice};for(let step=0;step<=lastLabStep(kind,state);step++){const view=viewFor(modelFor(kind,{...state,step}));assert(!/NaN|Infinity/.test(view.html),kind);assert(view.status.length>0,kind);}
  }
});
