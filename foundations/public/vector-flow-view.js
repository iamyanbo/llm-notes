import {geometryData,geometryKinds} from './geometry-model.js';
import {vectorFlowData,cubicPoint} from './vector-flow-model.js';

const number=n=>Number(n.toFixed(3)).toString(),pair=v=>'('+v.map(number).join(', ')+')';
const symbol=kind=>kind==='M'?'y':kind==='K'?'k':kind==='V'?'v':'q';
const matrixName=kind=>kind==='M'?'M':kind==='S'?'w_Qᵀ':'W_'+kind;
const curve=points=>`M${points[0].join(' ')} C${points[1].join(' ')} ${points[2].join(' ')} ${points[3].join(' ')}`;
function wire(points,{coordinate=0,reached=false,active=false,value=null,fraction=0}={}){
  const point=cubicPoint(points,fraction);
  return `<path class="vector-flow-wire" data-coordinate="${coordinate}" data-reached="${reached}" data-current="${active}" d="${curve(points)}"/>
    ${active&&value!==null?`<g class="vector-flow-packet" data-coordinate="${coordinate}" transform="translate(${point[0]} ${point[1]})"><rect x="-19" y="-12" width="38" height="24" rx="3"/><text text-anchor="middle" y="5">${number(value)}</text></g>`:''}`;
}
export function vectorFlowStatus(config={}){
  const p=vectorFlowData({...config,kind:config.active??geometryKinds(config.mode??'qkv')[0],progress:config.progress?.[config.active??geometryKinds(config.mode??'qkv')[0]]??0});
  const name=matrixName(p.kind),letter=symbol(p.kind),label=`${letter}${p.row+1}`,terms=p.products[p.row],weights=p.matrix[p.row];
  if(p.complete)return `${name} has produced ${p.count===1?'the scalar '+number(p.output[0]):'the vector '+pair(p.output)} from x = ${pair(p.input)}.${config.mode==='qkv'?' Each of the other maps receives this same original x.':''}`;
  return [
    `Copy x₁ = ${number(p.input[0])} and x₂ = ${number(p.input[1])} to row ${p.row+1} of ${name}. These inputs are reused for each output coordinate.`,
    `Multiply matched entries: ${number(p.input[0])} × ${number(weights[0])} = ${number(terms[0])}, and ${number(p.input[1])} × ${number(weights[1])} = ${number(terms[1])}.`,
    `Add those products for ${label}: ${number(terms[0])} + (${number(terms[1])}) = ${number(p.output[p.row])}.`,
    `Store ${label} = ${number(p.output[p.row])} in the output vector.${p.row+1<p.count?' The same two input coordinates will be used again for the next row.':''}`,
  ][p.phase];
}
export function vectorFlowFrame(config={}){
  const {mode='qkv',selected=1,active=geometryKinds(mode)[0],progress={},announce=true}=config;
  const data=geometryData(config),height=mode==='qkv'?724:310,inputTop=height/2-48,inputCenters=[[116,inputTop+23],[116,inputTop+71]];
  const branches=data.kinds.map((kind,i)=>{
    const p=vectorFlowData({...config,kind,progress:progress[kind]??0}),y=mode==='qkv'?48+i*218:62;
    const rows=p.matrix.length,frontX=326,frontY=y+26,w=112,h=rows*48;
    const focused=kind===active,total=p.output[p.row],letter=symbol(kind);
    const productCenters=[[526,y+47],[526,y+101]],sum=[636,y+74];
    const traces=[];
    for(let r=0;r<rows;r++)for(let j=0;j<2;j++){
      const end=[frontX+28+j*56,frontY+r*48+10];
      const points=[inputCenters[j],[210,inputCenters[j][1]],[250,end[1]-35],end];
      traces.push(wire(points,{coordinate:j,reached:r<p.completed||r===p.row&&p.phase>0,active:focused&&!p.complete&&r===p.row&&p.phase===0,value:p.input[j],fraction:p.phaseProgress}));
    }
    for(let j=0;j<2;j++){
      const start=[frontX+28+j*56,frontY+p.row*48+33],end=productCenters[j];
      traces.push(wire([start,[472,start[1]],[480,end[1]],end],{coordinate:j,reached:p.phase>=2,active:focused&&!p.complete&&p.phase===1,value:p.products[p.row][j],fraction:p.phaseProgress}));
      traces.push(wire([[568,end[1]],[594,end[1]],[606,sum[1]],sum],{coordinate:j,reached:p.phase>=3,active:focused&&!p.complete&&p.phase===2,value:p.products[p.row][j],fraction:p.phaseProgress}));
    }
    const outputY=y+47+p.row*48;
    traces.push(wire([[655,sum[1]],[688,sum[1]],[693,outputY],[726,outputY]],{coordinate:2,reached:p.complete,active:focused&&!p.complete&&p.phase===3,value:total,fraction:p.phaseProgress}));
    return `<g class="vector-flow-branch" data-map="${kind}" data-focused="${focused}">
      <text class="vector-flow-heading" x="382" y="${y+3}" text-anchor="middle">${matrixName(kind)} · ${rows} × 2</text>
      <text class="vector-flow-heading" x="760" y="${y+3}" text-anchor="middle">${letter} · ${rows} coordinate${rows===1?'':'s'}</text>
      <text class="vector-flow-column-label" x="354" y="${frontY-5}" text-anchor="middle">x₁</text><text class="vector-flow-column-label" x="410" y="${frontY-5}" text-anchor="middle">x₂</text>
      <g class="vector-flow-tracks">${traces.join('')}</g>
      <path class="vector-flow-depth" d="M${frontX} ${frontY} l10 -10 h${w} v${h} l-10 10 Z"/>
      ${p.matrix.map((row,r)=>row.map((weight,j)=>`<g data-flow-weight-row="${r}" data-flow-weight-column="${j}">
        <rect class="vector-flow-weight" data-coordinate="${j}" data-current="${focused&&r===p.row&&!p.complete}" x="${frontX+j*56}" y="${frontY+r*48}" width="56" height="48"/>
        <text class="vector-flow-weight-number" x="${frontX+28+j*56}" y="${frontY+r*48+32}" text-anchor="middle">${number(weight)}</text></g>`).join('')).join('')}
      ${p.matrix.map((_,r)=>`<text class="vector-flow-row-label" x="314" y="${frontY+r*48+30}" text-anchor="end">${letter}${r+1}</text>`).join('')}
      ${productCenters.map((center,j)=>`<g><rect class="vector-flow-product" data-coordinate="${j}" x="484" y="${center[1]-18}" width="84" height="36" rx="3"/>
        <text class="vector-flow-product-number" x="526" y="${center[1]+5}" text-anchor="middle">${p.phase>=2?number(p.products[p.row][j]):'?'}</text></g>`).join('')}
      <circle class="vector-flow-adder" cx="636" cy="${y+74}" r="19"/><text class="vector-flow-add-symbol" x="636" y="${y+80}" text-anchor="middle">+</text>
      ${p.output.map((value,r)=>`<g data-flow-output-coordinate="${r}" data-computed="${r<p.completed}">
        <rect class="vector-flow-output" x="726" y="${y+26+r*48}" width="68" height="44" rx="3"/>
        <text class="vector-flow-output-number" x="760" y="${y+53+r*48}" text-anchor="middle">${r<p.completed?number(value):'?'}</text></g>`).join('')}
      <text class="vector-flow-operation-label" x="526" y="${y+141}" text-anchor="middle">products</text><text class="vector-flow-operation-label" x="636" y="${y+141}" text-anchor="middle">sum</text>
      <text class="vector-flow-formula" x="562" y="${y+177}" text-anchor="middle">${letter}${p.row+1} = ${number(p.input[0])} × ${number(p.matrix[p.row][0])} + ${number(p.input[1])} × (${number(p.matrix[p.row][1])})</text>
    </g>`;
  }).join('');
  return `<div class="vector-flow-scroll" tabindex="0" role="region" aria-label="Vector passing through weight matrices; scroll horizontally on smaller screens">
    <svg class="vector-flow-scene" viewBox="0 0 860 ${height}" role="img" aria-label="Input vector for ${data.tokens[selected]} at position ${selected+1} flows independently through ${data.kinds.map(matrixName).join(', ')}. Each row multiplies the input coordinates by its weights and adds the products.">
      <text class="vector-flow-heading" x="82" y="${inputTop-25}" text-anchor="middle">Input x · 2 × 1</text>
      <path class="vector-flow-input-depth" d="M48 ${inputTop} l8 -8 h68 v96 l-8 8 Z"/>
      ${data.X[selected].map((value,j)=>`<g><rect class="vector-flow-input" data-coordinate="${j}" x="48" y="${inputTop+j*48}" width="68" height="46" rx="3"/>
        <text class="vector-flow-input-number" x="82" y="${inputTop+j*48+30}" text-anchor="middle">${number(value)}</text>
        <text class="vector-flow-input-label" x="35" y="${inputTop+j*48+29}" text-anchor="end">x${j===0?'₁':'₂'}</text></g>`).join('')}
      <text class="vector-flow-word" x="82" y="${inputTop+124}" text-anchor="middle">${data.tokens[selected]} · ${selected+1}</text>
      ${branches}
    </svg></div>
    <ol class="vector-flow-stages" aria-label="How an output coordinate is formed">${['Copy inputs','Multiply','Add products','Store output'].map((label,i)=>`<li data-current="${vectorFlowData({...config,kind:active,progress:progress[active]??0}).phase===i}">${label}</li>`).join('')}</ol>
    <p class="geometry-status" data-geometry-status role="status" aria-live="${announce?'polite':'off'}">${vectorFlowStatus({...config,active})}</p>`;
}
