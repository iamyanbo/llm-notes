export function readingFraction(scrollTop,scrollHeight,viewportHeight){
 const available=scrollHeight-viewportHeight;
 return available>0?Math.max(0,Math.min(1,scrollTop/available)):0;
}
export function createReadingProgress(root,viewport){
 const track=root.querySelector('[data-reading-progress]'),bar=root.querySelector('[data-reading-fill]'),label=root.querySelector('[data-reading-percent]');
 if(!track||!bar)return;
 const update=()=>{
  const fraction=readingFraction(viewport.scrollY||0,root.documentElement.scrollHeight,viewport.innerHeight),percent=Math.round(fraction*100);
  bar.style.transform=`scaleX(${fraction})`;track.setAttribute('aria-valuenow',String(percent));
  if(label)label.textContent=percent+'%';
 };
 let pending=false;
 const schedule=()=>{if(pending)return;pending=true;viewport.requestAnimationFrame(()=>{pending=false;update();});};
 viewport.addEventListener('scroll',schedule,{passive:true});viewport.addEventListener('resize',schedule);
 root.addEventListener('load',schedule,true);root.fonts?.ready.then(schedule);
 const Observer=viewport.ResizeObserver;
 const observer=Observer?new Observer(schedule):null;observer?.observe(root.documentElement);
 update();return {update};
}
export function createReaderNavigation(root, viewport){
  const links=[...root.querySelectorAll('[data-contents-link]')];
  if(!links.length)return;
  const unique=[...new Map(links.map(link=>[link.dataset.contentsLink,link])).values()];
  const sections=unique.map(link=>root.getElementById(link.dataset.contentsLink));
  let activeChapter;
  const select=id=>{
    const chapter=unique.find(link=>link.dataset.contentsLink===id)?.dataset.contentsOwner;
    links.forEach(link=>{
      const active=link.dataset.contentsLink===id;
      link.classList.toggle('active',active);
      if(active)link.setAttribute('aria-current','location');
      else link.removeAttribute('aria-current');
    });
    root.querySelectorAll('[data-contents-chapter]').forEach(detail=>{
      detail.dataset.current=String(detail.dataset.contentsChapter===chapter);
      if(chapter!==activeChapter)detail.open=detail.dataset.contentsChapter===chapter;
    });
    activeChapter=chapter;
  };
  links.forEach(link=>link.addEventListener('click',event=>{
    event.stopPropagation();
    select(link.dataset.contentsLink);
    const mobile=link.closest('.mobile-contents');
    if(mobile)mobile.open=false;
  }));
  const current=()=>{
    const cutoff=Math.min(180,(viewport.innerHeight||800)*.25);
    const section=sections.filter(section=>section.getBoundingClientRect().top<=cutoff).at(-1)||sections[0];
    select(section.id);
  };
  let pending=false;
  viewport.addEventListener('scroll',()=>{
    if(pending)return;
    pending=true;viewport.requestAnimationFrame(()=>{pending=false;current();});
  },{passive:true});
  viewport.addEventListener('hashchange',current);
  const entry=root.body.dataset.entryChapter;
  const destination=viewport.location.hash.slice(1)|| (entry!=='introduction'?entry:'');
  let decoded=destination;
  try{decoded=decodeURIComponent(destination);}catch{}
  const target=root.getElementById(decoded);
  if(target){
    if(!viewport.location.hash)viewport.history.replaceState(null,'','#'+destination);
    // An old article URL opens at its chapter; the full reader is already loaded.
    const arrive=()=>{target.scrollIntoView({behavior:'instant',block:'start'});current();};
    viewport.requestAnimationFrame(arrive);
    let interacted=false;
    for(const event of ['wheel','touchstart','pointerdown','keydown'])viewport.addEventListener(event,()=>{interacted=true;},{once:true,passive:true});
    root.fonts?.ready.then(()=>{if(!interacted)arrive();});
  }else current();
  return {select,current};
}
