import {mixerAnalysis,headAnalysis,projectionTables,HEAD_STAGES} from '../public/context-view.js';
import {MANUAL_CONTRIBUTIONS} from '../public/context-model.js';
import {PRESETS} from '../public/sentence-model.js';
import {HEAD_FLOW_LAST} from '../public/head-flow.js';

export function contextMixer(){
  return `<section class="context-explorer" data-context-mixer aria-labelledby="context-mixer-title">
    <div class="experiment-heading"><span class="aside-label">Choose the contributions</span><span class="experiment-index">c₂</span></div>
    <h3 id="context-mixer-title">Build a context vector</h3>
    <p class="context-instruction">Adjust the amounts below. Dividing each by their total gives the weights on the connecting lines.</p>
    <div class="context-sliders">${PRESETS.dog.map((token,i)=>`<label for="context-amount-${i}"><span>${token} <small>${i+1}</small></span><input id="context-amount-${i}" data-context-amount="${i}" type="range" min="0" max="4" step="0.25" value="${MANUAL_CONTRIBUTIONS[i]}" aria-valuetext="${MANUAL_CONTRIBUTIONS[i]}"><output for="context-amount-${i}" data-context-amount-output="${i}">${MANUAL_CONTRIBUTIONS[i]}</output></label>`).join('')}</div>
    <div class="grammar-choices" role="group" aria-label="Contribution presets"><button type="button" data-context-preset="example" aria-pressed="true">Worked example</button><button type="button" data-context-preset="uniform" aria-pressed="false">Equal contributions</button><button type="button" data-context-preset="self" aria-pressed="false">Dog alone</button></div>
    <div data-context-analysis>${mixerAnalysis()}</div>
    <p class="context-caption">These are the vectors from 2.2. Line thickness represents the computed weight; moving marks illustrate the combination. Coefficients are chosen by the reader, not learned.</p>
  </section>`;
}
export function sequenceAttentionExplorer(){
  return `<section class="context-explorer" data-sequence-attention aria-labelledby="sequence-attention-title">
    <div class="experiment-heading"><span class="aside-label">Compute one attention head</span><span class="experiment-index">dₖ = dᵥ = 2</span></div>
    <h3 id="sequence-attention-title">Follow the sentence through attention</h3>
    <div class="grammar-choices" role="group" aria-label="Attention sentence"><button type="button" data-head-sentence="dog" aria-pressed="true">Dog chases cat</button><button type="button" data-head-sentence="cat" aria-pressed="false">Cat chases dog</button></div>
    <label class="context-position-toggle"><input type="checkbox" data-head-positions checked> Include position vectors pᵢ = ((i − 1)/4, 0)</label>
    <p class="context-instruction">Select the word whose representation you are updating. All five query rows are computed; this walkthrough follows the selected query through its five comparisons. Choosing dog follows q₂ and fills s₂. Choosing another word changes the receiving row. Play the calculation, or step through its products and sums.</p>
    <div class="embedding-tokens" role="group" aria-label="Receiving position">${PRESETS.dog.map((token,i)=>`<button type="button" data-head-row="${i}" aria-label="Query position ${i+1}: ${token}" aria-pressed="${i===1}"><span>${i+1}</span><b>${token}</b></button>`).join('')}</div>
    <div class="context-stage-buttons" role="group" aria-label="Attention operation">${HEAD_STAGES.map((label,i)=>`<button type="button" data-head-stage="${i}" aria-pressed="${i===0}"><span>${i+1}</span> ${label}</button>`).join('')}</div>
    <div data-head-analysis>${headAnalysis()}</div>
    <div class="embedding-controls head-flow-controls"><button type="button" data-head-play aria-pressed="false">Play calculation</button><button type="button" data-head-back>Previous step</button><button type="button" data-head-next>Next step</button><button type="button" data-head-reset>Restart</button></div>
    <label class="head-flow-scrubber">Calculation step <input type="range" data-head-progress min="0" max="${HEAD_FLOW_LAST}" step="1" value="0" aria-label="Attention calculation step" aria-valuetext="Step 1 of ${HEAD_FLOW_LAST+1}: Inputs"></label>
    <details class="context-parameters"><summary>Inspect the chosen projection matrices</summary><p>These matrices multiply column vectors, as in the definition above.</p>${projectionTables()}</details>
    <p class="context-caption">Token vectors and projection matrices are chosen by hand. Positions are illustrative, not the sinusoidal encoding of the original transformer. Displayed values are rounded to three decimals; calculations use full precision. This is an unmasked head over the complete sentence.</p>
  </section>`;
}
