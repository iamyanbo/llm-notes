import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {READING_EXAMPLES,READING_QUESTIONS,readingWeights} from '../public/word-relevance-model.js';
import {wordRelevanceStudy} from '../public/word-relevance-view.js';
import {createWordRelevanceStudy} from '../public/word-relevance-study.js';
const mount=()=>{const {document,window}=parseHTML(wordRelevanceStudy());return {document,window,element:document.querySelector('[data-word-relevance]')};};

test('every illustrative row is normalized and equal contributions are independent of the question',()=>{
  for(const example of Object.keys(READING_EXAMPLES))for(const {id} of READING_QUESTIONS){
    const row=readingWeights(example,id);
    assert.equal(row.weights.length,row.tokens.length);
    assert.ok(row.weights.every(w=>w>0));
    assert.ok(Math.abs(row.weights.reduce((sum,w)=>sum+w,0)-1)<1e-12);
    assert.deepEqual(readingWeights(example,id,true).weights,row.tokens.map(()=>1/row.tokens.length));
  }
});
test('emphasis follows the reading and grammatical construction rather than a fixed animal name',()=>{
  assert.equal(readingWeights().tokens[readingWeights().strongest],'dog');
  const reversed=readingWeights('reversed');assert.equal(reversed.tokens[reversed.strongest],'cat');
  const patient=readingWeights('active','patient');assert.equal(patient.tokens[patient.strongest],'cat');
  const passive=readingWeights('passive');assert.equal(passive.strongest,6);assert.equal(passive.tokens[passive.strongest],'dog');
  assert.ok(passive.weights[4]>passive.weights[0],'by contributes more than the article in this illustration');
  const negative=readingWeights('negated','event');
  assert.equal(negative.tokens[negative.strongest],'not');
  assert.match(negative.answer,/denies/);
});
test('question changes recolor persistent word cards and numerical shares can be inspected',()=>{
  const {element,window}=mount();createWordRelevanceStudy(element);
  const dog=element.querySelector('[data-reading-word="1"]'),cat=element.querySelector('[data-reading-word="4"]');
  assert.equal(dog.dataset.level,'4');assert.equal(cat.dataset.level,'2');
  element.querySelector('[data-reading-question="patient"]').click();
  assert.equal(element.querySelector('[data-reading-word="1"]'),dog);
  assert.equal(dog.dataset.level,'2');assert.equal(cat.dataset.level,'4');
  const numbers=element.querySelector('[data-reading-numbers]');numbers.checked=true;numbers.dispatchEvent(new window.Event('change'));
  assert.equal(cat.querySelector('[data-reading-share]').hidden,false);assert.equal(cat.querySelector('[data-reading-share]').textContent,'54.5%');
  cat.click();assert.match(element.querySelector('.reading-word-note').textContent,/Cat names the participant being chased/);
  element.querySelector('[data-reading-uniform]').click();
  assert.equal(new Set([...element.querySelectorAll('[data-reading-word]')].map(c=>c.dataset.level)).size,1);
  assert.equal(cat.querySelector('[data-reading-share]').textContent,'20.0%');
});
test('sentence changes include passive function words and negation and update all seven contributions',()=>{
  const {element,window}=mount();createWordRelevanceStudy(element);
  const select=element.querySelector('[data-reading-example]');
  Object.defineProperty(select,'value',{value:'passive',configurable:true});select.dispatchEvent(new window.Event('change'));
  assert.equal(element.querySelectorAll('[data-reading-word]').length,7);
  element.querySelector('[data-reading-word="4"]').click();
  assert.match(element.querySelector('.reading-word-note').textContent,/By introduces the agent/);
  Object.defineProperty(select,'value',{value:'negated',configurable:true});select.dispatchEvent(new window.Event('change'));
  element.querySelector('[data-reading-question="event"]').click();
  assert.equal(element.querySelector('[data-reading-word="3"]').dataset.level,'4');
  assert.match(element.querySelector('.reading-answer').textContent,/denies/);
  assert.equal(element.querySelectorAll('.reading-link').length,7);
});
test('question playback ends once, pauses for inspection and hidden pages, and honors reduced motion',()=>{
  const {element,document,window}=mount(),timers=new Map();let next=0,changed;
  const preference={matches:false,addEventListener:(_,fn)=>{changed=fn;}};
  createWordRelevanceStudy(element,{preference,schedule:fn=>{timers.set(++next,fn);return next;},cancel:id=>timers.delete(id)});
  const play=element.querySelector('[data-reading-play]');play.click();
  for(const question of ['patient','event']){
    const [id,fn]=[...timers][0];timers.delete(id);fn();
    assert.equal(element.querySelector('[data-reading-question="'+question+'"]').getAttribute('aria-pressed'),'true');
  }
  assert.equal(timers.size,0);assert.equal(play.getAttribute('aria-pressed'),'false');
  play.click();element.querySelector('[data-reading-word="2"]').click();assert.equal(timers.size,0);
  play.click();Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new window.Event('visibilitychange'));assert.equal(timers.size,0);
  play.click();preference.matches=true;changed();assert.equal(timers.size,0);
  play.click();assert.equal(timers.size,0);assert.equal(element.querySelector('[data-reading-question="event"]').getAttribute('aria-pressed'),'true');
});
