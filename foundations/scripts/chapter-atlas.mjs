import katex from 'katex';
import {architectureCanvas} from './architecture-canvas.mjs';
import {attentionStudy} from './attention-study.mjs';
import {ATLAS_STEPS} from '../public/chapter-atlas.js';
const math=formula=>katex.renderToString(formula,{displayMode:true,throwOnError:true});
const equations=[
  String.raw`X\in\mathbb R^{n\times d},\qquad X_{i,:}=x_i^{\mathsf T}`,
  String.raw`Q=XW_Q^{\mathsf T},\quad K=XW_K^{\mathsf T},\quad V=XW_V^{\mathsf T}`,
  String.raw`S=\frac{QK^{\mathsf T}}{\sqrt{d_k}}`,
  String.raw`A=\operatorname{softmax}_{\mathrm{rows}}(S)`,
  String.raw`H=AV`,
];
export function attentionDiagram(prefix){
  const node=(step,x,y,w,title,detail,tone='blue')=>`<g class="atlas-attention-node" data-atlas-node="${step}" data-tone="${tone}" role="button" tabindex="0" aria-pressed="false" aria-label="${title}: ${detail}"><rect class="atlas-node-depth" x="${x+5}" y="${y+6}" width="${w}" height="58" rx="3"/><rect class="atlas-node-face" x="${x}" y="${y}" width="${w}" height="58" rx="3"/><text class="atlas-node-title" x="${x+w/2}" y="${y+25}" text-anchor="middle">${title}</text><text class="atlas-node-dimension" x="${x+w/2}" y="${y+45}" text-anchor="middle">${detail}</text></g>`;
  const route=(step,d,label='',x=0,y=0,tone='blue')=>`<g class="atlas-route" data-atlas-route="${step}" data-tone="${tone}"><path class="atlas-wire" d="${d}" marker-end="url(#${prefix}-arrow)"/><path class="atlas-stream" d="${d}" pathLength="100"/>${label?`<text class="atlas-wire-label" x="${x}" y="${y}">${label}</text>`:''}</g>`;
  return `<svg class="atlas-attention-svg" viewBox="0 0 840 600" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="${prefix}-title ${prefix}-desc"><title id="${prefix}-title">The complete path through one attention head</title><desc id="${prefix}-desc">Read upward. Input rows independently become queries, keys and values. Queries and keys form a score matrix. Scaling and row-wise softmax form the weights. Values follow a separate route into the final weighted combination.</desc><defs><marker id="${prefix}-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M1 1 L9 5 L1 9" fill="none" stroke="context-stroke" stroke-width="1.5"/></marker></defs>
    ${route(1,'M415 518 V494 H155 V464','W_Q',188,484)}
    ${route(1,'M415 518 V464','W_K',428,492)}
    ${route(1,'M415 518 V494 H705 V464','W_V',648,483,'rust')}
    ${route(2,'M155 406 V362 H335 V352')}
    ${route(2,'M415 406 V352')}
    ${route(2,'M365 294 V264')}
    ${route(3,'M365 206 V182')}
    ${route(4,'M515 153 H552')}
    ${route(4,'M705 406 V182','Values<tspan x="719" dy="16">bypass scores</tspan>',719,279,'rust')}
    ${route(4,'M662 124 V96')}
    ${node(0,285,518,260,'Input representations X','n × d')}
    ${node(1,75,406,160,'Queries Q','n × dₖ')}
    ${node(1,335,406,160,'Keys K','n × dₖ')}
    ${node(1,625,406,160,'Values V','n × dᵥ','rust')}
    ${node(2,215,294,300,'Compare: QKᵀ','n × n')}
    ${node(2,215,206,300,'Scale: divide by √dₖ','Scores S · n × n')}
    ${node(3,215,124,300,'Softmax, one row at a time','Weights A · n × n')}
    ${node(4,552,124,220,'Combine: AV','Weighted value sums')}
    ${node(4,552,38,220,'Contextual outputs H','n × dᵥ')}
    <text class="atlas-reading-direction" x="36" y="564">Read upward</text>
  </svg>`;
}
const controls=kind=>`<div class="atlas-operation-controls" role="group" aria-label="${kind==='attention'?'Attention':'Transformer'} diagram stages">${ATLAS_STEPS[kind].map((step,i)=>`<button type="button" data-atlas-step="${i}" aria-pressed="${i===0}"><span>${i+1}</span>${step.label}</button>`).join('')}</div><div class="atlas-play-controls"><button type="button" data-atlas-play aria-pressed="false">Play tour</button><button type="button" data-atlas-next>Next part</button><button type="button" data-atlas-reset>Overview</button></div>`;
const body=(kind,prefix)=>{
  const step=ATLAS_STEPS[kind][0];
  return `<div class="chapter-atlas-layout"><div class="chapter-atlas-canvas" tabindex="0" role="region" aria-label="${kind} diagram; scroll horizontally if needed">${kind==='attention'?`<div class="architecture-canvas chapter-attention-canvas">${attentionStudy(prefix,{standalone:true})}</div>`:architectureCanvas(prefix,'chapter-architecture-canvas')}</div><div class="chapter-atlas-reading"><div class="atlas-detail" data-atlas-caption aria-live="polite"><strong>${step.title}</strong><p>${step.description}</p></div>${controls(kind)}<a class="atlas-reading-link" href="#${kind==='attention'?'attention-computation':'layer-purpose'}">Return to the explanation</a></div></div>`;
};
export function chapterAtlas(kind){
  const title=kind==='attention'?'Inside attention':'From attention to the whole transformer';
  const prefix='chapter-'+kind;
  return `<section class="chapter-atlas" data-chapter-atlas="${kind}" data-atlas-step="0" data-atlas-running="false" aria-labelledby="${prefix}-heading"><figure data-atlas-figure><div class="chapter-atlas-heading"><div><span class="aside-label">${kind==='attention'?'The construction':'The architecture'}</span><h3 id="${prefix}-heading">${title}</h3></div><button type="button" data-atlas-enlarge aria-haspopup="dialog">Open large diagram</button></div>${body(kind,prefix+'-inline')}<figcaption class="chapter-atlas-caption">${kind==='attention'?'Blue follows comparisons and weights; rust follows the values. The matrices use the same numerical head as the opening architecture. The five-word sentence calculation appears in <a href="#attention-computation">5.5</a>.':'The original encoder–decoder transformer. This chapter constructs the encoder block on the left. The decoder remains visible for orientation; its mask and cross-attention will be examined with prediction.'} <a href="https://arxiv.org/abs/1706.03762">Vaswani et al. (2017), Figure ${kind==='attention'?'2':'1'}</a></figcaption></figure><dialog class="chapter-atlas-dialog" data-atlas-dialog aria-labelledby="${prefix}-dialog-title"><div class="chapter-atlas-dialog-heading"><h2 id="${prefix}-dialog-title">${title}</h2><button type="button" data-atlas-close>Close diagram</button></div>${body(kind,prefix+'-large')}</dialog><button class="atlas-dock" type="button" data-atlas-dock aria-haspopup="dialog" hidden>Open diagram</button></section>`;
}
