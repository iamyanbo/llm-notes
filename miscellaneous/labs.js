import {LAB_SPECS,modelFor,lastLabStep} from './lab-models.js';
import {viewFor} from './lab-view.js';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createLab(element,{viewport=window,root=document}={}){
  const kind=element.dataset.lab,spec=LAB_SPECS[kind];
  if(!spec)throw new Error('Unimplemented interactive study '+kind);
  let state={step:spec.initial??0,choice:0,amount:spec.default},playing=false,timer=null,lastTime=null,visible=true;
  const preference=viewport.matchMedia('(prefers-reduced-motion: reduce)');
  const content=element.querySelector('[data-lab-content]'),surfaces=[element];
  const markup='<div data-lab-canvas></div><div class="lab-controls"><button type="button" data-lab-play aria-pressed="false">Play</button><button type="button" data-lab-next>Next</button><button type="button" data-lab-restart>Restart</button>'+(spec.choice?'<label>View <select data-lab-choice>'+spec.choice.map((label,i)=>'<option value="'+i+'">'+escape(label)+'</option>').join('')+'</select></label>':'')+(spec.label?'<label>'+escape(spec.label)+' <input type="range" data-lab-amount min="'+spec.min+'" max="'+spec.max+'" step="1" value="'+spec.default+'"><output data-lab-amount-output>'+spec.default+'</output></label>':'')+'</div><p class="lab-status" data-lab-status role="status"></p><p class="lab-note" data-lab-note></p>';
  content.innerHTML=markup;
  const enlarge=root.createElement('button');enlarge.type='button';enlarge.dataset.labEnlarge='';enlarge.textContent='Enlarge';
  element.querySelector('.lab-controls').append(enlarge);
  let dialog=null;
  function bind(surface){
    surface.querySelector('[data-lab-play]').addEventListener('click',()=>playing?pause():play());
    surface.querySelector('[data-lab-next]').addEventListener('click',()=>{pause();state.step=state.step>=limit()?0:state.step+1;render();});
    surface.querySelector('[data-lab-restart]').addEventListener('click',()=>{pause();state.step=0;render();});
    surface.querySelector('[data-lab-amount]')?.addEventListener('input',event=>{const value=Number(event.target.value);pause();state.amount=value;state.step=Math.min(spec.initial??state.step,limit());render();});
    surface.querySelector('[data-lab-choice]')?.addEventListener('change',event=>{const value=Number(event.target.value);pause();state.choice=value;state.step=Math.min(spec.initial??0,limit());render();});
  }
  enlarge.addEventListener('click',()=>{
    pause();
    if(!dialog){
      dialog=root.createElement('dialog');dialog.className='system-dialog lab-dialog';
      dialog.setAttribute('aria-label',element.getAttribute('aria-label'));
      dialog.innerHTML='<div class="system-dialog-heading"><h2>'+escape(element.querySelector('h5').textContent)+'</h2><button type="button" data-lab-close>Close</button></div><div class="essay-lab">'+markup+'</div>';
      root.body.append(dialog);
      if(typeof dialog.showModal!=='function'){dialog.remove();dialog=null;enlarge.hidden=true;return;}
      const enlarged=dialog.querySelector('.essay-lab');surfaces.push(enlarged);bind(enlarged);
      dialog.querySelector('[data-lab-close]').addEventListener('click',()=>dialog.close());
      dialog.addEventListener('close',()=>{pause();enlarge.focus();});
    }
    render();dialog.showModal();dialog.querySelector('[data-lab-close]').focus();
  });
  const limit=()=>lastLabStep(kind,state);
  function render(){
    const view=viewFor(modelFor(kind,state));
    for(const surface of surfaces){
      surface.dataset.labViewChanged=String(surface.dataset.labSelectedView!==undefined&&Number(surface.dataset.labSelectedView)!==state.choice);
      surface.dataset.labSelectedView=String(state.choice);
      surface.querySelector('[data-lab-canvas]').innerHTML=view.html;
      surface.dataset.labPlaying=String(playing);
      surface.querySelector('[data-lab-status]').textContent=view.status;
      surface.querySelector('[data-lab-note]').textContent=view.note;
      const playButton=surface.querySelector('[data-lab-play]');
      playButton.textContent=playing?'Pause':state.step>=limit()?'Replay':'Play';
      playButton.setAttribute('aria-pressed',String(playing));
      const output=surface.querySelector('[data-lab-amount-output]');if(output)output.textContent=state.amount;
      const slider=surface.querySelector('[data-lab-amount]');if(slider){slider.value=String(state.amount);slider.closest('label').hidden=spec.amountChoice!==undefined&&state.choice!==spec.amountChoice;}
      const selector=surface.querySelector('[data-lab-choice]');
      if(selector)for(const option of selector.options)option.selected=Number(option.value)===state.choice;
    }
  }
  function cancel(){if(timer!==null)viewport.cancelAnimationFrame(timer);timer=null;lastTime=null;}
  function pause(){playing=false;cancel();render();}
  const canRun=()=>(visible||dialog?.open)&&root.visibilityState!=='hidden';
  function tick(now){
    timer=null;if(!playing||!canRun()){lastTime=null;return;}
    if(lastTime===null)lastTime=now;
    if(now-lastTime>=750){state.step=Math.min(limit(),state.step+1);lastTime=now;if(state.step>=limit())playing=false;render();}
    if(playing)timer=viewport.requestAnimationFrame(tick);
  }
  function schedule(){if(playing&&canRun()&&timer===null)timer=viewport.requestAnimationFrame(tick);}
  function play(){
    if(preference.matches){pause();state.step=limit();render();return;}
    if(state.step>=limit())state.step=0;
    playing=true;lastTime=null;render();schedule();
  }
  bind(element);
  root.addEventListener('visibilitychange',()=>{cancel();schedule();});
  preference.addEventListener?.('change',()=>{if(preference.matches)pause();});
  if(viewport.IntersectionObserver)new viewport.IntersectionObserver(entries=>{visible=entries.some(entry=>entry.isIntersecting);cancel();schedule();},{threshold:.05}).observe(element);
  viewport.addEventListener('pagehide',pause);
  state.step=Math.min(state.step,limit());render();return {play,pause,state:()=>({...state,playing}),limit};
}
export function createLabs(root,viewport){return [...root.querySelectorAll('[data-lab]')].map(element=>createLab(element,{root,viewport}));}
