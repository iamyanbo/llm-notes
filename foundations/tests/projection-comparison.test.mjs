import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {COMPARISON_DEFAULT,compareProjection,projectionComparison,createProjectionComparison} from '../public/projection-comparison.js';
test('scalar comparisons agree with the worked scores and change when roles or coefficients change',()=>{
  const initial=compareProjection();
  assert.equal(initial.q,1);assert.equal(initial.k,1);assert.equal(initial.score,1);
  assert.deepEqual(initial.row,[1,0,1,1,-1]);
  assert.equal(compareProjection({...COMPARISON_DEFAULT,receiver:'chased',candidate:'dog'}).score,0);
  assert.equal(compareProjection({...COMPARISON_DEFAULT,key:[1,1]}).score,2);
});
test('controls update the calculation while preserving the selected stage',()=>{
  const {document,window}=parseHTML(projectionComparison()),element=document.querySelector('[data-projection-comparison]');
  createProjectionComparison(element);
  element.querySelector('[data-comparison-step="2"]').click();
  assert.match(element.querySelector('[data-comparison-status]').textContent,/Score 1/);
  element.querySelector('[data-comparison-reverse]').click();
  assert.match(element.querySelector('[data-comparison-status]').textContent,/Score 0/);
  element.querySelector('[data-comparison-reverse]').click();
  const coefficient=element.querySelector('[data-comparison-coefficient="key"][data-coordinate="1"]');
  coefficient.value='1';coefficient.dispatchEvent(new window.Event('input'));
  assert.match(element.querySelector('[data-comparison-status]').textContent,/Score 2/);
  assert.equal(element.querySelector('[data-comparison-step="2"]').getAttribute('aria-pressed'),'true');
  assert.equal(coefficient.nextElementSibling.textContent,'1');
});
test('playback ends at the score and pauses for inspection, hidden pages, and reduced motion',()=>{
  const {document,window}=parseHTML(projectionComparison()),element=document.querySelector('[data-projection-comparison]');
  const timers=new Map();let next=0,changed;
  const preference={matches:false,addEventListener:(_,fn)=>{changed=fn;}};
  createProjectionComparison(element,{preference,schedule:fn=>{timers.set(++next,fn);return next;},cancel:id=>timers.delete(id)});
  const play=element.querySelector('[data-comparison-play]');
  play.click();
  for(let step=1;step<=2;step++){
    const [id,fn]=[...timers][0];timers.delete(id);fn();
    assert.equal(element.querySelector('[data-comparison-step][aria-pressed=true]').dataset.comparisonStep,String(step));
  }
  assert.equal(timers.size,0);assert.equal(play.getAttribute('aria-pressed'),'false');
  play.click();element.querySelector('[data-comparison-next]').click();assert.equal(timers.size,0);
  play.click();Object.defineProperty(document,'hidden',{value:true,configurable:true});
  document.dispatchEvent(new window.Event('visibilitychange'));assert.equal(timers.size,0);
  play.click();preference.matches=true;changed();assert.equal(timers.size,0);
  play.click();assert.equal(timers.size,0);
  assert.equal(element.querySelector('[data-comparison-step="2"]').getAttribute('aria-pressed'),'true');
});
