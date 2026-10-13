import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {readFile} from 'node:fs/promises';
import {BLOCK_SYMBOLS} from '../public/symbol-definitions.js';
import {createSymbolHints} from '../public/symbol-hints.js';
import {symbolMath,blockSummaryTable} from '../scripts/symbol-math.mjs';

test('block summary renders seven actual rows with named mathematical results',()=>{
 const {document}=parseHTML(blockSummaryTable());
 assert.equal(document.querySelectorAll('tbody tr').length,7);
 assert.equal(document.querySelectorAll('thead th[scope=col]').length,3);
 assert.equal(document.querySelectorAll('tbody th[scope=row]').length,7);
 for(const symbol of document.querySelectorAll('[data-symbol]'))assert.ok(BLOCK_SYMBOLS[symbol.dataset.symbol]);
 assert.equal(document.querySelector('.katex-error'),null);
 assert.ok(!document.querySelector('annotation').textContent.includes('htmlData'),'Copied TeX should contain the formula, not styling commands');
});
test('symbol descriptions work on hover, keyboard focus and touch selection, and close with Escape',()=>{
 const {document,window}=parseHTML('<html><body>'+symbolMath('encoder-block')+'</body></html>');
 window.HTMLElement.prototype.getBoundingClientRect=()=>({left:20,top:20,bottom:40,width:50,height:20});
 createSymbolHints(document);
 const tip=document.getElementById('math-symbol-tooltip'),glyph=document.querySelector('[data-symbol=X]');
 glyph.dispatchEvent(new window.Event('mouseover',{bubbles:true}));
 assert.equal(tip.hidden,false);assert.equal(tip.textContent,BLOCK_SYMBOLS.X.description);assert.equal(glyph.getAttribute('aria-describedby'),tip.id);
 const button=document.querySelector('[data-symbol-button=N1]');
 button.dispatchEvent(new window.Event('focusin',{bubbles:true}));
 assert.equal(tip.textContent,BLOCK_SYMBOLS.N1.description);
 button.click();assert.equal(tip.hidden,false);
 const escape=new window.Event('keydown',{bubbles:true});escape.key='Escape';button.dispatchEvent(escape);
 assert.equal(tip.hidden,true);assert.equal(button.hasAttribute('aria-describedby'),false);
});
test('the redundant decoder route is absent and the signoff follows the conclusion',async()=>{
 const {document}=parseHTML(await readFile('dist/index.html','utf8'));
 assert.equal(document.querySelector('[data-decoder-route]'),null);
 const signoff=document.querySelector('#p-thanks-for-reading');
 assert.equal(signoff.querySelector('.signoff-message').textContent,'Thanks for reading!');
 assert.ok(signoff.querySelector('img').getAttribute('alt').includes('looking toward the reader'));
 assert.equal(document.querySelector('.essay-body').lastElementChild.id,'p-thanks-for-reading');
 assert.ok(document.querySelector('.continuation-figure img'));
});
