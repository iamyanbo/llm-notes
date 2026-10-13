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


function methodGlyph(id,running){
  const x=252;
  switch(id){
    case 'rope':return rotation(x+32,49,'q',30,running)+rotation(x+105,49,'k',65,running);
    case 'attention':return cells(x,25,3,6,{size:12,gap:4,active:(r,c)=>c>=r&&c<=r+2})+text(x+116,48,'compare','tiny')+text(x+116,67,'→ gather','tiny');
    case 'experts':return `<path class="map-expert-route" d="M${x} 50 H${x+18} V28 H${x+36} M${x+18} 50 V71 H${x+36} M${x+82} 28 H${x+99} V50 H${x+117} M${x+82} 71 H${x+99} V50"/>`+[0,1,2].map(i=>`<rect class="map-expert" data-selected="${i<2}" x="${x+36}" y="${17+i*22}" width="46" height="17" rx="2"/>`+text(x+59,30+i*22,'E'+(i+1),'tiny','text-anchor="middle"')).join('')+text(x+123,54,'mix','small');
    case 'multimodal':return cells(x,27,3,3,{size:13,gap:3})+text(x+59,56,'→','math')+cells(x+90,27,3,4,{size:13,gap:3});
    case 'pretraining':return text(x,32,'recorded targets','tiny')+cells(x,43,1,6,{size:13,gap:4})+text(x+120,57,'→ ∇W','math');
    case 'posttraining':return `<path class="map-choice" d="M${x} 32 H${x+70} M${x} 63 H${x+40}"/>`+text(x+85,36,'chosen','tiny')+text(x+85,67,'rejected','tiny')+text(x+146,55,'∇W','math');
    case 'lora':return cells(x,30,2,1,{size:16,gap:4,tone:'rust'})+text(x+32,57,'×','math')+cells(x+54,39,1,3,{size:16,gap:4,tone:'rust'})+text(x+122,57,'→','math')+cells(x+149,30,2,3,{size:16,gap:4,tone:'rust'});
    case 'memory':return text(x,26,'saved K / V','tiny')+cells(x,34,2,4,{size:12,gap:4})+text(x+86,56,'→','math')+text(x+119,42,'read in','tiny')+text(x+119,61,'tiles','tiny');
    case 'precision':return cells(x,30,2,3,{size:16,gap:4,tone:'rust'})+text(x+80,57,'→','math')+cells(x+112,34,2,4,{size:10,gap:4,tone:'rust'});
    case 'thought':return text(x,35,'context → token','small')+text(x,63,'→ longer context','small');
    case 'speculation':return cells(x,26,1,3,{size:18,gap:6})+text(x+89,42,'→ check','small')+text(x,73,'accept / correct','tiny');
  }
}
function stage(x,width,title,content,{active=false}={}){
  return `<g class="map-stage" data-active="${active}" transform="translate(${x},133)"><rect class="map-node-shadow" x="3" y="3" width="${width}" height="150" rx="4"/><rect class="map-node-face" width="${width}" height="150" rx="4"/>${text(14,29,title)}${content}</g>`;
}
export function overviewCanvas(selected='rope',{running=false,prefix='map'}={}){
  const topic=overviewTopic(selected),part=OVERVIEW_PARTS.find(p=>p.id===topic.part);
  const architecture=topic.part==='architecture',learning=topic.part==='learning',generation=topic.part==='generation';
  const target=({multimodal:105,rope:469,attention:469,experts:687,memory:469,precision:581,thought:550,speculation:920})[selected]||581;
  const transport=({pretraining:'gradient',posttraining:'preference-gradient',lora:'adapter',memory:'cache-read',precision:'codes',thought:'append',speculation:'verify'})[selected]||'forward';
  const tone=learning||selected==='precision'?'rust':'blue';
  const intervene=learning?'M418 385 V348 H581 V316':selected==='thought'?'M530 385 V339':`M530 385 V354 H${target} V${target<200||target>800?286:316}`;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" class="overview-map" viewBox="0 0 1060 500" role="group" aria-labelledby="map-title map-description">
    <title id="map-title">${escape(part.name)}: ${escape(topic.title)}</title>
    <desc id="map-description">A left-to-right model flow with one selected extension: ${escape(topic.title)}. ${escape(topic.description)} This is a schematic; the worked calculations are in the chapter.</desc>
    <defs>${['blue','rust','ink'].map(tone=>`<marker id="map-arrow-${tone}" viewBox="0 0 8 8" markerWidth="6" markerHeight="6" refX="7" refY="4" orient="auto-start-reverse"><path class="map-arrow" data-tone="${tone}" d="M0 0 L8 4 L0 8 Z"/></marker>`).join('')}</defs>
    ${text(30,34,part.name.toUpperCase(),'band')}${text(30,61,part.question,'note')}
    <path class="map-block-back" d="M370 115 V102 H790 V310 H778"/><rect class="map-block" x="358" y="113" width="421" height="205" rx="5"/>
    ${text(374,92,'DECODER BLOCK · REPEATED','band')}
    ${wire('input','M184 209 H219')}${wire('representation','M331 209 H379')}${wire('attention-output','M567 209 H611')}${wire('readout','M769 209 H814')}
    ${stage(30,154,'Inputs',text(14,57,'the · dog · ...','small')+text(14,89,'text tokens','tiny')+text(14,121,'image patches','tiny'),{active:selected==='multimodal'})}
    ${stage(222,109,'Embed',cells(17,60,3,4,{size:14,gap:4})+text(17,131,'rows of X','tiny'))}
    ${stage(382,185,'Attention',text(14,54,'Q · K · V','small')+cells(14,69,3,5,{size:14,gap:4,active:(r,c)=>c<=r+1})+text(14,133,'compare · gather','tiny'),{active:['rope','attention','memory'].includes(selected)})}
    ${stage(614,155,'Feed-forward',cells(15,57,3,4,{size:14,gap:5})+text(15,131,'dense / experts','tiny'),{active:selected==='experts'})}
    ${stage(817,211,'Readout',text(14,55,'next-token probabilities','small')+['cat','ball','...'].map((name,i)=>text(14,81+i*24,name,'small')+`<rect class="map-probability" x="59" y="${68+i*24}" width="${[121,69,28][i]}" height="13" rx="1"/>`).join(''))}
    ${text(461,305,'Residual paths + normalization','tiny')}
    ${generation?wire('append','M1036 215 V339 H106 V287',{label:'choose a token → append it → evaluate the new prefix',x:301,y:331}):''}
    ${wire('intervention',intervene,{relation:true,tone})}
    ${learning&&selected!=='lora'?wire('loss','M922 286 V357 H656 V384',{relation:true,tone:'rust',label:'loss',x:778,y:350}):''}
    ${learning?text(421,341,'parameter update','note'):''}
    ${hotspot(selected,selected,290,386,480,98,text(16,27,`${topic.number} · ${topic.short}`)+text(16,58,topic.place,'small')+methodGlyph(selected,running))}
    <path id="map-path-forward" d="M185 209 H814" fill="none" stroke="none"/>
    <path id="map-path-gradient" d="M922 286 V357 H656 V384" fill="none" stroke="none"/>
    <path id="map-path-preference-gradient" d="M922 286 V357 H656 V384" fill="none" stroke="none"/>
    <path id="map-path-adapter" d="M418 385 V348 H581 V316" fill="none" stroke="none"/>
    <path id="map-path-cache-read" d="${intervene}" fill="none" stroke="none"/>
    <path id="map-path-codes" d="${intervene}" fill="none" stroke="none"/>
    <path id="map-path-verify" d="${intervene}" fill="none" stroke="none"/>
    ${running?packet(transport,{tone}):''}
  </svg>`;
  return prefix==='map'?svg:svg.replaceAll('id="map-',`id="${prefix}-`).replaceAll('url(#map-',`url(#${prefix}-`).replaceAll('href="#map-',`href="#${prefix}-`).replaceAll('aria-labelledby="map-title map-description"',`aria-labelledby="${prefix}-title ${prefix}-description"`);
}

const detail=topic=>`<div class="overview-detail" aria-live="polite" aria-atomic="true"><div><span class="overview-place" data-overview-place>${escape(topic.place)}</span><h3 data-overview-title>${topic.number}. ${escape(topic.title)}</h3></div><p data-overview-description>${escape(topic.description)}</p><a data-overview-read href="#${topic.id}">Read section ${topic.number} <span aria-hidden="true">→</span></a></div>`;
const controls=()=>`<div class="overview-controls"><div><button type="button" data-overview-play aria-pressed="false">Play the tour</button><button type="button" data-overview-next>Next</button><button type="button" data-overview-restart>Restart</button></div><span data-overview-position>1 / 11</span><p>Inspect a topic, or follow the tour from architecture to learning and generation.</p></div>`;

export function overviewHero(){
  const selected=overviewTopic('rope');
  return `<figure class="practice-overview" data-overview data-running="false" aria-labelledby="overview-heading">
    <header class="overview-heading"><div><span class="overview-kicker">A map of the essay</span><h2 id="overview-heading">Architecture, learning, and generation</h2></div><div class="overview-heading-actions"><span class="overview-schematic">Schematic overview</span><button type="button" data-overview-enlarge aria-haspopup="dialog">Enlarge map</button></div></header>
    <div class="overview-layout"><div class="overview-drawing"><div class="overview-canvas" data-overview-canvas tabindex="0" role="region" aria-label="Model flow; scroll horizontally on a narrow screen">${overviewCanvas(selected.id)}</div><p class="overview-scroll-hint">Scroll across the drawing to inspect it, or enlarge the map.</p></div>
      <div class="overview-topics" aria-label="Inspect the essay topics">${OVERVIEW_PARTS.map(part=>`<section class="overview-part" aria-labelledby="overview-${part.id}"><h3 id="overview-${part.id}">${escape(part.name)}</h3><div>${OVERVIEW_TOPICS.filter(t=>t.part===part.id).map(t=>`<button type="button" data-overview-select="${t.id}" aria-pressed="${t.id===selected.id}"><span class="overview-number">${String(t.number).padStart(2,'0')}</span><span>${escape(t.short)}</span></button>`).join('')}</div></section>`).join('')}</div></div>
    <dialog class="overview-dialog" data-overview-dialog aria-labelledby="overview-dialog-heading"><header><h2 id="overview-dialog-heading">Architecture, learning, and generation</h2><button type="button" data-overview-close>Close</button></header><div class="overview-canvas" data-overview-expanded tabindex="0" role="region" aria-label="Enlarged model map">${overviewCanvas(selected.id,{prefix:'expanded-map'})}</div>${detail(selected)}${controls()}</dialog>
    <figcaption>${detail(selected)}${controls()}</figcaption>
  </figure>`;
}
