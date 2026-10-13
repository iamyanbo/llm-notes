import {operationFrame,OPERATION_KINDS} from './architecture-operations-model.js';
const f=v=>Number.isFinite(v)?Number(v.toFixed(3)).toString():'−∞';
const labelLines=(s,w)=>{
  const max=Math.floor((w-24)/7),words=s.split(' '),lines=[''];
  for(const word of words){let i=lines.length-1;if((lines[i]+' '+word).trim().length>max&&lines[i]){lines.push(word);}else lines[i]=(lines[i]+' '+word).trim();}
  return lines.slice(0,2);
};
const cell=(n,r,c)=>({x:n.x+12+(c+.5)*(n.w-24)/n.data[0].length,y:n.y+64+r*34});
export function architectureOperationDiagram(frame,{animate=true}={}){
  const routes=[],packets=[],{nodes,step,kind}=frame;
  const packet=(path,value,delay=0,tone='blue',blocked=false)=>{
    if(!animate)return;
    const s=f(value)+(blocked?' ×':''),width=Math.max(38,s.length*8+14);
    packets.push(`<g class="operation-packet" data-operation-packet data-tone="${tone}" data-blocked="${blocked}" opacity="0"><rect x="${-width/2}" y="-14" width="${width}" height="28" rx="3"/><text text-anchor="middle" y="5">${s}</text><animateMotion path="${path}" begin="${delay}s" dur="0.65s"/><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.8;1" begin="${delay}s" dur="0.65s" fill="freeze"/></g>`);
  };
  for(const e of frame.edges){
    const a=nodes[e.from],b=nodes[e.to],ay=a.y+64,by=b.y+64,current=step===e.at;
    const from={x:a.x+a.w/2,y:ay},to={x:b.x+b.w/2,y:by};
    const d=`M${from.x} ${from.y} C${from.x} ${(ay+by)/2},${to.x} ${(ay+by)/2},${to.x} ${to.y}`;
    routes.push(`<path class="operation-wire" data-current="${current}" data-tone="${a.tone}" d="${d}"/>`);
    if(!current)continue;
    if(e.map!==undefined){
      const map=frame.maps[e.map],input=a.data[0],output=b.data[0],cw=(map.w-24)/input.length;
      output.forEach((v,r)=>{
        input.forEach((x,c)=>{
          const p=cell(a,0,c),tx=map.x+12+(c+.5)*cw,ty=map.y+58+r*32;
          packet(`M${p.x} ${p.y} Q${tx} ${p.y} ${tx} ${ty}`,x);
        });
        const dest=cell(b,0,r);
        packet(`M${map.x+map.w} ${map.y+58+r*32} Q${dest.x} ${map.y+58+r*32} ${dest.x} ${dest.y}`,v,.72);
      });
    }else if(e.mask){
      a.data.forEach((values,r)=>values.forEach((v,c)=>{
        const p=cell(a,r,c),q=cell(b,r,c),blocked=c>r;
        packet(`M${p.x} ${p.y} Q${(p.x+q.x)/2} ${p.y-25} ${q.x} ${q.y}`,v,0,blocked?'rust':'blue',blocked);
      }));
    }else if(kind==='cross'&&step===1&&e.from===0){
      b.data[0].forEach((_,candidate)=>a.data[0].forEach((v,c)=>{
        const p=cell(a,0,c),q=cell(b,0,candidate);
        packet(`M${p.x} ${p.y} Q${(p.x+q.x)/2} ${p.y-28-c*24} ${q.x} ${q.y}`,v);
      }));
    }else{
      const groups=a.data.length>1?(kind==='mask'&&e.from===1?[[frame.row,a.data[frame.row]]]:a.data.map((values,r)=>[r,values])):[[0,a.data[0]]];
      groups.forEach(([r,values])=>values.forEach((v,c)=>{
        if(!Number.isFinite(v))return;
        if(kind==='mask'&&step===3&&e.from===0&&r>frame.row)return;
        const coordinate=a.data.length>1&&b.data[0].length===a.data.length?r:c;
        const p=cell(a,r,c),q=cell(b,0,Math.min(coordinate,b.data[0].length-1));
        packet(`M${p.x} ${p.y} C${p.x} ${(p.y+q.y)/2-24-c*18},${q.x} ${(p.y+q.y)/2-24-c*18},${q.x} ${q.y}`,v,c*.08,a.tone);
      }));
    }
  }
  const nodeMarkup=nodes.map((n,index)=>{
    const ready=step>=n.at,height=54+n.data.length*34+(n.labels?18:0),arriving=ready&&n.at===step&&step>0;
    return `<g class="operation-node" data-operation-node="${index}" data-ready="${ready}" data-tone="${n.tone}"><rect class="operation-node-face" x="${n.x}" y="${n.y}" width="${n.w}" height="${height}" rx="3"/>${labelLines(n.label,n.w).map((s,i)=>`<text class="operation-label" x="${n.x+12}" y="${n.y+20+16*i}">${s}</text>`).join('')}${n.data.map((values,r)=>values.map((v,c)=>{
      const p=cell(n,r,c),cw=(n.w-24)/values.length,blocked=!Number.isFinite(v),rowFocus=n.data.length>1&&r===frame.row;
      return `<g data-operation-cell="${index}-${r}-${c}" data-current-row="${rowFocus}" data-masked="${blocked}"><rect class="operation-cell" x="${p.x-cw/2+2}" y="${p.y-16}" width="${cw-4}" height="32" rx="2"/><text class="operation-value" x="${p.x}" y="${p.y+5}" text-anchor="middle">${ready?f(v):'—'}</text>${arriving&&animate?`<g class="operation-arrival"><rect x="${p.x-cw/2+2}" y="${p.y-16}" width="${cw-4}" height="32" rx="2"/><animate attributeName="opacity" values="1;1;0" keyTimes="0;0.96;1" dur="1.4s" fill="freeze"/></g>`:''}${n.labels?`<text class="operation-token" x="${p.x}" y="${p.y+33}" text-anchor="middle">${n.labels[c]}</text>`:''}</g>`;
    }).join('')).join('')}</g>`;
  }).join('');
  const mapMarkup=frame.maps.map(m=>`<g class="operation-map" data-active="${step===m.at}"><rect class="operation-node-face" x="${m.x}" y="${m.y}" width="${m.w}" height="${48+32*m.matrix.length}" rx="3"/><text class="operation-label" x="${m.x+12}" y="${m.y+23}">${m.label}</text>${m.matrix.map((values,r)=>values.map((v,c)=>{
    const cw=(m.w-24)/values.length,x=m.x+12+(c+.5)*cw,y=m.y+58+r*32;
    return `<rect class="operation-coefficient" x="${x-cw/2+2}" y="${y-18}" width="${cw-4}" height="28" rx="2"/><text class="operation-value" text-anchor="middle" x="${x}" y="${y+3}">${f(v)}</text>`;
  }).join('')).join('')}</g>`).join('');
  return `<div class="operation-diagram-scroll" role="region" aria-label="${OPERATION_KINDS[kind].title} numerical example"><svg class="operation-diagram" viewBox="0 0 680 390" role="img" aria-label="${frame.labels[step]}. Numbers rounded to three decimals.">${routes.join('')}${nodeMarkup}${mapMarkup}${packets.join('')}</svg></div><p class="operation-caption" role="status" data-operation-status>${frame.caption}</p>`;
}
export const architectureOperationView=(kind,step,row,animate)=>architectureOperationDiagram(operationFrame(kind,step,row),{animate});
