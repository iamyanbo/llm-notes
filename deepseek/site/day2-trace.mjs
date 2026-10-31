import {flowDefinition as day2Definition} from './day2-trace-model.mjs';
import {weekFlowDefinition} from './week-flow-scenes.mjs';
import {renderTrace} from './trace-scene.mjs';
import {traceDuration,tracePhase,calculationTiming,createTraceView} from './trace-motion.mjs';
import {csaMemoryDefinition} from './csa-memory-study.mjs';
import {dayMapDefinition} from './day-maps.mjs';
const flowDefinition=(kind,p)=>kind.startsWith('day-overview-')?dayMapDefinition(Number(kind.slice(13))):kind==='csa-memory'?csaMemoryDefinition():kind.startsWith('week-')?weekFlowDefinition(kind.slice(5)):day2Definition(kind,p);
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
export function pointAlong(points,progress){
 const lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1])),total=lengths.reduce((s,v)=>s+v,0);let remaining=total*Math.max(0,Math.min(1,progress));
 for(let i=0;i<lengths.length;i++){if(remaining<=lengths[i]){const t=lengths[i]===0?1:remaining/lengths[i];return points[i].map((v,j)=>v+(points[i+1][j]-v)*t);}remaining-=lengths[i];}
 return [...points.at(-1)];
}
export function traceSVG(kind,params={},index=0,progress=1,options={}){
 return renderTrace(flowDefinition(kind,params),index,progress,options);
}
export function withTrace(html,kind,params={}){
 const def=flowDefinition(kind,params),controls=`<div class="flow-controls" role="group" aria-label="Trace this calculation"><div class="flow-transport"><button type="button" data-flow-play aria-pressed="false">Play</button><button type="button" data-flow-previous disabled>Previous</button><button type="button" data-flow-next>Next</button><button type="button" data-flow-restart>Restart</button><label>Speed<select data-flow-speed><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></label></div><div class="flow-position"><label>Calculation<select data-flow-scene>${def.scenes.map((s,i)=>`<option value="${s.start}">${i+1}. ${escape(s.title)}</option>`).join('')}</select></label><label>Step<input data-flow-seek type="range" min="0" max="${def.steps.length-1}" step="1" value="0"></label><output data-flow-count>1 / ${def.steps.length}</output></div></div><p class="flow-detail" data-flow-detail role="status" aria-live="polite">${escape(def.steps[0].label)}. ${escape(def.steps[0].detail)}</p>`;
 return html.replace('<figure ',`<figure data-flow-kind="${kind}" data-flow-params="${escape(JSON.stringify(params))}" `).replace(/<svg\b[\s\S]*?<\/svg>/,traceSVG(kind,params)).replace('</figure>',controls+'</figure>');
}
export function createTracePlayer({count,render,schedule=fn=>globalThis.requestAnimationFrame(fn),cancel=id=>globalThis.cancelAnimationFrame(id),reduced=()=>false,onStart=()=>{},terms=()=>1,timing=null}){
 let index=0,phase=1,playing=false,frame=null,elapsed=Infinity,previousTime=null,mode='all',speed=1;
 const state=()=>({index,phase,playing,count,speed});
 const paint=()=>render(state());
 const pause=()=>{if(frame!==null)cancel(frame);frame=null;playing=false;previousTime=null;paint();};
 const tick=time=>{
  frame=null;if(!playing)return;
  if(previousTime!==null)elapsed+=Math.max(0,time-previousTime)*speed;previousTime=time;const custom=timing?.(index,elapsed);phase=custom?.phase??tracePhase(elapsed,terms(index));
  paint();
  if(elapsed>=(custom?.duration??traceDuration(terms(index)))){phase=1;if(mode==='one'||index===count-1){pause();return;}index++;elapsed=0;phase=0;paint();}
  frame=schedule(tick);
 };
 const select=n=>{pause();index=Math.max(0,Math.min(count-1,Math.round(n)));elapsed=Infinity;phase=1;paint();};
 const start=nextMode=>{
  if(reduced()){select(nextMode==='one'?Math.min(count-1,index+1):count-1);return;}
  if(playing)pause();onStart();mode=nextMode;
  if(index===count-1){index=0;elapsed=Infinity;phase=1;}
  if(phase===1){index=Math.min(count-1,index+1);phase=0;elapsed=0;}
  playing=true;previousTime=null;paint();frame=schedule(tick);
 };
 const player={state,pause,setSpeed:value=>{const v=Number(value);if(Number.isFinite(v)&&v>=.25&&v<=4){speed=v;paint();}},play:()=>playing?pause():start('all'),next:()=>{if(index<count-1){pause();phase=1;elapsed=Infinity;start('one');}},previous:()=>select(index-1),seek:select,restart:()=>select(0),refresh:n=>{if(frame!==null)cancel(frame);frame=null;playing=false;previousTime=null;count=n;index=0;elapsed=Infinity;phase=1;paint();},destroy:pause};paint();return player;
}
export function readFlowParams(element){
 const kind=element.dataset.flowKind,p=JSON.parse(element.dataset.flowParams||'{}'),get=s=>element.querySelector(s),number=(s,fallback)=>Number(get(s)?.value??fallback);
 if(kind==='alternatives')p.fraction=number('[data-alternatives-fraction]',.5);
 if(kind==='hc-wiring')p.stage=number('[data-hc-stage]',0);
 if(kind==='replay'){p.coefficient=number('[data-transport-coefficient]',.75);p.applications=Number(get('[data-transport-count]')?.textContent.match(/^\d+/)?.[0]??1);}
 if(kind==='division'&&get('[data-d2-division]'))p.division=number('[data-d2-division]',2);
 if(kind==='preference')p.change=number('[data-d2-score]',0);
 if(kind==='coefficient'){p.swapped=get('[data-d2-arrangement]')?.value==='swapped';p.dynamic=get('[data-d2-dynamic]')?.checked??true;}
 if(kind==='block'){p.stage=number('[data-d2-block-stage]',0);p.strength=number('[data-d2-attention]',1);}
 return p;
}
export function initializeDay2Traces(root=document,{preference=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')??{matches:false},schedule,cancel,Observer=globalThis.IntersectionObserver}={}){
 const players=[],doc=root.ownerDocument??root;let active=null;
 for(const element of root.querySelectorAll('[data-flow-kind]')){
  const kind=element.dataset.flowKind,get=s=>element.querySelector(s),canvas=get('[data-d2-svg]')??get('[data-residual-svg]')??get('[data-week-diagram]');let params=readFlowParams(element),definition=flowDefinition(kind,params),lastAnnouncement=-1;
  const paintDiagram=createTraceView(canvas);
  const player=createTracePlayer({count:definition.steps.length,schedule,cancel,terms:i=>definition.steps[i].calculation?.terms.length??0,timing:(i,elapsed)=>definition.timing?.(i,elapsed)??(!definition.render?calculationTiming(elapsed,definition.steps[i].calculation?.terms.length??0):undefined),reduced:()=>preference.matches,onStart:()=>{if(active&&active!==player)active.pause();active=player;},render:state=>{
   paintDiagram(renderTrace(definition,state.index,state.phase,{motion:!preference.matches}));
   const play=get('[data-flow-play]');play.textContent=state.playing?'Pause':preference.matches?'Show result':'Play';play.setAttribute('aria-pressed',String(state.playing));
   get('[data-flow-seek]').value=String(state.index);get('[data-flow-seek]').max=String(state.count-1);get('[data-flow-count]').textContent=`${state.index+1} / ${state.count}`;get('[data-flow-previous]').disabled=state.index===0;get('[data-flow-next]').disabled=state.index===state.count-1;
   get('[data-flow-speed]').value=String(state.speed);
   get('[data-flow-scene]').value=String(definition.scenes[definition.steps[state.index].scene].start);
   const announcement=state.index+':'+(state.phase>=.96);if(lastAnnouncement!==announcement){const s=definition.steps[state.index];get('[data-flow-detail]').textContent=s.label+'. '+(state.phase>=.96?s.detail:s.motionDetail??'Follow the operands into the operation, then the result into its empty cell.');lastAnnouncement=announcement;}
  }});
  get('[data-flow-speed]').addEventListener('change',event=>player.setSpeed(event.target.value));get('[data-flow-play]').addEventListener('click',player.play);get('[data-flow-next]').addEventListener('click',player.next);get('[data-flow-previous]').addEventListener('click',player.previous);get('[data-flow-restart]').addEventListener('click',player.restart);get('[data-flow-seek]').addEventListener('input',event=>player.seek(Number(event.target.value)));get('[data-flow-scene]').addEventListener('change',event=>player.seek(Number(event.target.value)));
  element.addEventListener('day-map-inspect',player.pause);
  const changed=event=>{if(kind.startsWith('day-overview-')||event.target.closest('.flow-controls')||!event.target.closest('button,input,select'))return;params=readFlowParams(element);definition=flowDefinition(kind,params);lastAnnouncement=-1;get('[data-flow-scene]').innerHTML=definition.scenes.map((s,i)=>`<option value="${s.start}">${i+1}. ${escape(s.title)}</option>`).join('');player.refresh(definition.steps.length);};
  element.addEventListener('input',changed);element.addEventListener('change',changed);element.addEventListener('click',changed);
  const hidden=()=>{if(doc.hidden)player.pause();},reduce=()=>{player.pause();lastAnnouncement=-1;player.seek(player.state().index);};
  doc.addEventListener('visibilitychange',hidden);preference.addEventListener?.('change',reduce);
  const observer=Observer?new Observer(entries=>{if(entries.some(e=>!e.isIntersecting))player.pause();},{threshold:0}):null;observer?.observe(element);
  players.push({player,destroy:()=>{player.destroy();observer?.disconnect();doc.removeEventListener('visibilitychange',hidden);preference.removeEventListener?.('change',reduce);element.removeEventListener('input',changed);element.removeEventListener('change',changed);element.removeEventListener('click',changed);element.removeEventListener('day-map-inspect',player.pause);}});
 }
 return {players,destroy:()=>players.forEach(p=>p.destroy())};
}
