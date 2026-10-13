import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {parseHTML} from 'linkedom';

const html=await readFile('dist/index.html','utf8');
const {window,document}=parseHTML(html);
const storage=new Map();
const animationTimers=new Map();let nextTimer=0;
window.HTMLElement.prototype.getBoundingClientRect=function(){return {top:400,width:700};};
window.HTMLElement.prototype.scrollIntoView=function(){};
window.HTMLElement.prototype.showModal=function(){this.setAttribute('open','');};
window.HTMLElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new window.Event('close'));};
Object.assign(globalThis,{
  document,innerHeight:900,scrollY:0,
  matchMedia:()=>({matches:false}),
  addEventListener:()=>{},
  localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
  setTimeout:fn=>{animationTimers.set(++nextTimer,fn);return nextTimer;},
  clearTimeout:id=>animationTimers.delete(id),
});
await import('../public/app.js');
const click=selector=>document.querySelector(selector).click();
const openingCanvases=()=>document.querySelectorAll('.essay-header .architecture-canvas,#architecture-dialog .architecture-canvas');
const openingPanels=()=>document.querySelectorAll('.essay-header [data-attention-study],#architecture-dialog [data-attention-study]');

test('every contents and navigation link has a real target',()=>{
  for(const link of document.querySelectorAll('a[href^="#"]'))assert.ok(document.getElementById(link.getAttribute('href').slice(1)),link.outerHTML);
  const ids=[...document.querySelectorAll('[id]')].map(el=>el.id);
  assert.equal(new Set(ids).size,ids.length,'IDs must be unique');
  assert.equal(document.querySelectorAll('.feedback-item').length,0);
  for(const nav of document.querySelectorAll('nav[aria-label="Contents"],nav[aria-label="Mobile contents"]')){
    for(const link of nav.querySelectorAll('a[href]')){
      const target=document.getElementById(link.getAttribute('href').slice(1));
      assert.equal(link.textContent.replace(/\s+/g,' ').trim(),target.textContent.replace(/\s+/g,' ').trim(),'Contents must use the full section title');
    }
  }
});

test('contents chapters collapse independently and open the selected chapter in both menus',()=>{
  const desktop=document.querySelector('nav[aria-label="Contents"]');
  const chapters=[...desktop.querySelectorAll('[data-contents-chapter]')];
  assert.equal(chapters.length,9);
  for(const chapter of chapters){assert.ok(chapter.querySelector('summary a'));assert.ok(chapter.querySelector('.contents-subsections'));}
  desktop.querySelector('a[href="#comparison-vectors"]').click();
  for(const menu of document.querySelectorAll('nav[aria-label="Contents"],nav[aria-label="Mobile contents"]')){
    assert.equal(menu.querySelectorAll('[data-contents-chapter]').length,9);
    for(const chapter of menu.querySelectorAll('[data-contents-chapter]'))assert.equal(chapter.open,chapter.dataset.contentsChapter==='4');
  }
  desktop.querySelector('a[href="#attention-computation"]').click();
  assert.equal(desktop.querySelector('[data-contents-chapter="4"]').open,false);
  assert.equal(desktop.querySelector('[data-contents-chapter="5"]').open,true);
});

test('grammar comparison keeps event roles separate from subject and object',()=>{
  const explorer=document.querySelector('[data-grammar-explorer]');
  click('[data-grammar-mode="syntax"]');
  const segments=()=>[...explorer.querySelectorAll('.grammar-segment')].map(s=>({words:s.querySelector('.grammar-words').textContent,label:s.querySelector('.grammar-label').textContent}));
  assert.deepEqual(segments().find(s=>s.label==='Subject'),{words:'The dog',label:'Subject'});
  click('[data-grammar-example="passive"]');
  assert.deepEqual(segments().find(s=>s.label==='Subject'),{words:'The cat',label:'Subject'});
  assert.equal(segments().some(s=>s.label==='Direct object'),false);
  assert.equal(explorer.querySelector('[data-grammar-event]').textContent,'Dog chases cat.');
  click('[data-grammar-mode="event"]');
  assert.equal(segments().find(s=>s.label.startsWith('Agent')).words,'by the dog');
  assert.equal(segments().find(s=>s.label==='Affected participant').words,'The cat');
  click('[data-grammar-mode="classes"]');
  assert.deepEqual(segments().filter(s=>s.label==='Noun').map(s=>s.words),['cat','dog']);
  assert.equal(explorer.querySelector('[data-grammar-sentence]').textContent,'The cat was chased by the dog.');
  click('[data-grammar-example="reversed"]');
  assert.equal(explorer.querySelector('[data-grammar-event]').textContent,'Cat chases dog.');
  assert.equal(explorer.querySelectorAll('[data-grammar-mode][aria-pressed="true"]').length,1);
  assert.equal(explorer.querySelectorAll('[data-grammar-example][aria-pressed="true"]').length,1);
  click('[data-grammar-example="active"]');
});

test('representation controls recompute both sums and reveal an embedding collision',()=>{
  const explorer=document.querySelector('[data-representation-explorer]');
  const setCoordinate=(coordinate,value)=>{
    const slider=explorer.querySelector('[data-dog-coordinate="'+coordinate+'"]');
    slider.value=String(value);slider.dispatchEvent(new window.Event('input'));
    assert.equal(slider.getAttribute('aria-valuetext'),String(value));
    assert.equal(explorer.querySelector('[data-dog-output="'+coordinate+'"]').textContent,String(value));
  };
  assert.equal(explorer.querySelector('[data-left-sum]').textContent,'(2, 2)');
  setCoordinate(0,-1);setCoordinate(1,0);
  assert.equal(explorer.querySelector('[data-left-sum]').textContent,'(1, 1)');
  assert.equal(explorer.querySelector('[data-left-sum]').textContent,explorer.querySelector('[data-right-sum]').textContent);
  assert.match(explorer.querySelector('.representation-verdict').textContent,/matrices also coincide/);
  click('[data-representation-comparison="scrambled"]');
  assert.match(explorer.querySelectorAll('.representation-matrix caption')[1].textContent,/Cat the chased dog the/);
  assert.match(explorer.querySelector('.representation-verdict').textContent,/matrices differ/);
  assert.equal(explorer.querySelector('[data-left-sum]').textContent,explorer.querySelector('[data-right-sum]').textContent);
  assert.equal(explorer.querySelectorAll('[data-representation-comparison][aria-pressed="true"]').length,1);
  assert.equal(document.getElementById('sentence-reading').textContent,'The dog chased the cat.');
});
test('all initial local assets exist',async()=>{
  for(const element of document.querySelectorAll('img[src],script[src],link[rel="stylesheet"]')){
    const url=element.getAttribute('src')||element.getAttribute('href');
    if(!url.startsWith('https:'))await access(`dist/${url.split('?')[0]}`);
  }
});
test('architecture selection works with pointer and keyboard and synchronizes enlarged view',()=>{
  const node=document.querySelector('[data-transformer-node="crossAttention"]');
  node.dispatchEvent(new window.Event('click'));
  assert.equal(node.getAttribute('aria-pressed'),'true');
  for(const detail of document.querySelectorAll('[data-architecture-detail]')) {
    assert.equal(detail.querySelector('strong').textContent,'Encoder–decoder attention');
    assert.match(detail.querySelector('p').textContent,/Queries come from the decoder; keys and values come from the encoder/);
  }
  const keyboard=new window.Event('keydown');keyboard.key='Enter';
  document.querySelector('[data-transformer-node="maskedAttention"]').dispatchEvent(keyboard);
  assert.equal(node.getAttribute('aria-pressed'),'false');
  assert.match(document.querySelector('[data-architecture-detail] p').textContent,/causal mask/);
  click('#diagram-enlarge');
  assert.equal(document.getElementById('architecture-dialog').hasAttribute('open'),true);
  click('#diagram-close');
  assert.equal(document.getElementById('architecture-dialog').hasAttribute('open'),false);
  assert.equal(document.getElementById('sentence-reading').textContent,'The dog chased the cat.');
});

test('section hierarchy and observation have mathematical numbering',()=>{
  assert.equal(document.getElementById('meaning-and-structure').textContent,'1. Meaning and structure');
  assert.equal(document.getElementById('same-words').textContent,'1.1 Grammatical roles');
  assert.equal(document.getElementById('human-grammar').textContent,'1.2 Grammar as we understand it');
  assert.match(document.getElementById('word-order').textContent,/^1\.3 /);
  assert.match(document.getElementById('semantics-and-context').textContent,/^1\.4 /);
  assert.equal(document.querySelector('.observation .aside-label').textContent,'Observation 1.1');
  assert.match(document.getElementById('semantics-and-context').nextElementSibling.textContent,/Semantics/);
});

test('diagram equations render from LaTeX with fractions, roots, and accessible MathML',()=>{
  const formulas=[...document.querySelectorAll('.architecture-inset .diagram-math .katex-mathml annotation')].map(annotation=>annotation.textContent);
  assert.equal(formulas.length,8);
  assert.ok(formulas.filter(formula=>formula.includes('\\frac{QK')&&formula.includes('\\sqrt{d_k}')).length===4);
  assert.ok(formulas.filter(formula=>formula.includes('\\mathrm{head}_h')).length===4);
  assert.equal(document.querySelector('h1').textContent,'Understanding attention and transformers');
});

test('each active stage unfolds its operations and inspection pins the corresponding normalization block',()=>{
  const slider=document.querySelector('[data-flow-scrubber]');
  for(let index=0;index<7;index++){
    slider.value=String(index);slider.dispatchEvent(new window.Event('input'));
    for(const canvas of openingCanvases()){
      const expanded=[...canvas.querySelectorAll('[data-stage-expansion][data-expanded=true]')];
      assert.equal(expanded.length,1);
      assert.equal(expanded[0].dataset.stageExpansion,String(index));
      assert.equal(expanded[0].getAttribute('aria-hidden'),'false');
      if(index===1){
        assert.equal(expanded[0].querySelectorAll('[data-attention-operation]').length,5);
        assert.equal(expanded[0].hasAttribute('inert'),false);
      }else assert.ok(expanded[0].querySelectorAll('li').length>=3);
      assert.ok(expanded[0].querySelector('.katex-mathml annotation'));
      for(const closed of canvas.querySelectorAll('[data-stage-expansion][data-expanded=false]'))assert.equal(closed.getAttribute('aria-hidden'),'true');
    }
  }
  document.querySelector('[data-transformer-node="addNorm"]').dispatchEvent(new window.Event('click'));
  assert.equal(animationTimers.size,0);
  const normalization=document.querySelector('[data-stage-expansion][data-expanded=true]');
  assert.match(normalization.dataset.stageExpansion,/^norm-/);
  assert.match(normalization.textContent,/normalization/i);
  const node=document.querySelector('[data-transformer-node="addNorm"]');
  assert.equal(node.getAttribute('aria-expanded'),'true');
  assert.equal(document.getElementById(node.getAttribute('aria-controls')),normalization);
  normalization.querySelector('[data-stage-operation="3"]').click();
  assert.equal(normalization.dataset.expanded,'true','inspecting normalization must keep its own panel open');
  assert.equal(normalization.dataset.operation,'3');
  click('[data-flow-next]');
  assert.equal(normalization.dataset.expanded,'false');
});

test('animation controls synchronize both diagrams and pause when inspecting a stage',()=>{
  click('[data-flow-restart]');click('[data-flow-toggle]');
  assert.equal(animationTimers.size,2,'architecture tour and the current numerical walkthrough each have one timer');
  click('[data-flow-next]');assert.equal(animationTimers.size,0);
  assert.equal(document.querySelector('[data-flow-position]').textContent,'2 / 7');
  const slider=document.querySelector('[data-flow-scrubber]');slider.value='4';slider.dispatchEvent(new window.Event('input'));
  for(const svg of document.querySelectorAll('.essay-header .transformer-svg,#architecture-dialog .transformer-svg')){assert.equal(svg.dataset.step,'4');assert.equal(svg.dataset.motion,'paused');}
  assert.equal(document.querySelector('[data-chapter-atlas="transformer"]').dataset.atlasStep,'0','the opening player must not move the chapter diagrams');
  assert.equal(document.querySelector('[data-flow-scrubber]').getAttribute('aria-valuetext'),'Encoder–decoder attention');
  const activePaths=[...document.querySelectorAll('.essay-header [data-flow-phase][data-active=true],#architecture-dialog [data-flow-phase][data-active=true]')];
  assert.equal(activePaths.length,2);
  assert.ok(activePaths.every(group=>group.dataset.flowPhase==='4'));
  click('[data-flow-toggle]');assert.equal(animationTimers.size,2);
  document.querySelector('[data-transformer-node="output"]').dispatchEvent(new window.Event('click'));
  assert.equal(animationTimers.size,0);
  assert.equal(document.querySelector('[data-flow-toggle]').textContent,'Play');
});

test('attention inspection preserves a chosen operation, synchronizes positions, and returns to the architecture',()=>{
  const node=document.querySelector('[data-transformer-node="selfAttention"]');
  const keyboard=new window.Event('keydown');keyboard.key='Enter';node.dispatchEvent(keyboard);
  assert.equal(animationTimers.size,0);
  for(const canvas of openingCanvases()){
    assert.equal(canvas.dataset.attentionOpen,'true');
    assert.equal(canvas.querySelector('.transformer-svg').getAttribute('aria-hidden'),'true');
  }
  click('[data-attention-operation="3"]');click('[data-attention-row="2"]');
  for(const panel of openingPanels()){
    assert.equal(panel.dataset.operation,'3');
    assert.equal(panel.querySelector('[data-attention-operation="3"]').getAttribute('aria-pressed'),'true');
    assert.equal(panel.querySelector('[data-attention-row="2"]').getAttribute('aria-pressed'),'true');
    assert.match(panel.querySelector('[data-attention-equation="3"] annotation').textContent,/H=AV/);
  }
  click('[data-attention-back]');
  for(const panel of openingPanels()){
    assert.equal(panel.getAttribute('aria-hidden'),'true');assert.equal(panel.hasAttribute('inert'),true);
  }
  for(const canvas of openingCanvases()){
    assert.equal(canvas.dataset.attentionOpen,'false');
    assert.equal(canvas.querySelector('.transformer-svg').getAttribute('aria-hidden'),'false');
    assert.equal(canvas.querySelector('[data-transformer-node="selfAttention"]').getAttribute('tabindex'),'0');
  }
  assert.equal(animationTimers.size,0);
});

test('word controls exchange roles and keep the counts visible and accurate',()=>{
  click('[data-preset="dog"]');
  click('[data-word-index="1"]');
  assert.equal(document.querySelector('[data-word-index="1"]').getAttribute('aria-pressed'),'true');
  click('[data-word-index="4"]');
  assert.equal(document.getElementById('sentence-reading').textContent,'The cat chased the dog.');
  assert.match(document.getElementById('order-detail').textContent,/cat performs/);
  click('#counts-toggle');
  assert.equal(document.getElementById('word-counts').hidden,false);
  assert.deepEqual([...document.querySelectorAll('#count-list dd')].map(el=>el.textContent),['2','1','1','1']);
  click('[data-preset="scrambled"]');
  assert.equal(document.getElementById('sentence-reading').textContent,'Cat the chased dog the.');
  assert.deepEqual([...document.querySelectorAll('#count-list dd')].map(el=>el.textContent),['2','1','1','1']);
  click('#counts-toggle');
  assert.equal(document.getElementById('word-counts').hidden,true);
});
test('theme choice persists and commenting is absent',()=>{
  click('#theme-toggle');
  assert.equal(document.documentElement.dataset.theme,'dark');
  assert.equal(storage.get('language-notes-theme'),'dark');
  assert.equal(document.querySelector('#review-toggle,#review-panel,#hypothesis-loader'),null);
  assert.doesNotMatch(html,/hypothes\.is|Original draft & comments/);
});
