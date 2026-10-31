import {residualAlternatives} from './residual-model.mjs';
import {scene,definition,ref,term,fmt,esc,grid,packet} from './trace-scene.mjs';
const row=v=>[v];
const text=(x,y,s,cls='')=>`<text x="${x}" y="${y}" class="${cls}">${esc(s)}</text>`;
export function alternativesTraceDefinition(fraction=.5){
 const m=residualAlternatives(fraction),scaled=m.update.map(v=>v*fraction),parts=[];
 function make(title,inputs,values,cells,inputNodes,target,note){const s=scene(title,inputs,values,cells,{note});s.inputNodes=inputNodes;s.target=target;parts.push(s);}
 make('Scale the new update',[{label:'Expert update',values:row(m.update)}],row(scaled),scaled.map((v,j)=>({row:0,col:j,result:v,terms:[term(v,`${fmt(fraction)} × ${fmt(m.update[j])}`,[ref(0,0,j)])]})),['u'],'scaled','The left construction chooses the update strength before storing one row.');
 make('Store one weighted residual row',[{label:'Original row',values:row(m.input)},{label:'Scaled update',values:row(scaled)}],row(m.oneRow),m.oneRow.map((v,j)=>({row:0,col:j,result:v,terms:[term(m.input[j],fmt(m.input[j]),[ref(0,0,j)]),term(scaled[j],fmt(scaled[j]),[ref(1,0,j)])]})),['x','scaled'],'stored','The two paths are added into one retained row on the left.');
 make('Pass that single row to the next sublayer',[{label:'Stored row',values:row(m.oneRow)}],row(m.oneRow),m.oneRow.map((v,j)=>({row:0,col:j,result:v,terms:[term(v,`Copy ${fmt(v)}`,[ref(0,0,j)])]})),['stored'],'nextLeft','The next input is the row stored by the left construction.');
 make('Retain both before and after rows',[{label:'Before',values:row(m.input)},{label:'After',values:row(m.ordinary)}],m.retained,m.retained.flatMap((r,i)=>r.map((v,j)=>({row:i,col:j,result:v,terms:[term(v,`Keep ${i===0?'before':'after'} coordinate ${j}`,[ref(i,0,j)])]}))),['x','r'],'retained','The right construction keeps two separate rows available.');
 make('Read a mixture of the two retained rows',[{label:'Both retained rows',values:m.retained}],row(m.read),m.read.map((v,j)=>({row:0,col:j,result:v,terms:[term((1-fraction)*m.input[j],`${fmt(1-fraction)} × ${fmt(m.input[j])}`,[ref(0,0,j)]),term(fraction*m.ordinary[j],`${fmt(fraction)} × ${fmt(m.ordinary[j])}`,[ref(0,1,j)])]})),['retained'],'nextRight','The next inputs agree. On the right, both retained rows remain available for a different later read.');
 const def=definition(parts);def.render=(i,p,o)=>render(def,m,scaled,i,p,o);return def;
}
function render(def,m,scaled,index,phase,{motion=true}={}){
 const st=def.steps[Math.max(0,Math.min(def.steps.length-1,index))],s=def.scenes[st.scene],c=s.cells[st.cell],p=motion?phase:1,arrived=p>=.96;
 const specs=[['x','Known original row x',m.input,40,50,310,-1],['u','Known expert output u',m.update,385,50,310,-1],['r','Known full result r = x + u',m.ordinary,730,50,310,-1],['scaled',`Scaled update · λ = ${fmt(m.fraction)}`,scaled,40,270,450,0],['stored','Retained state: x + λu',m.oneRow,40,440,450,1],['nextLeft','Input for the next sublayer',m.oneRow,40,625,450,2],['retained','Retained state: before and after',m.retained,590,310,450,3],['nextRight','Input for the next sublayer',m.read,590,625,450,4]];
 let body='',moving='';const points={};
 for(const [id,label,v,x,y,w,at] of specs){const values=id==='retained'?v:row(v),g=grid(label,values,x,y,w,{present:(i,j)=>at<st.scene||(at===st.scene&&(i*values[0].length+j<st.cell||(i*values[0].length+j===st.cell&&arrived))),current:(i,j)=>at===st.scene&&i===c?.row&&j===c?.col&&arrived,id:id.startsWith('next')?'out':id,tone:id==='u'||id==='scaled'?'rust':''});body+=g.html;points[id]=g.points;}
 const path=(d,tone='')=>`<path class="trace-route trace-active ${tone}" d="${d}"/>`;
 const paths=path('M540 130 V210 H265 V270','rust')+path('M195 130 V210 H15 V480 H40')+path('M265 350 V440','rust')+path('M265 520 V625')+path('M195 130 V180 H815 V310')+path('M885 130 V310','rust')+path('M815 426 V625');
 body+=text(40,230,'Store one weighted result','trace-title')+text(590,230,'Keep before and after rows','trace-title')+text(40,735,'Two stored coordinates','trace-label')+text(590,735,'Four stored coordinates','trace-label');
 if(c){
  const target=points[s.target].find(q=>q.row===c.row&&q.col===c.col),hub=[target.x,target.y-65],n=c.terms.length,done=p>=.65?n:Math.floor(p/.65*n+1e-8);
  for(let i=0;i<n;i++){const t=c.terms[i],local=p/.65*n-i;for(const r of t.sources){const a=points[s.inputNodes[r.input]].find(q=>q.row===r.row&&q.col===r.col);if(motion&&local>=0&&local<.7)moving+=packet(s.inputs[r.input].values[r.row][r.col],[a.x,a.y],hub,local/.7,r.input===1?'rust':'');if(motion&&r===t.sources[0]&&local>=.7&&local<1)moving+=packet(t.value,hub,hub,0);}}
  if(motion&&p>=.65&&p<.96)moving+=packet(c.result,hub,[target.x,target.y],(p-.65)/.31);
  body+=text(40,790,s.title,'trace-label')+text(40,818,c.terms.map((t,i)=>i<done?t.expression:'…').join(' + ')+(done===n?' = '+fmt(c.result):''),'trace-arithmetic')+text(40,847,done===n?`Result: ${fmt(c.result)}`:'Follow the contributions before the result arrives.','trace-small');
 }else body+=text(40,790,s.title,'trace-label')+text(40,818,'Next traces its first coordinate.','trace-small');
 return `<svg xmlns="http://www.w3.org/2000/svg" class="calculation-trace" viewBox="0 0 1080 885" role="img" aria-label="Compare one retained row on the left with two retained rows on the right"><title>One stored row or two retained rows · ${esc(s.title)}</title>${text(40,28,'Begin with the known Day 1 calculation','trace-title')}${paths}${body}<g data-trace-motion="" aria-hidden="true">${moving}</g></svg>`;
}
