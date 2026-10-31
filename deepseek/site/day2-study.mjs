import {sinkhornTrial,predictorTrial,blockTrace,rmsRow} from './day2-model.mjs';
const f=(v,d=4)=>Math.abs(v)<1e-12?'0':Number.isInteger(v)?String(v):v.toFixed(d).replace(/0+$/,'').replace(/\.$/,'');
const row=v=>'('+v.map(x=>f(x)).join(', ')+')';
const t=(x,y,s,c='wk-label')=>`<text x="${x}" y="${y}" class="${c}">${s}</text>`;
const right=(x,y,end)=>`<path class="wk-wire" d="M${x} ${y} H${end} m-6 -4 l6 4 -6 4"/>`;
const down=(x,y,end)=>`<path class="wk-wire" d="M${x} ${y} V${end} m-4 -6 l4 6 4 -6"/>`;
function matrix(x,y,label,values,w=245){const cw=(w-24)/values[0].length;return t(x,y,label)+`<path class="wk-bracket" d="M${x+7} ${y+12} h-7 v${values.length*32+8} h7 M${x+w-7} ${y+12} h7 v${values.length*32+8} h-7"/>`+values.map((r,i)=>r.map((v,j)=>t(x+12+cw*(j+.5),y+36+i*32,f(v),'wk-number')).join('')).join('');}
const svg=(h,label,b)=>`<svg class="week-svg" viewBox="0 0 760 ${h}" role="img" aria-label="${label}"><title>${label}</title>${b}</svg>`;
const fig=(title,note,body,controls='',attrs='')=>`<figure class="week-study" data-day2 ${attrs}><figcaption>${title}<span>${note}</span></figcaption><div class="week-viewport" tabindex="0" role="region" aria-label="${title}; scroll horizontally if needed"><div data-d2-svg>${body}</div></div>${controls}</figure>`;
const table=(headers,rows)=>`<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((v,i)=>i===0?`<th scope="row">${v}</th>`:`<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
export function divisionDiagram(step=2){
 const m=sinkhornTrial(step),action=step===0?'Positive starting amounts':`Division ${step}: correct the ${m.axis}`;
 let b=t(25,30,action)+t(25,66,'Rows are destinations; columns are sources.','wk-small')
  +matrix(25,112,step===0?'Starting table':'Before this division',m.previous,250)+right(295,166,430)+matrix(455,112,step===0?'Unchanged':'After this division',m.matrix,265);
 if(step>0)b+=t(303,115,'Divide '+m.axis,'wk-small')+t(303,215,'by '+row(m.divisors),'wk-small');
 b+=t(25,282,'Destination totals: '+row(m.rows))+t(25,326,'Source totals: '+row(m.columns))
  +t(25,374,'Largest row error: '+f(m.rowError,8),'wk-small')+t(390,374,'Largest column error: '+f(m.columnError,8),'wk-small');
 if(step>0)b+=t(25,426,`First entry: ${f(m.previous[0][0],6)} ÷ ${f(m.divisors[0],6)} ≈ ${f(m.matrix[0][0],6)}`);
 else b+=t(25,426,'First correction: divide the rows by 3 and 7.');
 return svg(452,'Inspect '+action.toLowerCase()+', both source and destination totals, and the first entry calculation',b);
}
export function divisionFigure(step){return fig(step===1?'Make each destination receive an average':'Make each source contribute a total of one','The correction acts on all entries of the selected row or column.',divisionDiagram(step));}
export function sinkhornDetail(step){const m=sinkhornTrial(step);return step===0?'The positive amounts start with row totals (3, 7) and column totals (4, 6).':`After division ${step}, the ${m.axis} have totals one. The row error is ${f(m.rowError,8)} and the column error is ${f(m.columnError,8)}. ${step===40?'Twenty pairs of corrections are complete.':`The next division corrects the ${step%2?'columns':'rows'}.`}`;}
export function sinkhornFigure(){return fig('Keep checking both constraints','Starts after the row and column corrections worked above; values are rounded for display.',divisionDiagram(),`<div class="week-controls"><label>Individual division<input data-d2-division type="range" min="0" max="40" step="1" value="2"></label><button type="button" data-d2-next>Next correction</button><button type="button" data-d2-reset>Restart</button><span data-d2-count>2 / 40</span></div><div class="week-detail" data-d2-detail aria-live="polite">${sinkhornDetail(2)}</div>`,'data-d2-sinkhorn');}
export function preferenceDiagram(change=0){
 const before=sinkhornTrial(40),after=sinkhornTrial(40,change);
 const b=t(25,30,'Change the score from source 0 to destination 0')
  +t(25,72,'Score change: '+f(change)+' · positive amount: exp(change) = '+f(after.seed[0][0]),'wk-small')
  +matrix(25,128,'Original constrained bypass',before.matrix,280)+right(325,180,420)+matrix(445,128,'New constrained bypass',after.matrix,280)
  +t(25,282,'New destination totals '+row(after.rows))+t(25,325,'New source totals '+row(after.columns))
  +t(25,378,'Apply it to the original first feature column (1, 0):','wk-small')+t(25,416,'Output '+row(after.output)+' · mean '+f((after.output[0]+after.output[1])/2));
 return svg(445,'Compare the original constrained bypass with a changed connection score; inspect all new totals and its output on the known feature column',b);
}
export function preferenceFigure(){return fig('Change a preference while keeping legal connections','Forty individual divisions in each comparison · chosen scores, not trained weights.',preferenceDiagram(),`<div class="week-controls"><label>Score change at destination 0, source 0<input data-d2-score type="range" min="-2" max="2" step="0.25" value="0"></label><button type="button" data-d2-score-reset disabled>Restore score</button></div>`,'data-d2-preference');}
export function measurementDiagram(){
 const m=predictorTrial(),other=predictorTrial({swapped:true});
 let b=matrix(25,32,'Original stream rows',m.X,255)+matrix(430,32,'Exchange the stream rows',other.X,255)
  +t(25,163,'Both average to '+row(m.streamMean))+t(25,210,'Keep the original row order: v = '+row(m.v))
  +t(25,262,'Coordinate','wk-small')+t(275,262,'Value','wk-small')+t(430,262,'Weight in w','wk-small')+t(615,262,'Product','wk-small');
 m.v.forEach((v,i)=>{const y=301+i*38;b+=t(25,y,`Stream ${Math.floor(i/2)}, feature ${i%2}`,'wk-small')+t(290,y,f(v))+t(462,y,f(m.column[i]))+t(633,y,f(m.products[i]));});
 b+=`<path class="wk-axis" d="M25 442 H720"/>`+t(25,480,'Add products: vw = '+f(m.measurement))+t(25,522,'The exchanged rows give '+f(other.measurement)+' with the same chosen weights.');
 return svg(550,'Two states with the same mean but different stream ownership; a complete predictor column measures their first-feature difference',b);
}
export function measurementFigure(){return fig('Measure which stream holds the larger first feature','Every coordinate and chosen weight is shown. Training could learn other measurement columns.',measurementDiagram());}
export function predictorScaleFigure(){return `<figure class="week-study"><figcaption>Common scale changes the measurement and its divisor together<span>The same pattern at two magnitudes; ε = 10⁻⁶ is included.</span></figcaption>${table(['State multiplier','Raw measurement','RMS divisor','Normalized measurement'],[1,10].map(scale=>{const m=predictorTrial({scale});return [scale,f(m.measurement),f(m.normalization.divisor),f(m.z,6)];}))}</figure>`;}
export function coefficientDiagram(swapped=false,dynamic=true){
 const m=predictorTrial({swapped,dynamic:dynamic ? .5 : 0});
 let b=matrix(25,30,'Current rows',m.X,235)+t(340,53,'Flatten: v = '+row(m.v))+t(340,95,'Chosen w = '+row(m.column),'wk-small')
  +t(25,180,'Measured difference vw = '+f(m.measurement))+t(25,224,'Divide by RMS(v) ≈ '+f(m.normalization.divisor))
  +t(25,268,'Normalized measurement z ≈ '+f(m.z))+t(25,323,'Default β = 0; state multiplier α = '+f(m.dynamic))
  +t(25,367,'Score β + αz ≈ '+f(m.score))+down(380,385,417)
  +t(25,455,'A₀ = sigmoid(score) + 10⁻⁶ ≈ '+f(m.inputCoefficient,6))
  +t(25,505,'Its contribution to the sublayer input:','wk-small')+t(25,546,f(m.inputCoefficient)+' × '+row(m.X[0])+' ≈ '+row(m.inputContribution));
 return svg(575,'Compute one input coefficient from the current state, its RMS, a default and a state-dependent adjustment, then use it on stream zero',b);
}
export function coefficientFigure(){return fig('The same learned rule can connect different states differently','Chosen predictor column, β = 0 and α = 0.5; only A₀ is followed here.',coefficientDiagram(),`<div class="week-controls"><label>Stream arrangement<select data-d2-arrangement><option value="original">Original rows</option><option value="swapped">Exchange rows</option></select></label><label><input data-d2-dynamic type="checkbox" checked> Use the state-dependent part</label></div>`,'data-d2-coefficient');}
export function inputScaleFigure(){const m=blockTrace();return `<figure class="week-study"><figcaption>Normalize the mixed input before running the sublayer<span>The divisor is computed from this two-feature row; unit learned gains.</span></figcaption>${table(['Mixed input','Mean square','RMS divisor','Normalized input'],[1,2].map(scale=>{const r=m.attentionInput.map(v=>v*scale),n=rmsRow(r);return [row(r),f(n.meanSquare),f(n.divisor),row(n.row)];}))}</figure>`;}
export function blockDiagram(stage=0,strength=1){
 const m=blockTrace(strength),second=stage===1,state=second?m.Y:m.X,input=second?m.expertInput:m.attentionInput,norm=second?m.expertNorm:m.attentionNorm,update=second?m.expert.output:m.attentionOutput,carry=second?m.expertCarry:m.attentionCarry,injection=second?m.expertInjection:m.attentionInjection,result=second?m.result:m.Y;
 let b=t(25,28,second?'Second update: read Y, the attention-updated rows':'First update: read X, the original two rows')
  +matrix(25,75,second?'Y':'X',state,250)+right(285,130,335)+t(355,96,'A = (0.5, 0.5)','wk-small')+t(355,133,'Mixed input '+row(input))+t(355,179,'RMSNorm → '+row(norm.row))
  +down(500,195,220)+`<rect class="wk-map" x="345" y="225" width="380" height="75"/>`+t(365,255,second?'Day 1 expert · same stored weights':'Attention · supplied output')+t(365,284,row(update))
  +down(145,165,333)+matrix(25,369,'Carry B times the current state',carry,285)
  +down(520,300,333)+matrix(440,369,'Add C times this update',injection,285)
  +t(355,420,'+','wk-plus')+`<path class="wk-wire" d="M165 455 V495 H380 M580 455 V495 H380"/>`+down(380,495,525)
  +matrix(235,563,second?'State for the next block':'Y · state for the expert',result,290)
  +t(25,689,'B diagonal = 0.75; off-diagonal = 0.25. C = (0.5, 1)ᵀ.','wk-small');
 return svg(715,'Trace '+(second?'the second expert update from Y':'the first attention update from X')+', including the current mixed input, normalization, bypass, output injection and resulting stream rows',b);
}
export function blockDetail(stage,strength){const m=blockTrace(strength);return stage===0?`The supplied attention output is ${row(m.attentionOutput)}. Its contributions and the bypass produce Y with rows ${m.Y.map(row).join(' and ')}.`:`The expert reads the mixture ${row(m.expertInput)} from Y and the normalized row ${row(m.expertNorm.row)}. Its computed output is ${row(m.expert.output)}. The final rows are ${m.result.map(row).join(' and ')}.`;}
export function blockFigure(){return fig('Follow the first result into the second computation','Chosen two-stream connections; attention output supplied, single-expert output computed from Day 1 weights. Rounded values.',blockDiagram(),`<div class="week-controls"><label>Update<select data-d2-block-stage><option value="0">1 · Attention</option><option value="1">2 · Expert on the changed rows</option></select></label><button type="button" data-d2-block-next>Follow into the expert</button><label>Supplied attention output<select data-d2-attention><option value="1">(2, −1)</option><option value="0">(0, 0)</option></select></label></div><div class="week-detail" data-d2-detail aria-live="polite">${blockDetail(0,1)}</div>`,'data-d2-block');}
export function expertCalculationBody(strength=1){const e=blockTrace(strength).expert;return `<p>The matrices W₁, W₃ and W₂ are unchanged from §1.2. The input is now ${row(e.input)}. All rows below are calculated from those stored weights.</p>${table(['Operation','Computed row'],[['xW₁',row(e.gateRaw)],['SiLU(xW₁)',row(e.gate)],['xW₃',row(e.features)],['Coordinatewise product',row(e.products)],['Multiply by W₂',row(e.output)]])}`;}
export function expertCalculation(){return `<details class="code-detail"><summary>Inspect the Day 1 expert on its new input</summary><div data-d2-expert-table>${expertCalculationBody()}</div></details>`;}
export function blockResultBody(strength=1){const m=blockTrace(strength);return `<figcaption>Finish the second residual addition<span>Supplied attention output ${row(m.attentionOutput)}; the expert output is computed. This table follows the inspector above.</span></figcaption>${table(['Destination','Bypass from Y','Expert contribution','Result'],m.result.map((r,i)=>[i,row(m.expertCarry[i]),row(m.expertInjection[i]),row(r)]))}`;}
export function blockResult(){return `<figure class="week-study" data-d2-block-result>${blockResultBody()}</figure>`;}
export function initializeDay2(root=document){
 for(const study of root.querySelectorAll('[data-d2-sinkhorn]')){const get=s=>study.querySelector(s),range=get('[data-d2-division]'),next=get('[data-d2-next]'),reset=get('[data-d2-reset]');const update=()=>{const n=Number(range.value);get('[data-d2-svg]').innerHTML=divisionDiagram(n);get('[data-d2-detail]').textContent=sinkhornDetail(n);get('[data-d2-count]').textContent=n+' / 40';next.disabled=n===40;reset.disabled=n===0;};range.addEventListener('input',update);next.addEventListener('click',()=>{range.value=String(Math.min(40,Number(range.value)+1));update();});reset.addEventListener('click',()=>{range.value='0';update();});}
 for(const study of root.querySelectorAll('[data-d2-preference]')){const range=study.querySelector('[data-d2-score]'),reset=study.querySelector('[data-d2-score-reset]');const update=()=>{study.querySelector('[data-d2-svg]').innerHTML=preferenceDiagram(Number(range.value));reset.disabled=Number(range.value)===0;};range.addEventListener('input',update);reset.addEventListener('click',()=>{range.value='0';update();});}
 for(const study of root.querySelectorAll('[data-d2-coefficient]')){const select=study.querySelector('[data-d2-arrangement]'),dynamic=study.querySelector('[data-d2-dynamic]');const update=()=>{study.querySelector('[data-d2-svg]').innerHTML=coefficientDiagram(select.value==='swapped',dynamic.checked);};select.addEventListener('change',update);dynamic.addEventListener('change',update);}
 for(const study of root.querySelectorAll('[data-d2-block]')){const get=s=>study.querySelector(s),stage=get('[data-d2-block-stage]'),strength=get('[data-d2-attention]'),next=get('[data-d2-block-next]');const update=()=>{const s=Number(stage.value),a=Number(strength.value);get('[data-d2-svg]').innerHTML=blockDiagram(s,a);get('[data-d2-detail]').textContent=blockDetail(s,a);next.disabled=s===1;for(const out of root.querySelectorAll('[data-d2-block-result]'))out.innerHTML=blockResultBody(a);for(const out of root.querySelectorAll('[data-d2-expert-table]'))out.innerHTML=expertCalculationBody(a);};stage.addEventListener('change',update);strength.addEventListener('change',update);next.addEventListener('click',()=>{stage.value='1';update();});}
}
