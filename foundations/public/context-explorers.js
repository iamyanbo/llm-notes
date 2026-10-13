import {mixerAnalysis,headAnalysis} from './context-view.js';
import {MANUAL_CONTRIBUTIONS} from './context-model.js';
import {PRESETS} from './sentence-model.js';
import {createGeometryStudy} from './geometry-study.js';
import {attentionFrame,HEAD_FLOW_START,HEAD_FLOW_LAST} from './head-flow.js';

export function createContextMixer(element){
  if(!element)return;
  let contributions=[...MANUAL_CONTRIBUTIONS],preset='example';
  const render=()=>{
    element.querySelector('[data-context-analysis]').innerHTML=mixerAnalysis(contributions);
    for(const slider of element.querySelectorAll('[data-context-amount]')){
      const i=Number(slider.dataset.contextAmount);slider.value=String(contributions[i]);
      slider.setAttribute('aria-valuetext',String(contributions[i]));
      element.querySelector(`[data-context-amount-output="${i}"]`).textContent=String(contributions[i]);
    }
    for(const button of element.querySelectorAll('[data-context-preset]'))button.setAttribute('aria-pressed',String(button.dataset.contextPreset===preset));
  };
  for(const slider of element.querySelectorAll('[data-context-amount]'))slider.addEventListener('input',()=>{
    const i=Number(slider.dataset.contextAmount),value=Number(slider.value);
    if(!Number.isFinite(value)||value<0||value>4)return;
    contributions[i]=value;preset=null;render();
  });
  for(const button of element.querySelectorAll('[data-context-preset]'))button.addEventListener('click',()=>{
    preset=button.dataset.contextPreset;
    contributions=preset==='uniform'?[1,1,1,1,1]:preset==='self'?[0,1,0,0,0]:[...MANUAL_CONTRIBUTIONS];render();
  });
}
export function createSequenceAttention(element,{motion,preference,schedule=setTimeout,cancel=clearTimeout}={}){
  if(!element)return;
  let key='dog',row=1,step=0,projectionPlayer=null,timer=null,playing=false;
  const positionSwitch=element.querySelector('[data-head-positions]');
  const play=element.querySelector('[data-head-play]'),scrubber=element.querySelector('[data-head-progress]');
  const pause=()=>{if(timer!==null)cancel(timer);timer=null;playing=false;element.querySelector('.head-flow')?.pauseAnimations?.();play.setAttribute('aria-pressed','false');play.textContent=preference?.matches?'Show result':'Play calculation';};
  const render=()=>{
    const stage=attentionFrame(key,positionSwitch.checked,row,step).stage;
    projectionPlayer?.destroy();projectionPlayer=null;
    const analysis=element.querySelector('[data-head-analysis]');
    analysis.innerHTML=headAnalysis(key,positionSwitch.checked,row,stage,step,!preference?.matches);
    if(stage===1)projectionPlayer=createGeometryStudy(analysis.querySelector('[data-geometry-study]'),{mode:'qkv',prefix:'geometry-head',key,positions:positionSwitch.checked,selected:row,preference});
    for(const button of element.querySelectorAll('[data-head-sentence]'))button.setAttribute('aria-pressed',String(button.dataset.headSentence===key));
    for(const button of element.querySelectorAll('[data-head-row]')){
      const i=Number(button.dataset.headRow),token=PRESETS[key][i];
      button.querySelector('b').textContent=token;button.setAttribute('aria-label',`Query position ${i+1}: ${token}`);
      button.setAttribute('aria-pressed',String(i===row));
    }
    for(const button of element.querySelectorAll('[data-head-stage]'))button.setAttribute('aria-pressed',String(Number(button.dataset.headStage)===stage));
    scrubber.value=String(step);
    scrubber.setAttribute('aria-valuetext',`Step ${step+1} of ${HEAD_FLOW_LAST+1}: ${element.querySelector('[data-head-stage][aria-pressed=true]').textContent.trim()}`);
    element.querySelector('[data-head-back]').disabled=step===0;
    if(!playing)motion?.feedback(analysis.querySelector('.head-flow-arithmetic'));
  };
  const select=next=>{pause();step=Math.max(0,Math.min(HEAD_FLOW_LAST,next));render();};
  const tick=()=>{
    timer=null;step++;if(step===HEAD_FLOW_LAST)pause();render();
    if(playing)timer=schedule(tick,1600);
  };
  play.addEventListener('click',()=>{
    if(playing){pause();return;}
    if(preference?.matches){select(HEAD_FLOW_LAST);return;}
    if(step===HEAD_FLOW_LAST){step=0;render();}
    projectionPlayer?.pause();
    playing=true;play.setAttribute('aria-pressed','true');play.textContent='Pause';
    element.querySelector('.head-flow')?.unpauseAnimations?.();
    timer=schedule(tick,1600);
  });
  for(const button of element.querySelectorAll('[data-head-sentence]'))button.addEventListener('click',()=>{
    pause();
    const next=button.dataset.headSentence;if(next!==key)row=[0,4,2,3,1][row];
    key=next;render();
  });
  for(const button of element.querySelectorAll('[data-head-row]'))button.addEventListener('click',()=>{pause();row=Number(button.dataset.headRow);render();});
  for(const button of element.querySelectorAll('[data-head-stage]'))button.addEventListener('click',()=>select(HEAD_FLOW_START[Number(button.dataset.headStage)]));
  positionSwitch.addEventListener('change',()=>{pause();render();});
  element.querySelector('[data-head-next]').addEventListener('click',()=>select(step===HEAD_FLOW_LAST?0:step+1));
  element.querySelector('[data-head-back]').addEventListener('click',()=>select(step-1));
  element.querySelector('[data-head-reset]').addEventListener('click',()=>select(0));
  scrubber.addEventListener('input',()=>{const value=Number(scrubber.value);if(Number.isInteger(value)&&value>=0&&value<=HEAD_FLOW_LAST)select(value);});
  element.querySelector('[data-head-analysis]').addEventListener('click',event=>{if(event.target.closest('[data-geometry-study]'))pause();});
  const doc=element.ownerDocument,hidden=()=>{if(doc.hidden){pause();projectionPlayer?.destroy();projectionPlayer=null;}};
  const reduced=()=>{if(preference?.matches){pause();projectionPlayer?.destroy();projectionPlayer=null;}};
  doc.addEventListener('visibilitychange',hidden);preference?.addEventListener?.('change',reduced);
  let observer;
  if(typeof IntersectionObserver!=='undefined'){observer=new IntersectionObserver(entries=>{if(!entries[0].isIntersecting){pause();projectionPlayer?.destroy();projectionPlayer=null;}},{threshold:.1});observer.observe(element);}
  pause();render();
  return {state:()=>({key,row,step,playing}),destroy:()=>{pause();projectionPlayer?.destroy();observer?.disconnect();doc.removeEventListener('visibilitychange',hidden);preference?.removeEventListener?.('change',reduced);}};
}
