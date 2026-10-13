import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {parseHTML} from 'linkedom';
import {softmax,mv,dot} from '../public/models.js';
import {CONFIG,extensionTransfers,extensionView} from '../public/extension-views.js';
import {createExtensionStudies} from '../public/extension-controller.js';
import {PATCHES} from '../public/patch-data.js';
import {shiftedExample,readoutStep,trainingExample,supervisedExample,preferenceStep,preferenceExample,loraExample,thoughtExample,imageExample,IMAGE_PROJECTOR} from '../public/extension-models.js';
const close=(a,b,tolerance=1e-8)=>assert.ok(Math.abs(a-b)<tolerance,`${a} differs from ${b}`);
const derivative=(fn,x)=>{const epsilon=1e-5;return (fn(x+epsilon)-fn(x-epsilon))/(2*epsilon);};
test('teacher-forced targets shift once and every selected prefix excludes its target',()=>{
 for(let row=0;row<6;row++){
   const d=shiftedExample(row);assert.equal(d.prefix.length,row+1);
   assert.equal(d.prefix.at(-1),d.examples[row].input);
   assert.equal(d.examples.filter(e=>e.visible).length,row+1);
   assert.equal(d.examples[row].target,row===5?'〈eos〉':d.examples[row+1].input);
 }
 const d=shiftedExample();close(d.loss,d.examples.reduce((s,e)=>s-Math.log(e.p),0)/6);
});
test('readout matrix gradients agree with numerical differentiation and the worked update',()=>{
 const W=[[.2,-.4],[.3,.1],[-.1,.2]],h=[1,.5],d=readoutStep(W,h,0,.6);
 for(let r=0;r<3;r++)for(let c=0;c<2;c++){
   const analytic=d.gradient[r][c];
   const numeric=derivative(v=>{const copy=W.map(row=>[...row]);copy[r][c]=v;return -Math.log(softmax(mv(copy,h))[0]);},W[r][c]);
   close(analytic,numeric);
 }
 const example=trainingExample();close(example.W[0][0],.4);close(example.W[0][1],.2);
 close(example.after.p[0],.5142093777192813);close(example.after.loss,.6651247468229086);
 assert.ok(example.history[1].train<example.history[0].train);
 assert.ok(example.history[1].held>example.history[0].held);
 for(const rate of [.05,.6,1])for(const h2 of [-1,0,.5,1]){
   const t=trainingExample({updates:12,rate,h2});assert.equal(t.history.length,13);
   t.history.forEach(frame=>assert.ok(Number.isFinite(frame.train)&&Number.isFinite(frame.held)));
   close(t.after.p.reduce((a,b)=>a+b,0),1);
 }
});
test('SFT response-loss masks preserve prompt visibility and count the response boundary',()=>{
 const response=supervisedExample({row:5});assert.equal(response.count,6);
 assert.equal(response.examples[4].active,false);assert.equal(response.examples[5].active,true);
 assert.equal(response.examples[5].input,'Assistant:');assert.equal(response.examples[5].target,'The');
 assert.equal(response.examples[0].visible,true);assert.equal(response.examples[6].visible,false);
 const all=supervisedExample({completionOnly:0});assert.equal(all.count,11);
 close(response.loss,response.examples.filter(e=>e.active).reduce((s,e)=>s-Math.log(e.p),0)/6);
});
test('DPO specialization and derivatives agree with the full two-response formula',()=>{
 for(const u of [-3,0,.7,3])for(const reference of [.1,.5,.9])for(const beta of [.1,1,2]){
   const d=preferenceStep(u,reference,beta,.5),p=d.p;
   const margin=beta*(Math.log(p/reference)-Math.log((1-p)/(1-reference)));
   close(d.margin,margin);close(d.gradient,derivative(v=>preferenceStep(v,reference,beta,.5).loss,u));
 }
 const example=preferenceExample();close(example.after.u,.25);close(example.after.p,.5621765008857981);
 assert.equal(example.reference,.5);assert.ok(example.after.loss<example.before.loss);
 for(const updates of [0,1,8])assert.ok(Number.isFinite(preferenceExample({updates,reference:.1,beta:2}).after.loss));
});
test('preference playback uses the pre-update distribution for its displayed derivative',()=>{
 const {document}=parseHTML(extensionView('preference',CONFIG.preference.defaults));
 assert.equal(document.querySelector('[data-ext-prob=policy-0]').textContent,'0.5');
 assert.equal(document.querySelector('[data-ext-value=pref-margin] b').textContent,'0');
 assert.equal(document.querySelector('[data-ext-value=pref-gradient] b').textContent,'-0.5');
 assert.equal(document.querySelector('[data-ext-value=pref-after] b').textContent,'0.25');
 assert.equal(document.querySelector('[data-ext-prob=policy-after-0]').textContent,'0.562');
});
test('LoRA paths equal the merged map; rank-one changes remain collinear',()=>{
 for(const rank of [1,2])for(const scale of [0,.25,1,2])for(const x of [[1,2],[-2,1],[0,0]]){
   const d=loraExample({rank,scale,x1:x[0],x2:x[1]});d.output.forEach((v,i)=>close(v,d.mergedOutput[i]));
   if(rank===1)close(d.delta[0]*1-d.delta[1]*.5,0);
 }
 const d=loraExample();assert.deepEqual(d.intermediate,[-1]);assert.deepEqual(d.output,[.5,1]);
 const determinant=M=>M[0][0]*M[1][1]-M[0][1]*M[1][0];
 close(determinant(d.update),0);assert.ok(Math.abs(determinant(loraExample({rank:2}).update))>0);
});
test('LoRA factor gradients match finite differences; zeroing both factors stalls this objective',()=>{
 for(const rank of [1,2]){
   const d=loraExample({rank}),loss=(A,B)=>{const out=mv(B,mv(A,d.x)).map((v,i)=>v+d.base[i]);const e=out.map((v,i)=>v-[2,3][i]);return dot(e,e)/2;};
   for(const [factor,gradient] of [['A',d.dA],['B',d.dB]])for(let r=0;r<d[factor].length;r++)for(let c=0;c<d[factor][r].length;c++){
     const numeric=derivative(value=>{const A=d.A.map(row=>[...row]),B=d.B.map(row=>[...row]);(factor==='A'?A:B)[r][c]=value;return loss(A,B);},d[factor][r][c]);
     close(gradient[r][c],numeric);
   }
 }
 const one=loraExample({initialization:'zero-B'}),both=loraExample({initialization:'both-zero'});
 assert.ok(one.dB.flat().some(v=>v!==0));assert.ok(one.dA.flat().every(v=>v===0));
 assert.ok([...both.dA.flat(),...both.dB.flat()].every(v=>v===0));
});
test('authored traces expose an erroneous premise separately from a correct later addition',()=>{
 for(const a of [3,17,19])for(const b of [12,20,23,29]){
   const correct=thoughtExample({a,b});assert.equal(correct.answer,a*b);assert.ok(correct.checks.every(Boolean));
   const wrong=thoughtExample({a,b,error:1});assert.equal(wrong.answer,a*b+10);
   assert.deepEqual(wrong.checks,[true,false,true,false]);
 }
});
test('actual image patch data projects to four coordinates and stays continuous in the assembled input',async()=>{
 await access('dist/assets/chasing-roles.png');await access('dist/assets/dog-cat-happy-paper.png');
 assert.equal(PATCHES.length,12);
 PATCHES.forEach((patch,i)=>{assert.equal(patch.row,Math.floor(i/6));assert.equal(patch.column,i%6);patch.meanRGB.forEach(v=>assert.ok(v>=0&&v<=1));
   const d=imageExample(PATCHES,{patch:i});assert.equal(d.rows.length,16);d.rows.forEach(row=>assert.equal(row.length,4));
   d.projected.forEach((v,c)=>close(v,dot(IMAGE_PROJECTOR[c],patch.meanRGB)));
   assert.deepEqual(d.rows[i],d.projected);
 });
 const white=mv(IMAGE_PROJECTOR,[1,1,1]);white.forEach((v,i)=>close(v,[0,0,1,0][i]));
});
test('every transfer has a rendered source and destination across stages and alternate modes',()=>{
 for(const [kind,config] of Object.entries(CONFIG))for(const alternatives of [{},{rank:2},{completionOnly:0},{patch:0},{error:1}]){
   const options={...config.defaults,...alternatives};
   for(let step=0;step<config.stages.length;step++){
     const {document}=parseHTML('<div>'+extensionView(kind,options,step)+'</div>');
     for(const transfer of extensionTransfers(kind,step,options)){
       assert.ok(document.querySelector(transfer.from),kind+' missing source '+transfer.from);
       assert.ok(document.querySelector(transfer.to),kind+' missing destination '+transfer.to);
     }
   }
 }
 const additions=extensionTransfers('lora',3,CONFIG.lora.defaults);
 assert.equal(additions.length,4);assert.equal(new Set(additions.map(s=>s.from)).size,4);
 const imageTransfers=extensionTransfers('vision',3,CONFIG.vision.defaults);
 assert.equal(new Set(imageTransfers.map(s=>s.to)).size,4);
});
test('new controls pause on edits, update real parameters, select patches, and stop at the final phase',async()=>{
 const {document,window}=parseHTML(await readFile('dist/index.html','utf8'));
 window.HTMLElement.prototype.getBoundingClientRect=()=>({width:0,height:0,left:0,top:0});
 const timers=new Map();let id=0;const motion={matches:false,addEventListener(){}};
 const controllers=createExtensionStudies(document,{motion,schedule:fn=>{timers.set(++id,fn);return id;},cancel:i=>timers.delete(i)});
 const surface=document.querySelector('[data-extension-study=training]'),controller=controllers.find(c=>c.state().kind==='training');
 surface.querySelector('[data-ext-play]').click();assert.equal(controller.state().playing,true);
 const rate=surface.querySelector('[data-ext-option=rate]');rate.value='.8';rate.dispatchEvent(new window.Event('input'));
 assert.equal(controller.state().playing,false);assert.equal(timers.size,0);assert.equal(controller.state().rate,.8);
 surface.querySelector('[data-ext-update]').click();assert.equal(controller.state().updates,2);
 surface.querySelector('[data-ext-play]').click();
 while(timers.size){const [i,fn]=timers.entries().next().value;timers.delete(i);fn();}
 assert.equal(controller.state().step,3);assert.equal(controller.state().playing,false);
 const vision=document.querySelector('[data-extension-study=vision]');vision.querySelector('[data-ext-patch="0"]').click();
 assert.equal(controllers.find(c=>c.state().kind==='vision').state().patch,0);
 assert.equal(vision.querySelector('[data-ext-patch="0"]').getAttribute('aria-pressed'),'true');
 const thought=document.querySelector('[data-extension-study=thought]');thought.querySelector('[data-ext-play]').click();
 while(timers.size){const [i,fn]=timers.entries().next().value;timers.delete(i);fn();}
 assert.equal(controllers.find(c=>c.state().kind==='thought').state().step,4);
 motion.matches=true;surface.querySelector('[data-ext-reset]').click();surface.querySelector('[data-ext-play]').click();assert.equal(timers.size,0);assert.equal(controller.state().step,3);
 motion.matches=false;surface.querySelector('[data-ext-play]').click();document.hidden=true;document.dispatchEvent(new window.Event('visibilitychange'));
 assert.equal(timers.size,0);assert.equal(controller.state().playing,false);
});
