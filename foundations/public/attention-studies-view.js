import {PRESETS} from './sentence-model.js';
import {WORKED_SCORES,scoreStudy,valueStudy,positionStudy,scaleStudy} from './attention-studies-model.js';

export const SCORE_STEPS=['Scores','Positive amounts','Shares','Weighted output'];
export const number=(n,digits=3)=>Number(n.toFixed(digits)).toString();
const pair=v=>'('+v.map(x=>number(x)).join(', ')+')';
const heading=(id,kicker,title)=>`<div class="experiment-heading"><span class="aside-label">${kicker}</span></div><h3 id="${id}">${title}</h3>`;
const buttons=(attribute,labels,selected)=>`<div class="context-stage-buttons" role="group" aria-label="Calculation stage">${labels.map((label,i)=>`<button type="button" ${attribute}="${i}" aria-pressed="${i===selected}">${label}</button>`).join('')}</div>`;
const sumPlane=(data)=> {
  const px=x=>190+160*x,py=y=>210-160*y;
  const status=`Five weighted vectors add to ${pair(data.output)}.`;
  return `<svg class="study-sum-plane" viewBox="0 0 380 255" role="img" aria-label="${status}">
    <g class="sum-grid"><path d="M25 130 H355 M25 50 H355"/></g>
    <g class="sum-axes"><path d="M25 210 H355 M190 236 V20"/><text x="361" y="215">x₁</text><text x="198" y="20">x₂</text></g>
    ${data.terms.map((_,i)=>`<path class="study-sum-path" style="--delay:${i*200}ms" pathLength="1" d="M${px(data.partials[i][0])} ${py(data.partials[i][1])} L${px(data.partials[i+1][0])} ${py(data.partials[i+1][1])}"/>`).join('')}
    <circle class="study-output-point" cx="${px(data.output[0])}" cy="${py(data.output[1])}" r="5"/>
    <text class="study-plane-label" x="${Math.max(120,px(data.output[0])-5)}" y="${py(data.output[1])-12}" text-anchor="end">${pair(data.output)}</text>
  </svg>`;
};
export function scoreFrame(scores=WORKED_SCORES,shift=0,stage=0){
  const data=scoreStudy(scores,shift),values=stage===0?data.scores:stage===1?data.amounts:data.weights;
  const maximum=stage===0?5:stage===1?Math.max(...values):1;
  const notes=[
    'Scores compare candidates. They have no fixed total, and may be negative.',
    `Exponentiate each score. The five positive amounts total ${number(data.total)}.`,
    'Divide each amount by their shared total. The five shares now sum to 1.',
    `Multiply each input vector by its share, then add: c₂ = ${pair(data.output)}.`,
  ];
  return `<div class="score-columns">${PRESETS.dog.map((token,i)=>`<div class="score-column"><span>${token}<small>${i+1}</small></span>
    <div class="score-bar-plane" data-signed="${stage===0}"><div class="score-bar" data-negative="${values[i]<0}" style="--height:${Math.abs(values[i])/maximum*100}%;--delay:${i*70}ms"></div></div>
    <b>${number(values[i])}</b></div>`).join('')}</div>
    ${stage>=2?`<div class="study-share-strip" role="img" aria-label="Weights on the five words: ${data.weights.map(v=>number(v)).join(', ')}">${data.weights.map((weight,i)=>`<span style="flex:${weight};--delay:${i*70}ms" title="${PRESETS.dog[i]}: ${number(weight)}"></span>`).join('')}</div><p class="study-total">Sum of shares = 1</p>`:''}
    ${stage===3?`<div class="study-weighted-output"><div>${data.terms.map((term,i)=>`<div class="study-term"><span>${PRESETS.dog[i]}</span><code>${number(data.weights[i])} × ${pair(data.vectors[i])}</code><b>${pair(term)}</b></div>`).join('')}</div>${sumPlane(data)}</div>`:''}
    <p class="study-status" data-score-status role="status">${notes[stage]}</p>`;
}
export function scoreToWeights(){
  return `<section class="context-explorer attention-study-local" data-score-study aria-labelledby="score-study-title">
    ${heading('score-study-title','From comparisons to contributions','What becomes of a score?')}
    <p class="context-instruction">Follow the worked row before changing it. Each column stays with the same word through the four operations.</p>
    <div class="study-controls"><button type="button" data-score-reset>Restore worked scores</button><label>Add to every score <input type="range" data-score-shift min="-2" max="2" step="0.5" value="0"><output data-score-shift-output>0</output></label></div>
    <div class="context-sliders">${PRESETS.dog.map((token,i)=>`<label>${token} <small>position ${i+1}</small><input type="range" data-study-score="${i}" min="-2" max="2" step="0.25" value="${WORKED_SCORES[i]}"><output>${WORKED_SCORES[i]}</output></label>`).join('')}</div>
    ${buttons('data-score-stage',SCORE_STEPS,0)}
    <div data-score-frame>${scoreFrame()}</div>
    <div class="embedding-controls"><button type="button" data-study-play aria-pressed="false">Play calculation</button><button type="button" data-study-next>Next operation</button></div>
    <p class="context-caption">The first panel shows signed scores about zero; later panels show nonnegative quantities. Exponential bars use a common maximum within their panel. Weight bars use a fixed scale from 0 to 1. The strip is one total divided into five shares.</p>
  </section>`;
}
function valuePlane(current,previous){
  const px=x=>185+100*x,py=y=>145-100*y,colors=['var(--study-the)','var(--blue)','var(--rust)','var(--study-the)','var(--ink)'];
  return `<figure class="study-value-figure"><svg class="study-value-plane" viewBox="0 0 370 280" role="img" aria-label="Value vectors for the at positions 1 and 4, dog, chased, and cat; output ${pair(current.output)}">
    <defs>${colors.map((color,j)=>`<marker id="study-value-tip-${j}" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 Z" fill="${color}"/></marker>`).join('')}</defs>
    <g class="sum-grid"><path d="M85 30 V260 M285 30 V260 M35 45 H335 M35 245 H335"/></g>
    <g class="sum-axes"><path d="M25 145 H345 M185 265 V20"/><text x="350" y="151">v₁</text><text x="196" y="20">v₂</text><text x="174" y="164">0</text><text x="85" y="164">−1</text><text x="285" y="164">1</text><text x="173" y="49">1</text><text x="169" y="249">−1</text></g>
    ${current.values.map((value,j)=>`<g data-value-token="${PRESETS.dog[j]}" data-value-position="${j+1}" style="color:${colors[j]}"><path class="study-old-vector" d="M185 145 L${px(previous.values[j][0])} ${py(previous.values[j][1])}"/>
      <path class="study-value-vector" pathLength="1" marker-end="url(#study-value-tip-${j})" d="M185 145 L${px(current.values[j][0])} ${py(current.values[j][1])}"/>
      <circle class="study-moving-point" data-repeated-the="${j===3}" r="${j===3?7:4}" style="--from-x:${px(previous.values[j][0])}px;--from-y:${py(previous.values[j][1])}px;--to-x:${px(value[0])}px;--to-y:${py(value[1])}px"/>
      ${j!==3?`<text class="study-token-label" x="${px(value[0])+10}" y="${py(value[1])+(j===4?20:-12)}">${j===0?'the (1, 4)':PRESETS.dog[j]}</text>`:''}</g>`).join('')}
    <path class="study-output-vector" d="M185 145 L${px(current.output[0])} ${py(current.output[1])}"/>
    <circle class="study-moving-point study-output-point" r="6" style="--from-x:${px(previous.output[0])}px;--from-y:${py(previous.output[1])}px;--to-x:${px(current.output[0])}px;--to-y:${py(current.output[1])}px"/>
  </svg><figcaption class="study-value-legend">${PRESETS.dog.map((token,j)=>`<span style="color:${colors[j]}"><i aria-hidden="true" data-outline="${j===3}"></i>${token} <small>position ${j+1}</small></span>`).join('')}<span class="study-output-legend"><i aria-hidden="true" data-outline="true"></i>output</span></figcaption></figure>`;
}
export function valueFrame(swap=false,previousSwap=swap){
  const data=valueStudy(swap);
  return `<div class="study-value-layout"><div class="context-table-scroll"><table class="context-table"><caption>Weights held fixed</caption><thead><tr><th>Token</th><th>Weight</th><th>Input xⱼ</th><th>Value vⱼ</th></tr></thead>
    <tbody>${PRESETS.dog.map((token,j)=>`<tr><th>${token}</th><td>${number(data.weights[j])}</td><td>${pair(data.vectors[j])}</td><td>${pair(data.values[j])}</td></tr>`).join('')}</tbody></table></div>
    ${valuePlane(data,valueStudy(previousSwap))}</div>
    <p class="study-status" role="status">${swap?'Swap coordinates: Wᵥ = [[0, 1], [1, 0]].':'Identity: Wᵥ = [[1, 0], [0, 1]].'} Output = ${pair(data.output)}. Scores and weights are unchanged.</p>`;
}
export function valueTransformation(){
  return `<section class="context-explorer attention-study-local" data-value-study aria-labelledby="value-study-title">
    ${heading('value-study-title','Choose what is transmitted','Keep the weights; change the values')}
    <p class="context-instruction">Switch between the identity map and a coordinate swap. Dotted vectors mark the previous values; the moving points follow the change.</p>
    ${buttons('data-value-map',['Identity','Swap coordinates'],0)}
    <div data-value-frame>${valueFrame()}</div>
    <p class="context-caption">All five token occurrences are included. The two occurrences of “the” share the same vector and endpoint, shown with a filled dot inside an outlined circle. Dotted vectors mark previous positions; the motion interpolates between maps for illustration.</p>
  </section>`;
}
export function positionFrame(key='dog',positions=false,animate=false){
  const data=positionStudy(key,positions),before=positionStudy('dog',positions),after=positionStudy('cat',positions);
  const moves=[0,3,0,0,-3];
  return `<div class="study-order-row">${data.tokens.map((token,i)=>`<div class="study-order-card" data-dog="${token==='dog'}" data-moving="${animate&&moves[i]!==0}" style="--move:${moves[i]*100}%;--move-gap:${moves[i]*8}px"><small>position ${i+1}</small><b>${token}</b><span>score ${number(data.scores[i])}</span><strong>weight ${number(data.weights[i])}</strong></div>`).join('')}</div>
    <div class="context-comparison"><div>The dog chased the cat.<br><strong>${pair(before.output)}</strong></div><div>The cat chased the dog.<br><strong>${pair(after.output)}</strong></div></div>
    <p class="study-status" data-position-status role="status">Following dog at position ${data.receiver+1}: xᵢ = ${pair(data.embeddings[data.receiver])} + ${pair(data.p[data.receiver])} = ${pair(data.X[data.receiver])}. ${positions?'Location now enters the comparisons and transmitted values.':'The tokens carry their scores and weights with them; the output for dog stays the same.'}</p>`;
}
export function positionComparison(){
  return `<section class="context-explorer attention-study-local" data-position-study aria-labelledby="position-study-title">
    ${heading('position-study-title','Return to the original failure','Follow dog through the rearrangement')}
    <p class="context-instruction">Reverse the sentence with positions off. Then include the position vectors and compare the two outputs again. Both outputs always follow the receiving word “dog”.</p>
    <div class="study-controls"><button type="button" data-position-reverse>Reverse sentence</button><label><input type="checkbox" data-position-include> Include pᵢ = ((i − 1)/4, 0)</label></div>
    <div data-position-frame>${positionFrame()}</div>
    <p class="context-caption">Uses the scalar query/key maps of 4.2 and identity values. Without positions, moving the same token vectors only rearranges the summands. Including positions changes the input vectors themselves.</p>
  </section>`;
}
export function scaleFrame(factor=1){
  const data=scaleStudy(factor);
  return `<div class="study-scale-bars">${data.weights.map((weight,i)=>`<div><span>Candidate ${i+1}<small>score ${number(data.scores[i])}</small></span><div class="context-bar-track"><span style="width:${weight*100}%"></span></div><b>${(weight*100).toFixed(3)}%</b></div>`).join('')}</div>
    <p class="study-status" data-scale-status role="status">Weight ratio = exp(${number(factor)}) ≈ ${number(data.ratio)}. ${factor===0?'Equal scores give equal shares.':'Candidate 1 receives more weight, although their ordering is unchanged.'}</p>`;
}
export function scoreScale(){
  return `<section class="context-explorer attention-study-local" data-scale-study aria-labelledby="scale-study-title">
    ${heading('scale-study-title','Magnitude changes the average','The same ranking, different contributions')}
    <p class="context-instruction">Multiply the two scores (1, 0) by a common factor. Watch how the contribution changes even though the first candidate still ranks higher.</p>
    <div class="study-controls"><label>Score multiplier <input type="range" data-scale-factor min="0" max="10" step="0.1" value="1"><output data-scale-output>1</output></label>
      <button type="button" data-scale-preset="1">×1</button><button type="button" data-scale-preset="10">×10</button></div>
    <div data-scale-frame>${scaleFrame()}</div>
    <p class="context-caption">This is the two-candidate numerical example above. It illustrates score magnitude, not random samples of higher-dimensional query and key vectors.</p>
  </section>`;
}
