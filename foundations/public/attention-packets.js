// Numeric operands and results moving between the existing attention matrices.
export function attentionPackets(e,operation,row,animate=true){
  if(!animate||operation>3)return '';
  const packets=[],f=v=>Number(v.toFixed(2)).toString();
  const add=(path,value,begin=0,tone='blue')=>{
    const label=Array.isArray(value)?'('+value.map(f).join(', ')+')':f(value),w=Math.max(38,label.length*7+14);
    packets.push(`<g class="attention-numeric-packet" data-attention-packet data-tone="${tone}" opacity="0"><rect x="${-w/2}" y="-13" width="${w}" height="26" rx="3"/><text y="5" text-anchor="middle">${label}</text><animateMotion path="${path}" begin="${begin}s" dur="0.7s"/><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.85;1" begin="${begin}s" dur="0.7s" fill="freeze"/></g>`);
  };
  if(operation===0)for(const [name,y] of [['Q',65],['K',233],['V',389]]){
    const sy=63+row*32,dy=y+14+row*32;
    add(`M110 ${sy} H142 V${dy} H212`,e.X[row],0,name==='V'?'rust':'blue');
    add(`M170 ${dy} H247`,e[name][row],.75,name==='V'?'rust':'blue');
  }
  if(operation===1)e.K.forEach((key,j)=>{
    const dy=79+row*32,tx=401+j*36;
    add(`M282 ${79+row*32} Q330 38 348 90 H${tx} V${dy}`,e.Q[row],j*.15);
    add(`M282 ${247+j*32} H324 V184 H${tx} V${dy}`,key,j*.15);
    add(`M348 184 H${tx} V${dy}`,e.scores[row][j],.85+j*.15);
  });
  if(operation===2){
    add(`M437 ${79+row*32} H475 V${251+row*32} H508`,e.scores[row]);
    add(`M475 ${251+row*32} H560`,e.weights[row],.8);
  }
  if(operation===3)e.V.forEach((value,j)=>{
    const dy=395+row*32;
    add(`M${524+j*36} ${251+row*32} V353 H350 V${dy}`,e.weights[row][j],j*.15);
    add(`M282 ${403+j*32} H350 V${dy}`,value,j*.15,'rust');
    add(`M350 ${dy} H435`,value.map(v=>v*e.weights[row][j]),.85+j*.15,'rust');
  });
  return packets.join('');
}
