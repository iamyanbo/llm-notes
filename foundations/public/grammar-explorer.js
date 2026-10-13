import {GRAMMAR_EXAMPLES,GRAMMAR_MODES,grammarAnalysis} from './grammar-model.js';

export function createGrammarExplorer(element,{motion}={}){
  if(!element)return;
  let exampleKey='active',mode='classes';
  const analysis=element.querySelector('[data-grammar-analysis]');
  const render=()=>{
    const example=GRAMMAR_EXAMPLES[exampleKey];
    analysis.innerHTML=grammarAnalysis(exampleKey,mode);
    element.querySelector('[data-grammar-instruction]').textContent=GRAMMAR_MODES[mode];
    element.querySelector('[data-grammar-sentence]').textContent=example.sentence;
    element.querySelector('[data-grammar-detail]').textContent=example.detail;
    element.querySelector('[data-grammar-event]').textContent=`${example.agent[0].toUpperCase()+example.agent.slice(1)} chases ${example.affected}.`;
    for(const button of element.querySelectorAll('[data-grammar-example]'))button.setAttribute('aria-pressed',String(button.dataset.grammarExample===exampleKey));
    for(const button of element.querySelectorAll('[data-grammar-mode]'))button.setAttribute('aria-pressed',String(button.dataset.grammarMode===mode));
    motion?.feedback(analysis);
  };
  for(const button of element.querySelectorAll('[data-grammar-example]'))button.addEventListener('click',()=>{
    if(!Object.hasOwn(GRAMMAR_EXAMPLES,button.dataset.grammarExample))return;
    exampleKey=button.dataset.grammarExample;render();
  });
  for(const button of element.querySelectorAll('[data-grammar-mode]'))button.addEventListener('click',()=>{
    if(!Object.hasOwn(GRAMMAR_MODES,button.dataset.grammarMode))return;
    mode=button.dataset.grammarMode;render();
  });
}
