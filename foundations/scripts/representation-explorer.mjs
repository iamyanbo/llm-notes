import {representationAnalysis} from '../public/representation-view.js';
export function representationExplorer(){
  return `<section class="representation-explorer" data-representation-explorer aria-labelledby="representation-explorer-title">
    <div class="experiment-heading"><span class="aside-label">Examine the construction</span><span class="experiment-index">Sum</span></div>
    <h3 id="representation-explorer-title">Different sequences, equal sums</h3>
    <div class="grammar-choices" role="group" aria-label="Choose a comparison">
      <button type="button" data-representation-comparison="cat" aria-pressed="true">Reverse the animals</button>
      <button type="button" data-representation-comparison="scrambled" aria-pressed="false">Scramble the words</button>
    </div>
    <p class="representation-instruction">Change the vector assigned to <b>dog</b>. Every occurrence uses the same assignment.</p>
    <div class="representation-coordinate-controls">
      <label for="dog-coordinate-1">Dog: x₁ <input id="dog-coordinate-1" type="range" data-dog-coordinate="0" min="-2" max="2" step="0.5" value="0" aria-valuetext="0"><output data-dog-output="0" for="dog-coordinate-1">0</output></label>
      <label for="dog-coordinate-2">Dog: x₂ <input id="dog-coordinate-2" type="range" data-dog-coordinate="1" min="-2" max="2" step="0.5" value="1" aria-valuetext="1"><output data-dog-output="1" for="dog-coordinate-2">1</output></label>
    </div>
    <div data-representation-analysis>${representationAnalysis()}</div>
    <p class="representation-caption">These two-dimensional vectors are chosen for the example and have not been learned. Position and token labels annotate the rows; the matrix entries are the two numerical columns.</p>
  </section>`;
}
