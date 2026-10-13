import {ropeView,ropeTransfers,STAGES} from './rope-view.js';
import {animateTransfers} from './flow.js';
export function createRopeStudies(root,{motion={matches:false,addEventListener(){}},schedule=setTimeout,cancel=clearTimeout,frame=globalThis.requestAnimationFrame?.bind(globalThis),cancelFrame=globalThis.cancelAnimationFrame?.bind(globalThis),now=()=>performance.now()}={}){
  const controllers=[];
  for(const surface of root.querySelectorAll('[data-rope-study]')){
    const kind=surface.dataset.ropeStudy,body=surface.querySelector('[data-rope-view]');
    let step=3,progress=1,playing=false,timer=null,animation=null,relative=false;
    const options=()=>Object.fromEntries([...surface.querySelectorAll('[data-rope-option]')].map(input=>[input.dataset.ropeOption,input.tagName==='SELECT'&&!['degrees'].includes(input.dataset.ropeOption)?input.value:Number(input.value)]));
    const stop=()=>{if(timer!==null)cancel(timer);timer=null;if(animation!==null)cancelFrame?.(animation);animation=null;playing=false;body.querySelectorAll('svg').forEach(svg=>svg.pauseAnimations?.());};
    const controls=()=>{
      surface.dataset.running=String(playing);
      surface.querySelectorAll('[data-rope-step]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.ropeStep)===step)));
      surface.querySelectorAll('[data-rope-frame]').forEach(button=>button.setAttribute('aria-pressed',String((button.dataset.ropeFrame==='relative')===relative)));
      surface.querySelectorAll('[data-rope-output]').forEach(output=>output.textContent=surface.querySelector('[data-rope-option="'+output.dataset.ropeOutput+'"]').value);
      const play=surface.querySelector('[data-rope-play]');
      if(play){play.textContent=playing?'Pause':motion.matches?'Show result':step===3?'Replay':'Play';play.setAttribute('aria-pressed',String(playing));}
      const status=surface.querySelector('[data-rope-status]');
      if(status){const message=STAGES[kind][step]+(playing?' · playing.':progress>0&&progress<1?' · paused during the rotation.':' · inspect the displayed values.');if(status.textContent!==message)status.textContent=message;}
    };
    const render=()=>{body.innerHTML=ropeView(kind,{...options(),step,progress,relative});controls();};
    const pause=()=>{stop();controls();};
    const rotate=()=>{
      if(motion.matches||!frame){progress=1;render();return;}
      const start=now(),initial=progress;
      const tick=timestamp=>{
        const t=Math.min(1,Math.max(0,(timestamp-start)/1600)),ease=t*t*(3-2*t);
        progress=initial+(1-initial)*ease;render();
        animation=t<1?frame(tick):null;
      };
      animation=frame(tick);
    };
    const enter=next=>{
      if(animation!==null)cancelFrame?.(animation);animation=null;
      step=next;progress=step===0||step===1?0:1;
      render();
      if(step===1)rotate();
      else if(!motion.matches)animateTransfers(body,ropeTransfers(kind,step,{...options(),relative}));
    };
    const advance=()=>{if(playing&&step<3)timer=schedule(()=>{timer=null;const next=step+1;if(next===3)playing=false;enter(next);advance();},2300);};
    surface.querySelectorAll('[data-rope-option]').forEach(input=>input.addEventListener(input.tagName==='SELECT'?'change':'input',()=>{stop();step=3;progress=1;render();}));
    surface.querySelectorAll('[data-rope-frame]').forEach(button=>button.addEventListener('click',()=>{stop();relative=button.dataset.ropeFrame==='relative';step=3;progress=1;render();}));
    surface.querySelectorAll('[data-rope-step]').forEach(button=>button.addEventListener('click',()=>{stop();enter(Number(button.dataset.ropeStep));}));
    surface.querySelector('[data-rope-play]')?.addEventListener('click',()=>{
      if(playing){pause();return;}
      stop();
      if(motion.matches){step=3;progress=1;render();return;}
      if(step===3){step=0;progress=0;}
      playing=true;render();if(step===1&&progress<1)rotate();advance();
    });
    surface.querySelector('[data-rope-next]')?.addEventListener('click',()=>{stop();enter(step===3?0:step+1);});
    surface.querySelector('[data-rope-reset]')?.addEventListener('click',()=>{stop();enter(0);});
    surface.querySelectorAll('[data-rope-move]').forEach(button=>button.addEventListener('click',()=>{
      const input=surface.querySelector('[data-rope-option="'+button.dataset.ropeMove+'"]');
      input.value=String(Number(input.value)>=Number(input.max)?Number(input.min):Number(input.value)+1);render();
    }));
    surface.querySelector('[data-rope-position-reset]')?.addEventListener('click',()=>{
      surface.querySelector('[data-rope-option=shift]').value='0';surface.querySelector('[data-rope-option=gap]').value='1';render();
    });
    const observer=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)pause();});observer?.observe(surface);
    controllers.push({pause,state:()=>({kind,step,progress,playing,relative,...options()})});render();
  }
  root.addEventListener('visibilitychange',()=>{if(root.hidden)controllers.forEach(controller=>controller.pause());});
  motion.addEventListener?.('change',()=>{if(motion.matches)controllers.forEach(controller=>controller.pause());});
  return controllers;
}
