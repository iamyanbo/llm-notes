import {GENERATION_U,GENERATION_E} from './generation-model.js';
const f=v=>Number(v.toFixed(3)).toString();
const escape=s=>String(s).replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
export function generationFlowSpecs(data,step,chosen=null,prefix=data.ids){
  const cell=(label,r,c)=>`[data-matrix="${label}"] [data-row="${r}"][data-column="${c}"]`,routes=[];
  const send=(from,to,value,delay=0)=>routes.push({from,to,value:String(value),delay});
  if(step===1)data.X.forEach((row,j)=>row.forEach((v,c)=>send(cell('Last query · 1 × 2',0,c),cell('X = K = V · prefix × 2',j,c),f(data.q[c]),j*.08)));
  if(step===2)data.X.forEach((row,j)=>row.forEach((v,c)=>{
    const product=v*data.weights[j];
    send(cell('X = K = V · prefix × 2',j,c),`[data-generation-product="${j}"]`,`${f(data.weights[j])}×${f(v)}=${f(product)}`,j*.06);
    send(`[data-generation-product="${j}"]`,cell('Gathered h · 2 coordinates',0,c),f(product),.8+j*.06);
  }));
  if(step===3){
    GENERATION_U.forEach((row,r)=>row.forEach((w,c)=>send(cell('Gathered h · 2 coordinates',0,c),cell('W_U · 4 × 2',r,c),f(data.h[c]),r*.06)));
    data.logits.forEach((v,r)=>send(cell('W_U · 4 × 2',r,0),`[data-generation-token="${r}"] small`,`z = ${f(v)}`,.8+r*.06));
  }
  if(step===4&&chosen!==null){
    send(`[data-generation-token="${chosen}"]`,'.generation-prefix .generation-token:last-child',`ID ${chosen+1}`);
    GENERATION_E[chosen].forEach((v,c)=>send('.generation-prefix .generation-token:last-child',cell('Chosen token embedding',0,c),f(v),.8+c*.08));
  }
  return routes;
}
export function drawGenerationFlow(surface,data,step,chosen,prefix){
  const body=surface.querySelector('[data-generation-view]'),box=body.getBoundingClientRect();
  if(!box.width||!box.height)return;
  const wires=[],packets=[];
  for(const route of generationFlowSpecs(data,step,chosen,prefix)){
    const source=body.querySelector(route.from),target=body.querySelector(route.to);if(!source||!target)continue;
    const a=source.getBoundingClientRect(),b=target.getBoundingClientRect();
    const start=[a.left+a.width/2-box.left,a.top+a.height/2-box.top],end=[b.left+b.width/2-box.left,b.top+b.height/2-box.top],middle=(start[1]+end[1])/2;
    const path=`M${start.join(' ')} C${start[0]} ${middle},${end[0]} ${middle},${end.join(' ')}`,width=Math.min(180,Math.max(38,route.value.length*6+12));
    wires.push(`<path class="generation-wire" d="${path}"/>`);
    packets.push(`<g class="generation-packet" opacity="0"><rect x="${-width/2}" y="-13" width="${width}" height="26" rx="2"/><text text-anchor="middle" y="4">${escape(route.value)}</text><animateMotion path="${path}" begin="${route.delay}s" dur=".65s" fill="freeze"/><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.1;.85;1" begin="${route.delay}s" dur=".65s" fill="freeze"/></g>`);
  }
  const overlay=surface.ownerDocument.createElement('div');overlay.className='generation-flow-overlay';
  overlay.innerHTML=`<svg viewBox="0 0 ${box.width} ${box.height}" aria-hidden="true">${wires.join('')}${packets.join('')}</svg>`;body.append(overlay);overlay.querySelector('svg')?.setCurrentTime?.(0);
}
