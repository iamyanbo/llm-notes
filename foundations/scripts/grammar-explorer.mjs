import {GRAMMAR_EXAMPLES,GRAMMAR_MODES,grammarAnalysis} from '../public/grammar-model.js';
export function grammarExplorer(){
  const example=GRAMMAR_EXAMPLES.active;
  return `<section class="grammar-explorer" data-grammar-explorer aria-labelledby="grammar-explorer-title">
    <div class="experiment-heading"><span class="aside-label">Compare</span><span class="experiment-index">Grammar</span></div>
    <h3 id="grammar-explorer-title">One sentence, three descriptions</h3>
    <div class="grammar-choices" role="group" aria-label="Choose a sentence">
      <button type="button" data-grammar-example="active" aria-pressed="true">Dog chases cat</button>
      <button type="button" data-grammar-example="reversed" aria-pressed="false">Cat chases dog</button>
      <button type="button" data-grammar-example="passive" aria-pressed="false">Passive sentence</button>
    </div>
    <p class="grammar-sentence" data-grammar-sentence>${example.sentence}</p>
    <div class="grammar-choices grammar-views" role="group" aria-label="Choose an analysis">
      <button type="button" data-grammar-mode="classes" aria-pressed="true">Word classes</button>
      <button type="button" data-grammar-mode="syntax" aria-pressed="false">Sentence structure</button>
      <button type="button" data-grammar-mode="event" aria-pressed="false">Roles in the event</button>
    </div>
    <p class="grammar-instruction" data-grammar-instruction>${GRAMMAR_MODES.classes}</p>
    <div data-grammar-analysis aria-live="polite" aria-atomic="true">${grammarAnalysis('active','classes')}</div>
    <div class="grammar-event"><span>Event described</span><strong data-grammar-event>Dog chases cat.</strong></div>
    <p class="grammar-detail" data-grammar-detail aria-live="polite">${example.detail}</p>
    <p class="grammar-caption">These three examples are annotated by hand. Select a view to compare the descriptions.</p>
  </section>`;
}
