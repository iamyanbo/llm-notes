import katex from 'katex';
import {ATTENTION_EXAMPLE as example} from '../public/attention-study.js';

const number=value=>Number(value.toFixed(2)).toString();
const equations=[
  String.raw`Q=XW^Q,\quad K=XW^K,\quad V=XW^V`,
  String.raw`S=\frac{QK^{\mathsf T}}{\sqrt{d_k}},\qquad d_k=2`,
  String.raw`A_{ij}=\frac{\exp(S_{ij})}{\sum_{\ell}\exp(S_{i\ell})}`,
  String.raw`H=AV,\qquad h_i=\sum_j A_{ij}v_j`,
  String.raw`\operatorname{MultiHead}(X)=\operatorname{Concat}(H_1,\ldots,H_h)W^O`,
];

export function attentionStudy(prefix,{standalone=false}={}) {
  const matrix=(key,label,values,x,y,step,detail)=>{
    const w=32,h=28,gap=4,width=values[0].length*(w+gap)-gap;
    const max=Math.max(...values.flat().map(Math.abs),.001);
    return `<g class="attention-operation matrix-${key}" data-operation-step="${step}"><text class="matrix-label" x="${x}" y="${y-15}">${label}</text>${values.map((row,i)=>`<g data-matrix-row="${i}"><rect class="matrix-row-focus" x="${x-5}" y="${y+i*(h+gap)-4}" width="${width+10}" height="${h+8}" rx="6"/>${row.map((value,j)=>`<rect class="matrix-cell" x="${x+j*(w+gap)}" y="${y+i*(h+gap)}" width="${w}" height="${h}" rx="3" style="--cell-strength:${.13+Math.abs(value)/max*.47}"/><text class="matrix-value" x="${x+j*(w+gap)+w/2}" y="${y+i*(h+gap)+h/2+4}" text-anchor="middle">${number(value)}</text>`).join('')}</g>`).join('')}<text class="matrix-dimension" x="${x}" y="${y+values.length*(h+gap)+17}">${detail}</text></g>`;
  };
  const wire=(step,path,label='',x=0,y=0)=>{
    const text=/^W[QKV]$/.test(label)?`W<tspan dy="-5" font-size="11">${label.slice(1)}</tspan>`:label;
    return `<g class="attention-connection" data-operation-step="${step}"><path d="${path}" marker-end="url(#${prefix}-study-arrow)"/>${label?`<text x="${x}" y="${y}">${text}</text>`:''}</g>`;
  };
  return `<section class="attention-study" id="${prefix}-expand-1" data-attention-study data-stage-expansion="1" data-expanded="false" data-operation="0" aria-label="Encoder self-attention: internal operations" aria-hidden="true" inert>
    <div class="attention-study-heading"><button type="button" data-attention-back>${standalone?'Start again':'← Architecture'}</button><span>${standalone?'Inside one self-attention head':'Encoder / self-attention'}</span></div>
    <div class="attention-study-meta"><span>Toy example · 3 positions · 1 head</span><div class="attention-row-controls" role="group" aria-label="Inspect a position"><span>Position</span>${[0,1,2].map(i=>`<button type="button" data-attention-row="${i}" aria-pressed="${i===0}" aria-label="Inspect position ${i+1}">${i+1}</button>`).join('')}</div></div>
    <div class="attention-computation-scroll" tabindex="0" role="region" aria-label="Attention computation"><svg class="attention-computation" viewBox="0 0 650 535" role="img" aria-labelledby="${prefix}-study-title ${prefix}-study-desc">
      <title id="${prefix}-study-title">The computation inside one attention head</title><desc id="${prefix}-study-desc">Three input vectors are projected into queries, keys, and values. Query–key dot products are scaled by the square root of two, normalized by a row-wise softmax, and multiplied by the values. Highlighted rows identify the selected position. Matrix entries are rounded to two decimal places. Other heads and the final projection are shown schematically.</desc>
      <defs><marker id="${prefix}-study-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M2 1 L8 5 L2 9" fill="none" stroke="currentColor" stroke-width="1.5"/></marker></defs>
      ${wire(0,'M110 94 H158 Q170 94 170 106 V111 H207','WQ',144,84)}
      ${wire(0,'M110 94 H144 Q156 94 156 106 V267 Q156 279 168 279 H207','WK',169,271)}
      ${wire(0,'M110 94 H130 Q142 94 142 106 V423 Q142 435 154 435 H207','WV',166,426)}
      ${wire(1,'M282 111 H380','QKᵀ / √dₖ',293,92)}
      ${wire(1,'M282 279 H324 Q336 279 336 267 V153 Q336 141 348 141 H380')}
      ${wire(2,'M436 158 V203 Q436 215 448 215 H503 V237','softmax',446,201)}
      ${wire(3,'M559 330 V380 Q559 392 547 392 H476','A × V',533,366)}
      ${wire(3,'M282 435 H352 Q364 435 364 423 V408 H397')}
      ${matrix('input','X',example.X,40,49,0,'3 × 2')}
      ${matrix('query','Q',example.Q,212,65,0,'Queries · 3 × 2')}
      ${matrix('key','K',example.K,212,233,0,'Keys · 3 × 2')}
      ${matrix('value','V',example.V,212,389,0,'Values · 3 × 2')}
      ${matrix('score','S',example.scores,385,65,1,'Scaled scores · 3 × 3')}
      ${matrix('weight','A',example.weights,508,237,2,'Rows sum to 1')}
      ${matrix('head','H₁',example.H,402,381,3,'3 × 2')}
      <g class="attention-operation attention-other-heads" data-operation-step="4"><text class="matrix-label" x="520" y="406">H₂ … Hₕ</text><rect x="520" y="420" width="50" height="54" rx="4"/><rect x="526" y="414" width="50" height="54" rx="4"/><rect x="532" y="408" width="50" height="54" rx="4"/></g>
      ${wire(4,'M476 427 H496 Q508 427 508 439 V505 H598 V442','Concat → Wᴼ',467,525)}
      ${wire(4,'M582 443 H616 Q628 443 628 431 V405 H615')}
      <g class="attention-operation" data-operation-step="4"><rect class="attention-output" x="587" y="377" width="22" height="59" rx="4"/><text class="matrix-dimension" x="587" y="361">Output</text></g>
      <g data-attention-packets></g>
    </svg></div>
    <div class="attention-operation-controls" role="group" aria-label="Attention operations">${['Q K V','Scores','Softmax','Values','Heads'].map((label,i)=>`<button type="button" data-attention-operation="${i}" aria-pressed="${i===0}"><span>${i+1}</span>${label}</button>`).join('')}</div>
    <div class="attention-equations">${equations.map((formula,i)=>`<div data-attention-equation="${i}"${i?' hidden':''}>${katex.renderToString(formula,{displayMode:true,throwOnError:true})}</div>`).join('')}</div>
    <span class="sr-only" data-attention-status role="status">Project Q, K, V</span>
  </section>`;
}
