import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generationData,chooseToken,decodeToyPieces,TRAINING_INPUT,TRAINING_TARGET} from '../public/generation-model.js';
import {parseHTML} from 'linkedom';
import {generationView} from '../public/completion-view.js';
import {generationFlowSpecs} from '../public/generation-flow.js';
import {generationLoop} from '../scripts/completion-studies.mjs';
import {createCompletionStudies} from '../public/completion-studies.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10);
test('prefix attention and output probabilities normalize and the selected token is reusable',()=>{
 const d=generationData([0,1]);close(d.weights.reduce((a,b)=>a+b,0),1);close(d.probabilities.reduce((a,b)=>a+b,0),1);
 const choice=chooseToken(d.probabilities),next=generationData([...d.ids,choice]);
 assert.equal(next.X.length,d.X.length+1);assert.deepEqual(next.X.slice(0,d.X.length),d.X);
 assert.notDeepEqual(next.h,d.h);assert.equal(chooseToken([.1,.2,.7],{sample:true,random:()=>.05}),0);assert.equal(chooseToken([.1,.2,.7],{sample:true,random:()=>.4}),2);
});
test('temperature keeps the logit ordering but changes sampling probabilities',()=>{
 const cold=generationData([0,1],.5),hot=generationData([0,1],2);
 assert.equal(chooseToken(cold.probabilities),chooseToken(hot.probabilities));assert.ok(Math.max(...cold.probabilities)>Math.max(...hot.probabilities));
});
test('training shift and piece decoding preserve the actual sequence boundaries',()=>{
 assert.deepEqual(TRAINING_INPUT.slice(1),TRAINING_TARGET.slice(0,-1));
 assert.equal(decodeToyPieces(6),'The dog and cat are rest');assert.equal(decodeToyPieces(7),'The dog and cat are resting');assert.equal(decodeToyPieces(8),'The dog and cat are resting.');
});
test('generation packets start and end at the displayed operands, including the return lookup',()=>{
 const data=generationData([0,1]);
 for(let step=0;step<5;step++){
   const chosen=step===4?2:null,prefix=step===4?[0,1,2]:[0,1];
   const {document}=parseHTML(generationView({prefix,data,step,chosen}));
   for(const route of generationFlowSpecs(data,step,chosen,prefix)){
     assert.ok(document.querySelector(route.from),'Missing flow source '+route.from);
     assert.ok(document.querySelector(route.to),'Missing flow destination '+route.to);
   }
 }
});
test('generation appends once per pass, pauses without a second append, and respects its finite limit',()=>{
 const {window,document}=parseHTML(generationLoop());
 window.HTMLElement.prototype.getBoundingClientRect=()=>({width:0,height:0,left:0,top:0});
 const preference={matches:false,addEventListener(){}};
 createCompletionStudies(document,preference);
 const surface=document.querySelector('[data-generation]'),next=surface.querySelector('[data-generation-next]');
 for(let i=0;i<4;i++)next.click();
 assert.equal(surface.querySelectorAll('.generation-token').length,3);
 surface.querySelector('[data-generation-choice]').dispatchEvent(new window.Event('change'));
 assert.equal(surface.querySelectorAll('.generation-token').length,3,'Pausing must not append twice');
 for(let expected=4;expected<=8;expected++){for(let i=0;i<5;i++)next.click();assert.equal(surface.querySelectorAll('.generation-token').length,expected);}
 assert.equal(next.disabled,true);assert.equal(surface.querySelector('[data-generation-play]').disabled,true);
 surface.querySelector('[data-generation-reset]').click();assert.equal(surface.querySelectorAll('.generation-token').length,2);assert.equal(next.disabled,false);
});
