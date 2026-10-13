import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {groups,sources} from '../miscellaneous/topics.mjs';
import {openLinkedOutline} from '../miscellaneous/collection.js';
const require=createRequire(new URL('../foundations/package.json',import.meta.url));
const {parseHTML}=require('linkedom');

test('the collection exposes the requested topics as labelled essay plans with real sources',async()=>{
  const {document}=parseHTML(await readFile('dist/miscellaneous/index.html','utf8'));
  assert.equal(document.querySelectorAll('.topic-group').length,6);
  assert.equal(document.querySelectorAll('.topic-plan').length,23);
  assert.match(document.querySelector('.collection-status').textContent,/23 proposed essays/);
  for(const group of groups)for(const topic of group.topics){
    const entry=document.getElementById(topic.id);assert.ok(entry,topic.id);
    assert.equal(entry.querySelector('h3').textContent,topic.title);
    assert.equal(entry.querySelectorAll('.topic-sources a').length,topic.refs.length);
    for(const ref of topic.refs)assert.ok(sources[ref]);
    assert.match(entry.querySelector('.visual-plan').textContent,/Planned demonstration/);
  }
  for(const id of ['gpu','cuda','vram','scaling-laws','frontier-release','benchmaxxing','neolabs','company-agents','abliteration'])assert.ok(document.getElementById(id));
  const company=document.getElementById('company-agents');
  for(const name of ['Grok Bot','Muse','dots'])assert.ok(company.textContent.includes(name));
  assert.deepEqual([...company.querySelectorAll('a')].map(a=>a.getAttribute('href')),['grok','muse','dots'].map(key=>sources[key][1]));
});

test('a linked outline opens directly while category links and malformed fragments leave other plans alone',async()=>{
  const {document}=parseHTML(await readFile('dist/miscellaneous/index.html','utf8'));
  const handlers={},viewport={location:{hash:'#vram'},addEventListener(name,handler){handlers[name]=handler;}};
  openLinkedOutline(document,viewport);assert.equal(document.getElementById('vram').open,true);
  assert.equal(Boolean(document.getElementById('cuda').open),false);
  viewport.location.hash='#company-agents';handlers.hashchange();assert.equal(document.getElementById('company-agents').open,true);
  viewport.location.hash='#agents';assert.doesNotThrow(handlers.hashchange);
  viewport.location.hash='#%ZZ';assert.doesNotThrow(handlers.hashchange);
  viewport.location.hash='#absent';assert.doesNotThrow(handlers.hashchange);
});
