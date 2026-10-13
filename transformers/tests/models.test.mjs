import {test} from 'node:test';
import assert from 'node:assert/strict';
import {softmax,cacheExample,cacheBytes,tileExample,onlineAttention,TILE_SCORES,TILE_VALUES,expertExample,quantExample,speculativeExample,TARGET} from '../public/models.js';
const close=(a,b,tolerance=1e-10)=>assert.ok(Math.abs(a-b)<tolerance,`${a} differs from ${b}`);
test('cached rows preserve the newly computed attention result and the memory budget',()=>{
 const d=cacheExample(4);close(d.weights.reduce((a,b)=>a+b,0),1);assert.equal(d.cachedRows,8);assert.equal(d.recomputedRows,20);
 assert.equal(cacheBytes()/2**20,512);assert.equal(cacheBytes({H:32})/2**30,2);
 const old=cacheExample(3);assert.deepEqual(d.K.slice(0,3),old.K);assert.deepEqual(d.V.slice(0,3),old.V);
});
test('online attention agrees for different partitions, including changing maxima',()=>{
 const weights=softmax(TILE_SCORES),expected=[0,1].map(c=>weights.reduce((s,w,i)=>s+w*TILE_VALUES[i][c],0));
 for(const chunks of [
   TILE_SCORES.map((score,i)=>[{score,value:TILE_VALUES[i]}]),
   [TILE_SCORES.map((score,i)=>({score,value:TILE_VALUES[i]}))]
 ])onlineAttention(chunks).output.forEach((v,i)=>close(v,expected[i]));
 tileExample().output.forEach((v,i)=>close(v,expected[i]));
 const huge=onlineAttention([[{score:1000,value:[1,0]}],[{score:1001,value:[0,1]}]]);huge.output.forEach(v=>assert.ok(Number.isFinite(v)));close(huge.output.reduce((a,b)=>a+b,0),1);
});
test('top-k gates sum to one and inactive experts cannot contribute',()=>{
 const d=expertExample();close(d.r[0],.5);close(d.gates[0],2/3);close(d.gates[1],1/3);close(d.output[0],4/3);close(d.output[1],1);
 for(const x of [[1,0],[1,-1],[1,1]])for(const k of [1,2,3,4]){
   const e=expertExample(x,k);close(e.gates.reduce((a,b)=>a+b,0),1);assert.equal(e.selected.length,k);
   e.weighted.forEach((row,i)=>{if(!e.selected.includes(i))assert.ok(row.every(v=>v===0));});
 }
});
test('quantization matches the worked example and distinguishes clipping from rounding',()=>{
 const d=quantExample();assert.deepEqual(d.integer,[[-6,-2],[3,7]]);close(d.exact[0],-.99);close(d.exact[1],1.66);close(d.approx[0],-1);close(d.approx[1],1.70);
 for(const bits of [2,3,4,8])for(const s of [.05,.1,.25,.5]){
   const q=quantExample(bits,s);q.errors.forEach((row,r)=>row.forEach((v,c)=>{if(!q.clipped[r][c])assert.ok(Math.abs(v)<=s/2+1e-12);}));
 }
 assert.ok(quantExample(2,.05).clipped.flat().some(Boolean));
});
test('speculative acceptance and residual recover p across proposal distributions and equality',()=>{
 const d=speculativeExample();close(d.acceptance[0],5/6);close(d.acceptance[2],2/3);close(d.rejection,.2);assert.deepEqual(d.residual,[0,1,0]);
 for(const q of [[.6,.1,.3],[.1,.8,.1],[0,.5,.5],[.5,.3,.2]]){const s=speculativeExample(TARGET,q);s.recovered.forEach((v,i)=>close(v,TARGET[i]));if(s.residual)close(s.residual.reduce((a,b)=>a+b,0),1);}
 assert.equal(speculativeExample(TARGET,TARGET).residual,null);
});
