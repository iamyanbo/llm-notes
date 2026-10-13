import katex from 'katex';
import {BLOCK_SYMBOLS} from '../public/symbol-definitions.js';
const escape=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const symbol=(id,tex=id)=>String.raw`\htmlData{symbol=${id}}{${tex}}`;
const tex={
  'block-shape':String.raw`${symbol('X')}\in\mathbb R^{${symbol('n')}\times ${symbol('d')}}\ \text{to}\ ${symbol('Y')}\in\mathbb R^{${symbol('n')}\times ${symbol('d')}}`,
  'encoder-block':String.raw`${symbol('U')}=${symbol('N1','N_1')}\bigl(${symbol('X')}+${symbol('M','\\mathcal M')}(${symbol('X')})\bigr),\qquad ${symbol('Y')}=${symbol('N2','N_2')}\bigl(${symbol('U')}+${symbol('F','F_{\\mathrm{rows}}')}(${symbol('U')})\bigr).`
};
function render(source,displayMode=false){
  let plain=source;
  const forms={M:'\\mathcal M',N1:'N_1',N2:'N_2',F:'F_{\\mathrm{rows}}'};
  for(const id of Object.keys(BLOCK_SYMBOLS))plain=plain.replaceAll(symbol(id,forms[id]??id),forms[id]??id);
  return katex.renderToString(source,{displayMode,throwOnError:true,strict:'ignore',trust:context=>context.command==='\\htmlData'})
    .replace(/(<annotation encoding="application\/x-tex">)[\s\S]*?(<\/annotation>)/g,(_,start,end)=>start+escape(plain)+end)
    .replace(/data-symbol="([^"]+)"/g,(_,id)=>`data-symbol="${id}" title="${escape(BLOCK_SYMBOLS[id].description)}"`);
}
const buttons=ids=>ids.map(id=>`<button type="button" data-symbol-button="${id}" aria-label="${escape(BLOCK_SYMBOLS[id].label+': '+BLOCK_SYMBOLS[id].description)}">${escape(BLOCK_SYMBOLS[id].label)}</button>`).join('');
export function symbolMath(kind){
  if(kind==='block-shape')return render(tex[kind]);
  return `<div class="symbol-equation" data-symbol-key="encoder-block">${render(tex[kind],true)}<div class="symbol-key-controls"><span>Hover a symbol, or select one:</span>${buttons(['X','U','Y','M','N1','N2','F','n','d'])}</div></div>`;
}
export function blockSummaryTable(){
  const rows=[
    ['Input',symbol('X'),'Supplies one incoming vector per position.'],
    ['Multi-head attention',`${symbol('O')}=${symbol('M','\\mathcal M')}(${symbol('X')})`,'Gathers and combines information from the sequence.'],
    ['First residual addition',`${symbol('R')}=${symbol('X')}+${symbol('O')}`,'Adds the original representation to the attention update.'],
    ['First normalization',`${symbol('U')}=${symbol('N1','N_1')}(${symbol('R')})`,'Normalizes each resulting representation.'],
    ['Feed-forward network',`${symbol('T')}=${symbol('F','F_{\\mathrm{rows}}')}(${symbol('U')})`,'Computes an update separately at each position.'],
    ['Second residual addition',`${symbol('Z')}=${symbol('U')}+${symbol('T')}`,'Adds that update to the normalized representation.'],
    ['Second normalization',`${symbol('Y')}=${symbol('N2','N_2')}(${symbol('Z')})`,'Produces the representation passed to the next block.']
  ];
  return `<div class="block-summary-scroll" role="region" tabindex="0" aria-label="Transformer block intermediate results"><table class="block-summary-table"><thead><tr><th scope="col">Step</th><th scope="col">Result</th><th scope="col">What the operation does</th></tr></thead><tbody>${rows.map(([step,result,description])=>`<tr><th scope="row">${step}</th><td>${render(result)}</td><td>${description}</td></tr>`).join('')}</tbody></table></div><details class="block-symbol-key"><summary>Symbols in this table</summary><div class="symbol-key-controls">${buttons(['X','O','R','U','T','Z','Y','M','N1','N2','F'])}</div></details>`;
}
