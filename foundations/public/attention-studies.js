import {WORKED_SCORES,scaleStudy} from './attention-studies-model.js';
import {scoreFrame,valueFrame,positionFrame,scaleFrame,number} from './attention-studies-view.js';

export function createScoreStudy(element,{preference,schedule=setTimeout,cancel=clearTimeout}={}){
  if(!element)return;
  let scores=[...WORKED_SCORES],shift=0,stage=0,timer=null;
  const play=element.querySelector('[data-study-play]'),shiftInput=element.querySelector('[data-score-shift]');
  const sliders=[...element.querySelectorAll('[data-study-score]')];
  const pause=()=>{if(timer!==null)cancel(timer);timer=null;play.textContent='Play calculation';play.setAttribute('aria-pressed','false');};
  const render=()=>{
    element.querySelector('[data-score-frame]').innerHTML=scoreFrame(scores,shift,stage);
    for(const button of element.querySelectorAll('[data-score-stage]'))button.setAttribute('aria-pressed',String(Number(button.dataset.scoreStage)===stage));
    shiftInput.setAttribute('aria-valuetext',number(shift));
    element.querySelector('[data-score-shift-output]').textContent=number(shift);
  };
  for(const slider of sliders)slider.addEventListener('input',()=>{
    pause();const value=Number(slider.value);scores[Number(slider.dataset.studyScore)]=value;
    slider.setAttribute('aria-valuetext',number(value));slider.nextElementSibling.textContent=number(value);render();
  });
  shiftInput.addEventListener('input',()=>{pause();shift=Number(shiftInput.value);render();});
  element.querySelector('[data-score-reset]').addEventListener('click',()=>{
    pause();scores=[...WORKED_SCORES];shift=0;shiftInput.value='0';
    for(const [i,slider] of sliders.entries()){slider.value=String(scores[i]);slider.setAttribute('aria-valuetext',number(scores[i]));slider.nextElementSibling.textContent=number(scores[i]);}
    render();
  });
  for(const button of element.querySelectorAll('[data-score-stage]'))button.addEventListener('click',()=>{pause();stage=Number(button.dataset.scoreStage);render();});
  element.querySelector('[data-study-next]').addEventListener('click',()=>{pause();stage=(stage+1)%4;render();});
  const advance=()=>{stage++;render();if(stage===3){pause();return;}timer=schedule(advance,2200);};
  play.addEventListener('click',()=>{
    if(timer!==null){pause();return;}
    if(preference?.matches){stage=3;render();return;}
    stage=0;render();play.textContent='Pause calculation';play.setAttribute('aria-pressed','true');timer=schedule(advance,2200);
  });
  preference?.addEventListener?.('change',()=>{if(preference.matches)pause();});
  element.ownerDocument.addEventListener('visibilitychange',()=>{if(element.ownerDocument.hidden)pause();});
  return {pause};
}
export function createValueStudy(element){
  if(!element)return;
  let swap=false;
  for(const button of element.querySelectorAll('[data-value-map]'))button.addEventListener('click',()=>{
    const previous=swap;swap=button.dataset.valueMap==='1';
    element.querySelector('[data-value-frame]').innerHTML=valueFrame(swap,previous);
    for(const choice of element.querySelectorAll('[data-value-map]'))choice.setAttribute('aria-pressed',String((choice.dataset.valueMap==='1')===swap));
  });
}
export function createPositionStudy(element){
  if(!element)return;
  let key='dog';const checkbox=element.querySelector('[data-position-include]');
  const render=animate=>{element.querySelector('[data-position-frame]').innerHTML=positionFrame(key,checkbox.checked,animate);};
  element.querySelector('[data-position-reverse]').addEventListener('click',()=>{key=key==='dog'?'cat':'dog';render(true);});
  checkbox.addEventListener('change',()=>render(false));
}
export function createScaleStudy(element){
  if(!element)return;
  const slider=element.querySelector('[data-scale-factor]');
  const render=()=>{
    const factor=Number(slider.value);
    slider.setAttribute('aria-valuetext',number(factor));element.querySelector('[data-scale-output]').textContent=number(factor);
    // Keep the bars in place so CSS can animate their changing widths.
    const {weights,scores,ratio}=scaleStudy(factor);
    const rows=element.querySelectorAll('.study-scale-bars>div');
    rows.forEach((row,i)=>{
      row.querySelector('small').textContent='score '+number(scores[i]);
      row.querySelector('.context-bar-track>span').style.width=weights[i]*100+'%';
      row.querySelector('b').textContent=(weights[i]*100).toFixed(3)+'%';
    });
    element.querySelector('[data-scale-status]').textContent=`Weight ratio = exp(${number(factor)}) ≈ ${number(ratio)}. ${factor===0?'Equal scores give equal shares.':'Candidate 1 receives more weight, although their ordering is unchanged.'}`;
  };
  slider.addEventListener('input',render);
  for(const button of element.querySelectorAll('[data-scale-preset]'))button.addEventListener('click',()=>{slider.value=button.dataset.scalePreset;render();});
}
