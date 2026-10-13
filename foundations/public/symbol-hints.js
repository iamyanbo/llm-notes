import {BLOCK_SYMBOLS} from './symbol-definitions.js';
export function createSymbolHints(document){
  const tooltip=document.createElement('div');tooltip.id='math-symbol-tooltip';tooltip.className='math-symbol-tooltip';tooltip.setAttribute('role','tooltip');tooltip.hidden=true;document.body.append(tooltip);
  let active=null,pinned=false;
  const hide=()=>{active?.removeAttribute('aria-describedby');tooltip.hidden=true;active=null;pinned=false;};
  const show=(target,pin=false)=>{
    const id=target.dataset.symbolButton??target.dataset.symbol,entry=BLOCK_SYMBOLS[id];if(!entry)return;
    active?.removeAttribute('aria-describedby');active=target;pinned=pin;
    tooltip.textContent=entry.description;tooltip.hidden=false;target.setAttribute('aria-describedby',tooltip.id);
    const box=target.getBoundingClientRect(),view=document.defaultView,width=view?.innerWidth??1024,height=view?.innerHeight??900;
    const bounds=tooltip.getBoundingClientRect(),left=Math.max(12,Math.min(box.left??12,width-(bounds.width||280)-12));
    const top=Math.max(12,Math.min((box.bottom??box.top??0)+10,height-(bounds.height||120)-12));
    tooltip.style.left=left+'px';tooltip.style.top=top+'px';
  };
  document.querySelectorAll('[data-symbol]').forEach(element=>element.removeAttribute('title'));
  document.addEventListener('mouseover',event=>{const target=event.target.closest?.('[data-symbol],[data-symbol-button]');if(target&&!pinned)show(target);});
  document.addEventListener('mouseout',event=>{const target=event.target.closest?.('[data-symbol],[data-symbol-button]');if(target&&!pinned&&!target.contains(event.relatedTarget))hide();});
  document.addEventListener('focusin',event=>{const target=event.target.closest?.('[data-symbol-button]');if(target)show(target);});
  document.addEventListener('focusout',event=>{if(event.target.closest?.('[data-symbol-button]'))hide();});
  document.addEventListener('click',event=>{const target=event.target.closest?.('[data-symbol-button]');if(target){if(active===target&&pinned)hide();else show(target,true);}else if(!tooltip.contains(event.target))hide();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')hide();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)hide();});
  document.addEventListener('scroll',hide,{passive:true,capture:true});
  document.defaultView?.addEventListener?.('resize',hide);
  return {hide};
}
