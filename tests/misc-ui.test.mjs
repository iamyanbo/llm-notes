import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../foundations/package.json',import.meta.url));
const {parseHTML}=require('linkedom');
import {createOpeningStudy} from '../miscellaneous/opening-controller.js';
import {createCollectionUI} from '../miscellaneous/collection.js';
import {createLab} from '../miscellaneous/labs.js';
import {LAB_SPECS} from '../miscellaneous/lab-models.js';
import {TOPICS,TOUR_DURATION,tourFrame} from '../miscellaneous/opening-model.js';
const source=await readFile(new URL('../dist/miscellaneous/index.html',import.meta.url),'utf8');
function fixture({reduced=false,html=source}={}){
  const {document,window}=parseHTML(html),frames=new Map(),timers=new Map(),events={},preferences=new Map();
  let next=0,observer,hidden=false;
  Object.defineProperty(document,'visibilityState',{get:()=>hidden?'hidden':'visible',configurable:true});
  Object.defineProperty(document.documentElement,'scrollHeight',{value:2000,configurable:true});
  const viewport={location:{hash:''},innerHeight:800,scrollY:0,localStorage:{getItem:()=>null,setItem:()=>{}},
    requestAnimationFrame(fn){const id=++next;frames.set(id,fn);return id;},cancelAnimationFrame(id){frames.delete(id);},
    setTimeout(fn){const id=++next;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);},
    addEventListener(name,fn){(events[name]??=[]).push(fn);},
    matchMedia(query){if(!preferences.has(query))preferences.set(query,{matches:query.includes('reduced')?reduced:false,addEventListener(){}});return preferences.get(query);},
    IntersectionObserver:class{constructor(callback){observer=callback;}observe(){}}
  };
  const create=document.createElement.bind(document);
  document.createElement=name=>{
    const element=create(name);element.focus=()=>{};
    if(name==='dialog'){element.showModal=function(){this.open=true;};element.close=function(){this.open=false;this.dispatchEvent(new window.Event('close'));};}
    return element;
  };
  for(const element of document.querySelectorAll('*')){
    element.getBoundingClientRect=()=>({top:element.id==='introduction'?100:1000});element.focus=()=>{};element.scrollIntoView=()=>{};
  }
  const click=selector=>document.querySelector(selector).dispatchEvent(new window.Event('click',{bubbles:true}));
  const pump=now=>{const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(now));};
  return {document,window,viewport,frames,timers,events,click,pump,
    setVisible(value){hidden=!value;document.dispatchEvent(new window.Event('visibilitychange'));},
    intersect(value){observer([{isIntersecting:value}]);}};
}
test('opening tour finishes, keeps enlarged state shared, and suspends without hidden-time jumps',()=>{
  assert.deepEqual(tourFrame(TOUR_DURATION),{index:5,phase:1,finished:true});
  const f=fixture(),study=createOpeningStudy(f.document,f.viewport);
  f.intersect(true);
  for(let now=0;now<TOUR_DURATION+100;now+=20)f.pump(now);
  assert.equal(study.state().playing,false);assert.equal(study.state().index,5);assert.equal(f.frames.size,0);
  study.select(4);assert.equal(f.document.querySelector('[data-opening-question]').textContent,TOPICS[4].question);
  f.click('[data-opening-enlarge]');assert.equal(f.document.querySelector('dialog').open,true);
  f.click('dialog [data-opening-next]');assert.equal(study.state().index,5);
  assert.equal(f.document.querySelector('[data-opening-position]').value,'5');
  f.click('[data-opening-close]');study.play();f.pump(20000);f.pump(20100);
  const before=study.state().elapsed;f.setVisible(false);assert.equal(f.frames.size,0);f.setVisible(true);f.pump(50000);
  assert.equal(study.state().elapsed,before);
  f.intersect(false);assert.equal(f.frames.size,0);f.intersect(true);assert.equal(f.frames.size,1);study.pause();
  const ids=[...f.document.querySelectorAll('[id]')].map(node=>node.id);assert.equal(new Set(ids).size,ids.length);
});
test('reduced motion exposes the completed tour without a running timer',()=>{
  const f=fixture({reduced:true}),study=createOpeningStudy(f.document,f.viewport);f.intersect(true);
  assert.equal(f.frames.size,0);f.click('[data-opening-play]');assert.equal(study.state().index,5);assert.equal(f.frames.size,0);
  f.click('[data-opening-next]');assert.equal(study.state().index,0);
});

test('theme, progress, preserved deep links, and 22 contents entries work with the completed articles',()=>{
  const f=fixture(),ui=createCollectionUI(f.document,f.viewport);
  f.click('#theme-toggle');assert.equal(f.document.documentElement.dataset.theme,'dark');
  f.viewport.scrollY=1200;ui.update();assert.equal(f.document.getElementById('reading-percent').textContent,'100%');
  f.viewport.location.hash='#context-compaction';f.events.hashchange[0]();assert.equal(f.document.getElementById('context-compaction').tagName,'ARTICLE');
  f.viewport.location.hash='#%ZZ';assert.doesNotThrow(f.events.hashchange[0]);
  assert.equal(f.document.querySelectorAll('.contents-rail .toc-subsection').length,22);
});
test('each worked example can finish, pause, restart, and share an enlarged view',()=>{
  for(const [kind,spec] of Object.entries(LAB_SPECS)){
    const f=fixture({html:'<!doctype html><html><body><div class="essay-lab" data-lab="'+kind+'" aria-label="'+kind+'"><h5>'+kind+'</h5><div data-lab-content></div></div></body></html>'});
    const element=f.document.querySelector('[data-lab]'),lab=createLab(element,{root:f.document,viewport:f.viewport});
    f.click('[data-lab-restart]');assert.equal(lab.state().step,0,kind);
    f.click('[data-lab-play]');f.pump(0);
    for(let now=750;now<=750*(lab.limit()+1);now+=750)f.pump(now);
    assert.equal(lab.state().step,lab.limit(),kind);assert.equal(lab.state().playing,false,kind);assert.equal(f.frames.size,0,kind);
    f.click('[data-lab-enlarge]');assert.equal(f.document.querySelector('dialog').open,true,kind);
    f.click('dialog [data-lab-restart]');assert.equal(lab.state().step,0,kind);
    f.click('dialog [data-lab-next]');assert.equal(lab.state().step,1,kind);
    assert.equal(f.document.querySelector('[data-lab-status]').textContent,f.document.querySelector('dialog [data-lab-status]').textContent,kind);
    if(spec.label){
      const slider=f.document.querySelector('dialog [data-lab-amount]');slider.value=String(spec.max);slider.dispatchEvent(new f.window.Event('input'));
      assert.equal(lab.state().amount,spec.max,kind);assert.equal(element.querySelector('[data-lab-amount]').value,String(spec.max),kind);
    }
    if(spec.choice){
      const select=f.document.querySelector('dialog [data-lab-choice]');
      for(const option of select.options)option.selected=Number(option.value)===spec.choice.length-1;
      select.dispatchEvent(new f.window.Event('change'));
      assert.equal(lab.state().choice,spec.choice.length-1,kind);
    }
    f.click('dialog [data-lab-close]');assert.equal(lab.state().playing,false,kind);
    lab.play();f.pump(100000);const before=lab.state().step;
    f.setVisible(false);assert.equal(f.frames.size,0,kind);f.setVisible(true);f.pump(200000);assert.equal(lab.state().step,before,kind);
    f.intersect(false);assert.equal(f.frames.size,0,kind);f.intersect(true);lab.pause();assert.equal(f.frames.size,0,kind);
  }
});
test('worked examples with reduced motion expose their end state without playing',()=>{
  const f=fixture({reduced:true,html:'<!doctype html><html><body><div class="essay-lab" data-lab="gpu-inside"><h5>GPU</h5><div data-lab-content></div></div></body></html>'});
  const lab=createLab(f.document.querySelector('[data-lab]'),{root:f.document,viewport:f.viewport});lab.play();
  assert.equal(lab.state().step,lab.limit());assert.equal(lab.state().playing,false);assert.equal(f.frames.size,0);
});
