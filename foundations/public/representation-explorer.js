import {representationAnalysis} from './representation-view.js';
export function createRepresentationExplorer(element,{motion}={}){
  if(!element)return;
  let rightKey='cat';const dogVector=[0,1],analysis=element.querySelector('[data-representation-analysis]');
  const render=()=>{
    analysis.innerHTML=representationAnalysis(rightKey,dogVector);
    for(const button of element.querySelectorAll('[data-representation-comparison]'))button.setAttribute('aria-pressed',String(button.dataset.representationComparison===rightKey));
  };
  for(const button of element.querySelectorAll('[data-representation-comparison]'))button.addEventListener('click',()=>{
    if(!['cat','scrambled'].includes(button.dataset.representationComparison))return;
    rightKey=button.dataset.representationComparison;render();motion?.feedback(analysis);
  });
  for(const slider of element.querySelectorAll('[data-dog-coordinate]'))slider.addEventListener('input',()=>{
    const coordinate=Number(slider.dataset.dogCoordinate),value=Number(slider.value);
    if(![0,1].includes(coordinate)||!Number.isFinite(value)||value<-2||value>2)return;
    dogVector[coordinate]=value;
    slider.setAttribute('aria-valuetext',String(value));
    element.querySelector(`[data-dog-output="${coordinate}"]`).textContent=String(value);
    render();
  });
}
