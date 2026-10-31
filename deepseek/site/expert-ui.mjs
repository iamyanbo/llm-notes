import {expertDiagram,expertDetail,expertStages} from './expert-study.mjs';
export function initializeExpertStudy(study){
 const get=selector=>study.querySelector(selector);
 const numbers=get('[data-expert-numbers]'),coordinate=get('[data-expert-coordinate]'),next=get('[data-expert-next]'),reset=get('[data-expert-reset]');let stage=0;
 const update=()=>{
  const numeric=numbers.checked,j=Number(coordinate.value);
  get('[data-expert-diagram]').innerHTML=expertDiagram(numeric,stage,j);
  get('[data-expert-detail]').innerHTML=expertDetail(numeric,stage,j);
  get('[data-expert-stage]').textContent=numeric?`${stage+1} / ${expertStages} · ${['Input','Two projections','Gate activation','Matched products','Output'][stage]}`:'Weight tables';
  coordinate.disabled=!numeric;next.disabled=!numeric||stage===expertStages-1;reset.disabled=!numeric||stage===0;
 };
 numbers.addEventListener('change',()=>{stage=0;update();});coordinate.addEventListener('change',update);
 next.addEventListener('click',()=>{stage=Math.min(expertStages-1,stage+1);update();});
 reset.addEventListener('click',()=>{stage=0;update();});
 update();
}
