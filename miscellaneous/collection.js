import {createOpeningStudy} from './opening-controller.js';
import {createLabs} from './labs.js';

export function openLinkedOutline(root,viewport){
  const open=()=>{
    let id;try{id=decodeURIComponent(viewport.location.hash.slice(1));}catch{return;}
    const target=root.getElementById(id);
    if(target?.classList.contains('topic-plan')){
      target.open=true;
      viewport.requestAnimationFrame(()=>target.scrollIntoView?.({block:'start',behavior:'instant'}));
    }
  };
  viewport.addEventListener('hashchange',open);open();return open;
}
export function createCollectionUI(root,viewport){
  const themeButton=root.getElementById('theme-toggle'),html=root.documentElement;
  const darkPreference=viewport.matchMedia('(prefers-color-scheme: dark)');
  let theme;try{theme=viewport.localStorage.getItem('language-notes-theme');}catch{}
  if(theme==='light'||theme==='dark')html.dataset.theme=theme;
  const dark=()=>html.dataset.theme==='dark'||(!html.dataset.theme&&darkPreference.matches);
  const themeLabel=()=>themeButton.setAttribute('aria-label',`Switch to ${dark()?'light':'dark'} theme`);
  themeLabel();darkPreference.addEventListener?.('change',themeLabel);
  themeButton.addEventListener('click',()=>{html.dataset.theme=dark()?'light':'dark';try{viewport.localStorage.setItem('language-notes-theme',html.dataset.theme);}catch{}themeLabel();});

  const links=[...root.querySelectorAll('.toc-link')];
  const headings=[...root.querySelectorAll('#introduction,#prerequisites,.topic-group,.topic-plan,.topic-essay')];
  let activeChapter;
  function update(){
    const available=html.scrollHeight-viewport.innerHeight;
    const fraction=available>0?Math.min(1,Math.max(0,viewport.scrollY/available)):0;
    root.getElementById('reading-progress').style.transform=`scaleX(${fraction})`;
    root.getElementById('reading-percent').textContent=Math.round(fraction*100)+'%';
    root.querySelector('.reading-progress').setAttribute('aria-valuenow',String(Math.round(fraction*100)));
    let active=headings[0];
    for(const heading of headings)if(heading.getBoundingClientRect().top<=180)active=heading;
    if(!active)return;
    for(const link of links){const selected=link.getAttribute('href')==='#'+active.id;link.classList.toggle('active',selected);if(selected)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');}
    const chapter=active.closest('.topic-group')?.id;
    root.querySelectorAll('[data-contents-chapter]').forEach(detail=>{detail.dataset.current=String(detail.dataset.contentsChapter===chapter);if(chapter!==activeChapter)detail.open=detail.dataset.contentsChapter===chapter;});
    activeChapter=chapter;
  }
  let scheduled=false;
  const schedule=()=>{if(scheduled)return;scheduled=true;viewport.requestAnimationFrame(()=>{scheduled=false;update();});};
  viewport.addEventListener('scroll',schedule,{passive:true});viewport.addEventListener('resize',schedule);
  root.addEventListener('toggle',schedule,true);root.addEventListener('load',schedule,true);
  root.fonts?.ready.then(schedule);
  if(viewport.ResizeObserver)new viewport.ResizeObserver(schedule).observe(html);
  root.querySelectorAll('.mobile-contents a').forEach(link=>link.addEventListener('click',()=>{root.querySelector('.mobile-contents').open=false;}));
  root.querySelectorAll('[data-contents-chapter] a').forEach(link=>link.addEventListener('click',event=>{
    event.stopPropagation();
    const chapter=link.closest('[data-contents-chapter]').dataset.contentsChapter;
    root.querySelectorAll('[data-contents-chapter]').forEach(detail=>{detail.open=detail.dataset.contentsChapter===chapter;});
  }));
  openLinkedOutline(root,viewport);update();
  return {update};
}
if(typeof document!=='undefined'&&typeof window!=='undefined'){
  createCollectionUI(document,window);
  createOpeningStudy(document,window);
  createLabs(document,window);
}
