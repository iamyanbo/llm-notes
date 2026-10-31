import {routerDiagram,routerDetail,routerSteps} from './moe-study.mjs';
export function initializeRouterStudy(root){
 const get=s=>root.querySelector(s),column=get('[data-router-column]'),next=get('[data-router-next]'),reset=get('[data-router-reset]');let stage=0;
 const update=()=>{const i=Number(column.value);get('[data-router-diagram]').innerHTML=routerDiagram(i,stage);get('[data-router-detail]').innerHTML=routerDetail(i,stage);get('[data-router-stage]').textContent=`${stage+1} / ${routerSteps} · ${['Input','Scores','Affinities','Weights','Output'][stage]}`;next.disabled=stage===routerSteps-1;reset.disabled=stage===0;};
 column.addEventListener('change',update);next.addEventListener('click',()=>{stage=Math.min(routerSteps-1,stage+1);update();});reset.addEventListener('click',()=>{stage=0;update();});update();
}
