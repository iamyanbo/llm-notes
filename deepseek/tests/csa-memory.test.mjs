import test from 'node:test';
import assert from 'node:assert/strict';
import {memoryAt,compressedSupport,csaMemoryDefinition,csaMemorySVG,csaMemoryFigure} from '../site/csa-memory-study.mjs';
import {withTrace,createTracePlayer,initializeDay2Traces} from '../site/day2-trace.mjs';
import {motionParts} from '../site/trace-motion.mjs';

test('CSA emits summaries before any source leaves the actual 128-position local window',()=>{
 const m=memoryAt(7);assert.deepEqual(m.local,[0,1,2,3,4,5,6,7]);assert.equal(m.global.length,2);
 assert.deepEqual(m.global[0],{id:0,previous:[],current:[0,1,2,3],completeAt:3});
 assert.deepEqual(m.global[1].previous,[0,1,2,3]);assert.deepEqual(m.global[1].current,[4,5,6,7]);
 for(let p=0;p<140;p++){
  const s=memoryAt(p);assert.equal(s.local.length,Math.min(128,p+1));assert.equal(s.global.length,Math.floor((p+1)/4));
  for(const e of s.global)assert.ok([...e.previous,...e.current].every(source=>source<=p));
  if(s.evicted!==null){assert.ok(!s.local.includes(s.evicted));assert.ok(s.global.some(e=>[...e.previous,...e.current].includes(s.evicted)));}
 }
 assert.throws(()=>memoryAt(.5),RangeError);
});

test('window eviction preserves old summaries and entry 32 waits for the last candidate',()=>{
 const before=memoryAt(127),evicted=memoryAt(128),unfinished=memoryAt(130),complete=memoryAt(131);
 assert.equal(before.local[0],0);assert.equal(evicted.local[0],1);assert.deepEqual(evicted.global,before.global);
 assert.equal(unfinished.global.length,32);assert.equal(complete.global.length,33);
 assert.deepEqual(complete.global.at(-1),{id:32,previous:[124,125,126,127],current:[128,129,130,131],completeAt:131});
 assert.equal(complete.local[0],4);assert.deepEqual(complete.global[0],compressedSupport(0));
});

test('the trace reveals insertions and summaries only at their arrivals, with a labelled time jump',()=>{
 const d=csaMemoryDefinition(),i=d.steps.findIndex(s=>s.type==='arrival'&&s.position===3),early=csaMemorySVG(i,.4),candidates=csaMemorySVG(i,.6),done=csaMemorySVG(i,1);
 assert.match(early,/Local window · 3 \/ 128 entries/);assert.match(candidates,/Local window · 4 \/ 128 entries/);
 assert.match(candidates,/Compressed memory · 0 entries/);assert.match(done,/Compressed memory · 1 entry/);
 const j=d.steps.findIndex(s=>s.type==='jump');assert.equal(d.steps[j-1].position,7);assert.equal(d.steps[j+1].position,128);
 assert.match(csaMemorySVG(j),/Positions 8–126 were processed/);
 for(let k=0;k<d.steps.length;k++)for(const p of [0,.2,.4,.6,.8,1]){
  const svg=csaMemorySVG(k,p);assert.doesNotMatch(svg,/NaN|undefined|Infinity/);
  assert.doesNotMatch(csaMemorySVG(k,p,{motion:false}),/class="trace-packet/);
 }
 const a=motionParts(csaMemorySVG(i,.15)),b=motionParts(csaMemorySVG(i,.25));
 assert.equal(a.base,b.base);assert.equal(a.packets.length,2);assert.notEqual(a.packets[0].transform,b.packets[0].transform);
 const html=withTrace(csaMemoryFigure(),'csa-memory');assert.match(html,/data-flow-speed/);assert.match(html,/data-week-diagram/);assert.match(html,/id="compression--memory-trace"/);
});

function clock(){let serial=0;const pending=new Map();return {schedule:fn=>{pending.set(++serial,fn);return serial;},cancel:id=>pending.delete(id),advance:t=>{const callbacks=[...pending.values()];pending.clear();callbacks.forEach(fn=>fn(t));},size:()=>pending.size};}
test('custom arrival timing preserves slow movement, pause/speed continuity and finite stopping',()=>{
 const d=csaMemoryDefinition(),c=clock(),p=createTracePlayer({count:d.steps.length,render:()=>{},schedule:c.schedule,cancel:c.cancel,timing:d.timing});
 p.next();c.advance(0);c.advance(3000);assert.equal(p.state().phase,1/3);
 p.pause();assert.equal(c.size(),0);p.setSpeed(.5);p.play();c.advance(6000);c.advance(9000);assert.equal(p.state().phase,.5);
 p.seek(d.steps.length-2);p.next();c.advance(10000);c.advance(19000);assert.equal(p.state().playing,true);c.advance(28000);assert.equal(p.state().index,d.steps.length-1);assert.equal(p.state().playing,false);assert.equal(c.size(),0);
 p.restart();assert.equal(p.state().index,0);
});

test('the CSA canvas binds the shared controls, state selection and reduced-motion result',()=>{
 const nodes=new Map(),listeners={},c=clock(),preference={matches:false,addEventListener(t,fn){this.change=fn;},removeEventListener(){}};
 const e={dataset:{flowKind:'csa-memory',flowParams:'{}'},querySelector(s){if(['[data-d2-svg]','[data-residual-svg]'].includes(s))return null;if(!nodes.has(s))nodes.set(s,{value:'0',textContent:'',innerHTML:'',events:{},setAttribute(k,v){this[k]=v;},addEventListener(t,fn){this.events[t]=fn;}});return nodes.get(s);},addEventListener(t,fn){listeners[t]=fn;},removeEventListener(){}};
 const root={querySelectorAll:()=>[e],addEventListener(){},removeEventListener(){}};
 const h=initializeDay2Traces(root,{preference,schedule:c.schedule,cancel:c.cancel,Observer:null}),canvas=e.querySelector('[data-week-diagram]');
 e.querySelector('[data-flow-next]').events.click();c.advance(0);c.advance(9000);assert.match(canvas.innerHTML,/Local window · 1 \/ 128 entries/);
 const select=e.querySelector('[data-flow-scene]');select.value='9';select.events.change({target:select});assert.match(canvas.innerHTML,/Local window · 128 \/ 128 entries/);assert.match(canvas.innerHTML,/Compressed memory · 32 entries/);
 preference.matches=true;preference.change();e.querySelector('[data-flow-play]').events.click();assert.equal(c.size(),0);assert.match(canvas.innerHTML,/Compressed memory · 33 entries/);assert.doesNotMatch(canvas.innerHTML,/class="trace-packet/);
 h.destroy();
});
