import {architectureFigure,architectureGraphic,architectureDetail,architectureStages,createArchitecturePlayer,stageSpec} from './architecture.mjs';

export function initializeArchitecture(){
 const opening=document.querySelector('[data-deepseek-architecture]');if(!opening)return;
 const dialog=document.createElement('dialog');dialog.className='deepseek-dialog';dialog.setAttribute('aria-label','DeepSeek architecture and calculations');
 dialog.innerHTML='<div class="deepseek-dialog-heading"><strong>DeepSeek architecture</strong><button type="button" data-arch-close>Close ×</button></div>'+architectureFigure();
 document.body.append(dialog);const enlarged=dialog.querySelector('[data-deepseek-architecture]'),surfaces=[opening,enlarged];let player,opener;
 const render=s=>{for(const root of surfaces){
  root.dataset.playing=String(s.playing);root.dataset.step=String(s.panel?s.step:s.index);root.dataset.panel=s.panel??'';
  root.querySelector('[data-arch-graphic]').innerHTML=architectureGraphic(s);
  root.querySelector('[data-arch-detail]').innerHTML=architectureDetail(s);
  root.querySelectorAll('[data-arch-variant]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.archVariant===s.variant)));
  const count=s.panel?4:architectureStages(s.variant).length,position=s.panel?s.step:s.index;
  root.querySelector('[data-arch-position]').textContent=`${position+1} / ${count}`;
  const scrubber=root.querySelector('[data-arch-scrubber]');scrubber.max=String(count-1);scrubber.value=String(position);scrubber.setAttribute('aria-valuetext',s.panel?`${stageSpec(s.panel,s.variant).title}, calculation step ${position+1}`:stageSpec(architectureStages(s.variant)[s.index],s.variant).title);
  const play=root.querySelector('[data-arch-play]');play.textContent=s.playing?'Pause':s.panel?'Play calculation':'Play';play.setAttribute('aria-pressed',String(s.playing));
  root.querySelector('[data-arch-next]').disabled=position===count-1;
  root.querySelectorAll('[data-arch-node]').forEach(node=>{const active=node.dataset.archNode===architectureStages(s.variant)[s.index];node.dataset.active=String(active);node.setAttribute('aria-pressed',String(active));});
  root.querySelectorAll('[data-arch-phase]').forEach(p=>p.dataset.active=String(Number(p.dataset.archPhase)===s.index));
 }};
 player=createArchitecturePlayer({onChange:render});
 for(const root of surfaces){
  root.addEventListener('click',event=>{
   const target=event.target.closest('button,[data-arch-node]');if(!target)return;
   if(target.matches('[data-arch-variant]'))player.variant(target.dataset.archVariant);
   else if(target.matches('[data-arch-node]')){player.inspect(target.dataset.archNode);root.querySelector('[data-arch-back]')?.focus({preventScroll:true});}
   else if(target.matches('[data-arch-back]')){const key=player.state().panel;player.back();root.querySelector(`[data-arch-node="${key}"]`)?.focus({preventScroll:true});}
   else if(target.matches('[data-arch-step]'))player.select(Number(target.dataset.archStep));
   else if(target.matches('[data-arch-play]'))player.state().playing?player.pause():player.play();
   else if(target.matches('[data-arch-next]'))player.next();
   else if(target.matches('[data-arch-reset]'))player.reset();
   else if(target.matches('[data-arch-enlarge]')){opener=target;player.pause();dialog.showModal();document.documentElement.classList.add('deepseek-dialog-open');}
  });
  root.addEventListener('keydown',event=>{if(event.target.matches('[data-arch-node]')&&['Enter',' '].includes(event.key)){event.preventDefault();player.inspect(event.target.dataset.archNode);root.querySelector('[data-arch-back]')?.focus({preventScroll:true});}});
  root.querySelector('[data-arch-scrubber]').addEventListener('input',event=>player.select(Number(event.target.value)));
  root.addEventListener('click',event=>{if(event.target.closest('a')&&dialog.open)dialog.close();});
 }
 enlarged.querySelector('[data-arch-enlarge]').hidden=true;
 dialog.querySelector('[data-arch-close]').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{player.pause();document.documentElement.classList.remove('deepseek-dialog-open');opener?.focus({preventScroll:true});});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)player.pause();});
 const observer=new IntersectionObserver(entries=>{if(!entries[0].isIntersecting&&!dialog.open)player.pause();},{threshold:0});observer.observe(opening);
}
