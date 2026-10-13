import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {attentionStudy} from '../scripts/attention-study.mjs';
import {ATTENTION_EXAMPLE as example,createAttentionStudy} from '../public/attention-study.js';

test('the example normalizes each query row and computes its weighted value vector',()=>{
  assert.deepEqual(example.Q,[[1,.5],[0,1],[1,1.5]]);
  assert.deepEqual(example.K,[[1,0],[.5,1],[1.5,1]]);
  assert.deepEqual(example.V,[[.5,1],[1,-.5],[1.5,.5]]);
  for(const row of example.weights){
    assert.ok(Math.abs(row.reduce((sum,x)=>sum+x,0)-1)<1e-12);
    assert.ok(row.every(x=>x>0&&x<1));
  }
  const a=1/(2+Math.exp(1/Math.sqrt(2)));
  assert.ok(Math.abs(example.weights[0][0]-a)<1e-12);
  assert.ok(Math.abs(example.weights[0][1]-a)<1e-12);
  assert.ok(Math.abs(example.H[0][0]-1.5*(1-a))<1e-12);
  assert.ok(Math.abs(example.H[0][1]-.5*(1-a))<1e-12);
});

const fixture=(reduced=false)=>{
  const {document}=parseHTML(attentionStudy('a')+attentionStudy('b'));
  const timers=new Map();let id=0,inspections=0;
  const preference={matches:reduced,addEventListener(_,fn){this.change=fn;}};
  const study=createAttentionStudy(document,preference,{schedule:fn=>{timers.set(++id,fn);return id;},cancel:id=>timers.delete(id),onInspect:()=>{inspections++;}});
  const tick=()=>{const [key,fn]=timers.entries().next().value;timers.delete(key);fn();};
  return {document,study,timers,tick,preference,inspections:()=>inspections};
};

test('attention unfolds once, holds its result, and suspends when offscreen',()=>{
  const f=fixture();f.study.update({active:true,running:true});
  f.tick();assert.equal(f.study.state().operation,1);
  f.study.update({active:true,running:false});assert.equal(f.timers.size,0);
  f.study.update({active:true,running:true});
  for(let operation=2;operation<=4;operation++){f.tick();assert.equal(f.study.state().operation,operation);}
  assert.equal(f.timers.size,0);
  f.study.update({active:false,running:false});f.study.update({active:true,running:false});
  assert.equal(f.study.state().operation,0);
});

test('manual operation and position selection stays still in both copies',()=>{
  const f=fixture();f.study.update({active:true,running:true});
  f.document.querySelector('[data-attention-operation="3"]').click();
  assert.equal(f.timers.size,0);assert.equal(f.inspections(),1);
  f.document.querySelector('[data-attention-row="2"]').click();
  assert.equal(f.inspections(),2);
  f.study.update({active:true,running:false});
  for(const panel of f.document.querySelectorAll('[data-attention-study]')){
    assert.equal(panel.dataset.operation,'3');
    assert.equal(panel.querySelector('[data-attention-row="2"]').getAttribute('aria-pressed'),'true');
    assert.equal(panel.querySelector('.matrix-weight [data-matrix-row="2"]').dataset.rowActive,'true');
  }
});

test('reduced motion prevents timed unfolding and still permits inspection',()=>{
  const f=fixture(true);f.study.update({active:true,running:true});assert.equal(f.timers.size,0);
  f.document.querySelector('[data-attention-operation="4"]').click();assert.equal(f.study.state().operation,4);
  f.preference.matches=false;f.study.update({active:false,running:false});f.study.update({active:true,running:true});
  assert.equal(f.timers.size,1);
  f.preference.matches=true;f.preference.change();assert.equal(f.timers.size,0);
});

test('new numeric transfers start at zero on the existing SVG clock, including manual inspection',()=>{
  const f=fixture();f.study.update({active:true,running:false});
  const svg=f.document.querySelector('svg'),times=[];let resumes=0;
  svg.setCurrentTime=t=>times.push(t);svg.unpauseAnimations=()=>resumes++;
  f.document.querySelector('[data-attention-operation="1"]').click();
  assert.deepEqual(times,[0]);assert.equal(resumes,1);
  assert.equal(svg.querySelectorAll('[data-attention-packet]').length,9);
  f.study.setOperation(2);
  assert.deepEqual(times,[0,0]);
  assert.equal(svg.querySelectorAll('[data-attention-packet]').length,2);
  f.study.destroy();
});
