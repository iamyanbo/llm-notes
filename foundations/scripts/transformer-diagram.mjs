import {TRANSFORMER_STAGES} from '../public/transformer-model.js';
import katex from 'katex';
import { STAGE_EXPANSIONS, NORM_EXPANSION } from '../public/stage-expansions.js';

const attentionFormula = katex.renderToString(String.raw`\operatorname{softmax}\!\left(\frac{QK^{\mathsf T}}{\sqrt{d_k}}\right)V`,{displayMode:true,throwOnError:true});
const multiHeadFormula = katex.renderToString(String.raw`\operatorname{Concat}(\mathrm{head}_1,\ldots,\mathrm{head}_h)W^O`,{displayMode:true,throwOnError:true});

export function transformerDiagram(prefix,{attentionExpansion=false,operationStudies=false}={}) {
  const node = (id,x,y,width,height,label,tone='neutral') => {
    const step=id==='embedding'?0:id==='selfAttention'?1:id==='maskedAttention'?3:id==='crossAttention'?4:id==='output'?6:id==='feedForward'?(x<350?2:5):(x<350?(y>400?1:2):(y>400?3:y>280?4:5));
    const expansion=id==='addNorm'?`norm-${x}-${y}`:String(step);
    const lines=label.startsWith('Multi-head ')?['Multi-head',label.slice(11)]:label==='Masked self-attention'?['Masked','self-attention']:[label];
    const text=lines.map((line,index)=>`<tspan x="${x+width/2}" dy="${index?17:0}">${line}</tspan>`).join('');
    return `<g class="architecture-node ${tone}" data-transformer-node="${id}" data-flow-step="${step}" data-expansion-key="${expansion}" role="button" tabindex="0" aria-label="${TRANSFORMER_STAGES[id].title}" aria-pressed="false" aria-expanded="false" aria-controls="${prefix}-expand-${expansion}"><rect class="node-depth" x="${x+3}" y="${y+5}" width="${width}" height="${height}" rx="7"/><rect class="node-face" x="${x}" y="${y}" width="${width}" height="${height}" rx="7" fill="url(#${prefix}-${tone}-face)"/><path class="node-highlight" d="M${x+9} ${y+1} H${x+width-9}"/><text x="${x+width/2}" y="${y+height/2+(lines.length>1?-3:5)}" text-anchor="middle">${text}</text></g>`;
  };
  const expansion = (key,{title,x,y,width,height,origin,operations,formula}) => {
    const latex=katex.renderToString(formula,{displayMode:true,throwOnError:true});
    const dx=origin[0]-(x+width/2),dy=origin[1]-(y+height/2);
    return `<g id="${prefix}-expand-${key}" class="stage-expansion" data-stage-expansion="${key}" data-expanded="false" role="group" aria-label="${title}: internal operations" aria-hidden="true" style="--expand-x:${dx}px;--expand-y:${dy}px"><rect class="expansion-shadow" x="${x+3}" y="${y+7}" width="${width}" height="${height}" rx="12"/><rect class="expansion-face" x="${x}" y="${y}" width="${width}" height="${height}" rx="12"/><foreignObject x="${x}" y="${y}" width="${width}" height="${height}"><div xmlns="http://www.w3.org/1999/xhtml" class="expanded-operations"><div class="expanded-title">${title}</div><ol>${operations.map((operation,index)=>`<li style="--operation-delay:${120+index*65}ms">${operation}</li>`).join('')}</ol><div class="expanded-equation">${latex}</div></div></foreignObject></g>`;
  };
  const expandedStages=operationStudies?'':STAGE_EXPANSIONS.filter(stage=>stage.step!==1||attentionExpansion).map(stage=>expansion(String(stage.step),stage)).join('');
  const expandedNorms=operationStudies?'':[[114,418],[114,302],[462,418],[462,298],[462,178]].map(([x,y])=>expansion(`norm-${x}-${y}`,{...NORM_EXPANSION,x:x-62,y:y-52,origin:[x+96,y+14]})).join('');
  const arrow=(d,extra='')=>`<path class="architecture-wire ${extra}" d="${d}" marker-end="url(#${prefix}-arrow)"/>`;
  const residual=(x,yBottom,yTop)=>`<path class="architecture-residual" d="M ${x} ${yBottom} H ${x-112} Q ${x-120} ${yBottom} ${x-120} ${yBottom-8} V ${yTop+8} Q ${x-120} ${yTop} ${x-112} ${yTop} H ${x-96}" marker-end="url(#${prefix}-arrow)"/>`;
  const flow=(step,paths)=>`<g class="flow-group" data-flow-phase="${step}" aria-hidden="true">${paths.map(d=>`<path class="flow-trail" d="${d}"/><path class="flow-packet" pathLength="100" d="${d}"/>`).join('')}</g>`;
  const gradients=['neutral','attention','feed-forward','embedding','output'].map(tone=>`<linearGradient id="${prefix}-${tone}-face" x1="0" y1="0" x2="0" y2="1"><stop class="face-start ${tone}" offset="0"/><stop class="face-end ${tone}" offset="1"/></linearGradient>`).join('');
  return `<svg class="transformer-svg" data-motion="paused" data-step="0" xmlns="http://www.w3.org/2000/svg" viewBox="52 0 672 684" aria-labelledby="${prefix}-title ${prefix}-description">
  <title id="${prefix}-title">Transformer encoder–decoder architecture</title>
  <desc id="${prefix}-description">Read upward from the input embeddings. The encoder contains self-attention and feed-forward sublayers. The decoder contains masked self-attention, encoder–decoder attention, and a feed-forward sublayer. Each sublayer has a residual connection and normalization. Both stacks repeat six times in the original model; decoder output passes through a linear projection and softmax.</desc>
  <defs>${gradients}<marker id="${prefix}-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M 1 1 L 9 5 L 1 9" fill="none" stroke="context-stroke" stroke-width="1.4"/></marker></defs>
  <g class="architecture-inset"><foreignObject x="72" y="26" width="285" height="200"><div xmlns="http://www.w3.org/1999/xhtml" class="diagram-math"><div class="math-label">Scaled dot-product attention</div><div class="attention-equation">${attentionFormula}</div><div class="math-label">Multi-head attention</div><div class="multi-head-equation">${multiHeadFormula}</div></div></foreignObject><g class="attention-heads" aria-hidden="true">${Array.from({length:8},(_,i)=>`<rect x="${81+i*30}" y="222" width="22" height="7" rx="3.5" style="--head-delay:${i*90}ms"/>`).join('')}</g></g>
  <g class="stack-depth" aria-hidden="true"><rect x="86" y="299" width="276" height="253" rx="14"/><rect x="79" y="293" width="276" height="253" rx="14"/><rect x="434" y="182" width="276" height="370" rx="14"/><rect x="427" y="176" width="276" height="370" rx="14"/></g>
  <rect class="architecture-stack" data-stack="encoder" x="72" y="287" width="276" height="253" rx="10"/>
  <rect class="architecture-stack" data-stack="decoder" x="420" y="170" width="276" height="370" rx="10"/>
  ${arrow('M210 592 V586')}${arrow('M210 562 V508')}
  ${arrow('M558 592 V586')}${arrow('M558 562 V508')}
  ${arrow('M210 468 V446')}${arrow('M210 418 V392')}${arrow('M210 352 V330')}
  ${arrow('M558 468 V446')}${arrow('M558 418 V388')}${arrow('M558 348 V326')}${arrow('M558 298 V268')}${arrow('M558 228 V206')}
  ${arrow('M558 178 V135')}${arrow('M558 105 V86')}${arrow('M558 56 V39')}
  ${arrow('M210 302 V281 Q210 277 214 277 H374 Q382 277 382 285 V360 Q382 368 390 368 H460','cross-wire')}
  ${residual(210,519,432)}${residual(210,404,316)}
  ${residual(558,519,432)}${residual(558,402,312)}${residual(558,283,192)}
  ${flow(0,['M210 646 V562','M558 646 V562','M81 574 H210','M429 574 H558'])}
  ${flow(1,['M210 562 V418','M210 519 H98 Q90 519 90 511 V440 Q90 432 98 432 H114'])}
  ${flow(2,['M210 418 V302','M210 404 H98 Q90 404 90 396 V324 Q90 316 98 316 H114'])}
  ${flow(3,['M558 562 V418','M558 519 H446 Q438 519 438 511 V440 Q438 432 446 432 H462'])}
  ${flow(4,['M210 302 V281 Q210 277 214 277 H374 Q382 277 382 285 V360 Q382 368 390 368 H462','M558 418 V298','M558 402 H446 Q438 402 438 394 V320 Q438 312 446 312 H462'])}
  ${flow(5,['M558 298 V178','M558 283 H446 Q438 283 438 275 V200 Q438 192 446 192 H462'])}
  ${flow(6,['M558 178 V39'])}
  ${node('selfAttention',114,468,192,40,'Multi-head self-attention','attention')}
  ${node('addNorm',114,418,192,28,'Add &amp; Norm')}
  ${node('feedForward',114,352,192,40,'Feed-forward','feed-forward')}
  ${node('addNorm',114,302,192,28,'Add &amp; Norm')}
  ${node('maskedAttention',462,468,192,40,'Masked self-attention','attention')}
  ${node('addNorm',462,418,192,28,'Add &amp; Norm')}
  ${node('crossAttention',462,348,192,40,'Multi-head cross-attention','attention')}
  ${node('addNorm',462,298,192,28,'Add &amp; Norm')}
  ${node('feedForward',462,228,192,40,'Feed-forward','feed-forward')}
  ${node('addNorm',462,178,192,28,'Add &amp; Norm')}
  ${node('output',462,105,192,30,'Linear projection','output')}
  ${node('output',462,56,192,30,'Softmax','output')}
  <g class="position-add"><circle cx="210" cy="574" r="12"/><path d="M204 574 H216 M210 568 V580"/><circle cx="558" cy="574" r="12"/><path d="M552 574 H564 M558 568 V580"/></g>
  ${arrow('M81 574 H196')}${arrow('M429 574 H544')}
  ${node('embedding',114,592,192,32,'Input embeddings','embedding')}
  ${node('embedding',462,592,192,32,'Output embeddings','embedding')}
  ${arrow('M210 646 V624')}${arrow('M558 646 V624')}
  <g class="architecture-labels"><text class="stack-label" data-stack-label="encoder" x="72" y="275">Encoder</text><text class="stack-label" data-stack-label="decoder" x="420" y="158">Decoder</text><text class="repeat-label" x="335" y="532" text-anchor="end">× 6</text><text class="repeat-label" x="683" y="532" text-anchor="end">× 6</text><text class="wire-label" x="405" y="358" text-anchor="middle">K, V</text><text class="wire-label" x="574" y="411">Q</text><text class="sequence-label" x="558" y="25" text-anchor="middle">Output probabilities</text><text class="position-label" data-position-label="encoder" x="81" y="567" textLength="112" lengthAdjust="spacingAndGlyphs">Positional encoding</text><text class="position-label" data-position-label="decoder" x="429" y="567" textLength="112" lengthAdjust="spacingAndGlyphs">Positional encoding</text>
  <text class="sequence-label" x="210" y="666" text-anchor="middle">Input sequence</text><text class="sequence-label" x="558" y="666" text-anchor="middle">Output sequence (shifted right)</text>
  </g>
  <g class="expanded-stages">${expandedStages}${expandedNorms}</g>
  </svg>`;
}
