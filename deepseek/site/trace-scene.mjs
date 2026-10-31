import {ease,cubicPoint} from './trace-motion.mjs';
// Numerical scenes use the same reveal order as Foundations: source cells,
// operation, arriving result. Future result cells contain no numerical text.
export const fmt=v=>Math.abs(v)<1e-10?'0':Number.isInteger(v)?String(v):v.toFixed(4).replace(/0+$/,'').replace(/\.$/,'');
export const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export const ref=(input,row,col)=>({input,row,col});
export const term=(value,expression,sources=[],weight=null)=>({value,expression,sources,weight});
export function scene(title,inputs,values,cells,options={}){
 return {title,inputs,output:{label:options.output??'Result',values},cells,note:options.note??'',operation:options.operation??title,parameters:options.parameters??null,lines:options.lines??[]};
}
export function linear(title,label,X,W,{left=false,output='Result',note='',map='Learned map'}={}){
 const values=left?W.map(w=>X[0].map((_,j)=>w.reduce((s,v,k)=>s+v*X[k][j],0))):X.map(x=>W[0].map((_,j)=>x.reduce((s,v,k)=>s+v*W[k][j],0)));
 const cells=values.flatMap((r,i)=>r.map((v,j)=>({row:i,col:j,result:v,terms:(left?W[i]:X[i]).map((_,k)=>{
  const a=left?X[k][j]:X[i][k],w=left?W[i][k]:W[k][j];
  return term(a*w,`${fmt(a)} × ${fmt(w)}`,[ref(0,left?k:i,left?j:k)],left?[i,k]:[k,j]);
 })})));
 return scene(title,[{label,values:X}],values,cells,{output,note,parameters:{label:map,values:W},operation:left?'Mix source rows':'Multiply by the map'});
}
export function unary(title,label,X,fn,{output='Result',operation=title,lines=[],note=''}={}){
 const values=X.map((r,i)=>r.map((v,j)=>fn(v,i,j)));
 return scene(title,[{label,values:X}],values,values.flatMap((r,i)=>r.map((v,j)=>({row:i,col:j,result:v,terms:[term(v,`${operation}: ${fmt(X[i][j])} → ${fmt(v)}`,[ref(0,i,j)])]}))),{output,operation,lines,note});
}
export function zip(title,aLabel,A,bLabel,B,fn,sign,{output='Result',note=''}={}){
 const values=A.map((r,i)=>r.map((v,j)=>fn(v,B[i][j])));
 return scene(title,[{label:aLabel,values:A},{label:bLabel,values:B,tone:'rust'}],values,values.flatMap((r,i)=>r.map((v,j)=>({row:i,col:j,result:v,terms:sign==='+'?[term(A[i][j],fmt(A[i][j]),[ref(0,i,j)]),term(B[i][j],fmt(B[i][j]),[ref(1,i,j)])]:[term(v,`${fmt(A[i][j])} ${sign} ${fmt(B[i][j])}`,[ref(0,i,j),ref(1,i,j)])]}))),{output,note,operation:sign==='+'?'Add matching coordinates':'Multiply matching coordinates'});
}
export function columnSum(title,label,X,{output='One pooled row',note=''}={}){
 const values=[X[0].map((_,j)=>X.reduce((s,r)=>s+r[j],0))];
 return scene(title,[{label,values:X}],values,values[0].map((v,j)=>({row:0,col:j,result:v,terms:X.map((r,i)=>term(r[j],fmt(r[j]),[ref(0,i,j)]))})),{output,note,operation:'Sum down each column'});
}
export function copyShape(title,label,X,values,indices,{output='Rearranged coordinates',note=''}={}){
 let n=0;return scene(title,[{label,values:X}],values,values.flatMap((r,i)=>r.map((v,j)=>({row:i,col:j,result:v,terms:[term(v,fmt(v),[ref(0,...indices[n++])])]}))),{output,note,operation:'Copy coordinates; preserve their values'});
}
export function definition(scenes){
 const steps=[];for(let s=0;s<scenes.length;s++){
  const start=steps.length;steps.push({scene:s,cell:-1,label:scenes[s].title,detail:scenes[s].note||'Begin with the source cells. The result will fill as each coordinate is calculated.'});
  scenes[s].cells.forEach((c,i)=>steps.push({scene:s,cell:i,label:`${scenes[s].title} · coordinate (${c.row}, ${c.col})`,detail:c.terms.map(t=>t.expression).join(' + ')+` = ${fmt(c.result)}.`,calculation:c}));
  scenes[s].start=start;
 }return {scenes,steps,height:Math.max(...scenes.map(sceneHeight))};
}
function sceneHeight(s){return traceLayout(s).height;}
const tx=(x,y,s,cls='')=>`<text x="${x}" y="${y}" class="${cls}">${esc(s)}</text>`;
export function grid(label,values,x,y,w,{present=()=>true,current=()=>false,tone='',id='',rowLabels=null,columnLabels=null}={}){
 const cols=values[0].length,gutter=rowLabels?65:0,header=columnLabels?20:0,cw=(w-20-gutter)/cols,points=[];
 const body=values.map((row,i)=>row.map((v,j)=>{
  const px=x+10+gutter+j*cw,py=y+32+header+i*36,ready=present(i,j);points.push({row:i,col:j,x:px+(cw-4)/2,y:py+16});
  return `<g data-present="${ready}"${id?` data-cell="${id}:${i}:${j}"`:''}><rect x="${px}" y="${py}" width="${cw-4}" height="32" class="trace-cell ${ready?'':'trace-empty'} ${current(i,j)?'trace-arrived':''}"/>${tx(px+(cw-4)/2,py+22,ready?fmt(v):'—','trace-number')}</g>`;
 }).join('')).join('');
 const axes=(columnLabels?columnLabels.map((v,j)=>tx(x+10+gutter+j*cw+(cw-4)/2,y+45,v,'trace-axis trace-column')).join(''):'')+(rowLabels?rowLabels.map((v,i)=>tx(x+10,y+54+header+i*36,v,'trace-axis')).join(''):'');
 const height=44+header+36*values.length;
 return {html:`<g class="trace-node ${tone} ${cols>3?'trace-dense':''}"><rect class="trace-panel" x="${x}" y="${y}" width="${w}" height="${height}" rx="4"/>${tx(x+12,y+21,label,'trace-label')}${axes}${body}</g>`,height,points};
}
const lerp=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
export function packet(value,a,b,t,tone='',controls=null){
 const progress=ease(t),[x,y]=controls?cubicPoint(a,controls[0],controls[1],b,progress):lerp(a,b,progress),s=fmt(value),w=Math.max(44,s.length*8+14);
 return `<g class="trace-packet ${tone}" transform="translate(${x.toFixed(2)} ${y.toFixed(2)})"><rect x="${-w/2}" y="-15" width="${w}" height="30" rx="3"/>${tx(0,5,s)}</g>`;
}
// The geometry follows Foundations' vector-flow view: visible source cells,
// the original weight matrix, individual contribution cells, an adder, output.
// In particular W is still d × m for a right-multiplied row; it is not transposed
// to make the drawing resemble a column-vector convention.
function lines(value,width=36){
 const words=String(value).split(/\s+/),out=[''];
 for(const word of words){const i=out.length-1;if(out[i]&&(out[i]+' '+word).length>width)out.push(word);else out[i]+=(out[i]?' ':'')+word;}
 return out;
}
function label(x,y,value,cls='trace-label',width=36){
 return `<text x="${x}" y="${y}" class="${cls}">${lines(value,width).map((s,i)=>`<tspan x="${x}" dy="${i?18:0}">${esc(s)}</tspan>`).join('')}</text>`;
}
function tableHeight(a){return 26+lines(a.label).length*18+(a.columnLabels?22:0)+a.values.length*40;}
export function traceLayout(s){
 const sources=s.inputs.map(a=>tableHeight(a)),sourceHeight=sources.reduce((a,b)=>a+b,0)+Math.max(0,sources.length-1)*32;
 const n=Math.max(1,...s.cells.map(c=>c.terms.length)),finish=s.cells.some(c=>c.finish);
 const content=Math.max(finish?350:290,sourceHeight,s.parameters?tableHeight(s.parameters):100,tableHeight(s.output),n*66+32);
 return {width:1280,height:content+260,content,top:100,sources,sourceHeight,terms:n};
}
function flowTable(a,x,y,w,{present=()=>true,current=()=>false,id='',tone='',weights=false,tones=()=>''}={}){
 const cols=a.values[0].length,gutter=a.rowLabels?64:0,cw=(w-gutter)/cols,titleLines=lines(a.label),header=titleLines.length*18+12+(a.columnLabels?22:0),top=y+header,points=[];
 let body=label(x,y+12,a.label,'trace-label');
 if(a.columnLabels)body+=a.columnLabels.map((v,j)=>tx(x+gutter+(j+.5)*cw,top-10,v,'trace-axis trace-column')).join('');
 body+=a.values.map((row,i)=>{
  let out=a.rowLabels?`<rect class="trace-axis-background" x="${x-2}" y="${top+i*40+7}" width="${gutter-4}" height="25"/>`+tx(x,top+i*40+25,a.rowLabels[i],'trace-axis'):'';
  return out+row.map((v,j)=>{
   const px=x+gutter+j*cw,py=top+i*40,ready=present(i,j),on=current(i,j),t=tones(i,j)||tone;
   points.push({row:i,col:j,x:px+(cw-3)/2,y:py+18.5});
   return `<g data-present="${ready}"${id?` data-cell="${id}:${i}:${j}"`:''} data-coordinate-tone="${t}"><rect x="${px}" y="${py}" width="${cw-3}" height="37" rx="3" class="trace-cell ${weights?'trace-weight':''} ${ready?'':'trace-empty'} ${on?'trace-arrived':''}"/>${tx(px+(cw-3)/2,py+25,ready?fmt(v):'—','trace-number')}</g>`;
  }).join('');
 }).join('');
 return {html:`<g class="trace-node ${tone}">${body}</g>`,height:tableHeight(a),points};
}
const toneFor=(t,i,s)=>s.inputs[t.sources[0]?.input]?.tone??(i%2?'rust':'');
export function renderTrace(def,index=0,phase=1,{motion=true}={}){
 if(def.render)return def.render(index,phase,{motion});
 const step=def.steps[Math.max(0,Math.min(def.steps.length-1,index))],s=def.scenes[step.scene],ci=step.cell,c=s.cells[ci],p=motion?Math.max(0,Math.min(1,phase)):1;
 const layout=traceLayout(s),height=def.height,content=height-260,{top}=layout,n=c?.terms.length??Math.max(1,...s.cells.map(c=>c.terms.length));
 const completed=p>=.65?n:Math.floor(p/.65*n+1e-8),arrival=p>=.96,sum=c?.terms.slice(0,completed).reduce((a,t)=>a+t.value,0)??0;
 const center=top+content/2,productTop=center-(n-1)*33,join=[925,center],productPoints=[],inputPoints=[];
 let body='',routes='',moving='',y=top+(content-layout.sourceHeight)/2;
 for(let i=0;i<s.inputs.length;i++){
  const a=s.inputs[i],g=flowTable(a,30,y,280,{id:`in${i}`,tone:a.tone??'',current:(r,j)=>!!c&&c.terms.some(t=>t.sources.some(q=>q.input===i&&q.row===r&&q.col===j)),tones:(r,j)=>{const k=c?.terms.findIndex(t=>t.sources.some(q=>q.input===i&&q.row===r&&q.col===j));return k>=0?toneFor(c.terms[k],k,s):'';}});
  body+=g.html;inputPoints.push(g.points);y+=g.height+32;
 }
 const out=flowTable(s.output,1000,top+(content-tableHeight(s.output))/2,250,{id:'out',present:(r,j)=>{const k=s.cells.findIndex(c=>c.row===r&&c.col===j);return k<ci||k===ci&&arrival;},current:(r,j)=>!!c&&c.row===r&&c.col===j&&arrival});body+=out.html;
 let parameterPoints=[];
 if(s.parameters){
  const a=s.parameters,g=flowTable(a,395,top+(content-tableHeight(a))/2,270,{id:'map',weights:true,current:(r,j)=>!!c&&c.terms.some(t=>t.weight?.[0]===r&&t.weight?.[1]===j),tones:(r,j)=>{const k=c?.terms.findIndex(t=>t.weight?.[0]===r&&t.weight?.[1]===j);return k>=0?toneFor(c.terms[k],k,s):'';}});body+=g.html;parameterPoints=g.points;
 }else{
  const operation=c?.finish?'Square each source coordinate':s.operation;
  const h=Math.max(64,lines(operation,31).length*18+24);
  body+=`<g class="trace-operation"><rect x="395" y="${center-h/2}" width="270" height="${h}" rx="4"/>${label(410,center-h/2+25,operation,'trace-label',31)}</g>`;
 }
 body+=tx(730,productTop-42,n>1?'Contributions':'Calculated value','trace-label');
 for(let i=0;i<n;i++){
  const point=[790,productTop+i*66],t=c?.terms[i],tone=t?toneFor(t,i,s):i%2?'rust':'';productPoints.push(point);
  body+=`<g class="trace-contribution ${tone}" data-term="${i}" data-ready="${!!c&&i<completed}"><rect x="730" y="${point[1]-19}" width="120" height="38" rx="3"/>${tx(790,point[1]+6,c&&i<completed?fmt(t.value):'—','trace-number')}<title>${esc(t?.expression??'Contribution '+(i+1))}</title></g>`;
 }
 const joinClass=n>1?'trace-adder':'trace-pass';
 body+=`<g class="${joinClass}"><circle cx="${join[0]}" cy="${join[1]}" r="22"/>${tx(join[0],join[1]+8,n>1?'+':'=','trace-add-symbol')}</g>`;
 const added=p>=.8?n:p<.65?0:Math.floor((p-.65)/.15*n+1e-8),running=c?.terms.slice(0,added).reduce((a,t)=>a+t.value,0)??0;
 body+=tx(880,center-42,n>1?'Add':'Pass on','trace-label')+`<text x="925" y="${center+54}" class="trace-running" text-anchor="middle"><title>Sum so far: ${fmt(running)}</title>${c?fmt(running):'—'}</text>`;
 const route=(a,b,{tone='',on=true,bend=35}={})=>{
  const controls=[[a[0]+bend,a[1]],[b[0]-bend,b[1]]];
  routes+=`<path class="trace-route ${tone} ${on?'trace-active':''}" d="M${a.join(' ')} C${controls[0].join(' ')} ${controls[1].join(' ')} ${b.join(' ')}"/>`;
  return controls;
 };
 if(c){
  for(let i=0;i<n;i++){
   const t=c.terms[i],tone=toneFor(t,i,s),local=p/.65*n-i,product=productPoints[i],map=t.weight&&parameterPoints.find(q=>q.row===t.weight[0]&&q.col===t.weight[1]),hub=map?[map.x,map.y]:[530,center];
   for(let j=0;j<t.sources.length;j++){
    const q=t.sources[j],a=inputPoints[q.input].find(v=>v.row===q.row&&v.col===q.col),source=[a.x,a.y],sourceTone=s.inputs[q.input].tone??(j%2?'rust':tone),controls=route(source,hub,{tone:sourceTone,on:local>=0,bend:65});
    if(motion&&local>=0&&local<.7)moving+=packet(s.inputs[q.input].values[q.row][q.col],source,hub,local/.7,sourceTone,controls);
   }
   const controls=route(hub,product,{tone,on:local>=.7,bend:34});
   if(motion&&local>=.7&&local<1)moving+=packet(t.value,hub,product,(local-.7)/.3,tone,controls);
   const addControls=route([850,product[1]],join,{tone,on:p>=.65,bend:28});
   const adding=(p-.65)/.15*n-i;
   if(motion&&adding>=0&&adding<1)moving+=packet(t.value,[850,product[1]],join,adding,tone,addControls);
  }
  let start=[947,center];
  if(c.finish){
   body+=`<g class="trace-finish"><rect x="858" y="${center+78}" width="132" height="70" rx="4"/>${label(868,center+102,c.finish,'trace-small',17)}</g>`;
   route([925,center+22],[925,center+78],{bend:0,on:p>=.8});start=[990,center+113];
  }
  const dest=out.points.find(v=>v.row===c.row&&v.col===c.col),controls=route(start,[dest.x,dest.y],{on:p>=.8,bend:23});
  if(motion&&p>=.8&&p<.96)moving+=packet(c.result,start,[dest.x,dest.y],(p-.8)/.16,'',controls);
 }
 const bottom=height-140,formula=c?c.terms.map((t,i)=>i<completed?t.expression:'…').join(' + ')+(p>=.8?' = '+fmt(c.finish?sum:c.result):''):s.operation;
 body+=label(30,bottom,c?`${s.output.label} · coordinate (${c.row}, ${c.col})`:s.title,'trace-label',120);
 body+=label(30,bottom+30,formula,'trace-formula',135);
 if(c?.finish&&p>=.8)body+=tx(30,bottom+55,c.finish,'trace-formula');
 const stage=!c?-1:p<.65?(p/.65*n%1<.7?0:1):p<.8?2:3;
 const captions=['Copy inputs',s.parameters?'Multiply':c?.finish?'Square':s.operation.startsWith('Copy')?'Copy coordinates':'Apply operation',n>1?'Add contributions':'Pass the value','Store output'];
 for(let i=0;i<4;i++){const x=30+i*307;body+=`<g class="trace-stage" data-current="${stage===i}"><rect x="${x}" y="${height-61}" width="292" height="35" rx="3"/>${tx(x+12,height-38,`${i+1}. ${captions[i]}`,'trace-stage-label')}</g>`;}
 const stageText=`${step.scene+1} / ${def.scenes.length} · ${s.title}`;
 return `<svg xmlns="http://www.w3.org/2000/svg" class="calculation-trace foundations-flow" viewBox="0 0 1280 ${height}" role="img" aria-label="${esc(stageText)}"><title>${esc(stageText)}</title><desc>The source coordinates pass through the displayed operation into individual contributions, then addition and the output. Unreached output cells are empty. The matrix keeps the row and column convention used in the text.</desc>${tx(30,30,stageText,'trace-title')}<g aria-hidden="true">${routes}</g>${body}<g data-trace-motion="" aria-hidden="true">${moving}</g></svg>`;
}
