import {TOPICS,TOUR_DURATION,tourFrame,topicMotion} from './opening-model.js';
import {openingFigure} from './opening-view.js';

export function createOpeningStudy(root,viewport){
  const figure=root.querySelector('[data-opening-study]');
  if(!figure)return;
  const preference=viewport.matchMedia('(prefers-reduced-motion: reduce)');
  const dialog=root.createElement('dialog');
  dialog.className='system-dialog';dialog.setAttribute('aria-labelledby','system-dialog-title');
  dialog.innerHTML=`<div class="system-dialog-heading"><h2 id="system-dialog-title">A notebook of questions</h2><button type="button" data-opening-close>Close</button></div>${openingFigure('enlarged')}`;
  root.body.append(dialog);
  const surfaces=[figure,dialog];
  const each=(selector,fn)=>surfaces.forEach(surface=>surface.querySelectorAll(selector).forEach(fn));
  let index=0,phase=.5,elapsed=0,playing=false,frame=null,lastTime=null,inView=true,autoStarted=false,lastCaption=-1;
  const visible=()=>root.visibilityState!=='hidden'&&(inView||dialog.open);

  function render(){
    const layer=TOPICS[index];
    each('[data-opening-topic]',element=>{
      const active=Number(element.dataset.openingTopic)===index;
      element.dataset.active=String(active);element.setAttribute('aria-pressed',String(active));
      const motion=topicMotion(Number(element.dataset.openingTopic),active?phase:.5);
      element.querySelector('.topic-meter').setAttribute('width',active?String(280*phase):'0');
      element.querySelectorAll('[data-tile]').forEach(tile=>tile.dataset.lit=String(Number(tile.dataset.tile)<=motion.tile));
      element.querySelectorAll('[data-cache]').forEach(tile=>tile.dataset.lit=String(Number(tile.dataset.cache)<=motion.cache));
      element.querySelector('[data-hardware-packet]')?.setAttribute('transform',`translate(${active&&!preference.matches?phase*24:0} 0)`);
      const point=element.querySelector('[data-curve-point]');
      point?.setAttribute('cx',String(motion.curveX));point?.setAttribute('cy',String(motion.curveY));
      const history=element.querySelector('[data-context-history]');
      history?.setAttribute('opacity',String(1-motion.context*.8));
      history?.setAttribute('transform',`translate(${motion.context*32} 0) scale(${1-motion.context*.2} 1)`);
      element.querySelector('[data-context-summary]')?.setAttribute('opacity',String(.3+motion.context*.7));
      element.querySelector('[data-inspection-rule]')?.setAttribute('transform',`translate(${(active?phase:.5)*170-85} 0)`);
      element.querySelectorAll('[data-decision]').forEach(box=>box.dataset.lit=String(Number(box.dataset.decision)===motion.decision));
    });
    each('[data-opening-play]',button=>{button.textContent=playing?'Pause':elapsed>=TOUR_DURATION?'Replay previews':'Play previews';button.setAttribute('aria-pressed',String(playing));});
    each('[data-opening-position]',slider=>{slider.value=String(index);slider.setAttribute('aria-valuetext',`${index+1} of 6: ${layer.label}`);});
    each('[data-opening-counter]',output=>output.textContent=`${index+1} / 6`);
    if(lastCaption!==index){
      each('[data-opening-question]',node=>node.textContent=layer.question);
      each('[data-opening-description]',node=>node.textContent=layer.description);
      each('[data-opening-link]',node=>{node.href='#'+layer.id;node.textContent='Explore '+layer.label+' →';});
      lastCaption=index;
    }
  }
  function cancelFrame(){if(frame!==null)viewport.cancelAnimationFrame(frame);frame=null;lastTime=null;}
  function pause(){playing=false;cancelFrame();render();}
  function tick(now){
    frame=null;if(!playing||!visible()){lastTime=null;return;}
    if(lastTime!==null)elapsed+=Math.min(100,Math.max(0,now-lastTime));
    lastTime=now;
    const state=tourFrame(elapsed);index=state.index;phase=state.phase;
    if(state.finished){elapsed=TOUR_DURATION;playing=false;lastTime=null;}
    render();if(playing)frame=viewport.requestAnimationFrame(tick);
  }
  function schedule(){if(playing&&visible()&&frame===null)frame=viewport.requestAnimationFrame(tick);}
  function play(){
    if(preference.matches){pause();index=TOPICS.length-1;phase=1;elapsed=TOUR_DURATION;render();return;}
    if(elapsed>=TOUR_DURATION){index=0;phase=0;elapsed=0;}
    playing=true;lastTime=null;render();schedule();
  }
  function select(next){pause();index=Math.max(0,Math.min(5,Number(next)||0));phase=.5;elapsed=(index+.5)*TOUR_DURATION/TOPICS.length;render();}
  each('[data-opening-topic]',element=>{
    element.addEventListener('click',()=>select(element.dataset.openingTopic));
    element.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();select(element.dataset.openingTopic);}});
  });
  each('[data-opening-play]',button=>button.addEventListener('click',()=>playing?pause():play()));
  each('[data-opening-next]',button=>button.addEventListener('click',()=>select((index+1)%TOPICS.length)));
  each('[data-opening-restart]',button=>button.addEventListener('click',()=>{pause();index=0;phase=0;elapsed=0;render();}));
  each('[data-opening-position]',slider=>slider.addEventListener('input',()=>select(slider.value)));
  const enlarge=figure.querySelector('[data-opening-enlarge]');
  if(typeof dialog.showModal==='function'){
    enlarge.addEventListener('click',()=>{pause();dialog.showModal();dialog.querySelector('[data-opening-close]').focus();});
    dialog.querySelector('[data-opening-close]').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('close',()=>{pause();enlarge.focus();});
    dialog.querySelector('[data-opening-link]').addEventListener('click',()=>dialog.close());
  }else enlarge.hidden=true;
  root.addEventListener('visibilitychange',()=>{cancelFrame();schedule();});
  preference.addEventListener?.('change',()=>{if(preference.matches)pause();render();});
  const startOnce=()=>{if(!autoStarted&&visible()){autoStarted=true;if(!preference.matches){elapsed=0;phase=0;play();}}};
  if(viewport.IntersectionObserver){
    new viewport.IntersectionObserver(entries=>{inView=entries.some(entry=>entry.isIntersecting);cancelFrame();startOnce();schedule();},{threshold:.1}).observe(figure);
  }else startOnce();
  viewport.addEventListener('pagehide',pause);
  render();
  return {pause,play,select,state:()=>({index,phase,elapsed,playing})};
}
