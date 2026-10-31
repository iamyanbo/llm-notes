import test from 'node:test';
import assert from 'node:assert/strict';
import {costCases,costCount,costDiagram,costsFigure} from '../site/costs.mjs';
test('baseline comparisons keep capacity, row width and history costs distinct',()=>{
 assert.equal(costCount('capacity',8)/costCount('capacity',4),2);
 assert.equal(costCount('state',8)/costCount('state',4),4);
 assert.equal(costCount('history',8)/costCount('history',4),2);
 for(const {kind,before,after} of costCases){
  for(const n of [before,after]){
   const svg=costDiagram(kind,n);
   assert.match(svg,/aria-label=/);
   assert.doesNotMatch(svg,/NaN|undefined/);
   assert.equal((svg.match(/class="cost-cell"/g)||[]).length,kind==='history'?n:kind==='state'?n*n+2*n:n+4);
  }
 }
 assert.equal((costsFigure().match(/<svg /g)||[]).length,6);
});
