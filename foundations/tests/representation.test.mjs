import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PRESETS} from '../public/sentence-model.js';
import {exampleEmbeddings,orderedVectors,sumVectors,compareRepresentations} from '../public/representation-model.js';

function* permutations(values){
  if(!values.length){yield [];return;}
  for(let i=0;i<values.length;i++){
    const rest=values.filter((_,j)=>j!==i);
    for(const tail of permutations(rest))yield [values[i],...tail];
  }
}
test('every rearrangement has the same computed sum for several embedding assignments',()=>{
  for(const dog of [[0,1],[1.5,-2],[-1,0]]){
    const embeddings=exampleEmbeddings(dog),expected=sumVectors(PRESETS.dog,embeddings);
    for(const tokens of permutations(PRESETS.dog))assert.deepEqual(sumVectors(tokens,embeddings),expected);
  }
});
test('ordered rows distinguish the reversed sequence until the needed token vectors collide',()=>{
  const initial=compareRepresentations();
  assert.notDeepEqual(initial.leftMatrix,initial.rightMatrix);
  assert.deepEqual(initial.leftSum,[2,2]);
  assert.deepEqual(initial.leftSum,initial.rightSum);
  const collision=compareRepresentations('cat',[-1,0]);
  assert.deepEqual(collision.leftMatrix,collision.rightMatrix);
  assert.equal(collision.matricesEqual,true);
  assert.deepEqual(collision.leftSum,collision.rightSum);
  const embeddings=exampleEmbeddings();
  assert.deepEqual(orderedVectors(['the','the'],embeddings),[[1,0],[1,0]]);
});
