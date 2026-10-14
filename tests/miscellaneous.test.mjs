import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {groups,sources} from '../miscellaneous/topics.mjs';
import {essays} from '../content/essays.mjs';
import {LAB_SPECS} from '../miscellaneous/lab-models.js';
const require=createRequire(new URL('../foundations/package.json',import.meta.url));
const {parseHTML}=require('linkedom');
const html=await readFile('dist/miscellaneous/index.html','utf8');
const {document}=parseHTML(html);
test('the complete collection has numbered essays, valid anchors, sources and only retained examples',async()=>{
  const ids=[...document.querySelectorAll('[id]')].map(n=>n.id);
  assert.equal(new Set(ids).size,ids.length);
  assert.deepEqual(groups.map(g=>g.topics.length),[6,4,3,2,4,3]);
  assert.equal(Object.keys(essays).length,22);
  assert.equal(document.querySelectorAll('article.topic-essay').length,22);
  assert.equal(document.querySelectorAll('.contents-rail .toc-subsection').length,22);
  assert.equal(document.querySelectorAll('.topic-plan').length,0);
  for(const [i,group] of groups.entries())for(const [j,topic] of group.topics.entries()){
    const entry=document.getElementById(topic.id);assert(entry,topic.id);
    assert.equal(entry.querySelector('h3').textContent,(i+1)+'.'+(j+1)+' '+topic.title);
    for(const key of [...topic.refs,...essays[topic.id].refs])assert(sources[key]);
    for(const section of essays[topic.id].sections)assert(ids.includes(topic.id+'-'+section.id));
  }
  for(const id of ['prefill-decode','neolabs','calibration','agent-memory','unlearning'])assert(!document.getElementById(id));
  for(const id of ['cuda','vram'])assert(document.getElementById(id));
  const labs=[...document.querySelectorAll('[data-lab]')].map(n=>n.dataset.lab);
  assert.equal(labs.length,12);assert.deepEqual(new Set(labs),new Set(Object.keys(LAB_SPECS)));
  assert.equal(document.querySelectorAll('.static-diagram').length,6);
  for(const n of document.querySelectorAll('[href]')){
    const href=n.getAttribute('href');if(href.startsWith('#'))assert(ids.includes(href.slice(1)),href);
  }
  assert(document.querySelector('.katex-mathml'));assert(!html.includes('katex-error'));
  assert(document.querySelector('[role=progressbar]'));assert(html.includes('Thanks for reading!'));
});
test('publication excludes comments and keeps the original dog and cat on white paper',async()=>{
  assert(!/hypothes\.is|review-toggle|review-panel|chatgpt\.site|proposed essays|Planned demonstration/.test(html));
  const collection=await readFile('dist/miscellaneous/collection.js','utf8');assert(!collection.includes('createComments'));
  await assert.rejects(access('dist/miscellaneous/comments.js'));
  const a=await readFile('dist/miscellaneous/images/dog-cat-happy-paper.png');
  const b=await readFile('dist/foundations/assets/dog-cat-happy-paper.png');
  const hash=x=>createHash('sha256').update(x).digest('hex');assert.equal(hash(a),hash(b));
  const css=await readFile('dist/miscellaneous/essays.css','utf8');assert(css.includes('mix-blend-mode:normal;background:#fff'));
});
