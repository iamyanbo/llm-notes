import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {vectorFlowData,cubicPoint} from '../public/vector-flow-model.js';
import {vectorFlowFrame} from '../public/vector-flow-view.js';
import {geometryStudy} from '../public/geometry-view.js';
import {createGeometryStudy} from '../public/geometry-study.js';
import {sequenceAttention} from '../public/context-model.js';
const mount=options=>{const {document,window}=parseHTML(geometryStudy(options));return {document,window,element:document.querySelector('[data-geometry-study]')};};

test('flow products and outputs match each projection of the same original input',()=>{
  for(const key of ['dog','cat'])for(const positions of [false,true])for(let selected=0;selected<5;selected++){
    const head=sequenceAttention(key,positions);
    for(const kind of ['Q','K','V']){
      const flow=vectorFlowData({key,positions,selected,kind,progress:1});
      assert.deepEqual(flow.input,head.X[selected]);assert.deepEqual(flow.output,head[kind][selected]);
      flow.products.forEach((row,r)=>row.forEach((v,j)=>assert.equal(v,flow.input[j]*flow.matrix[r][j])));
    }
  }
  assert.deepEqual(vectorFlowData({kind:'V',progress:1}).output,[1,-.5]);
});
test('scalar flow has one weight row and one output; two-dimensional flow has two',()=>{
  const scalar=vectorFlowData({mode:'scalar',progress:1});
  assert.deepEqual(scalar.matrix,[[0,1]]);assert.deepEqual(scalar.output,[1]);assert.equal(scalar.count,1);
  assert.equal(vectorFlowData({mode:'basis'}).count,2);
  const {document}=parseHTML(vectorFlowFrame({mode:'scalar',progress:{S:1}}));
  assert.equal(document.querySelectorAll('[data-flow-weight-row]').length,2);
  assert.equal(document.querySelectorAll('[data-flow-output-coordinate]').length,1);
});
test('each coordinate passes through copy, multiply, add and store before being marked computed',()=>{
  for(const [t,phase,row,completed] of [[0,0,0,0],[.125,1,0,0],[.25,2,0,0],[.375,3,0,0],[.5,0,1,1],[.625,1,1,1],[.75,2,1,1],[.875,3,1,1],[1,4,1,2]]){
    const flow=vectorFlowData({kind:'V',progress:t});
    assert.equal(flow.phase,phase);assert.equal(flow.row,row);assert.equal(flow.completed,completed);
  }
  const entering=parseHTML(vectorFlowFrame({active:'V',progress:{V:.05}})).document;
  assert.deepEqual([...entering.querySelectorAll('.vector-flow-packet text')].map(n=>n.textContent),['0','1']);
  const multiplying=parseHTML(vectorFlowFrame({active:'V',progress:{V:.175}})).document;
  assert.deepEqual([...multiplying.querySelectorAll('.vector-flow-packet text')].map(n=>n.textContent),['0','1']);
  const negativeProduct=parseHTML(vectorFlowFrame({active:'V',progress:{V:.675}})).document;
  assert.deepEqual([...negativeProduct.querySelectorAll('.vector-flow-packet text')].map(n=>n.textContent),['0','-0.5']);
});
test('packet paths start and end at their numeric source and destination',()=>{
  const points=[[1,2],[3,8],[7,-2],[9,4]];
  assert.deepEqual(cubicPoint(points,0),points[0]);assert.deepEqual(cubicPoint(points,1),points[3]);
  assert.deepEqual(cubicPoint(points,.5),[5,3]);
});
test('Data flow is the default and Next step exposes the arithmetic one coordinate at a time',()=>{
  const {element}=mount();createGeometryStudy(element);
  assert.equal(element.querySelector('[data-geometry-view="flow"]').getAttribute('aria-pressed'),'true');
  assert.equal(element.querySelectorAll('.vector-flow-branch').length,3);
  const next=element.querySelector('[data-geometry-next]');
  next.click();assert.match(element.querySelector('[data-geometry-status]').textContent,/Multiply matched entries/);
  next.click();assert.match(element.querySelector('[data-geometry-status]').textContent,/Add those products for q1/);
  next.click();assert.match(element.querySelector('[data-geometry-status]').textContent,/Store q1/);
  next.click();assert.match(element.querySelector('[data-geometry-status]').textContent,/Copy.*row 2/);
  assert.equal(element.querySelector('[data-map="Q"] [data-flow-output-coordinate="0"] text').textContent,'0');
});
test('the Transform toggle keeps the input and matrix while preserving each view’s inspection position',()=>{
  const {element,window}=mount();createGeometryStudy(element);
  element.querySelector('[data-geometry-kind="V"]').click();
  const slider=element.querySelector('[data-geometry-progress]');
  slider.value='.375';slider.dispatchEvent(new window.Event('input'));
  const before=element.querySelector('[data-geometry-status]').textContent;
  element.querySelector('[data-geometry-view="transform"]').click();
  assert.match(element.querySelector('[data-geometry-status]').textContent,/V map, 100%.*\(1, -0.5\)/);
  assert.equal(element.querySelector('[data-transform-control]').hidden,false);
  slider.value='.5';slider.dispatchEvent(new window.Event('input'));
  element.querySelector('[data-geometry-view="flow"]').click();
  assert.equal(element.querySelector('[data-geometry-status]').textContent,before);
  assert.equal(slider.value,'0.375');
  element.querySelector('[data-geometry-view="transform"]').click();
  assert.equal(slider.value,'0.5');
});
test('flow playback ends after Q/K/V, pauses when changing view or inputs and honors reduced motion',()=>{
  const {element,document,window}=mount(),timers=new Map();let next=0,changed;
  const preference={matches:false,addEventListener:(_,fn)=>{changed=fn;},removeEventListener:()=>{}};
  const player=createGeometryStudy(element,{preference,schedule:fn=>{timers.set(++next,fn);return next;},cancel:id=>timers.delete(id)});
  const play=element.querySelector('[data-geometry-play]');play.click();
  for(let frame=0;frame<360;frame++){const [id,fn]=[...timers][0];timers.delete(id);fn();}
  assert.equal(timers.size,0);assert.equal(play.getAttribute('aria-pressed'),'false');
  for(const branch of element.querySelectorAll('.vector-flow-branch'))assert.equal(branch.querySelectorAll('[data-computed=true]').length,2);
  play.click();element.querySelector('[data-geometry-view="transform"]').click();assert.equal(timers.size,0);
  element.querySelector('[data-geometry-view="flow"]').click();play.click();
  const word=element.querySelector('[data-geometry-word]');
  Object.defineProperty(word,'value',{value:'2',configurable:true});word.dispatchEvent(new window.Event('change'));
  assert.equal(timers.size,0);assert.match(element.querySelector('.vector-flow-word').textContent,/chased/);
  play.click();Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new window.Event('visibilitychange'));assert.equal(timers.size,0);
  play.click();preference.matches=true;changed();assert.equal(timers.size,0);
  play.click();assert.equal(timers.size,0);
  assert.match(element.querySelector('[data-geometry-status]').textContent,/produced the vector/);
  preference.matches=false;play.click();player.destroy();assert.equal(timers.size,0);
});
