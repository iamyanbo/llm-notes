import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {wordOrigins,createPageMotion} from '../public/page-motion.js';

test('moving words preserve distinct occurrences and identify missing origins',()=>{
  assert.deepEqual(wordOrigins(['the','dog','chased','the','cat'],['the','cat','chased','the','dog']),[0,4,2,3,1]);
  assert.deepEqual(wordOrigins(['the','dog','chased','the','cat'],['cat','the','chased','dog','the']),[4,0,2,1,3]);
  assert.deepEqual(wordOrigins(['dog'],['cat']),[null]);
});

test('scroll enhancement leaves visible headings still and reveals approaching content once',()=>{
  const {document}=parseHTML('<html><body><main class="essay-body"><h2 id="visible">Introduction</h2><h3 id="later">1.1 Grammatical roles</h3><p>Always readable</p></main></body></html>');
  globalThis.innerHeight=900;
  document.getElementById('visible').getBoundingClientRect=()=>({top:100,bottom:140});
  document.getElementById('later').getBoundingClientRect=()=>({top:1100,bottom:1140});
  let callback,removed;const watched=[];
  class Observer{constructor(fn){callback=fn;}observe(el){watched.push(el);}unobserve(el){removed=el;}disconnect(){}}
  const motion=createPageMotion(document,{matches:false},{Observer});
  assert.equal(document.getElementById('visible').classList.contains('reveal-ready'),false);
  assert.equal(watched.length,1);
  assert.equal(document.querySelector('p').className,'');
  callback([{isIntersecting:true,target:watched[0]}]);
  assert.equal(removed,watched[0]);assert.equal(removed.classList.contains('is-revealed'),true);
  motion.destroy();assert.equal(removed.classList.contains('reveal-ready'),false);
});

test('reduced motion keeps content visible and skips movement, including preference changes',()=>{
  const {document}=parseHTML('<html><body><main class="essay-body"><h2>Introduction</h2></main></body></html>');
  let preferenceChange,observed=0,animated=0;
  const preference={matches:true,addEventListener:(_,fn)=>{preferenceChange=fn;}};
  class Observer{constructor(){}observe(){observed++;}unobserve(){}disconnect(){}}
  const heading=document.querySelector('h2');heading.getBoundingClientRect=()=>({top:1100,bottom:1140});
  heading.animate=()=>{animated++;return {cancel(){}};};
  const motion=createPageMotion(document,preference,{Observer});motion.feedback(heading);
  assert.equal(animated,0);assert.equal(observed,0);assert.equal(heading.classList.contains('reveal-ready'),false);
  preference.matches=false;preferenceChange();assert.equal(observed,1);
  preference.matches=true;preferenceChange();assert.equal(heading.classList.contains('reveal-ready'),false);
});

test('an unavailable or failing observer leaves reading content visible',()=>{
  const {document}=parseHTML('<html><body><main class="essay-body"><h2>Introduction</h2></main></body></html>');
  const motion=createPageMotion(document,{matches:false},{Observer:undefined});
  assert.equal(document.querySelector('h2').classList.contains('reveal-ready'),false);motion.destroy();
  class BrokenObserver{constructor(){throw Error('Unavailable');}}
  createPageMotion(document,{matches:false},{Observer:BrokenObserver});
  assert.equal(document.querySelector('h2').classList.contains('reveal-ready'),false);
});
