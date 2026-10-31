import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {miniatureView,miniatureFigure} from '../site/miniature.mjs';
const record=JSON.parse(fs.readFileSync(new URL('../miniature/results.json',import.meta.url),'utf8'));
test('every recorded family and layer renders its own values and ownership',()=>{
 for(const family of ['v4','v41'])for(let layer=0;layer<6;layer++){
  const html=miniatureView(record,family,layer),row=record.models[family].trace.layers[layer];
  assert.ok(html.includes(row.output_first4.map(x=>Number(x).toPrecision(5)).join(', ')));
  assert.ok(html.includes(`${row.global_source??'None'} / ${row.selection_source??'None'}`));
 }
 assert.throws(()=>miniatureView(record,'unknown'),RangeError);
 assert.throws(()=>miniatureView(record,'v4',6),RangeError);
});
test('the initial record is readable without fetching and embeds roundtrippable data',()=>{
 const html=miniatureFigure(record);
 assert.match(html,/64,265/);assert.match(html,/tests passed/);
 const embedded=html.match(/<script type="application\/json" data-mini-data>(.*?)<\/script>/s)[1];
 assert.deepEqual(JSON.parse(embedded),record);
});
