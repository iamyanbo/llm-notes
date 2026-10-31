import {scene,linear,unary,zip,columnSum,copyShape,definition,ref,term,fmt} from './trace-scene.mjs';
import {continuationDefinition,continuationTitles} from './continuation-scenes.mjs';
import {residualWalkthrough,poolingWalkthrough,queryWalkthrough,indexerWalkthrough,attentionWalkthrough,rotaryWalkthrough,groupedWalkthrough,readoutWalkthrough,mtpWalkthrough,muonWalkthrough} from './week-models.mjs';
const row=v=>[v];
function normScene(title,label,v,rms){
 const mean=v.reduce((s,x)=>s+x*x,0)/v.length;
 return scene(title,[{label,values:row(v)}],[[rms]],[{row:0,col:0,result:rms,terms:v.map((x,j)=>term(x*x,`${fmt(x)}²`,[ref(0,0,j)])),finish:`√(${fmt(mean*v.length)}/${v.length}) = ${fmt(rms)}`}],{operation:'Square → mean → square root',output:'RMS divisor',note:'Unit gains; epsilon omitted for the hand calculation, as in the text.'});
}
export function weekFlowDefinition(kind){
 if(kind in continuationTitles)return continuationDefinition(kind);
 let s;
 if(['pooling','pool-content','pool-scores'].includes(kind)){
  const m=poolingWalkthrough(),totals=m.amounts[0].map((_,j)=>m.amounts.reduce((sum,r)=>sum+r[j],0));
  const projections=[linear('Form candidate content','Attention inputs H',m.H,m.WC,{map:'W_C · candidate projection',output:'Candidates C · before pooling'}),
   linear('Form pooling scores','Same attention inputs H',m.H,m.WZ,{map:'W_Z · score projection · P = 0',output:'Scores Z'}),
  ];
  s=kind==='pool-content'?[projections[0]]:kind==='pool-scores'?[projections[1]]:[unary('Exponentiate the scores','Pooling scores Z',m.scores,Math.exp,{operation:'exp(score)',output:'Positive amounts'}),
   columnSum('Find each column total','Positive amounts',m.amounts,{output:'One total per coordinate'}),
   unary('Normalize down each column','Positive amounts',m.amounts,(v,i,j)=>v/totals[j],{operation:'Divide by that column’s total',lines:[`Column totals: ${totals.map(fmt).join(', ')}`],output:'Shares S'}),
   zip('Weight candidate coordinates','Candidate values C',m.values,'Source shares S',m.weights,(a,b)=>a*b,'×',{output:'Source contributions'}),
   columnSum('Add the source contributions','Weighted coordinates',m.products,{output:'Pooled vector',note:'The first coordinate and second coordinate use different source mixtures.'})];
 }else if(['query','query-latent','main-queries'].includes(kind)){
  const m=queryWalkthrough();
  s=[linear('Form the query latent','Input x',m.x,m.Wa,{map:'W_Qa · chosen identity map',output:'Raw latent'}),
   normScene('Find the latent RMS','Raw latent',row(m.raw)[0],m.rms),
   unary('Normalize the latent','Raw latent',row(m.raw),v=>v/m.rms,{operation:`÷ ${fmt(m.rms)}`,output:'Normalized latent z'}),
   linear('Expand the latent into query coordinates','Normalized latent z',row(m.latent),m.Wb,{map:'W_Qb · four output columns',output:'Four query coordinates'}),
   copyShape('Separate the two heads','Four coordinates',row(m.expanded),m.heads,[[0,0],[0,1],[0,2],[0,3]],{output:'Two head rows',note:'Reshaping copies the coordinates into two rows without changing their values.'})];
  for(let i=0;i<2;i++){
   const rms=Math.sqrt(m.heads[i].reduce((a,v)=>a+v*v,0)/2);
   s.push(normScene(`Find head ${i}'s RMS`,`Head ${i}`,m.heads[i],rms),unary(`Normalize main head ${i}`,`Head ${i}`,row(m.heads[i]),v=>v/rms,{operation:`÷ head RMS ${fmt(rms)}`,output:`Main query ${i}`}));
  }
  if(kind==='query-latent')s=s.slice(0,3);
  if(kind==='main-queries')s=s.slice(3);
 }else if(['indexer-inputs','indexer-queries','indexer-weights'].includes(kind)){
  const m=indexerWalkthrough();
  s=[linear('Expand the shared latent for the indexer','Same latent z',row(m.z),m.WI,{map:'W_I · chosen indexer map',output:'Four indexer coordinates'}),
   copyShape('Arrange the indexer heads','Four indexer coordinates',row(m.expanded),m.queries,[[0,0],[0,1],[0,2],[0,3]],{output:'Two indexer query heads'}),
   linear('Predict head mixing weights','Same attention input x',m.x,m.Ww,{map:'W_w · chosen head-weight map',output:'Raw head weights'}),
   unary('Apply the fixed head scale','Raw head weights',row(m.rawHeadWeights),v=>v/m.headScale,{operation:'Divide by √(2 × 2) = 2',output:'Scaled head weights',note:'These weights and the two queries supply the next score calculation.'})];
  s.at(-1).cells.forEach((c,j)=>{c.terms[0].expression=`${fmt(m.rawHeadWeights[j])} ÷ 2`;});
  if(kind==='indexer-queries')s=s.slice(0,2);
  if(kind==='indexer-weights')s=s.slice(2);
 }else if(['indexer','indexer-matches','indexer-scores','indexer-selection'].includes(kind)){
  const m=indexerWalkthrough(),queryColumns=m.queries[0].map((_,j)=>m.queries.map(q=>q[j]));
  s=[linear('Compare each key with both indexer queries','Compressed indexer keys',m.keys,queryColumns,{map:'Columns: q₀ = (1, 0), q₁ = (0, 1)',output:'One dot product per head / entry'}),
   unary('Remove negative head matches','Head comparisons',m.dots,v=>Math.max(0,v),{operation:'ReLU(s) = max(0, s)',output:'Positive matches'}),
   linear('Combine the head scores','Positive matches',m.positive,m.headWeights.map(v=>[v]),{map:'Head weights (1, ½)',output:'One score per entry'}),
   scene('Keep the two best completed addresses',[{label:'Entry scores · rows 0…4',values:m.scores.map(v=>[v])},{label:'Completed at query 15? 1=yes',values:m.valid.map(v=>[Number(v)]),tone:'rust'}],[m.selected],m.selected.map((id,j)=>({row:0,col:j,result:id,terms:[term(id,`Score ${fmt(m.scores[id])} → address ${id}`,[ref(0,id,0),ref(1,id,0)])]})),{operation:'Check completion → compare scores',output:'Selected addresses',lines:['Entry 4 ends at position 19.','Its score 99 is unavailable at query 15.'],note:'Completion is checked before selection. Among completed entries, scores 4 and 3 win.'})];
  if(kind==='indexer-matches')s=s.slice(0,2);
  if(kind==='indexer-scores')s=s.slice(2,3);
  if(kind==='indexer-selection')s=s.slice(3);
 }else if(kind==='attention'||kind==='attention-base'){
  const sink=kind==='attention',m=attentionWalkthrough(sink),scaledQ=m.query.map(v=>[v/Math.SQRT2]),amounts=sink?m.amounts.concat(m.sinkAmount):m.amounts,allValues=sink?m.entries.concat([[0,0]]):m.entries,weights=amounts.map(v=>v/m.denominator),products=allValues.map((r,i)=>r.map(v=>v*weights[i]));
  s=[linear('Compare the two real entries','Shared key/value vectors',m.entries,scaledQ,{map:'Query divided by √2',output:'Real-entry logits'}),
   unary(sink?'Include the sink and exponentiate':'Exponentiate the two comparisons',sink?'Logits · local, global, sink':'Logits · local, global',(sink?m.logits.concat(Math.log(4)):m.logits).map(v=>[v]),Math.exp,{operation:'exp(logit)',output:sink?'Amounts · local, global, sink':'Amounts · local, global',note:sink?'The sink logit log 4 is chosen here; its value is (0, 0).':'Both entries compete in the same denominator.'}),
   columnSum('Build one denominator','Amounts',amounts.map(v=>[v]),{output:'Combined denominator'}),
   unary(sink?'Normalize all three amounts':'Normalize both amounts','Amounts',amounts.map(v=>[v]),v=>v/m.denominator,{operation:`÷ ${m.denominator}`,output:'Attention weights'}),
   scene('Transmit each stored value',[{label:sink?'Values · sink is last':'Values · local, global',values:allValues},{label:sink?'Weights · local, global, sink':'Weights · local, global',values:weights.map(v=>[v]),tone:'rust'}],products,products.flatMap((r,i)=>r.map((v,j)=>({row:i,col:j,result:v,terms:[term(v,`${fmt(weights[i])} × ${fmt(allValues[i][j])}`,[ref(1,i,0),ref(0,i,j)])]}))),{operation:'Weight every value coordinate',output:'Weighted contributions'}),
   columnSum('Add the transmitted coordinates','Weighted contributions',products,{output:'Main-head output',note:sink?'The sink contributed to the denominator and transmitted zero. The second coordinate is 4.':'Without a sink the output is (3 log 3 / 4, 8).'})];
 }else if(kind==='rotation'||kind==='rotation-comparison'){
  const a=rotaryWalkthrough(),b=rotaryWalkthrough(1),rot=angle=>[[Math.cos(angle),-Math.sin(angle)],[Math.sin(angle),Math.cos(angle)]];
  s=[linear('Place the original source at position 0','Content pair',[[1],[0]],rot(0),{left:true,map:'R(0°)',output:'Stored source pair'}),
   linear('Place the original query at position 1','Query content pair',[[1],[0]],rot(Math.PI/2),{left:true,map:'R(90°)',output:'Query pair'}),
   linear('Compare the original pair','Source at 0',row(a.key),a.q.map(v=>[v]),{map:'Query at 1',output:'Dot product'}),
   linear('Shift the source to position 1','Same source content',[[1],[0]],rot(Math.PI/2),{left:true,map:'R(90°)',output:'Shifted stored source'}),
   linear('Shift the query to position 2','Same query content',[[1],[0]],rot(Math.PI),{left:true,map:'R(180°)',output:'Shifted query'}),
   linear('Compare after the common shift','Source at 1',row(b.key),b.q.map(v=>[v]),{map:'Query at 2',output:'Shifted dot product'}),
   linear('Undo the original query rotation','Original transmitted value',a.key.map(v=>[v]),rot(-Math.PI/2),{left:true,map:'R(−90°)',output:'Relative-frame value'}),
   linear('Undo the shifted query rotation','Shifted transmitted value',b.key.map(v=>[v]),rot(-Math.PI),{left:true,map:'R(−180°)',output:'Same relative-frame value',note:'Both cases return (0, −1). In the model this inverse rotation acts on the weighted sum’s rotary coordinates.'})];
  s=kind==='rotation-comparison'?s.slice(0,6):s.slice(6);
 }else if(kind==='grouped'){
  const m=groupedWalkthrough();s=m.heads.map((h,i)=>linear(`Reduce head group ${i}`,`Group ${i} coordinates`,row(h),m.maps[i],{map:`P_${i} · group map`,output:`Group ${i} summary`}));
  s.push(copyShape('Join the group summaries','One result from each group',m.intermediate.map(v=>[v]),row(m.intermediate),[[0,0],[1,0]],{output:'Joined intermediate row'}),linear('Return to model width','Joined group summaries',row(m.intermediate),m.WO,{map:'W_O · mix across groups',output:'Model-width output'}));
 }else if(kind==='readout'){
  const m=readoutWalkthrough(),amounts=m.logits.map(Math.exp),total=amounts.reduce((s,v)=>s+v,0);
  s=[unary('Generate the four readout gains','Chosen predictor biases',row(m.bias),v=>1/(1+Math.exp(-v)),{operation:'sigmoid(bias)',output:'Readout gains a',note:'The toy predictor has a zero dynamic matrix; these explicit biases determine its gains. Epsilon offsets are omitted.'}),linear('Reduce the final residual streams','Four final streams',m.X,[m.a],{left:true,map:'Computed readout gains a',output:'One mixed row'}),normScene('Find the readout RMS','Mixed row',m.mixed,m.rms),
   unary('Normalize the readout row','Mixed row',row(m.mixed),v=>v/m.rms,{operation:`÷ RMS ${fmt(m.rms)}`,output:'Normalized row'}),
   linear('Score the vocabulary IDs','Normalized row',row(m.normalized),m.WU,{map:'W_U · one column per ID',output:'Three vocabulary logits'}),
   unary('Exponentiate the vocabulary logits','Logits',row(m.logits),Math.exp,{operation:'exp(logit)',output:'Positive amounts'}),
   columnSum('Sum vocabulary amounts','One amount per vocabulary ID',amounts.map(v=>[v]),{output:'Softmax denominator'}),
   unary('Form the next-ID distribution','Positive amounts',row(amounts),v=>v/total,{operation:`÷ ${fmt(total)}`,output:'Probabilities over IDs 0, 1, 2'})];
 }else if(kind==='mtp-fusion'){
  const m=mtpWalkthrough();
  s=[unary('Normalize each hidden stream','Supplied final streams X',m.X,(v,i)=>v/m.divisors[i],{operation:'÷ that stream’s RMS',output:'Normalized hidden streams',lines:['Divisors: '+m.divisors.map(fmt).join(', ')]}),
   normScene('Find the next embedding RMS','Supplied next-token embedding',m.embedding,m.embeddingRMS),
   unary('Normalize the next-token embedding','Embedding',row(m.embedding),v=>v/m.embeddingRMS,{operation:'÷ embedding RMS',output:'Normalized embedding'}),
   linear('Project the hidden streams','Normalized hidden streams',m.hiddenNormalized,m.WH,{map:'W_H · chosen identity',output:'Projected hidden streams'}),
   linear('Project the next embedding','Normalized embedding',row(m.embeddingNormalized),m.WE,{map:'W_E · chosen identity',output:'Projected embedding'}),
   copyShape('Supply the embedding to every stream','Projected embedding',row(m.projected),m.repeated,Array.from({length:4},()=>[[0,0],[0,1]]).flat(),{output:'Four copies of one embedding'}),
   zip('Add the embedding contribution','Projected hidden streams',m.hidden,'Repeated embedding',m.repeated,(a,b)=>a+b,'+',{output:'Fused MTP streams',note:'The extra block receives four streams; this example stops at its input.'})];
  s[0].cells.forEach(c=>{c.terms[0].expression=`${fmt(m.X[c.row][c.col])} ÷ ${fmt(m.divisors[c.row])}`;});
  s[2].cells.forEach(c=>{c.terms[0].expression=`${fmt(m.embedding[c.col])} ÷ ${fmt(m.embeddingRMS)}`;});
 }else if(kind==='muon-input'){
  const m=muonWalkthrough();
  s=[unary('Retain the previous momentum','Previous buffer diagonal',row(m.previous),v=>v*m.momentum,{operation:'× 0.95',output:'Decayed old buffer'}),
   zip('Accumulate the current gradient','Decayed old buffer',row(m.previous.map(v=>v*m.momentum)),'Raw gradient',row(m.rawGradient),(a,b)=>a+b,'+',{output:'Current buffer M'}),
   unary('Scale the current buffer','Current buffer M',row(m.buffer),v=>v*m.momentum,{operation:'× 0.95',output:'Scaled current buffer'}),
   zip('Form the direction supplied to Muon','Scaled current buffer',row(m.buffer.map(v=>v*m.momentum)),'Same raw gradient',row(m.rawGradient),(a,b)=>a+b,'+',{output:'Accumulated direction P'})];
 }else if(['muon','muon-gains','muon-step'].includes(kind)){
  const m=muonWalkthrough();
  s=[scene('Find the matrix norm',[{label:'Diagonal gains of P',values:row(m.gradient)}],[[m.norm]],[{row:0,col:0,result:m.norm,terms:m.gradient.map((v,j)=>term(v*v,`${fmt(v)}²`,[ref(0,0,j)])),finish:`√17 = ${fmt(m.norm)}`}],{operation:'Frobenius norm',output:'Divisor'}),
   unary('Put the gains in the working range','Diagonal gains',row(m.gradient),v=>v/m.norm,{operation:`÷ √17 = ${fmt(m.norm)}`,output:'Initial normalized gains'})];
  for(let k=1;k<=10;k++){
   const [a,b,c]=k<=8?[3.4445,-4.775,2.0315]:[2,-1.5,.5],before=m.steps[k-1];
   s.push(scene(`Polynomial iteration ${k}`,[{label:'Previous diagonal gains',values:row(before)}],row(m.steps[k]),before.map((v,j)=>({row:0,col:j,result:m.steps[k][j],terms:[term(a*v,`${a} × ${fmt(v)}`,[ref(0,0,j)]),term(b*v**3,`${b} × ${fmt(v)}³`,[ref(0,0,j)]),term(c*v**5,`${c} × ${fmt(v)}⁵`,[ref(0,0,j)])]})),{operation:'p(s) = as + bs³ + cs⁵',output:`Gains after iteration ${k}`,lines:[`a=${a}, b=${b}, c=${c}`]}));
  }
  s.push(unary('Apply the matrix-shape scale','Final polynomial gains',row(m.steps[10]),v=>v*m.scale,{operation:`× 0.18√2 = ${fmt(m.scale)}`,output:'Update direction D'}),
   unary('Shrink the current parameter','Initial parameter diagonal',row(m.W),v=>(1-m.eta*m.decay)*v,{operation:'× (1 − ηλ) = 0.999',output:'Decayed parameter'}),
   scene('Take the parameter step',[{label:'Decayed parameter',values:row(m.W.map(v=>(1-m.eta*m.decay)*v))},{label:'Update direction D',values:row(m.direction),tone:'rust'}],row(m.updated),m.updated.map((v,j)=>({row:0,col:j,result:v,terms:[term(.999*m.W[j],fmt(.999*m.W[j]),[ref(0,0,j)]),term(-m.eta*m.direction[j],`−0.01 × ${fmt(m.direction[j])}`,[ref(1,0,j)])]})),{operation:'Subtract 0.01D from the decayed parameter',output:'Updated parameter diagonal'}));
  if(kind==='muon-gains')s=s.slice(0,12);
  if(kind==='muon-step')s=s.slice(12);
 }else if(kind==='residual'){
  const m=residualWalkthrough();
  s=[linear('Read one narrow input','Four stream rows',m.X,m.A,{left:true,map:'A · input coefficients',output:'AX'}),linear('Carry the four streams','Old stream rows',m.X,m.B,{left:true,map:'B · bypass coefficients',output:'BX'}),linear('Distribute the supplied update','Chosen update (2, −1)',m.update,m.C,{left:true,map:'C · output coefficients',output:'CF(AX)'}),zip('Add both paths','Carried state',m.transport,'Update contributions',m.injection,(a,b)=>a+b,'+',{output:'New retained streams'})];
 }else throw new RangeError('Unknown weekly trace: '+kind);
 if(['pooling','pool-content','pool-scores'].includes(kind))for(const stage of s){
  for(const input of stage.inputs){input.rowLabels=['token 0','token 1'];input.columnLabels=input.label.includes('inputs H')?['feature 0','feature 1']:['coord 0','coord 1'];}
  if(stage.parameters){stage.parameters.rowLabels=['feature 0','feature 1'];stage.parameters.columnLabels=['coord 0','coord 1'];}
  stage.output.columnLabels=['coord 0','coord 1'];
  if(stage.output.values.length===2)stage.output.rowLabels=['token 0','token 1'];
 }
 if(kind==='mtp-fusion')for(const stage of s){
  for(const input of stage.inputs)if(input.values.length===4){input.rowLabels=['stream 0','stream 1','stream 2','stream 3'];input.columnLabels=['feature 0','feature 1'];}
  if(stage.output.values.length===4){stage.output.rowLabels=['stream 0','stream 1','stream 2','stream 3'];stage.output.columnLabels=['feature 0','feature 1'];}
 }
 if(['indexer','indexer-matches','indexer-scores','indexer-selection'].includes(kind))for(const stage of s){
  for(const input of stage.inputs)if(input.values.length===5)input.rowLabels=['entry 0','entry 1','entry 2','entry 3','entry 4'];
  if(stage.output.values.length===5)stage.output.rowLabels=['entry 0','entry 1','entry 2','entry 3','entry 4'];
 }
 if(kind==='readout')s[1].inputs[0].rowLabels=['stream 0','stream 1','stream 2','stream 3'];
 if(kind==='indexer-queries'){
  s.at(-1).output.rowLabels=['head 0','head 1'];
  s.at(-1).output.columnLabels=['coord 0','coord 1'];
 }
 if(kind==='indexer-weights'){
  s[0].inputs[0].columnLabels=['feature 0','feature 1'];
  s[0].parameters.rowLabels=['feature 0','feature 1'];
  s[0].parameters.columnLabels=['head 0','head 1'];
  s[1].inputs[0].columnLabels=['head 0','head 1'];
  for(const stage of s)stage.output.columnLabels=['head 0','head 1'];
 }
 if(kind==='indexer-matches')for(const stage of s){
  if(stage.inputs[0].label==='Head comparisons')stage.inputs[0].columnLabels=['head 0','head 1'];
  stage.output.columnLabels=['head 0','head 1'];
 }
 if(kind==='indexer-scores')s[0].inputs[0].columnLabels=['head 0','head 1'];
 const def=definition(s);
 // Leave room for the four-row group map and all four arithmetic terms.
 if(kind==='grouped')def.height=Math.max(def.height,560);
 return def;
}
