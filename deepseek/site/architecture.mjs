import {layoutArchitecture} from './architecture-layout.mjs';
import {configurations} from './forward.mjs';
import {poolRows,softmax,routeExample,layerOwners} from './models.mjs';
import {residualWalkthrough,readoutWalkthrough} from './week-models.mjs';
const e=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=x=>Number.isInteger(x)?String(x):Number(x).toFixed(3).replace(/0+$/,'').replace(/\.$/,'');
const vec=v=>'('+v.map(n).join(', ')+')';
export const initialArchitecture=()=>({variant:'flash',index:0,panel:null,step:0,playing:false});
export function architectureStages(variant='flash'){
 if(!configurations[variant])throw new RangeError('Unknown model');
 return variant==='v41'?['embedding','encoder-attention','encoder-experts','memory','attention','experts','head','output']:['embedding','compression','attention','experts','residual','head','output'];
}
const specs={
 embedding:{title:'Embedding and residual streams',kind:'embedding',url:'#v41-forward--input',description:'IDs select learned rows. Each row begins as four equal residual copies. V4.1 first merges the visual rows at their reserved positions.'},
 'encoder-attention':{title:'Causal encoder attention',kind:'attention',url:'#reuse--full-layer-calculation',description:'Twenty lower layers build causal representations. Their own local state and the CSA2 ownership schedule determine the entries available to each query.'},
 'encoder-experts':{title:'Encoder experts',kind:'experts',url:'#experts--selection-weight',description:'A router selects six experts from the backbone collection. The shared expert also runs. Each output returns to the four-stream residual through mHC.'},
 compression:{title:'Values, gates and compressed memory',kind:'compression',url:'#compression--weighted-block',description:'V4 forms coordinatewise weighted summaries. CSA overlaps neighbouring blocks at stride four; HCA uses non-overlapping groups of 128.'},
 memory:{title:'Encoder memory and layer ownership',kind:'memory',url:'#ced--ced-two-inputs',description:'The reported CED design constructs decoder global memory from the encoder boundary. Queries and recent-window KV still come from the current decoder state.'},
 attention:{title:'Local and global attention',kind:'attention',url:'#attention--local-global',description:'Main queries compare with local entries and selected global entries. Both lists compete in one denominator, including the learned zero-value sink.'},
 experts:{title:'Routed and shared experts',kind:'experts',url:'#experts--expert-function',description:'Selection corrections change which experts execute. Their original affinities determine mixture weights; each expert uses its own SwiGLU transformation.'},
 residual:{title:'Four residual streams and mHC',kind:'residual',url:'#residuals--wider-stream',description:'One mixture enters the sublayer. Residual transport mixes the original streams, while output-injection gains distribute the new result across them.'},
 head:{title:'Reducing four streams to one',kind:'head',url:'#v41-forward--head-and-draft',description:'V4 predicts a separate final mixture. V4.1 consumes the mixture carried from its last FFN. Final RMSNorm precedes the vocabulary projection.'},
 output:{title:'Vocabulary scores and the next ID',kind:'output',url:'#v4-forward--generation',description:'The vocabulary map gives scores. A chosen decoding rule returns an identifier, which is appended and looked up on the next model call.'},
 vision:{title:'Image features enter at the embedding boundary',kind:'vision',url:'#vision--visual-packing-interface',description:'The vision encoder processes patches. Channel-major 3 × 3 packing precedes the learned projector; the resulting rows replace the reserved image positions.'},
 engram:{title:'Conditional memory at layers 1 and 14',kind:'engram',url:'#engram--released-hash',description:'Adjacent token suffixes choose table rows. The contextual residual then gates the retrieved value separately for each of four copies.'},
 draft:{title:'DSpark proposes; the target verifies',kind:'draft',url:'#prediction--dspark',description:'Taps before layers 37, 38 and 39 seed three heavy draft blocks. Five Markov proposal steps follow. Only verification decides what becomes committed history.'}
 ,mtp:{title:'V4 auxiliary multi-token prediction',kind:'mtp',url:'#prediction--mtp',description:'The backbone state and the actual next-token embedding are separately normalized and projected. Their four-row fusion enters an auxiliary block, whose readout predicts one additional token ahead.'}
};
export function stageSpec(key,variant='flash'){
 const s=specs[key];if(!s)throw new RangeError('Unknown component');
 const url=variant==='v41'?s.url:key==='embedding'?'#v4-forward--embedding':key==='head'?'#v4-forward--readout':s.url;
 const description=variant==='v41'?s.description:key==='embedding'?'IDs select learned embedding rows. Each row begins as four equal residual copies, which later updates can mix differently.':key==='head'?'V4 predicts a final mixture of its four residual streams. Learned RMSNorm precedes the vocabulary projection.':s.description;
 return {...s,url,description};
}
export function calculation(kind){
 const cards=(titles,values)=>titles.map((title,i)=>({title,lines:values[i]}));
 if(kind==='compression'){
  const values=[[1,4],[5,2]],scores=[[0,Math.log(3)],[Math.log(3),0]],result=poolRows(values,scores,2)[0];
  return {title:'Two coordinates need two mixtures',result,steps:cards(['Values and scores','Gate softmax','Weighted products','Pooled row'],[['C: '+vec(values[0]),vec(values[1]),'Z: (0, ln 3), (ln 3, 0)'],['coordinate 0: ¼, ¾','coordinate 1: ¾, ¼'],['¼ × 1 + ¾ × 5','¾ × 4 + ¼ × 2'],[vec(result)]]),note:'Chosen two-row block. Softmax runs over source positions separately for each coordinate; this is the pooling core, before normalization and position.'};
 }
 if(kind==='attention'){
  const entries=[[0,2],[Math.log(3),10]],query=[Math.sqrt(2),0],logits=entries.map(k=>query.reduce((s,q,i)=>s+q*k[i],0)/Math.sqrt(2)),weights=softmax([...logits,Math.log(4)]),result=entries[0].map((_,k)=>entries.reduce((s,v,i)=>s+weights[i]*v[k],0));
  return {title:'Local, global and sink share one denominator',result,weights,steps:cards(['Query and shared KV','Scaled dot products','One softmax','Weighted value sum'],[['q = (√2, 0)','local = (0, 2)','global = (ln 3, 10)'],['q · local / √2 = 0','q · global / √2 = ln 3','sink score = ln 4'],['amounts: 1, 3, 4','denominator: 8','shares: ⅛, ⅜, ½'],['⅛ local + ⅜ global',vec(result),'sink value = (0, 0)']]),note:'Chosen width-two illustration with one local and one global entry. Each entry is both key and value, as in the main shared-KV path; the actual heads have width 512.'};
 }
 if(kind==='experts'){
  const r=routeExample(1),result=r.output;
  return {title:'The Day 1 mixture after the selection correction',result,steps:cards(['Original affinities','Select with correction','Original-weight mixture','Add the shared expert'],[['a₀ = '+n(r.affinity[0]),'a₁ = '+n(r.affinity[1]),'a₂ = '+n(r.affinity[2])],['expert 2 correction = 1','score₂ = '+n(r.selection[2]),'choose IDs 1 and 2'],['g₁ = '+n(r.weights[1]),'g₂ = '+n(r.weights[2]),'routed: '+vec(r.routed)],['shared: '+vec(r.shared),'final: '+vec(result)]]),note:'The same chosen routed outputs and computed shared expert as Day 1. Original affinities determine weights after the correction chooses IDs. The full V4 backbone selects six routed experts.'};
 }
 if(kind==='residual'){
  const m=residualWalkthrough(),result=m.output;
  return {title:'The four-stream calculation from Day 2',result,steps:cards(['Retained streams','One sublayer input','Two return paths','Updated streams'],[m.X.map(vec),['A = (¼, ¼, ¼, ¼)','AX = '+vec(m.input[0]),'supplied F = (2, −1)'],['B: average neighbours','C = (½, 1, ½, 1)','X⁺ = BX + C F(AX)'],result.map(vec)]),note:'The same matrices and supplied width-two sublayer update as Day 2. The complete coefficient tables are in the residual derivation. Each actual V4 sublayer predicts its own coefficients.'};
 }
 if(kind==='output'){
  const m=readoutWalkthrough(),p=m.probabilities,id=p.indexOf(Math.max(...p));
  return {title:'Continue the Day 6 readout into a selected ID',result:p,steps:cards(['One normalized row','Vocabulary map','Temperature-one softmax','Choose and append'],[['h = '+vec(m.normalized),'three-ID illustration'],['W_U row 0: (1,0,−1)','W_U row 1: (0,1,1)','logits: '+vec(m.logits)],['p = '+vec(p),'probabilities sum to 1'],['greedy ID = '+id,'append ID → embedding lookup']]),note:'Uses the Day 6 readout’s computed row and displayed vocabulary matrix. Greedy selection is one decoding rule; the real vocabulary has 129,280 IDs.'};
 }
 if(kind==='head'){
  const m=readoutWalkthrough(),result=m.normalized;
  return {title:'The Day 6 stream reduction and normalization',result,steps:cards(['Four retained rows','Supplied mixture','Weighted sum','Final RMSNorm'],[m.X.map(vec),['a = (¼, ½, ¼, ½)','one gain per stream','gains sum to 1.5'],['aX = '+vec(m.mixed),'two features remain'],['RMS = '+n(m.rms),'h = '+vec(result)]]),note:'Continues the Day 2 residual illustration using Day 6’s chosen readout gains. Unit normalization gains and negligible epsilon isolate the arithmetic. V4 predicts its final mixture separately; V4.1 uses its carried mixture.'};
 }
 if(kind==='embedding')return {title:'Identifiers select rows, then copies are made',result:[[1,1],[1,0],[0,2]],steps:cards(['Input identifiers','Learned table rows','Gather in sequence order','Four residual copies'],[['IDs: 2, 0, 1'],['E[0]=(1,0)','E[1]=(0,2)','E[2]=(1,1)'],['(1,1)','(1,0)','(0,2)'],['repeat each row four times','3 positions × 4 streams × 2']]),note:'Chosen table values. In the actual model, the vocabulary and feature widths are larger. V4.1 merges image rows before making the four copies.'};
 if(kind==='memory'){
  const r=layerOwners(27);return {title:'Shared entries do not imply shared comparisons',result:r,steps:cards(['Cache creation','Fresh address selection','Reuse at layer 27','Fresh main attention'],[['layer 20 owns global KV','ratio one in the decoder'],['layer 24 keeps that KV','computes a new address list'],['KV source: '+r.kv,'index source: '+r.index,'mode: '+r.mode],['layer 27 forms its query','and its own local KV','recalculates probabilities']]),note:'Exact V4.1 ownership example. The encoder-source convention follows the reported CED design; the minimal all-layer Python path and its execution boundary are explained in the linked derivation.'};
 }
 if(kind==='vision')return {title:'Packing preserves coordinates before projection',result:15,steps:cards(['Contextual patch grid','Choose one coordinate','Channel-major destination','Language row'],[['3 × 3 spatial neighbourhood','1024 features at each patch'],['feature channel k = 1','local offset (a,b) = (2,0)'],['9k + 3a + b','9 + 6 + 0 = 15','F[2,0,1] → u[15]'],['9216 → 5120 → 5120','affine → GELU → affine','replace reserved input row']]),note:'Exact channel order with a chosen coordinate. The selected output group begins at patch-grid position (0,0); no averaging occurs during rearrangement.'};
 if(kind==='engram')return {title:'A suffix supplies addresses; context supplies gates',result:[5,10],steps:cards(['Adjacent compressed IDs','Multiply and XOR','Remainder plus offset','Retrieve, project, gate'],[['lookbacks: (5, 2, 4)','chosen multipliers: (3,5,7)'],['order 2: 15 XOR 10 = 5','order 3: 5 XOR 28 = 25'],['size 7, offset 0 → row 5','size 11, offset 7 → row 10'],['concatenate retrieved rows','four keys + one shared value','context gates each stream']]),note:'Small chosen hash values and one head per order. The released module uses eight heads for each of orders two, three and four, with its own large prime ranges.'};
 if(kind==='draft')return {title:'Proposal and target mass must agree after verification',result:[.5,.3,.2],steps:cards(['Target and proposal','Accepted overlap','Rejected residual','Final output mass'],[['p = (0.5, 0.3, 0.2)','q = (0.2, 0.6, 0.2)'],['min(p,q) = (0.2,0.3,0.2)','accepted mass = 0.7'],['[p−q]₊ = (0.3,0,0)','rejection probability = 0.3'],['overlap + missing mass','(0.5, 0.3, 0.2)']]),note:'Chosen three-token exact-sampling example, not a DSpark production verifier. Confidence can guide scheduling; it cannot authorize an unverified token.'};
 if(kind==='mtp')return {title:'The known next embedding is broadcast across streams',result:[1.5,2.5,3.5,4.5],steps:cards(['Projected hidden rows','Projected next embedding','Add to every stream','Auxiliary block + head'],[['one chosen coordinate','across four streams:','(1, 2, 3, 4)'],['one chosen coordinate: 0.5','the actual next token','is supplied during training'],['(1.5, 2.5, 3.5, 4.5)','four streams remain'],['local attention + experts','own stream reduction','shared vocabulary map']]),note:'Chosen projected coordinates illustrate only the fusion addition. Separate RMSNorms and learned maps precede it. The ordinary backbone predicts t+1; this teacher-forced auxiliary branch predicts t+2.'};
 throw new RangeError('Unknown calculation');
}

const text=(x,y,s,cls='',anchor='middle')=>`<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${e(s)}</text>`;
const path=(d,phase,cls='')=>`<path d="${d}" class="arch-wire ${cls}"/><path d="${d}" pathLength="100" class="arch-flow" data-arch-phase="${phase}"/>`;
function node(key,x,y,w,h,title,sub='',tone='neutral'){
 return `<g class="arch-node ${tone}" data-arch-node="${key}" role="button" tabindex="0" aria-label="Inspect ${e(title)}" aria-expanded="false"><rect class="arch-depth" x="${x+3}" y="${y+4}" width="${w}" height="${h}" rx="4"/><rect class="arch-face" x="${x}" y="${y}" width="${w}" height="${h}" rx="4"/>${text(x+w/2,y+(sub?h/2-3:h/2+5),title,'arch-node-name')}${sub?text(x+w/2,y+h/2+17,sub,'arch-node-sub'):''}</g>`;
}
export function architectureDiagram(variant='flash',index=0){
 const c=configurations[variant];if(!c)throw new RangeError('Unknown model');
 const active=architectureStages(variant)[index];
 const body=layoutArchitecture(c,variant,{node,path,text}).replaceAll(`data-arch-node="${active}"`,`data-arch-node="${active}" data-active="true"`);
 return `<svg class="deepseek-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 820 820" role="group" aria-label="Interactive ${c.name} architecture; read from input at the bottom to vocabulary output at the top" data-active-stage="${active}">${body}</svg>`;
}
export function calculationDiagram(kind,step=0){
 const c=calculation(kind);let b='';
 const packets={compression:['(1, 4)','¼, ¾','(4, 3.5)'],attention:['(√2, 0)','0, ln 3','⅛, ⅜'],experts:['a₁ = 1.458','IDs 1, 2','g₁ = 1.084'],residual:['four streams','(1, 0.5)','(2, −1)'],head:['four streams','¼, ½, ¼, ½','(2.5, 0.875)'],embedding:['2, 0, 1','E[2] = (1,1)','(1,1)'],output:['normalized h','three logits','greedy ID 0'],memory:['KV: 20','indices: 24','20 / 24'],vision:['F[2,0,1]','k=1, a=2','u[15]'],engram:['5, 2, 4','5 XOR 28','5, 10'],draft:['p, q','0.2, 0.3, 0.2','0.3, 0, 0'],mtp:['1,2,3,4','0.5','1.5,2.5,3.5,4.5']};
 for(let i=0;i<4;i++){
  const x=20+i*198;b+=`<g class="arch-compute-step" data-reached="${i<=step}" data-current="${i===step}"><rect x="${x}" y="57" width="174" height="229" rx="4"/>${text(x+12,82,String(i+1).padStart(2,'0'),'arch-card-number','start')}${text(x+87,111,c.steps[i].title,'arch-card-title')}${c.steps[i].lines.map((s,j)=>text(x+87,154+j*29,s,'arch-card-value')).join('')}</g>`;
  if(i<3)b+=`<path class="arch-calc-wire" d="M${x+174} 176 H${x+198} m-6 -4 l6 4 -6 4"/><g class="arch-value-packet" data-packet-step="${i+1}" data-active="${step===i+1}"><rect x="${x+28}" y="14" width="120" height="27" rx="2"/>${text(x+88,32,packets[kind][i],'arch-packet-value')}</g>`;
 }
 return `<svg class="arch-computation" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 810 315" role="group" aria-label="${e(c.title)}; four computed stages, selected step ${step+1}">${b}</svg>`;
}
export function architectureGraphic(state){
 if(!state.panel)return architectureDiagram(state.variant,state.index);
 const s=stageSpec(state.panel,state.variant),c=calculation(s.kind);
 return `<div class="arch-operation"><div class="arch-operation-heading"><strong>${e(s.title)}</strong><button type="button" data-arch-back>← Architecture</button></div><p class="arch-computation-title">${e(c.title)}</p><div class="arch-calculation-scroll" tabindex="0" role="region" aria-label="Computed stages; scroll horizontally if needed">${calculationDiagram(s.kind,state.step)}</div><ol class="arch-step-tabs">${c.steps.map((r,i)=>`<li><button type="button" data-arch-step="${i}" aria-pressed="${state.step===i}">${i+1}. ${e(r.title)}</button></li>`).join('')}</ol><p class="arch-calculation-note">${e(c.note)}</p><a class="arch-derivation" href="${s.url}">Read the derivation ↓</a></div>`;
}
export function architectureDetail(state){const key=state.panel??architectureStages(state.variant)[state.index],s=stageSpec(key,state.variant);return `<strong>${s.title}</strong><p>${e(s.description)}</p>`;}
export function architectureFigure(){const s=initialArchitecture(),count=architectureStages(s.variant).length;return `<figure class="architecture-plate deepseek-architecture" data-deepseek-architecture><div class="architecture-heading"><strong>DeepSeek architecture</strong><button type="button" data-arch-enlarge>Enlarge diagram</button></div><div class="variant-controls" role="group" aria-label="Architecture variant">${Object.entries(configurations).map(([key,c])=>`<button type="button" data-arch-variant="${key}" aria-pressed="${key===s.variant}">${c.name}</button>`).join('')}</div><div class="deepseek-canvas" data-arch-graphic>${architectureGraphic(s)}</div><div class="arch-controls"><div class="arch-control-buttons"><button type="button" data-arch-play aria-pressed="false">Play</button><button type="button" data-arch-next>Next</button><button type="button" data-arch-reset>Restart</button></div><label class="arch-scrubber"><span data-arch-position>1 / ${count}</span><input type="range" min="0" max="${count-1}" step="1" value="0" data-arch-scrubber aria-label="Architecture or calculation stage"></label></div><figcaption class="architecture-caption"><div data-arch-detail aria-live="polite">${architectureDetail(s)}</div><p class="arch-citation">Select a block to open its calculation. Architecture flow is schematic; calculation panels use labelled examples.</p></figcaption></figure>`;}

export function createArchitecturePlayer({onChange,schedule=setTimeout,cancel=clearTimeout,delay=7000}){
 let s=initialArchitecture(),timer=null;
 const length=()=>s.panel?4:architectureStages(s.variant).length;
 const position=()=>s.panel?s.step:s.index;
 const emit=()=>{if(timer!==null){cancel(timer);timer=null;}onChange({...s});if(s.playing)timer=schedule(()=>{timer=null;const p=position();if(p+1>=length()){s.playing=false;emit();return;}if(s.panel)s.step++;else s.index++;if(position()===length()-1)s.playing=false;emit();},delay);};
 const api={state:()=>({...s}),play(){if(position()===length()-1){if(s.panel)s.step=0;else s.index=0;}s.playing=true;emit();},pause(){s.playing=false;emit();},next(){s.playing=false;if(s.panel)s.step=Math.min(3,s.step+1);else s.index=Math.min(length()-1,s.index+1);emit();},reset(){s.playing=false;if(s.panel)s.step=0;else s.index=0;emit();},select(i){if(!Number.isInteger(i)||i<0||i>=length())return;s.playing=false;if(s.panel)s.step=i;else s.index=i;emit();},variant(v){if(!configurations[v])return;s={...initialArchitecture(),variant:v};emit();},inspect(key){if(!specs[key])return;s.playing=false;s.panel=key;s.step=0;const idx=architectureStages(s.variant).indexOf(key);if(idx>=0)s.index=idx;emit();},back(){s.playing=false;s.panel=null;s.step=0;emit();},destroy(){if(timer!==null)cancel(timer);timer=null;s.playing=false;}};
 emit();return api;
}
