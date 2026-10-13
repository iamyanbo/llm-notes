import {STUDIES,studyFrame} from './block-study-model.js';
const f=v=>Number(v.toFixed(3)).toString();
const text=(x,y,value,cls='block-number')=>`<text x="${x}" y="${y}" class="${cls}">${value}</text>`;
const cellCenter=(node,c)=>node.x+10+(c+.5)*((node.w??190)-20)/node.v.length;
function vectorNode(node,index,frame,animate){
  const w=node.w??190,cw=(w-20)/node.v.length,ready=frame.step>=node.at,count=node.count??node.v.length;
  return `<g class="block-vector" data-block-node="${index}" data-tone="${node.tone??'blue'}"><rect class="block-node-face" x="${node.x}" y="${node.y}" width="${w}" height="94" rx="3"/>${text(node.x+10,node.y+24,node.label,'block-label')}${node.v.map((value,c)=>{
    const present=ready&&c<count,arriving=present&&node.at===frame.step&&frame.step>0&&(frame.kind!=='heads'||index===2)||frame.kind==='heads'&&index===3&&c===frame.step-2;
    return `<g data-block-coordinate="${c}" data-present="${present}"><rect class="block-cell" x="${node.x+10+c*cw+2}" y="${node.y+40}" width="${cw-4}" height="39" rx="2"/>${text(cellCenter(node,c),node.y+65,present?f(value):'—','block-cell-number')}${arriving&&animate?`<g class="block-arrival"><rect x="${node.x+10+c*cw+2}" y="${node.y+40}" width="${cw-4}" height="39" rx="2"/><animate attributeName="opacity" values="1;1;0" keyTimes="0;0.94;1" dur="${frame.kind==='heads'&&index===2?.8:1.45}s" fill="freeze"/></g>`:''}</g>`;
  }).join('')}</g>`;
}
function operation(op){
  const height=op.matrix?70+32*op.matrix.length:48+23*op.lines.length;
  return `<g class="block-operation"><rect x="${op.x}" y="${op.y}" width="${op.w}" height="${height}" rx="3"/>${text(op.x+12,op.y+24,op.label,'block-label')}${op.matrix?op.matrix.map((row,r)=>row.map((v,c)=>{
    const cw=(op.w-24)/row.length;
    return `<g data-current="${r===op.current}"><rect class="block-weight" x="${op.x+12+c*cw+2}" y="${op.y+38+r*32}" width="${cw-4}" height="28" rx="2"/><text class="block-cell-number" x="${op.x+12+(c+.5)*cw}" y="${op.y+58+r*32}">${f(v)}</text></g>`;
  }).join('')).join(''):op.lines.map((line,r)=>text(op.x+12,op.y+49+r*23,line)).join('')}</g>`;
}
export function blockStudyDiagram(frame,{animate=true}={}){
  const packets=[],routes=[],{nodes,step,kind}=frame;
  const packet=(path,value,begin=0,duration=.8,tone='blue')=>{
    if(!animate)return;
    const s=f(value),w=Math.max(34,s.length*8+12);
    packets.push(`<g class="block-packet" data-tone="${tone}" data-block-packet="${s}" opacity="0"><rect x="${-w/2}" y="-13" width="${w}" height="26" rx="2"/><text text-anchor="middle" y="5">${s}</text><animateMotion path="${path}" begin="${begin}s" dur="${duration}s"/><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" begin="${begin}s" dur="${duration}s" fill="freeze"/></g>`);
  };
  for(const link of frame.links){
    const a=nodes[link.from],b=nodes[link.to],aw=a.w??190,bw=b.w??190,active=step===link.at;
    const ay=a.y+60,by=b.y+60;
    const d=link.bypass?`M${a.x+aw/2} ${a.y+94} V${link.from===0?270:318} H${b.x+bw/2} V${b.y+94}`:`M${a.x+aw} ${ay} C${a.x+aw+35} ${ay},${b.x-35} ${by},${b.x} ${by}`;
    routes.push(`<path class="block-route" data-current="${active}" data-bypass="${!!link.bypass}" d="${d}"/>`);
    if(!active)continue;
    if(kind==='heads'&&link.to===2){
      a.v.forEach((v,c)=>packet(`M${cellCenter(a,c)} ${ay} C210 ${ay} 210 ${by} ${cellCenter(b,link.part[c])} ${by}`,v,0,.8,link.from===1?'rust':'blue'));
    }else if(kind==='heads'){
      const op=frame.operations[0],coordinate=link.coordinate;
      a.v.forEach((v,c)=>packet(`M${cellCenter(a,c)} ${ay} C480 ${ay} 485 ${op.y+52+coordinate*32} ${op.x+12+(c+.5)*(op.w-24)/4} ${op.y+52+coordinate*32}`,v,0,.75));
      packet(`M${op.x+op.w} ${op.y+52+coordinate*32} H750 V${by} H${cellCenter(b,coordinate)}`,b.v[coordinate],.8,.6);
    }else if(kind==='residual'&&link.to===3){
      const op=frame.operations[0];
      a.v.forEach((v,c)=>packet(`M${cellCenter(a,c)} ${ay} C500 ${ay} 500 ${op.y+49+c*23} ${op.x+18} ${op.y+49+c*23}`,v,0,.8,link.from===1?'rust':'blue'));
      if(link.from===2)b.v.forEach((v,c)=>packet(`M${op.x+op.w} ${op.y+49+c*23} C735 ${op.y+49+c*23} 735 ${by} ${cellCenter(b,c)} ${by}`,v,.85,.6));
    }else if(kind==='feed'&&(link.from===0||link.from===2)){
      const op=frame.operations[link.from===0?0:1],cw=(op.w-24)/a.v.length;
      b.v.forEach((value,r)=>{
        a.v.forEach((v,c)=>packet(`M${cellCenter(a,c)} ${ay} C${cellCenter(a,c)} 210 ${op.x+12+(c+.5)*cw} 210 ${op.x+12+(c+.5)*cw} ${op.y+52+r*32}`,v,0,.7));
        packet(`M${op.x+op.w} ${op.y+52+r*32} C${op.x+op.w+25} ${op.y+52+r*32} ${cellCenter(b,r)} 210 ${cellCenter(b,r)} ${by}`,value,.75,.65);
      });
    }else{
      a.v.forEach((v,c)=>{
        const route=link.bypass?d:`M${cellCenter(a,c)} ${ay} C${a.x+aw+20} ${ay-25-c*32},${b.x-20} ${by-25-c*32},${cellCenter(b,c)} ${by}`;
        packet(route,v,c*.08,.9,link.bypass?'rust':'blue');
      });
    }
  }
  return `<div class="block-scroll" tabindex="0" role="region" aria-label="Computed ${kind} walkthrough; scroll horizontally if needed"><svg class="block-study-svg" viewBox="0 0 1045 390" role="img" aria-label="${STUDIES[kind].title}. Operation ${step+1} of ${frame.labels.length}. Numbers rounded to three decimals.">${routes.join('')}${nodes.map((node,i)=>vectorNode(node,i,frame,animate)).join('')}${frame.operations.map(operation).join('')}${kind==='block'?text(120,292,'First bypass: x','block-note')+text(565,341,'Second bypass: u','block-note'):''}${packets.join('')}</svg></div>`;
}
export function blockStudyAnalysis(kind,options={},step=0,animate=true){
  const frame=studyFrame(kind,options,step);
  return blockStudyDiagram(frame,{animate})+`<div class="block-explanation"><span class="aside-label">${step+1} / ${frame.labels.length} · ${frame.labels[step]}</span><p data-block-status role="status">${frame.caption}</p></div>`;
}
function parameters(kind){
  if(kind==='heads')return '<div class="grammar-choices" role="group" aria-label="Output map"><button data-block-option="map" data-value="select" aria-pressed="true" type="button">Select coordinates</button><button data-block-option="map" data-value="mix" aria-pressed="false" type="button">Mix the heads</button></div>';
  if(kind==='residual')return '<div class="grammar-choices" role="group" aria-label="Attention update"><button data-block-option="update" data-value="example" aria-pressed="true" type="button">Worked update</button><button data-block-option="update" data-value="zero" aria-pressed="false" type="button">Zero update</button><button data-block-option="update" data-value="cancel" aria-pressed="false" type="button">Cancel the input</button></div>';
  if(kind==='feed')return '<label class="block-toggle"><input type="checkbox" data-block-toggle="relu" checked> Apply ReLU between the maps</label>';
  if(kind==='norm')return '<div class="block-sliders"><label>Common offset <input type="range" data-block-slider="shift" min="0" max="10" step="1" value="0"><output data-block-output="shift">0</output></label><label>Scale multiplier <input type="range" data-block-slider="scale" min=".5" max="4" step=".5" value="1"><output data-block-output="scale">1</output></label></div><label class="block-toggle"><input type="checkbox" data-block-toggle="affine"> Apply gains (2, 1, 0.5) and offsets (0, 1, −1)</label>';
  return '<div class="grammar-choices" role="group" aria-label="Block number"><button type="button" data-block-option="layer" data-value="1" aria-pressed="true">First block</button><button type="button" data-block-option="layer" data-value="2" aria-pressed="false">Use its output in another block</button></div>';
}
export const studyParameters=frame=>frame.details.map(([label,M])=>`<div><strong>${label}</strong><table class="context-table"><tbody>${M.map(row=>`<tr>${row.map(v=>`<td>${f(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`).join('');
export function blockStudy(kind){
  const labels=STUDIES[kind].labels,frame=studyFrame(kind);
  return `<section class="context-explorer block-study" data-block-study="${kind}" aria-labelledby="block-${kind}-title"><div class="experiment-heading"><span class="aside-label">Follow the calculation</span><span class="experiment-index">${kind==='heads'?'4 → 2 coordinates':kind==='block'?'One receiving position':'Computed values'}</span></div><h3 id="block-${kind}-title">${STUDIES[kind].title}</h3>${parameters(kind)}<div class="block-step-controls" role="group" aria-label="Calculation operation">${labels.map((label,i)=>`<button type="button" data-block-step="${i}" aria-pressed="${i===0}">${label}</button>`).join('')}</div><div data-block-analysis>${blockStudyAnalysis(kind)}</div><div class="embedding-controls"><button type="button" data-block-play aria-pressed="false">Play calculation</button><button type="button" data-block-next>Next operation</button><button type="button" data-block-reset>Restart</button></div>${frame.details.length?`<details class="context-parameters"><summary>Inspect the fixed coefficients</summary><div data-block-parameters>${frame.details.map(([label,M])=>`<div><strong>${label}</strong><table class="context-table"><tbody>${M.map(row=>`<tr>${row.map(v=>`<td>${f(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`).join('')}</div>${kind==='block'?'<p>The two heads use W_Q = (0, 1), W_K = (log 0.8, log 0.2) and (log 0.1, log 0.9), and identity value maps. Comparisons are scalar. Both norms use gains one, offsets zero, and ε = 0.00001. Both affine-network biases are zero. The second block reuses these coefficients.</p>':''}</details>`:''}<p class="context-caption">${kind==='block'?'This is a two-position, two-coordinate block with hand-chosen parameters. The attention, residual sums, feed-forward network, and both normalizations are computed.':'These are the fixed numerical examples in the text. Changes to the controls recompute the displayed values.'} Moving labels carry numerical operands; completed values appear after each operation.</p></section>`;
}
