import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {WORKED_SCORES,scoreStudy,valueStudy,positionStudy,scaleStudy} from '../public/attention-studies-model.js';
import {scoreToWeights,valueTransformation,positionComparison,scoreScale} from '../public/attention-studies-view.js';
import {createScoreStudy,createValueStudy,createPositionStudy,createScaleStudy} from '../public/attention-studies.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-12,`${a} ≠ ${b}`);
const closeVector=(a,b)=>a.forEach((v,i)=>close(v,b[i]));
const mount=html=>parseHTML(html);

test('the score walkthrough computes positive amounts, shares and the stated weighted output',()=>{
  const data=scoreStudy(),D=3*Math.exp(1)+1+Math.exp(-1);
  close(data.total,D);
  closeVector(data.weights,[Math.exp(1),1,Math.exp(1),Math.exp(1),Math.exp(-1)].map(v=>v/D));
  closeVector(data.output,[(3*Math.exp(1)-Math.exp(-1))/D,(1+Math.exp(1))/D]);
  closeVector(scoreStudy(WORKED_SCORES,2).weights,data.weights);
  const changed=scoreStudy([1,1,1,1,-1]);
  assert.ok(changed.weights[1]>data.weights[1]);
  for(const i of [0,2,3,4])assert.ok(changed.weights[i]<data.weights[i]);
  close(scoreStudy([-2,-2,-2,-2,-2]).weights.reduce((s,v)=>s+v,0),1);
});
test('value transformations change transmitted coordinates while holding comparisons fixed',()=>{
  const original=valueStudy(),swapped=valueStudy(true);
  assert.deepEqual(original.weights,swapped.weights);
  closeVector(swapped.output,[original.output[1],original.output[0]]);
  swapped.values.forEach((v,j)=>assert.deepEqual(v,[original.vectors[j][1],original.vectors[j][0]]));
});
test('rearrangement preserves dog output without positions and can change it with positions',()=>{
  const left=positionStudy(),right=positionStudy('cat');
  assert.deepEqual(left.scores,[1,0,1,1,-1]);
  assert.deepEqual(right.scores,[1,-1,1,1,0]);
  closeVector(left.output,right.output);
  closeVector(left.output,scoreStudy().output);
  const locatedLeft=positionStudy('dog',true),locatedRight=positionStudy('cat',true);
  assert.deepEqual(locatedLeft.X[locatedLeft.receiver],[.25,1]);
  assert.deepEqual(locatedRight.X[locatedRight.receiver],[1,1]);
  assert.ok(Math.abs(locatedLeft.output[0]-locatedRight.output[0])>.01);
});
test('a common score multiplier changes concentration while a zero multiplier gives equal shares',()=>{
  closeVector(scaleStudy(0).weights,[.5,.5]);
  close(scaleStudy().weights[0],Math.E/(Math.E+1));
  assert.ok(scaleStudy(10).weights[0]>.9999);
  close(scaleStudy().weights[0]/scaleStudy().weights[1],Math.E);
});
test('score controls update all stages and the common denominator while retaining keyboard focus targets',()=>{
  const {document,window}=mount(scoreToWeights()),element=document.querySelector('[data-score-study]');
  createScoreStudy(element);
  element.querySelector('[data-score-stage="3"]').click();
  assert.match(element.querySelector('[data-score-status]').textContent,/\(0.818, 0.39\)/);
  const slider=element.querySelector('[data-study-score="1"]');
  slider.value='1';slider.dispatchEvent(new window.Event('input'));
  assert.equal(element.querySelector('[data-study-score="1"]'),slider);
  assert.match(element.querySelector('[data-score-status]').textContent,/\(0.693, 0.484\)/);
  element.querySelector('[data-score-reset]').click();
  assert.match(element.querySelector('[data-score-status]').textContent,/\(0.818, 0.39\)/);
  element.querySelector('[data-score-stage="1"]').click();
  assert.match(element.querySelector('[data-score-status]').textContent,/9.523/);
  const shift=element.querySelector('[data-score-shift]');
  shift.value='2';shift.dispatchEvent(new window.Event('input'));
  assert.match(element.querySelector('[data-score-status]').textContent,/70.364/);
  element.querySelector('[data-score-stage="2"]').click();
  assert.equal(element.querySelector('.score-column b').textContent,'0.285');
});
test('calculation playback ends once and pauses for inspection, hidden pages and reduced motion',()=>{
  const {document,window}=mount(scoreToWeights()),element=document.querySelector('[data-score-study]');
  const timers=new Map();let next=0,changed;
  const preference={matches:false,addEventListener:(_,fn)=>{changed=fn;}};
  createScoreStudy(element,{preference,schedule:fn=>{timers.set(++next,fn);return next;},cancel:id=>timers.delete(id)});
  const play=element.querySelector('[data-study-play]');
  play.click();
  for(let step=1;step<=3;step++){
    const [id,fn]=[...timers][0];timers.delete(id);fn();
    assert.equal(element.querySelector('[data-score-stage][aria-pressed=true]').dataset.scoreStage,String(step));
  }
  assert.equal(timers.size,0);assert.equal(play.getAttribute('aria-pressed'),'false');
  play.click();element.querySelector('[data-score-stage="1"]').click();assert.equal(timers.size,0);
  play.click();Object.defineProperty(document,'hidden',{value:true,configurable:true});
  document.dispatchEvent(new window.Event('visibilitychange'));assert.equal(timers.size,0);
  play.click();preference.matches=true;changed();assert.equal(timers.size,0);
  play.click();assert.equal(timers.size,0);
});
test('value and position controls expose the worked change and follow the receiving dog',()=>{
  const valueDocument=mount(valueTransformation()).document,valueElement=valueDocument.querySelector('[data-value-study]');
  createValueStudy(valueElement);
  valueElement.querySelector('[data-value-map="1"]').click();
  assert.match(valueElement.querySelector('[role=status]').textContent,/Output = \(0.39, 0.818\)/);
  assert.equal(valueElement.querySelectorAll('[aria-pressed=true]').length,1);
  const {document,window}=mount(positionComparison()),positionElement=document.querySelector('[data-position-study]');
  createPositionStudy(positionElement);
  positionElement.querySelector('[data-position-reverse]').click();
  assert.match(positionElement.querySelector('[data-position-status]').textContent,/dog at position 5/);
  assert.equal(positionElement.querySelectorAll('[data-moving=true]').length,2);
  const checkbox=positionElement.querySelector('[data-position-include]');
  checkbox.checked=true;checkbox.dispatchEvent(new window.Event('change'));
  assert.match(positionElement.querySelector('[data-position-status]').textContent,/\(0, 1\) \+ \(1, 0\) = \(1, 1\)/);
});
test('scale control updates existing bars so their widths can animate between the worked values',()=>{
  const {document,window}=mount(scoreScale()),element=document.querySelector('[data-scale-study]');
  createScaleStudy(element);
  const bar=element.querySelector('.context-bar-track>span');
  element.querySelector('[data-scale-preset="10"]').click();
  assert.equal(element.querySelector('.context-bar-track>span'),bar);
  assert.match(element.querySelector('.study-scale-bars b').textContent,/99.995%/);
  const slider=element.querySelector('[data-scale-factor]');
  slider.value='0';slider.dispatchEvent(new window.Event('input'));
  assert.equal(bar.style.width,'50%');
  assert.match(element.querySelector('[data-scale-status]').textContent,/Equal scores/);
});
