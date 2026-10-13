import {OVERVIEW_TOPICS,overviewTopic} from './overview-model.js';
import {overviewCanvas} from './overview-view.js';

export function createOverview(root,{motion={matches:false},schedule=setTimeout,cancel=clearTimeout,Observer=globalThis.IntersectionObserver}={}){
  const surface=root.querySelector('[data-overview]');
  if(!surface)return null;
  const canvas=surface.querySelector('[data-overview-canvas]');
  const dialog=surface.querySelector('[data-overview-dialog]'),expanded=surface.querySelector('[data-overview-expanded]');
  let index=0,playing=false,timer=null,inView=true,disposed=false,returnFocus=true;
  const stop=()=>{if(timer!==null)cancel(timer);timer=null;playing=false;};
  const centre=(drawing,topic)=>{
    if(!drawing||drawing.scrollWidth<=drawing.clientWidth)return;
    const node=drawing.querySelector(`[data-topic="${topic}"]`),frame=drawing.getBoundingClientRect?.(),bounds=node?.getBoundingClientRect?.();
    if(!frame?.width||!bounds?.width)return;
    const left=Math.max(0,Math.min(drawing.scrollWidth-drawing.clientWidth,(drawing.scrollLeft||0)+bounds.left-frame.left+(bounds.width-drawing.clientWidth)/2));
    drawing.scrollTo?.({left,behavior:motion.matches?'instant':'smooth'});
  };
  const render=(pan=false)=>{
    const topic=OVERVIEW_TOPICS[index];
    surface.dataset.running=String(playing);
    surface.dataset.overviewTopic=topic.id;
    canvas.innerHTML=overviewCanvas(topic.id,{running:playing&&!motion.matches});
    if(expanded)expanded.innerHTML=overviewCanvas(topic.id,{running:playing&&!motion.matches&&dialog?.hasAttribute('open'),prefix:'expanded-map'});
    surface.querySelectorAll('button[data-overview-select]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.overviewSelect===topic.id)));
    surface.querySelectorAll('[data-overview-place]').forEach(el=>el.textContent=topic.place);
    surface.querySelectorAll('[data-overview-title]').forEach(el=>el.textContent=topic.number+'. '+topic.title);
    surface.querySelectorAll('[data-overview-description]').forEach(el=>el.textContent=topic.description);
    surface.querySelectorAll('[data-overview-read]').forEach(read=>{read.setAttribute('href','#'+topic.id);read.innerHTML='Read section '+topic.number+' <span aria-hidden="true">→</span>';});
    surface.querySelectorAll('[data-overview-play]').forEach(play=>{play.textContent=motion.matches?'Show next topic':playing?'Pause':index===OVERVIEW_TOPICS.length-1?'Replay the tour':'Play the tour';play.setAttribute('aria-pressed',String(playing));});
    surface.querySelectorAll('[data-overview-position]').forEach(el=>el.textContent=(index+1)+' / '+OVERVIEW_TOPICS.length);
    if(pan){centre(canvas,topic.id);if(dialog?.hasAttribute('open'))centre(expanded,topic.id);}
  };
  const advance=()=>{
    if(!playing)return;
    timer=schedule(()=>{
      timer=null;
      // Let the last topic's schematic movement finish before ending the tour.
      if(index===OVERVIEW_TOPICS.length-1){stop();render();return;}
      index++;render(true);advance();
    },3100);
  };
  const pause=()=>{stop();render();};
  const select=id=>{overviewTopic(id);stop();index=OVERVIEW_TOPICS.findIndex(t=>t.id===id);render(true);};
  const click=event=>{
    const target=event.target.closest?.('[data-overview-select],[data-overview-play],[data-overview-next],[data-overview-restart],[data-overview-enlarge],[data-overview-close],[data-overview-read]');
    if(!target||!surface.contains(target))return;
    if(target.hasAttribute('data-overview-select')){
      if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      event.preventDefault();const id=target.dataset.overviewSelect;
      const fromDrawing=canvas.contains(target),fromExpanded=expanded?.contains(target);select(id);
      if(fromExpanded)dialog.querySelector('[data-overview-read]').focus();
      else if(fromDrawing)surface.querySelector(`button[data-overview-select="${id}"]`).focus();
    }else if(target.hasAttribute('data-overview-enlarge')){
      pause();returnFocus=true;if(dialog&&!dialog.hasAttribute('open')){dialog.showModal?dialog.showModal():dialog.setAttribute('open','');render(true);}
    }else if(target.hasAttribute('data-overview-close')){
      pause();if(dialog?.close)dialog.close();else{dialog?.removeAttribute('open');surface.querySelector('[data-overview-enlarge]')?.focus();}
    }else if(target.hasAttribute('data-overview-read')){
      pause();if(dialog?.hasAttribute('open')){returnFocus=false;if(dialog.close)dialog.close();else dialog.removeAttribute('open');}
    }else if(target.hasAttribute('data-overview-play')){
      if(playing){pause();return;}
      if(motion.matches){stop();index=(index+1)%OVERVIEW_TOPICS.length;render(true);return;}
      if(!inView||root.hidden){pause();return;}
      if(index===OVERVIEW_TOPICS.length-1)index=0;
      playing=true;render(true);advance();
    }else if(target.hasAttribute('data-overview-next')){
      stop();index=(index+1)%OVERVIEW_TOPICS.length;render(true);
    }else{stop();index=0;render(true);}
  };
  const hidden=()=>{if(root.hidden)pause();};
  const changed=()=>{if(motion.matches)pause();};
  const closed=()=>{pause();if(returnFocus)surface.querySelector('[data-overview-enlarge]')?.focus();};
  surface.addEventListener('click',click);
  root.addEventListener('visibilitychange',hidden);
  motion.addEventListener?.('change',changed);
  dialog?.addEventListener('close',closed);
  let observer=null;
  if(Observer){try{observer=new Observer(entries=>{inView=entries.some(entry=>entry.isIntersecting);if(!inView)pause();});observer.observe(surface);}catch{observer=null;}}
  render(true);
  return {select,pause,state:()=>({index,topic:OVERVIEW_TOPICS[index].id,playing,inView}),dispose(){if(disposed)return;disposed=true;stop();observer?.disconnect();surface.removeEventListener('click',click);root.removeEventListener('visibilitychange',hidden);motion.removeEventListener?.('change',changed);dialog?.removeEventListener('close',closed);}};
}
