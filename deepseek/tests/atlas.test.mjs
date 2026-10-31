import test from 'node:test';
import assert from 'node:assert/strict';
import {ownershipRows,routedBank,ownershipDetail,atlasBody,atlasFigure} from '../site/atlas.mjs';

test('architecture ownership plates preserve all forty source dependencies',()=>{
 const rows=ownershipRows();assert.equal(rows.length,40);
 assert.deepEqual(rows.filter(r=>r.mode==='Full').map(r=>r.layer),[2,8,14,20]);
 assert.deepEqual(rows.filter(r=>r.mode==='Full'||r.mode==='Reindex').map(r=>r.layer),[2,8,14,20,24,28,32,36]);
 assert.equal(rows[27].kv,20);assert.equal(rows[27].index,24);
 const svg=atlasBody('ownership',27);
 for(const r of rows){
  for(const kind of ['kv','index'])if(r[kind]!==null){
   assert.ok(r[kind]<=r.layer);
   assert.ok(svg.includes(`data-owner-kind="${kind}" data-consumer="${r.layer}" data-source="${r[kind]}"`));
  }
 }
 assert.equal((svg.match(/data-owner-kind=/g)||[]).length,76);
 assert.match(ownershipDetail(0),/local attention only/);assert.match(ownershipDetail(27),/layer 20;.*layer 24/);
 assert.throws(()=>atlasBody('ownership',40),RangeError);
});
test('routed bank shows six illustrative choices among 256 identities',()=>{
 const bank=routedBank();assert.equal(bank.length,256);assert.equal(new Set(bank.map(x=>x.id)).size,256);assert.equal(bank.filter(x=>x.selected).length,6);
 const svg=atlasBody('block');assert.equal((svg.match(/data-expert=/g)||[]).length,256);assert.equal((svg.match(/data-selected="true"/g)||[]).length,6);assert.match(svg,/Shared expert/);
});
test('every initial and enlarged architecture uses the same complete SVG renderer',()=>{
 for(const kind of ['whole','block','ownership']){
  const html=atlasFigure(kind),svg=atlasBody(kind);
  assert.ok(html.includes(svg));assert.match(html,/<figcaption>/);assert.match(html,/data-atlas-expand/);assert.match(svg,/<title>/);assert.doesNotMatch(html,/NaN|undefined|<animate/);
  for(const match of svg.matchAll(/href="([^"]+)"/g))assert.ok(match[1].startsWith('#'));
 }
 assert.match(atlasBody('whole'),/Taps before layers 37, 38 and 39/);
 assert.match(atlasFigure('whole'),/minimal Python loop/);
});
