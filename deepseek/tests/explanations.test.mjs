import test from 'node:test';
import assert from 'node:assert/strict';
import {hashExample,hashBody,packingState,packingBody,explanationFigure} from '../site/explanations.mjs';
test('suffix arithmetic follows XOR, remainder and disjoint bucket offsets',()=>{
 const s=hashExample();assert.deepEqual(s.products,[15,10,28]);assert.deepEqual(s.heads.map(h=>h.base),[5,25]);assert.deepEqual(s.heads.map(h=>h.address),[5,10]);
 for(let a=0;a<16;a++)for(let b=0;b<16;b++)for(let c=0;c<16;c++){
  const r=hashExample([a,b,c]);assert.ok(r.heads[0].address>=0&&r.heads[0].address<7);assert.ok(r.heads[1].address>=7&&r.heads[1].address<18);
 }
 assert.match(hashBody(),/25 = 2 × 11/);assert.throws(()=>hashExample([1,-1,0]),RangeError);
});
test('spatial packing preserves all values in channel-major order',()=>{
 const s=packingState();assert.deepEqual(s.packed,[0,1,2,10,11,12,20,21,22,100,101,102,110,111,112,120,121,122]);
 const seen=new Set();for(let k=0;k<2;k++)for(let a=0;a<3;a++)for(let b=0;b<3;b++){
  const r=packingState(k,a,b);assert.equal(r.packed[r.index],r.value);seen.add(r.index);
 }
 assert.equal(seen.size,18);assert.equal(packingState(1,2,2).index,17);assert.match(packingBody(1,2,2),/u\[17\] = 122/);assert.throws(()=>packingState(2),RangeError);
});
test('all explanatory diagrams have useful, captioned initial states',()=>{
 for(const kind of ['ced','hash','packing','timing']){const html=explanationFigure(kind);assert.match(html,/<figure/);assert.match(html,/<figcaption/);assert.doesNotMatch(html,/NaN|undefined/);}
 assert.match(explanationFigure('ced'),/one attention normalization/);assert.match(explanationFigure('timing'),/produces Aᶠₗ₋₁/);
});
