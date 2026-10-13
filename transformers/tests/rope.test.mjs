import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseHTML} from 'linkedom';
import {dot} from '../public/models.js';
import {rotate,rotationMatrix,comparison,pairComparison} from '../public/rope-model.js';
import {ropeTransfers} from '../public/rope-view.js';
import {createRopeStudies} from '../public/rope-controller.js';
import {rotaryAttention,HEAD_QUERY,HEAD_KEYS,HEAD_VALUES} from '../public/rotary-attention.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} differs from ${b}`);

test('RoPE changes normalized weights and the value sum while shared shifts preserve both',()=>{
 const example=rotaryAttention();assert.deepEqual(example.raw.dots,[1,0,1]);
 example.rotated.dots.forEach((x,j)=>close(x,[.5,.5,1][j]));
 close(example.raw.weights[1],1/(1+2*Math.exp(1/Math.sqrt(2))));
 assert.equal(Number(example.rotated.weights[1].toFixed(3)),.292);
 assert.ok(example.rotated.output[0]>example.raw.output[0]);
 for(const gap of [1,2,4])for(const degrees of [0,15,30,60])for(const shift of [0,1,6]){
  const d=rotaryAttention({shift,gap,degrees}),unshifted=rotaryAttention({gap,degrees});
  d.rotated.dots.forEach((x,j)=>{
   close(x,dot(HEAD_QUERY,rotate(HEAD_KEYS[j],(d.positions[j]-d.receiver)*d.omega)));
   close(dot(d.rotated.K[j],d.rotated.K[j]),dot(HEAD_KEYS[j],HEAD_KEYS[j]));
  });
  d.rotated.weights.forEach((a,j)=>close(a,unshifted.rotated.weights[j]));
  close(d.rotated.weights.reduce((s,a)=>s+a,0),1);
  d.rotated.output.forEach((x,c)=>{
   close(x,unshifted.rotated.output[c]);
   close(x,d.rotated.weights.reduce((s,a,j)=>s+a*HEAD_VALUES[j][c],0));
   if(degrees===0)close(x,d.raw.output[c]);
  });
 }
 assert.notDeepEqual(rotaryAttention({gap:2}).rotated.weights,example.rotated.weights);
});
test('rotations preserve lengths and inner products, including reverse and full turns',()=>{
 for(const angle of [-7,-Math.PI/2,0,.4,Math.PI/6,Math.PI,2*Math.PI,11]){
   const u=[.7,-1.3],v=[2,.2],a=rotate(u,angle),b=rotate(v,angle),M=rotationMatrix(angle);
   close(dot(a,a),dot(u,u));close(dot(a,b),dot(u,v));
   a.forEach((x,i)=>close(x,dot(M[i],u)));
   rotate(a,-angle).forEach((x,i)=>close(x,u[i]));
 }
 close(rotate([1,0],Math.PI/6)[0],Math.sqrt(3)/2);
 close(rotate([1,0],Math.PI/6)[1],.5);
});
test('absolute and relative frames agree for fixed content and shared shifts',()=>{
 for(const shift of [-20,0,1,6,100])for(const gap of [-4,0,1,3,7])for(const progress of [0,.25,.7,1]){
   const options={shift,gap,progress,q:[.8,-.2],k:[-.3,1.1],degrees:30};
   const absolute=comparison(options),relative=comparison({...options,relative:true});
   close(absolute.score,relative.score);close(absolute.score,absolute.relativeScore);
   close(absolute.score,comparison({...options,shift:0}).score);
 }
 const example=comparison();close(example.products[0],-.25);close(example.products[1],.75);close(example.score,.5);
 close(comparison({gap:2}).score,Math.sqrt(3)/2);
 close(comparison({gap:3}).score,1);
});
test('independent coordinate-pair comparisons add to the full dot product',()=>{
 for(const frequencies of ['standard','illustrative'])for(const gap of [0,1,4,12]){
   const d=pairComparison({gap,frequencies});
   const q=d.pairs.flatMap(p=>p.q),k=d.pairs.flatMap(p=>p.k);
   close(d.score,dot(q,k));
   d.pairs.forEach(p=>close(p.score,Math.sin(gap*p.omega)));
 }
 close(pairComparison().score,Math.sin(1)+Math.sin(.01));
});
test('coordinate packets use visible endpoints and each product reaches the sum once',async()=>{
 const {document}=parseHTML(await readFile('dist/index.html','utf8'));
 for(const kind of ['comparison','pairs']){
   const surface=document.querySelector(`[data-rope-study=${kind}]`);
   for(const step of [2,3])for(const spec of ropeTransfers(kind,step)){
     assert.ok(surface.querySelector(spec.from),spec.from);
     assert.ok(surface.querySelector(spec.to),spec.to);
   }
   const additions=ropeTransfers(kind,3);
   assert.equal(additions.length,2);
   assert.equal(new Set(additions.map(s=>s.from)).size,2);
   close(additions.reduce((sum,s)=>sum+Number(s.value),0),kind==='comparison'?.5:Number(pairComparison().score.toFixed(3)));
 }
});
test('rotation playback computes intermediate coordinates, pauses on input, and ends finitely',async()=>{
 const {document,window}=parseHTML(await readFile('dist/index.html','utf8'));
 window.HTMLElement.prototype.getBoundingClientRect=()=>({width:0,height:0,left:0,top:0});
 const timers=new Map(),frames=new Map();let id=0,clock=0;
 const motion={matches:false,addEventListener(){}};
 const controllers=createRopeStudies(document,{motion,now:()=>clock,
   schedule:fn=>{timers.set(++id,fn);return id;},cancel:i=>timers.delete(i),
   frame:fn=>{frames.set(++id,fn);return id;},cancelFrame:i=>frames.delete(i)});
 const surface=document.querySelector('[data-rope-study=rotation]'),controller=controllers.find(c=>c.state().kind==='rotation');
 const tick=()=>{const [i,fn]=timers.entries().next().value;timers.delete(i);fn();};
 surface.querySelector('[data-rope-play]').click();tick();
 assert.equal(controller.state().step,1);
 clock=800;const [i,fn]=frames.entries().next().value;frames.delete(i);fn(clock);
 close(controller.state().progress,.5);
 assert.ok(surface.querySelector('[data-rope-view]').textContent.includes('15°'));
 assert.ok(surface.querySelector('[data-rope-view]').textContent.includes('0.259'));
 const angle=surface.querySelector('[data-rope-option=angle]');angle.value='45';angle.dispatchEvent(new window.Event('input'));
 assert.equal(controller.state().playing,false);assert.equal(timers.size,0);assert.equal(frames.size,0);
 assert.ok(surface.querySelector('[data-rope-view]').textContent.includes('0.707'));
 surface.querySelector('[data-rope-play]').click();for(let n=0;n<3;n++)tick();
 assert.equal(controller.state().step,3);assert.equal(controller.state().playing,false);
 assert.equal(timers.size,0);assert.equal(frames.size,0);
 motion.matches=true;surface.querySelector('[data-rope-reset]').click();surface.querySelector('[data-rope-play]').click();
 assert.equal(controller.state().step,3);assert.equal(timers.size,0);assert.equal(frames.size,0);
 const compare=document.querySelector('[data-rope-study=comparison]');
 compare.querySelector('[data-rope-frame=relative]').click();
 assert.equal(compare.querySelector('[data-rope-score]').textContent,'0.5');
 assert.equal(controllers.find(c=>c.state().kind==='comparison').state().relative,true);
 motion.matches=false;surface.querySelector('[data-rope-play]').click();tick();
 document.hidden=true;document.dispatchEvent(new window.Event('visibilitychange'));
 assert.equal(controller.state().playing,false);assert.equal(timers.size,0);assert.equal(frames.size,0);
});
