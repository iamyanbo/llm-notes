import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {weightedContext,sequenceAttention,softmax} from '../public/context-model.js';
import {contextMixer,sequenceAttentionExplorer} from '../scripts/context-explorers.mjs';
import {createContextMixer,createSequenceAttention} from '../public/context-explorers.js';
import {HEAD_FLOW_START} from '../public/head-flow.js';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-12,`${a} differs from ${b}`);
test('manual context agrees with the worked example and respects coordinate bounds',()=>{
  const vectors=[[1,0],[0,1],[1,1],[1,0],[-1,0]];
  assert.deepEqual(weightedContext(vectors,[0,2,1,0,1]).output,[0,.75]);
  for(const amounts of [[1,1,1,1,1],[0,1,0,0,0],[4,0,0,.25,3]]){
    const {weights,output}=weightedContext(vectors,amounts);near(weights.reduce((a,b)=>a+b),1);
    output.forEach((v,r)=>assert.ok(v>=Math.min(...vectors.map(x=>x[r]))&&v<=Math.max(...vectors.map(x=>x[r]))));
  }
  assert.equal(weightedContext(vectors,[0,0,0,0,0]).output,null);
});
test('softmax is stable, normalized, positive, and invariant under a constant shift',()=>{
  const a=softmax([1000,999,1001]),b=softmax([0,-1,1]);
  a.forEach((v,i)=>{assert.ok(Number.isFinite(v)&&v>0);near(v,b[i]);});near(a.reduce((s,v)=>s+v),1);
});
test('the dog output agrees with an independent calculation of the unpositioned head',()=>{
  const result=sequenceAttention('dog',false),exp=Math.exp(1/Math.sqrt(2)),den=3+2*exp;
  near(result.H[1][0],(.5+2.5*exp)/den);near(result.H[1][1],1/den);
  for(const weights of result.weights)near(weights.reduce((a,b)=>a+b),1);
});
test('reversing tokens permutes unpositioned outputs and position information changes the comparison',()=>{
  const original=sequenceAttention('dog',false),reverse=sequenceAttention('cat',false),permutation=[0,4,2,3,1];
  reverse.H.forEach((row,i)=>row.forEach((v,r)=>near(v,original.H[permutation[i]][r])));
  const a=sequenceAttention('dog',true).H[1],b=sequenceAttention('cat',true).H[4];
  assert.ok(a.some((v,r)=>Math.abs(v-b[r])>.01));
});
test('the mixer handles slider edits, presets, and the zero contribution case',()=>{
  const {document,window}=parseHTML(contextMixer()),element=document.querySelector('[data-context-mixer]');
  createContextMixer(element);
  element.querySelector('[data-context-preset="self"]').click();
  assert.match(element.querySelector('[data-context-verdict]').textContent,/\(0, 1\)/);
  const slider=element.querySelector('[data-context-amount="1"]');slider.value='0';slider.dispatchEvent(new window.Event('input'));
  assert.match(element.querySelector('[data-context-verdict]').textContent,/all-zero row/);
  assert.equal(slider.getAttribute('aria-valuetext'),'0');
  element.querySelector('[data-context-preset="uniform"]').click();
  assert.match(element.querySelector('[data-context-verdict]').textContent,/\(0.4, 0.4\)/);
  assert.equal(element.querySelectorAll('[data-context-preset][aria-pressed=true]').length,1);
});
test('head controls follow dog after reversal and allow all five computation views',()=>{
  const {document,window}=parseHTML(sequenceAttentionExplorer()),element=document.querySelector('[data-sequence-attention]');
  const positions=element.querySelector('[data-head-positions]');positions.checked=true;
  createSequenceAttention(element);
  element.querySelector('[data-head-sentence="cat"]').click();
  assert.equal(element.querySelector('[data-head-row="4"]').getAttribute('aria-pressed'),'true');
  assert.match(element.querySelector('[data-head-status]').textContent,/position 5: dog/);
  for(let stage=0;stage<5;stage++){
    element.querySelector(`[data-head-stage="${stage}"]`).click();
    assert.equal(element.querySelectorAll('[data-head-stage][aria-pressed=true]').length,1);
    assert.equal(element.querySelector('[data-head-stage][aria-pressed=true]').getAttribute('data-head-stage'),String(stage));
    assert.ok(element.querySelector('.context-stage-content').textContent.length>0);
  }
  positions.checked=false;positions.dispatchEvent(new window.Event('change'));
  const outputs=[...element.querySelectorAll('.context-comparison strong')].map(node=>node.textContent);
  assert.equal(outputs[0],outputs[1]);
  element.querySelector('[data-head-next]').click();
  assert.equal(element.querySelector('[data-head-stage="4"]').getAttribute('aria-pressed'),'true');
  assert.equal(element.querySelector('[data-head-progress]').value,String(HEAD_FLOW_START[4]+1));
  element.querySelector('[data-head-reset]').click();
  assert.equal(element.querySelector('[data-head-stage="0"]').getAttribute('aria-pressed'),'true');
});
