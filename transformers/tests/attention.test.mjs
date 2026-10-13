import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseHTML} from 'linkedom';
import {windowExample,linearExample,WINDOW_SCORES,WINDOW_VALUES,LINEAR_KEYS,LINEAR_VALUES} from '../public/attention-models.js';
import {createExtensionStudies} from '../public/extension-controller.js';
import {attentionTransfers} from '../public/attention-views.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);

test('sparse masks remain causal, normalize their permitted terms, and change the output',()=>{
 for(const pattern of ['window','dense','anchors'])for(let row=1;row<=8;row++)for(let width=1;width<=8;width++){
  const d=windowExample({row,width,pattern});
  assert.ok(d.J.every(j=>j<row));assert.ok(d.J.includes(row-1));
  close(d.weights.reduce((a,b)=>a+b,0),1);
  const den=d.J.reduce((s,j)=>s+Math.exp(WINDOW_SCORES[j]),0);
  d.weights.forEach((a,j)=>close(a,d.J.includes(j)?Math.exp(WINDOW_SCORES[j])/den:0));
  d.output.forEach((x,c)=>close(x,d.J.reduce((s,j)=>s+Math.exp(WINDOW_SCORES[j])*WINDOW_VALUES[j][c]/den,0)));
  d.mask.forEach((allowed,r)=>allowed.forEach((yes,c)=>{if(c>r)assert.equal(yes,false);}));
 }
 assert.deepEqual(windowExample({width:3}).J,[5,6,7]);
 assert.equal(windowExample({width:3}).edges,21);
 assert.equal(windowExample({pattern:'dense'}).edges,36);
 assert.deepEqual(windowExample({pattern:'anchors'}).J,[0,1,5,6,7]);
 assert.notDeepEqual(windowExample().output,windowExample({pattern:'dense'}).output);
});

test('multi-layer window connectivity matches the proved interval, including a self-only window',()=>{
 for(let row=1;row<=8;row++)for(let width=1;width<=8;width++)for(let layers=1;layers<=4;layers++){
  const d=windowExample({row,width,layers}),start=Math.max(0,row-1-layers*(width-1));
  assert.deepEqual(d.reach[layers],Array.from({length:row-start},(_,j)=>j+start));
 }
 assert.deepEqual(windowExample({layers:3}).reach[3],[1,2,3,4,5,6,7]);
});

test('recurrent kernel readout agrees with an independently computed direct normalized sum',()=>{
 for(let prefix=1;prefix<=5;prefix++)for(const q1 of [.25,1,3])for(const q2 of [.25,1,3]){
  const d=linearExample({prefix,q1,q2});
  const sims=LINEAR_KEYS.slice(0,prefix).map(k=>q1*k[0]+q2*k[1]),den=sims.reduce((a,b)=>a+b,0);
  const direct=[0,1].map(c=>sims.reduce((s,a,j)=>s+a*LINEAR_VALUES[j][c],0)/den);
  d.output.forEach((x,c)=>close(x,direct[c]));close(d.denominator,den);
  close(d.weights.reduce((a,b)=>a+b,0),1);
  assert.equal(d.S.flat().length+d.z.length,6);
 }
 const example=linearExample();assert.deepEqual(example.S,[[1,0],[0,2]]);assert.deepEqual(example.z,[1,1]);
 example.output.forEach(x=>close(x,2/3));
 assert.equal(linearExample({q1:0,q2:0}).output,null);
 // These feature dot products are not the exponential softmax kernel.
 const softmaxFirst=Math.exp(2)/(Math.exp(2)+Math.exp(1));assert.ok(Math.abs(example.weights[0]-softmaxFirst)>.05);
});

test('outer-product results travel once, after their two operands arrive, within the stage duration',()=>{
 const paths=attentionTransfers('linear',1,{});
 for(let entry=0;entry<4;entry++){
  const multiplication=`[data-att-multiply="${entry}"]`;
  const inputs=paths.filter(p=>p.to===multiplication),results=paths.filter(p=>p.from===multiplication);
  assert.equal(inputs.length,2);assert.equal(results.length,1);
  assert.ok(inputs.every(p=>p.delay+.68<=results[0].delay));
 }
 assert.ok(paths.every(p=>p.delay+.68<2.3));
 const readout=attentionTransfers('linear',3,{});
 for(let coordinate=0;coordinate<2;coordinate++)assert.equal(readout.filter(p=>p.to===`[data-att-final="${coordinate}"]`).length,1);
});

test('attention controls recompute masks and state, pause on edits, and have finite reduced-motion playback',async()=>{
 const {document,window}=parseHTML(await readFile('dist/index.html','utf8'));
 window.HTMLElement.prototype.getBoundingClientRect=()=>({width:0,height:0,left:0,top:0});
 const timers=new Map();let id=0;const motion={matches:false,addEventListener(){}};
 const controllers=createExtensionStudies(document,{motion,schedule:fn=>{timers.set(++id,fn);return id;},cancel:i=>timers.delete(i)});
 const surface=document.querySelector('[data-extension-study=window]'),controller=controllers.find(c=>c.state().kind==='window');
 surface.querySelector('[data-ext-play]').click();assert.equal(controller.state().playing,true);
 const width=surface.querySelector('[data-ext-option=width]');width.value='1';width.dispatchEvent(new window.Event('input'));
 assert.equal(controller.state().playing,false);assert.equal(timers.size,0);
 assert.equal(surface.querySelector('[data-att-weight="7"]').textContent,'1');
 assert.equal(surface.querySelector('[data-att-weight="1"]').textContent,'0');
 const linear=document.querySelector('[data-extension-study=linear]'),linearController=controllers.find(c=>c.state().kind==='linear');
 linear.querySelector('[data-ext-play]').click();
 while(timers.size){const [i,fn]=timers.entries().next().value;timers.delete(i);fn();}
 assert.equal(linearController.state().step,3);assert.equal(linearController.state().playing,false);
 motion.matches=true;linear.querySelector('[data-ext-reset]').click();linear.querySelector('[data-ext-play]').click();
 assert.equal(linearController.state().step,3);assert.equal(timers.size,0);
});
