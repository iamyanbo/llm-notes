import {geometryKinds} from './geometry-model.js';
import {geometryFrame} from './geometry-view.js';
import {vectorFlowFrame} from './vector-flow-view.js';

export function createGeometryStudy(element,{mode=element?.dataset.geometryMode??'qkv',prefix=element?.dataset.geometryPrefix??'geometry-qkv',key='dog',positions=false,selected=1,preference,schedule=setTimeout,cancel=clearTimeout}={}){
  if(!element)return;
  const kinds=geometryKinds(mode),makeProgress=value=>Object.fromEntries(kinds.map(kind=>[kind,value]));
  const progressByView={flow:makeProgress(0),transform:makeProgress(1)};
  let active=kinds[0],view='flow',showBasis=true,timer=null,playingIndex=0;
  const play=element.querySelector('[data-geometry-play]'),slider=element.querySelector('[data-geometry-progress]');
  const progress=()=>progressByView[view];
  const playLabel=()=>mode==='qkv'?'Play Q → K → V':view==='flow'?'Play data flow':'Play transformation';
  const pause=()=>{if(timer!==null)cancel(timer);timer=null;play.textContent=playLabel();play.setAttribute('aria-pressed','false');};
  const render=()=>{
    const config={mode,prefix,key,positions,selected,progress:progress(),active,showBasis,announce:timer===null};
    element.querySelector('[data-geometry-frame]').innerHTML=view==='flow'?vectorFlowFrame(config):geometryFrame(config);
    slider.value=String(progress()[active]);slider.setAttribute('aria-valuetext',Math.round(progress()[active]*100)+' percent');
    element.querySelector('[data-geometry-percent]').textContent=Math.round(progress()[active]*100)+'%';
    element.querySelector('[data-geometry-timeline]').textContent=view==='flow'?'Data flow':'Transformation';
    element.querySelector('[data-geometry-apply]').textContent=view==='flow'?'Complete map':'Apply map';
    element.querySelector('[data-geometry-caption]').textContent=view==='flow'?
      'Blue cells contain the fixed weights. Outlined cells contain computed values. Moving labels carry the actual input numbers, products, and sum. '+(mode==='qkv'?'Q, K, and V each receive the same original x.':'Each matrix row produces one output coordinate.'):
      mode==='scalar'?'Only the final number on the horizontal line is the query. Intermediate two-coordinate locations illustrate the collapse.':
      'During motion the displayed map is (1 − t)I + tW, ending at the chosen matrix W. The grid moves with this map; reference axes stay fixed. Transform shows geometry; Data flow shows the arithmetic of the fixed matrix. Their intermediate steps have different meanings.';
    element.querySelector('[data-geometry-instruction]').textContent=view==='flow'?
      'Follow the two input coordinates into a matrix row. Multiply by its weights, add the products, and store the output coordinate. The same inputs are reused for the next row.':
      mode==='scalar'?'Bring the inputs onto the scalar line q = x₂ and observe which points meet.':
      'The same input and target matrices are shown geometrically. Blue and rust arrows show the basis vectors; the grid and word vectors follow the map.';
    for(const control of element.querySelectorAll('[data-transform-control]'))control.hidden=view!=='transform';
    for(const button of element.querySelectorAll('[data-geometry-kind]'))button.setAttribute('aria-pressed',String(button.dataset.geometryKind===active));
    for(const button of element.querySelectorAll('[data-geometry-view]'))button.setAttribute('aria-pressed',String(button.dataset.geometryView===view));
    if(timer===null)play.textContent=playLabel();
  };
  const tick=()=>{
    const frames=view==='flow'?120:50;
    progress()[active]=Math.min(1,Math.round(progress()[active]*frames+1)/frames);render();
    if(progress()[active]===1){
      if(playingIndex===kinds.length-1){pause();render();return;}
      playingIndex++;active=kinds[playingIndex];
    }
    timer=schedule(tick,view==='flow'?33:50);
  };
  play.addEventListener('click',()=>{
    if(timer!==null){pause();render();return;}
    if(preference?.matches){for(const kind of kinds)progress()[kind]=1;render();return;}
    for(const kind of kinds)progress()[kind]=0;playingIndex=0;active=kinds[0];render();
    play.textContent=view==='flow'?'Pause data flow':'Pause transformation';play.setAttribute('aria-pressed','true');timer=schedule(tick,view==='flow'?33:50);
  });
  for(const button of element.querySelectorAll('[data-geometry-view]'))button.addEventListener('click',()=>{pause();view=button.dataset.geometryView;render();});
  for(const button of element.querySelectorAll('[data-geometry-kind]'))button.addEventListener('click',()=>{pause();active=button.dataset.geometryKind;render();});
  slider.addEventListener('input',()=>{pause();progress()[active]=Number(slider.value);render();});
  element.querySelector('[data-geometry-next]').addEventListener('click',()=>{
    pause();const steps=view==='flow'?(mode==='scalar'?4:8):4;
    if(progress()[active]===1){active=kinds[(kinds.indexOf(active)+1)%kinds.length];progress()[active]=0;}
    else progress()[active]=Math.min(1,(Math.floor(progress()[active]*steps+1e-9)+1)/steps);
    render();
  });
  element.querySelector('[data-geometry-apply]').addEventListener('click',()=>{pause();progress()[active]=1;render();});
  element.querySelector('[data-geometry-reset]').addEventListener('click',()=>{pause();for(const kind of kinds)progress()[kind]=0;render();});
  const word=element.querySelector('[data-geometry-word]');
  word?.addEventListener('change',()=>{pause();selected=Number(word.value);render();});
  const basis=element.querySelector('[data-geometry-basis]');
  basis?.addEventListener('change',()=>{pause();showBasis=basis.checked;render();});
  const reduced=()=>{if(preference.matches){pause();render();}},hidden=()=>{if(element.ownerDocument.hidden)pause();};
  preference?.addEventListener?.('change',reduced);element.ownerDocument.addEventListener('visibilitychange',hidden);
  return {pause,destroy:()=>{pause();preference?.removeEventListener?.('change',reduced);element.ownerDocument.removeEventListener('visibilitychange',hidden);}};
}
