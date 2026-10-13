import {OVERVIEW_PARTS,OVERVIEW_TOPICS,overviewTopic} from './overview-model.js';

const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text=(x,y,label,kind='label',extra='')=>`<text class="map-${kind}" x="${x}" y="${y}" ${extra}>${escape(label)}</text>`;
const wire=(id,d,{tone='blue',relation=false,label='',x=0,y=0}={})=>`<path id="map-path-${id}" class="map-wire ${relation?'map-relation':''}" data-tone="${tone}" d="${d}" marker-end="url(#map-arrow-${tone})"/>${label?text(x,y,label,'note'):''}`;
function cells(x,y,rows,columns,{size=13,gap=4,tone='blue',active=()=>true}={}){
  return Array.from({length:rows*columns},(_,i)=>`<rect class="map-cell" data-tone="${tone}" data-filled="${active(Math.floor(i/columns),i%columns)}" x="${x+(i%columns)*(size+gap)}" y="${y+Math.floor(i/columns)*(size+gap)}" width="${size}" height="${size}" rx="1"/>`).join('');
}
function hotspot(id,selected,x,y,width,height,content){
  const t=overviewTopic(id);
  return `<a href="#${id}" data-overview-select="${id}" aria-label="Inspect ${escape(t.title)}" class="map-hotspot" data-topic="${id}" data-active="${selected===id}" transform="translate(${x},${y})"><title>${t.number}. ${escape(t.title)} — ${escape(t.place)}</title><rect class="map-node-shadow" x="4" y="4" width="${width}" height="${height}" rx="4"/><rect class="map-node-face" width="${width}" height="${height}" rx="4"/><g class="map-node-content">${content}</g></a>`;
}
function rotation(x,y,label,angle,animate){
  return `<g transform="translate(${x},${y})"><circle class="map-coordinate-ring" r="17"/><path class="map-coordinate-axis" d="M-20 0 H20 M0 -20 V20"/><path class="map-rotation-arc" d="M16 0 A16 16 0 0 0 8 -14"/><g transform="rotate(${-angle})"><path class="map-vector" d="M0 0 H17"/><circle class="map-vector-end" cx="17" r="3"/>${animate?`<animateTransform attributeName="transform" type="rotate" from="0" to="${-angle}" dur="1.5s" fill="freeze"/>`:''}</g>${text(0,30,label,'tiny','text-anchor="middle"')}</g>`;
}
const packet=(path,{delay='0s',tone='blue',duration='2s'}={})=>`<circle class="map-packet" data-tone="${tone}" r="5"><animateMotion dur="${duration}" begin="${delay}" fill="freeze" calcMode="linear"><mpath href="#map-path-${path}"/></animateMotion></circle>`;

export function overviewCanvas(selected='rope',{running=false,prefix='map'}={}){
  overviewTopic(selected);
  const training=['pretraining','posttraining','lora'].includes(selected);
  const animate=running;
  const transport=({memory:'cache-read',precision:'codes',thought:'append',speculation:'verify',pretraining:'gradient',posttraining:'preference-gradient',lora:'adapter'})[selected]||'forward';
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" class="overview-map" viewBox="0 0 1060 660" role="group" aria-labelledby="map-title map-description">
  <title id="map-title">A transformer: architecture, learning, and generation</title>
  <desc id="map-description">A repeated decoder block joins text and image inputs to next-token probabilities. Pre-training, post-training, and LoRA connect to its learned parameters. KV caching, FlashAttention, quantization, chain of thought, and speculative decoding connect to its evaluation. Selected: ${escape(overviewTopic(selected).title)}. Arrows distinguish representation flow from relationships between methods.</desc>
  <defs>${['blue','rust','ink'].map(tone=>`<marker id="map-arrow-${tone}" viewBox="0 0 8 8" markerWidth="6" markerHeight="6" refX="7" refY="4" orient="auto-start-reverse"><path class="map-arrow" data-tone="${tone}" d="M0 0 L8 4 L0 8 Z"/></marker>`).join('')}</defs>
  ${text(24,25,'LEARNING','band')}${text(24,49,'Choose the matrices.','note')}
  <path class="map-rule" d="M224 43 H1032"/>
  ${wire('objective','M322 170 V189 H583 V209',{relation:true,tone:'rust',label:'objectives → parameter updates',x:418,y:183})}
  ${wire('post-objective','M559 170 V189',{relation:true,tone:'rust'})}
  ${wire('adapter','M797 170 V191 H721 V224',{relation:true,tone:'rust'})}
  ${hotspot('pretraining',selected,228,65,204,105,text(14,26,'5 · Pre-training')+text(14,49,'text → targets → loss','small')+cells(15,66,1,8,{size:13,active:(_r,c)=>c<6})+text(170,79,'∇','math'))}
  ${hotspot('posttraining',selected,458,65,204,105,text(14,26,'6 · Post-training')+text(14,49,'demonstrations · preferences','small')+`<path class="map-choice" d="M16 79 H74 M16 91 H51"/>`+text(91,85,'chosen / rejected','tiny'))}
  ${hotspot('lora',selected,688,65,204,105,text(14,26,'7 · LoRA')+text(14,49,'frozen W + learned BA','small')+cells(16,64,2,1,{size:12,tone:'rust'})+text(40,85,'×','math')+cells(60,71,1,3,{size:12,tone:'rust'})+text(126,85,'→ ΔW','math'))}

  ${text(24,213,'ARCHITECTURE','band')}${text(24,237,'Follow a representation.','note')}
  <path class="map-block-back second" d="M379 225 V210 H774 V418 H757"/>
  <path class="map-block-back" d="M371 244 V223 H759 V434 H743"/>
  <rect class="map-block" x="351" y="241" width="392" height="222" rx="5"/>
  ${text(368,261,'DECODER BLOCK · REPEATED','band')}
  <path id="map-path-forward" d="M196 353 H319 V298 H426 V374 H462 V406 H552 V362 H607 V340 H656 V368 H787" fill="none" stroke="none"/>
  ${wire('embed-in','M197 353 H222')}
  ${wire('q','M319 339 V298 H393',{label:'Q',x:335,y:292})}
  ${wire('k','M319 339 V282 H474',{label:'K',x:335,y:279})}
  ${wire('v','M319 356 V442 H399 V425',{tone:'rust',label:'V',x:328,y:435})}
  ${wire('rotated-q','M427 359 V373')}${wire('rotated-k','M490 359 V373')}
  ${wire('attn-ffn','M544 406 H552 V362 H564')}${wire('out','M724 368 H787')}
  ${wire('residual','M319 374 H344 V443 H728 V431',{tone:'ink',label:'residual paths + normalization',x:439,y:456})}
  ${hotspot('multimodal',selected,24,271,173,163,text(13,25,'4 · Multimodal inputs')+text(13,51,'text tokens','small')+`<g class="map-text-pieces">${['the','dog','…'].map((word,i)=>`<rect x="${13+i*47}" y="61" width="40" height="23" rx="2"/>${text(33+i*47,77,word,'tiny','text-anchor="middle"')}`).join('')}</g>`+text(13,110,'image patches','small')+cells(14,121,2,6,{size:11,gap:3,active:(_r,c)=>c!==4}) )}
  <g transform="translate(224,313)"><rect class="map-embedding" width="94" height="83" rx="3"/>${text(47,22,'Embed','label','text-anchor="middle"')}${cells(16,33,2,4,{size:12,gap:4})}</g>
  ${hotspot('rope',selected,377,272,168,87,text(9,17,'1 · RoPE','small')+rotation(49,47,'q',30,animate&&selected==='rope')+rotation(113,47,'k',65,animate&&selected==='rope'))}
  ${hotspot('attention',selected,376,374,168,64,text(10,20,'2 · Attention variants','small')+cells(12,30,2,6,{size:9,gap:3,active:(r,c)=>c<=r+2&&c>=r})+text(94,51,'weights · V','tiny'))}
  ${hotspot('experts',selected,565,277,159,151,text(12,23,'3 · Dense / MoE','label')+text(12,44,'feed-forward','small')+`<path class="map-expert-route" d="M20 85 H42 V63 H64 M42 85 V91 H64 M117 63 H136 V91 H117"/>${[0,1,2].map(i=>`<rect class="map-expert" data-selected="${i<2}" x="66" y="${52+i*28}" width="51" height="22" rx="2"/>${text(91,67+i*28,'E'+(i+1),'tiny','text-anchor="middle"')}`).join('')}`+text(12,139,'route → apply → mix','tiny'))}
  <g transform="translate(790,288)"><path class="map-output-shadow" d="M4 4 H236 V149 H4 Z"/><rect class="map-output" width="232" height="149" rx="4"/>${text(14,25,'VOCABULARY READOUT','band')}${text(14,49,'next-token probabilities','small')}${['cat','ball','…'].map((token,i)=>text(15,77+i*24,token,'small')+`<rect class="map-probability" x="60" y="${64+i*24}" width="${[116,63,27][i]}" height="14" rx="1"/>`).join('')}</g>
  ${wire('gradient','M906 284 V202 H332 V175',{relation:true,tone:'rust',label:'compare with targets · backpropagate',x:648,y:198})}
  <path id="map-path-preference-gradient" d="M906 284 V202 H559 V175" fill="none" stroke="none"/>
  ${wire('append','M1032 367 V489 H112 V438',{label:'select a token → append to the input',x:497,y:485})}

  ${text(24,539,'GENERATION','band')}${text(24,563,'Keep the parameters fixed.','note')}
  <path class="map-rule" d="M224 537 H1032"/>
  ${wire('cache-read','M316 563 V502 H383 V432',{relation:true,label:'K / V',x:324,y:520})}
  ${wire('codes','M539 563 V508 H642 V467',{relation:true,tone:'rust',label:'codes + scales',x:457,y:526})}
  ${wire('context','M760 563 V505 H223 V488',{relation:true})}
  ${wire('verify','M965 561 V454 H1016 V411',{relation:true,label:'draft → target check',x:828,y:458})}
  ${hotspot('memory',selected,230,563,191,75,text(11,22,'8 · KV cache','small')+text(11,43,'FlashAttention','small')+cells(12,52,1,7,{size:9,gap:4})+text(132,61,'K / V','tiny'))}
  ${hotspot('precision',selected,443,563,191,75,text(11,22,'9 · Quantization','small')+text(11,43,'weights → codes + scales','tiny')+cells(12,53,1,8,{size:8,gap:3,tone:'rust'}) )}
  ${hotspot('thought',selected,656,563,177,75,text(11,22,'10 · Chain of thought','small')+text(11,44,'intermediate text','tiny')+text(11,62,'→ later context','tiny'))}
  ${hotspot('speculation',selected,855,563,177,75,text(11,22,'11 · Speculative decoding','small')+text(11,44,'propose → verify','tiny')+text(11,62,'accept / correct','tiny'))}
  ${animate?packet(transport,{tone:training||selected==='precision'?'rust':'blue'}):''}
  </svg>`;
  return prefix==='map'?svg:svg.replaceAll('id="map-',`id="${prefix}-`).replaceAll('url(#map-',`url(#${prefix}-`).replaceAll('href="#map-',`href="#${prefix}-`).replaceAll('aria-labelledby="map-title map-description"',`aria-labelledby="${prefix}-title ${prefix}-description"`);
}

const detail=topic=>`<div class="overview-detail" aria-live="polite" aria-atomic="true"><div><span class="overview-place" data-overview-place>${escape(topic.place)}</span><h3 data-overview-title>${topic.number}. ${escape(topic.title)}</h3></div><p data-overview-description>${escape(topic.description)}</p><a data-overview-read href="#${topic.id}">Read section ${topic.number} <span aria-hidden="true">→</span></a></div>`;
const controls=()=>`<div class="overview-controls"><div><button type="button" data-overview-play aria-pressed="false">Play the tour</button><button type="button" data-overview-next>Next</button><button type="button" data-overview-restart>Restart</button></div><span data-overview-position>1 / 11</span><p>Inspect a topic, or follow the tour from architecture to learning and generation.</p></div>`;

export function overviewHero(){
  const selected=overviewTopic('rope');
  return `<figure class="practice-overview" data-overview data-running="false" aria-labelledby="overview-heading">
    <header class="overview-heading"><div><span class="overview-kicker">A map of the essay</span><h2 id="overview-heading">Architecture, learning, and generation</h2></div><div class="overview-heading-actions"><span class="overview-schematic">Schematic overview</span><button type="button" data-overview-enlarge aria-haspopup="dialog">Enlarge map</button></div></header>
    <div class="overview-layout"><div class="overview-topics" aria-label="Inspect the essay topics">${OVERVIEW_PARTS.map(part=>`<section class="overview-part" aria-labelledby="overview-${part.id}"><h3 id="overview-${part.id}">${escape(part.name)}</h3><p>${escape(part.question)}</p><div>${OVERVIEW_TOPICS.filter(t=>t.part===part.id).map(t=>`<button type="button" data-overview-select="${t.id}" aria-pressed="${t.id===selected.id}"><span class="overview-number">${String(t.number).padStart(2,'0')}</span><span>${escape(t.short)}</span><span class="overview-selection" aria-hidden="true">↗</span></button>`).join('')}</div></section>`).join('')}</div>
      <div class="overview-drawing"><div class="overview-canvas" data-overview-canvas tabindex="0" role="region" aria-label="Model map; scroll horizontally on a narrow screen">${overviewCanvas(selected.id)}</div><p class="overview-scroll-hint">Scroll across the drawing to inspect it, or enlarge the map.</p><p class="overview-key"><span><i></i>Representations and generated tokens</span><span><i class="relationship"></i>Where a method intervenes</span></p></div></div>
    <dialog class="overview-dialog" data-overview-dialog aria-labelledby="overview-dialog-heading"><header><h2 id="overview-dialog-heading">Architecture, learning, and generation</h2><button type="button" data-overview-close>Close</button></header><div class="overview-canvas" data-overview-expanded tabindex="0" role="region" aria-label="Enlarged model map">${overviewCanvas(selected.id,{prefix:'expanded-map'})}</div>${detail(selected)}${controls()}</dialog>
    <figcaption>${detail(selected)}${controls()}</figcaption>
  </figure>`;
}
