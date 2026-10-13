import {STUDIES,studyFrame} from './block-study-model.js';
import {blockStudyAnalysis,studyParameters} from './block-study-view.js';
export function createBlockStudy(root,{preference={matches:false},schedule=setTimeout,cancel=clearTimeout}={}){
  const kind=root.dataset.blockStudy,last=STUDIES[kind].labels.length-1;
  const options={map:'select',update:'example',relu:true,affine:false,shift:0,scale:1,layer:1};
  let step=0,timer=null,playing=false;
  const button=root.querySelector('[data-block-play]');
  const pause=()=>{if(timer!==null)cancel(timer);timer=null;playing=false;root.querySelector('svg')?.pauseAnimations?.();button.setAttribute('aria-pressed','false');button.textContent=preference.matches?'Show result':'Play calculation';};
  const render=()=>{
    root.querySelector('[data-block-analysis]').innerHTML=blockStudyAnalysis(kind,options,step,!preference.matches);
    const coefficients=root.querySelector('[data-block-parameters]');if(coefficients)coefficients.innerHTML=studyParameters(studyFrame(kind,options,step));
    for(const control of root.querySelectorAll('[data-block-step]'))control.setAttribute('aria-pressed',String(Number(control.dataset.blockStep)===step));
    for(const control of root.querySelectorAll('[data-block-option]'))control.setAttribute('aria-pressed',String(String(options[control.dataset.blockOption])===control.dataset.value));
  };
  const select=value=>{pause();step=value;render();};
  const tick=()=>{timer=null;step++;if(step===last)pause();render();if(playing)timer=schedule(tick,2100);};
  button.addEventListener('click',()=>{
    if(playing){pause();return;}
    if(preference.matches){select(last);return;}
    if(step===last){step=0;render();}
    playing=true;button.setAttribute('aria-pressed','true');button.textContent='Pause';root.querySelector('svg')?.unpauseAnimations?.();timer=schedule(tick,2100);
  });
  root.querySelector('[data-block-next]').addEventListener('click',()=>select(step===last?0:step+1));
  root.querySelector('[data-block-reset]').addEventListener('click',()=>select(0));
  for(const control of root.querySelectorAll('[data-block-step]'))control.addEventListener('click',()=>select(Number(control.dataset.blockStep)));
  for(const control of root.querySelectorAll('[data-block-option]'))control.addEventListener('click',()=>{options[control.dataset.blockOption]=control.dataset.blockOption==='layer'?Number(control.dataset.value):control.dataset.value;select(0);});
  for(const control of root.querySelectorAll('[data-block-toggle]'))control.addEventListener('change',()=>{options[control.dataset.blockToggle]=control.checked;select(0);});
  for(const control of root.querySelectorAll('[data-block-slider]'))control.addEventListener('input',()=>{
    const value=Number(control.value);if(!Number.isFinite(value))return;
    options[control.dataset.blockSlider]=value;root.querySelector(`[data-block-output="${control.dataset.blockSlider}"]`).textContent=String(value);select(0);
  });
  const hidden=()=>{if(root.ownerDocument.hidden)pause();},reduced=()=>{if(preference.matches){pause();render();}};
  root.ownerDocument.addEventListener('visibilitychange',hidden);preference.addEventListener?.('change',reduced);
  let observer;if(typeof IntersectionObserver!=='undefined'){observer=new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)pause();},{threshold:.1});observer.observe(root);}
  pause();render();
  return {state:()=>({step,playing,options:{...options}}),destroy:()=>{pause();observer?.disconnect();root.ownerDocument.removeEventListener('visibilitychange',hidden);preference.removeEventListener?.('change',reduced);}};
}
