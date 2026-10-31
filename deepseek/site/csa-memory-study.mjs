import {esc} from './trace-scene.mjs';
import {ease,cubicPoint} from './trace-motion.mjs';

export const CSA_WINDOW=128,CSA_STRIDE=4;
const range=(a,b)=>Array.from({length:Math.max(0,b-a+1)},(_,i)=>a+i);
export function compressedSupport(id){
 return {id,previous:range(Math.max(0,(id-1)*CSA_STRIDE),id*CSA_STRIDE-1),current:range(id*CSA_STRIDE,(id+1)*CSA_STRIDE-1),completeAt:(id+1)*CSA_STRIDE-1};
}
export function memoryAt(position){
 if(!Number.isInteger(position)||position< -1)throw new RangeError('A token position must be an integer at least -1');
 const block=Math.floor(Math.max(0,position)/CSA_STRIDE);
 return {position,local:range(Math.max(0,position-CSA_WINDOW+1),position),global:range(0,Math.floor((position+1)/CSA_STRIDE)-1).map(compressedSupport),previous:range(Math.max(0,(block-1)*CSA_STRIDE),block*CSA_STRIDE-1),current:range(block*CSA_STRIDE,position),evicted:position>=CSA_WINDOW?position-CSA_WINDOW:null};
}
const story=[{type:'start',position:-1,title:'Begin with empty stores'},...range(0,7).map(position=>({type:'arrival',position,title:`Position ${position} arrives`})),{type:'jump',position:127,title:'Jump to position 127 · intermediate arrivals processed'},...range(128,131).map(position=>({type:'arrival',position,title:`Position ${position} arrives`}))];
const sourceRange=entry=>[...entry.previous,...entry.current];
const span=a=>a.length?`${a[0]}–${a.at(-1)}`:'none';
export function csaMemoryDefinition(){
 const steps=story.map((s,i)=>{
  const m=memoryAt(s.position),complete=(s.position+1)%CSA_STRIDE===0&&s.position>=0;
  const detail=s.type==='start'?'Next follows h₀ into both branches. Position labels stand for vectors, not their coordinate values.':s.type==='jump'?'Positions 8–126 have been processed offscreen. At 127 there are 128 local entries and 32 completed compressed entries.':`${m.local.length} local ${m.local.length===1?'entry':'entries'}; ${m.global.length} completed compressed ${m.global.length===1?'entry':'entries'}. `+(complete?`Entry ${m.global.at(-1).id} is complete, using positions ${span(sourceRange(m.global.at(-1)))}. `:'The current four-position block is unfinished. ')+(m.evicted!==null?`Local position ${m.evicted} leaves the window; compressed entry 0 remains.`:'All positions so far still have individual local entries.');
  return {...s,scene:i,cell:0,label:s.title,detail,motionDetail:s.type==='arrival'?`Follow h${s.position} through the two projections. Both branches receive this input; local eviction does not feed the compressor.`:detail};
 });
 return {steps,scenes:steps.map((s,i)=>({title:s.title,start:i})),height:650,timing:(i,elapsed)=>({duration:steps[i].type==='arrival'?9000:3200,phase:Math.min(1,elapsed/(steps[i].type==='arrival'?9000:3200))}),render:(i,p,options)=>csaMemorySVG(i,p,options)};
}
const text=(x,y,s,cls='')=>`<text x="${x}" y="${y}" class="${cls}">${esc(s)}</text>`;
const rect=(x,y,w,h,cls='cm-panel')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" class="${cls}"/>`;
function chip(x,y,label,{newly=false,missing=false,width=59}={}){
 return rect(x,y,width,34,'cm-chip'+(newly?' cm-new':'')+(missing?' cm-missing':''))+text(x+width/2,y+22,label,'cm-number');
}
function packet(label,a,c1,c2,b,p,tone=''){
 const [x,y]=cubicPoint(a,c1,c2,b,ease(p)),width=Math.max(54,label.length*8+16);
 return `<g class="trace-packet ${tone}" transform="translate(${x.toFixed(2)} ${y.toFixed(2)})"><rect x="${-width/2}" y="-15" width="${width}" height="30" rx="3"/>${text(0,5,label)}</g>`;
}
const sparse=items=>items.length<=9?items:[...items.slice(0,4),null,...items.slice(-4)];
const displayedEntries=entries=>entries.length<=4?entries:[entries[0],entries[1],null,...entries.slice(-2)];
export function csaMemorySVG(index=0,phase=1,{motion=true}={}){
 const step=story[Math.max(0,Math.min(story.length-1,index))],p=motion?Math.max(0,Math.min(1,phase)):1,t=step.position,arrival=step.type==='arrival';
 const before=memoryAt(arrival?t-1:t),after=memoryAt(t),inserted=!arrival||p>=.51,complete=arrival&&(t+1)%CSA_STRIDE===0,emitted=!arrival||p>=.75;
 const local=(inserted?after:before).local,entries=(emitted?after:before).global,candidates=inserted?after:before;
 const localDestination=455+Math.max(0,sparse(after.local).length-1)*70+29.5,currentDestination=455+Math.max(0,after.current.length-1)*76+29.5;
 const shown=displayedEntries(entries),incoming=Math.max(0,t);let routes=[
  'M180 295 C200 295 195 130 230 130','M180 295 C200 295 195 380 230 380',
  `M400 130 C415 130 420 154 ${localDestination} 154`,`M400 380 C415 380 420 444 ${currentDestination} 444`
 ].map(d=>`<path class="cm-route" d="${d}"/>`).join('');
 let body=text(20,30,step.title,'cm-title')+text(20,53,'Window 128 · one summary every 4 positions · previous-block overlap','cm-small');
 body+=rect(20,250,160,90)+text(34,276,'Attention input','cm-label')+text(100,307,step.type==='start'?'h₀ ready':`h${incoming}`,'cm-input');
 body+=rect(230,90,170,80)+text(243,116,'Local projection','cm-label')+text(243,143,'W_local → ℓₜ','cm-small');
 body+=rect(230,340,170,95)+text(243,367,'Candidate maps','cm-label')+text(243,394,'W_C and W_Z','cm-small')+text(243,417,'Both overlap roles','cm-small');
 body+=rect(440,70,675,155)+text(454,96,`Local window · ${local.length} / 128 entries`,'cm-label')+text(454,120,'Individual entries · labels are source token positions','cm-small');
 sparse(local).forEach((v,i)=>{body+=chip(455+i*70,137,v===null?'…':v,{newly:arrival&&inserted&&v===t});});
 if(!local.length)body+=text(455,160,'No individual entries yet','cm-small');
 body+=text(454,205,local.length?`Retained positions ${span(local)}`:'The first input will enter both branches.','cm-small');
 if(arrival&&inserted&&after.evicted!==null)body+=`<path class="cm-eviction" d="M510 225 V250"/>`+text(526,251,`Local ${after.evicted} leaves; compressed entry 0 stays.`,'cm-eviction-label');
 body+=rect(440,285,350,245)+text(454,312,'Candidates for the current entry','cm-label');
 body+=text(454,341,'Previous block · previous-role content/scores','cm-small');
 range(0,3).forEach(i=>{const v=candidates.previous[i];body+=chip(455+i*76,352,v??'—',{missing:v===undefined});});
 body+=text(454,416,'Current block · current-role content/scores','cm-small');
 range(0,3).forEach(i=>{const v=candidates.current[i];body+=chip(455+i*76,427,v??'—',{newly:arrival&&inserted&&v===t,missing:v===undefined});});
 const available=candidates.current.length;
 body+=text(454,493,available===4?'All four current positions are present.':`${available} / 4 current positions · entry unfinished`,'cm-small');
 body+=text(454,515,!candidates.previous.length?'No previous block: missing slots take zero share.':'Pool previous + current candidates at completion.','cm-small');
 body+=rect(835,285,280,310)+text(849,312,`Compressed memory · ${entries.length} ${entries.length===1?'entry':'entries'}`,'cm-label')+text(849,335,'Entry ID · contributing source positions','cm-small');
 shown.forEach((e,i)=>{
  const y=350+i*46;
  if(e===null){body+=text(971,y+24,'… earlier entries remain …','cm-omitted');return;}
  body+=rect(849,y,252,39,`cm-entry${arrival&&complete&&emitted&&e.id===after.global.at(-1).id?' cm-new':''}`)+text(862,y+25,`Entry ${e.id}`,'cm-label')+text(1090,y+25,span(sourceRange(e)),'cm-support');
 });
 if(!entries.length)body+=text(849,375,'No completed summary yet','cm-small');
 let packets='';
 if(arrival&&motion){
  if(p>=.09&&p<.31){const v=(p-.09)/.22;packets+=packet(`h${t}`,[180,295],[200,295],[195,130],[230,130],v)+packet(`h${t}`,[180,295],[200,295],[195,380],[230,380],v,'rust');}
  if(p>=.31&&p<.51){const v=(p-.31)/.20;
   packets+=packet(`ℓ${t}`,[400,130],[415,130],[420,154],[localDestination,154],v);
   packets+=packet(`c${t}, z${t}`,[400,380],[415,380],[420,444],[currentDestination,444],v,'rust');
  }
  if(complete){const targetRows=displayedEntries(after.global).length,y=350+(targetRows-1)*46+19.5;
   routes+=`<path class="cm-route cm-pool-route" d="M790 480 C812 480 815 ${y} 975 ${y}"/>`;
   if(p>=.51&&p<.75)packets+=packet(`Entry ${after.global.at(-1).id}`,[790,480],[812,480],[815,y],[975,y],(p-.51)/.24,'rust');
  }
 }
 if(step.type==='jump')body+=rect(20,545,770,48,'cm-jump')+text(34,576,'Positions 8–126 were processed between these states; no input waited for eviction.','cm-small');
 else body+=text(20,580,complete&&emitted?'The completed summary is retained alongside its source positions’ local entries.':complete?'This arrival completes a block; its summary will enter compressed memory.':'Each arriving hₜ supplies both branches. Only a completed block emits a summary.','cm-small');
 body+=text(20,614,'Schematic vector movement. Position labels identify sources; numerical pooling is calculated above.','cm-small');
 body+=text(20,636,'Entry packets include the pooling, normalization and positional preparation explained above.','cm-small');
 return `<svg xmlns="http://www.w3.org/2000/svg" class="calculation-trace csa-memory-svg" viewBox="0 0 1140 650" role="img" aria-label="${esc(step.title)}"><title>${esc(step.title)}: concurrent local and compressed stores</title><g aria-hidden="true">${routes}</g>${body}<g data-trace-motion="" aria-hidden="true">${packets}</g></svg>`;
}
export function csaMemoryFigure(){
 return '<figure id="compression--memory-trace" class="week-study csa-memory-study"><figcaption>Build both memories as tokens arrive<span>Follow 0–7, jump explicitly to 127, then follow 128–131. The window stays at V4’s actual 128 positions.</span></figcaption><div class="week-viewport" tabindex="0" role="region" aria-label="Concurrent CSA memory trace; scroll horizontally if needed"><div data-week-diagram>'+csaMemorySVG()+'</div></div></figure>';
}
