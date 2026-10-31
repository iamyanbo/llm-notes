import test from 'node:test';
import assert from 'node:assert/strict';
import {softmax,poolRows,visibleBlock,attentionExample,routeExample,residualExample,layerOwners,packedGlobalBytes,cedWork,visionLayout,quantizeExample,speculationExample} from '../site/models.mjs';
const near=(a,b,t=1e-10)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
test('channelwise pooling matches the worked example',()=>{const out=poolRows([[1,4],[5,2]],[[0,Math.log(3)],[Math.log(3),0]],2);near(out[0][0],4);near(out[0][1],3.5);});
test('incomplete blocks are not emitted and completing token sees entry',()=>{assert.equal(poolRows([[1],[2],[3]],[[0],[0],[0]],2).length,1);assert.equal(visibleBlock(2,0,4),false);assert.equal(visibleBlock(3,0,4),true);});
test('mask excludes any block containing a future source token',()=>{for(let m=1;m<8;m++)for(let t=0;t<32;t++)for(let b=0;b<32;b++)if(visibleBlock(t,b,m))assert.ok((b+1)*m-1<=t);});
test('main attention and sink share unit mass',()=>{for(let k=1;k<=5;k++){const a=attentionExample(k);near(a.weights.reduce((a,b)=>a+b,0)+a.sinkWeight,1);assert.ok(a.weights.every((w,i)=>a.selected.includes(i)||w===0));}});
test('router bias changes selection but weights retain original affinities',()=>{const r=routeExample(1,1);assert.deepEqual(r.selected,[2,1]);near(r.weights[1],r.affinity[1]/(r.affinity[1]+r.affinity[2]));near(r.weights[2],r.affinity[2]/(r.affinity[1]+r.affinity[2]));near(routeExample(1).weights.reduce((a,b)=>a+b,0),1.5);});
test('two-stream stochastic transport obeys its fixed-map norm bound',()=>{for(let a=0;a<=1;a+=.05){const r=residualExample(a);assert.ok(r.outputNorm<=r.inputNorm+1e-12);r.matrix.forEach(row=>near(row.reduce((a,b)=>a+b,0),1));}});
test('CSA2 owners distinguish cache and selection sources',()=>{assert.equal(layerOwners(1).mode,'Local only');assert.deepEqual(layerOwners(27),{mode:'Reuse',kv:20,index:24,ratio:1});assert.equal(layerOwners(28).mode,'Reindex');assert.equal(layerOwners(14).mode,'Full');});
test('packed global arithmetic includes scales and partial groups',()=>{assert.equal(packedGlobalBytes(1_000_000),890_000_000);assert.equal(packedGlobalBytes(3),2136);assert.equal(packedGlobalBytes(0),0);});
test('CED accounting does not replay more tokens than exist',()=>{const r=cedWork(64);assert.equal(r.full,r.encoder+r.tail);const long=cedWork(65536);assert.ok(long.encoder+long.tail<long.full);});
test('vision unshuffle pads odd grids',()=>{assert.deepEqual(visionLayout(7,8),{rows:3,cols:3,tokens:9,paddedRows:9,paddedCols:9});});
test('illustrative quantizer handles representable values and saturation',()=>{near(quantizeExample(1.5).error,0);assert.equal(quantizeExample(100).reconstructed,6);assert.equal(quantizeExample(-2).code,-2);});
test('accepted and residual speculative mass reconstruct target',()=>{for(let q=.1;q<.95;q+=.05){const r=speculationExample(q);r.p.forEach((p,i)=>near(r.reconstructed[i],p));near(r.accepted.reduce((a,b)=>a+b,0)+r.rejection,1);}});
test('stable softmax survives large logits',()=>{near(softmax([10000,10000])[0],.5);});

test('the routing lesson carries selected rows through scaling and the computed shared expert',()=>{
 const initial=routeExample(0),corrected=routeExample(1);
 assert.deepEqual(initial.scores,[1,2,-1]);assert.deepEqual(initial.selected,[1,0]);
 near(initial.shared[0],5.566625548453667);near(initial.shared[1],3.8226653106072845);
 for(let bias=0;bias<=1.6;bias+=.01){const r=routeExample(bias);for(let j=0;j<2;j++)near(r.output[j],r.shared[j]+r.expertOutputs.reduce((s,row,i)=>s+r.weights[i]*row[j],0));}
 near(initial.output[0],6.88668442741687);near(initial.output[1],7.182547552680878);
 near(corrected.output[0],4.7346072767572895);near(corrected.output[1],8.990647038910907);
});
