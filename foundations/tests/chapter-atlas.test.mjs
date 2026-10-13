import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseHTML} from 'linkedom';
import {chapterAtlas} from '../scripts/chapter-atlas.mjs';
import {createChapterAtlas} from '../public/chapter-atlas.js';

function fixture(reduced=false){
  const {document,window}=parseHTML(chapterAtlas('attention')+chapterAtlas('transformer')+'<button data-atlas-focus="transformer" data-atlas-focus-step="2">Follow the bypass</button>');
  window.HTMLElement.prototype.showModal=function(){this.setAttribute('open','');};
  window.HTMLElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new window.Event('close'));};
  const queue=new Map();let id=0;const changes=[];
  const preference={matches:reduced,addEventListener:(_,fn)=>changes.push(fn)};
  const options={preference,schedule:fn=>{queue.set(++id,fn);return id;},cancel:id=>queue.delete(id)};
  const attention=document.querySelector('[data-chapter-atlas=attention]'),transformer=document.querySelector('[data-chapter-atlas=transformer]');
  const a=createChapterAtlas(attention,options),t=createChapterAtlas(transformer,options);
  const tick=()=>{const [id,fn]=[...queue.entries()].at(-1);queue.delete(id);fn();};
  return {document,window,attention,transformer,a,t,queue,tick,preference,changes};
}
test('the two chapter diagrams have separate players, and large views mirror their own inline controls',()=>{
  const f=fixture();assert.equal(f.queue.size,0);
  f.attention.querySelector('[data-atlas-step="3"]').click();
  assert.equal(f.a.state().index,3);assert.equal(f.t.state().index,0);
  assert.equal(f.attention.querySelectorAll('[data-atlas-step="3"][aria-pressed=true]').length,2);
  f.transformer.querySelector('[data-atlas-step="1"]').click();
  for(const canvas of f.transformer.querySelectorAll('.chapter-architecture-canvas')){
    assert.equal(canvas.querySelectorAll('[data-stage-expansion][data-expanded=true]').length,1);
    assert.equal(canvas.querySelector('[data-stage-expansion="1"]').dataset.expanded,'true');
    assert.equal(canvas.querySelector('.transformer-svg').getAttribute('aria-hidden'),'true','the architecture expands into its numerical attention view');
  }
  f.transformer.querySelector('[data-atlas-enlarge]').click();
  assert.equal(f.transformer.querySelector('[data-atlas-dialog]').hasAttribute('open'),true);
  f.transformer.querySelector('[data-atlas-dialog] [data-atlas-step="3"]').click();
  assert.equal(f.t.state().index,3);assert.equal(f.a.state().index,3);
  f.transformer.querySelector('[data-atlas-close]').click();
  assert.equal(f.transformer.querySelector('[data-atlas-dialog]').hasAttribute('open'),false);
});
test('a subsection opens its exact block, and keyboard inspection handles the decoder independently',()=>{
  const f=fixture();
  f.document.querySelector('[data-atlas-focus]').click();
  assert.equal(f.t.state().index,2);
  assert.equal(f.transformer.querySelector('[data-atlas-dialog]').hasAttribute('open'),true);
  for(const canvas of f.transformer.querySelectorAll('.chapter-architecture-canvas')){
    assert.equal(canvas.querySelector('[data-stage-expansion="norm-114-418"]').dataset.expanded,'true');
  }
  const node=f.transformer.querySelector('[data-transformer-node="crossAttention"]');
  const event=new f.window.Event('keydown');event.key='Enter';node.dispatchEvent(event);
  for(const caption of f.transformer.querySelectorAll('[data-atlas-caption]'))assert.match(caption.textContent,/Queries come from the decoder/);
  for(const canvas of f.transformer.querySelectorAll('.chapter-architecture-canvas')){
    assert.equal(canvas.querySelector('[data-stage-expansion="4"]').dataset.expanded,'true');
    assert.equal(canvas.querySelector('[data-transformer-node="crossAttention"]').getAttribute('aria-expanded'),'true');
  }
});
test('the guided tour runs once, cancels on inspection, and respects reduced motion',()=>{
  const f=fixture();
  f.transformer.querySelector('[data-atlas-play]').click();assert.equal(f.queue.size,1);
  f.tick();assert.equal(f.t.state().index,1);
  f.transformer.querySelector('[data-atlas-step="2"]').click();assert.equal(f.queue.size,0);
  f.transformer.querySelector('[data-atlas-reset]').click();f.transformer.querySelector('[data-atlas-play]').click();
  for(let i=0;i<6;i++)f.tick();
  assert.equal(f.t.state().index,5);assert.equal(f.t.state().playing,false);assert.equal(f.queue.size,0);
  f.preference.matches=true;f.transformer.querySelector('[data-atlas-play]').click();assert.equal(f.queue.size,0);
  f.attention.querySelector('[data-atlas-step="1"]').click();assert.equal(f.a.state().index,1);
  f.preference.matches=false;f.attention.querySelector('[data-atlas-play]').click();assert.equal(f.queue.size,2);
  f.preference.matches=true;f.changes.forEach(fn=>fn());assert.equal(f.queue.size,0);
  f.preference.matches=false;f.t.select(7);f.transformer.querySelector('[data-atlas-play]').click();
  f.tick();assert.equal(f.t.state().index,8);
  f.tick();assert.equal(f.t.state().playing,false);assert.equal(f.queue.size,0,'The decoder tour also stops at its final view');
  f.a.destroy();f.t.destroy();
});
test('scrolling tracks the subsection and exposes the matching diagram dock',()=>{
  const {document,window}=parseHTML('<h2 id="attention-to-transformer">6</h2><h3 id="layer-purpose">6.1</h3><h3 id="parallel-heads">6.2</h3><h3 id="residual-connections">6.3</h3><h3 id="processing-features">6.4</h3><h3 id="layer-normalization">6.5</h3><h3 id="repeated-blocks">6.6</h3>'+chapterAtlas('transformer')+'<footer class="essay-footer"></footer>');
  let active=0;const ids=['layer-purpose','parallel-heads','residual-connections','processing-features','layer-normalization','repeated-blocks'];
  window.HTMLElement.prototype.getBoundingClientRect=function(){return {top:this.id==='attention-to-transformer'?-100:this.classList.contains('essay-footer')?1000:ids.indexOf(this.id)<=active?100:500};};
  const root=document.querySelector('[data-chapter-atlas]'),player=createChapterAtlas(root);
  assert.equal(root.querySelector('[data-atlas-dock]').hidden,false);
  active=4;window.dispatchEvent(new window.Event('scroll'));
  assert.equal(player.state().index,4);assert.match(root.querySelector('[data-atlas-dock]').textContent,/Normalize/);
  player.destroy();
});

test('the Transformer dock follows predictions, decoder attention, cross-attention and generation',()=>{
  const anchors=['attention-to-transformer','repeated-blocks','representations-to-predictions','vocabulary-readout','causal-decoder','causal-mask','prefix-dependence','decoder-only','cross-attention','learning-and-generation','autoregressive-factorization','training-targets','generation-loop','token-decoding','conclusion'];
  const {document,window}=parseHTML(anchors.map(id=>`<h3 id="${id}">${id}</h3>`).join('')+chapterAtlas('transformer')+'<footer class="essay-footer"></footer>');
  let reading=anchors.indexOf('repeated-blocks');
  window.HTMLElement.prototype.getBoundingClientRect=function(){return {top:this.classList.contains('essay-footer')?1200:anchors.includes(this.id)?anchors.indexOf(this.id)<=reading?80:600:900};};
  window.HTMLElement.prototype.showModal=function(){this.setAttribute('open','');};
  window.HTMLElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new window.Event('close'));};
  const root=document.querySelector('[data-chapter-atlas]'),player=createChapterAtlas(root);
  const move=anchor=>{reading=anchors.indexOf(anchor);window.dispatchEvent(new window.Event('scroll'));};
  const expanded=key=>{
    for(const canvas of root.querySelectorAll('.chapter-architecture-canvas')){
      const panel=canvas.querySelector(`[data-stage-expansion="${key}"]`);
      assert.equal(panel.dataset.expanded,'true');assert.equal(panel.hasAttribute('inert'),false);
      assert.ok(panel.querySelector('.operation-diagram'),'The popup must retain the computed matrices');
    }
  };
  assert.equal(player.state().index,5);
  move('representations-to-predictions');assert.equal(player.state().index,6);expanded('6');
  assert.match(root.querySelector('[data-atlas-dock]').textContent,/Vocabulary/);
  move('causal-decoder');assert.equal(player.state().index,7);expanded('3');
  root.querySelector('[data-atlas-dock]').click();assert.equal(root.querySelector('[data-atlas-dialog]').hasAttribute('open'),true);
  assert.match(root.querySelector('[data-atlas-caption]').textContent,/available prefix/);
  const mask=root.querySelector('[data-atlas-dialog] [data-stage-expansion="3"]');
  mask.querySelector('[data-stage-next]').click();
  for(const canvas of root.querySelectorAll('.chapter-architecture-canvas'))assert.equal(canvas.querySelector('[data-stage-expansion="3"]').dataset.operation,'1');
  move('cross-attention');assert.equal(player.state().index,8);expanded('4');
  assert.match(root.querySelector('[data-atlas-dock]').textContent,/Cross-attention/);
  assert.equal(root.querySelector('.atlas-reading-link').getAttribute('href'),'#cross-attention');
  move('decoder-only');expanded('3');player.select(8);window.dispatchEvent(new window.Event('scroll'));
  assert.equal(player.state().index,8,'Small scrolls within the same subsection retain manual inspection');
  move('training-targets');assert.equal(player.state().index,7);expanded('3');
  move('generation-loop');assert.equal(player.state().index,6);expanded('6');
  assert.equal(root.querySelector('.atlas-reading-link').getAttribute('href'),'#vocabulary-readout');
  player.destroy();
});
test('chapter tours enter once, suspend offscreen and in a hidden tab, and keep manual choices on re-entry',()=>{
  const previous=globalThis.IntersectionObserver,observers=[];
  globalThis.IntersectionObserver=class{
    constructor(callback){this.callback=callback;observers.push(this);}
    observe(){}disconnect(){}
  };
  let f;
  try{
    f=fixture();assert.equal(f.queue.size,0);
    observers[1].callback([{isIntersecting:true}]);assert.equal(f.queue.size,1);assert.equal(f.t.state().index,0);
    f.tick();assert.equal(f.t.state().index,1);
    observers[1].callback([{isIntersecting:false}]);assert.equal(f.queue.size,0);assert.equal(f.transformer.dataset.atlasRunning,'false');
    observers[1].callback([{isIntersecting:true}]);assert.equal(f.queue.size,2);assert.equal(f.t.state().index,1);
    f.transformer.querySelector('[data-atlas-step="4"]').click();assert.equal(f.queue.size,0);
    observers[1].callback([{isIntersecting:false}]);observers[1].callback([{isIntersecting:true}]);
    assert.equal(f.t.state().index,4);assert.equal(f.queue.size,0);
    f.transformer.querySelector('[data-atlas-play]').click();assert.equal(f.queue.size,2);
    let hidden=true;Object.defineProperty(f.document,'hidden',{get:()=>hidden,configurable:true});
    f.document.dispatchEvent(new f.window.Event('visibilitychange'));assert.equal(f.queue.size,0);
    hidden=false;f.document.dispatchEvent(new f.window.Event('visibilitychange'));assert.equal(f.queue.size,2);
  }finally{f?.a.destroy();f?.t.destroy();globalThis.IntersectionObserver=previous;}
});
test('the published document contains both chapter maps, six transformer subsections, and valid diagram controls',async()=>{
  const {document}=parseHTML(await readFile('dist/index.html','utf8'));
  assert.equal(document.querySelectorAll('[data-chapter-atlas]').length,2);
  const headings=[...document.querySelectorAll('h3')].filter(h=>/^6\./.test(h.textContent));
  assert.equal(headings.length,6);
  for(const node of document.querySelectorAll('[aria-controls]'))assert.ok(document.getElementById(node.getAttribute('aria-controls')),node.outerHTML);
  for(const section of document.querySelectorAll('[data-chapter-atlas]'))assert.equal(section.querySelectorAll('dialog').length,1);
  assert.equal(document.querySelectorAll('[data-atlas-focus=transformer]').length,0);
  assert.equal(document.querySelectorAll('[data-atlas-focus=attention]').length,0);
  assert.equal(document.querySelectorAll('[data-block-study]').length,5);
  const proof=document.querySelector('#p-transformer-block-definition .proof');assert.ok(proof);
  const chapter=document.querySelector('[data-chapter-atlas=transformer]');
  assert.equal(chapter.querySelectorAll('[data-stage-study]').length,22,'Section 6 has the same eleven calculation panels in its inline and large views');
  assert.equal(chapter.querySelectorAll('[data-attention-study]').length,2);
  assert.equal(chapter.querySelectorAll('svg [data-stage-expansion]').length,0,'the legacy formula-only expansion panels are gone');
});

test('the Section 6 dock opens the updated calculation and keeps its inline and large views synchronized',()=>{
  const f=fixture();
  f.t.select(3);
  f.transformer.querySelector('[data-atlas-dock]').click();
  const large=f.transformer.querySelector('[data-atlas-dialog]'),panel=large.querySelector('[data-stage-expansion="2"]');
  assert.equal(panel.dataset.expanded,'true');
  panel.querySelector('[data-stage-next]').click();
  for(const canvas of f.transformer.querySelectorAll('.chapter-architecture-canvas')){
    const feed=canvas.querySelector('[data-stage-expansion="2"]');
    assert.equal(feed.dataset.operation,'1');
    assert.equal(feed.querySelectorAll('[data-operation-packet]').length,9);
    assert.equal(feed.hasAttribute('inert'),false);
  }
  panel.querySelector('[data-stage-back]').click();
  assert.equal(f.t.state().index,0);
  for(const canvas of f.transformer.querySelectorAll('.chapter-architecture-canvas')){
    assert.equal(canvas.querySelector('.transformer-svg').getAttribute('aria-hidden'),'false');
    assert.equal(canvas.querySelectorAll('[data-stage-expansion][data-expanded=true]').length,0);
  }
  f.a.destroy();f.t.destroy();
});

test('Section 6 normalization can be inspected without switching to another block',()=>{
  const f=fixture();f.t.select(2);
  const panel=f.transformer.querySelector('[data-stage-expansion="norm-114-418"]');
  panel.querySelector('[data-stage-operation="3"]').click();
  assert.equal(panel.dataset.expanded,'true');
  assert.equal(panel.dataset.operation,'3');
  assert.match(panel.querySelector('[data-operation-status]').textContent,/variance is 2\/3/);
  panel.querySelector('[data-stage-play]').click();assert.equal(f.queue.size,1);
  f.tick();assert.equal(panel.dataset.operation,'4');assert.equal(f.queue.size,0);
  f.a.destroy();f.t.destroy();
});

test('the Attention dock contains shared numeric matrices, transfers, and the formula for its selected operation',()=>{
  const f=fixture();f.a.select(2);f.attention.querySelector('[data-atlas-dock]').click();
  const panel=f.attention.querySelector('[data-atlas-dialog] [data-attention-study]');
  assert.equal(panel.dataset.expanded,'true');
  assert.ok(panel.querySelector('.matrix-score'));
  assert.equal(panel.querySelectorAll('[data-attention-packet]').length,9);
  panel.querySelector('[data-attention-operation="3"]').click();
  assert.equal(f.a.state().index,4,'manual numerical inspection updates the chapter caption too');
  for(const p of f.attention.querySelectorAll('[data-attention-study]')){
    assert.equal(p.dataset.operation,'3');
    assert.equal(p.querySelectorAll('[data-attention-packet]').length,9);
    assert.match(p.querySelector('[data-attention-equation="3"] annotation').textContent,/H=AV/);
    assert.equal(p.querySelector('[data-attention-equation="3"]').hidden,false);
  }
  assert.equal(f.attention.querySelectorAll('.atlas-attention-svg').length,0,'the formula-only schematic is no longer the popup view');
  f.a.destroy();f.t.destroy();
});

test('released assets and nested module imports use the same version so popup code cannot remain on an older release',async()=>{
  const {document}=parseHTML(await readFile('dist/index.html','utf8'));
  const script=document.querySelector('script[src^="app.js"]'),version=new URL(script.getAttribute('src'),'https://example.test').searchParams.get('v');
  assert.match(version,/^[a-f0-9]{12}$/);
  for(const link of document.querySelectorAll('link[rel=stylesheet]')){
    const url=new URL(link.getAttribute('href'),'https://example.test');
    if(url.origin==='https://example.test')assert.equal(url.searchParams.get('v'),version);
  }
  const code=await readFile('dist/app.js','utf8');
  for(const [,path] of code.matchAll(/from ['"](\.\/[^'"]+)['"]/g))assert.equal(new URL(path,'https://example.test').searchParams.get('v'),version);
});
