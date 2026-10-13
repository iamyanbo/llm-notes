import {sumStep,SUM_LABELS} from '../public/sum-walkthrough.js';
export function sumWalkthrough(){
  return `<section class="sum-walkthrough" data-sum-walkthrough aria-labelledby="sum-walkthrough-title">
    <div class="experiment-heading"><span class="aside-label">Work through the sum</span><span class="experiment-index">c₂ = (0, 0.75)</span></div>
    <h3 id="sum-walkthrough-title">Scale, then add</h3>
    <div class="context-stage-buttons" role="group" aria-label="Weighted sum step">${SUM_LABELS.map((label,i)=>`<button type="button" data-sum-step="${i}" aria-pressed="${i===0}">${label}</button>`).join('')}</div>
    <div data-sum-analysis>${sumStep()}</div>
    <div class="embedding-controls"><button type="button" data-sum-play aria-pressed="false">Play addition</button><button type="button" data-sum-next>Next step</button></div>
    <p class="sum-caption">After scaling, place each vector at the endpoint of the preceding one. The final endpoint is their sum. The axes are numerical coordinates.</p>
  </section>`;
}
