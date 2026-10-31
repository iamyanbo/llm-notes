// Give each product its own travel and reading time, independent of row width.
export const TRACE_TIMING=Object.freeze({lead:300,operand:1200,product:800,termHold:900,sumHold:1000,result:1400,resultHold:1800,introduction:1800});
export function traceDuration(terms=1){const t=TRACE_TIMING;return terms? t.lead+terms*(t.operand+t.product+t.termHold)+t.sumHold+t.result+t.resultHold:t.introduction;}
export function tracePhase(elapsed,terms=1){
 if(!terms)return 1;
 const t=TRACE_TIMING,n=Math.max(1,terms);let remaining=Math.max(0,elapsed)-t.lead;
 if(remaining<=0)return 0;
 for(let i=0;i<n;i++){
  if(remaining<t.operand)return .65*(i+.7*remaining/t.operand)/n;remaining-=t.operand;
  if(remaining<t.product)return .65*(i+.7+.3*remaining/t.product)/n;remaining-=t.product;
  if(remaining<t.termHold)return .65*(i+1)/n;remaining-=t.termHold;
 }
 if(remaining<t.sumHold)return .65;remaining-=t.sumHold;
 if(remaining<t.result)return .65+.31*remaining/t.result;
 return 1;
}
export const ease=t=>{const x=Math.max(0,Math.min(1,t));return x*x*(3-2*x);};
// The numerical view separates contribution arrival, addition and storage.
// Keep the existing operand/product travel times; give addition its own route.
export function calculationTiming(elapsed,terms=1){
 if(!terms)return {phase:1,duration:TRACE_TIMING.introduction};
 const t=TRACE_TIMING,contributions=t.lead+terms*(t.operand+t.product+t.termHold),add=1400*terms,hold=900;
 const duration=contributions+add+hold+t.result+t.resultHold;
 if(elapsed<contributions)return {phase:tracePhase(elapsed,terms),duration};
 const rest=elapsed-contributions;
 return {phase:rest<add?.65+.15*rest/add:rest<add+hold?.8:rest<add+hold+t.result?.8+.16*(rest-add-hold)/t.result:1,duration};
}
export function cubicPoint(a,c1,c2,b,t){const u=1-t;return a.map((v,i)=>u**3*v+3*u*u*t*c1[i]+3*u*t*t*c2[i]+t**3*b[i]);}
export function roundedPolylinePoint(points,progress,radius=24){
 const samples=[points[0]];
 for(let i=1;i<points.length-1;i++){
  const p=points[i],prev=points[i-1],next=points[i+1],before=Math.hypot(p[0]-prev[0],p[1]-prev[1]),after=Math.hypot(next[0]-p[0],next[1]-p[1]),r=Math.min(radius,before/2,after/2);
  if(!before||!after){samples.push(p);continue;}
  const a=p.map((v,j)=>v+(prev[j]-v)*r/before),b=p.map((v,j)=>v+(next[j]-v)*r/after);samples.push(a);
  for(let k=1;k<=20;k++){const t=k/20,u=1-t;samples.push(a.map((v,j)=>u*u*v+2*u*t*p[j]+t*t*b[j]));}
 }
 samples.push(points.at(-1));const lengths=samples.slice(1).map((p,i)=>Math.hypot(p[0]-samples[i][0],p[1]-samples[i][1]));let distance=lengths.reduce((a,b)=>a+b,0)*Math.max(0,Math.min(1,progress));
 for(let i=0;i<lengths.length;i++){if(distance<=lengths[i]){const t=distance/(lengths[i]||1);return samples[i].map((v,j)=>v+(samples[i+1][j]-v)*t);}distance-=lengths[i];}return samples.at(-1);
}

// During travel, retain the SVG and packet elements. Update transforms only;
// rebuild settled cells/arithmetic only when their displayed state changes.
export function motionParts(markup){
 const start=markup.indexOf('<g data-trace-motion="" aria-hidden="true">');
 if(start<0)return {base:markup,packets:[]};
 const end=markup.lastIndexOf('</g>'),contentStart=markup.indexOf('>',start)+1,content=markup.slice(contentStart,end);
 return {base:markup.slice(0,contentStart)+markup.slice(end),packets:[...content.matchAll(/<g class="([^"]*)" transform="([^"]*)">([\s\S]*?)<\/g>/g)].map(m=>({className:m[1],transform:m[2],body:m[3]}))};
}
export function createTraceView(canvas){
 let previousBase=null,previousPackets=[];
 return markup=>{
  const next=motionParts(markup);
  if(next.base!==previousBase||!canvas.querySelector){canvas.innerHTML=markup;previousBase=next.base;previousPackets=next.packets;return;}
  const layer=canvas.querySelector('[data-trace-motion]');
  if(!layer){canvas.innerHTML=markup;previousBase=next.base;previousPackets=next.packets;return;}
  next.packets.forEach((p,i)=>{
   let node=layer.children[i];if(!node){node=canvas.ownerDocument.createElementNS('http://www.w3.org/2000/svg','g');layer.appendChild(node);}
   if(node.getAttribute('class')!==p.className)node.setAttribute('class',p.className);
   if(node.getAttribute('transform')!==p.transform)node.setAttribute('transform',p.transform);
   if(previousPackets[i]?.body!==p.body)node.innerHTML=p.body;
  });
  while(layer.children.length>next.packets.length)layer.lastElementChild.remove();
  previousPackets=next.packets;
 };
}
