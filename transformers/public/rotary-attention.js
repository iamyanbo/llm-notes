import {rotate,radians} from './rope-model.js';
import {dot,softmax} from './models.js';
export const HEAD_KEYS=[[1,0],[0,1],[1,1]],HEAD_VALUES=[[0,0],[2,0],[0,2]],HEAD_QUERY=[1,0];
const names=['the','dog','chased'],f=x=>Math.abs(x)<.0005?'0':Number(x.toFixed(3)).toString(),tuple=v=>'('+v.map(f).join(', ')+')';
export function rotaryAttention({shift=0,gap=1,degrees=30}={}){
 const positions=[shift,shift+1,shift+1+gap],receiver=positions[2],omega=radians(degrees),query=rotate(HEAD_QUERY,receiver*omega);
 const keys=HEAD_KEYS.map((k,j)=>rotate(k,positions[j]*omega));
 const evaluate=(q,K)=>{
  const dots=K.map(k=>dot(q,k)),scores=dots.map(s=>s/Math.sqrt(2)),weights=softmax(scores);
  const products=HEAD_VALUES.map((v,j)=>v.map(x=>x*weights[j])),output=[0,1].map(c=>products.reduce((s,v)=>s+v[c],0));
  return {q,K,dots,scores,weights,products,output};
 };
 return {positions,receiver,omega,raw:evaluate(HEAD_QUERY,HEAD_KEYS),rotated:evaluate(query,keys)};
}
export function rotaryAttentionView(options,step){
 const d=rotaryAttention(options);
 return `<div class="ext-two-columns"><div class="ext-value"><span>Receiving query before rotation</span><b data-rot-original-query>${tuple(HEAD_QUERY)}</b></div><div class="ext-value"><span>R(iω)q · i = ${d.receiver} · angle ${f(d.receiver*d.omega*180/Math.PI)}°</span><b data-rot-query>${tuple(d.rotated.q)}</b></div></div>${['raw','rotated'].map(mode=>{const m=d[mode];return `<section class="rotary-result" data-rot-mode="${mode}"><b class="diagram-label">${mode==='raw'?'Without RoPE':'With RoPE'}</b><div class="ext-table-scroll"><table class="ext-table"><caption>Same three candidate values · head width dₖ = 2</caption><thead><tr><th>Candidate</th><th>Key used in comparison</th><th>Dot product / √2</th><th>Weight</th><th>Value</th><th>Weighted value</th></tr></thead><tbody>${m.K.map((k,j)=>`<tr><th>${names[j]}<small>position ${d.positions[j]}</small></th><td data-rot-key="${j}">${tuple(k)}${mode==='rotated'?`<small>R(${d.positions[j]}ω) · ${tuple(HEAD_KEYS[j])}</small>`:''}</td><td data-rot-score="${j}">${f(m.dots[j])} / √2 = ${f(m.scores[j])}</td><td data-rot-weight="${j}">${f(m.weights[j])}</td><td>${tuple(HEAD_VALUES[j])}</td><td data-rot-product="${j}">${tuple(m.products[j])}</td></tr>`).join('')}</tbody></table></div><div class="ext-metric-row">${m.output.map((x,c)=>`<div class="ext-value"><span>Output coordinate ${c+1} · sum of weighted values</span><b data-rot-output="${c}">${f(x)}</b></div>`).join('')}</div></section>`;}).join('')}<p class="lab-caption">${['Queries, keys, and values are fixed toy head vectors. Their position labels can be changed independently of that content.','Position rotates each query/key before their comparison. Values stay fixed.','Scaled scores pass through softmax together, so changing one score can change every weight.','Each weight multiplies its corresponding value, and the products enter the output once per coordinate.'][step]}</p><p class="lab-note">The two calculations use the same candidate set and values. Move all positions together to test shared-shift invariance; increase the receiver–dog separation to change relative positions. Empty intervening positions are unspecified, not additional candidate tokens. This is a single-head example, not a trained model predicting a word.</p>`;
}
export function rotaryAttentionTransfers(step,o){
 const d=rotaryAttention(o),specs=[],inMode=(mode,selector)=>`[data-rot-mode="${mode}"] ${selector}`;
 const send=(from,to,value,delay=0,tone='blue')=>specs.push({from,to,value,delay,tone});
 if(step===1){
  send('[data-rot-original-query]','[data-rot-query]',tuple(d.rotated.q));
  HEAD_KEYS.forEach((k,j)=>send(inMode('raw',`[data-rot-key="${j}"]`),inMode('rotated',`[data-rot-key="${j}"]`),tuple(d.rotated.K[j]),j*.12));
 }
 if(step===2)for(const mode of ['raw','rotated'])d[mode].weights.forEach((a,j)=>send(inMode(mode,`[data-rot-score="${j}"]`),inMode(mode,`[data-rot-weight="${j}"]`),f(a),j*.12));
 if(step===3)for(const mode of ['raw','rotated'])d[mode].products.forEach((p,j)=>{
  send(inMode(mode,`[data-rot-weight="${j}"]`),inMode(mode,`[data-rot-product="${j}"]`),`${f(d[mode].weights[j])} × ${tuple(HEAD_VALUES[j])}`,j*.06,'rust');
  p.forEach((x,c)=>send(inMode(mode,`[data-rot-product="${j}"]`),inMode(mode,`[data-rot-output="${c}"]`),f(x),.85+j*.06+c*.04,'rust'));
 });
 return specs;
}
