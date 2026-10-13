import {compareRepresentations,REPRESENTATION_VOCABULARY} from './representation-model.js';
import {sentenceText} from './sentence-model.js';

const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=value=>Object.is(value,-0)?'0':String(value);
const vector=values=>`(${values.map(number).join(', ')})`;
function matrix(tokens,rows){
  return `<table class="representation-matrix"><caption>${escape(sentenceText(tokens))}</caption><thead><tr><th scope="col">Position</th><th scope="col">Token</th><th scope="col">x₁</th><th scope="col">x₂</th></tr></thead><tbody>${rows.map((row,i)=>`<tr data-token-type="${tokens[i]}"><th scope="row">${i+1}</th><td>${tokens[i]}</td><td>${number(row[0])}</td><td>${number(row[1])}</td></tr>`).join('')}</tbody></table>`;
}
export function representationAnalysis(rightKey='cat',dogVector=[0,1]){
  const result=compareRepresentations(rightKey,dogVector);
  const equality=result.matricesEqual?'The ordered matrices also coincide. The chosen vectors have merged token types needed to distinguish these arrangements.':'The ordered matrices differ. Summing their rows removes that distinction.';
  return `<div class="representation-embedding-table" aria-label="Embedding assignment">${REPRESENTATION_VOCABULARY.map(token=>`<span><b>${token}</b> ${vector(result.embeddings[token])}</span>`).join('')}</div>
    <div class="representation-pair">${matrix(result.left,result.leftMatrix)}${matrix(result.right,result.rightMatrix)}</div>
    <div class="representation-sums"><div><span>Sum of the left rows</span><strong data-left-sum>${vector(result.leftSum)}</strong></div><span class="representation-equals" aria-label="equals">=</span><div><span>Sum of the right rows</span><strong data-right-sum>${vector(result.rightSum)}</strong></div></div>
    <p class="representation-verdict">${equality}</p>`;
}
