import test from 'node:test';
import assert from 'node:assert/strict';
import {flowDefinition} from '../site/day2-trace-model.mjs';
import {pointAlong,traceSVG,withTrace,createTracePlayer,initializeDay2Traces,readFlowParams} from '../site/day2-trace.mjs';
import {tracePhase,calculationTiming} from '../site/trace-motion.mjs';
import {constraintFigure} from '../site/residual-study.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} differs from ${b}`);
const cases=[['alternatives'],['hc-overview'],...Array.from({length:4},(_,stage)=>['hc-wiring',{stage}]),['feature'],...[0,1,2,3].map(index=>['transport',{index}]),['replay',{coefficient:.75,applications:6}],...[0,1,2,40].map(division=>['division',{division}]),['preference',{change:2}],['measurement'],['coefficient'],['coefficient',{swapped:true,dynamic:false}],['block'],['block',{stage:1,strength:0}]];
test('every scene has valid source cells and reproduces its scalar arithmetic',()=>{
 for(const [kind,params] of cases){
  const def=flowDefinition(kind,params);assert.ok(def.steps.length>1);assert.ok(def.scenes.length);
  for(const s of def.scenes)for(const c of s.cells){
   assert.ok(Number.isFinite(c.result));
   for(const t of c.terms){
    assert.ok(Number.isFinite(t.value));assert.ok(t.expression);
    for(const source of t.sources)assert.ok(Number.isFinite(s.inputs[source.input].values[source.row][source.col]));
    if(t.weight){const a=t.sources[0];near(t.value,s.inputs[a.input].values[a.row][a.col]*s.parameters.values[t.weight[0]][t.weight[1]]);}
   }
   if(!c.finish)near(c.result,c.terms.reduce((n,t)=>n+t.value,0));
   near(c.result,s.output.values[c.row][c.col]);
  }
 }
 assert.deepEqual(flowDefinition('transport',{index:3}).scenes[0].output.values,[[.75],[.25]]);
 near(flowDefinition('measurement').scenes.at(-1).output.values[0][0],1);
});
const outputCells=svg=>[...svg.matchAll(/<g data-present="(true|false)" data-cell="out:/g)].map(m=>m[1]==='true');
test('results appear only after their coordinate has arrived, with operands and parameters visible',()=>{
 const a=traceSVG('transport',{index:3},0),b=traceSVG('transport',{index:3},1,.25),c=traceSVG('transport',{index:3},1,1),d=traceSVG('transport',{index:3},2,.3);
 assert.deepEqual(outputCells(a),[false,false]);assert.deepEqual(outputCells(b),[false,false]);assert.deepEqual(outputCells(c),[true,false]);assert.deepEqual(outputCells(d),[true,false]);
 assert.deepEqual(outputCells(traceSVG('transport',{index:3},2,1)),[true,true]);
 assert.match(b,/trace-packet/);assert.match(b,/Sum so far/);assert.match(b,/B · destination rows/);assert.notEqual(b,d);
 for(const [kind,params] of cases){
  const def=flowDefinition(kind,params),last=def.steps.length-1,svg=traceSVG(kind,params,last,1);
  assert.ok(outputCells(svg).every(Boolean));assert.doesNotMatch(svg,/NaN|undefined|Infinity|class="trace-packet/);
  const still=traceSVG(kind,params,1,.5,{motion:false});assert.doesNotMatch(still,/class="trace-packet/);assert.match(still,/<title>/);
 }
 const html=withTrace(constraintFigure(),'transport',{index:3});assert.match(html,/data-flow-play/);assert.match(html,/data-flow-scene/);assert.match(html,/role="status"/);
 assert.deepEqual(pointAlong([[0,0],[3,0],[3,4]],.5),[3,.5]);
});
function clock(){let serial=0;const pending=new Map();return {schedule:fn=>{const id=++serial;pending.set(id,fn);return id;},cancel:id=>pending.delete(id),advance:time=>{const entries=[...pending.values()];pending.clear();entries.forEach(fn=>fn(time));},size:()=>pending.size};}
test('finite playback pauses, resumes its current packet and stops at the final result',()=>{
 const c=clock(),frames=[],p=createTracePlayer({count:4,render:s=>frames.push({...s}),schedule:c.schedule,cancel:c.cancel});
 p.play();assert.equal(p.state().index,1);c.advance(0);c.advance(900);near(p.state().phase,tracePhase(900));
 p.pause();assert.equal(c.size(),0);const saved=p.state().phase;c.advance(5000);near(p.state().phase,saved);
 p.play();c.advance(6000);c.advance(12000);near(p.state().phase,1);c.advance(12500);assert.equal(p.state().index,2);
 c.advance(19900);c.advance(27300);assert.equal(p.state().index,3);assert.equal(p.state().playing,false);assert.equal(c.size(),0);
 p.play();assert.equal(p.state().index,1);p.restart();assert.equal(p.state().index,0);assert.equal(c.size(),0);
});
test('manual operations cancel autoplay, settle one step and support seek, refresh and reduced motion',()=>{
 const c=clock(),p=createTracePlayer({count:8,render:()=>{},schedule:c.schedule,cancel:c.cancel});
 p.next();c.advance(0);c.advance(7500);assert.equal(p.state().index,1);assert.equal(p.state().playing,false);
 p.play();c.advance(8000);c.advance(8300);p.next();assert.equal(p.state().index,3);c.advance(8400);c.advance(15900);assert.equal(p.state().playing,false);
 p.seek(7);p.refresh(2);assert.equal(p.state().index,0);assert.equal(p.state().count,2);assert.equal(c.size(),0);
 p.seek(99);assert.equal(p.state().index,1);p.previous();assert.equal(p.state().index,0);
 const reduced=createTracePlayer({count:5,render:()=>{},schedule:c.schedule,cancel:c.cancel,reduced:()=>true});reduced.play();assert.equal(reduced.state().index,4);assert.equal(c.size(),0);reduced.restart();reduced.next();assert.equal(reduced.state().index,1);assert.equal(c.size(),0);
});
function element(){
 const nodes=new Map(),listeners={};return {dataset:{flowKind:'division',flowParams:'{"division":2}'},listeners,
 querySelector(key){if(!nodes.has(key))nodes.set(key,{value:key==='[data-d2-division]'?'2':'0',checked:true,textContent:'',innerHTML:'',events:{},disabled:false,setAttribute(k,v){this[k]=v;},addEventListener(t,fn){this.events[t]=fn;}});return nodes.get(key);},
 addEventListener(t,fn){listeners[t]=fn;},removeEventListener(t){delete listeners[t];}};
}
test('parameter edits reset a running trace; visibility, offscreen and preference changes cancel playback',()=>{
 const c=clock(),e=element(),listeners={},preference={matches:false,addEventListener(t,fn){this.change=fn;},removeEventListener(){}};let observed;
 class Observer{constructor(fn){this.fire=fn;observed=this;}observe(){}disconnect(){this.disconnected=true;}}
 const root={hidden:false,querySelectorAll:()=>[e],addEventListener(t,fn){listeners[t]=fn;},removeEventListener(t){delete listeners[t];}};
 const handle=initializeDay2Traces(root,{preference,schedule:c.schedule,cancel:c.cancel,Observer}),p=handle.players[0].player;
 p.seek(7);p.play();e.querySelector('[data-d2-division]').value='0';e.listeners.input({target:{closest:s=>s==='.flow-controls'?null:{}}});
 assert.equal(p.state().index,0);assert.equal(p.state().count,5);assert.equal(e.querySelector('[data-flow-seek]').max,'4');assert.equal(c.size(),0);
 p.play();root.hidden=true;listeners.visibilitychange();assert.equal(p.state().playing,false);assert.equal(c.size(),0);
 root.hidden=false;p.play();observed.fire([{isIntersecting:false}]);assert.equal(c.size(),0);
 p.restart();p.play();preference.matches=true;preference.change();assert.equal(c.size(),0);assert.doesNotMatch(e.querySelector('[data-d2-svg]').innerHTML,/class="trace-packet/);
 handle.destroy();assert.equal(observed.disconnected,true);assert.equal(c.size(),0);
});
test('control state is read from each existing calculation, including the replay application count',()=>{
 const e=element();e.dataset.flowKind='replay';e.dataset.flowParams='{}';e.querySelector('[data-transport-coefficient]').value='.5';e.querySelector('[data-transport-count]').textContent='4 / 6 applications';assert.deepEqual(readFlowParams(e),{coefficient:.5,applications:4});
 e.dataset.flowKind='block';e.querySelector('[data-d2-block-stage]').value='1';e.querySelector('[data-d2-attention]').value='0';assert.deepEqual(readFlowParams(e),{stage:1,strength:0});
});


test('starting a second diagram pauses the first numerical trace',()=>{
 const c=clock(),elements=[element(),element()],root={hidden:false,querySelectorAll:()=>elements,addEventListener(){},removeEventListener(){}};
 const h=initializeDay2Traces(root,{schedule:c.schedule,cancel:c.cancel,Observer:null,preference:{matches:false}});
 h.players[0].player.play();assert.equal(c.size(),1);
 h.players[1].player.play();assert.equal(h.players[0].player.state().playing,false);assert.equal(h.players[1].player.state().playing,true);assert.equal(c.size(),1);
 h.destroy();assert.equal(c.size(),0);
});

test('weekly diagrams bind the shared playback and calculation selector to their actual canvas',()=>{
 const e=element(),base=e.querySelector.bind(e),c=clock();e.dataset.flowKind='week-attention';e.dataset.flowParams='{}';
 e.querySelector=s=>s==='[data-d2-svg]'||s==='[data-residual-svg]'?null:base(s);
 const root={hidden:false,querySelectorAll:()=>[e],addEventListener(){},removeEventListener(){}};
 const h=initializeDay2Traces(root,{schedule:c.schedule,cancel:c.cancel,Observer:null,preference:{matches:false}});
 assert.match(base('[data-week-diagram]').innerHTML,/Query divided by √2/);
 base('[data-flow-next]').events.click();c.advance(0);c.advance(calculationTiming(0,2).duration+1);
 assert.equal(h.players[0].player.state().index,1);assert.match(base('[data-week-diagram]').innerHTML,/data-present="true" data-cell="out:0:0"/);
 const select=base('[data-flow-scene]');select.value='20';select.events.change({target:select});
 assert.equal(h.players[0].player.state().playing,false);assert.match(base('[data-week-diagram]').innerHTML,/Add the transmitted coordinates/);
 h.destroy();
});
