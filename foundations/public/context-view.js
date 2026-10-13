import {PRESETS} from './sentence-model.js';
import {exampleEmbeddings,orderedVectors} from './representation-model.js';
import {weightedContext,MANUAL_CONTRIBUTIONS,sequenceAttention,HEAD_PROJECTIONS} from './context-model.js';
import {geometryStudy} from './geometry-view.js';
import {attentionFrame,attentionArithmetic,attentionFlow,HEAD_FLOW_START,HEAD_FLOW_LAST} from './head-flow.js';

export const format=v=>Number(v.toFixed(3)).toString();
const vector=values=>'('+values.map(format).join(', ')+')';
export function contextFan(tokens,values,weights,output,label){
  return `<svg class="context-fan" viewBox="0 0 680 270" role="img" aria-label="${label}: weighted contributions from five positions; output ${output?vector(output):'undefined because all contributions are zero'}.">
    ${tokens.map((token,j)=>{const x=74+133*j,w=weights?.[j]??0,path=`M${x} 78 C${x} 138 340 140 340 191`;return `<g>
      <path class="context-link" d="${path}" style="stroke-width:${1+7*w};opacity:${.12+.88*w}"/>
      ${w>0?`<circle class="context-signal" r="3" style="offset-path:path('${path}');animation-delay:${j*70}ms"/>`:''}
      <rect class="context-source" x="${x-52}" y="10" width="104" height="67" rx="3"/>
      <text class="context-token" x="${x}" y="34">${token}<tspan class="context-position" dy="-9"> ${j+1}</tspan></text>
      <text class="context-number" x="${x}" y="58">${vector(values[j])}</text>
      <text class="context-weight" x="${x}" y="101">${weights?format(w):'—'}</text>
    </g>`;}).join('')}
    <rect class="context-target" x="262" y="192" width="156" height="64" rx="3"/>
    <text class="context-label" x="340" y="214">${label}</text>
    <text class="context-result" x="340" y="240">${output?vector(output):'undefined'}</text>
  </svg>`;
}
export function mixerAnalysis(contributions=MANUAL_CONTRIBUTIONS){
  const tokens=PRESETS.dog,values=orderedVectors(tokens,exampleEmbeddings()),{weights,output}=weightedContext(values,contributions);
  return contextFan(tokens,values,weights,output,'Context for dog')+`<p class="context-verdict" data-context-verdict>${output?`c₂ = ${vector(output)}. The normalized contributions sum to 1.`:'Choose a positive contribution. An all-zero row cannot be normalized.'}</p>`;
}
export const HEAD_STAGES=['Inputs','Queries, keys, values','Scores','Softmax weights','Output'];
const table=(caption,rows,headers,selected=null)=>`<div class="context-table-scroll"><table class="context-table"><caption>${caption}</caption><thead><tr>${headers.map(label=>`<th scope="col">${label}</th>`).join('')}</tr></thead><tbody>${rows.map((row,i)=>`<tr data-current="${i===selected}">${row.map((v,j)=>j===0?`<th scope="row">${v}</th>`:`<td>${typeof v==='number'?format(v):v}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
export function headAnalysis(key='dog',withPositions=true,row=1,stage=0,step=HEAD_FLOW_START[stage],animate=true){
  const result=sequenceAttention(key,withPositions),{tokens,X,Q,K,V,scores,weights,H}=result;
  let content='';
  if(stage===0)content=table('X: token vectors plus position vectors',tokens.map((t,i)=>[i+1,t,...result.embeddings[i],...result.positions[i],...X[i]]),['i','Token','e₁','e₂','p₁','p₂','x₁','x₂'],row);
  if(stage===1)content=geometryStudy({mode:'qkv',prefix:'geometry-head',key,positions:withPositions,selected:row,embedded:true})+`<details class="context-parameters"><summary>Compare all projected rows</summary><div class="context-projection-tables">${['Q','K','V'].map(name=>table(name+' = projected inputs',result[name].map((v,i)=>[i+1,...v]),['i',name+'₁',name+'₂'],row)).join('')}</div></details>`;
  if(stage===2)content=table('S = QKᵀ / √2. Highlighted row belongs to the selected query.',scores.map((v,i)=>[`${tokens[i]} ${i+1}`,...v]),['Query / key',...tokens.map((t,i)=>t+' '+(i+1))],row);
  if(stage===3)content=`<div class="context-weight-bars">${weights[row].map((w,j)=>`<div><span>${tokens[j]} ${j+1}</span><span class="context-bar-track"><span style="width:${w*100}%"></span></span><strong>${format(w)}</strong></div>`).join('')}</div>`+table('One softmax row: exponentials after subtracting its largest score',scores[row].map((s,j)=>[tokens[j]+' '+(j+1),s,Math.exp(s-Math.max(...scores[row])),weights[row][j]]),['Key','Score','exp(s − max)','Weight']);
  if(stage===4)content=contextFan(tokens,V,weights[row],H[row],`h${row+1} for ${tokens[row]}`);
  const original=sequenceAttention('dog',withPositions),reversed=sequenceAttention('cat',withPositions);
  const dogOriginal=original.H[1],dogReversed=reversed.H[4];
  const comparison=`<div class="context-comparison"><span>Dog output in the original<br><strong>${vector(dogOriginal)}</strong></span><span>Dog output after reversal<br><strong>${vector(dogReversed)}</strong></span></div><p class="context-caption">${withPositions?'Position information permits different outputs for dog in these arrangements. These chosen parameters do not identify an agent.':'Without positions, the dog output is unchanged by this rearrangement; the matrix rows are reordered.'}</p>`;
  const equations=['xᵢ = e(tᵢ) + pᵢ','qᵢ = W_Q xᵢ; kᵢ = W_K xᵢ; vᵢ = W_V xᵢ','sᵢⱼ = qᵢᵀkⱼ / √2','aᵢⱼ = exp(sᵢⱼ) / Σℓ exp(sᵢℓ)','hᵢ = Σⱼ aᵢⱼ vⱼ'];
  const frame=attentionFrame(key,withPositions,row,step);
  return `<div class="context-stage-content">${attentionFlow(frame,{animate})}<div class="head-flow-arithmetic"><span class="aside-label">Step ${step+1} / ${HEAD_FLOW_LAST+1} · ${HEAD_STAGES[stage]}</span><p data-head-arithmetic>${attentionArithmetic(frame)}</p></div></div><details class="head-flow-inspector"><summary>${stage===1?'Inspect the projection multiplications':'Inspect '+HEAD_STAGES[stage].toLowerCase()}</summary><p class="context-equation">${equations[stage]}</p>${content}</details><p class="context-status" data-head-status role="status">${HEAD_STAGES[stage]} · receiving position ${row+1}: ${tokens[row]}. Its output is ${vector(H[row])}.</p>${comparison}`;
}
export function projectionTables(){
  return `<div class="context-projection-tables">${Object.entries(HEAD_PROJECTIONS).map(([name,m])=>table('W_'+name,m.map((row,i)=>[i+1,...row]),['Row','Column 1','Column 2'])).join('')}</div>`;
}
