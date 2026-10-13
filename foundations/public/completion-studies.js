import {createArchitectureOperations} from './architecture-operations.js';
import {generationView,trainingView,tokenTextView} from './completion-view.js';
import {generationData,chooseToken,TEXT_PIECES} from './generation-model.js';
import {drawGenerationFlow} from './generation-flow.js';
export function createCompletionStudies(document,preference,{schedule=setTimeout,cancel=clearTimeout}={}){
  document.querySelectorAll('[data-chapter-calculation]').forEach(surface=>{
    const player=createArchitectureOperations(surface,preference);
    player.update({key:surface.querySelector('[data-stage-study]').dataset.stageExpansion,running:false});
    if(typeof IntersectionObserver!=='undefined')new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)player.suspend();}).observe(surface);
  });
  const players=[];
  const controlled=(surface,length,render,{start=0}={})=>{
    let step=start,playing=false,timer=null;
    const stop=()=>{if(timer!==null)cancel(timer);timer=null;playing=false;};
    const paint=(animate=false)=>render(step,playing,animate);
    const advance=()=>{if(playing&&step<length()-1)timer=schedule(()=>{timer=null;step++;if(step===length()-1)playing=false;paint(true);advance();},1900);};
    const pause=()=>{stop();paint();};
    const api={get step(){return step;},set(next){stop();step=next;paint(true);},next(){stop();step=step===length()-1?0:step+1;paint(true);},play(){const was=playing;stop();if(was){paint();return;}if(preference.matches){step=length()-1;paint();return;}if(step===length()-1)step=0;playing=true;paint(true);advance();},pause};
    players.push(api);paint();
    if(typeof IntersectionObserver!=='undefined')new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)pause();}).observe(surface);
    return api;
  };
  document.querySelectorAll('[data-training]').forEach(surface=>{
    const p=controlled(surface,()=>6,(row,playing)=>{
      surface.querySelector('[data-training-view]').innerHTML=trainingView(row);
      surface.querySelectorAll('[data-training-row]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.trainingRow)===row)));
      const b=surface.querySelector('[data-training-play]');b.textContent=playing?'Pause':'Follow the targets';b.setAttribute('aria-pressed',String(playing));
    },{start:2});
    surface.querySelectorAll('[data-training-row]').forEach(b=>b.addEventListener('click',()=>p.set(Number(b.dataset.trainingRow))));
    surface.querySelector('[data-training-next]').addEventListener('click',()=>p.next());
    surface.querySelector('[data-training-play]').addEventListener('click',()=>p.play());
  });
  document.querySelectorAll('[data-token-text]').forEach(surface=>{
    const p=controlled(surface,()=>TEXT_PIECES.length+1,(count,playing)=>{
      surface.querySelector('[data-token-text-view]').innerHTML=tokenTextView(count);
      const b=surface.querySelector('[data-text-play]');b.textContent=playing?'Pause':'Play decoding';b.setAttribute('aria-pressed',String(playing));
    });
    surface.querySelector('[data-text-play]').addEventListener('click',()=>p.play());
    surface.querySelector('[data-text-next]').addEventListener('click',()=>p.next());
    surface.querySelector('[data-text-reset]').addEventListener('click',()=>p.set(0));
  });
  document.querySelectorAll('[data-generation]').forEach(surface=>{
    let prefix=[0,1],data=generationData(prefix),chosen=null,appended=false,temperature=1;
    const begin=()=>{data=generationData(prefix,temperature);chosen=null;appended=false;};
    const p=controlled(surface,()=>5,(step,playing,animate)=>{
      if(step===4&&!appended&&prefix.length<8){chosen??=chooseToken(data.probabilities,{sample:surface.querySelector('[data-generation-choice]').value==='sample'});prefix=[...prefix,chosen];appended=true;}
      surface.querySelector('[data-generation-view]').innerHTML=generationView({prefix,data,step,chosen});
      if(animate&&!preference.matches)drawGenerationFlow(surface,data,step,chosen,prefix);
      const b=surface.querySelector('[data-generation-play]');b.textContent=playing?'Pause':'Play one token';b.setAttribute('aria-pressed',String(playing));
      for(const selector of ['[data-generation-next]','[data-generation-play]','[data-generation-temperature]'])surface.querySelector(selector).disabled=prefix.length>=8;
      if(prefix.length>=8)surface.querySelectorAll('[data-generation-token]').forEach(b=>b.disabled=true);
      surface.dataset.running=String(playing);
    });
    surface.querySelector('[data-generation-view]').addEventListener('click',e=>{const b=e.target.closest('[data-generation-token]');if(b&&!b.disabled){chosen=Number(b.dataset.generationToken);p.set(4);}});
    surface.querySelector('[data-generation-next]').addEventListener('click',()=>{if(p.step===4)begin();p.next();});
    surface.querySelector('[data-generation-play]').addEventListener('click',()=>{if(p.step===4)begin();p.play();});
    surface.querySelector('[data-generation-reset]').addEventListener('click',()=>{prefix=[0,1];begin();p.set(0);});
    surface.querySelector('[data-generation-temperature]').addEventListener('input',e=>{temperature=Number(e.target.value);surface.querySelector('[data-temperature-label]').textContent=temperature.toFixed(1);begin();p.set(3);});
    surface.querySelector('[data-generation-choice]').addEventListener('change',()=>p.pause());
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)players.forEach(p=>p.pause());});
  preference.addEventListener?.('change',()=>{if(preference.matches)players.forEach(p=>p.pause());});
  return {pause:()=>players.forEach(p=>p.pause())};
}
