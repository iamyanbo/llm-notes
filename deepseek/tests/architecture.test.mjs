import test from 'node:test';
import assert from 'node:assert/strict';
import {calculation,architectureStages,architectureDiagram,architectureGraphic,architectureFigure,initialArchitecture,stageSpec,createArchitecturePlayer} from '../site/architecture.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-12,`${a} != ${b}`);
test('architecture drilldowns compute the shared-KV, routing and residual examples',()=>{
 const pooled=calculation('compression').result;near(pooled[0],4);near(pooled[1],3.5);
 const a=calculation('attention');near(a.result[0],3*Math.log(3)/8);near(a.result[1],4);near(a.weights[2],.5);near(a.weights.reduce((s,x)=>s+x,0),1);
 const experts=calculation('experts');near(experts.result[0],4.7346072767572895);near(experts.result[1],8.990647038910907);
 assert.deepEqual(calculation('residual').result,[[1.5,0],[2.5,0],[2.5,0],[3.5,-1]]);
 near(calculation('head').result.reduce((s,x)=>s+x*x,0)/2,1);
 assert.deepEqual(calculation('mtp').result,[1.5,2.5,3.5,4.5]);
 assert.equal(calculation('output').result.indexOf(Math.max(...calculation('output').result)),0);
});
test('every clickable architecture component has a four-step calculation and stable derivation',()=>{
 for(const variant of ['flash','pro','v41']){
  const svg=architectureDiagram(variant);const keys=[...svg.matchAll(/data-arch-node="([^"]+)"/g)].map(m=>m[1]);
  for(const key of new Set(keys)){
   const s=stageSpec(key,variant),c=calculation(s.kind);assert.equal(c.steps.length,4);assert.ok(s.url.startsWith('#'));
   for(let step=0;step<4;step++)assert.doesNotMatch(architectureGraphic({...initialArchitecture(),variant,panel:key,step}),/NaN|undefined/);
  }
  assert.equal(architectureStages(variant).length,variant==='v41'?8:7);
 }
 assert.match(architectureDiagram('v41'),/Encoder × 20/);
 assert.match(architectureDiagram('pro'),/Backbone × 61/);
 assert.match(architectureDiagram('flash'),/MTP auxiliary block/);
 const figure=architectureFigure();
 assert.match(figure,/data-arch-variant="flash" aria-pressed="true"/);
 assert.match(figure,/<span data-arch-position>1 \/ 7<\/span>/);
 assert.match(figure,/type="range" min="0" max="6"/);
});
test('architecture playback is finite, manual inspection pauses, and variants reset cleanly',()=>{
 let next=0;const jobs=new Map(),states=[];
 const player=createArchitecturePlayer({onChange:s=>states.push(s),schedule:fn=>{jobs.set(++next,fn);return next;},cancel:id=>jobs.delete(id)});
 const tick=()=>{const entry=jobs.entries().next().value;assert.ok(entry);jobs.delete(entry[0]);entry[1]();};
 assert.equal(player.state().variant,'flash');assert.equal(player.state().playing,false);assert.equal(jobs.size,0);
 const final=architectureStages(player.state().variant).length-1;
 player.play();for(let i=0;i<final;i++)tick();assert.equal(player.state().index,final);assert.equal(player.state().playing,false);assert.equal(jobs.size,0);
 player.variant('v41');player.play();for(let i=0;i<7;i++)tick();assert.equal(player.state().index,7);assert.equal(player.state().playing,false);assert.equal(jobs.size,0);
 player.variant('flash');assert.equal(player.state().index,0);player.inspect('compression');player.play();tick();assert.equal(player.state().step,1);
 player.select(2);assert.equal(player.state().playing,false);assert.equal(jobs.size,0);
 player.next();assert.equal(player.state().step,3);player.next();assert.equal(player.state().step,3);
 player.reset();assert.equal(player.state().step,0);player.back();assert.equal(player.state().panel,null);
 player.play();player.pause();assert.equal(jobs.size,0);player.destroy();assert.equal(jobs.size,0);
 assert.notEqual(states[0],states.at(-1));
});
