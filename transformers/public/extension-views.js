import {shiftedExample,trainingExample,supervisedExample,preferenceExample,loraExample,thoughtExample,imageExample,IMAGE_PROJECTOR,TARGET_NAMES} from './extension-models.js';
import {PATCHES} from './patch-data.js';
import {attentionView,attentionTransfers} from './attention-views.js';
import {rotaryAttentionView,rotaryAttentionTransfers} from './rotary-attention.js';
export const f=x=>Math.abs(x)<.0005?'0':Number(x.toFixed(3)).toString();
const esc=s=>String(s).replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
const tuple=v=>'('+v.map(f).join(', ')+')';
export const CONFIG={
 anchors:{title:'Local connections and designated anchors',defaults:{row:8,width:3,layers:1,pattern:'anchors'},stages:['Choose the query','Apply the mask','Normalize the allowed scores','Combine the values']},
 rotary:{title:'From rotations to attention weights and output',defaults:{shift:0,gap:1,degrees:30},stages:['Head vectors','Rotate query and keys','Normalize the scores','Gather the values']},
 window:{title:'A query reads a permitted neighborhood',defaults:{row:8,width:3,layers:1,pattern:'window'},stages:['Choose the query','Apply the mask','Normalize the allowed scores','Combine the values']},
 linear:{title:'A key and value enter a matrix state',defaults:{prefix:2,q1:2,q2:1},stages:['A new position arrives','Form the outer product','Accumulate the state','Read with the query']},
 batch:{title:'One sequence, several targets',defaults:{row:4},stages:['Choose a row','Read its prefix','Inspect its target','Collect the losses']},
 training:{title:'A loss changes a matrix',defaults:{updates:1,rate:.6,target:0,h2:.5},stages:['Forward calculation','Logit derivatives','Matrix gradient','Apply the update']},
 supervision:{title:'Two masks, two different jobs',defaults:{row:5,completionOnly:1},stages:['Prompt and response','Available context','Included targets','Average the loss']},
 preference:{title:'A preference relative to a fixed reference',defaults:{updates:1,rate:.5,beta:1,reference:.5},stages:['Two response distributions','Relative log-probabilities','Preference loss and derivative','Update the policy']},
 lora:{title:'The input takes two paths',defaults:{x1:1,x2:2,rank:1,scale:1,geometry:1},stages:['Same input, two maps','Measure with A','Expand with B','Add to the base output']},
 'lora-init':{title:'Zero output does not require two zero factors',defaults:{initialization:'zero-B',rank:1},stages:['Original output','Measured feature','Error and chain rule','Inspect both gradients']},
 thought:{title:'Written steps become subsequent context',defaults:{a:17,b:23,error:0,verify:1},stages:['Problem only','First partial product','Second partial product','Combine the products','State the answer']},
 vision:{title:'A picture enters as continuous features',defaults:{patch:7},stages:['Select a patch','Read channel measurements','Project the feature','Insert the representation']}
};
const range=(name,label,min,max,step,value)=>`<label>${label} <output data-ext-output="${name}">${value}</output><input type="range" data-ext-option="${name}" min="${min}" max="${max}" step="${step}" value="${value}"></label>`;
const select=(name,label,entries,value)=>`<label>${label}<select data-ext-option="${name}">${entries.map(([v,t])=>`<option value="${v}" ${v===value?'selected':''}>${esc(t)}</option>`).join('')}</select></label>`;
const controls={
 anchors:()=>range('row','Receiving position',1,8,1,8)+range('width','Window positions, including self',1,8,1,3)+range('layers','Layers for influence paths',1,4,1,1)+select('pattern','Mask',[['anchors','Local + anchors'],['window','Sliding window'],['dense','Full causal']],'anchors'),
 rotary:()=>range('shift','Move all positions',0,6,1,0)+range('gap','Receiver–dog separation',1,4,1,1)+range('degrees','Angular step (degrees per position)',0,60,15,30),
 window:()=>range('row','Receiving position',1,8,1,8)+range('width','Window positions, including self',1,8,1,3)+range('layers','Layers for influence paths',1,4,1,1)+select('pattern','Mask',[['window','Sliding window'],['dense','Full causal'],['anchors','Local + anchors']],'window'),
 linear:()=>range('prefix','Prefix positions',1,5,1,2)+range('q1','Query feature 1',.25,3,.25,2)+range('q2','Query feature 2',.25,3,.25,1),
 batch:()=>range('row','Prediction row',0,5,1,4),
 training:()=>range('updates','Updates',0,12,1,1)+range('rate','Learning rate',.05,1,.05,.6)+select('target','Training target',TARGET_NAMES.map((t,i)=>[i,t]),0)+range('h2','Second feature coordinate',-1,1,.1,.5),
 supervision:()=>range('row','Inspect input row',0,10,1,5)+select('completionOnly','Loss targets',[[1,'Response only'],[0,'All targets']],1),
 preference:()=>range('updates','Updates',0,8,1,1)+range('rate','Learning rate',.1,1,.1,.5)+range('beta','β',.1,2,.1,1)+range('reference','Reference P(preferred)',.1,.9,.1,.5),
 lora:()=>range('x1','Input x₁',-2,2,.25,1)+range('x2','Input x₂',-2,2,.25,2)+select('rank','Rank',[[1,'1'],[2,'2']],1)+range('scale','Adapter scale s',0,2,.25,1)+select('geometry','Display',[[1,'Matrices and geometry'],[0,'Matrices']],1),
 'lora-init':()=>select('initialization','Factor initialization',[['zero-B','Nonzero A, zero B'],['both-zero','Zero A and B'],['worked','Worked nonzero factors']],'zero-B')+select('rank','Rank',[[1,'1'],[2,'2']],1),
 thought:()=>range('a','First factor',3,19,1,17)+range('b','Second factor',12,29,1,23)+select('error','Trace',[[0,'Correct partial products'],[1,'Second product has an error']],0)+select('verify','Arithmetic checks',[[1,'Show checks'],[0,'Hide checks']],1),
 vision:()=>select('patch','Patch',PATCHES.map((p,i)=>[i,`Row ${p.row+1}, column ${p.column+1}`]),7)
};
export function extensionStudy(kind){
 const c=CONFIG[kind],last=c.stages.length-1;
 return `<section class="lab extension-study" data-extension-study="${kind}" data-ext-phase="${last}" data-running="false" aria-label="${c.title}"><div class="lab-heading"><span>Compute and inspect</span><h3>${c.title}</h3></div><div class="lab-options ext-options">${controls[kind]()}</div><div data-extension-view>${extensionView(kind,c.defaults,last)}</div><ol class="lab-stages">${c.stages.map((label,i)=>`<li><button type="button" data-ext-step="${i}" aria-pressed="${i===last}">${i+1}. ${label}</button></li>`).join('')}</ol><div class="lab-playback"><button type="button" data-ext-play aria-pressed="false">Replay</button><button type="button" data-ext-next>Next</button><button type="button" data-ext-reset>Restart</button>${kind==='training'||kind==='preference'?`<button type="button" data-ext-update>Apply one more update</button>`:''}</div><p class="lab-note" data-ext-status aria-live="polite">Settled result; replay to inspect the operations.</p><p class="lab-note">Decimals are rounded to three places. Playback repeats the displayed calculation; update controls recompute the parameter trajectory. All examples run locally.</p></section>`;
}
function matrix(M,label,id,tone='blue'){
 return `<div class="ext-matrix" data-ext-matrix="${id}" data-tone="${tone}"><b>${label}</b><div style="--columns:${M[0].length}">${M.flat().map((v,i)=>`<span data-row="${Math.floor(i/M[0].length)}" data-column="${i%M[0].length}">${f(v)}</span>`).join('')}</div></div>`;
}
const column=v=>v.map(x=>[x]);
const value=(id,label,v)=>`<div class="ext-value" data-ext-value="${id}"><span>${label}</span><b>${typeof v==='number'?f(v):esc(v)}</b></div>`;
function probabilities(values,names,id,label,tone='blue'){
 return `<div class="ext-probabilities" data-tone="${tone}"><b>${label}</b>${values.map((p,i)=>`<div><span>${esc(names[i])}</span><i style="--mass:${p}"></i><strong data-ext-prob="${id}-${i}">${f(p)}</strong></div>`).join('')}</div>`;
}
function lossPlot(history){
 const max=Math.max(1.5,...history.flatMap(p=>[p.train,p.held])),n=Math.max(1,history.length-1),x=k=>46+404*k/n,y=l=>192-155*l/max;
 const line=key=>history.map((p,i)=>`${x(i)},${y(p[key])}`).join(' ');
 return `<figure class="ext-loss-plot"><svg viewBox="0 0 480 238" role="img" aria-label="Training and held-out loss after each toy update"><path class="ext-plot-axis" d="M46 25 V192 H454"/>${[0,max/2,max].map(v=>`<path class="ext-plot-grid" d="M46 ${y(v)} H454"/><text x="39" y="${y(v)+4}" text-anchor="end">${f(v)}</text>`).join('')}<polyline points="${line('train')}" class="ext-train-line"/><polyline points="${line('held')}" class="ext-held-line"/>${history.map((p,i)=>`<circle class="ext-train-point" cx="${x(i)}" cy="${y(p.train)}" r="3"/><circle class="ext-held-point" cx="${x(i)}" cy="${y(p.held)}" r="3"/>`).join('')}<text x="46" y="213">0</text><text x="450" y="213" text-anchor="end">${history.length-1}</text><text x="250" y="231" text-anchor="middle">Parameter updates</text></svg><figcaption>Blue: training prefix · Rust: held-out prefix<br>These are two toy examples, not benchmark measurements.</figcaption></figure>`;
}
function rowProducts(M,x,id){
 return `<div class="ext-row-products">${M.map((row,r)=>`<p data-ext-dot="${id}-${r}">Row ${r+1}: ${row.map((v,c)=>`${f(v)} × ${f(x[c])}`).join(' + ')} = <b>${f(row.reduce((s,v,c)=>s+v*x[c],0))}</b></p>`).join('')}</div>`;
}
function geometry(d){
 const vectors=[{v:d.x,label:'input',tone:'muted'},{v:d.base,label:'base',tone:'blue'},{v:d.delta,label:'update',tone:'rust'},{v:d.output,label:'adapted',tone:'ink'}];
 const limit=Math.max(2,...vectors.flatMap(p=>p.v.map(Math.abs)))+1,s=118/limit,point=v=>[170+s*v[0],145-s*v[1]];
 return `<figure class="ext-geometry"><svg viewBox="0 0 340 290" role="img" aria-label="Base vector ${tuple(d.base)}, adapter change ${tuple(d.delta)}, adapted output ${tuple(d.output)}"><defs>${vectors.map((p,i)=>`<marker id="ext-lora-arrow-${i}" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 Z" class="ext-geom-fill" data-tone="${p.tone}"/></marker>`).join('')}</defs><path class="ext-plot-axis" d="M30 145 H310 M170 20 V270"/>${[-limit/2,limit/2].map(t=>`<text x="${170+s*t}" y="163" text-anchor="middle">${f(t)}</text><text x="178" y="${145-s*t+4}">${f(t)}</text>`).join('')}<text x="314" y="150">x</text><text x="176" y="18">y</text>${d.rank===1?`<path class="ext-rank-line" d="M${point([-.5*limit,-limit]).join(' ')} L${point([.5*limit,limit]).join(' ')}"/>`:''}${vectors.map((p,i)=>`<path class="ext-geom-vector" data-tone="${p.tone}" d="M170 145 L${point(p.v).join(' ')}" marker-end="url(#ext-lora-arrow-${i})"/>`).join('')}<path class="ext-geom-join" d="M${point(d.base).join(' ')} L${point(d.output).join(' ')}"/></svg><figcaption>Gray: input · Blue: base output · Rust: change · Ink: adapted output.<br>Input and base coincide for this identity base map. Dashed line: rank-one update direction. Axes rescale to keep all vectors visible.</figcaption></figure>`;
}
export function extensionView(kind,o={},step=CONFIG[kind].stages.length-1){
 if(kind==='anchors')return attentionView('window',o,step);
 if(kind==='rotary')return rotaryAttentionView(o,step);
 if(kind==='window'||kind==='linear')return attentionView(kind,o,step);
 if(kind==='batch'){
  const d=shiftedExample(o.row);
  return `<div class="ext-table-scroll"><table class="ext-table"><caption>Given toy target probabilities; inspect shifted pairs</caption><thead><tr><th>Input row</th><th>Source token</th><th>Next target</th><th>P(target)</th><th>−log P</th></tr></thead><tbody>${d.examples.map((e,i)=>`<tr data-current="${i===d.row}"><td>${i}</td><td><span data-ext-token="${i}">${esc(e.input)}</span> · ID ${e.id}</td><td>${esc(e.target)}</td><td data-ext-prob="batch-${i}">${f(e.p)}</td><td data-ext-loss="${i}">${f(e.loss)}</td></tr>`).join('')}</tbody></table></div><div class="ext-prefix"><b>Prefix available to prediction row ${d.row}</b><div>${d.prefix.map((t,i)=>`<span data-ext-prefix="${i}">${esc(t)}<small>ID ${d.prefixIds[i]}</small></span>`).join('')}</div></div><div class="ext-metric-row">${value('batch-target','Target held by the training procedure',d.examples[d.row].target)}${value('batch-mean','Mean of six prediction losses',d.loss)}</div><p class="lab-caption">Only input positions 0 through ${d.row} are supplied to this prediction. Its target is the next token, ${esc(d.examples[d.row].target)}. The procedure knows that target; the predicting representation cannot read it.</p>`;
 }
 if(kind==='training'){
  const d=trainingExample(o),b=d.before;
  return `<div class="ext-flow-grid">${matrix(column(d.h),'Fixed prefix feature h · 2 × 1','train-h')}<div>${matrix(b.W,'W before the displayed update · 3 × 2','train-before')}${rowProducts(b.W,d.h,'train')}</div><div>${matrix(column(b.logits),'Logits before update','train-logits')}${probabilities(b.p,TARGET_NAMES,'train-before','Probabilities before update')}</div></div><div class="ext-flow-grid">${matrix(column(b.dz),'p − one-hot(target)','train-dz','rust')}${matrix(b.gradient,'Gradient G · 3 × 2','train-gradient','rust')}${matrix(d.W,'W after '+d.updates+' update(s)','train-after')}</div><div class="ext-two-columns"><div>${probabilities(d.after.p,TARGET_NAMES,'train-after','Probabilities after the selected updates')}<div class="ext-metric-row">${value('train-old-loss','Loss before last update',b.loss)}${value('train-new-loss','Current training loss',d.after.loss)}</div><p class="lab-note">Target: ${TARGET_NAMES[d.target]}. Rate η = ${f(d.rate)}. Update count zero shows the initial matrix. A displayed update uses G from its earlier probabilities, not its new probabilities.</p></div>${lossPlot(d.history)}</div><p class="lab-caption">The chain rule sends each logit derivative into a matrix row, multiplied by the corresponding feature coordinate. Each entry changes by −ηG. The held-out curve uses h = (0, 1), target dog, and the same learned W.</p>`;
 }
 if(kind==='supervision'){
  const d=supervisedExample(o);
  return `<div class="ext-table-scroll"><table class="ext-table"><caption>Readability: words/markers are toy tokens; target probabilities are given</caption><thead><tr><th>Row</th><th>Input token</th><th>Next target</th><th>Visible to selected row?</th><th>Loss mask</th><th>Included loss</th></tr></thead><tbody>${d.examples.map((e,i)=>`<tr data-current="${i===d.row}"><td>${i}</td><td><span data-ext-sft-token="${i}">${esc(e.input)}</span></td><td>${esc(e.target)}</td><td data-ext-visible="${i}">${e.visible?'Read':'Future · masked'}</td><td data-ext-loss-mask="${i}">${e.active?'1 · train target':'0 · ignore target'}</td><td data-ext-sft-loss="${i}">${e.active?f(-Math.log(e.p)):'0'}</td></tr>`).join('')}</tbody></table></div><div class="ext-prefix"><b>Readable context for row ${d.row}</b><div>${d.examples.filter(e=>e.visible).map((e,i)=>`<span data-ext-sft-prefix="${i}">${esc(e.input)}</span>`).join('')}</div></div><div class="ext-metric-row">${value('sft-count','Included prediction targets',d.count)}${value('sft-loss','Average over included targets',d.loss)}</div><p class="lab-caption">Input row ${d.row} predicts ${esc(d.examples[d.row].target)}. Earlier prompt tokens remain readable even when their own prediction targets have loss mask zero. The visibility column concerns this selected row; loss terms for other rows have their own causal contexts.</p>`;
 }
 if(kind==='preference'){
  const d=preferenceExample(o),b=d.before,a=d.after,names=['Preferred response','Other response'];
  return `<div class="ext-two-columns">${probabilities([b.p,1-b.p],names,'policy','Policy before the displayed update')}${probabilities([d.reference,1-d.reference],names,'reference','Frozen reference for this trajectory','rust')}</div><div class="ext-flow-grid">${matrix(column([Math.log(b.p),Math.log(1-b.p)]),'Policy completion log-probabilities before update','pref-logs')}${matrix(column(d.refLogs),'Reference completion log-probabilities','pref-ref','rust')}<div>${value('pref-margin','β × adjusted log-odds margin before update',b.margin)}${value('pref-prob','Preference-model probability before update',b.preference)}</div></div><div class="ext-metric-row">${value('pref-before','u before last update',b.u)}${value('pref-gradient','dℓ/du at that u',b.gradient)}${value('pref-after','u after selected updates',a.u)}${value('pref-old-loss','Loss before update',b.loss)}${value('pref-loss','Current DPO loss',a.loss)}</div>${probabilities([a.p,1-a.p],names,'policy-after','Normalized policy after the selected updates')}<p class="lab-caption">Two complete responses are the only outcomes of this toy policy. Their probabilities are normalized together. A gradient step changes u; the reference stays fixed within the trajectory. Changing its control starts a new trajectory from u = 0.</p>`;
 }
 if(kind==='lora'||kind==='lora-init'){
  const d=loraExample(o);
  if(kind==='lora-init')return `<div class="ext-flow-grid"><div>${matrix(d.A,'A · '+d.rank+' × 2','init-A')}${rowProducts(d.A,d.x,'init')}</div>${matrix(d.B,'B · 2 × '+d.rank,'init-B')}<div>${matrix(column(d.intermediate),'Ax','init-feature')}${matrix(column(d.error),'Error h − (2, 3)','init-error','rust')}</div></div><div class="ext-two-columns">${matrix(d.dA,'Gradient with respect to A','init-dA','rust')}${matrix(d.dB,'Gradient with respect to B','init-dB','rust')}</div><div class="ext-metric-row">${value('init-output','Current output',tuple(d.output))}${value('init-loss','Squared-error loss',d.loss)}</div><p class="lab-caption">The base map is the identity and x = (1, 2). With only B zero, Ax can be nonzero and B can receive a gradient. Setting both factors to zero makes both factor gradients zero in this example.</p>`;
  return `<div class="ext-lora-input">${matrix(column(d.x),'Shared original input x','lora-x')}</div><div class="ext-two-paths"><div><span class="diagram-label">Frozen base path</span>${matrix([[1,0],[0,1]],'W₀ · 2 × 2','lora-W')}${matrix(column(d.base),'W₀x','lora-base')}</div><div><span class="diagram-label">Trainable adapter path</span><div class="ext-adapter-maps"><div>${matrix(d.A,'A · '+d.rank+' × 2','lora-A')}${rowProducts(d.A,d.x,'lora')}</div>${matrix(column(d.intermediate),'Ax · '+d.rank+' × 1','lora-feature')}${matrix(d.B,'B · 2 × '+d.rank,'lora-B')}</div>${matrix(column(d.delta),'sB(Ax)','lora-delta','rust')}</div></div><div class="ext-two-columns"><div>${matrix(column(d.output),'W₀x + sBAx','lora-output','rust')}${matrix(d.update,'Update matrix sBA','lora-update')}${matrix(column(d.mergedOutput),'Merged (W₀ + sBA)x','lora-merged')}<p class="lab-note">s = ${f(d.scale)}, α = s × r = ${f(d.alpha)}. This toy adapter has ${d.trainable} learned entries; the 2 × 2 base has four. The toy demonstrates structure, not parameter savings.</p></div>${o.geometry?geometry(d):''}</div><p class="lab-caption">The input enters W₀ and A independently. A produces r coordinates, B maps those coordinates back to width two, and scaling produces the modification. The two output paths are added once.</p>`;
 }
 if(kind==='thought'){
  const d=thoughtExample(o),visible=Math.max(0,Math.min(4,step)),chunk=visible?d.chunks[visible-1]:d.chunks[0];
  return `<div class="ext-generation-route"><div>${value('thought-problem','Problem',`${d.a} × ${d.b}`)}<div class="ext-generation-box"><b>Decoder and append</b><p>This stage's chunk is appended once; later stages can read it.</p><span data-ext-proposed>${esc(chunk)}</span></div></div><div class="ext-prefix ext-thought-prefix"><b>Intermediate text now available as context</b><div>${d.chunks.map((t,i)=>`<span data-ext-thought-chunk="${i}" data-revealed="${i<visible}" data-new="${i===visible-1}">${i<visible?esc(t):'Not generated yet'}${o.verify&&i<visible?`<small data-check="${d.checks[i]}">${d.checks[i]?'Arithmetic check: agrees':'Arithmetic check: mismatch'}</small>`:''}</span>`).join('')}</div></div></div><div class="ext-metric-row">${value('thought-reference','Exact arithmetic reference',d.correct)}${value('thought-answer','Trace answer',step===4?d.answer:'Not reached yet')}</div><p class="lab-caption">${o.error?'The second partial product has 10 added deliberately. Later addition reuses that incorrect value.':'The partial products are computed from the two factors and then added.'} This is an authored arithmetic/data-flow illustration, not a trained model's reasoning trace. Chunks group several potential generated tokens.</p>`;
 }
 const d=imageExample(PATCHES,o),patch=PATCHES[d.patch];
 return `<div class="ext-image-frame"><img src="assets/chasing-roles.png" width="2172" height="724" loading="lazy" alt="The original golden retriever and tabby cat chasing each other in two opposite arrangements"><div class="ext-patch-grid">${PATCHES.map((p,i)=>`<button type="button" data-ext-patch="${i}" aria-pressed="${i===d.patch}" aria-label="Inspect patch at row ${p.row+1}, column ${p.column+1}"><span>${i+1}</span></button>`).join('')}</div></div><div class="ext-flow-grid"><div><span class="ext-color-swatch" style="background:rgb(${d.features.map(v=>Math.round(v*255)).join(',')})" aria-hidden="true"></span>${matrix(column(d.features),'Actual patch mean RGB · 3 × 1','vision-feature')}</div>${matrix(IMAGE_PROJECTOR,'Fixed toy projector P · 4 × 3','vision-P')}<div>${matrix(column(d.projected),'Projected patch · 4 × 1','vision-output','rust')}${rowProducts(IMAGE_PROJECTOR,d.features,'vision')}</div></div><details class="ext-sequence-details" open><summary>Assembled input: 12 visual rows + 4 text rows, width 4</summary><div class="ext-table-scroll ext-sequence-scroll"><table class="ext-table"><thead><tr><th>Sequence row</th><th>Origin</th><th>Four coordinates</th></tr></thead><tbody>${d.rows.map((row,i)=>`<tr data-current="${i===d.patch}"><td>${i}</td><td>${i<12?`Image patch ${i+1}`:`Text: ${d.text[i-12]}`}</td><td data-ext-sequence="${i}">${row.map((v,c)=>`<span data-coordinate="${c}">${f(v)}</span>`).join(', ')}</td></tr>`).join('')}</tbody></table></div></details><p class="lab-caption">Selected patch: row ${patch.row+1}, column ${patch.column+1}. Its measurements come from the unchanged artwork. The fixed mean-color extractor and projector do not recognize animals; the four text embeddings are also chosen by hand. Width compatibility explains input assembly, not learned semantic alignment.</p>`;
}
export function extensionTransfers(kind,step,o){
 if(kind==='anchors')return attentionTransfers('window',step,o);
 if(kind==='rotary')return rotaryAttentionTransfers(step,o);
 if(kind==='window'||kind==='linear')return attentionTransfers(kind,step,o);
 const specs=[],cell=(id,r,c)=>`[data-ext-matrix="${id}"] [data-row="${r}"][data-column="${c}"]`;
 const send=(from,to,v,tone='blue',delay=0)=>specs.push({from,to,value:typeof v==='number'?f(v):String(v),tone,delay});
 if(kind==='batch'){
  const d=shiftedExample(o.row);
  if(step===1)d.prefixIds.forEach((id,i)=>send(`[data-ext-token="${i}"]`,`[data-ext-prefix="${i}"]`,`ID ${id}`,'blue',i*.05));
  if(step===2)send(`[data-ext-prob="batch-${d.row}"]`,`[data-ext-loss="${d.row}"]`,`−log → ${f(d.examples[d.row].loss)}`);
  if(step===3)d.examples.forEach((e,i)=>send(`[data-ext-loss="${i}"]`,'[data-ext-value=batch-mean] b',e.loss/d.examples.length,'rust',i*.05));
 }else if(kind==='training'){
  const d=trainingExample(o),b=d.before;
  if(step===0){for(let r=0;r<3;r++)for(let c=0;c<2;c++)send(cell('train-h',c,0),cell('train-before',r,c),d.h[c],'blue',r*.08);for(let r=0;r<3;r++){send(`[data-ext-dot="train-${r}"]`,cell('train-logits',r,0),b.logits[r],'blue',.75+r*.04);send(cell('train-logits',r,0),`[data-ext-prob="train-before-${r}"]`,b.p[r],'blue',1.4+r*.04);}}
  if(step===1)b.dz.forEach((v,r)=>send(`[data-ext-prob="train-before-${r}"]`,cell('train-dz',r,0),v,'rust',r*.06));
  if(step===2)b.gradient.forEach((row,r)=>row.forEach((v,c)=>send(cell('train-dz',r,0),cell('train-gradient',r,c),`× ${f(d.h[c])} = ${f(v)}`,'rust',r*.08)));
  if(step===3&&d.updates>0)b.gradient.forEach((row,r)=>row.forEach((v,c)=>send(cell('train-gradient',r,c),cell('train-after',r,c),`Δ = ${f(-d.rate*v)}`,'rust',r*.08)));
 }else if(kind==='supervision'){
  const d=supervisedExample(o);
  if(step===1)d.examples.filter(e=>e.visible).forEach((e,i)=>send(`[data-ext-sft-token="${i}"]`,`[data-ext-sft-prefix="${i}"]`,e.input,'blue',i*.035));
  if(step===3)d.examples.forEach((e,i)=>{if(e.active)send(`[data-ext-sft-loss="${i}"]`,'[data-ext-value=sft-loss] b',-Math.log(e.p)/d.count,'rust',i*.035);});
 }else if(kind==='preference'){
  if(step===1)for(let i=0;i<2;i++){send(`[data-ext-prob="policy-${i}"]`,cell('pref-logs',i,0),i===0?'log P(w)':'log P(l)');send(`[data-ext-prob="reference-${i}"]`,cell('pref-ref',i,0),i===0?'log P_ref(w)':'log P_ref(l)','rust',.1);}
  if(step===2){const d=preferenceExample(o);send('[data-ext-value=pref-margin] b','[data-ext-value=pref-gradient] b',d.before.gradient,'rust');}
  if(step===3&&o.updates>0){const d=preferenceExample(o);send('[data-ext-value=pref-gradient] b','[data-ext-value=pref-after] b',`Δu = ${f(d.after.u-d.before.u)}`,'rust');}
 }else if(kind==='lora'){
  const d=loraExample(o);
  if(step===0)for(let c=0;c<2;c++){for(let r=0;r<2;r++)send(cell('lora-x',c,0),cell('lora-W',r,c),d.x[c],'blue',r*.08);for(let r=0;r<d.rank;r++)send(cell('lora-x',c,0),cell('lora-A',r,c),d.x[c],'rust',r*.08);}
  if(step===1)d.intermediate.forEach((v,r)=>send(`[data-ext-dot="lora-${r}"]`,cell('lora-feature',r,0),v,'rust',r*.08));
  if(step===2)for(let r=0;r<2;r++)d.intermediate.forEach((v,c)=>send(cell('lora-feature',c,0),cell('lora-B',r,c),v,'rust',r*.1));
  if(step===3)for(let c=0;c<2;c++){send(cell('lora-base',c,0),cell('lora-output',c,0),d.base[c],'blue',c*.1);send(cell('lora-delta',c,0),cell('lora-output',c,0),d.delta[c],'rust',.1+c*.1);}
 }else if(kind==='lora-init'){
  const d=loraExample(o);if(step===1)d.intermediate.forEach((v,r)=>send(`[data-ext-dot="init-${r}"]`,cell('init-feature',r,0),v,'blue',r*.08));
  if(step===3)d.dB.forEach((row,r)=>row.forEach((v,c)=>send(cell('init-error',r,0),cell('init-dB',r,c),v,'rust',r*.1)));
 }else if(kind==='thought'&&step>0){
  const d=thoughtExample(o);send('[data-ext-proposed]',`[data-ext-thought-chunk="${step-1}"]`,d.chunks[step-1],'blue');
 }else if(kind==='vision'){
  const d=imageExample(PATCHES,o);
  if(step===1)d.features.forEach((v,c)=>send(`[data-ext-patch="${d.patch}"]`,cell('vision-feature',c,0),v,'blue',c*.08));
  if(step===2){for(let r=0;r<4;r++){for(let c=0;c<3;c++)send(cell('vision-feature',c,0),cell('vision-P',r,c),d.features[c],'blue',r*.08);send(`[data-ext-dot="vision-${r}"]`,cell('vision-output',r,0),d.projected[r],'rust',.85+r*.04);}}
  if(step===3)d.projected.forEach((v,r)=>send(cell('vision-output',r,0),`[data-ext-sequence="${d.patch}"] [data-coordinate="${r}"]`,v,'rust',r*.12));
 }
 return specs;
}
