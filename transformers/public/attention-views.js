import {windowExample,linearExample,WINDOW_TOKENS,WINDOW_SCORES,WINDOW_VALUES,LINEAR_KEYS,LINEAR_VALUES} from './attention-models.js';
const f=x=>Number(x.toFixed(3)).toString();
const tuple=v=>'('+v.map(f).join(', ')+')';
const matrix=(rows,label,id,tone='blue')=>`<div class="ext-matrix" data-att="${id}" data-tone="${tone}"><b>${label}</b><div style="--columns:${rows[0].length}">${rows.flat().map((x,i)=>`<span data-entry="${i}">${f(x)}</span>`).join('')}</div></div>`;
const column=v=>v.map(x=>[x]);
export function attentionView(kind,o,step){
 if(kind==='window'){
  const d=windowExample(o),visible=d.reach[d.L];
  return `<div class="att-mask-layout"><div class="att-scroll"><div class="att-mask" style="--att-n:8" role="table" aria-label="Allowed query-key pairs; rows are queries, columns are keys"><span></span>${WINDOW_TOKENS.map((t,j)=>`<span class="att-axis">${j+1}<br>${t}</span>`).join('')}${d.mask.map((row,i)=>`<span class="att-axis" data-selected="${i===d.i}">${i+1} · ${WINDOW_TOKENS[i]}</span>${row.map((allowed,j)=>`<span role="cell" class="att-cell" data-allowed="${allowed}" data-row="${i}" data-col="${j}" data-selected="${i===d.i}" aria-label="Query ${i+1}, key ${j+1}: ${allowed?'allowed':'excluded'}">${allowed?'●':'×'}</span>`).join('')}`).join('')}</div></div><div class="att-summary"><div class="ext-value"><span>Permitted pairs · one layer, all 8 rows</span><b>${d.edges} / 36</b></div><div class="ext-value"><span>Receiving query · position</span><b data-att-query>${d.i+1} · ${WINDOW_TOKENS[d.i]}</b></div><p>● allowed · × excluded<br>Blue row: receiving query. Future positions stay excluded in every mode.</p></div></div><div class="ext-table-scroll"><table class="ext-table att-weights"><caption>One receiving row · hand-chosen, already scaled scores</caption><thead><tr><th>Key / value position</th><th>Score</th><th>Weight</th><th>Value</th><th>Weight × value</th></tr></thead><tbody>${WINDOW_TOKENS.map((t,j)=>`<tr data-att-candidate="${j}" data-current="${d.J.includes(j)}"><th>${j+1} · ${t}</th><td data-att-score="${j}">${d.J.includes(j)?f(WINDOW_SCORES[j]):'−∞ (masked)'}</td><td><span data-att-weight="${j}">${f(d.weights[j])}</span><span class="att-weight-track"><span style="width:${d.weights[j]*100}%"></span></span></td><td data-att-value="${j}">${tuple(WINDOW_VALUES[j])}</td><td data-att-product="${j}">${tuple(d.products[j])}</td></tr>`).join('')}</tbody></table></div><div class="ext-metric-row">${[0,1].map(c=>`<div class="ext-value"><span>Output coordinate ${c+1} · sum of products</span><b data-att-output="${c}">${f(d.output[c])}</b></div>`).join('')}</div><div class="att-reach"><b>Possible input influence through ${d.L} layer${d.L===1?'':'s'}</b><div>${WINDOW_TOKENS.map((t,j)=>`<span data-reached="${visible.includes(j)}">${j+1} · ${t}<small>${visible.includes(j)?'permitted path':'no path'}</small></span>`).join('')}</div><p>This shows connectivity across layers, not another weighted output. The calculation above is for one layer with fixed toy scores and values.</p></div>`;
 }
 const d=linearExample(o);
 return `<div class="ext-table-scroll"><table class="ext-table"><caption>Nonnegative feature columns and values · the highlighted row is newly added</caption><thead><tr><th>Position</th><th>Key feature φ(k)</th><th>Value v</th><th>Query similarity</th><th>Normalized weight</th></tr></thead><tbody>${LINEAR_KEYS.slice(0,d.n).map((k,j)=>`<tr data-current="${j===d.n-1}"><th>${j+1}</th><td>${tuple(k)}</td><td>${tuple(LINEAR_VALUES[j])}</td><td>${f(d.similarities[j])}</td><td>${f(d.weights[j])}</td></tr>`).join('')}</tbody></table></div><div class="ext-two-columns">${matrix(column(d.k),'New key feature · 2 × 1','key')}${matrix([d.v],'New transposed value · 1 × 2','value','rust')}</div><div class="att-state-grid">${matrix(d.previous,'Previous state S · 2 × 2','previous')}<div class="att-plus">+</div><div>${matrix(d.outer,'Outer product φ(k)vᵀ · 2 × 2','outer','rust')}<p class="att-products">${d.k.flatMap((k,a)=>d.v.map((v,b)=>`<span data-att-multiply="${a*2+b}">${f(k)} × ${f(v)} = ${f(k*v)}</span>`)).join('')}</p></div><div class="att-plus">=</div>${matrix(d.S,'Updated state S · 2 × 2','state')}</div><div class="ext-two-columns">${matrix(column(d.q),'Query feature φ(q) · 2 × 1','query')}<div>${matrix(column(d.z),'Feature sum z · 2 × 1','z')}<p>${tuple(d.previousZ)} + ${tuple(d.k)} = ${tuple(d.z)}</p></div></div><div class="att-readout">${[0,1].map(c=>`<div class="ext-value"><span>Numerator coordinate ${c+1} · query reads column ${c+1} of S</span><p data-att-numerator="${c}">${d.S.map((row,a)=>`${f(d.q[a])} × ${f(row[c])}`).join(' + ')} = <b>${f(d.numerator[c])}</b></p></div>`).join('')}<div class="ext-value"><span>Denominator · query reads z</span><p data-att-denominator>${d.z.map((x,a)=>`${f(d.q[a])} × ${f(x)}`).join(' + ')} = <b>${f(d.denominator)}</b></p></div></div><div class="ext-metric-row"><div class="ext-value"><span>State readout · numerator / denominator</span><b data-att-result>${d.output?`(${d.output.map((x,c)=>`<span data-att-final="${c}">${f(x)}</span>`).join(', ')})`:'Undefined: zero denominator'}</b></div><div class="ext-value"><span>Direct kernel-weighted sum · same inputs</span><b>${d.output?tuple(d.direct):'Undefined: zero denominator'}</b></div></div><p class="lab-caption">${['Select the newly arriving key and value.','Multiply each key-feature entry by each value coordinate.','Add the outer product to S and the key feature to z.','Read the two columns and normalizer with the query, then divide.'][step]} Retained state: 6 entries (four in S, two in z), independent of prefix length. The table retains the inputs only so we can verify the calculation.</p>`;
}
export function attentionTransfers(kind,step,o){
 const specs=[],send=(from,to,value,delay=0,tone='blue')=>specs.push({from,to,value,delay,tone});
 if(kind==='window'){
  const d=windowExample(o);
  if(step===1)d.J.forEach((j,a)=>send('[data-att-query]',`[data-att-score="${j}"]`,`s = ${f(WINDOW_SCORES[j])}`,a*.12));
  if(step===2)d.J.forEach((j,a)=>send(`[data-att-score="${j}"]`,`[data-att-weight="${j}"]`,`a = ${f(d.weights[j])}`,a*.12));
  if(step===3)d.J.forEach((j,a)=>{
   send(`[data-att-weight="${j}"]`,`[data-att-product="${j}"]`,`${f(d.weights[j])} ${String.fromCharCode(215)} ${tuple(WINDOW_VALUES[j])}`,a*.04);
   [0,1].forEach(c=>send(`[data-att-product="${j}"]`,`[data-att-output="${c}"]`,f(d.products[j][c]),.85+a*.04+c*.06,'rust'));
  });
 }else{
  const d=linearExample(o),at=(id,i)=>`[data-att="${id}"] [data-entry="${i}"]`;
  if(step===1)for(let a=0;a<2;a++)for(let b=0;b<2;b++){
   send(at('key',a),`[data-att-multiply="${a*2+b}"]`,f(d.k[a]),(a*2+b)*.06);
   send(at('value',b),`[data-att-multiply="${a*2+b}"]`,f(d.v[b]),.3+(a*2+b)*.06,'rust');
   send(`[data-att-multiply="${a*2+b}"]`,at('outer',a*2+b),`${f(d.k[a])} × ${f(d.v[b])} = ${f(d.outer[a][b])}`,1.1+(a*2+b)*.08,'rust');
  }
  if(step===2)for(let a=0;a<2;a++){
   send(at('key',a),at('z',a),`+ ${f(d.k[a])}`,a*.18);
   for(let b=0;b<2;b++)send(at('outer',a*2+b),at('state',a*2+b),`+ ${f(d.outer[a][b])}`,.85+(a*2+b)*.08,'rust');
  }
  if(step===3){
   for(let a=0;a<2;a++){
    for(let b=0;b<2;b++)send(at('state',a*2+b),`[data-att-numerator="${b}"]`,`${f(d.q[a])} × ${f(d.S[a][b])}`,(a*2+b)*.15,'rust');
    send(at('z',a),'[data-att-denominator]',`${f(d.q[a])} × ${f(d.z[a])}`,a*.15);
   }
   if(d.output){
    for(let c=0;c<2;c++)send(`[data-att-numerator="${c}"]`,`[data-att-final="${c}"]`,`${f(d.numerator[c])} / ${f(d.denominator)} = ${f(d.output[c])}`,1.15+c*.1,'rust');
   }
   // The normalizer is displayed next to both numerators; each quotient arrives once.
  }
 }
 return specs;
}
