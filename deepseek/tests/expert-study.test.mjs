import test from 'node:test';
import assert from 'node:assert/strict';
import {expertExample,expertFigure,expertDiagram} from '../site/expert-study.mjs';
import {initializeExpertStudy} from '../site/expert-ui.mjs';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-12,`${a} != ${b}`);
test('the two learned branches reuse input and match coordinates before the return map',()=>{
 const s=expertExample(),a=1/(1+Math.exp(-1)),b=2/(1+Math.exp(-2));
 assert.deepEqual(s.gateInput,[1,2,1]);assert.deepEqual(s.features,[2,3,2]);
 [a,b,a].forEach((v,j)=>close(s.gate[j],v));
 [2*a,3*b,2*a].forEach((v,j)=>close(s.products[j],v));
 close(s.output[0],4*a+1.5*b);close(s.output[1],-2*a+3*b);
 assert.equal(s.output.length,s.input.length);assert.equal(s.products.length,3);
 for(let stage=0;stage<5;stage++)for(let j=0;j<3;j++)assert.doesNotMatch(expertDiagram(true,stage,j),/NaN|undefined/);
 assert.match(expertFigure(),/scroll horizontally/);
});
test('the real controller traces all stages, changes coordinate, stops, resets and restores structure',()=>{
 const nodes=new Map();
 const study={querySelector(key){if(!nodes.has(key))nodes.set(key,{checked:key==='[data-expert-numbers]',value:'0',disabled:false,innerHTML:'',textContent:'',events:{},addEventListener(type,fn){this.events[type]=fn;}});return nodes.get(key);}};
 initializeExpertStudy(study);
 const get=key=>study.querySelector(`[data-expert-${key}]`),fire=(key,type)=>get(key).events[type]();
 assert.match(get('stage').textContent,/1 \/ 5/);assert.equal(get('next').disabled,false);
 get('numbers').checked=false;fire('numbers','change');assert.equal(get('stage').textContent,'Weight tables');assert.equal(get('next').disabled,true);
 get('numbers').checked=true;fire('numbers','change');assert.equal(get('coordinate').disabled,false);
 fire('next','click');assert.match(get('detail').innerHTML,/W₁ · gate projection · 2 × 3/);
 get('coordinate').value='2';fire('coordinate','change');
 fire('next','click');assert.match(get('detail').innerHTML,/intermediate coordinate 2/);
 fire('next','click');assert.match(get('detail').innerHTML,/three separate coordinates/);
 fire('next','click');assert.match(get('stage').textContent,/5 \/ 5/);assert.equal(get('next').disabled,true);
 fire('next','click');assert.match(get('stage').textContent,/5 \/ 5/);
 fire('reset','click');assert.match(get('stage').textContent,/1 \/ 5/);
 get('numbers').checked=false;fire('numbers','change');assert.equal(get('stage').textContent,'Weight tables');assert.equal(get('coordinate').disabled,true);
});

test('the stored weight tables are visible before interaction, with calculated rows enabled',()=>{
 const figure=expertFigure();assert.match(figure,/data-expert-numbers[^>]*checked/);
 for(const numbers of [false,true]){
  const svg=expertDiagram(numbers);
  for(const name of ['W₁','W₃','W₂'])assert.match(svg,new RegExp(`data-weight-matrix="${name}"`));
  assert.equal((svg.match(/class="expert-weight /g)||[]).length,18);
 }
});
