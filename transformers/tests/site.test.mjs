import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {parseHTML} from 'linkedom';
import {flowSpecs} from '../public/flow.js';
import {createReaderNavigation,createReadingProgress,readingFraction} from '../public/reader.js';
const slugs=['index','rope','attention','experts','multimodal','pretraining','posttraining','lora','memory','precision','thought','speculation'];
const pages=await Promise.all(slugs.map(async slug=>{const {document,window}=parseHTML(await readFile('dist/'+slug+'.html','utf8'));return {slug,document,window};}));
test('all local pages, assets and in-essay links exist',async()=>{
 for(const {document,slug} of pages){
   const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);assert.equal(new Set(ids).size,ids.length);
   for(const element of document.querySelectorAll('a[href],link[href],script[src]')){
     const ref=element.getAttribute('href')??element.getAttribute('src');
     if(ref.startsWith('#'))assert.ok(document.getElementById(ref.slice(1)),slug+' '+ref);
     else if(!/^https?:|^data:/.test(ref))await access('dist/'+ref.split('?')[0]);
   }
   assert.ok(!document.querySelector('.katex-error'));assert.ok(document.querySelector('main').textContent.length>1500);
 }
});
test('chapter navigation stays in one document and legacy subsection links remain usable',()=>{
 for(const {document,slug} of pages){
   const chapterLinks=[...document.querySelectorAll('.contents-rail [data-chapter-link]')];
   assert.equal(chapterLinks.length,12);
   assert.equal(document.querySelectorAll('.reader-chapter').length,12);
   assert.equal(document.querySelectorAll('[data-lab]').length,5);
   assert.ok(document.querySelector('.contents-rail'));
   assert.equal(document.querySelector('.chapter-bar'),null);
   assert.equal(document.querySelectorAll('.mobile-contents [data-chapter-link]').length,12);
   for(const link of chapterLinks){
     assert.ok(link.getAttribute('href').startsWith('#'));
     assert.ok(document.getElementById(link.getAttribute('href').slice(1)));
   }
   for(const link of document.querySelectorAll('a[href]'))assert.ok(!/^(index|memory|experts|precision|speculation|rope|attention|pretraining|posttraining|lora|thought|multimodal)\.html/.test(link.getAttribute('href')));
   assert.equal(document.body.dataset.entryChapter,slug==='index'?'introduction':slug);
   if(slug!=='index'){
     const chapter=document.getElementById(slug);
     for(const heading of chapter.querySelectorAll('h3[id]'))assert.ok(document.getElementById(heading.id.slice(slug.length+1)));
   }
 }
});

test('mathematical statements have chapter numbers and the RoPE proof links to its lemma',()=>{
 const {document}=pages[0];
 for(const statement of document.querySelectorAll('.statement')){
  assert.match(statement.getAttribute('aria-label'),/^(Definition|Lemma|Proposition|Theorem) \d+\.\d+$/);
  assert.ok(statement.id);
 }
 assert.equal(document.getElementById('rope-rotation-lemma').getAttribute('aria-label'),'Lemma 1.1');
 assert.equal(document.getElementById('rope-relative-position').getAttribute('aria-label'),'Proposition 1.2');
 const references=[...document.querySelectorAll('#rope .proof a[href="#rope-rotation-lemma"]')];
 assert.equal(references.length,1);references.forEach(ref=>assert.equal(ref.textContent,'Lemma 1.1'));
 assert.equal(document.querySelector('#rope a[href="#rope-relative-position"]').textContent,'Proposition 1.2');
});

test('renamed subsections retain earlier links and the merged capacity passage stays addressable',()=>{
 const {document}=pages[0];
 for(const [id,title] of [['rope-let-position-determine-the-angle','Position-dependent rotations'],['posttraining-compare-changes-in-relative-support','Direct preference optimization'],['attention-linear-attention-begins-with-the-weighted-sum','Kernel attention']]){
  assert.equal(document.getElementById(id).textContent,title);
  assert.equal(document.querySelector('.contents-rail a[href="#'+id+'"]').querySelector('.contents-title').textContent,title);
 }
 assert.ok(document.getElementById('experts-stored-capacity-is-not-active-arithmetic'));
 assert.ok(document.getElementById('stored-capacity-is-not-active-arithmetic'));
 const local=document.querySelector('#attention [data-extension-study=anchors]');
 assert.equal(local.querySelector('[data-ext-option=pattern]').value,'anchors');
 assert.ok(local.querySelector('[data-att-weight="1"]'));
});

test('reading progress follows scroll position and recalculates after viewport or content size changes',()=>{
 const {document}=parseHTML(pages[0].document.toString()),events={},frames=[];let height=1800,resize;
 Object.defineProperty(document.documentElement,'scrollHeight',{get:()=>height});
 const viewport={scrollY:0,innerHeight:1000,requestAnimationFrame:fn=>frames.push(fn),addEventListener:(name,fn)=>{events[name]=fn;},ResizeObserver:class{constructor(fn){resize=fn;}observe(){}}};
 createReadingProgress(document,viewport);
 const track=document.querySelector('[data-reading-progress]'),bar=document.querySelector('[data-reading-fill]'),label=document.querySelector('[data-reading-percent]');
 assert.equal(track.getAttribute('aria-valuenow'),'0');
 viewport.scrollY=400;events.scroll();events.scroll();assert.equal(frames.length,1);frames.shift()();
 assert.equal(label.textContent,'50%');assert.equal(bar.style.transform,'scaleX(0.5)');
 height=2600;resize();frames.shift()();assert.equal(label.textContent,'25%');
 viewport.innerHeight=1800;events.resize();frames.shift()();assert.equal(label.textContent,'50%');
 viewport.scrollY=900;events.scroll();frames.shift()();assert.equal(label.textContent,'100%');
 assert.equal(readingFraction(-5,1800,1000),0);assert.equal(readingFraction(0,600,1000),0);
 assert.equal(readingFraction(2000,1800,1000),1);
});
test('an earlier article opens at its chapter and navigation follows reading position',()=>{
 const {document}=parseHTML(pages.find(p=>p.slug==='memory').document.toString());
 const sections=[...document.querySelectorAll('.reader-chapter,.reader-ending')],events={},replacements=[];
 let scroll=0;
 sections.forEach((section,i)=>{
   section.getBoundingClientRect=()=>({top:i*1000-scroll});
   section.scrollIntoView=()=>{scroll=i*1000-100;};
   section.querySelectorAll('h3[id]').forEach((heading,j)=>{
     heading.getBoundingClientRect=()=>({top:i*1000+200+j*100-scroll});
   });
 });
 const viewport={innerHeight:800,location:{pathname:'/memory.html',hash:''},
   history:{replaceState(_state,_title,url){replacements.push(url);viewport.location.hash=url;}},
   addEventListener(name,handler){events[name]=handler;},requestAnimationFrame(callback){callback();}};
 createReaderNavigation(document,viewport);
 assert.deepEqual(replacements,['#memory']);
 assert.equal(viewport.location.pathname,'/memory.html');
 assert.equal(document.querySelector('[aria-current=location]').dataset.contentsOwner,'memory');
 assert.equal(document.querySelector('[data-contents-chapter=memory]').open,true);
 scroll=sections.findIndex(s=>s.id==='precision')*1000+100;events.scroll();
 assert.equal(document.querySelector('[aria-current=location]').dataset.contentsOwner,'precision');
 assert.equal(document.querySelector('[data-contents-chapter=precision]').open,true);
 assert.equal(document.querySelector('[data-contents-chapter=memory]').open,false);
 scroll=0;events.scroll();
 assert.equal(document.querySelector('[aria-current=location]').dataset.contentsOwner,'introduction');
});
test('flow endpoints correspond to visible operands and destinations at each operation',()=>{
 for(const {document} of pages)for(const surface of document.querySelectorAll('[data-lab]')){
   const kind=surface.dataset.lab;
   for(let step=0;step<4;step++){
     if(kind==='tiles'&&step===3)continue;
     for(const path of flowSpecs(kind,step)){
       assert.ok(surface.querySelector(path.from),kind+' missing source '+path.from);
       assert.ok(surface.querySelector(path.to),kind+' missing destination '+path.to);
     }
   }
 }
});
test('controls update the numerical example, pause on input, and stop at the final stage',async()=>{
 const {window,document}=parseHTML(await readFile('dist/experts.html','utf8'));
 const preference={matches:false,addEventListener(){}},timers=new Map();let next=0;
 Object.assign(globalThis,{document,matchMedia:()=>preference,localStorage:{getItem(){return null},setItem(){}}});
 window.HTMLElement.prototype.getBoundingClientRect=()=>({width:0,height:0,left:0,top:0});
 const {createLabs}=await import('../public/app.js');
 // Dispose the default initialized surface by testing a fresh DOM with an injected scheduler.
 const fresh=parseHTML(await readFile('dist/experts.html','utf8')).document;
 const controllers=createLabs(fresh,{motion:preference,schedule:fn=>{timers.set(++next,fn);return next;},cancel:id=>timers.delete(id)}),surface=fresh.querySelector('[data-lab=experts]');
 const controller=controllers[[...fresh.querySelectorAll('[data-lab]')].indexOf(surface)];
 surface.querySelector('[data-lab-play]').click();assert.equal(controller.state().playing,true);
 const input=surface.querySelector('[data-option=x2]');input.value='1';input.dispatchEvent(new window.Event('input'));
 assert.equal(timers.size,0);assert.equal(controller.state().playing,false);assert.equal(controller.state().x2,1);
 surface.querySelector('[data-lab-play]').click();
 for(let i=0;i<3;i++){const [id,fn]=timers.entries().next().value;timers.delete(id);fn();}
 assert.equal(controller.state().step,3);assert.equal(controller.state().playing,false);assert.equal(timers.size,0);
 preference.matches=true;surface.querySelector('[data-lab-reset]').click();surface.querySelector('[data-lab-play]').click();assert.equal(controller.state().step,3);assert.equal(timers.size,0);
});
