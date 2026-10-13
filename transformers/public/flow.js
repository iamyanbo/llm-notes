import {cacheExample,expertExample,quantExample,QUANT_W,QUANT_X,speculativeExample,TARGET,tileExample,TILE_SCORES,TILE_VALUES} from './models.js';
import {f} from './views.js';
const esc=s=>String(s).replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
export function flowSpecs(kind,step,options={}){
  const cell=(label,r,c)=>`[data-matrix="${label}"] [data-row="${r}"][data-column="${c}"]`;
  const specs=[];const send=(from,to,value,delay=0,tone='blue')=>specs.push({from,to,value:String(value),delay,tone});
  if(kind==='cache'){
    const d=cacheExample(options.n??4);
    if(step===1)d.q.forEach((v,c)=>send(cell('New q · 1 × 2',0,c),cell('Cached K · prefix × 2',d.K.length-1,c),f(v)));
    if(step===2){
      d.K.forEach((row,r)=>row.forEach((v,c)=>send(cell('New q · 1 × 2',0,c),cell('Cached K · prefix × 2',r,c),f(d.q[c]),r*.08)));
      d.scores.forEach((v,r)=>send(cell('Cached K · prefix × 2',r,0),cell('Scaled comparison row',0,r),`s = ${f(v)}`,.65+r*.08));
    }
    if(step===3)d.V.forEach((row,r)=>row.forEach((v,c)=>{
      const product=v*d.weights[r];
      send(cell('Cached V · prefix × 2',r,c),cell('Weighted values',r,c),`${f(d.weights[r])}×${f(v)}=${f(product)}`,r*.08,'rust');
      send(cell('Weighted values',r,c),cell('Same weighted output',0,c),f(product),.85+r*.08,'rust');
    }));
  }else if(kind==='experts'){
    const d=expertExample([1,options.x2??0],options.k??2);
    if(step===0)for(let r=0;r<4;r++)for(let c=0;c<2;c++)send(cell('One token representation x',0,c),cell('W_r · 4 × 2',r,c),f(d.x[c]),r*.06);
    if(step===1)d.selected.forEach(i=>send(`[data-router-probability="${i}"] b`,`[data-expert-gate="${i}"]`,`renormalize → ${f(d.gates[i])}`));
    if(step===2)d.selected.forEach(i=>{for(let r=0;r<2;r++)for(let c=0;c<2;c++)send(cell('One token representation x',0,c),cell('E'+(i+1)+' weights',r,c),f(d.x[c]),r*.1);});
    if(step===3)d.selected.forEach((i,index)=>{
      send(`[data-expert-output="${i}"]`,`[data-expert-weighted="${i}"]`,d.weighted[i].map(f).join(', '),index*.12,'rust');
      send(`[data-expert-weighted="${i}"]`,'[data-mixture-result] b',d.weighted[i].map(f).join(', '),.85+index*.12,'rust');
    });
  }else if(kind==='precision'){
    const d=quantExample(options.bits??4,options.scale??.1);
    QUANT_W.forEach((row,r)=>row.forEach((w,c)=>{
      if(step===1)send(cell('W · original weights',r,c),cell('q · integer codes',r,c),`round → ${d.integer[r][c]}`,(r*2+c)*.08);
      if(step===2)send(cell('q · integer codes',r,c),cell('Ŵ = s q · reconstructed',r,c),`×${f(d.scale)} → ${f(d.restored[r][c])}`,(r*2+c)*.08);
      if(step===3){
        send(cell('W · original weights',r,c),cell('Exact products',r,c),`${f(w)}×${QUANT_X[c]}=${f(w*QUANT_X[c])}`,(r*2+c)*.08,'rust');
        send(cell('Ŵ = s q · reconstructed',r,c),cell('Reconstructed products',r,c),`${f(d.restored[r][c])}×${QUANT_X[c]}=${f(d.restored[r][c]*QUANT_X[c])}`,.1+(r*2+c)*.08,'rust');
        send(cell('Exact products',r,c),cell('W x · full precision',0,r),f(w*QUANT_X[c]),.8+(r*2+c)*.08,'rust');
        send(cell('Reconstructed products',r,c),cell('Ŵ x · reconstructed',0,r),f(d.restored[r][c]*QUANT_X[c]),.9+(r*2+c)*.08,'rust');
      }
    }));
  }else if(kind==='speculation'){
    const proposal=options.proposal??0,q=[options.draft??.6,.1,.9-(options.draft??.6)],d=speculativeExample(TARGET,q);
    if(step===1)send(`[data-probability="1-${proposal}"] b`,'[data-proposal]',['A','B','C'][proposal]);
    if(step===2){send(`[data-probability="0-${proposal}"] b`,'[data-acceptance]',f(TARGET[proposal]));send(`[data-probability="1-${proposal}"] b`,'[data-acceptance]',f(q[proposal]),.12);send('[data-acceptance]','[data-decision] b',f(d.acceptance[proposal]),.8);}
    if(step===3)for(let i=0;i<3;i++){send(`[data-mass="${i}-accepted"]`,`[data-mass="${i}-total"]`,f(d.accepted[i]),i*.08);send(`[data-mass="${i}-missing"]`,`[data-mass="${i}-total"]`,f(d.missing[i]),.1+i*.08,'rust');}
  }else if(kind==='tiles'&&step>0){
    const d=tileExample(),frame=d.frames[step],tile=step-1;
    const from=`.tile-strip>div:nth-child(${tile+1}) .numeric-matrix span`;
    send(from,'.accumulator-row>div:not(.number-transfer):nth-last-child(3) b',`m → ${f(frame.m)}`);
    send(from,'.accumulator-row>div:not(.number-transfer):nth-last-child(2) b',`ℓ → ${f(frame.l)}`,.15);
    send(`.tile-strip>div:nth-child(${tile+1}) [data-tone="rust"] span`,'.accumulator-row>div:last-child b',`o → (${frame.o.map(f).join(', ')})`,.3,'rust');
  }
  return specs;
}
export function animateFlow(surface,kind,step,options={}){
  return animateTransfers(surface.querySelector('[data-lab-view]'),flowSpecs(kind,step,options));
}
export function animateTransfers(body,specs){
  const owner=body.ownerDocument;
  body.querySelector('[data-flow-overlay]')?.remove();
  const bounds=body.getBoundingClientRect();if(!bounds.width||!bounds.height)return;
  const paths=[],packets=[];let maxEnd=0;
  for(const s of specs){
    const source=body.querySelector(s.from),target=body.querySelector(s.to);if(!source||!target)continue;
    const a=source.getBoundingClientRect(),b=target.getBoundingClientRect();
    const start=[a.left+a.width/2-bounds.left,a.top+a.height/2-bounds.top],end=[b.left+b.width/2-bounds.left,b.top+b.height/2-bounds.top];
    const mid=(start[1]+end[1])/2,curve=`M${start.join(' ')} C${start[0]} ${mid},${end[0]} ${mid},${end.join(' ')}`,width=Math.min(190,Math.max(38,s.value.length*6.5+12));
    paths.push(`<path class="measured-flow-path" data-tone="${s.tone}" d="${curve}"/>`);
    packets.push(`<g class="measured-flow-packet" data-tone="${s.tone}" opacity="0"><rect x="${-width/2}" y="-13" width="${width}" height="26" rx="2"/><text text-anchor="middle" y="4">${esc(s.value)}</text><animateMotion path="${curve}" begin="${s.delay}s" dur=".68s" fill="freeze"/><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.1;.85;1" begin="${s.delay}s" dur=".68s" fill="freeze"/></g>`);
    target.dataset.flowArrival='true';maxEnd=Math.max(maxEnd,s.delay+.68);
  }
  const overlay=owner.createElement('div');overlay.dataset.flowOverlay='';overlay.className='measured-flow-overlay';
  overlay.innerHTML=`<svg viewBox="0 0 ${bounds.width} ${bounds.height}" aria-hidden="true">${paths.join('')}${packets.join('')}</svg>`;body.append(overlay);overlay.querySelector('svg')?.setCurrentTime?.(0);
  return maxEnd;
}
