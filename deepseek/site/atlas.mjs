import {configurations} from './forward.mjs';
import {layerOwners} from './models.mjs';

const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const label=(x,y,s,cls='',anchor='start')=>`<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${esc(s)}</text>`;
const line=(d,cls='')=>`<path class="atlas-wire ${cls}" d="${d}"/>`;
function arrow(d,x,y,dir='down',cls=''){
 const head=dir==='down'?`M${x-4} ${y-7} L${x} ${y} L${x+4} ${y-7}`:dir==='left'?`M${x+7} ${y-4} L${x} ${y} L${x+7} ${y+4}`:`M${x-7} ${y-4} L${x} ${y} L${x-7} ${y+4}`;
 return line(d,cls)+line(head,cls);
}
function box(x,y,w,h,title,sub,url,cls=''){
 return `<a href="${url}" aria-label="Read: ${esc(title)}"><rect class="atlas-node ${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="3"/>${label(x+16,y+27,title,'atlas-node-title')}${sub?label(x+16,y+48,sub,'atlas-small'):''}</a>`;
}
const ribbon=(x,y,h)=>`<rect class="atlas-ribbon" x="${x}" y="${y}" width="8" height="${h}" rx="1"/>`;
const plate=(w,h,description,body)=>`<svg viewBox="0 0 ${w} ${h}" role="group" aria-label="${esc(description)}"><title>${esc(description)}</title><rect class="atlas-ground" x="0" y="0" width="${w}" height="${h}"/>${Array.from({length:Math.floor(w/40)},(_,i)=>line(`M${40*(i+1)} 0 V${h}`,'atlas-grid')).join('')}${Array.from({length:Math.floor(h/40)},(_,i)=>line(`M0 ${40*(i+1)} H${w}`,'atlas-grid')).join('')}${body}</svg>`;

export function ownershipRows(){
 return Array.from({length:configurations.v41.layers},(_,layer)=>({layer,...layerOwners(layer)}));
}
export function routedBank(){
 // Illustrative identities, never a claim about a trained token's dispatch.
 const selected=[9,37,80,134,195,241];
 return Array.from({length:256},(_,id)=>({id,selected:selected.includes(id)}));
}

function whole(){
 const c=configurations.v41;
 let b=label(40,45,'V4.1 FLASH','atlas-overline')+label(1040,45,'A map of representations and dependencies','atlas-small','end');
 b+=box(350,86,370,65,'Text token IDs','129,280-row embedding table','#v41-forward--input','atlas-accent');
 b+=box(40,86,230,65,'Image pixels','14 × 14 patches','#vision--patch-order');
 b+=arrow('M155 151 V178',155,178)+box(40,178,230,69,'Vision transformer','32 layers → packing → projector','#vision--vit-layer');
 b+=box(350,178,370,69,'Merge the embedding rows',`Text and visual rows · width ${c.dim}`,'#vision--merge','atlas-accent');
 b+=arrow('M535 151 V178',535,178)+arrow('M270 212 H350',350,212,'right');
 b+=arrow('M535 247 V272',535,272);
 b+=label(535,292,'Repeat each row into four residual streams','atlas-small','middle');
 for(let a=0;a<4;a++)b+=ribbon(422+a*70,307,499);
 const rows=ownershipRows();
 for(const [start,y,title] of [[0,327,'CAUSAL ENCODER · LAYERS 0–19'],[20,592,'DECODER · LAYERS 20–39']]){
  b+=`<rect class="atlas-stack-frame" x="350" y="${y}" width="370" height="214" rx="3"/>`+label(368,y+25,title,'atlas-overline');
  for(let local=0;local<20;local++){
   const l=start+local,r=rows[l],ry=y+43+local*8;
   b+=`<rect class="atlas-layer ${r.mode==='Full'?'atlas-owner':r.mode==='Reindex'?'atlas-reindex':''}" x="370" y="${ry}" width="330" height="5"/>`;
   if(local%5===0||local===19)b+=label(339,ry+6,String(l).padStart(2,'0'),'atlas-tick','end');
  }
 }
 b+=label(535,568,'Encoder boundary · one width-5120 row per position','atlas-small','middle');
 b+=box(40,354,230,64,'Engram at layer 1','Short suffix → gated addition','#engram--engram-complete-update','atlas-warm');
 b+=box(40,466,230,64,'Engram at layer 14','196B memory parameters in total','#engram--released-hash','atlas-warm');
 b+=arrow('M270 386 H310 V380 H370',370,380,'right','atlas-memory')+arrow('M270 498 H310 V484 H370',370,484,'right','atlas-memory');
 b+=label(40,565,'Four streams are retained.','atlas-small')+label(40,585,'Attention and MoE each','atlas-small')+label(40,605,'process one mixed row.','atlas-small');
 b+=label(780,304,'GLOBAL MEMORY OWNERS','atlas-overline');
 for(const [l,cy] of [[2,386],[8,434],[14,482]]){
  b+=box(780,cy-24,260,48,`Layer ${l} · pair-compressed`,'','#reuse--schedule');
  b+=arrow(`M720 ${cy} H780`,780,cy,'right','atlas-memory');
 }
 b+=box(780,589,260,69,'Layer 20 · decoder global KV','One entry per encoder-source row','#ced--ced-two-inputs','atlas-accent');
 b+=arrow('M720 556 H760 V622 H780',780,622,'right','atlas-memory');
 b+=arrow('M910 658 V685 H720',720,685,'left','atlas-memory');
 b+=label(780,709,'Reuse entries; choose addresses;','atlas-small')+label(780,729,'calculate fresh main attention.','atlas-small');
 b+=box(40,660,230,90,'Inside every block','Local attention + routed/shared MoE','#v41-forward--single-pass-block');
 b+=label(56,730,'Single-Pass mHC around both','atlas-small');
 b+=line('M720 773 H754 V785 H780','atlas-draft');
 b+=box(780,757,260,69,'DSpark · three draft blocks','Taps before layers 37, 38 and 39','#prediction--dspark-fusion','atlas-warm');
 b+=arrow('M910 826 V852',910,852,'down','atlas-draft');
 b+=box(780,852,260,69,'Five proposed token IDs','Markov steps → target verification','#prediction--verification','atlas-warm');
 b+=arrow('M535 806 V851',535,851)+box(350,851,370,65,'Carried mixture + final RMSNorm','Four rows become one width-5120 row','#v41-forward--head-and-draft');
 b+=arrow('M535 916 V945',535,945)+box(350,945,370,65,'Vocabulary scores → chosen ID','The next ID returns to the embedding lookup','#v4-forward--generation','atlas-accent');
 b+=label(40,966,'Solid: representation path','atlas-small')+label(40,988,'Dashed: memory or draft dependency','atlas-small');
 return plate(1080,1040,'V4.1 complete architecture: visual and text input, forty residual-stream layers, four global-cache owners, Engram, readout and drafting',b);
}

function block(){
 let b=label(40,45,'V4 FLASH · ONE OF 43 BACKBONE BLOCKS','atlas-overline')+label(1040,45,'Logical shapes · schematic','atlas-small','end');
 for(let a=0;a<4;a++)b+=ribbon(66+a*24,93,1042);
 b+=label(40,81,'4 × 4096 residual state','atlas-small');
 b+=box(245,88,795,72,'Predict the three residual maps','Input mixture A · residual transport B · output injection C','#residuals--coefficient-map');
 b+=arrow('M146 123 H245',245,123,'right');
 b+=box(435,200,405,67,'Mix original streams → learned RMSNorm','One width-4096 input supplies parallel branches','#v4-forward--attention-update','atlas-accent');
 b+=arrow('M640 160 V200',640,200)+arrow('M146 232 H435',435,232,'right');
 const branches=[{x:220,title:'Query latent',sub:'4096 → 1024',url:'#attention--query-construction'},{x:435,title:'Local KV',sub:'4096 → 512',url:'#attention--local-global'},{x:650,title:'Main compressor',sub:'Values + gates → 512',url:'#compression--projection-order'},{x:865,title:'Index compressor',sub:'Own values + gates → 128',url:'#attention--two-comparisons'}];
 b+=line('M640 267 V297 H312 V325')+line('M640 297 H957 V325')+line('M527 297 V325')+line('M742 297 V325');
 for(const n of branches)b+=box(n.x,325,185,70,n.title,n.sub,n.url);
 b+=arrow('M312 395 V456',312,456)+box(220,456,185,70,'64 main queries','512 coordinates each','#attention--query-construction');
 b+=arrow('M742 395 V456',742,456)+box(650,456,185,70,'Global KV entries','Overlap · stride four','#compression--v4-overlap');
 b+=arrow('M957 395 V456',957,456,'down','atlas-memory')+box(865,456,185,100,'Indexer + Top-K','64 query heads × 128','#attention--two-comparisons','atlas-warm');
 b+=label(881,535,'Retain up to 512 addresses','atlas-small');
 b+=arrow('M405 365 H418 V427 H957 V456',957,456,'down','atlas-memory');
 b+=label(586,419,'The query latent also supplies index queries','atlas-small','middle');
 b+=arrow('M312 526 V577 H435',435,577,'right');
 b+=arrow('M527 395 V561',527,561);
 b+=arrow('M742 526 V561',742,561);
 b+=box(435,561,405,92,'Joint local + selected-global attention','One normalization, including a learned sink','#attention--sink','atlas-accent');
 b+=label(451,631,'Each stored 512-vector is both key and value','atlas-small');
 b+=arrow('M957 556 V607 H840',840,607,'left','atlas-memory');
 b+=arrow('M637 653 V693',637,693)+box(435,693,405,69,'Inverse RoPE → grouped output','64 × 512 → 8 × 1024 → 4096','#positions--grouping');
 b+=arrow('M637 762 V796 H146',146,796,'left');
 b+=`<rect class="atlas-junction" x="54" y="779" width="116" height="34"/>`+label(112,802,'BᴬX + Cᴬo','atlas-small','middle');
 b+=label(186,784,'Attention residual update','atlas-small');
 b+=arrow('M146 840 H435',435,840,'right');
 b+=box(435,813,605,69,'Predict new maps → mix → learned FFN RMSNorm','The expert input comes from the updated residual streams','#v4-forward--expert-update');
 b+=arrow('M737 882 V909',737,909);
 b+=`<rect class="atlas-stack-frame" x="245" y="909" width="795" height="156" rx="3"/>`;
 b+=label(263,936,'256 ROUTED EXPERTS · SIX EXECUTE','atlas-overline');
 for(const r of routedBank()){
  const x=263+(r.id%32)*18,y=951+Math.floor(r.id/32)*10;
  b+=`<rect class="atlas-expert ${r.selected?'atlas-expert-selected':''}" data-expert="${r.id}" data-selected="${r.selected}" x="${x}" y="${y}" width="14" height="6"/>`;
 }
 b+=label(263,1050,'Lit identities are illustrative; routing is input-dependent.','atlas-small');
 b+=box(862,943,160,74,'Shared expert','Runs for every token','#experts--capacity','atlas-warm');
 b+=arrow('M637 1065 V1104 H146',146,1104,'left');
 b+=`<rect class="atlas-junction" x="54" y="1087" width="116" height="34"/>`+label(112,1110,'BᶠY + Cᶠe','atlas-small','middle');
 b+=label(186,1128,'Expert residual update → next block','atlas-small');
 b+=label(1040,1150,'Four streams continue; no extra ordinary residual is added.','atlas-small','end');
 return plate(1080,1175,'Exploded V4 Flash block: four residual streams, independent query and KV branches, sparse selection, joint attention, grouped output, six of 256 routed experts and one shared expert',b);
}

function ownership(layer=27){
 if(!Number.isInteger(layer)||layer<0||layer>39)throw new RangeError('Layer must be 0 through 39');
 const rows=ownershipRows();let b=label(40,45,'V4.1 · GLOBAL OWNERSHIP ACROSS FORTY LAYERS','atlas-overline');
 b+=label(40,85,'40 layers','atlas-large')+label(400,85,'4 KV owners','atlas-large')+label(760,85,'8 index sources','atlas-large');
 const top=190,step=12.5,size=500;
 for(const [x,key,title,cls] of [[70,'kv','WHICH LAYER CREATED THE GLOBAL CACHE?','atlas-cache-cell'],[615,'index','WHICH LAYER CREATED THE ADDRESS LIST?','atlas-index-cell']]){
  b+=label(x,135,title,'atlas-overline')+label(x+size/2,161,'Source layer →','atlas-small','middle');
  b+=`<rect class="atlas-matrix-ground" x="${x}" y="${top}" width="${size}" height="${size}"/>`;
  for(let i=0;i<=40;i++)b+=line(`M${x+i*step} ${top} V${top+size}`,'atlas-matrix-grid')+line(`M${x} ${top+i*step} H${x+size}`,'atlas-matrix-grid');
  b+=line(`M${x} ${top} L${x+size} ${top+size}`,'atlas-diagonal');
  b+=`<rect class="atlas-selected-row" x="${x}" y="${top+layer*step}" width="${size}" height="${step}"/>`;
  for(const r of rows){if(r[key]!==null)b+=`<rect class="${cls}" data-owner-kind="${key}" data-consumer="${r.layer}" data-source="${r[key]}" x="${x+r[key]*step+2}" y="${top+r.layer*step+2}" width="8.5" height="8.5"/>`;}
  for(const i of [0,5,10,15,20,25,30,35,39]){b+=label(x+i*step+6,top-9,i,'atlas-tick','middle');b+=label(x-12,top+i*step+10,i,'atlas-tick','end');}
  b+=label(x+size/2,top+size+31,'Every filled square is a source dependency.','atlas-small','middle');
 }
 b+=`<text x="24" y="440" class="atlas-small" text-anchor="middle" transform="rotate(-90 24 440)">Receiving layer ↓</text>`;
 b+=label(70,758,'Blank rows 0–1: local attention only.','atlas-small');
 b+=label(70,783,'The diagonal is “source = receiving layer”. Reuse appears below it.','atlas-small');
 b+=label(70,808,'These are source addresses, not attention weights or measured activations.','atlas-small');
 return plate(1160,838,'Two exact V4.1 dependency matrices, each with forty receiving layers and forty possible source layers: cache ownership and address-list ownership',b);
}

export function ownershipDetail(layer=27){
 const r=ownershipRows()[layer];if(!r)throw new RangeError('Invalid layer');
 return r.kv===null?`Layer ${layer} uses local attention only. It has no global cache or global address-list source.`:`Layer ${layer} is ${r.mode}. Its global KV comes from layer ${r.kv}; its selected addresses come from layer ${r.index}. It still computes its own main queries, recent-window KV and attention probabilities.`;
}
const titles={whole:'V4.1 · the complete architecture',block:'V4 Flash · inside one block',ownership:'Forty layers, shared memory'};
const notes={
 whole:'Follow the central four-stream backbone, then the side paths that supply memory, images and draft proposals. Every labelled block links to its derivation. This is a structural map, not an activation trace. The encoder-source lane follows the reported CED design; the minimal Python loop and its execution boundary are distinguished in the essay.',
 block:'The four long rails retain the residual state. Branches from the same normalized row run in parallel; the dashed selector supplies addresses, while the main KV branches supply values. The expert bank shows all 256 routed identities, with six illustrative choices and one always-active shared expert. Projection, positional and precision details remain in the linked derivations.',
 ownership:'Read one row in both matrices. Blue identifies the creator of the retained global entries; rust identifies the creator of the selected address list. Choosing a different row exposes the sharing schedule. Both matrices use the released forty-layer configuration.'
};
export function atlasBody(kind,layer=27){
 if(kind==='whole')return whole();if(kind==='block')return block();if(kind==='ownership')return ownership(layer);throw new RangeError('Unknown architecture plate');
}
export function atlasFigure(kind){
 if(!titles[kind])throw new RangeError('Unknown architecture plate');
 return `<figure class="architecture-atlas" data-atlas="${kind}"><figcaption><span class="atlas-kicker">Architecture plate · ${kind==='whole'?'01':kind==='block'?'02':'03'}</span><strong>${titles[kind]}</strong><span>Schematic · source-linked · enlarge to inspect</span></figcaption><div class="atlas-toolbar">${kind==='ownership'?`<label>Receiving layer<select data-atlas-layer>${ownershipRows().map(r=>`<option value="${r.layer}"${r.layer===27?' selected':''}>${r.layer} · ${r.mode}</option>`).join('')}</select></label>`:'<span>Solid paths carry representations. Dashed paths mark other dependencies.</span>'}<button type="button" data-atlas-expand>Enlarge diagram ↗</button></div><div class="atlas-viewport" tabindex="0" role="region" aria-label="${titles[kind]}; scroll horizontally on narrow screens"><div data-atlas-output>${atlasBody(kind)}</div></div>${kind==='ownership'?`<p class="atlas-selection" data-atlas-detail aria-live="polite">${ownershipDetail()}</p>`:''}<p class="atlas-caption">${notes[kind]}</p></figure>`;
}
