import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {sumPartial,createSumWalkthrough} from '../public/sum-walkthrough.js';
import {sumWalkthrough} from '../scripts/sum-walkthrough.mjs';

test('the addition steps agree with the equation and expose horizontal cancellation',()=>{
  assert.deepEqual(sumPartial(0),[0,0]);
  assert.deepEqual(sumPartial(1),[0,.5]);
  assert.deepEqual(sumPartial(2),[.25,.75]);
  assert.deepEqual(sumPartial(3),[0,.75]);
  const {document}=parseHTML(sumWalkthrough()),element=document.querySelector('[data-sum-walkthrough]');
  createSumWalkthrough(element);
  element.querySelector('[data-sum-step="2"]').click();
  assert.match(element.querySelector('[data-sum-status]').textContent,/\(0.25, 0.75\)/);
  element.querySelector('[data-sum-next]').click();
  assert.match(element.querySelector('[data-sum-status]').textContent,/horizontal components cancel/);
  assert.equal(element.querySelector('.sum-result-label').textContent,'(0, 0.75)');
  assert.equal(element.querySelectorAll('[data-sum-step][aria-pressed=true]').length,1);
});
test('addition playback ends after the final term and stops for inspection or reduced motion',()=>{
  const {document}=parseHTML(sumWalkthrough()),element=document.querySelector('[data-sum-walkthrough]');
  const timers=new Map();let next=0,changed;
  const preference={matches:false,addEventListener:(_,fn)=>{changed=fn;}};
  createSumWalkthrough(element,{preference,schedule:fn=>{timers.set(++next,fn);return next;},cancel:id=>timers.delete(id)});
  const play=element.querySelector('[data-sum-play]');
  play.click();
  for(let step=1;step<=3;step++){
    const [id,fn]=[...timers][0];timers.delete(id);fn();
    assert.equal(element.querySelector('[data-sum-step][aria-pressed=true]').getAttribute('data-sum-step'),String(step));
  }
  const [id,fn]=[...timers][0];timers.delete(id);fn();
  assert.equal(timers.size,0);assert.equal(play.getAttribute('aria-pressed'),'false');
  play.click();element.querySelector('[data-sum-step="1"]').click();
  assert.equal(timers.size,0);
  play.click();preference.matches=true;changed();
  assert.equal(timers.size,0);assert.equal(play.textContent,'Play addition');
});
