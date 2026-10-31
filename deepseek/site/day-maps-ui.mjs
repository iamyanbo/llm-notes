export function readingDay(sections,threshold=150){
 let last=null;
 for(const section of sections){const r=section.getBoundingClientRect();if(r.top<=threshold)last=r.bottom>threshold?Number(section.dataset.studyDay):null;else break;}
 return last;
}

export function initializeDayMaps(root=document,{view=globalThis.window}={}){
 const figures=[...root.querySelectorAll('[data-day-map]')];if(!figures.length)return {destroy(){}};
 const dialog=root.createElement('dialog');dialog.className='day-map-dialog';dialog.setAttribute('aria-label','Enlarged daily module map');
 dialog.innerHTML='<div class="day-map-dialog-bar"><strong data-day-map-dialog-title>Daily module map</strong><button type="button" data-day-map-close>Close map ×</button></div><div data-day-map-dialog-content></div>';
 const dock=root.createElement('button');dock.type='button';dock.className='day-map-dock';dock.hidden=true;dock.setAttribute('aria-haspopup','dialog');
 root.body.append(dialog,dock);
 const content=dialog.querySelector('[data-day-map-dialog-content]'),close=dialog.querySelector('[data-day-map-close]'),title=dialog.querySelector('[data-day-map-dialog-title]');
 let current=null,marker=null,opener=null;
 const pause=figure=>figure.dispatchEvent(new view.Event('day-map-inspect'));
 const restore=()=>{
  if(!current)return;
  pause(current);marker.replaceWith(current);current=null;marker=null;
  root.documentElement.classList.remove('day-map-modal-open');opener?.focus({preventScroll:true});updateDock();
 };
 const open=(figure,button)=>{
  if(current)return;
  pause(figure);current=figure;opener=button;marker=root.createComment('daily-map-location');figure.before(marker);content.append(figure);
  title.textContent='Day '+figure.dataset.dayMap+' · module map';
  if(dialog.showModal)dialog.showModal();else dialog.setAttribute('open','');
  root.documentElement.classList.add('day-map-modal-open');dock.hidden=true;close.focus();
 };
 const shut=()=>{if(dialog.close)dialog.close();else{dialog.removeAttribute('open');restore();}};
 const handlers=figures.map(figure=>{const button=figure.querySelector('[data-day-map-enlarge]'),fn=()=>open(figure,button);button.addEventListener('click',fn);return [button,fn];});
 for(const link of root.querySelectorAll('[data-open-day-map]')){
  const fn=event=>{const f=figures.find(f=>f.dataset.dayMap===link.dataset.openDayMap);if(f){event.preventDefault();open(f,link);}};
  link.addEventListener('click',fn);handlers.push([link,fn]);
 }
 close.addEventListener('click',shut);dialog.addEventListener('close',restore);
 const link=event=>{if(event.target.closest('a'))shut();};dialog.addEventListener('click',link);
 const sections=[...root.querySelectorAll('section[data-study-day]')];
 const updateDock=()=>{
  if(current){dock.hidden=true;return;}
  const day=readingDay(sections),figure=figures.find(f=>Number(f.dataset.dayMap)===day),r=figure?.getBoundingClientRect();
  dock.hidden=!figure||r.bottom>160;dock.dataset.day=day?String(day):'';dock.textContent=day?'Day '+day+' · open module map':'';
 };
 const openDock=()=>{const f=figures.find(f=>f.dataset.dayMap===dock.dataset.day);if(f)open(f,dock);};dock.addEventListener('click',openDock);
 view.addEventListener('scroll',updateDock,{passive:true});view.addEventListener('resize',updateDock);updateDock();
 return {open,close:shut,destroy(){if(current)shut();handlers.forEach(([button,fn])=>button.removeEventListener('click',fn));close.removeEventListener('click',shut);dialog.removeEventListener('close',restore);dialog.removeEventListener('click',link);dock.removeEventListener('click',openDock);view.removeEventListener('scroll',updateDock);view.removeEventListener('resize',updateDock);dialog.remove();dock.remove();}};
}
