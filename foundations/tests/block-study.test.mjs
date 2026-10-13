import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseHTML} from 'linkedom';
import {STUDIES,OUTPUT_MAPS,mv,normalization,feedForward,toyBlock,studyFrame} from '../public/block-study-model.js';
import {blockStudy,blockStudyDiagram} from '../public/block-study-view.js';
import {createBlockStudy} from '../public/block-study.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
const vectorNear=(a,b)=>{assert.equal(a.length,b.length);a.forEach((v,i)=>near(v,b[i]));};

test('joining heads preserves their coordinates before the selected output map mixes them',()=>{
  const select=studyFrame('heads',{},3),mix=studyFrame('heads',{map:'mix'},3);
  assert.deepEqual(select.nodes[2].v,[.8,.2,.1,.9]);
  assert.deepEqual(select.nodes[3].v,[.8,.9]);
  vectorNear(mix.nodes[3].v,[.45,.55]);
  assert.equal(OUTPUT_MAPS.select.length,2);
  assert.ok(OUTPUT_MAPS.select.every(row=>row.length===4));
  const {document}=parseHTML(blockStudyDiagram(select));
  assert.equal(document.querySelectorAll('[data-block-node="3"] [data-present=true]').length,2);
  assert.ok(document.querySelectorAll('[data-block-packet]').length>4);
});
test('the residual example includes the identity update and the cancellation failure',()=>{
  assert.deepEqual(studyFrame('residual',{update:'zero'},2).nodes[3].v,[0,1]);
  assert.deepEqual(studyFrame('residual',{update:'cancel'},2).nodes[3].v,[0,0]);
  vectorNear(studyFrame('residual',{},2).nodes[3].v,[.8,1.9]);
});
test('the nonlinear network differs from the composition of its two matrices',()=>{
  const activated=feedForward([.8,1.9]),linear=feedForward([.8,1.9],false);
  vectorNear(activated.hidden,[2.7,-1.1,-.8]);
  vectorNear(activated.output,[2.7,0]);
  vectorNear(linear.output,[2.7,-.3]);
  vectorNear(linear.output,mv([[1,1],[2,-1]],[.8,1.9]));
});
test('normalization uses within-vector population statistics and learned coordinate parameters',()=>{
  const r=normalization([1,2,3]),shift=normalization([11,12,13]);
  near(r.mean,2);near(r.variance,2/3);vectorNear(r.centered,[-1,0,1]);
  vectorNear(r.output,shift.output);
  assert.deepEqual(normalization([4,4,4]).output,[0,0,0]);
  const affine=normalization([1,2,3],[2,1,.5],[0,1,-1]);
  vectorNear(affine.output,[2*r.output[0],1,.5*r.output[2]-1]);
  const scaled=normalization([2,4,6]);
  assert.ok(Math.abs(scaled.output[0]-r.output[0])<1e-5);
});
test('the assembled block recomputes both heads and sends normalized U into the network',()=>{
  const r=toyBlock([[1,0],[0,1]]);
  vectorNear(r.weights[0][1],[.8,.2]);vectorNear(r.weights[1][1],[.1,.9]);
  vectorNear(r.O[1],[.8,.9]);vectorNear(r.R[1],[.8,1.9]);
  vectorNear(r.U[1],normalization(r.R[1]).output);
  vectorNear(r.T[1],feedForward(r.U[1]).output);
  vectorNear(r.Y[1],normalization(r.U[1].map((v,c)=>v+r.T[1][c])).output);
  assert.notDeepEqual(r.T[1],feedForward(r.R[1]).output);
  const swapped=toyBlock([[0,1],[1,0]]);
  swapped.Y.forEach((row,i)=>vectorNear(row,r.Y[1-i]));
  vectorNear(studyFrame('block',{layer:2},0).nodes[0].v,r.Y[1]);
});
function fixture(kind='heads',reduced=false){
  const {document,window}=parseHTML(blockStudy(kind)),root=document.querySelector('[data-block-study]'),queue=new Map();
  let counter=0;
  const preference={matches:reduced},player=createBlockStudy(root,{preference,schedule:fn=>{queue.set(++counter,fn);return counter;},cancel:id=>queue.delete(id)});
  return {document,window,root,queue,preference,player,tick:()=>{const [id,fn]=queue.entries().next().value;queue.delete(id);fn();}};
}
test('all five walkthroughs stop at their last operation and manual choices cancel playback',()=>{
  for(const kind of Object.keys(STUDIES)){
    const f=fixture(kind);assert.equal(f.queue.size,0);
    f.root.querySelector('[data-block-play]').click();
    for(let i=1;i<STUDIES[kind].labels.length;i++)f.tick();
    assert.equal(f.queue.size,0);assert.equal(f.player.state().playing,false);
    assert.equal(f.player.state().step,STUDIES[kind].labels.length-1);
    f.root.querySelector('[data-block-play]').click();
    f.root.querySelector('[data-block-step="1"]').click();assert.equal(f.queue.size,0);
    f.player.destroy();
  }
});
test('pausing and resuming retains the current SVG; output-map controls recompute coefficients',()=>{
  const f=fixture();f.root.querySelector('[data-block-play]').click();f.tick();
  const svg=f.root.querySelector('svg');let pauses=0,resumes=0;
  svg.pauseAnimations=()=>pauses++;svg.unpauseAnimations=()=>resumes++;
  f.root.querySelector('[data-block-play]').click();assert.equal(pauses,1);
  f.root.querySelector('[data-block-play]').click();assert.equal(resumes,1);
  assert.equal(f.root.querySelector('svg'),svg);
  f.root.querySelector('[data-value="mix"]').click();assert.equal(f.queue.size,0);
  f.root.querySelector('[data-block-step="3"]').click();
  assert.match(f.root.querySelector('[data-block-status]').textContent,/0.55/);
  assert.match(f.root.querySelector('[data-block-parameters]').textContent,/0.5/);
  f.player.destroy();
});
test('reduced motion exposes the result without animation, and sliders recompute the statistics',()=>{
  const f=fixture('norm',true);f.root.querySelector('[data-block-play]').click();
  assert.equal(f.player.state().step,3);assert.equal(f.queue.size,0);
  assert.equal(f.root.querySelectorAll('animate,animateMotion,animateTransform').length,0);
  const slider=f.root.querySelector('[data-block-slider="shift"]');slider.value='10';
  slider.dispatchEvent(new f.window.Event('input'));assert.equal(f.player.state().step,0);
  assert.match(f.root.querySelector('svg').textContent,/mean = 12.000/);
  f.player.destroy();
});
test('published walkthroughs have unique targets and ship their modules and both new stylesheets',async()=>{
  const {document}=parseHTML(await readFile('dist/index.html','utf8'));
  assert.equal(document.querySelectorAll('[data-block-study]').length,5);
  for(const root of document.querySelectorAll('[data-block-study]'))assert.ok(document.getElementById(root.getAttribute('aria-labelledby')));
  for(const file of ['block-study.js','block-study-model.js','block-study-view.js','block-study.css','background.css']){
    assert.ok((await readFile(`dist/${file}`,'utf8')).length>0);
  }
  assert.ok(document.querySelector('link[href^="background.css"]'));
  assert.ok(document.querySelector('link[href^="block-study.css"]'));
});
