import test from 'node:test';
import assert from 'node:assert/strict';
import {configurations,forwardStages,forwardBody} from '../site/forward.mjs';
test('complete-forward shapes use distinct released Flash, Pro and V4.1 dimensions',()=>{
 for(const [variant,dim,layers,latent,heads,groups] of [['flash',4096,43,1024,64,8],['pro',7168,61,1536,128,16],['v41',5120,40,1280,64,8]]){
  const c=configurations[variant];assert.deepEqual([c.dim,c.layers,c.latent,c.heads,c.groups],[dim,layers,latent,heads,groups]);
  const s=forwardStages(variant);assert.equal(s[0].shape,'B × T');assert.equal(s[2].shape,`B × T × 4 × ${dim}`);assert.equal(s[5].shape,'B × 129,280');assert.equal(s.at(-1).shape,'B × (T + 1)');
 }
 assert.match(forwardBody('v41'),/carried input mixture/);assert.match(forwardBody('pro'),/128 × 512 → 16 × 1024 → 7168/);
 assert.throws(()=>forwardStages('unknown'),RangeError);
});
