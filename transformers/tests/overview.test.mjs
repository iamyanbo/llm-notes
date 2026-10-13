import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseHTML} from 'linkedom';
import {OVERVIEW_PARTS,OVERVIEW_TOPICS} from '../public/overview-model.js';
import {overviewHero,overviewCanvas} from '../public/overview-view.js';
import {createOverview} from '../public/overview-controller.js';

function fixture({reduced=false}={}){
  const {document,window}=parseHTML('<html><body>'+overviewHero()+'</body></html>');
  let timerId=0,observed,preferenceChanged;
  const timers=new Map();
  const motion={matches:reduced,addEventListener(_name,callback){preferenceChanged=callback;},removeEventListener(){}};
  class Observer{constructor(callback){observed=callback;}observe(){}disconnect(){}}
  const controller=createOverview(document,{motion,Observer,schedule:fn=>{timers.set(++timerId,fn);return timerId;},cancel:id=>timers.delete(id)});
  const click=selector=>document.querySelector(selector).dispatchEvent(new window.Event('click',{bubbles:true,cancelable:true}));
  const tick=()=>{assert.equal(timers.size,1);const [id,fn]=timers.entries().next().value;timers.delete(id);fn();};
  return {document,window,motion,controller,timers,click,tick,offscreen:()=>observed([{isIntersecting:false}]),onscreen:()=>observed([{isIntersecting:true}]),changeMotion:()=>preferenceChanged()};
}

test('the map covers all eleven chapters, preserving their parts and real destinations',async()=>{
  const {document}=parseHTML(await readFile(new URL('../dist/index.html',import.meta.url),'utf8'));
  const surface=document.querySelector('[data-overview]');assert.ok(surface);
  assert.deepEqual(OVERVIEW_PARTS.map(p=>p.id),['architecture','learning','generation']);
  assert.deepEqual(OVERVIEW_PARTS.map(p=>OVERVIEW_TOPICS.filter(t=>t.part===p.id).length),[4,3,4]);
  assert.equal(surface.querySelectorAll('button[data-overview-select]').length,11);
  assert.equal(surface.querySelector('[data-overview-canvas]').querySelectorAll('.map-hotspot').length,1);
  assert.equal(surface.querySelector('[data-overview-canvas]').querySelectorAll('.map-hotspot[data-active=true]').length,1);
  const ids=[...surface.querySelectorAll('[id]')].map(el=>el.id);assert.equal(new Set(ids).size,ids.length);
  for(const topic of OVERVIEW_TOPICS){
    assert.ok(document.getElementById(topic.id));
    assert.ok(surface.querySelector(`button[data-overview-select="${topic.id}"]`));
    assert.equal(surface.querySelector(`button[data-overview-select="${topic.id}"]`).closest('.overview-part').querySelector('h3').id,'overview-'+topic.part);
  }
  assert.match(surface.textContent,/Schematic overview/);
  assert.equal(document.querySelector('[data-hero-view]'),null);
});

test('the enlarged map shares topic and playback state, and its motion paths have distinct IDs',()=>{
  const f=fixture();f.controller.select('memory');f.click('[data-overview-enlarge]');
  const dialog=f.document.querySelector('[data-overview-dialog]');assert.ok(dialog.hasAttribute('open'));
  f.click('[data-overview-dialog] [data-overview-restart]');
  for(let i=0;i<6;i++)f.click('[data-overview-dialog] [data-overview-next]');
  for(const canvas of f.document.querySelectorAll('[data-overview-canvas],[data-overview-expanded]')){
    assert.equal(canvas.querySelector('.map-hotspot[data-active=true]').dataset.topic,'lora');
  }
  f.click('[data-overview-dialog] [data-overview-play]');
  assert.equal(f.controller.state().playing,true);
  const refs=[...f.document.querySelectorAll('mpath')].map(el=>el.getAttribute('href'));
  assert.deepEqual(refs,['#map-path-adapter','#expanded-map-path-adapter']);
  f.click('[data-overview-close]');assert.ok(!dialog.hasAttribute('open'));
  assert.equal(f.timers.size,0);assert.equal(f.controller.state().topic,'lora');
});

test('opening a chapter from the enlarged view closes it without returning focus to the page top',()=>{
  const f=fixture(),dialog=f.document.querySelector('[data-overview-dialog]');
  let returned=0;
  f.document.querySelector('[data-overview-enlarge]').focus=()=>returned++;
  dialog.showModal=()=>dialog.setAttribute('open','');
  dialog.close=()=>{dialog.removeAttribute('open');dialog.dispatchEvent(new f.window.Event('close'));};
  f.click('[data-overview-enlarge]');f.controller.select('thought');
  f.click('[data-overview-dialog] [data-overview-read]');
  assert.equal(dialog.hasAttribute('open'),false);assert.equal(returned,0);
  assert.equal(dialog.querySelector('[data-overview-read]').getAttribute('href'),'#thought');
  f.click('[data-overview-enlarge]');f.click('[data-overview-close]');assert.equal(returned,1);
});

test('each selected method has one highlight, the matching caption, and an existing animation path',()=>{
  for(const topic of OVERVIEW_TOPICS){
    const {document}=parseHTML(overviewCanvas(topic.id,{running:true}));
    const active=document.querySelectorAll('.map-hotspot[data-active=true]');
    assert.equal(active.length,1);assert.equal(active[0].dataset.topic,topic.id);
    const ids=[...document.querySelectorAll('[id]')].map(el=>el.id);
    assert.equal(new Set(ids).size,ids.length);
    for(const path of document.querySelectorAll('mpath'))assert.ok(document.getElementById(path.getAttribute('href').slice(1)));
    for(const element of document.querySelectorAll('[marker-end]'))assert.ok(document.getElementById(element.getAttribute('marker-end').slice(5,-1)));
  }
  const {document}=parseHTML(overviewCanvas('posttraining',{running:true}));
  assert.equal(document.querySelector('mpath').getAttribute('href'),'#map-path-preference-gradient');
  assert.equal(parseHTML(overviewCanvas('lora',{running:true})).document.querySelector('mpath').getAttribute('href'),'#map-path-adapter');
  assert.throws(()=>overviewCanvas('unknown'),RangeError);
});

test('the tour visits all topics once, lets the final motion finish, and stops with no timer',()=>{
  const f=fixture();f.click('[data-overview-play]');
  assert.equal(f.controller.state().playing,true);assert.ok(f.document.querySelector('mpath'));
  for(let i=1;i<OVERVIEW_TOPICS.length;i++){f.tick();assert.equal(f.controller.state().topic,OVERVIEW_TOPICS[i].id);assert.equal(f.controller.state().playing,true);}
  f.tick();assert.equal(f.controller.state().playing,false);assert.equal(f.timers.size,0);
  assert.equal(f.document.querySelector('mpath'),null);
  assert.equal(f.document.querySelector('[data-overview-play]').textContent,'Replay the tour');
  f.click('[data-overview-play]');assert.equal(f.controller.state().topic,'rope');assert.equal(f.timers.size,1);
  f.controller.dispose();assert.equal(f.timers.size,0);
});

test('manual inspection cancels playback, preserves topic controls, and updates the chapter link',()=>{
  const f=fixture();const button=f.document.querySelector('button[data-overview-select=lora]');
  f.click('[data-overview-play]');button.click();
  assert.equal(f.timers.size,0);assert.equal(f.controller.state().topic,'lora');
  assert.equal(f.controller.state().playing,false);assert.equal(button.getAttribute('aria-pressed'),'true');
  assert.equal(f.document.querySelector('button[data-overview-select=lora]'),button);
  assert.equal(f.document.querySelector('[data-overview-read]').getAttribute('href'),'#lora');
  assert.match(f.document.querySelector('[data-overview-description]').textContent,/base matrix fixed/);
  f.click('button[data-overview-select=thought]');assert.equal(f.controller.state().topic,'thought');
  f.click('[data-overview-next]');assert.equal(f.controller.state().topic,'speculation');
  f.click('[data-overview-restart]');assert.equal(f.controller.state().topic,'rope');
});

test('hidden or offscreen views pause; reduced motion leaves every topic available without motion',()=>{
  const f=fixture();f.click('[data-overview-play]');f.offscreen();
  assert.equal(f.timers.size,0);assert.equal(f.controller.state().playing,false);
  f.onscreen();assert.equal(f.controller.state().playing,false);
  f.click('[data-overview-play]');Object.defineProperty(f.document,'hidden',{value:true,configurable:true});
  f.document.dispatchEvent(new f.window.Event('visibilitychange'));
  assert.equal(f.timers.size,0);assert.equal(f.document.querySelector('mpath'),null);
  Object.defineProperty(f.document,'hidden',{value:false});f.click('[data-overview-play]');
  f.motion.matches=true;f.changeMotion();assert.equal(f.timers.size,0);
  const reduced=fixture({reduced:true});
  for(const topic of OVERVIEW_TOPICS){reduced.controller.select(topic.id);assert.equal(reduced.document.querySelector('mpath'),null);}
  reduced.click('[data-overview-play]');assert.equal(reduced.controller.state().topic,'rope');
  assert.equal(reduced.timers.size,0);assert.equal(reduced.controller.state().playing,false);
});
