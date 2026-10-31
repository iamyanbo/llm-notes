import {residualAlternatives,repeatedCarry,hcWiringExample,transportCases,transportReplay,sinkhornStep,coefficientExample,blockExample} from './residual-model.mjs';
const f=(v,d=4)=>Math.abs(v)<1e-12?'0':Number.isInteger(v)?String(v):v.toFixed(d).replace(/0+$/,'').replace(/\.$/,'');
const row=a=>'('+a.map(x=>f(x)).join(', ')+')';
const text=(x,y,s,c='')=>`<text x="${x}" y="${y}" class="${c}">${s}</text>`;
const down=(x,y,end)=>`<path class="wk-wire" d="M${x} ${y} V${end} m-4 -6 l4 6 4 -6"/>`;
const right=(x,y,end)=>`<path class="wk-wire" d="M${x} ${y} H${end} m-6 -4 l6 4 -6 4"/>`;
function matrix(x,y,label,values,width=220){
 const cw=(width-24)/values[0].length;
 return text(x,y,label,'wk-label')+`<path class="wk-bracket" d="M${x+7} ${y+12} h-7 v${values.length*28+8} h7 M${x+width-7} ${y+12} h7 v${values.length*28+8} h-7"/>`+values.map((r,i)=>r.map((v,j)=>text(x+12+cw*(j+.5),y+34+28*i,f(v),'wk-number')).join('')).join('');
}
const svg=(h,label,body,width=600)=>`<svg class="week-svg" viewBox="0 0 ${width} ${h}" role="img" aria-label="${label}"><title>${label}</title>${body}</svg>`;
const figure=(label,note,body,controls='',attrs='')=>`<figure class="week-study" ${attrs}><figcaption>${label}<span>${note}</span></figcaption><div class="week-viewport" tabindex="0" role="region" aria-label="${label}; scroll horizontally if needed"><div data-residual-svg>${body}</div></div>${controls}</figure>`;
export function residualAlternativesDiagram(fraction=.5){
 const m=residualAlternatives(fraction);
 let body=text(25,28,'Start from the Day 1 calculation','wk-label')
  +text(25,66,'Old row x = '+row(m.input),'wk-label')+text(25,99,'Computed update u = '+row(m.update),'wk-label')
  +text(25,132,'Full residual result r = x + u = '+row(m.ordinary),'wk-label')
  +`<path class="wk-axis" d="M25 156 H775"/>`
  +text(25,193,'Store one weighted result','wk-label')+text(435,193,'Keep before and after rows','wk-label')
  +text(25,233,'Choose update multiplier λ = '+f(fraction),'wk-small')
  +matrix(25,278,'Retained state: x + λu',[m.oneRow],340)
  +matrix(435,241,'Retained state: two rows',m.retained,340)
  +down(190,342,428)+down(600,338,365)
  +text(435,397,'Read (1 − λ)x + λr','wk-label')
  +`<rect class="wk-selected" x="25" y="443" width="340" height="80"/>`+text(42,471,'Input for the next sublayer','wk-small')+text(42,503,row(m.oneRow),'wk-label')
  +`<rect class="wk-selected" x="435" y="443" width="340" height="80"/>`+text(452,471,'Input for the next sublayer','wk-small')+text(452,503,row(m.read),'wk-label')+down(600,406,440)
  +text(25,566,'Two stored coordinates','wk-label')+text(435,566,'Four stored coordinates','wk-label')
  +text(25,602,'The next inputs agree. What remains stored is different.','wk-label');
 return svg(625,'Compare one weighted residual row with two retained rows: their next inputs agree for the chosen fraction, while the retained states differ',body,800);
}
export function residualAlternativesDetail(fraction){const m=residualAlternatives(fraction);return `At λ = ${f(fraction)}, both next inputs are ${row(m.read)}. On the left that is the one stored row. On the right, the before row ${row(m.input)} and full after row ${row(m.ordinary)} remain available for a different later read.`;}
export function residualAlternativesFigure(){return figure('The same next input, with different retained state','Actual Day 1 expert output · choose the multiplier to compare the constructions',residualAlternativesDiagram(),`<div class="week-controls"><label>Update multiplier λ<input data-alternatives-fraction type="range" min="0" max="1" step="0.25" value="0.5"></label><button type="button" data-alternatives-reset disabled>Reset to one half</button></div><div class="week-detail" data-alternatives-detail aria-live="polite">${residualAlternativesDetail(.5)}</div>`,'data-residual-alternatives');}
export function repeatedCarryFigure(){return `<figure class="week-study"><figcaption>Scaling the old path compounds across layers<span>Isolated example: every sublayer output is zero; start from the Day 1 row (1, 2).</span></figcaption><div class="table-wrap"><table><thead><tr><th>Old-row multiplier μ</th>${[0,1,2,3,4].map(n=>`<th>After ${n} ${n===1?'layer':'layers'}</th>`).join('')}</tr></thead><tbody>${[.5,1,2].map(gain=>`<tr><th scope="row">${f(gain)}</th>${repeatedCarry(gain).map(r=>`<td>${row(r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></figure>`;}
export function hcOverviewDiagram(){
 const m=hcWiringExample(2);
 let body=text(210,24,'One token · two current stream rows','wk-label');
 for(let i=0;i<2;i++){
  const x=i===0?45:505;
  body+=`<rect class="wk-selected" x="${x}" y="45" width="250" height="75"/>`+text(x+18,73,'Stream '+i,'wk-small')+text(x+18,103,row(m.X[i]),'wk-label');
 }
 body+=`<path class="wk-wire" d="M170 120 V145 H400 M630 120 V145 H400 V172 m-4 -6 l4 6 4 -6"/>`
  +`<rect class="wk-selected" x="260" y="175" width="280" height="65"/>`+text(278,201,'Combine half of each row','wk-small')+text(278,227,row(m.input),'wk-label')
  +down(400,240,267)+`<rect class="wk-map" x="260" y="270" width="280" height="62"/>`+text(278,295,'F · the Day 1 expert','wk-label')+text(278,319,'One evaluation on the mixed row','wk-small')
  +down(400,332,357)+`<rect class="wk-result" x="260" y="360" width="280" height="62"/>`+text(278,385,'Computed output','wk-small')+text(278,409,row(m.update),'wk-label')
  +`<path class="wk-query" d="M400 422 V442 H220 V481 m-4 -6 l4 6 4 -6 M400 442 H580 V481 m-4 -6 l4 6 4 -6"/>`
  +text(65,468,'Half of the output','wk-small')+text(600,468,'Full output','wk-small')
  +`<path class="wk-key" d="M45 83 H20 V505 H194 m-6 -4 l6 4 -6 4 M755 83 H780 V505 H606 m6 -4 l-6 4 6 4"/>`
  +text(35,280,'Carry the original row','wk-small')+text(35,310,row(m.X[0]),'wk-label')
  +text(580,280,'Carry the original row','wk-small')+text(580,310,row(m.X[1]),'wk-label');
 for(let i=0;i<2;i++){
  const cx=i===0?220:580,x=i===0?70:430;
  body+=`<circle class="wk-step" cx="${cx}" cy="505" r="19"/>`+text(cx-9,515,'+','wk-plus')+down(cx,524,550)
   +`<rect class="wk-result" x="${x}" y="553" width="300" height="77"/>`+text(x+17,580,'Stream '+i+' continues','wk-small')+text(x+17,612,row(m.result[i]),'wk-label');
 }
 body+=text(165,661,'Both rows remain available to the next sublayer.','wk-label');
 return svg(680,'One expert call: combine the two current rows, compute one update, add half to stream zero and the full update to stream one, then carry both resulting rows onward',body,800);
}
export function hcOverviewFigure(){return figure('One expert call, two rows carried onward','Blue outer paths carry the original rows; the central path computes the update. Chosen connection settings; the expert uses the Day 1 weights.',hcOverviewDiagram(),'','data-hc-overview');}
export function hcInputDiagram(){
 const m=hcWiringExample(1),half=m.X.map(r=>r.map(v=>v*.5));
 const body=text(25,30,'Stream 0','wk-label')+text(25,65,row(m.X[0]),'wk-label')+text(335,30,'Stream 1','wk-label')+text(335,65,row(m.X[1]),'wk-label')
  +down(145,80,112)+down(455,80,112)+text(25,145,'Take one half','wk-small')+text(25,177,row(half[0]),'wk-label')+text(335,145,'Take one half','wk-small')+text(335,177,row(half[1]),'wk-label')
  +`<path class="wk-wire" d="M145 195 V222 H277 M455 195 V222 H323"/>`+text(290,230,'+','wk-plus')+down(300,238,267)
  +`<rect class="wk-selected" x="125" y="272" width="350" height="72"/>`+text(145,300,'Expert input · two features','wk-small')+text(145,326,row(m.input),'wk-label')+down(300,344,375)
  +`<rect class="wk-map" x="125" y="380" width="350" height="52"/>`+text(145,411,'F · the same Day 1 expert','wk-label')+down(300,432,464)
  +text(145,493,'Computed expert output','wk-small')+text(145,524,row(m.update),'wk-label');
 return svg(550,'Half of each current stream adds to one expert input; the same expert weights compute its output',body);
}
export function hcInputFigure(){return figure('Two streams supply one expert input','Chosen average · output recomputed with the Day 1 expert weights',hcInputDiagram());}
export function hcOutputDiagram(){
 const m=hcWiringExample(2);
 let body=text(160,30,'The one computed expert output','wk-small')+text(160,64,row(m.update),'wk-label')
  +`<path class="wk-wire" d="M300 80 V100 H145 V124 m-4 -6 l4 6 4 -6 M300 100 H455 V124 m-4 -6 l4 6 4 -6"/>`;
 for(let i=0;i<2;i++){
  const x=25+i*310;
  body+=`<rect class="wk-highlight" x="${x}" y="136" width="240" height="85"/>`+text(x+14,166,i===0?'Multiply by one half':'Multiply by one','wk-small')+text(x+14,201,row(m.injection[i]),'wk-label')
   +down(x+120,221,252)+text(x,287,'Add to original stream '+i,'wk-label')+text(x,328,row(m.X[i]),'wk-label')+text(x,369,'+ '+row(m.injection[i]),'wk-label')
   +`<path class="wk-axis" d="M${x} 389 H${x+240}"/>`+text(x,428,row(m.result[i]),'wk-label');
 }
 body+=text(25,476,'Both original rows receive a contribution from the same expert call.','wk-small');
 return svg(500,'Half of the expert output is added to stream zero and the full output to stream one',body);
}
export function hcOutputFigure(){return figure('Add a separate contribution to each stream','Original rows + scaled expert output · displayed values rounded to four decimals',hcOutputDiagram());}
export function hcWiringDiagram(stage=0){
 const m=hcWiringExample(stage);
 const body=matrix(25,30,'X · two current stream rows',m.X,250)+matrix(345,30,'A · input connections',m.A,220)+right(285,83,325)+down(450,92,136)
  +text(345,169,'AX = '+row(m.input),'wk-label')+`<rect class="wk-map" x="345" y="194" width="220" height="72"/>`+text(360,224,'F · Day 1’s worked expert','wk-label')+text(360,249,'Same stored weight matrices','wk-small')+down(450,266,300)+text(345,331,'u = '+row(m.update),'wk-label')
  +down(150,120,195)+matrix(25,230,'B · bypass connections',m.B,250)+text(25,352,'This path reads the original X.','wk-small')+down(150,374,478)
  +matrix(365,382,'C · output connections',m.C,180)+down(450,474,492)
  +matrix(25,530,'BX',m.transport,250)+matrix(345,530,'Cu',m.injection,220)+text(296,581,'+','wk-plus')
  +`<path class="wk-wire" d="M150 615 V650 H315 M455 615 V650 H315"/>`+down(315,650,681)+matrix(185,722,'X⁺ = BX + Cu',m.result,260)
  +text(25,835,'F is evaluated once per view. Every view starts from the same X.','wk-small');
 return svg(860,'Read with A, evaluate one expert, write with C, and add the B bypass',body);
}
export function hcWiringDetail(stage){
 const m=hcWiringExample(stage);
 return [
  `A selects stream 0. B is identity. C adds F’s result only to stream 0. The first result row is the ordinary residual update (1, 2) + ${row(m.update)} = ${row(m.result[0])}; stream 1 stays (0, 1).`,
  `Only A changed: the expert now reads ½(1, 2) + ½(0, 1) = (0.5, 1.5). Its output is recomputed with the same Day 1 weights. B and C are unchanged.`,
  `Only C changed from the preceding view. Stream 0 receives half of the computed update; stream 1 receives a full copy. The expert still runs once on (0.5, 1.5).`,
  `Only B changed from the preceding view. The bypass now carries (0.75, 1.75) and (0.25, 1.25), formed from the original rows. Add the same Cu as before.`,
 ][stage];
}
export function hcWiringFigure(){return figure('Ordinary residual wiring, then three learnable connection maps','Two-stream HC illustration · computed with the expert weights from Day 1',hcWiringDiagram(),`<div class="week-controls"><label>Connections<select data-hc-stage><option value="0">0. Ordinary residual on stream 0</option><option value="1">1. Change A: what F reads</option><option value="2">2. Change C: where F writes</option><option value="3">3. Change B: the bypass</option></select></label><button type="button" data-hc-next>Next</button><button type="button" data-hc-reset disabled>Restart</button><span data-hc-count>1 / 4</span></div><div class="week-detail" data-hc-detail aria-live="polite">${hcWiringDetail(0)}</div><p class="moe-note">The zero/one maps recover fixed residual wiring inside HC. These are hand-set connection examples; V4’s generated sigmoid gates are developed below.</p>`,'data-hc-wiring');}
export function featureColumnDiagram(){
 const X=hcWiringExample().X;
 const b=text(25,28,'X · the two stream rows from §2.2','wk-label')
  +text(151,70,'Feature 0','wk-small')+text(276,70,'Feature 1','wk-small')
  +`<rect class="wk-selected" x="144" y="82" width="102" height="111"/>`
  +text(25,116,'Stream 0','wk-small')+text(25,165,'Stream 1','wk-small')
  +text(195,116,f(X[0][0]),'wk-number')+text(320,116,f(X[0][1]),'wk-number')
  +text(195,165,f(X[1][0]),'wk-number')+text(320,165,f(X[1][1]),'wk-number')
  +right(365,132,440)+matrix(465,91,'v · first column',X.map(r=>[r[0]]),110)
  +text(590,125,'Source 0','wk-small')+text(590,153,'Source 1','wk-small')
  +text(25,235,'B mixes streams within a feature. Each feature has its own column.','wk-label');
 return svg(260,'Extract feature zero from X: stream zero contributes 1 and stream one contributes 0, giving the column v',b,720);
}
export function featureColumnFigure(){return figure('The same state, viewed one feature at a time','The highlighted column supplies all the comparisons below.',featureColumnDiagram(),'','data-residual-constraint');}
const transportRow=a=>'('+a.map(v=>f(v,7)).join(', ')+')';
const factor=v=>v<0?'('+f(v,7)+')':f(v,7);
const transportColumn=(x,label,values)=>text(x,113,label,'wk-label')+`<path class="wk-bracket" d="M${x+7} 125 h-7 v64 h7 M${x+98} 125 h7 v64 h-7"/>`+values.map((v,i)=>text(x+52,147+i*28,f(v,7),'wk-number')).join('');
function transportProduct(m,heading,highlight=false,showMean=true){
 let b=text(25,28,heading,'wk-label')+text(25,62,'B: destination rows, source columns','wk-small')
  +text(89,97,'Source 0','wk-small')+text(192,97,'Source 1','wk-small');
 if(highlight)b+=`<rect class="wk-selected" x="65" y="125" width="94" height="69"/>`;
 b+=matrix(50,113,'B',m.matrix,220)+text(297,166,'×','wk-plus')+transportColumn(350,'Input v',m.input)+text(493,166,'=','wk-plus')+transportColumn(550,'Output',m.output)
  +`<path class="wk-axis" d="M25 218 H695"/>`;
 m.matrix.forEach((r,i)=>{b+=text(25,251+39*i,'Destination '+i,'wk-small')+text(184,251+39*i,`${factor(r[0])} × ${factor(m.input[0])} + ${factor(r[1])} × ${factor(m.input[1])} = ${f(m.output[i],7)}`,'wk-label');});
 b+=text(25,335,'Row sums '+row(m.rows),'wk-small');
 if(showMean)b+=text(350,335,'Column sums '+row(m.columns),'wk-small')+text(25,374,`Mean across streams: ${f(m.inputMean)} → ${f(m.outputMean)}`,'wk-label');
 return b;
}
export function constraintDiagram(index=3){
 const m=transportCases()[index];if(!m)throw new RangeError('Choose one of the four bypass comparisons');
 return svg(index>=2?400:355,m.label+': multiply the same feature column by B and calculate both destinations',transportProduct(m,m.label,index>=2,index>=2),720);
}
export function constraintFigure(index=3){
 const labels=['A gain on the bypass multiplies up the old value','A row sum of one still allows signed overshoot','Each row is an average; one source is copied twice','Each source contributes a total coefficient of one'];
 return figure(labels[index],'Chosen bypass · input values 1 and 0 come from the same feature of the two streams.',constraintDiagram(index),'','data-residual-constraint');
}
export function transportReplayDiagram(coefficient=.75,steps=1){
 const m=transportReplay(coefficient,steps);
 const b=transportProduct(m,`Application ${steps}: use the preceding output as input`,true)
  +text(25,415,'Difference between streams: '+f(m.difference,6),'wk-label');
 return svg(440,`Application ${steps} of the fixed bypass with diagonal coefficient ${f(coefficient)}: input ${transportRow(m.input)}, output ${transportRow(m.output)}, mean ${f(m.outputMean)}`,b,720);
}
export function transportReplayDetail(coefficient,steps){const m=transportReplay(coefficient,steps);return `Application ${steps} starts from ${transportRow(m.input)} and produces ${transportRow(m.output)}. The original column was ${transportRow(m.initial)}. The current mean is ${f(m.outputMean)}, and the difference between stream 0 and stream 1 is ${f(m.difference,6)}.`;}
export function transportReplayFigure(){return figure('Repeat the bypass, one application at a time','Start from the same first feature column. The new expert output stays zero throughout this experiment.',transportReplayDiagram(),`<div class="week-controls"><label>Diagonal coefficient<select data-transport-coefficient><option value="1">1 · keep each stream</option><option value="0.75" selected>0.75 · mix gradually</option><option value="0.5">0.5 · take the average</option><option value="0.25">0.25 · mix and exchange</option><option value="0">0 · swap streams</option></select></label><button type="button" data-transport-next>Apply once more</button><button type="button" data-transport-reset disabled>Restart example</button><span data-transport-count>1 / 6 applications</span></div><div class="week-detail" data-transport-detail aria-live="polite">${transportReplayDetail(.75,1)}</div>`,'data-residual-constraint data-transport-replay');}
export function sinkhornDiagram(step=0){
 const m=sinkhornStep(step),sumLabel=step===0?'Positive starting coefficients':`After division ${step} · normalized ${m.axis}`;
 let b=matrix(25,30,'Raw scores',m.logits,220)+right(265,76,315)+matrix(345,30,'Exponentiate each score',m.seed,220)
  +text(25,153,'exp(0) = 1; exp(log 2) = 2; likewise for 3 and 4.','wk-small')
  +matrix(25,216,step===0?'Start here':'Before this division',m.previous,235);
 if(step>0)b+=text(325,242,'Divide '+m.axis+' by:','wk-label')+text(325,280,row(m.divisors),'wk-label');
 else b+=text(325,242,'Next: divide rows','wk-label')+text(325,280,'by their sums (3, 7).','wk-small');
 b+=down(145,309,349)+matrix(25,388,sumLabel,m.matrix,270)+text(330,435,'Row sums','wk-small')+text(330,465,row(m.rows),'wk-label')+text(25,508,'Column sums: '+row(m.columns),'wk-label')+text(25,549,'Largest row/column error: '+f(m.maxError,8),'wk-small');
 return svg(575,'Alternating row and column divisions, including both sets of sums',b);
}
export function sinkhornDetail(step){const m=sinkhornStep(step);return step===0?'Every entry is positive, but neither set of sums is one. The first operation divides the two rows by 3 and 7.':`Division ${step} used the ${m.axis}' sums ${row(m.divisors)}. The resulting row sums are ${row(m.rows)} and column sums are ${row(m.columns)}. The next division corrects the other axis.`;}
export function sinkhornFigure(){return figure('One normalization repairs an axis and disturbs the other','Hand calculation · row then column · 20 pairs give 40 divisions',sinkhornDiagram(),`<div class="week-controls"><label>Division<input data-sinkhorn-step type="range" min="0" max="40" step="1" value="0" aria-label="Normalization division, zero through forty"></label><button type="button" data-sinkhorn-next>Next division</button><button type="button" data-sinkhorn-reset disabled>Restart</button><span data-sinkhorn-count>0 / 40</span></div><div class="week-detail" data-sinkhorn-detail aria-live="polite">${sinkhornDetail(0)}</div>`,'data-residual-sinkhorn');}
export function coefficientDiagram(kind='input'){
 const m=coefficientExample(kind),name=kind==='input'?'A₀':'C₀';
 let b=matrix(25,28,'Flatten the four rows: v', [m.v],550)+text(25,113,`One chosen column of W_H predicts ${name}.`,'wk-label')
  +matrix(25,155,'v coordinate',m.v.map(x=>[x]),125)+matrix(230,155,'W_H column',m.column.map(x=>[x]),135)+matrix(440,155,'Products',m.products.map(x=>[x]),130)
  +text(176,293,'×','wk-plus')+text(394,293,'=','wk-plus')+text(25,456,'Add products: vW_H column = '+f(m.measurement),'wk-label')
  +text(25,506,'RMS(v) = √(8 / 8 + 10⁻⁶) ≈ '+f(m.rms,7),'wk-label')+text(25,541,'z = '+f(m.measurement)+' / RMS(v) ≈ '+f(m.z,7),'wk-label')
  +text(25,595,'Chosen dynamic scale α = 0.5; bias β = '+f(m.beta),'wk-label')+text(25,632,'αz + β ≈ '+f(m.logit,7),'wk-label')+down(300,650,687)
  +text(25,722,'σ(αz + β) ≈ '+f(m.sigmoid,7),'wk-label')+text(25,763,kind==='input'?`A₀ = σ(αz + β) + 10⁻⁶ ≈ ${f(m.result,7)}`:`C₀ = 2σ(αz + β) ≈ ${f(m.result,7)}`,'wk-label')
  +text(25,809,kind==='input'?'A₀ multiplies its original source stream row.':'C₀ multiplies the returned sublayer output row.','wk-small');
 return svg(835,'One predictor column, RMS scaling, bias and bounded output coefficient',b);
}
export function coefficientFigure(){return figure('From the current rows to one learned coefficient','Chosen predictor weights and gains · the four-stream state displayed above',coefficientDiagram(),`<div class="week-controls"><label>Coefficient<select data-coefficient-kind><option value="input">Input gate A₀</option><option value="injection">Output coefficient C₀</option></select></label></div><p class="moe-note">Each view shows its complete predictor column. These chosen predictor parameters illustrate how coefficients are generated; the connection diagram used hand-set coefficients.</p>`,'data-residual-coefficient');}
export function blockDiagram(){
 const m=blockExample();let b=text(25,28,'Attention update · start from the four chosen rows','wk-label')+matrix(25,65,'X',m.X,250)
  +text(325,90,'Input mixture AX','wk-small')+text(325,122,row(m.input[0]),'wk-label')+text(325,166,'RMSNorm · unit gains','wk-small')+text(325,198,row(m.attentionNorm.row),'wk-label')+down(445,216,249)
  +text(325,280,'Supplied attention output','wk-small')+text(325,312,row(m.update[0]),'wk-label')+text(25,270,'Bypass: BX','wk-small')+text(25,305,'New update: C · attention output','wk-small')
  +down(145,323,359)+matrix(25,399,'Y = BX + C · attention output',m.output,285)
  +text(355,435,'New mixture AY','wk-small')+text(355,467,row(m.nextInput[0]),'wk-label')+text(355,511,'RMSNorm · unit gains','wk-small')+text(355,543,row(m.expertNorm.row),'wk-label')
  +text(25,610,'Expert update · begins from Y, including its changed rows','wk-label')+text(25,657,'Supplied expert output '+row(m.nextUpdate[0]),'wk-label')+text(25,697,'Destination 0: old-row mixture (2, 0) + new contribution (−0.5, 0.5)','wk-small')+down(145,716,751)+matrix(25,788,'Final four-stream state',m.next,285)
  +text(350,835,'Each result becomes','wk-small')+text(350,862,'the next block’s state.','wk-small');
 return svg(945,'Two sublayer updates, each with its own mixed-input normalization',b);
}
export function blockFigure(){return figure('The second update must read the changed streams','Composition example · coefficients held fixed, sublayer outputs supplied · unit RMSNorm gains',blockDiagram());}
export function initializeResidualStudies(root=document){
 for(const study of root.querySelectorAll('[data-transport-replay]')){
  const get=s=>study.querySelector(s),select=get('[data-transport-coefficient]'),next=get('[data-transport-next]'),reset=get('[data-transport-reset]');let steps=1;
  const update=()=>{const a=Number(select.value);get('[data-residual-svg]').innerHTML=transportReplayDiagram(a,steps);get('[data-transport-detail]').textContent=transportReplayDetail(a,steps);get('[data-transport-count]').textContent=`${steps} / 6 applications`;next.disabled=steps===6;reset.disabled=steps===1&&a===.75;};
  select.addEventListener('change',()=>{steps=1;update();});next.addEventListener('click',()=>{steps=Math.min(6,steps+1);update();});reset.addEventListener('click',()=>{select.value='0.75';steps=1;update();});
 }
 for(const study of root.querySelectorAll('[data-residual-alternatives]')){
  const range=study.querySelector('[data-alternatives-fraction]'),reset=study.querySelector('[data-alternatives-reset]');
  const update=()=>{const fraction=Number(range.value);study.querySelector('[data-residual-svg]').innerHTML=residualAlternativesDiagram(fraction);study.querySelector('[data-alternatives-detail]').textContent=residualAlternativesDetail(fraction);reset.disabled=fraction===.5;};
  range.addEventListener('input',update);reset.addEventListener('click',()=>{range.value='0.5';update();});
 }
 for(const study of root.querySelectorAll('[data-hc-wiring]')){
  const get=s=>study.querySelector(s),select=get('[data-hc-stage]'),next=get('[data-hc-next]'),reset=get('[data-hc-reset]');
  const update=()=>{const stage=Number(select.value);get('[data-residual-svg]').innerHTML=hcWiringDiagram(stage);get('[data-hc-detail]').textContent=hcWiringDetail(stage);get('[data-hc-count]').textContent=`${stage+1} / 4`;next.disabled=stage===3;reset.disabled=stage===0;};
  select.addEventListener('change',update);next.addEventListener('click',()=>{select.value=String(Math.min(3,Number(select.value)+1));update();});reset.addEventListener('click',()=>{select.value='0';update();});
 }
 for(const study of root.querySelectorAll('[data-residual-sinkhorn]')){
  const get=s=>study.querySelector(s),range=get('[data-sinkhorn-step]'),next=get('[data-sinkhorn-next]'),reset=get('[data-sinkhorn-reset]');
  const update=()=>{const step=Math.max(0,Math.min(40,Number(range.value)));get('[data-residual-svg]').innerHTML=sinkhornDiagram(step);get('[data-sinkhorn-detail]').textContent=sinkhornDetail(step);get('[data-sinkhorn-count]').textContent=`${step} / 40`;next.disabled=step===40;reset.disabled=step===0;};
  range.addEventListener('input',update);next.addEventListener('click',()=>{range.value=String(Math.min(40,Number(range.value)+1));update();});reset.addEventListener('click',()=>{range.value='0';update();});
 }
 for(const study of root.querySelectorAll('[data-residual-coefficient]')){
  const select=study.querySelector('[data-coefficient-kind]');select.addEventListener('change',()=>{study.querySelector('[data-residual-svg]').innerHTML=coefficientDiagram(select.value);});
 }
}
