import {READING_EXAMPLES,READING_QUESTIONS,readingWeights} from './word-relevance-model.js';

export const percentage=weight=>(weight*100).toFixed(1)+'%';
export function relevanceCard(token,i,weight,level,selected=false,showWeights=false){
  return `<button type="button" class="reading-word" data-reading-word="${i}" data-level="${level}" aria-pressed="${selected}" aria-label="${token}, position ${i+1}, contribution ${percentage(weight)}, inspect its role" style="--share:${weight*100}%"><small>${i+1}</small><strong>${token}</strong><span class="reading-share-track" aria-hidden="true"><span></span></span><span data-reading-share${showWeights?'':' hidden'}>${percentage(weight)}</span></button>`;
}
export function relevanceConnections(example='active',question='actor',uniform=false){
  const data=readingWeights(example,question,uniform);
  return `<svg class="reading-connections" viewBox="0 0 700 170" role="img" aria-label="Illustrative contributions toward the question: ${data.question.label}">
    ${data.tokens.map((token,i)=>{
      const x=(i+.5)*700/data.tokens.length,path=`M${x} 3 C${x} 69 350 82 350 125`;
      return `<g data-level="${data.levels[i]}"><path class="reading-link" d="${path}" style="stroke-width:${1+9*data.weights[i]}"/><circle class="reading-signal" r="${2+3*data.weights[i]}" style="offset-path:path('${path}');animation-delay:${i*70}ms"/></g>`;
    }).join('')}
    <rect class="reading-question-box" x="150" y="125" width="400" height="37" rx="3"/>
    <text x="350" y="149" text-anchor="middle">${data.question.label}</text>
  </svg>`;
}
export function relevanceInsight(example='active',question='actor',uniform=false,selected=1){
  const data=readingWeights(example,question,uniform);
  return `<p class="reading-answer">${data.answer}</p><p class="reading-word-note"><strong>${data.tokens[selected]} · position ${selected+1}.</strong> ${data.notes[selected]}</p>
    <p class="reading-row-note">${uniform?'Every word has the same share. This row does not adapt when we change the question.':'The emphasis belongs to this question and sentence. Changing either can change the contributions.'}</p>`;
}
export function wordRelevanceStudy(){
  const data=readingWeights();
  return `<section class="context-explorer word-relevance-study" data-word-relevance aria-labelledby="word-relevance-title">
    <div class="experiment-heading"><span class="aside-label">Before computing a score</span><span class="experiment-index">Illustrative weights</span></div>
    <h3 id="word-relevance-title">Which words matter for this reading?</h3>
    <p class="context-instruction">Keep the sentence fixed first. Change the question and watch the emphasis move. Click a word to inspect its role.</p>
    <div class="reading-example-controls"><label>Sentence <select data-reading-example>${Object.entries(READING_EXAMPLES).map(([id,example])=>`<option value="${id}"${id==='active'?' selected':''}>${example.label}</option>`).join('')}</select></label><label><input type="checkbox" data-reading-numbers> Show numerical weights</label></div>
    <p class="reading-sentence" data-reading-sentence>${data.sentence}</p>
    <div class="context-stage-buttons" role="group" aria-label="Question about the sentence">${READING_QUESTIONS.map((q,i)=>`<button type="button" data-reading-question="${q.id}" aria-pressed="${i===0}">${q.label}</button>`).join('')}</div>
    <div class="reading-legend" aria-label="Stronger color emphasis means a larger contribution"><span>Smaller share</span><i data-level="0"></i><i data-level="1"></i><i data-level="2"></i><i data-level="3"></i><i data-level="4"></i><span>Larger share</span></div>
    <div class="reading-scroll" tabindex="0" role="region" aria-label="Sentence words and their contributions"><div class="reading-canvas" data-reading-canvas style="--word-count:5">
      <div class="reading-word-row" data-reading-words>${data.tokens.map((token,i)=>relevanceCard(token,i,data.weights[i],data.levels[i],i===data.strongest)).join('')}</div>
      <div data-reading-connections>${relevanceConnections()}</div>
    </div></div>
    <p class="reading-total" data-reading-total hidden>Shares sum to 100%; displayed percentages are rounded.</p>
    <div class="reading-insight" data-reading-insight>${relevanceInsight()}</div>
    <div class="embedding-controls"><button type="button" data-reading-play aria-pressed="false">Play the questions</button><button type="button" data-reading-next>Next question</button><button type="button" data-reading-uniform aria-pressed="false">Equal contributions</button></div>
    <p class="context-caption">Colors and line widths show normalized, hand-chosen contributions. The moving marks illustrate those contributions; the written interpretations are supplied with the examples. This is a motivation for selective weighting, not attention measured from a trained model.</p>
    <p class="reading-status" data-reading-status role="status">${data.question.label} · ${data.sentence}</p>
  </section>`;
}
