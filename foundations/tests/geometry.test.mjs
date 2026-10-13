import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {geometryData,GEOMETRY_MAPS,applyMap,interpolateMap,transformedGrid} from '../public/geometry-model.js';
import {geometryStudy} from '../public/geometry-view.js';
import {createGeometryStudy} from '../public/geometry-study.js';
import {sequenceAttention} from '../public/context-model.js';
import {sequenceAttentionExplorer} from '../scripts/context-explorers.mjs';
import {createSequenceAttention} from '../public/context-explorers.js';
const mount=options=>{const {document,window}=parseHTML(geometryStudy(options));return {document,window,element:document.querySelector('[data-geometry-study]')};};

test('the scalar projection merges dog and chased and discards the first-coordinate direction',()=>{
  const data=geometryData({mode:'scalar',progress:{S:1}});
  assert.deepEqual(data.maps.S.points,[[0,0],[1,0],[1,0],[0,0],[0,0]]);
  assert.deepEqual(applyMap(GEOMETRY_MAPS.S,[8,1]),applyMap(GEOMETRY_MAPS.S,[-2,1]));
});
test('each two-dimensional endpoint agrees with the full head and starts independently from X',()=>{
  for(const key of ['dog','cat'])for(const positions of [false,true]){
    const data=geometryData({key,positions,progress:{Q:1,K:1,V:1}}),head=sequenceAttention(key,positions);
    for(const kind of ['Q','K','V']){
      assert.deepEqual(data.maps[kind].points,head[kind]);
      assert.deepEqual(data.maps[kind].basis,[applyMap(GEOMETRY_MAPS[kind],[1,0]),applyMap(GEOMETRY_MAPS[kind],[0,1])]);
    }
  }
  assert.deepEqual(geometryData({mode:'basis',progress:{M:1}}).maps.M.points[2],[1,1.5]);
});
test('the interpolation and carried grid implement the displayed linear map at every sampled progress',()=>{
  for(const t of [0,.24,.5,.76,1]){
    const matrix=interpolateMap(GEOMETRY_MAPS.V,t),x=[.25,1],actual=applyMap(matrix,x),target=applyMap(GEOMETRY_MAPS.V,x);
    actual.forEach((v,r)=>assert.ok(Math.abs(v-((1-t)*x[r]+t*target[r]))<1e-12));
    assert.equal(transformedGrid(matrix).length,10);
  }
  assert.deepEqual(interpolateMap(GEOMETRY_MAPS.Q,0),[[1,0],[0,1]]);
});
test('scrubbing, map selection and basis visibility update the geometric plot while preserving controls',()=>{
  const {element,window}=mount();createGeometryStudy(element);
  element.querySelector('[data-geometry-view="transform"]').click();
  const slider=element.querySelector('[data-geometry-progress]');
  slider.value='1';slider.dispatchEvent(new window.Event('input'));
  assert.match(element.querySelector('[data-geometry-status]').textContent,/Q map, 100%: dog 2 moves from \(0, 1\) to \(0, 1\)/);
  element.querySelector('[data-geometry-kind="V"]').click();element.querySelector('[data-geometry-apply]').click();
  assert.match(element.querySelector('[data-geometry-status]').textContent,/V map, 100%.*\(1, -0.5\)/);
  assert.equal(element.querySelector('[data-geometry-progress]'),slider);
  const basis=element.querySelector('[data-geometry-basis]');basis.checked=false;basis.dispatchEvent(new window.Event('change'));
  assert.equal(element.querySelectorAll('.geometry-basis').length,0);
});
test('scalar and matrix studies show all token occurrences, including shared coordinates',()=>{
  for(const mode of ['scalar','basis','qkv']){
    const {element}=mount({mode,prefix:'test-'+mode});createGeometryStudy(element,{mode,prefix:'test-'+mode});
    element.querySelector('[data-geometry-view="transform"]').click();
    element.querySelector('[data-geometry-apply]').click();
    for(const panel of element.querySelectorAll('.geometry-panel'))assert.equal(panel.querySelectorAll('.geometry-coordinate-list>div').length,5);
    const ids=[...element.querySelectorAll('[id]')].map(n=>n.id);assert.equal(ids.length,new Set(ids).size);
  }
});
test('geometric playback finishes Q, K and V once, can be inspected, and disposes timers',()=>{
  const {element}=mount();const timers=new Map();let next=0,changed;
  const preference={matches:false,addEventListener:(_,fn)=>{changed=fn;},removeEventListener:()=>{}};
  const player=createGeometryStudy(element,{preference,schedule:fn=>{timers.set(++next,fn);return next;},cancel:id=>timers.delete(id)});
  element.querySelector('[data-geometry-view="transform"]').click();
  const play=element.querySelector('[data-geometry-play]');play.click();
  for(let frame=0;frame<150;frame++){const [id,fn]=[...timers][0];timers.delete(id);fn();}
  assert.equal(timers.size,0);assert.equal(play.getAttribute('aria-pressed'),'false');
  assert.equal(element.querySelector('[data-geometry-percent]').textContent,'100%');
  assert.match(element.querySelector('[data-geometry-status]').textContent,/V map, 100%/);
  play.click();element.querySelector('[data-geometry-kind="K"]').click();assert.equal(timers.size,0);
  play.click();preference.matches=true;changed();assert.equal(timers.size,0);
  play.click();assert.equal(timers.size,0);
  preference.matches=false;play.click();player.destroy();assert.equal(timers.size,0);
});
test('hidden pages pause geometric playback and choosing another head row disposes the previous view',()=>{
  const {element,document,window}=mount();const timers=new Map();let next=0;
  createGeometryStudy(element,{schedule:fn=>{timers.set(++next,fn);return next;},cancel:id=>timers.delete(id)});
  element.querySelector('[data-geometry-play]').click();
  Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new window.Event('visibilitychange'));assert.equal(timers.size,0);
  const headDocument=parseHTML(sequenceAttentionExplorer()).document,head=headDocument.querySelector('[data-sequence-attention]');
  head.querySelector('[data-head-positions]').checked=true;createSequenceAttention(head);
  head.querySelector('[data-head-stage="1"]').click();
  const oldPlay=head.querySelector('[data-geometry-play]');oldPlay.click();
  head.querySelector('[data-head-sentence="cat"]').click();
  assert.equal(oldPlay.getAttribute('aria-pressed'),'false');
  head.querySelector('[data-geometry-view="transform"]').click();
  head.querySelector('[data-geometry-kind="Q"]').click();head.querySelector('[data-geometry-apply]').click();
  assert.match(head.querySelector('[data-geometry-status]').textContent,/dog 5 moves from \(1, 1\) to \(1, 1.5\)/);
});
