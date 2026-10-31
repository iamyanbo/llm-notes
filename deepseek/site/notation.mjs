// The initial diagram and the interactive view share these values and renderer.
export const sequences=[[[1,2,3],[4,5,6],[2,0,1]],[[3,1,0],[0,2,4],[1,1,1]]];
export const projection=[[1,0],[0,1],[1,-1]];
export function notationState(batch=0,row=0){
 if(!Number.isInteger(batch)||batch<0||batch>=sequences.length||!Number.isInteger(row)||row<0||row>=3)throw new RangeError('Unknown sequence or token row');
 const input=sequences[batch],output=input.map(v=>projection[0].map((_,j)=>v.reduce((sum,x,i)=>sum+x*projection[i][j],0)));
 return {batch,row,input,output,weights:projection,shape:{batch:2,tokens:3,input:3,output:2}};
}
function matrix(name,rows,selected,kind){
 return `<div class="shape-matrix"><p class="matrix-name">${name}</p><table><caption>${kind}</caption><thead><tr><th scope="col">${selected===null?'input feature':'token'}</th>${rows[0].map((_,j)=>`<th scope="col">${j}</th>`).join('')}</tr></thead><tbody>${rows.map((r,i)=>`<tr${selected===i?' data-selected="true"':''}><th scope="row">${i}${selected===i?' ←':''}</th>${r.map(x=>`<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
export function notationOutput(batch=0,row=0){
 const s=notationState(batch,row),v=s.input[row];
 return `<p class="shape-dimensions"><strong>B = 2</strong> sequences · <strong>T = 3</strong> token rows · <strong>d = 3</strong> input features · <strong>c = 2</strong> output features</p><div class="shape-equation" tabindex="0" role="region" aria-label="Input matrix, projection and output; scroll horizontally on narrow screens">${matrix(`H[${batch}] · 3 × 3`,s.input,row,'Token rows; input-feature columns')}<span class="shape-operation" aria-label="multiplied by">×</span>${matrix('W · 3 × 2',projection,null,'Input-feature rows; output-feature columns')}<span class="shape-operation" aria-label="equals">=</span>${matrix(`Y[${batch}] · 3 × 2`,s.output,row,'Same token rows; output-feature columns')}</div><div class="shape-products" aria-live="polite"><p>Sequence ${batch}, token row ${row}: <strong>(${v.join(', ')}) → (${s.output[row].join(', ')})</strong></p>${s.output[row].map((answer,j)=>`<p>Output feature ${j}: <span>${v.map((x,i)=>`${x} × (${projection[i][j]})`).join(' + ')} = <strong>${answer}</strong></span></p>`).join('')}</div><p class="shape-note">The highlighted input row supplies the highlighted output row. W is shared by every row in both sequences; rows are not mixed by this projection.</p>`;
}
export function notationFigure(){
 return `<figure class="notation-study" data-notation><figcaption>A projection changes features, keeping token rows in place.<span>Hand-chosen values</span></figcaption><div class="shape-controls"><label>Sequence in the batch<select data-shape-batch><option value="0">Sequence 0</option><option value="1">Sequence 1</option></select></label><label>Token row to follow<select data-shape-row><option value="0">Row 0</option><option value="1">Row 1</option><option value="2">Row 2</option></select></label></div><div data-notation-output>${notationOutput()}</div></figure>`;
}
