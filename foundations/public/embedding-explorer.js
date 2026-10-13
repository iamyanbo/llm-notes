import {PRESETS} from './sentence-model.js';
import {embeddingAnalysis} from './embedding-view.js';
import {REPRESENTATION_VOCABULARY,exampleEmbeddings} from './representation-model.js';

export function createEmbeddingExplorer(element,{motion,preference}={}){
  if(!element)return;
  let key='dog',position=0,timer=null,flight=null,animation=null;
  const analysis=element.querySelector('[data-embedding-analysis]');
  const play=element.querySelector('[data-embedding-play]');
  const cancelFlight=()=>{
    animation?.cancel();animation=null;flight?.remove();flight=null;
  };
  const pause=()=>{
    if(timer!==null)clearTimeout(timer);timer=null;
    play.textContent='Play lookup';play.setAttribute('aria-pressed','false');
  };
  const animateLookup=()=>{
    cancelFlight();
    if(preference?.matches||typeof element.animate!=='function')return;
    const token=PRESETS[key][position],bounds=element.getBoundingClientRect();
    const stops=[
      element.querySelector(`[data-embedding-position="${position}"]`),
      analysis.querySelector(`[data-embedding-entry="${token}"]`),
      analysis.querySelector(`[data-embedding-output="${position}"]`),
    ].map(node=>{const b=node.getBoundingClientRect();return [b.left+b.width/2-bounds.left,b.top+b.height/2-bounds.top];});
    flight=document.createElement('span');flight.className='embedding-flight';flight.setAttribute('aria-hidden','true');
    flight.textContent='('+exampleEmbeddings()[token].join(', ')+')';element.append(flight);
    const frames=stops.map(([x,y],i)=>({transform:`translate(${x}px,${y}px) translate(-50%,-50%)`,opacity:i===0?0:1,offset:[0,.48,.88][i]}));
    frames.push({...frames[2],opacity:0,offset:1});
    animation=flight.animate(frames,{duration:1050,easing:'cubic-bezier(.22,.7,.3,1)'});
    const current=flight;
    animation.finished.then(()=>{current.remove();if(flight===current){flight=null;animation=null;}},()=>current.remove());
  };
  const render=()=>{
    const token=PRESETS[key][position];
    for(const button of element.querySelectorAll('[data-embedding-position]')){
      const i=Number(button.dataset.embeddingPosition),word=PRESETS[key][i];
      button.querySelector('b').textContent=word;button.setAttribute('aria-label',`Position ${i+1}: ${word}`);
      button.setAttribute('aria-pressed',String(i===position));
    }
    for(const button of element.querySelectorAll('[data-embedding-sentence]'))button.setAttribute('aria-pressed',String(button.dataset.embeddingSentence===key));
    analysis.innerHTML=embeddingAnalysis(key,position);
    element.querySelector('[data-embedding-status]').textContent=`Position ${position+1}: ${token} → ID ${REPRESENTATION_VOCABULARY.indexOf(token)+1} → (${exampleEmbeddings()[token].join(', ')}) → row ${position+1}.`;
    motion?.feedback(analysis.querySelector('[data-embedding-output][data-selected="true"]'));
    animateLookup();
  };
  for(const button of element.querySelectorAll('[data-embedding-position]'))button.addEventListener('click',()=>{
    pause();position=Number(button.dataset.embeddingPosition);render();
  });
  for(const button of element.querySelectorAll('[data-embedding-sentence]'))button.addEventListener('click',()=>{
    pause();key=button.dataset.embeddingSentence;render();
  });
  element.querySelector('[data-embedding-next]').addEventListener('click',()=>{pause();position=(position+1)%PRESETS[key].length;render();});
  const advance=()=>{
    if(position===PRESETS[key].length-1){pause();return;}
    position++;render();timer=setTimeout(advance,1400);
  };
  play.addEventListener('click',()=>{
    if(timer!==null){pause();cancelFlight();return;}
    position=0;render();play.textContent='Pause lookup';play.setAttribute('aria-pressed','true');timer=setTimeout(advance,1400);
  });
  preference?.addEventListener?.('change',()=>{if(preference.matches){pause();cancelFlight();}});
  element.ownerDocument.addEventListener('visibilitychange',()=>{if(element.ownerDocument.hidden){pause();cancelFlight();}});
  return {pause};
}
