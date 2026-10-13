import {sequenceAttention,HEAD_PROJECTIONS} from './context-model.js';

const f=v=>Number(v.toFixed(3)).toString();
const vec=v=>'('+v.map(f).join(', ')+')';
export const HEAD_FLOW_START=[0,1,26,36,38];
export const HEAD_FLOW_LAST=48;
export function attentionFrame(key='dog',positions=true,row=1,step=0){
  const result=sequenceAttention(key,positions);
  const stage=step<1?0:step<26?1:step<36?2:step<38?3:4;
  const candidate=stage===2?Math.floor((step-26)/2):stage===4&&step<HEAD_FLOW_LAST?Math.floor((step-38)/2):null;
  const projection=stage===1?{input:Math.floor((step-1)/5),operation:(step-1)%5}:null;
  if(projection){
    projection.coordinate=projection.operation<=2?0:1;
    projection.stored=projection.operation<2?0:projection.operation<4?1:2;
    projection.products=Object.fromEntries(Object.entries(HEAD_PROJECTIONS).map(([name,W])=>[name,W[projection.coordinate].map((w,r)=>w*result.X[projection.input][r])]));
  }
  const phase=stage===1?['load','multiply','store','multiply','store'][projection.operation]:
    stage===2?((step-26)%2?'scale':'dot'):stage===4&&step<HEAD_FLOW_LAST?((step-38)%2?'add':'weight'):['inputs',null,null,step===36?'exponentials':'normalize','complete'][stage];
  const products=candidate===null?null:result.Q[row].map((q,r)=>q*result.K[candidate][r]);
  const terms=result.V.map((v,j)=>v.map(x=>x*result.weights[row][j]));
  const included=stage!==4?0:step===HEAD_FLOW_LAST?5:candidate+(phase==='add'?1:0);
  const partial=[0,0].map((_,r)=>terms.slice(0,included).reduce((sum,v)=>sum+v[r],0));
  return {result,row,step,stage,candidate,phase,products,terms,partial,included,projection};
}
export function attentionArithmetic(frame){
  const {result:m,row:i,step,stage,candidate:j,phase,products,terms,partial,projection:p}=frame;
  if(stage===0)return `x${i+1} = e(${m.tokens[i]}) + p${i+1} = ${vec(m.embeddings[i])} + ${vec(m.positions[i])} = ${vec(m.X[i])}. Each row of X is one input, not a context vector yet.`;
  if(stage===1){
    const x=m.X[p.input],c=p.coordinate;
    if(phase==='load')return `Load x${p.input+1} for ${m.tokens[p.input]}: ${vec(x)}. Copy these same two input numbers to W_Q, W_K, and W_V. Process this row in all three branches before advancing to the next input row.`;
    const arithmetic=['Q','K','V'].map(name=>{
      const W=HEAD_PROJECTIONS[name],products=p.products[name],out=m[name][p.input][c];
      return phase==='multiply'?`${name} coordinate ${c+1}: (${f(x[0])} × ${f(W[c][0])}) + (${f(x[1])} × ${f(W[c][1])}) = (${f(products[0])}) + (${f(products[1])})`:
        `${name} coordinate ${c+1}: ${products.map(v=>`(${f(v)})`).join(' + ')} = ${f(out)}`;
    }).join('; ')+'.';
    return phase==='multiply'?`Slide the input numbers down to matrix row ${c+1}, retaining both original coordinates. ${arithmetic}`:
      `Add the products and store coordinate ${c+1} in row ${p.input+1} of each projected matrix. ${arithmetic}`;
  }
  if(stage===2&&phase==='dot')return `Compare query ${m.tokens[i]} ${i+1} with key ${m.tokens[j]} ${j+1}: ${m.Q[i].map((q,r)=>`(${f(q)} × ${f(m.K[j][r])})`).join(' + ')} = ${products.map(x=>`(${f(x)})`).join(' + ')} = ${f(products.reduce((a,b)=>a+b,0))}. Values do not enter this comparison.`;
  if(stage===2)return `Scale this dot product: s${i+1},${j+1} = ${f(products.reduce((a,b)=>a+b,0))} / √2 = ${f(m.scores[i][j])}. Store it in candidate ${j+1} of the score row.`;
  if(stage===3){
    const maximum=Math.max(...m.scores[i]),exps=m.scores[i].map(s=>Math.exp(s-maximum)),den=exps.reduce((a,b)=>a+b,0);
    if(phase==='exponentials')return `Subtract the largest score, ${f(maximum)}, then exponentiate: exp(s − max) = ${vec(exps)}. Their sum is D = ${f(den)}. Subtracting the common maximum leaves the softmax weights unchanged.`;
    return `Divide each positive amount by D = ${f(den)}: a${i+1} = ${vec(m.weights[i])}. These five shares sum to 1; they will multiply the five value vectors.`;
  }
  if(step===HEAD_FLOW_LAST)return `All five contributions have arrived. h${i+1} = ${vec(partial)}. Repeat this calculation for the other receiving positions to fill the remaining rows of H.`;
  const term=terms[j],v=m.V[j],a=m.weights[i][j];
  if(phase==='weight')return `Candidate ${m.tokens[j]} ${j+1} contributes a${i+1},${j+1}v${j+1} = ${f(a)} × ${vec(v)} = ${vec(term)}. Both value coordinates use the same weight.`;
  const before=partial.map((x,r)=>x-term[r]);
  return `Add candidate ${j+1}: ${vec(before)} + ${vec(term)} = ${vec(partial)}. This is the running total after ${j+1} of the five contributions.`;
}
const text=(x,y,value,cls='head-flow-number')=>`<text x="${x}" y="${y}" class="${cls}">${value}</text>`;
const reveal=animate=>animate?'<animate attributeName="opacity" values="0;0;1" keyTimes="0;0.92;1" dur="1.15s" fill="freeze"/>':'';
const committedText=(x,y,next,before,arriving,animate,role,cls='head-flow-number')=>`<g data-head-commit="${role}">${arriving&&animate?`<text class="${cls}" x="${x}" y="${y}" data-before-arrival>${before}<animate attributeName="opacity" values="1;1;0" keyTimes="0;0.92;1" dur="1.15s" fill="freeze"/></text>`:''}<text class="${cls}" x="${x}" y="${y}" data-after-arrival>${next}${arriving?reveal(animate):''}</text></g>`;
function rowsBox(x,y,w,title,rows,{ready=true,selected=null,complete=5,name=''}={}){
  return `<g class="head-flow-block" data-head-matrix="${name}" data-ready="${ready}"><rect x="${x}" y="${y}" width="${w}" height="190" rx="3"/>${text(x+12,y+24,title,'head-flow-label')}${rows.map((v,j)=>`<g data-current="${j===selected}"><rect class="head-flow-row" x="${x+7}" y="${y+35+j*29}" width="${w-14}" height="27" rx="2"/>${text(x+13,y+54+j*29,j+1,'head-flow-index')}${text(x+34,y+54+j*29,ready&&j<complete?v:'—')}</g>`).join('')}</g>`;
}
export function attentionFlow(frame,{animate=true}={}){
  const {result:m,row:i,step,stage,candidate:j,phase,partial,included,projection:p}=frame;
  const scoreCount=stage>2?5:stage===2?j+(phase==='scale'?1:0):0;
  const queryY=72+29*i,candidateY=277+29*(j??(stage>2?4:0)),valueY=482+29*(j??(stage>3?4:0));
  const packets=[];
  const path=(d,current=false,label=null,x=0,y=0,packet=null,role='')=>{
    if(current&&packet&&animate)packets.push(`<g class="head-flow-packet" data-head-packet="${role}"><rect x="${-Math.max(21,packet.length*3.3+6)}" y="-12" width="${Math.max(42,packet.length*6.6+12)}" height="24" rx="3"/><text text-anchor="middle" y="4">${packet}</text><animateMotion dur="1.15s" repeatCount="1" path="${d}"/><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.85;1" dur="1.15s" fill="freeze"/></g>`);
    return `<g data-head-route="${role}"><path d="${d}" class="head-flow-link" data-current="${current}"/>${label?text(x,y,label,'head-flow-edge-label'):''}</g>`;
  };
  const projections=['Q','K','V'].map((name,r)=>{
    const y=24+r*205,W=HEAD_PROJECTIONS[name];
    const outputRows=m[name].map((v,input)=>'('+v.map((value,c)=>{
      const stored=stage>1||(p&&(input<p.input||input===p.input&&c<p.stored));
      const arriving=p&&phase==='store'&&input===p.input&&c===p.coordinate;
      return `<tspan data-head-projection-cell="${name}-${input}-${c}" data-stored="${!!stored}">${stored?f(value):'—'}${arriving&&animate?'<animate attributeName="opacity" values="0;0;1" keyTimes="0;0.92;1" dur="1.15s" fill="freeze"/>':''}</tspan>`;
    }).join(', ')+')');
    const operands=p?m.X[p.input].map((v,c)=>{
      const cx=211+40*c,toY=y+(p.operation===0?46:p.coordinate===0?88:130);
      const fromX=p.operation===0?81+31*c:cx;
      const fromY=p.operation===0?268+29*p.input:y+(p.coordinate===0?46:88);
      return `<g class="head-flow-operand" data-input-coordinate="${c}" data-map="${name}" transform="translate(${cx} ${toY})"><rect x="-16" y="-11" width="32" height="22" rx="2"/><text y="4" text-anchor="middle">${f(v)}</text>${animate&&(phase==='load'||phase==='multiply')?`<animateTransform attributeName="transform" type="translate" from="${fromX} ${fromY}" to="${cx} ${toY}" dur="1.05s" fill="freeze"/>`:''}</g>`;
    }).join(''):'';
    const weights=W.map((a,k)=>a.map((v,c)=>`<g data-current="${!!p&&p.operation>0&&p.coordinate===k}"><rect class="head-flow-coefficient" x="${194+40*c}" y="${y+76+42*k}" width="34" height="40" rx="2"/><text class="head-flow-number" text-anchor="middle" x="${211+40*c}" y="${y+107+42*k}">${f(v)}</text></g>`).join('')).join('');
    const projected=m[name][p?.input??i],destination=(p?.coordinate??0)===0?351+f(projected[0]).length*3.5:344+(f(projected[0]).length+3)*7+f(projected[1]).length*3.5;
    return path(`M150 ${p?268+29*p.input:315} H172 V${y+46} H188`,!!p&&phase==='load')+
      `<g class="head-flow-map" data-head-map="${name}"><rect x="188" y="${y+8}" width="87" height="172" rx="3"/>${text(199,y+27,'W_'+name,'head-flow-label')}${weights}</g>`+
      path(`M275 ${y+88+42*(p?.coordinate??0)} H289 V${y+48+29*(p?.input??i)} H${destination}`,!!p&&phase==='store',null,0,0,p?f(m[name][p.input][p.coordinate]):null)+
      rowsBox(310,y,150,name+' = XW_'+name+'ᵀ',outputRows,{ready:stage>=1,selected:p?p.input:name==='Q'?i:j,name})+operands;
  }).join('');
  const inputCursor=p?`<g class="head-flow-input-cursor" transform="translate(0 ${255+29*p.input})"><rect x="27" y="0" width="116" height="27" rx="2"/>${animate&&phase==='load'&&p.input>0?`<animateTransform attributeName="transform" type="translate" from="0 ${255+29*(p.input-1)}" to="0 ${255+29*p.input}" dur="0.75s" fill="freeze"/>`:''}</g>`:'';
  const compared=stage===2?j:4,comparedProducts=m.Q[i].map((q,c)=>q*m.K[compared][c]);
  const dot=comparedProducts.reduce((a,b)=>a+b,0);
  const comparison=`<g class="head-flow-operation" data-head-operation="comparison" data-active="${stage===2}"><rect x="522" y="61" width="206" height="144" rx="3"/>
    ${stage>=2?committedText(535,86,`q${i+1} = ${vec(m.Q[i])}`,'Receiving query',stage===2&&phase==='dot',animate,'query-held'):text(535,86,'Receiving query')}
    ${stage>=2?committedText(535,109,`k${compared+1} = ${vec(m.K[compared])}`,'Candidate key',stage===2&&phase==='dot',animate,'key-loaded'):text(535,109,'Load one candidate key')}
    ${stage>=2?committedText(535,133,'Products: '+vec(comparedProducts),'Multiply coordinates',stage===2&&phase==='dot',animate,'coordinate-products'):text(535,133,'Multiply coordinates')}
    ${stage>=2?committedText(535,155,`${comparedProducts.map(v=>f(v)).join(' + ')} = ${f(dot)}`,'Add the products',stage===2&&phase==='dot',animate,'dot-product'):text(535,155,'Add the products')}
    ${text(535,185,stage>2||stage===2&&phase==='scale'?`${f(dot)} / √2 = ${f(m.scores[i][compared])}`:'Then divide by √2')}
  </g>`;
  const termIndex=stage===4&&j!==null?j:4;
  const multiplier=`<g class="head-flow-operation" data-head-operation="weight" data-active="${stage===4&&j!==null}"><rect x="510" y="462" width="140" height="166" rx="3"/>
    ${text(525,486,'Weight the value','head-flow-label')}
    ${stage===4?committedText(525,511,`a${i+1},${termIndex+1} = ${f(m.weights[i][termIndex])}`,'Weight',phase==='weight',animate,'weight-loaded'):text(525,511,'Weight: —')}
    ${text(525,535,'v'+(termIndex+1),'head-flow-index')}
    ${stage===4?committedText(525,551,vec(m.V[termIndex]),'—',phase==='weight',animate,'value-loaded'):text(525,551,'Value: —')}
    ${text(525,578,'a'+(i+1)+','+(termIndex+1)+' × v'+(termIndex+1),'head-flow-index')}
    ${stage===4?committedText(525,602,vec(frame.terms[termIndex]),'—',phase==='weight',animate,'weighted-term'):text(525,602,'Product: —')}
  </g>`;
  const scoreRows=m.scores[i].map((value,candidate)=>`<tspan data-head-score-cell="${candidate}" data-stored="${candidate<scoreCount}">${candidate<scoreCount?f(value):'—'}${stage===2&&phase==='scale'&&candidate===j?reveal(animate):''}</tspan>`);
  const before=phase==='add'?partial.map((v,c)=>v-frame.terms[j][c]):partial;
  return `<div class="head-flow-scroll" tabindex="0" role="region" aria-label="Complete attention calculation; scroll horizontally on a narrow screen"><svg class="head-flow" viewBox="0 0 1045 660" role="img" aria-label="Inputs split into queries, keys and values. Queries and keys form scores, then softmax weights. The weights multiply values, whose contributions sum to the output. Receiving position ${i+1}: ${m.tokens[i]}. Step ${step+1} of ${HEAD_FLOW_LAST+1}.">
    ${path(`M460 ${queryY} H478 V86 H535`,stage===2&&phase==='dot',null,0,0,vec(m.Q[i]),'query')}
    ${path(`M460 ${candidateY} H493 V109 H535`,stage===2&&phase==='dot',null,0,0,j===null?null:vec(m.K[j]),'key')}
    ${path(`M620 205 H716 V${candidateY} H566`,stage===2&&phase==='scale',null,0,0,j===null?null:f(m.scores[i][j]),'score')}
    ${path('M740 324 H775',stage===3)}
    ${path(`M460 ${valueY} H486 V551 H525`,stage===4&&phase==='weight',null,0,0,j===null?null:vec(m.V[j]),'value')}
    ${path(`M915 ${candidateY} H938 V441 H580 V511`,stage===4&&phase==='weight',null,0,0,j===null?null:f(m.weights[i][j]),'weight')}
    ${path('M650 602 H754 V565 H795',stage===4&&phase==='add',null,0,0,j===null?null:vec(frame.terms[j]),'term')}
    ${rowsBox(20,220,130,'X = e + p',m.X.map(vec),{selected:p?null:i,name:'X'})}${inputCursor}
    ${projections}
    <g class="head-flow-block" data-head-matrix="S" data-ready="${stage>=2}"><rect x="510" y="24" width="230" height="395" rx="3"/>${text(525,49,'s'+(i+1)+' · scores for '+m.tokens[i],'head-flow-label')}${comparison}${text(525,253,'Candidate / scaled score','head-flow-label')}${scoreRows.map((value,c)=>`<g data-current="${stage===2&&c===j}"><rect class="head-flow-row" x="517" y="${264+29*c}" width="216" height="27" rx="2"/>${text(525,283+29*c,c+1,'head-flow-index')}${text(555,283+29*c,stage>=2?value:'—')}</g>`).join('')}</g>
    ${rowsBox(775,229,140,'a'+(i+1)+' = softmax(s)',m.weights[i].map(f),{ready:stage>=3&&step>=37,selected:stage===4?j:null})}
    ${multiplier}
    <g class="head-flow-sum" data-ready="${stage===4}"><rect x="775" y="476" width="245" height="152" rx="3"/>${text(790,503,'Σ weighted values','head-flow-label')}
    ${committedText(790,533,stage===4?`${included} / 5 contributions added`:'Waiting for weights',`${included-1} / 5 contributions added`,phase==='add',animate,'sum-count','head-flow-index')}
    ${committedText(790,565,'running sum: '+(stage===4?vec(partial):'—'),'running sum: '+vec(before),phase==='add',animate,'sum')}
    ${text(790,601,'h'+(i+1)+' = '+(step===HEAD_FLOW_LAST?vec(m.H[i]):'—'),'head-flow-output')}</g>
    ${text(20,648,'Outlined cells: computed vectors. Blue cells: fixed projection coefficients. Numbers rounded to 3 decimals.','head-flow-index')}
    ${packets.join('')}
  </svg></div>`;
}
