import {embeddingAnalysis} from '../public/embedding-view.js';
import {PRESETS} from '../public/sentence-model.js';

export function embeddingExplorer(){
  return `<section class="embedding-explorer" data-embedding-explorer aria-labelledby="embedding-explorer-title">
    <div class="experiment-heading"><span class="aside-label">Worked example</span><span class="experiment-index">d = 2</span></div>
    <h3 id="embedding-explorer-title">From a sentence to its matrix</h3>
    <div class="grammar-choices" role="group" aria-label="Sentence for embedding lookup">
      <button type="button" data-embedding-sentence="dog" aria-pressed="true">Dog chases cat</button>
      <button type="button" data-embedding-sentence="cat" aria-pressed="false">Cat chases dog</button>
    </div>
    <p class="embedding-instruction">Select a position to follow its token through the lookup.</p>
    <div class="embedding-tokens" role="group" aria-label="Token positions">${PRESETS.dog.map((token,i)=>`<button type="button" data-embedding-position="${i}" aria-label="Position ${i+1}: ${token}" aria-pressed="${i===0}"><span>${i+1}</span><b>${token}</b></button>`).join('')}</div>
    <div data-embedding-analysis>${embeddingAnalysis()}</div>
    <div class="embedding-controls"><button type="button" data-embedding-play aria-pressed="false">Play lookup</button><button type="button" data-embedding-next>Next position</button><p data-embedding-status role="status">Position 1: the → ID 1 → (1, 0) → row 1.</p></div>
    <p class="embedding-caption">The four vectors are chosen, not learned. The axes carry no assigned linguistic meaning. Repeated tokens retrieve the same vector; row order records their positions.</p>
  </section>`;
}
