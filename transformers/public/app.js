import {LAB_LABELS,cacheView,tilesView,expertsView,precisionView,speculationView} from './views.js';
import {animateFlow} from './flow.js';
import {createOverview} from './overview-controller.js';
import {createReaderNavigation,createReadingProgress} from './reader.js';
import {createRopeStudies} from './rope-controller.js';
import {createExtensionStudies} from './extension-controller.js';
const preference=matchMedia('(prefers-reduced-motion: reduce)');
const views={cache:cacheView,tiles:tilesView,experts:expertsView,precision:precisionView,speculation:speculationView};
export function createLabs(root=document,{schedule=setTimeout,cancel=clearTimeout,motion=preference}={}){
  const controllers=[];
  root.querySelectorAll('[data-lab]').forEach(surface=>{
    const kind=surface.dataset.lab,labels=LAB_LABELS[kind];let step=0,playing=false,timer=null;
    const options=()=>Object.fromEntries([...surface.querySelectorAll('[data-option]')].map(e=>[e.dataset.option,Number(e.value)]));
    const stop=()=>{if(timer!==null)cancel(timer);timer=null;playing=false;};
    const render=(animate=false)=>{
      surface.dataset.step=String(step);surface.dataset.running=String(playing);
      surface.querySelector('[data-lab-view]').innerHTML=views[kind]({step,...options()});
      if(animate&&!motion.matches)animateFlow(surface,kind,step,options());
      surface.querySelectorAll('[data-lab-step]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.labStep)===step)));
      const play=surface.querySelector('[data-lab-play]');play.textContent=playing?'Pause':motion.matches?'Show result':step===labels.length-1?'Replay':'Play';play.setAttribute('aria-pressed',String(playing));
      surface.querySelectorAll('[data-option-label]').forEach(o=>o.textContent=surface.querySelector(`[data-option="${o.dataset.optionLabel}"]`).value);
    };
    const pause=()=>{stop();surface.dataset.running='false';surface.querySelectorAll('svg').forEach(s=>s.pauseAnimations?.());const b=surface.querySelector('[data-lab-play]');b.textContent='Play';b.setAttribute('aria-pressed','false');};
    const advance=()=>{if(playing&&step<labels.length-1)timer=schedule(()=>{timer=null;step++;if(step===labels.length-1)playing=false;render(true);advance();},2100);};
    surface.querySelector('[data-lab-play]').addEventListener('click',()=>{const resume=!playing;stop();if(!resume){pause();return;}if(motion.matches){step=labels.length-1;render();return;}if(step===labels.length-1)step=0;playing=true;render();advance();});
    surface.querySelector('[data-lab-next]').addEventListener('click',()=>{stop();step=step===labels.length-1?0:step+1;render(true);});
    surface.querySelector('[data-lab-reset]').addEventListener('click',()=>{stop();step=0;render();});
    surface.querySelectorAll('[data-lab-step]').forEach(b=>b.addEventListener('click',()=>{stop();step=Number(b.dataset.labStep);render(true);}));
    surface.querySelectorAll('[data-option]').forEach(e=>e.addEventListener(e.tagName==='SELECT'?'change':'input',()=>{stop();render();}));
    const observer=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)pause();});observer?.observe(surface);
    controllers.push({pause,state:()=>({step,playing,...options()})});render();
  });
  root.addEventListener('visibilitychange',()=>{if(root.hidden)controllers.forEach(p=>p.pause());});
  motion.addEventListener?.('change',()=>{if(motion.matches)controllers.forEach(p=>p.pause());});
  return controllers;
}
createLabs();
if(typeof window!=='undefined'){createReaderNavigation(document,window);createReadingProgress(document,window);createRopeStudies(document,{motion:preference});createExtensionStudies(document,{motion:preference});}
createOverview(document,{motion:preference});
const theme=document.querySelector('[data-theme-toggle]');let choice;
try{choice=localStorage.getItem('language-notes-theme');}catch{}
if(choice==='light'||choice==='dark')document.documentElement.dataset.theme=choice;
theme?.addEventListener('click',()=>{const current=document.documentElement.dataset.theme==='dark'||(!document.documentElement.dataset.theme&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=current?'light':'dark';try{localStorage.setItem('language-notes-theme',current?'light':'dark');}catch{}});
