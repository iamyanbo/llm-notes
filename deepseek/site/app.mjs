import {initializeDay2Traces} from './day2-trace.mjs';
import {initializeDayMaps} from './day-maps-ui.mjs';
import {initializeDay2} from './day2-study.mjs';
import {initializeRouterStudy} from './moe-ui.mjs';

import {initializeResidualStudies} from './residual-study.mjs';
import {initializeExpertStudy} from './expert-ui.mjs';
import {poolRows,attentionExample,routeExample,residualExample,layerOwners,packedGlobalBytes,cedWork,visionLayout,e2m1,quantizeExample,speculationExample} from './models.mjs';
import {initializeArchitecture} from './architecture-ui.mjs';
import {forwardBody} from './forward.mjs';
import {miniatureView} from './miniature.mjs';
import {hashBody,packingBody} from './explanations.mjs';
import {atlasBody,ownershipDetail} from './atlas.mjs';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
initializeArchitecture();

initializeResidualStudies();
initializeDay2();
initializeDay2Traces();
initializeDayMaps();
const atlasDialog=document.createElement('dialog');
atlasDialog.className='atlas-dialog';atlasDialog.setAttribute('aria-label','Enlarged architecture diagram');
atlasDialog.innerHTML='<div class="atlas-dialog-top"><strong data-atlas-dialog-title>Architecture</strong><button type="button" data-atlas-close>Close ×</button></div><div class="atlas-dialog-content"></div>';
document.body.append(atlasDialog);
let atlasOpener;
$('[data-atlas-close]',atlasDialog).addEventListener('click',()=>atlasDialog.close());
atlasDialog.addEventListener('close',()=>{document.documentElement.classList.remove('atlas-modal-open');atlasOpener?.focus({preventScroll:true});});
atlasDialog.addEventListener('click',event=>{if(event.target.closest('a'))atlasDialog.close();});
for(const study of $$('[data-atlas]')){
 const selector=$('[data-atlas-layer]',study);
 selector?.addEventListener('change',()=>{const layer=Number(selector.value);$('[data-atlas-output]',study).innerHTML=atlasBody('ownership',layer);$('[data-atlas-detail]',study).textContent=ownershipDetail(layer);});
 $('[data-atlas-expand]',study).addEventListener('click',event=>{
  atlasOpener=event.currentTarget;
  $('[data-atlas-dialog-title]',atlasDialog).textContent=$('figcaption strong',study).textContent;
  $('.atlas-dialog-content',atlasDialog).innerHTML=`<div class="atlas-viewport" tabindex="0" role="region" aria-label="Enlarged architecture; scroll horizontally if needed">${atlasBody(study.dataset.atlas,selector?Number(selector.value):27)}</div>${selector?'<p class="atlas-selection">'+ownershipDetail(Number(selector.value))+'</p>':''}<p class="atlas-caption">${$('.atlas-caption',study).textContent}</p>`;
  document.documentElement.classList.add('atlas-modal-open');atlasDialog.showModal();
 });
}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const f=(n,d=3)=>Number(n).toFixed(d), sum=a=>a.reduce((x,y)=>x+y,0), clamp=(v,lo,hi,fallback)=>Number.isFinite(Number(v))?Math.max(lo,Math.min(hi,Number(v))):fallback;
const storage={get(k,fallback){try{return JSON.parse(localStorage.getItem('deepseek-notes:'+k))??fallback;}catch{return fallback;}},set(k,v){try{localStorage.setItem('deepseek-notes:'+k,JSON.stringify(v));}catch{}}};
const theme=storage.get('theme','light');if(theme==='dark')document.documentElement.dataset.theme='dark';
$('.theme-toggle')?.addEventListener('click',()=>{const value=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=value;storage.set('theme',value);});
const last=storage.get('last',null),resume=$('.resume-link');
if(last&&resume&&typeof last.slug==='string'&&typeof last.anchor==='string'){
 const anchor=last.anchor.startsWith(last.slug+'--')||last.anchor===last.slug?last.anchor:last.slug+'--'+last.anchor;
 if(document.getElementById(anchor)?.closest('[data-reading-chapter]')){resume.href='#'+anchor;resume.hidden=false;}
}
const readingSections=$$('.reading-chapter,.prose section');let activeAnchor,activeChapter,readingFrame;
function openContentsChapter(slug){$$('[data-contents-chapter]').forEach(detail=>{detail.open=detail.dataset.contentsChapter===slug;});}
function updateReading(){
 readingFrame=null;let section;
 for(const candidate of readingSections){if(candidate.getBoundingClientRect().top<=160)section=candidate;else break;}
 if(!section||section.id===activeAnchor)return;
 activeAnchor=section.id;const slug=section.closest('[data-reading-chapter]').dataset.readingChapter;
 storage.set('last',{slug,anchor:section.id});
 const day=section.dataset.studyDay;
 $$('[data-day-target]').forEach(link=>{const selected=link.dataset.dayTarget===day;link.classList.toggle('active',selected);if(selected)link.setAttribute('aria-current','step');else link.removeAttribute('aria-current');});
 $$('[data-reading-target]').forEach(link=>{const selected=link.dataset.readingTarget===section.id;link.classList.toggle('active',selected);if(selected)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});
 $$('[data-contents-chapter]').forEach(detail=>{detail.dataset.current=String(detail.dataset.contentsChapter===slug);});
 if(activeChapter!==slug){activeChapter=slug;openContentsChapter(slug);}
}
const queueReading=()=>{if(!readingFrame)readingFrame=requestAnimationFrame(updateReading);};
addEventListener('scroll',queueReading,{passive:true});addEventListener('resize',queueReading);document.fonts.ready.then(queueReading);queueReading();
const progress=$('.reading-progress>div');const updateProgress=()=>{const height=document.documentElement.scrollHeight-innerHeight;progress.style.transform=`scaleX(${height>0?scrollY/height:0})`;};addEventListener('scroll',updateProgress,{passive:true});addEventListener('resize',updateProgress);updateProgress();

const searchDialog=$('.search-dialog'), searchInput=$('#search'),results=$('.search-results');let searchData;
async function showSearch(){searchDialog.showModal();searchInput.focus();if(!searchData){try{const r=await fetch(new URL('../search-index.json',import.meta.url));if(!r.ok)throw Error();searchData=await r.json();}catch{results.innerHTML='<p>Search could not load. <a href="#start">Begin the essay</a>.</p>';return;}}doSearch();}
function doSearch(){if(!searchData)return;const query=searchInput.value.trim().toLowerCase(),terms=query.split(/\s+/).filter(Boolean);if(!query){results.innerHTML='<p>Search the chapter titles, sections and explanations.</p>';return;}const matched=searchData.filter(x=>terms.every(q=>(x.title+' '+x.chapter+' '+x.text).toLowerCase().includes(q))).sort((a,b)=>Number(b.title.toLowerCase().includes(query))-Number(a.title.toLowerCase().includes(query))).slice(0,14);results.innerHTML=matched.length?matched.map(x=>`<a href="${esc(x.url)}"><strong>${esc(x.title)}</strong><span>${esc(x.chapter)} · ${esc(x.part)}</span></a>`).join(''):'<p>No matching section. Try a component name or a shorter phrase.</p>';}
$('[data-search-open]')?.addEventListener('click',showSearch);$('[data-search-close]')?.addEventListener('click',()=>searchDialog.close());searchInput?.addEventListener('input',doSearch);results?.addEventListener('click',e=>{if(e.target.closest('a'))searchDialog.close();});
addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)&&!searchDialog.open){e.preventDefault();showSearch();}});
const contents=$('.contents-dialog'),mobileContents=$('.mobile-contents');
$$('[data-contents-open]').forEach(button=>button.addEventListener('click',()=>{if(matchMedia('(max-width:1100px)').matches&&mobileContents){mobileContents.open=true;mobileContents.scrollIntoView({block:'start'});}else contents.showModal();}));
$('[data-contents-close]')?.addEventListener('click',()=>contents.close());contents?.addEventListener('click',e=>{if(e.target.closest('a'))contents.close();});
$$('[data-contents-chapter] a').forEach(link=>link.addEventListener('click',()=>openContentsChapter(link.closest('[data-contents-chapter]').dataset.contentsChapter)));
mobileContents?.addEventListener('click',e=>{if(e.target.closest('a'))mobileContents.open=false;});
for(const study of $$('[data-forward]')){
 $('[data-forward-variant]',study)?.addEventListener('change',event=>{$('[data-forward-output]',study).innerHTML=forwardBody(event.target.value);});
}
for(const study of $$('[data-miniature]')){
 const record=JSON.parse($('[data-mini-data]',study).textContent);
 const update=()=>{$('[data-mini-output]',study).innerHTML=miniatureView(record,$('[data-mini-family]',study).value,Number($('[data-mini-layer]',study).value));};
 $$('select',study).forEach(control=>control.addEventListener('change',update));
}
for(const study of $$('[data-explanation-study="hash"]')){
 const controls=$$('[data-hash-id]',study);
 const update=()=>{$('[data-explanation-output]',study).innerHTML=hashBody(controls.map(control=>Math.floor(clamp(control.value,0,15,0))));};
 controls.forEach(control=>control.addEventListener('input',update));
}
for(const study of $$('[data-explanation-study="packing"]')){
 const channel=$('[data-pack-channel]',study),row=$('[data-pack-row]',study),column=$('[data-pack-column]',study),next=$('[data-pack-next]',study);
 const update=()=>{const k=Number(channel.value),a=Number(row.value),b=Number(column.value);$('[data-explanation-output]',study).innerHTML=packingBody(k,a,b);next.disabled=9*k+3*a+b===17;};
 $$('select',study).forEach(control=>control.addEventListener('change',update));
 next.addEventListener('click',()=>{const index=Math.min(17,9*Number(channel.value)+3*Number(row.value)+Number(column.value)+1);channel.value=String(Math.floor(index/9));row.value=String(Math.floor(index%9/3));column.value=String(index%3);update();});
 $('[data-pack-reset]',study).addEventListener('click',()=>{channel.value=row.value=column.value='0';update();});
}
$$('[data-copy-code]').forEach(button=>button.addEventListener('click',async()=>{
 const block=button.closest('.code-block'),source=$('code',block).textContent,status=$('.copy-status',block);
 try{await navigator.clipboard.writeText(source);status.textContent='Code copied.';button.textContent='Copied';setTimeout(()=>{button.textContent='Copy';status.textContent='';},1800);}
 catch{const selection=getSelection(),range=document.createRange();range.selectNodeContents($('code',block));selection.removeAllRanges();selection.addRange(range);status.textContent='Code selected. Use your copy shortcut.';}
}));

const heading=(title,note='Hand-chosen numerical example')=>`<div class="lab-heading"><h4>${title}</h4><span>${note}</span></div>`;
const table=(heads,rows)=>`<div class="table-wrap"><table><thead><tr>${heads.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
const row=(cells,cls='')=>`<tr class="${cls}">${cells.map(c=>`<td>${c}</td>`).join('')}</tr>`;
const metric=(title,value)=>`<div class="metric-row"><span>${title}</span><strong>${value}</strong></div>`;
const bytes=n=>n>=1024**3?f(n/1024**3,3)+' GiB':n>=1024**2?f(n/1024**2,2)+' MiB':n>=1024?f(n/1024,2)+' KiB':n.toLocaleString()+' bytes';
for(const lab of $$('[data-lab]')){
 const type=lab.dataset.lab;
 if(type==='cache'){
  lab.innerHTML=heading('Count the stored entries','Analytic storage · excludes overhead')+'<div class="lab-controls"><label>Context length · tokens<input type="number" min="1" max="1048576" step="1" value="131072"></label></div><div class="lab-output" aria-live="polite"></div><p class="lab-note">The conventional example uses 32 layers, 8 KV heads, width 128 and two-byte K/V. V4.1 includes only its ideal packed global cache. These scopes differ; this is not a matched model-performance comparison.</p>';
  const render=()=>{const n=Math.floor(clamp($('input',lab).value,1,1048576,131072)),dense=n*131072,packed=packedGlobalBytes(n);$('.lab-output',lab).innerHTML=metric('Conventional example · full KV',bytes(dense))+`<div class="meter"><div style="width:100%"></div></div>`+metric('V4.1 · packed global KV + index K',bytes(packed))+`<div class="meter"><div style="width:${100*packed/dense}%"></div></div><p><span class="number">${n.toLocaleString()}</span> input tokens. The packed calculation counts only completed compression pairs.</p>`;};$('input',lab).addEventListener('input',render);render();
 }
 if(type==='compression'){
  let seen=3,ratio=2,timer;const values=[[1,4],[5,2],[3,6],[7,0],[2,3],[6,1],[4,5],[8,2]],scores=values.map((_,i)=>i%2?[Math.log(3),0]:[0,Math.log(3)]);
  lab.innerHTML=heading('Watch a block become available')+'<div class="lab-controls"><label>Block length<select><option value="2">2 tokens</option><option value="4">4 tokens</option></select></label><button data-next>Next token →</button><button data-play>Play</button><button data-reset>Restart</button></div><div class="lab-output" aria-live="polite"></div><div class="legend"><span class="complete">Complete block</span><span class="pending">Pending suffix</span><span>Not arrived</span></div><p class="lab-note">Two channels; per-channel gate scores alternate (0, log 3) and (log 3, 0). This is the pooling core before normalization, position and quantization.</p>';
  const stop=()=>{clearInterval(timer);timer=null;$('[data-play]',lab).textContent='Play';};
  const render=()=>{const complete=Math.floor(seen/ratio)*ratio,out=poolRows(values.slice(0,seen),scores.slice(0,seen),ratio);$('.lab-output',lab).innerHTML='<div class="token-strip">'+values.map((v,i)=>`<div class="token ${i>=seen?'future':i>=complete?'pending':'complete'}"><small>t=${i}</small>${v.join(', ')}</div>`).join('')+'</div><div class="pool-output">'+(out.length?out.map((v,i)=>`<div class="pooled"><small>entry ${i} · anchor ${i*ratio}</small>(${v.map(x=>f(x,2)).join(', ')})</div>`).join(''):'<span>No completed entries.</span>')+`</div><p><span class="number">${seen}</span> tokens arrived; <span class="number">${out.length}</span> complete entries; <span class="number">${seen%ratio}</span> tokens waiting.</p>`;$('[data-next]',lab).disabled=seen===8;if(seen===8)stop();};
  $('select',lab).addEventListener('change',e=>{stop();ratio=Number(e.target.value);render();});$('[data-next]',lab).addEventListener('click',()=>{stop();seen=Math.min(8,seen+1);render();});$('[data-reset]',lab).addEventListener('click',()=>{stop();seen=0;render();});$('[data-play]',lab).addEventListener('click',()=>{if(timer){stop();return;}if(seen===8)seen=0;timer=setInterval(()=>{seen=Math.min(8,seen+1);render();},850);$('[data-play]',lab).textContent='Pause';});new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)stop();}).observe(lab);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});render();
 }
 if(type==='indexer'){
  lab.innerHTML=heading('Selection is not an attention probability')+'<div class="lab-controls"><label>Global entries retained · K<input type="range" min="1" max="5" value="2"></label><label class="checkbox"><input type="checkbox" checked> Include sink logit 0</label></div><div class="lab-output" aria-live="polite"></div><p class="lab-note">All five entries are assumed complete. Index scores, main logits and values are hand-chosen independently. Stable ties use the lower address.</p>';
  const render=()=>{const a=attentionExample(Number($('input[type=range]',lab).value),$('input[type=checkbox]',lab).checked);$('.lab-output',lab).innerHTML=table(['Entry','Index score','Main logit','Value','Weight'],a.values.map((v,i)=>row([i,f(a.indexScores[i],2),f(a.logits[i],2),v,f(a.weights[i])],a.selected.includes(i)?'selected-row':'')))+metric('Weighted output',f(a.output))+`<p>Selected addresses: <span class="number">${a.selected.join(', ')}</span>. Sink mass: <span class="number">${f(a.sinkWeight)}</span>. Total mass: <span class="number">${f(sum(a.weights)+a.sinkWeight)}</span>.</p>`;};$$('input',lab).forEach(x=>x.addEventListener('input',render));render();
 }
 if(type==='router'){
  lab.innerHTML=heading('How a correction changes the returned row','The same three-expert example as the text')+'<div class="lab-controls"><label>Selection correction for expert 2<input type="range" min="0" max="1.6" step="0.01" value="1.0"></label></div><div class="lab-output" aria-live="polite"></div><p class="lab-note">Only the selection correction changes here. The affinities, returned expert vectors, shared expert output from §1.2 and routing scale 1.5 stay fixed.</p>';
  const render=()=>{const bias=Number($('input',lab).value),r=routeExample(bias);$('.lab-output',lab).innerHTML=table(['Expert','Returned row','Original affinity','Selection score','Final weight'],r.affinity.map((a,i)=>row([i,`(${r.expertOutputs[i].join(', ')})`,f(a,2),f(r.selection[i],2),f(r.weights[i])],r.selected.includes(i)?'selected-row':'')))+`<p>The selected expert IDs are <span class="number">${[...r.selected].sort((a,b)=>a-b).join(' and ')}</span>. Scale each returned row by its final weight, then add:</p>`+metric('Weighted routed sum',`(${r.routed.map(v=>f(v,4)).join(', ')})`)+metric('After adding shared expert output from §1.2',`(${r.output.map(v=>f(v,4)).join(', ')})`);};$('input',lab).addEventListener('input',render);render();
 }
 if(type==='residual'){
  lab.innerHTML=heading('A fixed doubly stochastic transport')+'<div class="lab-controls"><label>Diagonal coefficient · a<input type="range" min="0" max="1" step="0.01" value="0.75"></label></div><div class="lab-output" aria-live="polite"></div><p class="lab-note">Two scalar streams with input (3, 1). The off-diagonal coefficients are 1 − a, keeping both row and column sums equal to one.</p>';
  const render=()=>{const r=residualExample(Number($('input',lab).value));$('.lab-output',lab).innerHTML=`<div class="matrix-line"><div class="matrix-mini">${r.matrix.flat().map(x=>`<span>${f(x,2)}</span>`).join('')}</div><span>× (3, 1) →</span><strong class="number">(${r.output.map(x=>f(x,2)).join(', ')})</strong></div>`+metric('Input Euclidean norm',f(r.inputNorm))+metric('Output Euclidean norm',f(r.outputNorm));};$('input',lab).addEventListener('input',render);render();
 }
 if(type==='ced'){
  lab.innerHTML=heading('Prompt work in an idealized schedule','Token-layer applications, not latency')+'<div class="lab-controls"><label>Prompt length · tokens<input type="number" min="1" max="1048576" value="65536"></label><label>Decoder replay tail<input type="number" min="1" max="2048" value="128"></label></div><div class="lab-output" aria-live="polite"></div><p class="lab-note">40 layers split evenly. The model ignores projection, attention and scheduling costs; it illustrates a dependency saving, not a measured speedup.</p>';
  const render=()=>{const inputs=$$('input',lab),n=Math.floor(clamp(inputs[0].value,1,1048576,65536)),w=Math.floor(clamp(inputs[1].value,1,2048,128)),r=cedWork(n,w);$('.lab-output',lab).innerHTML=metric('Full 40-layer prompt',r.full.toLocaleString())+metric('Encoder + decoder tail',(r.encoder+r.tail).toLocaleString())+`<p>Encoder: ${r.encoder.toLocaleString()}; decoder tail: ${r.tail.toLocaleString()}. Ratio of counted work: <span class="number">${f(r.full/(r.encoder+r.tail),3)}×</span>.</p>`;};$$('input',lab).forEach(x=>x.addEventListener('input',render));render();
 }
 if(type==='reuse'){
  lab.innerHTML=heading('Trace ownership through the stack','Released V4.1 configuration')+'<div class="lab-controls"><label>Layer · zero-based<input type="range" min="0" max="39" step="1" value="27"></label></div><div class="lab-output" aria-live="polite"></div><p class="lab-note">“Index owner” means the latest layer producing the current address list. All global layers still compute their own main query and local-window state.</p>';
  const render=()=>{const layer=Number($('input',lab).value),o=layerOwners(layer);$('.lab-output',lab).innerHTML=`<div class="owner-trace"><span class="active">Layer ${layer} · ${o.mode}</span>${o.kv!==null?`<span>KV source: ${o.kv}</span><span>Index source: ${o.index}</span>`:'<span>No global cache</span>'}</div><p>${o.ratio?`Global compression ratio: <span class="number">${o.ratio}</span>. ${o.mode==='Full'?'Create a new cache and selection.':o.mode==='Reindex'?'Keep the cache, recompute the selection.':'Keep the cache and selection; compute new main attention.'}`:'Only the layer-local sliding window is used.'}</p>`;};$('input',lab).addEventListener('input',render);render();
 }
 if(type==='vision'){
  lab.innerHTML=heading('A patch grid becomes wider tokens')+'<div class="lab-controls"><label>Patch rows<input type="number" min="3" max="12" value="7"></label><label>Patch columns<input type="number" min="3" max="12" value="8"></label></div><div class="lab-output" aria-live="polite"></div><p class="lab-note">Numbers identify source patches. Shading identifies 3×3 groups; dashed cells are padding. The learned projection follows this rearrangement.</p>';
  const render=()=>{const inputs=$$('input',lab),h=Math.floor(clamp(inputs[0].value,3,12,7)),w=Math.floor(clamp(inputs[1].value,3,12,8)),r=visionLayout(h,w);let cells='';for(let y=0;y<r.paddedRows;y++)for(let x=0;x<r.paddedCols;x++){const group=Math.floor(y/3)*r.cols+Math.floor(x/3),pad=y>=h||x>=w;cells+=`<span class="${pad?'pad':''}" style="background:${group%2?'var(--warm)':'var(--white)'}" title="Group ${group}">${pad?'·':y*w+x+1}</span>`;}$('.lab-output',lab).innerHTML=`<div class="patch-grid" style="grid-template-columns:repeat(${r.paddedCols},1fr)">${cells}</div>`+metric('Visual token grid',`${r.rows} × ${r.cols}`)+`<p><span class="number">${h*w}</span> original patches → <span class="number">${r.tokens}</span> packed visual tokens. Each contains nine patch vectors before projection.</p>`;};$$('input',lab).forEach(x=>x.addEventListener('input',render));render();
 }
 if(type==='quantization'){
  lab.innerHTML=heading('Inspect an E2M1 rounding step','Illustrative fixed scale · nearest code')+'<div class="lab-controls"><label>Input value<input type="range" min="-7" max="7" step="0.01" value="2.4"></label><label>Scale<select><option value="0.5">0.5</option><option value="1" selected>1</option><option value="2">2</option></select></label></div><div class="lab-output" aria-live="polite"></div><p class="lab-note">The scale here is exact and chosen manually; production scale rounding is not simulated. Ties choose the lower numerical code in this demonstration.</p>';
  const render=()=>{const x=Number($('input',lab).value),scale=Number($('select',lab).value),r=quantizeExample(x,scale);$('.lab-output',lab).innerHTML=metric('Input → reconstructed',`${f(x,2)} → ${f(r.reconstructed,2)}`)+metric('Signed error',f(r.error,3))+`<div class="codebook">${e2m1.map(v=>`<span data-current="${v===r.code}">${v}</span>`).join('')}</div><p>Stored code: <span class="number">${r.code}</span>, multiplied by scale <span class="number">${scale}</span>.</p>`;};$('input',lab).addEventListener('input',render);$('select',lab).addEventListener('change',render);render();
 }
 if(type==='speculation'){
  lab.innerHTML=heading('Accepted mass plus residual mass')+'<div class="lab-controls"><label>Proposal probability for token A<input type="range" min="0.1" max="0.9" step="0.01" value="0.7"></label></div><div class="lab-output" aria-live="polite"></div><p class="lab-note">A three-token rejection-sampling identity, not a DSpark implementation or measured acceptance rate. The proposal’s remaining mass is split 60/40 between B and C.</p>';
  const render=()=>{const r=speculationExample(Number($('input',lab).value));$('.lab-output',lab).innerHTML=table(['Token','Target p','Proposal q','Accepted mass','Residual p−q','Reconstructed'],r.p.map((p,i)=>row([['A','B','C'][i],f(p,2),f(r.q[i],2),f(r.accepted[i],2),f(r.residual[i],2),f(r.reconstructed[i],2)])))+`<p>Rejection probability: <span class="number">${f(r.rejection)}</span>. ${r.rejection>1e-10?'The positive residual is normalized only after rejection.':'Proposal and target agree; no residual draw is needed.'}</p>`;};$('input',lab).addEventListener('input',render);render();
 }
}

for(const study of $$('[data-expert-study]'))initializeExpertStudy(study);

for(const study of $$('[data-router-study]'))initializeRouterStudy(study);
