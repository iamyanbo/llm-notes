import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PRESETS, swapWords, wordCounts, sentenceText, describeOrder} from '../public/sentence-model.js';

test('all examples preserve exactly the same words and multiplicities',()=>{
  const expected={the:2,dog:1,chased:1,cat:1};
  for(const words of Object.values(PRESETS))assert.deepEqual(wordCounts(words),expected);
});
test('swapping the animals reverses their roles without changing word counts',()=>{
  const words=swapWords(PRESETS.dog,1,4);
  assert.deepEqual(words,PRESETS.cat);
  assert.equal(sentenceText(words),'The cat chased the dog.');
  assert.match(describeOrder(words),/cat performs the action/);
  assert.deepEqual(PRESETS.dog,['the','dog','chased','the','cat']);
});
test('every possible position exchange preserves the bag of words',()=>{
  for(let a=0;a<5;a++)for(let b=0;b<5;b++)assert.deepEqual(wordCounts(swapWords(PRESETS.dog,a,b)),wordCounts(PRESETS.dog));
});
test('unrecognized arrangements ask the reader rather than claiming to parse English',()=>{
  assert.match(describeOrder(swapWords(PRESETS.dog,0,1)),/What statement/);
  assert.match(describeOrder(PRESETS.scrambled),/does not form an ordinary English sentence/);
  assert.throws(()=>swapWords(PRESETS.dog,-1,3),RangeError);
});
