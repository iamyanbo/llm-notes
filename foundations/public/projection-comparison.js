import {exampleEmbeddings} from './representation-model.js';

export const COMPARISON_STEPS=['Inputs','Linear combinations','Score'];
export const COMPARISON_DEFAULT={receiver:'dog',candidate:'chased',query:[0,1],key:[1,0]};
const words=['the','dog','chased','the','cat'];
const dot=(a,b)=>a.reduce((sum,x,i)=>sum+x*b[i],0);
const format=n=>Number(n.toFixed(2)).toString();
const pair=a=>'('+a.map(format).join(', ')+')';
export function compareProjection({receiver,candidate,query,key}=COMPARISON_DEFAULT){
  const embeddings=exampleEmbeddings(),input=embeddings[receiver],other=embeddings[candidate];
  const q=dot(query,input),k=dot(key,other);
  return {input,other,q,k,score:q*k,row:words.map(word=>q*dot(key,embeddings[word]))};
}
const combination=(weights,vector)=>weights.map((w,i)=>`(${format(w)} × ${format(vector[i])})`).join(' + ');
export function comparisonStep(state=COMPARISON_DEFAULT,stage=0){
  const result=compareProjection(state);
  const status=stage===0?`Receive at ${state.receiver}; compare with ${state.candidate}.`:
    stage===1?`Query ${format(result.q)}, key ${format(result.k)}. Each is one linear combination.`:
    `Score ${format(result.score)}: query ${format(result.q)} times key ${format(result.k)}.`;
  return `<div class="projection-path" data-comparison-stage="${stage}">
    <div class="projection-pair"><div class="projection-card"><span>Receiving input</span><strong>${state.receiver}</strong><b>xᵢ = ${pair(result.input)}</b></div>
    <div class="projection-card"><span>Candidate input</span><strong>${state.candidate}</strong><b>xⱼ = ${pair(result.other)}</b></div></div>
    ${stage>=1?`<div class="projection-connector" aria-hidden="true">↓</div><div class="projection-pair projection-reveal">
      <div class="projection-card"><span>Query · wQ = ${pair(state.query)}</span><code>${combination(state.query,result.input)}</code><b>qᵢ = ${format(result.q)}</b></div>
      <div class="projection-card"><span>Key · wK = ${pair(state.key)}</span><code>${combination(state.key,result.other)}</code><b>kⱼ = ${format(result.k)}</b></div></div>`:''}
    ${stage===2?`<div class="projection-connector" aria-hidden="true">↓</div><div class="projection-product projection-reveal"><span>Multiply the two scalars</span><strong>${format(result.q)} × ${format(result.k)} = ${format(result.score)}</strong></div>
      <div class="projection-row"><span>Same query, every candidate</span><div>${words.map((word,i)=>`<div><span>${word}</span><b>${format(result.row[i])}</b></div>`).join('')}</div></div>`:''}
  </div><p class="sum-status" data-comparison-status role="status">${status}</p>`;
}
export function projectionComparison(){
  const choices=selected=>['dog','chased','cat'].map(word=>`<option value="${word}"${word===selected?' selected':''}>${word}</option>`).join('');
  return `<section class="context-explorer projection-comparison" data-projection-comparison aria-labelledby="projection-comparison-title">
    <div class="experiment-heading"><span class="aside-label">Work through a comparison</span><span class="experiment-index">qᵢ kⱼ</span></div>
    <h3 id="projection-comparison-title">Two inputs, one score</h3>
    <p>Keep the coordinates from 2.2. Follow the two scalar combinations, then change a coefficient or reverse the receiving and contributing words.</p>
    <div class="projection-choices"><label>Receiving word <select data-comparison-receiver>${choices('dog')}</select></label>
      <label>Candidate word <select data-comparison-candidate>${choices('chased')}</select></label><button type="button" data-comparison-reverse>Reverse roles</button></div>
    <div class="projection-coefficients">${['query','key'].map(kind=>`<fieldset><legend>${kind==='query'?'Query coefficients · wQ':'Key coefficients · wK'}</legend>${COMPARISON_DEFAULT[kind].map((value,i)=>`<label>Coordinate ${i+1}<input type="range" min="-1" max="1" step="0.5" value="${value}" data-comparison-coefficient="${kind}" data-coordinate="${i}"><output>${value}</output></label>`).join('')}</fieldset>`).join('')}</div>
    <div class="context-stage-buttons" role="group" aria-label="Comparison step">${COMPARISON_STEPS.map((label,i)=>`<button type="button" data-comparison-step="${i}" aria-pressed="${i===0}">${label}</button>`).join('')}</div>
    <div data-comparison-analysis>${comparisonStep()}</div>
    <div class="embedding-controls"><button type="button" data-comparison-play aria-pressed="false">Play comparison</button><button type="button" data-comparison-next>Next step</button></div>
    <p class="sum-caption">These are raw scores, which may be negative. The next construction will turn a row of scores into weights.</p>
  </section>`;
}
export function createProjectionComparison(element,{preference,schedule=setTimeout,cancel=clearTimeout}={}){
  if(!element)return;
  let state={...COMPARISON_DEFAULT,query:[...COMPARISON_DEFAULT.query],key:[...COMPARISON_DEFAULT.key]},stage=0,timer=null;
  const play=element.querySelector('[data-comparison-play]');
  const receiver=element.querySelector('[data-comparison-receiver]'),candidate=element.querySelector('[data-comparison-candidate]');
  const pause=()=>{if(timer!==null)cancel(timer);timer=null;play.textContent='Play comparison';play.setAttribute('aria-pressed','false');};
  const render=()=>{
    element.querySelector('[data-comparison-analysis]').innerHTML=comparisonStep(state,stage);
    for(const button of element.querySelectorAll('[data-comparison-step]'))button.setAttribute('aria-pressed',String(Number(button.dataset.comparisonStep)===stage));
  };
  const advance=()=>{stage++;render();if(stage===2){pause();return;}timer=schedule(advance,1800);};
  for(const button of element.querySelectorAll('[data-comparison-step]'))button.addEventListener('click',()=>{pause();stage=Number(button.dataset.comparisonStep);render();});
  element.querySelector('[data-comparison-next]').addEventListener('click',()=>{pause();stage=(stage+1)%3;render();});
  for(const [control,property] of [[receiver,'receiver'],[candidate,'candidate']])control.addEventListener('change',()=>{pause();state[property]=control.value;render();});
  for(const input of element.querySelectorAll('[data-comparison-coefficient]'))input.addEventListener('input',()=>{
    pause();state[input.dataset.comparisonCoefficient][Number(input.dataset.coordinate)]=Number(input.value);
    input.nextElementSibling.textContent=input.value;render();
  });
  element.querySelector('[data-comparison-reverse]').addEventListener('click',()=>{
    pause();[state.receiver,state.candidate]=[state.candidate,state.receiver];
    for(const [control,word] of [[receiver,state.receiver],[candidate,state.candidate]])for(const option of control.options)option.selected=option.value===word;
    render();
  });
  play.addEventListener('click',()=>{
    if(timer!==null){pause();return;}
    if(preference?.matches){stage=2;render();return;}
    stage=0;render();play.textContent='Pause comparison';play.setAttribute('aria-pressed','true');timer=schedule(advance,1800);
  });
  preference?.addEventListener?.('change',()=>{if(preference.matches)pause();});
  element.ownerDocument.addEventListener('visibilitychange',()=>{if(element.ownerDocument.hidden)pause();});
  return {pause};
}
