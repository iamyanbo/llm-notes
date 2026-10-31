import {ease,roundedPolylinePoint} from './trace-motion.mjs';
import {hcWiringExample} from './residual-model.mjs';
import {scene,definition,ref,term,fmt,esc,grid,packet} from './trace-scene.mjs';
const row=v=>[v];
const text=(x,y,s,cls='')=>`<text x="${x}" y="${y}" class="${cls}">${esc(s)}</text>`;
export function hcOverviewTraceDefinition(){
 const m=hcWiringExample(2),parts=[];
 const make=(title,inputs,values,cells,nodes,target,note)=>{const s=scene(title,inputs,values,cells,{note});s.inputNodes=nodes;s.target=target;parts.push(s);};
 make('Combine half of each current row',[{label:'Stream 0',values:row(m.X[0])},{label:'Stream 1',values:row(m.X[1])}],row(m.input),m.input.map((v,j)=>({row:0,col:j,result:v,terms:m.X.map((r,i)=>term(.5*r[j],`½ × ${fmt(r[j])}`,[ref(i,0,j)]))})),['x0','x1'],'mixed','The expert receives one row with two features. The two original rows remain on their outer paths.');
 make('Evaluate the Day 1 expert once',[{label:'Mixed input',values:row(m.input)}],row(m.update),m.update.map((v,j)=>({row:0,col:j,result:v,terms:[term(v,`F(0.5, 1.5), coordinate ${j}`,[ref(0,0,0),ref(0,0,1)])]})),['mixed'],'update','This is the same known expert function from Day 1, evaluated on the mixed row.');
 for(let i=0;i<2;i++)make(i===0?'Take half of the new output':'Take the full new output',[{label:'Expert output',values:row(m.update)}],row(m.injection[i]),m.injection[i].map((v,j)=>({row:0,col:j,result:v,terms:[term(v,`${i===0?'½':'1'} × ${fmt(m.update[j])}`,[ref(0,0,j)])]})),['update'],'injection'+i,'The output is computed once, then sent in separately chosen amounts to the two destinations.');
 for(let i=0;i<2;i++)make(`Carry original stream ${i}`,[{label:'Original row',values:row(m.X[i])}],row(m.X[i]),m.X[i].map((v,j)=>({row:0,col:j,result:v,terms:[term(v,`Copy ${fmt(v)}`,[ref(0,0,j)])]})),['x'+i],'carry'+i,'Follow the blue outer path. This original row bypasses the expert.');
 for(let i=0;i<2;i++)make(`Finish retained stream ${i}`,[{label:'Carried row',values:row(m.X[i])},{label:'Output contribution',values:row(m.injection[i])}],row(m.result[i]),m.result[i].map((v,j)=>({row:0,col:j,result:v,terms:[term(m.X[i][j],fmt(m.X[i][j]),[ref(0,0,j)]),term(m.injection[i][j],fmt(m.injection[i][j]),[ref(1,0,j)])]})),['carry'+i,'injection'+i],'result'+i,'Add matching coordinates. Both resulting rows remain available to a following sublayer.');
 const def=definition(parts);def.render=(index,phase,options)=>renderOverview(def,m,index,phase,options);return def;
}
function renderOverview(def,m,index,phase,{motion=true}={}){
 const st=def.steps[Math.max(0,Math.min(def.steps.length-1,index))],s=def.scenes[st.scene],cell=s.cells[st.cell],p=motion?phase:1,arrived=p>=.96;
 const positions={x0:[60,55],x1:[750,55],mixed:[405,185],update:[405,400],injection0:[155,540],injection1:[655,540],carry0:[40,400],carry1:[770,400],result0:[155,735],result1:[655,735]};
 const nodes=[['x0','Stream 0',m.X[0],-1],['x1','Stream 1',m.X[1],-1],['mixed','Combine half of each row',m.input,0],['update','Computed expert output',m.update,1],['injection0','Half of the new output',m.injection[0],2],['injection1','Full new output',m.injection[1],3],['carry0','Carry the original row',m.X[0],4],['carry1','Carry the original row',m.X[1],5],['result0','Stream 0 continues',m.result[0],6],['result1','Stream 1 continues',m.result[1],7]];
 let body='',moving='';const points={};
 for(const [id,label,v,at] of nodes){const [x,y]=positions[id],g=grid(label,row(v),x,y,270,{present:(i,j)=>at<st.scene||(at===st.scene&&(j<st.cell||(j===st.cell&&arrived))),current:(i,j)=>at===st.scene&&j===st.cell&&arrived,tone:id.startsWith('injection')?'rust':'',id:id.startsWith('result')?'out':id});body+=g.html;points[id]=g.points;}
 const route=(d,tone='')=>`<path class="trace-route trace-active ${tone}" d="${d}"/>`;
 const paths=route('M195 135 V160 H540 V185')+route('M885 135 V160 H540')+route('M540 265 V302')+route('M540 362 V400')
  +route('M540 480 V510 H290 V540','rust')+route('M540 510 H790 V540','rust')
  +route('M60 95 H45 Q25 95 25 115 V420 Q25 440 40 440')+route('M1020 95 H1035 Q1055 95 1055 115 V420 Q1055 440 1040 440')
  +route('M175 480 V678 H290')+route('M905 480 V678 H790')
  +route('M290 620 V658','rust')+route('M790 620 V658','rust')+route('M290 698 V735')+route('M790 698 V735');
 body+=`<g class="trace-operation"><rect x="405" y="302" width="270" height="60" rx="4"/>${text(422,327,'F · the Day 1 expert','trace-label')}${text(422,348,'One evaluation on the mixed row','trace-small')}</g>`;
 for(const x of [290,790])body+=`<circle cx="${x}" cy="678" r="20" class="trace-join"/>${text(x-7,685,'+','trace-title')}`;
 if(cell){
  const n=cell.terms.length,done=p>=.65?n:Math.floor(p/.65*n+1e-8),target=points[s.target][cell.col],hub=s.target.startsWith('carry')?[target.x,target.y]:s.target==='update'?[540,335]:s.target.startsWith('result')?[s.target==='result0'?290:790,678]:[positions[s.target][0]+135,positions[s.target][1]-20];
  for(let i=0;i<n;i++){const t=cell.terms[i],local=p/.65*n-i;
   for(const r of t.sources){const a=points[s.inputNodes[r.input]][r.col];let routePoints=[[a.x,a.y],hub];
    if(s.target.startsWith('carry')){const side=s.target==='carry0'?25:1055;routePoints=[[a.x,a.y],[side,a.y],[side,target.y],hub];}
    if(motion&&local>=0&&local<.7){const pos=roundedPolylinePoint(routePoints,ease(local/.7));moving+=packet(s.inputs[r.input].values[r.row][r.col],pos,pos,0,s.target.startsWith('injection')?'rust':'');}
    if(motion&&r===t.sources[0]&&local>=.7&&local<1){moving+=packet(t.value,hub,hub,0);}
   }
  }
  if(motion&&p>=.65&&p<.96)moving+=packet(cell.result,hub,[target.x,target.y],(p-.65)/.31,s.target.startsWith('injection')?'rust':'');
  body+=text(60,860,`${s.title} · coordinate ${cell.col}`,'trace-label')+text(60,887,cell.terms.map((t,i)=>i<done?t.expression:'…').join(' + ')+(done===n?' = '+fmt(cell.result):''),'trace-arithmetic')+text(60,914,done===n?`Result: ${fmt(cell.result)}`:'Follow the contributions before adding the result.','trace-small');
 }else body+=text(60,872,s.title,'trace-label')+text(60,900,'Next traces the first coordinate of this operation.','trace-small');
 return `<svg xmlns="http://www.w3.org/2000/svg" class="calculation-trace" viewBox="0 0 1080 950" role="img" aria-label="One expert call with two original rows carried around it"><title>One expert call, two retained rows · ${esc(s.title)}</title>${text(60,28,'One token · two current stream rows','trace-title')}${paths}${body}<g data-trace-motion="" aria-hidden="true">${moving}</g></svg>`;
}
