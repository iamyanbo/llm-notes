import test from 'node:test';
import assert from 'node:assert/strict';
import {notationState,notationFigure} from '../site/notation.mjs';
test('the notation diagram preserves token positions and applies the same map to both sequences',()=>{
 assert.deepEqual(notationState(0).output,[[4,-1],[10,-1],[3,-1]]);
 assert.deepEqual(notationState(1).output,[[3,1],[4,-2],[2,0]]);
 assert.deepEqual(notationState().shape,{batch:2,tokens:3,input:3,output:2});
 for(let b=0;b<2;b++)for(let row=0;row<3;row++)assert.deepEqual(notationState(b,row).output,notationState(b,0).output);
});
test('the initial diagram contains the computed result before interaction',()=>{
 assert.match(notationFigure(),/1 × \(1\) \+ 2 × \(0\) \+ 3 × \(1\) = <strong>4<\/strong>/);
 assert.throws(()=>notationState(2),RangeError);assert.throws(()=>notationState(0,3),RangeError);
});
