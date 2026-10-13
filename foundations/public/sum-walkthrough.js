import {exampleEmbeddings} from './representation-model.js';

export const SUM_TERMS=['dog','chased','cat'].map((token,i)=>{
  const weight=[.5,.25,.25][i],vector=exampleEmbeddings()[token];
  return {token,weight,vector,weighted:vector.map(v=>weight*v)};
});
export const SUM_LABELS=['Scale the vectors','Add dog','Add chased','Add cat'];
const format=n=>Number(n.toFixed(2)).toString();
const pair=values=>'('+values.map(format).join(', ')+')';
export function sumPartial(count){
  return SUM_TERMS.slice(0,count).reduce((sum,term)=>sum.map((v,r)=>v+term.weighted[r]),[0,0]);
}
export function sumStep(stage=0){
  const px=x=>220+300*x,py=y=>238-230*y,partial=sumPartial(stage);
  const paths=SUM_TERMS.map((term,j)=>{
    const start=stage===0?[0,0]:sumPartial(j),end=start.map((v,r)=>v+term.weighted[r]);
    return `<g class="sum-term sum-term-${j}" data-reached="${stage===0||j<stage}">
      <path class="sum-segment" pathLength="1" d="M${px(start[0])} ${py(start[1])} L${px(end[0])} ${py(end[1])}" data-current="${stage===0||j===stage-1}"/>
      <circle cx="${px(end[0])}" cy="${py(end[1])}" r="4"/>
      <text x="${px((start[0]+end[0])/2)+(j===0?-12:0)}" y="${py((start[1]+end[1])/2)-10}">${term.token}</text>
    </g>`;
  }).join('');
  const status=stage===0?'Scale each vector by its coefficient before adding.':
    `After adding ${SUM_TERMS.slice(0,stage).map(t=>t.token).join(' + ')}, the running sum is ${pair(partial)}.${stage===3?' The horizontal components cancel, leaving (0, 0.75).':''}`;
  return `<div class="sum-layout">
    <div class="sum-terms">${SUM_TERMS.map((term,j)=>`<div class="sum-term-card sum-term-${j}" data-current="${stage===0||j===stage-1}"><strong>${term.token}</strong><span>${format(term.weight)} × ${pair(term.vector)}</span><b>= ${pair(term.weighted)}</b></div>`).join('')}</div>
    <svg class="sum-plane" viewBox="0 0 440 280" role="img" aria-label="${status}">
      <g class="sum-grid">${[.25,.5,.75,1].map(y=>`<path d="M55 ${py(y)} H390"/><text x="${px(0)-15}" y="${py(y)+4}">${format(y)}</text>`).join('')}</g>
      <g class="sum-axes"><path d="M55 238 H390 M220 253 V10"/><text x="396" y="243">x₁</text><text x="227" y="14">x₂</text><text x="202" y="256">0</text><text x="${px(-.25)}" y="258">−0.25</text><text x="${px(.25)}" y="258">0.25</text></g>
      ${stage>0?`<path class="sum-result-vector" d="M220 238 L${px(partial[0])} ${py(partial[1])}"/>`:''}
      ${paths}
      ${stage>0?`<circle class="sum-result-point" cx="${px(partial[0])}" cy="${py(partial[1])}" r="6"/><text class="sum-result-label" x="${px(partial[0])+12}" y="${py(partial[1])-12}">${pair(partial)}</text>`:''}
    </svg>
  </div><p class="sum-status" data-sum-status role="status">${status}</p>`;
}
export function createSumWalkthrough(element,{preference,schedule=setTimeout,cancel=clearTimeout}={}){
  if(!element)return;
  let stage=0,timer=null;
  const play=element.querySelector('[data-sum-play]');
  const pause=()=>{if(timer!==null)cancel(timer);timer=null;play.textContent='Play addition';play.setAttribute('aria-pressed','false');};
  const render=()=>{
    element.querySelector('[data-sum-analysis]').innerHTML=sumStep(stage);
    for(const button of element.querySelectorAll('[data-sum-step]'))button.setAttribute('aria-pressed',String(Number(button.dataset.sumStep)===stage));
  };
  const advance=()=>{
    if(stage===3){pause();return;}
    stage++;render();timer=schedule(advance,1600);
  };
  for(const button of element.querySelectorAll('[data-sum-step]'))button.addEventListener('click',()=>{pause();stage=Number(button.dataset.sumStep);render();});
  element.querySelector('[data-sum-next]').addEventListener('click',()=>{pause();stage=(stage+1)%4;render();});
  play.addEventListener('click',()=>{
    if(timer!==null){pause();return;}
    stage=0;render();play.textContent='Pause addition';play.setAttribute('aria-pressed','true');timer=schedule(advance,1600);
  });
  preference?.addEventListener?.('change',()=>{if(preference.matches)pause();});
  element.ownerDocument.addEventListener('visibilitychange',()=>{if(element.ownerDocument.hidden)pause();});
  return {pause};
}
