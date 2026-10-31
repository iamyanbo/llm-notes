import test from 'node:test';
import assert from 'node:assert/strict';
import {residualBridge,residualWalkthrough,poolingWalkthrough,queryWalkthrough,indexerWalkthrough,attentionWalkthrough,rotaryWalkthrough,groupedWalkthrough,readoutWalkthrough,mtpWalkthrough,muonWalkthrough,matmul} from '../site/week-models.mjs';
import {weekFlowDefinition} from '../site/week-flow-scenes.mjs';
import {weekKinds,weekDiagram,weekFigure} from '../site/week-studies.mjs';
import {grid} from '../site/trace-scene.mjs';
const near=(a,b,tol=1e-12)=>assert.ok(Math.abs(a-b)<tol,`${a} differs from ${b}`);
const nestedNear=(a,b)=>a.forEach((r,i)=>Array.isArray(r)?nestedNear(r,b[i]):near(r,b[i]));

test('retaining before and after rows preserves a choice that the sum alone merges',()=>{
 const m=residualBridge();assert.deepEqual(m.after,[1,1]);assert.deepEqual(m.streams,[[1,0],[1,1]]);
 assert.deepEqual(m.alternatives.map(v=>v.input),[[1,0],[1,.5],[1,1]]);
 const otherBefore=[0,1],otherUpdate=[1,0];
 assert.deepEqual(otherBefore.map((v,i)=>v+otherUpdate[i]),m.after);
 assert.notDeepEqual([otherBefore,m.after],m.streams);
});

test('four-stream transport is constrained and composes two destination-wise updates',()=>{
 const m=residualWalkthrough();
 for(let i=0;i<4;i++){near(m.B[i].reduce((a,b)=>a+b),1);near(m.B.reduce((s,r)=>s+r[i],0),1);}
 assert.deepEqual(m.input,[[1,.5]]);
 assert.deepEqual(m.output,[[1.5,0],[2.5,0],[2.5,0],[3.5,-1]]);
 assert.deepEqual(m.nextInput,[[2.5,-.25]]);
 assert.deepEqual(m.next,[[1.5,.5],[1.5,1],[2.5,0],[1.5,.5]]);
});

test('coordinate pooling reproduces the two different rational source mixtures',()=>{
 const m=poolingWalkthrough();
 nestedNear(m.weights,[[.25,.75],[.75,.25]]);
 nestedNear(m.products,[[.25,3],[3.75,.5]]);
 nestedNear(m.output,[4,3.5]);
 // A scalar mixture cannot simultaneously produce the two desired coordinates.
 near((5-m.output[0])/4,.25);near((m.output[1]-2)/2,.75);
});

test('Day 3 content and scores trace the same attention inputs before pooling positions',()=>{
 const m=poolingWalkthrough(),content=weekFlowDefinition('pool-content'),scores=weekFlowDefinition('pool-scores'),pool=weekFlowDefinition('pooling');
 for(const def of [content,scores]){
  assert.equal(def.scenes.length,1);
  const s=def.scenes[0];assert.deepEqual(s.inputs[0].values,m.H);
  assert.deepEqual(s.inputs[0].rowLabels,['token 0','token 1']);
  assert.deepEqual(s.inputs[0].columnLabels,['feature 0','feature 1']);
  assert.deepEqual(s.parameters.rowLabels,['feature 0','feature 1']);
  assert.deepEqual(s.output.rowLabels,['token 0','token 1']);
  assert.deepEqual(s.output.columnLabels,['coord 0','coord 1']);
 }
 assert.deepEqual(content.scenes[0].parameters.values,m.WC);
 assert.deepEqual(scores.scenes[0].parameters.values,m.WZ);
 nestedNear(pool.scenes[0].inputs[0].values,scores.scenes[0].output.values);
 nestedNear(pool.scenes[3].inputs[0].values,content.scenes[0].output.values);
 assert.equal(pool.scenes.at(-1).output.values.length,1);
 for(const kind of ['pool-content','pool-scores','pooling']){
  const html=weekDiagram(kind,0);assert.match(html,/class="trace-axis">token 0/);
  assert.match(html,/class="trace-axis trace-column">coord 0/);
 }
});

test('axis labels leave packet destinations at the rendered numerical cell centres',()=>{
 const g=grid('Candidates',[[1,4],[5,2]],24,62,265,{rowLabels:['token 0','token 1'],columnLabels:['coord 0','coord 1']});
 const cells=[...g.html.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="32" class="trace-cell/g)];
 assert.equal(cells.length,g.points.length);
 cells.forEach((r,i)=>{near(g.points[i].x,+r[1]+r[3]/2);near(g.points[i].y,+r[2]+16);});
 assert.ok(g.points[0].x>24+65);
 assert.ok(g.points.at(-1).y+16<62+g.height);
});

test('query head reshape preserves coordinates and each main head has RMS one',()=>{
 const m=queryWalkthrough();
 assert.deepEqual(m.heads.flat(),m.expanded);
 m.normalized.forEach(h=>near(h.reduce((s,v)=>s+v*v,0)/h.length,1));
 nestedNear(m.normalized[1],[1.4,-.2]);
});

test('a high-scoring unfinished entry cannot displace a completed address',()=>{
 const m=indexerWalkthrough();
 assert.deepEqual(m.scores,[4,3,2,.5,99]);assert.deepEqual(m.selected,[0,1]);
 assert.deepEqual(m.valid,[true,true,true,true,false]);
 assert.deepEqual(indexerWalkthrough(2,19).selected,[0,4]);
 assert.deepEqual(indexerWalkthrough(2,2).selected,[]);
});

test('indexer queries and head weights are produced from the displayed shared input',()=>{
 const m=indexerWalkthrough(),q=queryWalkthrough(),def=weekFlowDefinition('indexer-inputs');
 assert.deepEqual(m.x,q.x);assert.deepEqual(m.z,q.latent);
 nestedNear(matmul([q.latent],m.WI),[[1,0,0,1]]);
 assert.deepEqual(m.queries,[[1,0],[0,1]]);
 nestedNear(matmul(q.x,m.Ww),[[2,1]]);
 nestedNear(m.headWeights,[1,.5]);
 assert.deepEqual(def.scenes.map(s=>s.output.values),[[m.expanded],m.queries,[m.rawHeadWeights],[m.headWeights]]);
 // Head RMS is applied to main queries, not introduced on the indexer path.
 assert.equal(def.scenes.length,4);
});

test('the same two keys expose the choices in the indexer mixture',()=>{
 const m=indexerWalkthrough();
 assert.deepEqual(m.dots.slice(0,2),[[4,-1],[2,2]]);
 assert.deepEqual(m.dots.slice(0,2).map(r=>r.reduce((a,b)=>a+b)),[3,4]);
 assert.deepEqual(m.positive.slice(0,2).map(r=>r.reduce((a,b)=>a+b)),[4,4]);
 assert.deepEqual(m.scores.slice(0,2),[4,3]);
 // Only the head mixture changed between the tied and untied scores.
 assert.deepEqual(m.headWeights,[1,.5]);
});

test('Day 4 traces stop at the calculation needed by the next passage',()=>{
 const latent=weekFlowDefinition('query-latent'),queries=weekFlowDefinition('indexer-queries'),weights=weekFlowDefinition('indexer-weights'),matches=weekFlowDefinition('indexer-matches'),scores=weekFlowDefinition('indexer-scores'),selection=weekFlowDefinition('indexer-selection'),main=weekFlowDefinition('main-queries');
 assert.deepEqual([latent,queries,weights,matches,scores,selection,main].map(d=>d.scenes.length),[3,2,2,2,1,1,6]);
 nestedNear(latent.scenes.at(-1).output.values,queries.scenes[0].inputs[0].values);
 nestedNear(latent.scenes.at(-1).output.values,main.scenes[0].inputs[0].values);
 nestedNear(matches.scenes.at(-1).output.values,scores.scenes[0].inputs[0].values);
 nestedNear(weights.scenes.at(-1).output.values[0],scores.scenes[0].parameters.values.map(r=>r[0]));
 assert.deepEqual(weights.scenes[0].inputs[0].columnLabels,['feature 0','feature 1']);
 assert.deepEqual(weights.scenes[0].parameters.rowLabels,['feature 0','feature 1']);
 assert.deepEqual(weights.scenes[0].output.columnLabels,['head 0','head 1']);
 nestedNear(scores.scenes.at(-1).output.values,selection.scenes[0].inputs[0].values);
 assert.deepEqual(selection.scenes[0].output.values,[[0,1]]);
});

test('the shared-KV scalar oracle gives one denominator and a zero-valued sink',()=>{
 const m=attentionWalkthrough(),without=attentionWalkthrough(false);
 near(m.denominator,8);near(m.weights[0],1/8);near(m.weights[1],3/8);
 near(m.output[0],3*Math.log(3)/8);near(m.output[1],4);
 m.output.forEach((v,j)=>near(without.output[j],2*v));
 near(m.weights.reduce((s,v)=>s+v,0)+m.sinkAmount/m.denominator,1);
});

test('inverse query rotation preserves the returned relative frame under common shifts',()=>{
 for(let shift=-3;shift<=8;shift++){
  const m=rotaryWalkthrough(shift);near(m.score,0);nestedNear(m.returned,[0,-1]);
  near(Math.hypot(...m.key),1);near(Math.hypot(...m.q),1);
 }
});

test('grouped return and final readout agree with their displayed arithmetic',()=>{
 const g=groupedWalkthrough(),r=readoutWalkthrough();
 assert.deepEqual(g.intermediate,[1,5]);assert.deepEqual(g.output,[1,5,1,5]);
 assert.deepEqual(r.X,residualWalkthrough().next);nestedNear(r.mixed,[2.5,.875]);
 nestedNear(r.logits,[r.normalized[0],r.normalized[1],r.normalized[1]-r.normalized[0]]);
 near(r.probabilities.reduce((s,v)=>s+v,0),1);
 near(r.probabilities[0],.6533909354473006);
});

test('readout gains follow the displayed biases and are not normalized across streams',()=>{
 const m=readoutWalkthrough(),gains=m.bias.map(v=>1/(1+Math.exp(-v)));
 nestedNear(gains,[.25,.5,.25,.5]);nestedNear(m.a,gains);
 near(gains.reduce((s,v)=>s+v,0),1.5);
 nestedNear(matmul([gains],m.X)[0],m.mixed);
 nestedNear(weekFlowDefinition('readout').scenes[0].output.values,[gains]);
});

test('MTP normalizes each stream and repeats the same projected next embedding',()=>{
 const m=mtpWalkthrough(),def=weekFlowDefinition('mtp-fusion');
 assert.deepEqual(m.X,readoutWalkthrough().X);
 m.hiddenNormalized.forEach(r=>near(r.reduce((s,v)=>s+v*v,0)/r.length,1));
 near(m.embeddingRMS,1/Math.sqrt(2));
 nestedNear(m.projected,[0,Math.sqrt(2)]);
 nestedNear(m.hidden,matmul(m.hiddenNormalized,m.WH));
 m.repeated.forEach(r=>nestedNear(r,m.projected));
 nestedNear(m.fused[0],[1.3416407864998738,1.861427157873053]);
 nestedNear(m.fused[2],[Math.sqrt(2),Math.sqrt(2)]);
 assert.equal(def.scenes.length,7);
 nestedNear(def.scenes.at(-1).inputs[0].values,m.hidden);
 nestedNear(def.scenes.at(-1).inputs[1].values,m.repeated);
 // Stop at fusion: no output from an unevaluated extra block is supplied.
 assert.match(def.scenes.at(-1).output.label,/Fused MTP/);
 assert.deepEqual(def.scenes.at(-1).output.rowLabels,['stream 0','stream 1','stream 2','stream 3']);
});

test('Muon uses the current gradient twice through its stated momentum rule',()=>{
 const m=muonWalkthrough(),def=weekFlowDefinition('muon-input');
 nestedNear(m.buffer,m.previous.map((v,i)=>.95*v+m.rawGradient[i]));
 nestedNear(m.gradient,m.buffer.map((v,i)=>.95*v+m.rawGradient[i]));
 nestedNear(m.gradient,[4,1]);
 nestedNear(def.scenes[1].inputs[1].values,[m.rawGradient]);
 nestedNear(def.scenes[3].inputs[1].values,[m.rawGradient]);
 nestedNear(def.scenes.at(-1).output.values,[[4,1]]);
});

test('split traces stop before the operation motivated in the following passage',()=>{
 const base=weekFlowDefinition('attention-base'),rot=weekFlowDefinition('rotation-comparison'),inverse=weekFlowDefinition('rotation'),gains=weekFlowDefinition('muon-gains'),step=weekFlowDefinition('muon-step');
 assert.equal(base.scenes.length,6);
 assert.doesNotMatch(base.scenes.map(s=>s.title).join(' '),/sink|three/);
 assert.equal(rot.scenes.length,6);assert.equal(inverse.scenes.length,2);
 assert.doesNotMatch(rot.scenes.map(s=>s.title).join(' '),/Undo/);
 assert.equal(gains.scenes.length,12);assert.equal(step.scenes.length,3);
 nestedNear(gains.scenes.at(-1).output.values,[muonWalkthrough().steps.at(-1)]);
 nestedNear(step.scenes[0].inputs[0].values,gains.scenes.at(-1).output.values);
});

test('hybrid polynomial has ten steps and its scaled parameter step approaches the polar oracle',()=>{
 const m=muonWalkthrough();assert.equal(m.steps.length,11);
 m.steps.at(-1).forEach(v=>near(v,1,2e-4));
 nestedNear(m.steps[1],[.7275212743001618,.7689948661813755]);
 nestedNear(m.updated,[.9964539867851236,.9964539507728801]);
 // Ordinary rescaling would retain the original 4:1 gain ratio.
 near(m.initial[0]/m.initial[1],4);
 assert.ok(Math.abs(m.steps.at(-1)[0]/m.steps.at(-1)[1]-1)<2e-5);
});

test('weekly scenes progressively reveal results and finish at the numerical oracle',()=>{
 const expected={pooling:[[4,3.5]],query:queryWalkthrough().normalized.slice(1),'indexer-inputs':[indexerWalkthrough().headWeights],indexer:[[0,1]],'attention-base':[attentionWalkthrough(false).output],attention:[attentionWalkthrough().output],'rotation-comparison':[[0]],rotation:[[0],[-1]],grouped:[[1,5,1,5]],readout:[readoutWalkthrough().probabilities],'mtp-fusion':mtpWalkthrough().fused,'muon-input':[muonWalkthrough().gradient],'muon-gains':[muonWalkthrough().steps.at(-1)],'muon-step':[muonWalkthrough().updated],muon:[muonWalkthrough().updated],residual:residualWalkthrough().output,'pool-content':poolingWalkthrough().values,'pool-scores':poolingWalkthrough().scores};
 Object.assign(expected,{'query-latent':[queryWalkthrough().latent],'main-queries':queryWalkthrough().normalized.slice(1),'indexer-queries':indexerWalkthrough().queries,'indexer-weights':[indexerWalkthrough().headWeights],'indexer-matches':indexerWalkthrough().positive,'indexer-scores':indexerWalkthrough().scores.map(v=>[v]),'indexer-selection':[[0,1]]});
 Object.assign(expected,{'singlepass-input':[[.3,.7]],'engram-gate':[[2/(1+Math.exp(-1)),-1/(1+Math.exp(-1))],[2/(1+Math.exp(1)),-1/(1+Math.exp(1))]],'patch-contrast':[[-1,1],[1,1]],'fp4-reconstruct':[[.75,3]],'draft-bias':[[.25,.75]],'headwise-muon':[[7/Math.sqrt(58),-3/Math.sqrt(58)],[3/Math.sqrt(58),7/Math.sqrt(58)]],'table-balance':[[1,-4/Math.sqrt(41)],[0,5/Math.sqrt(41)]],'hca-coarse':[[2]]});
 for(const kind of weekKinds){
  const def=weekFlowDefinition(kind),html=weekFigure(kind);assert.match(html,/aria-live="polite"/);assert.match(html,/data-flow-kind="week-/);
  nestedNear(def.scenes.at(-1).output.values,expected[kind]);
  const start=weekDiagram(kind,0);assert.match(start,/data-present="false" data-cell="out:/);assert.match(start,/<title>/);assert.doesNotMatch(start,/NaN|undefined/);
  for(const scene of def.scenes)for(const c of scene.cells){
   for(const t of c.terms)for(const r of t.sources)assert.ok(Number.isFinite(scene.inputs[r.input].values[r.row][r.col]));
   if(!c.finish)near(c.result,c.terms.reduce((s,t)=>s+t.value,0));
  }
 }
});
