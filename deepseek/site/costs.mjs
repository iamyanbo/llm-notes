// Chosen dimensions illustrate baseline costs, not checkpoint sizes or timings.
export const costCases = [
  {kind:'capacity', title:'More parameters in the feed-forward layer', before:4, after:8},
  {kind:'state', title:'More features in each carried row', before:4, after:8},
  {kind:'history', title:'More past tokens for a new query', before:4, after:8},
];
export function costCount(kind,n){
  if(kind==='capacity')return 2*n+n*2;
  if(kind==='state')return n*n;
  if(kind==='history')return n;
  throw new RangeError('Unknown cost example');
}
const text=(x,y,label,cls='')=>`<text x="${x}" y="${y}" text-anchor="middle" class="${cls}">${label}</text>`;
const arrow=(x,y,end)=>`<path class="cost-wire" d="M${x} ${y} H${end} m-5 -4 l5 4 -5 4"/>`;
function grid(x,y,rows,cols,cell=9){
  return Array.from({length:rows},(_,r)=>Array.from({length:cols},(_,c)=>`<rect class="cost-cell" x="${x+c*cell}" y="${y+r*cell}" width="${cell-2}" height="${cell-2}" rx="1"/>`).join('')).join('');
}
export function costDiagram(kind,n){
  let body,label;
  if(kind==='capacity'){
    label=`Hidden width ${n}: a 2 by ${n} matrix and a ${n} by 2 matrix contain ${costCount(kind,n)} weights in total.`;
    body=text(150,26,`Hidden width ${n}`)+text(32,73,'2 in')+text(150,73,`${n} hidden`)+text(268,73,'2 out')
      +grid(23,89,1,2)+grid(150-n*9/2,89,1,n)+grid(259,89,1,2)+arrow(50,93,104)+arrow(196,93,247)
      +text(85,132,`2 × ${n} weights`,'cost-small')+text(215,132,`${n} × 2 weights`,'cost-small')
      +text(150,173,`${costCount(kind,n)} weights used per token`,'cost-result');
  }else if(kind==='state'){
    label=`A row with ${n} features enters an illustrative ${n} by ${n} linear map, containing ${costCount(kind,n)} weights.`;
    body=text(150,26,`${n} features per token`)+grid(23,75,1,n,7)+arrow(86,77,110)+grid(120,48,n,n,8)+arrow(192,77,220)+grid(226,75,1,n,7)
      +text(150,135,`${n} × ${n} linear map`,'cost-small')+text(150,173,`${costCount(kind,n)} weights in this map`,'cost-result');
  }else if(kind==='history'){
    label=`One new query compares with ${n} past-token entries: ${n} retained entries and ${n} query-key comparisons.`;
    body=text(150,26,`${n} past-token entries`)+Array.from({length:n},(_,i)=>{
      const x=150-(n-1)*30/2+i*30;
      return `<path class="cost-wire" d="M150 121 L${x} 64"/><rect class="cost-cell" x="${x-11}" y="43" width="22" height="22" rx="2"/>`;
    }).join('')+`<rect class="cost-query" x="100" y="114" width="100" height="28" rx="3"/>`+text(150,133,'New query','cost-small')+text(150,173,`${n} comparisons for this query`,'cost-result');
  }else throw new RangeError('Unknown cost example');
  return `<svg viewBox="0 0 300 192" role="img" aria-label="${label}"><title>${label}</title>${body}</svg>`;
}
export function costsFigure(){
  const notes={
    capacity:'Keep the input and output at two features. Doubling the hidden width doubles the weights and multiply-adds in the two matrix products. This simplified example omits biases; it is not the three-matrix expert we derive next.',
    state:'Double a row’s width from four to eight. Even a single square linear map now has four times as many weights. This is an example of widening an ordinary row, before introducing multiple residual streams.',
    history:'Keep the head width fixed and double the history. There are twice as many token entries to retain and twice as many query–key comparisons for one new query. Each entry here stands for that token’s cached key and value.',
  };
  return `<figure class="cost-study"><figcaption>Three ways a larger transformer asks for more work<span>Small chosen dimensions · baseline calculations, not model measurements</span></figcaption>${costCases.map(c=>`<div class="cost-case"><p class="cost-title">${c.title}</p><div class="cost-comparison">${[c.before,c.after].map((n,i)=>`<div><p class="cost-side">${i?'After doubling':'Start here'}</p>${costDiagram(c.kind,n)}</div>`).join('')}</div><p class="cost-note">${notes[c.kind]}</p></div>`).join('')}</figure>`;
}
