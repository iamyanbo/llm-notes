import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {readFile} from 'node:fs/promises';
import {architectureOperations} from '../scripts/architecture-operations.mjs';
import {operationFrame,maskedExample,crossExample,OPERATION_KINDS,OPERATION_PANELS,VOCAB_MAP} from '../public/architecture-operations-model.js';
import {architectureOperationDiagram} from '../public/architecture-operations-view.js';
import {createArchitectureOperations} from '../public/architecture-operations.js';
import {mv,normalization} from '../public/block-study-model.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-11,`${a} != ${b}`);
test('embedding scale and sinusoidal position are added coordinate by coordinate',()=>{
  const f=operationFrame('embedding',2),scaled=f.nodes[1].data[0],out=f.nodes[2].data[0];
  near(scaled[0],.5*Math.sqrt(2));near(scaled[1],Math.sqrt(2));
  near(out[0],scaled[0]+Math.sin(1));near(out[1],scaled[1]+Math.cos(1));
});
test('feed-forward operands enter both matrices and stored outputs agree with independent products',()=>{
  const f=operationFrame('feed',3);
  assert.deepEqual(f.nodes[2].data[0],[2.7,0,0]);
  assert.deepEqual(f.nodes[3].data[0],[2.7,0]);
  assert.deepEqual(f.nodes[1].data[0],mv(f.maps[0].matrix,f.nodes[0].data[0]));
  for(const step of [1,3]){
    const {document}=parseHTML(architectureOperationDiagram(operationFrame('feed',step)));
    assert.equal(document.querySelectorAll('[data-operation-packet]').length,step===1?9:8,'six matrix operands plus the corresponding output coordinates');
  }
});
test('causal masks block only later positions and produce exactly zero future contributions',()=>{
  for(let row=0;row<3;row++){
    const r=maskedExample(row);
    r.masked[row].forEach((v,j)=>assert.equal(!Number.isFinite(v),j>row));
    r.weights.forEach((v,j)=>j>row?assert.equal(v,0):assert.ok(v>0));
    near(r.weights.reduce((a,b)=>a+b,0),1);
    r.output.forEach((v,c)=>near(v,r.weights.reduce((s,a,j)=>s+a*r.V[j][c],0)));
  }
  const {document}=parseHTML(architectureOperationDiagram(operationFrame('mask',1,1)));
  assert.equal(document.querySelectorAll('[data-blocked=true]').length,3);
  assert.deepEqual(maskedExample(0).output,maskedExample(0).V[0]);
});
test('cross-attention compares the decoder query with all encoder keys and transmits encoder values',()=>{
  const r=crossExample();
  r.scores.forEach((s,j)=>near(s,(.5*r.K[j][0]+r.K[j][1])/Math.sqrt(2)));
  r.output.forEach((v,c)=>near(v,r.weights.reduce((sum,a,j)=>sum+a*r.V[j][c],0)));
  const f=operationFrame('cross',1),{document}=parseHTML(architectureOperationDiagram(f));
  assert.equal(document.querySelectorAll('[data-operation-packet]').length,12,'the query is copied for all three comparisons, alongside all six encoder-key coordinates');
});
test('residual normalization and vocabulary projection show their true intermediate vectors',()=>{
  const n=operationFrame('norm',4);
  assert.deepEqual(n.nodes[2].data[0],[1,2,3]);assert.deepEqual(n.nodes[3].data[0],[-1,0,1]);
  assert.deepEqual(n.nodes[5].data[0],normalization([1,2,3]).output);
  const o=operationFrame('output',3),logits=mv(VOCAB_MAP,[.8,.2]);
  assert.deepEqual(o.nodes[1].data[0],logits);
  near(o.nodes[3].data[0].reduce((a,b)=>a+b,0),1);
  const denominator=o.nodes[2].data[0].reduce((a,b)=>a+b,0);
  o.nodes[3].data[0].forEach((p,j)=>near(p,o.nodes[2].data[0][j]/denominator));
});
function fixture(reduced=false){
  const {document,window}=parseHTML(architectureOperations('a')+architectureOperations('b'));
  const queue=new Map();let counter=0;
  const preference={matches:reduced,addEventListener(_,fn){this.change=fn;},removeEventListener(){}};
  const player=createArchitectureOperations(document,preference,{schedule:fn=>{queue.set(++counter,fn);return counter;},cancel:id=>queue.delete(id)});
  return {document,window,queue,player,preference,tick(){const [id,fn]=queue.entries().next().value;queue.delete(id);fn();}};
}
test('each architecture operation unfolds once and is synchronized in both diagram copies',()=>{
  const f=fixture();
  for(const {key,kind} of OPERATION_PANELS){
    f.player.update({key,running:true});
    assert.equal(f.queue.size,1);
    for(let i=1;i<OPERATION_KINDS[kind].labels.length;i++)f.tick();
    assert.equal(f.queue.size,0);assert.equal(f.player.state().playing,false);
    for(const p of f.document.querySelectorAll(`[data-stage-expansion="${key}"]`))assert.equal(p.dataset.operation,String(OPERATION_KINDS[kind].labels.length-1));
    f.player.update({key:null,running:false});
  }
  f.player.destroy();
});
test('manual playback can be paused without replay, and stage changes dispose the prior timer',()=>{
  const f=fixture();f.player.update({key:'2',running:false});
  const a=f.document.querySelector('[data-stage-expansion="2"]'),play=a.querySelector('[data-stage-play]');
  play.click();f.tick();assert.equal(f.player.state().step,1);
  const svg=a.querySelector('svg');let pauses=0,resumes=0;svg.pauseAnimations=()=>pauses++;svg.unpauseAnimations=()=>resumes++;
  play.click();assert.equal(pauses,1);assert.equal(f.queue.size,0);
  play.click();assert.equal(resumes,1);assert.equal(a.querySelector('svg'),svg);
  f.player.update({key:'4',running:false});assert.equal(f.queue.size,0);
  a.querySelector('[data-stage-operation="2"]').click();assert.equal(f.queue.size,0);
  f.player.destroy();
});
test('manual inspection preserves masked-position choice, and hidden or reduced-motion views stop timers',()=>{
  const f=fixture();f.player.update({key:'3',running:true});
  const a=f.document.querySelector('[data-stage-expansion="3"]');
  a.querySelector('[data-stage-row="0"]').click();assert.equal(f.queue.size,0);
  a.querySelector('[data-stage-operation="2"]').click();
  for(const p of f.document.querySelectorAll('[data-stage-expansion="3"]'))assert.equal(p.querySelector('[data-stage-row="0"]').getAttribute('aria-pressed'),'true');
  a.querySelector('[data-stage-play]').click();Object.defineProperty(f.document,'hidden',{value:true});
  f.document.dispatchEvent(new f.window.Event('visibilitychange'));assert.equal(f.queue.size,0);
  f.preference.matches=true;f.preference.change();a.querySelector('[data-stage-play]').click();
  assert.equal(f.player.state().step,3);assert.equal(f.queue.size,0);
  assert.equal(a.querySelectorAll('animate,animateMotion').length,0);
  f.player.destroy();
});
test('opening and enlarged diagrams contain all operation targets and no hidden focusable controls',async()=>{
  const {document}=parseHTML(await readFile('dist/index.html','utf8'));
  for(const scope of ['.essay-header','#architecture-dialog']){
    const surface=document.querySelector(scope);assert.equal(surface.querySelectorAll('[data-stage-study]').length,11);
    for(const node of surface.querySelectorAll('[aria-controls]'))assert.ok(document.getElementById(node.getAttribute('aria-controls')));
    for(const panel of surface.querySelectorAll('[data-stage-study]'))assert.ok(panel.hasAttribute('inert'));
  }
});
