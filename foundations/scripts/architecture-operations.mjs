import katex from 'katex';
import {OPERATION_PANELS,OPERATION_KINDS} from '../public/architecture-operations-model.js';
import {architectureOperationView} from '../public/architecture-operations-view.js';
const formulas={
  embedding:String.raw`x_i=\sqrt{d}\,E[t_i]+PE_i`,
  feed:String.raw`F(x)=B_2\operatorname{ReLU}(B_1x+b_1)+b_2`,
  mask:String.raw`a_{ij}=\operatorname{softmax}_j(S_{ij}+M_{ij}),\quad h_i=\sum_j a_{ij}v_j`,
  cross:String.raw`s_j=q_{\rm decoder}^{\mathsf T}k_j/\sqrt{d_k},\quad h=\sum_j a_jv_j`,
  norm:String.raw`r=x+o,\qquad y=\gamma\odot\frac{r-\mu(r)\mathbf1}{\sqrt{\sigma^2(r)+\varepsilon}}+\beta`,
  output:String.raw`z=W_{\rm vocab}h+b,\qquad p=\operatorname{softmax}(z)`,
};
export function architectureOperations(prefix){
  return OPERATION_PANELS.map(({key,kind,title})=>{
    const spec=OPERATION_KINDS[kind],heading=title??spec.title;
    return `<section id="${prefix}-expand-${key}" class="attention-study operation-study" data-stage-expansion="${key}" data-stage-study="${kind}" data-expanded="false" aria-hidden="true" aria-labelledby="${prefix}-op-title-${key}" inert>
      <div class="attention-study-heading"><span id="${prefix}-op-title-${key}">${heading}</span><button type="button" data-stage-back>Back to architecture</button></div>
      <div class="operation-study-note">${kind==='mask'||kind==='cross'?'One attention head · ':''}Illustrative parameters · computed values</div>
      ${kind==='mask'?`<div class="operation-receivers" role="group" aria-label="Receiving decoder position">Receiving position ${[0,1,2].map(row=>`<button type="button" data-stage-row="${row}" aria-pressed="${row===1}">${row+1}</button>`).join('')}</div>`:''}
      <div class="operation-study-body" data-stage-analysis>${architectureOperationView(kind,0,1,false)}</div>
      <ol class="operation-stage-controls" aria-label="Calculation steps">${spec.labels.map((label,i)=>`<li><button type="button" data-stage-operation="${i}" aria-pressed="${i===0}">${label}</button></li>`).join('')}</ol>
      <div class="operation-playback"><button type="button" data-stage-play aria-pressed="false">Play calculation</button><button type="button" data-stage-next>Next</button><button type="button" data-stage-reset>Restart</button></div>
      <div class="operation-equation">${katex.renderToString(formulas[kind],{displayMode:true,throwOnError:true})}</div>
    </section>`;
  }).join('');
}
