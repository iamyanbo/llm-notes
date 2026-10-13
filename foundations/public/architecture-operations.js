import {OPERATION_KINDS} from './architecture-operations-model.js';
import {architectureOperationView} from './architecture-operations-view.js';
export function createArchitectureOperations(surface,preference,{onInspect=()=>{},schedule=setTimeout,cancel=clearTimeout}={}){
  const panels=[...surface.querySelectorAll('[data-stage-study]')];
  let key=null,kind=null,step=0,row=1,playing=false,timer=null,externalRunning=false,manual=false;
  const stop=()=>{if(timer!==null)cancel(timer);timer=null;};
  const activePanels=()=>panels.filter(p=>p.dataset.stageExpansion===key);
  const controls=()=>activePanels().forEach(panel=>{
    panel.dataset.operation=String(step);
    panel.querySelectorAll('[data-stage-operation]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.stageOperation)===step)));
    panel.querySelectorAll('[data-stage-row]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.stageRow)===row)));
    const b=panel.querySelector('[data-stage-play]');b.setAttribute('aria-pressed',String(playing));
    b.textContent=preference.matches?'Show result':playing?'Pause calculation':step===OPERATION_KINDS[kind].labels.length-1?'Replay calculation':'Play calculation';
  });
  const render=()=>{if(!kind)return;activePanels().forEach(p=>{p.querySelector('[data-stage-analysis]').innerHTML=architectureOperationView(kind,step,row,!preference.matches);});controls();};
  const pause=()=>{stop();playing=false;activePanels().forEach(p=>p.querySelector('svg')?.pauseAnimations?.());if(kind)controls();};
  const advance=()=>{stop();if(playing&&!preference.matches&&step<OPERATION_KINDS[kind].labels.length-1)timer=schedule(()=>{
    timer=null;step++;if(step===OPERATION_KINDS[kind].labels.length-1)playing=false;
    render();advance();
  },1800);};
  const inspect=panel=>{onInspect();if(key!==panel.dataset.stageExpansion){key=panel.dataset.stageExpansion;kind=panel.dataset.stageStudy;step=0;}manual=true;};
  panels.forEach(panel=>{
    panel.querySelectorAll('[data-stage-operation]').forEach(b=>b.addEventListener('click',()=>{inspect(panel);pause();step=Number(b.dataset.stageOperation);render();}));
    panel.querySelectorAll('[data-stage-row]').forEach(b=>b.addEventListener('click',()=>{inspect(panel);pause();row=Number(b.dataset.stageRow);step=0;render();}));
    panel.querySelector('[data-stage-next]').addEventListener('click',()=>{inspect(panel);pause();step=step===OPERATION_KINDS[kind].labels.length-1?0:step+1;render();});
    panel.querySelector('[data-stage-reset]').addEventListener('click',()=>{inspect(panel);pause();step=0;render();});
    panel.querySelector('[data-stage-play]').addEventListener('click',()=>{
      const resume=!playing;inspect(panel);pause();
      if(preference.matches){step=OPERATION_KINDS[kind].labels.length-1;render();return;}
      if(!resume)return;
      if(step===OPERATION_KINDS[kind].labels.length-1){step=0;render();}
      playing=true;activePanels().forEach(p=>p.querySelector('svg')?.unpauseAnimations?.());controls();advance();
    });
  });
  const owner=panels[0]?.ownerDocument;
  const hidden=()=>{if(owner?.hidden)pause();},reduced=()=>{if(preference.matches){pause();render();}};
  owner?.addEventListener('visibilitychange',hidden);preference.addEventListener?.('change',reduced);
  return {
    update(next){
      const panel=panels.find(p=>p.dataset.stageExpansion===next.key),newKey=panel?next.key:null;
      if(newKey!==key){
        pause();key=newKey;kind=panel?.dataset.stageStudy??null;step=0;manual=false;
        externalRunning=next.running;playing=!!kind&&next.running&&!preference.matches;
        render();advance();return;
      }
      if(next.running!==externalRunning){externalRunning=next.running;manual=false;playing=!!kind&&next.running&&!preference.matches;if(!playing)pause();else activePanels().forEach(p=>p.querySelector('svg')?.unpauseAnimations?.());if(kind)controls();advance();}
      else if(!manual&&!next.running)pause();
    },
    suspend:pause,
    state:()=>({key,kind,step,row,playing}),
    destroy:()=>{pause();owner?.removeEventListener('visibilitychange',hidden);preference.removeEventListener?.('change',reduced);},
  };
}
