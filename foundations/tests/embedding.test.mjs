import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {embeddingExplorer} from '../scripts/embedding-explorer.mjs';
import {createEmbeddingExplorer} from '../public/embedding-explorer.js';

function fixture(preference={matches:false}){
  const {document,window}=parseHTML(embeddingExplorer());
  const element=document.querySelector('[data-embedding-explorer]');
  createEmbeddingExplorer(element,{preference});
  const click=selector=>element.querySelector(selector).click();
  const rows=()=>[...element.querySelectorAll('.embedding-output tbody tr')].map(row=>[...row.querySelectorAll('td')].map(td=>Number(td.textContent)));
  return {element,document,window,click,rows};
}

test('lookup preserves repeated occurrences and swaps rows without changing the vocabulary table',()=>{
  const f=fixture(),lookup=f.element.querySelector('.embedding-table').textContent;
  assert.deepEqual(f.rows(),[[1,0],[0,1],[1,1],[1,0],[-1,0]]);
  f.click('[data-embedding-position="3"]');
  assert.match(f.element.querySelector('[data-embedding-status]').textContent,/Position 4: the → ID 1 → \(1, 0\) → row 4/);
  assert.equal(f.element.querySelector('.embedding-output [data-selected=true]').getAttribute('data-embedding-output'),'3');
  f.click('[data-embedding-sentence="cat"]');
  assert.deepEqual(f.rows(),[[1,0],[-1,0],[1,1],[1,0],[0,1]]);
  assert.equal(f.element.querySelector('.embedding-table').textContent,lookup);
  f.click('[data-embedding-position="1"]');
  assert.match(f.element.querySelector('[data-embedding-status]').textContent,/cat → ID 4 → \(-1, 0\) → row 2/);
  assert.match(f.element.querySelector('svg').getAttribute('aria-label'),/Vector for cat: \(-1, 0\)/);
});

test('lookup playback visits five rows, finishes, and pauses for manual inspection',()=>{
  const previousSet=globalThis.setTimeout,previousClear=globalThis.clearTimeout;
  const timers=new Map();let next=0;
  globalThis.setTimeout=fn=>{timers.set(++next,fn);return next;};
  globalThis.clearTimeout=id=>timers.delete(id);
  try{
    const f=fixture({matches:true});
    f.click('[data-embedding-play]');
    assert.equal(f.element.querySelector('[data-embedding-play]').getAttribute('aria-pressed'),'true');
    for(let row=1;row<5;row++){
      const [id,fn]=[...timers][0];timers.delete(id);fn();
      assert.equal(f.element.querySelector('.embedding-output [data-selected=true]').getAttribute('data-embedding-output'),String(row));
    }
    const [id,fn]=[...timers][0];timers.delete(id);fn();
    assert.equal(timers.size,0);
    assert.equal(f.element.querySelector('[data-embedding-play]').textContent,'Play lookup');
    f.click('[data-embedding-play]');f.click('[data-embedding-position="2"]');
    assert.equal(timers.size,0);
    assert.equal(f.element.querySelector('[data-embedding-play]').getAttribute('aria-pressed'),'false');
    assert.equal(f.element.querySelectorAll('.embedding-flight').length,0);
  }finally{globalThis.setTimeout=previousSet;globalThis.clearTimeout=previousClear;}
});

test('changing motion preference cancels the moving vector and stops playback',()=>{
  const previousSet=globalThis.setTimeout,previousClear=globalThis.clearTimeout,previousDocument=globalThis.document;
  const timers=new Map();let changed,cancelled=0;
  globalThis.setTimeout=fn=>{timers.set(1,fn);return 1;};
  globalThis.clearTimeout=id=>timers.delete(id);
  try{
    const preference={matches:false,addEventListener:(_,fn)=>{changed=fn;}};
    const {document,window}=parseHTML(embeddingExplorer());globalThis.document=document;
    window.HTMLElement.prototype.getBoundingClientRect=()=>({left:0,top:0,width:100,height:40});
    window.HTMLElement.prototype.animate=()=>({finished:new Promise(()=>{}),cancel:()=>cancelled++});
    const element=document.querySelector('[data-embedding-explorer]');
    createEmbeddingExplorer(element,{preference});
    element.querySelector('[data-embedding-play]').click();
    assert.equal(element.querySelectorAll('.embedding-flight').length,1);
    preference.matches=true;changed();
    assert.equal(cancelled,1);assert.equal(timers.size,0);
    assert.equal(element.querySelectorAll('.embedding-flight').length,0);
    assert.equal(element.querySelector('[data-embedding-play]').getAttribute('aria-pressed'),'false');
  }finally{
    globalThis.setTimeout=previousSet;globalThis.clearTimeout=previousClear;globalThis.document=previousDocument;
  }
});
