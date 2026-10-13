import {CONFIG,extensionView,extensionTransfers} from './extension-views.js';
import {animateTransfers} from './flow.js';
export function createExtensionStudies(root,{motion={matches:false,addEventListener(){}},schedule=setTimeout,cancel=clearTimeout}={}){
 const controllers=[];
 for(const surface of root.querySelectorAll('[data-extension-study]')){
  const kind=surface.dataset.extensionStudy,c=CONFIG[kind],last=c.stages.length-1,body=surface.querySelector('[data-extension-view]');
  let step=last,playing=false,timer=null;
  const options=()=>Object.fromEntries([...surface.querySelectorAll('[data-ext-option]')].map(input=>[input.dataset.extOption,typeof c.defaults[input.dataset.extOption]==='number'?Number(input.value):input.value]));
  const stop=()=>{if(timer!==null)cancel(timer);timer=null;playing=false;body.querySelectorAll('svg').forEach(svg=>svg.pauseAnimations?.());};
  const sync=()=>{
   surface.dataset.running=String(playing);surface.dataset.extPhase=String(step);
   surface.querySelectorAll('[data-ext-step]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.extStep)===step)));
   surface.querySelectorAll('[data-ext-output]').forEach(output=>output.textContent=surface.querySelector('[data-ext-option="'+output.dataset.extOutput+'"]').value);
   const play=surface.querySelector('[data-ext-play]');play.textContent=playing?'Pause':motion.matches?'Show result':step===last?'Replay':'Play';play.setAttribute('aria-pressed',String(playing));
   const status=surface.querySelector('[data-ext-status]');status.textContent=c.stages[step]+(playing?' · playing.':' · inspect the displayed calculation.');
  };
  const render=(animate=false)=>{body.innerHTML=extensionView(kind,options(),step);sync();if(animate&&!motion.matches)animateTransfers(body,extensionTransfers(kind,step,options()));};
  const pause=()=>{stop();sync();};
  const advance=()=>{if(playing&&step<last)timer=schedule(()=>{timer=null;step++;if(step===last)playing=false;render(true);advance();},2300);};
  surface.querySelector('[data-ext-play]').addEventListener('click',()=>{
   if(playing){pause();return;}stop();
   if(motion.matches){step=last;render();return;}
   if(step===last)step=0;playing=true;render(true);advance();
  });
  surface.querySelector('[data-ext-next]').addEventListener('click',()=>{stop();step=step===last?0:step+1;render(true);});
  surface.querySelector('[data-ext-reset]').addEventListener('click',()=>{stop();step=0;render();});
  surface.querySelectorAll('[data-ext-step]').forEach(button=>button.addEventListener('click',()=>{stop();step=Number(button.dataset.extStep);render(true);}));
  surface.querySelectorAll('[data-ext-option]').forEach(input=>input.addEventListener(input.tagName==='SELECT'?'change':'input',()=>{stop();step=last;render();}));
  surface.querySelector('[data-ext-update]')?.addEventListener('click',()=>{
   stop();const input=surface.querySelector('[data-ext-option=updates]');input.value=String(Math.min(Number(input.getAttribute('max')),Number(input.value)+1));step=last;render(true);
  });
  body.addEventListener('click',event=>{
   const button=event.target.closest('[data-ext-patch]');if(!button)return;
   stop();const input=surface.querySelector('[data-ext-option=patch]');
   for(const option of input.options)option.selected=false;
   [...input.options].find(option=>option.value===button.dataset.extPatch).selected=true;
   step=last;render(true);
  });
  const observer=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)pause();});observer?.observe(surface);
  controllers.push({pause,state:()=>({kind,step,playing,...options()})});render();
 }
 root.addEventListener('visibilitychange',()=>{if(root.hidden)controllers.forEach(controller=>controller.pause());});
 motion.addEventListener?.('change',()=>{if(motion.matches)controllers.forEach(controller=>controller.pause());});
 return controllers;
}
