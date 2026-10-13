import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {attentionFrame,attentionArithmetic,attentionFlow,HEAD_FLOW_START,HEAD_FLOW_LAST} from '../public/head-flow.js';
import {sequenceAttentionExplorer} from '../scripts/context-explorers.mjs';
import {createSequenceAttention} from '../public/context-explorers.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-12);

test('each displayed comparison multiplies the selected query with its candidate key, then scales',()=>{
  for(const key of ['dog','cat'])for(const position of [true,false])for(let i=0;i<5;i++)for(let j=0;j<5;j++){
    const dot=attentionFrame(key,position,i,HEAD_FLOW_START[2]+2*j),scale=attentionFrame(key,position,i,HEAD_FLOW_START[2]+1+2*j);
    const {Q,K,scores}=dot.result;
    assert.deepEqual(dot.products,[Q[i][0]*K[j][0],Q[i][1]*K[j][1]]);
    near(dot.products.reduce((a,b)=>a+b,0)/Math.sqrt(2),scores[i][j]);
    assert.equal(dot.phase,'dot');assert.equal(scale.phase,'scale');
    assert.match(attentionArithmetic(dot),/Values do not enter/);
    const {document}=parseHTML(attentionFlow(scale));
    assert.equal(document.querySelectorAll('.head-flow-block').length,6);
    assert.ok(!document.querySelector('.head-flow-block:last-of-type')?.textContent.includes('NaN'));
  }
});
test('the five animated additions agree with a separately accumulated output, including negative coordinates',()=>{
  const base=attentionFrame('dog',true,1,0).result;let sum=[0,0];
  for(let j=0;j<5;j++){
    const weighted=attentionFrame('dog',true,1,HEAD_FLOW_START[4]+2*j),added=attentionFrame('dog',true,1,HEAD_FLOW_START[4]+1+2*j);
    weighted.partial.forEach((v,r)=>near(v,sum[r]));
    sum=sum.map((v,r)=>v+base.weights[1][j]*base.V[j][r]);
    added.partial.forEach((v,r)=>near(v,sum[r]));
  }
  attentionFrame('dog',true,1,HEAD_FLOW_LAST).partial.forEach((v,r)=>near(v,base.H[1][r]));
});
test('whole-head playback is finite, manual changes cancel it, and reduced motion goes straight to the result',()=>{
  const {document,window}=parseHTML(sequenceAttentionExplorer()),element=document.querySelector('[data-sequence-attention]');
  element.querySelector('[data-head-positions]').checked=true;
  const queue=new Map();let n=0;
  const preference={matches:false};
  const player=createSequenceAttention(element,{preference,schedule:fn=>{queue.set(++n,fn);return n;},cancel:id=>queue.delete(id)});
  const tick=()=>{const [id,fn]=queue.entries().next().value;queue.delete(id);fn();};
  assert.equal(queue.size,0);
  element.querySelector('[data-head-play]').click();assert.equal(queue.size,1);
  for(let i=0;i<HEAD_FLOW_START[2];i++)tick();assert.equal(player.state().step,HEAD_FLOW_START[2]);
  assert.match(element.querySelector('[data-head-arithmetic]').textContent,/Compare query dog 2 with key the 1/);
  element.querySelector('[data-head-sentence="cat"]').click();
  assert.equal(queue.size,0);assert.equal(player.state().row,4);
  element.querySelector('[data-head-reset]').click();element.querySelector('[data-head-play]').click();
  for(let i=0;i<HEAD_FLOW_LAST;i++)tick();
  assert.equal(queue.size,0);assert.equal(player.state().step,HEAD_FLOW_LAST);assert.equal(player.state().playing,false);
  element.querySelector('[data-head-next]').click();assert.equal(player.state().step,0);
  preference.matches=true;element.querySelector('[data-head-play]').click();
  assert.equal(player.state().step,HEAD_FLOW_LAST);assert.equal(queue.size,0);
  const slider=element.querySelector('[data-head-progress]');slider.value=String(HEAD_FLOW_START[3]);slider.dispatchEvent(new window.Event('input'));
  assert.match(element.querySelector('[data-head-arithmetic]').textContent,/Their sum is D/);
  player.destroy();assert.equal(queue.size,0);
});

test('projection inputs slide down both weight rows and only stored coordinates appear in Q, K and V',()=>{
  for(let input=0;input<5;input++)for(let operation=0;operation<5;operation++){
    const frame=attentionFrame('dog',true,1,1+5*input+operation);
    const {document}=parseHTML(attentionFlow(frame));
    const cells=[...document.querySelectorAll('[data-head-projection-cell]')];
    assert.equal(cells.length,30);
    assert.equal(cells.filter(c=>c.dataset.stored==='true').length,6*input+3*frame.projection.stored);
    assert.equal(document.querySelectorAll('.head-flow-operand').length,6);
    for(const name of ['Q','K','V'])for(let c=0;c<2;c++){
      const operand=document.querySelector(`.head-flow-operand[data-map="${name}"][data-input-coordinate="${c}"]`);
      assert.equal(Number(operand.textContent),frame.result.X[input][c]);
      if(operation===1||operation===3){
        const motion=operand.querySelector('animateTransform');
        const from=motion.getAttribute('from').split(' ').map(Number),to=motion.getAttribute('to').split(' ').map(Number);
        assert.equal(from[0],to[0]);assert.ok(to[1]>from[1],'the actual coordinate travels down to the next matrix row');
      }
    }
  }
  const first=attentionFrame('dog',true,1,7),second=attentionFrame('dog',true,1,9);
  assert.deepEqual(first.projection.products,{Q:[.25,0],K:[.25,.5],V:[.125,1]});
  assert.deepEqual(second.projection.products,{Q:[.125,1],K:[0,1],V:[.25,-.5]});
  const {document}=parseHTML(attentionFlow(second,{animate:false}));
  assert.equal(document.querySelectorAll('animate,animateMotion,animateTransform').length,0);
});

test('a key enters each comparison once and only the computed scaled score travels to its score cell',()=>{
  for(let j=0;j<5;j++){
    const dot=attentionFrame('dog',true,1,HEAD_FLOW_START[2]+2*j),scale=attentionFrame('dog',true,1,HEAD_FLOW_START[2]+2*j+1);
    const {document:d}=parseHTML(attentionFlow(dot)),{document:s}=parseHTML(attentionFlow(scale));
    assert.equal(d.querySelectorAll('[data-head-packet="query"]').length,1,'each comparison reads the same selected query once');
    assert.equal(d.querySelectorAll('[data-head-packet="key"]').length,1);
    assert.equal(d.querySelectorAll('[data-head-packet="score"]').length,0);
    assert.equal(d.querySelector(`[data-head-score-cell="${j}"]`).dataset.stored,'false');
    assert.equal(s.querySelectorAll('[data-head-packet="query"],[data-head-packet="key"]').length,0,'scaling must not resend Q or K');
    const packet=s.querySelector('[data-head-packet="score"]');assert.ok(packet);
    assert.equal(Number(packet.querySelector('text').textContent),Number(scale.result.scores[1][j].toFixed(3)));
    assert.match(packet.querySelector('animateMotion').getAttribute('path'),/^M620 205/,'the score comes from the comparison, not the query matrix');
    const score=s.querySelector(`[data-head-score-cell="${j}"]`);
    assert.equal(score.dataset.stored,'true');assert.ok(score.querySelector('animate'),'reveal the score after its transfer');
    assert.equal(s.querySelectorAll('[data-head-packet]').length,1);
  }
});
test('values and shares enter multiplication once; only their product enters the accumulated sum',()=>{
  const fmt=v=>'('+v.map(x=>Number(x.toFixed(3))).join(', ')+')';
  for(let j=0;j<5;j++){
    const weighted=attentionFrame('dog',true,1,HEAD_FLOW_START[4]+2*j),added=attentionFrame('dog',true,1,HEAD_FLOW_START[4]+2*j+1);
    const {document:w}=parseHTML(attentionFlow(weighted)),{document:a}=parseHTML(attentionFlow(added));
    assert.equal(w.querySelectorAll('[data-head-packet]').length,2);
    assert.equal(w.querySelector('[data-head-packet="value"] text').textContent,fmt(weighted.result.V[j]),'transfer the original value, not the preweighted term');
    assert.equal(Number(w.querySelector('[data-head-packet="weight"] text').textContent),Number(weighted.result.weights[1][j].toFixed(3)));
    assert.equal(w.querySelectorAll('[data-head-packet="term"]').length,0);
    assert.equal(a.querySelectorAll('[data-head-packet="value"],[data-head-packet="weight"]').length,0,'addition must not resend V or its share');
    assert.equal(a.querySelectorAll('[data-head-packet]').length,1);
    const term=a.querySelector('[data-head-packet="term"]');
    assert.equal(term.querySelector('text').textContent,fmt(added.terms[j]));
    assert.match(term.querySelector('animateMotion').getAttribute('path'),/^M650 602/);
    const sum=a.querySelector('[data-head-commit="sum"]');
    assert.equal(sum.querySelector('[data-before-arrival]').firstChild.textContent,'running sum: '+fmt(weighted.partial));
    assert.equal(sum.querySelector('[data-after-arrival]').firstChild.textContent,'running sum: '+fmt(added.partial));
    assert.ok(sum.querySelector('[data-after-arrival] animate'));
    const {document:still}=parseHTML(attentionFlow(added,{animate:false}));
    assert.equal(still.querySelectorAll('animate,animateMotion,animateTransform').length,0);
    assert.equal(still.querySelector('[data-head-commit="sum"]').textContent,'running sum: '+fmt(added.partial));
  }
});

test('comparisons stay inside the score panel and carried coordinates arrive above its faces',()=>{
  const {document}=parseHTML(attentionFlow(attentionFrame('dog',true,1,HEAD_FLOW_START[2]+2)));
  assert.equal(document.querySelector('[data-head-operation="comparison"]').closest('[data-head-matrix]').dataset.headMatrix,'S');
  const svg=document.querySelector('svg');
  assert.ok(svg.lastElementChild.matches('[data-head-packet]'),'packets must render after the opaque panel faces');
  const {document:projection}=parseHTML(attentionFlow(attentionFrame('dog',true,1,9)));
  for(const packet of projection.querySelectorAll('[data-head-packet]')){
    const route=packet.querySelector('animateMotion').getAttribute('path');
    assert.ok(Number(route.match(/H([\d.]+)$/)[1])>344,'stored scalar reaches the numeric vector cell, beyond its row label');
  }
});
test('pause and resume preserve the existing SVG timeline instead of replaying its transfer',()=>{
  const {document}=parseHTML(sequenceAttentionExplorer()),element=document.querySelector('[data-sequence-attention]');
  const queue=new Map();let id=0;
  const player=createSequenceAttention(element,{schedule:fn=>{queue.set(++id,fn);return id;},cancel:id=>queue.delete(id)});
  element.querySelector('[data-head-stage="2"]').click();
  const svg=element.querySelector('.head-flow');let freezes=0,resumes=0;
  svg.pauseAnimations=()=>freezes++;svg.unpauseAnimations=()=>resumes++;
  element.querySelector('[data-head-play]').click();
  element.querySelector('[data-head-play]').click();
  element.querySelector('[data-head-play]').click();
  assert.equal(element.querySelector('.head-flow'),svg,'resuming must not reconstruct and replay the current frame');
  assert.equal(freezes,1);assert.equal(resumes,2);assert.equal(queue.size,1);
  const [timer,fn]=queue.entries().next().value;queue.delete(timer);fn();
  assert.equal(player.state().step,HEAD_FLOW_START[2]+1);
  assert.notEqual(element.querySelector('.head-flow'),svg);
  player.destroy();assert.equal(queue.size,0);
});
