import {geometryData,geometryKinds,transformedGrid} from './geometry-model.js';
import {vectorFlowFrame} from './vector-flow-view.js';

const number=v=>Number(v.toFixed(3)).toString();
const vector=v=>'('+v.map(number).join(', ')+')';
const px=x=>180+45*x,py=y=>170-45*y;
const path=(a,b)=>`M${px(a[0])} ${py(a[1])} L${px(b[0])} ${py(b[1])}`;
function plane(points,tokens,matrix,{prefix,kind,selected=1,basis=true,scalar=false,progress=1}){
  const groups=[];
  points.forEach((point,i)=>{
    let group=groups.find(g=>g.point.every((v,r)=>Math.abs(v-point[r])<1e-9));
    if(!group){group={point,indices:[]};groups.push(group);}group.indices.push(i);
  });
  const id=prefix+'-'+kind;
  return `<svg class="geometry-plane" viewBox="0 0 360 340" role="img" aria-label="${kind==='input'?'Input vectors':scalar?'Projection onto the scalar query line':kind+' transformed vectors'}. Selected ${tokens[selected]} at position ${selected+1}: ${scalar&&progress===1?number(points[selected][0]):vector(points[selected])}.">
    <defs><clipPath id="${id}-clip"><rect x="18" y="18" width="324" height="304"/></clipPath>
      <marker id="${id}-basis1" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 Z" fill="var(--blue)"/></marker>
      <marker id="${id}-basis2" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 Z" fill="var(--rust)"/></marker></defs>
    <g clip-path="url(#${id}-clip)">
      ${!scalar?`<g class="geometry-reference-grid">${transformedGrid([[1,0],[0,1]]).map(([a,b])=>`<path d="${path(a,b)}"/>`).join('')}</g>`:''}
      <g class="geometry-carried-grid" data-collapsed="${scalar&&progress===1}">${transformedGrid(matrix).map(([a,b])=>`<path d="${path(a,b)}"/>`).join('')}</g>
      <path class="geometry-axis" d="M20 170 H340 ${scalar&&progress===1?'':'M180 320 V20'}"/>
      <g class="geometry-ticks">${[-2,-1,1,2].map(v=>`<path d="M${px(v)} 166 V174"/><text x="${px(v)}" y="188">${v}</text>${scalar&&progress===1?'':`<path d="M176 ${py(v)} H184"/><text x="163" y="${py(v)+4}">${v}</text>`}`).join('')}</g>
      ${basis&&!scalar?[[matrix[0][0],matrix[1][0]],[matrix[0][1],matrix[1][1]]].map((v,j)=>`<path class="geometry-basis geometry-basis-${j}" d="${path([0,0],v)}" marker-end="url(#${id}-basis${j+1})"/>`).join(''):''}
      <path class="geometry-selected-vector" d="${path([0,0],points[selected])}"/>
      ${groups.map(({point,indices})=>{
        const chosen=indices.includes(selected);
        const label=indices.map(i=>tokens[i]+' '+(i+1)).join(', ');
        return `<g data-geometry-positions="${indices.map(i=>i+1).join(',')}" data-selected="${chosen}">
          <circle class="geometry-point" cx="${px(point[0])}" cy="${py(point[1])}" r="${chosen?6:4}"/>
          ${kind==='input'||chosen||scalar&&progress===1?`<text class="geometry-word-label" x="${scalar&&progress===1?px(point[0]):px(point[0])+11}" y="${scalar&&progress===1?py(point[1])+(point[0]===0?-27:43):py(point[1])-12}" text-anchor="${scalar&&progress===1?'middle':'start'}">${label}</text>`:''}</g>`;
      }).join('')}
    </g><text class="geometry-axis-label" x="337" y="200" text-anchor="end">${scalar&&progress===1?'q':'coordinate 1'}</text>
    ${scalar&&progress===1?'':`<text class="geometry-axis-label" x="190" y="18">coordinate 2</text>`}
  </svg>`;
}
function coordinates(data,points,selected,scalar=false){
  return `<div class="geometry-coordinate-list">${data.tokens.map((token,i)=>`<div data-selected="${i===selected}"><span>${token} <small>${i+1}</small></span><b>${scalar?number(points[i][0]):vector(points[i])}</b></div>`).join('')}</div>`;
}
const smallMatrix=matrix=>`<span class="geometry-coefficients" aria-label="Matrix coefficients">${matrix.flat().map(v=>`<span>${number(v)}</span>`).join('')}</span>`;
export function geometryFrame(config={}){
  const {mode='qkv',selected=1,prefix='geometry-qkv',active=geometryKinds(mode)[0],showBasis=true,announce=true}=config,data=geometryData(config);
  return `<div class="geometry-planes"><div class="geometry-panel"><h4>Input x</h4>
      ${plane(data.X,data.tokens,[[1,0],[0,1]],{prefix,kind:'input',selected,basis:showBasis})}
      ${coordinates(data,data.X,selected)}
      <p class="geometry-panel-note">${config.positions?'Token vectors plus positions.':'Token vectors from 2.2.'} Every map starts here.</p></div>
    ${data.kinds.map(kind=>{
      const m=data.maps[kind],scalar=mode==='scalar',title=scalar?'One scalar query':kind==='M'?'The image Mx':kind==='Q'?'Queries · W_Q x':kind==='K'?'Keys · W_K x':'Values · W_V x';
      return `<div class="geometry-panel" data-active="${active===kind}"><h4>${title}</h4>
        ${plane(m.points,data.tokens,m.matrix,{prefix,kind,selected,basis:showBasis,scalar,progress:m.progress})}
        ${coordinates(data,m.points,selected,scalar&&m.progress===1)}
        <div class="geometry-map-description">${scalar?`<span>Target: q = 0x₁ + 1x₂</span>`:`<span>Target ${kind==='M'?'M':'W_'+kind} =</span>${smallMatrix(m.target)}`}<b>${Math.round(m.progress*100)}%</b></div>
        ${!scalar&&showBasis?`<p class="geometry-panel-note"><span class="geometry-basis-label-0">e₁ → ${vector(m.basis[0])}</span><br><span class="geometry-basis-label-1">e₂ → ${vector(m.basis[1])}</span></p>`:''}</div>`;
    }).join('')}</div>
    <p class="geometry-status" data-geometry-status role="status" aria-live="${announce?'polite':'off'}">${mode==='scalar'&&data.maps.S.progress===1?'Dog and chased both give q = 1. Their different first coordinates are lost.':
      `${active==='M'?'M':active} map, ${Math.round(data.maps[active].progress*100)}%: ${data.tokens[selected]} ${selected+1} moves from ${vector(data.X[selected])} to ${vector(data.maps[active].points[selected])}.`}</p>`;
}
export function geometryStudy({mode='qkv',prefix='geometry-qkv',key='dog',positions=false,selected=1,embedded=false}={}){
  const kinds=geometryKinds(mode),active=kinds[0],config={mode,prefix,key,positions,selected,active};
  const title=mode==='scalar'?'Two coordinates, one scalar output':mode==='basis'?'A vector through a matrix':'One input, three projections';
  return `<${embedded?'div':'section'} class="context-explorer geometry-study${embedded?' geometry-embedded':''}" data-geometry-study data-geometry-mode="${mode}" data-geometry-prefix="${prefix}" aria-labelledby="${prefix}-title">
    <div class="experiment-heading"><span class="aside-label">${mode==='scalar'?'From a vector to one measurement':'Follow the data through a linear map'}</span></div>
    <h3 id="${prefix}-title">${title}</h3>
    <p class="context-instruction" data-geometry-instruction>Follow the two input coordinates into a matrix row. Multiply by its weights, add the products, and store the output coordinate. The same inputs are reused for the next row.</p>
    <div class="context-stage-buttons geometry-view-toggle" role="group" aria-label="Visualization view"><button type="button" data-geometry-view="flow" aria-pressed="true" aria-controls="${prefix}-frame">Data flow</button><button type="button" data-geometry-view="transform" aria-pressed="false" aria-controls="${prefix}-frame">Transform</button></div>
    <div class="geometry-controls">
      ${kinds.length>1?`<div class="context-stage-buttons" role="group" aria-label="Geometric map">${kinds.map(kind=>`<button type="button" data-geometry-kind="${kind}" aria-pressed="${kind===active}">${kind}</button>`).join('')}</div>`:''}
      ${!embedded?`<label>Follow a word <select data-geometry-word>${geometryData(config).tokens.map((token,i)=>`<option value="${i}"${i===selected?' selected':''}>${token} · position ${i+1}</option>`).join('')}</select></label>`:''}
      ${mode!=='scalar'?`<label data-transform-control hidden><input type="checkbox" data-geometry-basis checked> Show basis vectors</label>`:''}
    </div><div id="${prefix}-frame" data-geometry-frame>${vectorFlowFrame(config)}</div>
    <label class="geometry-slider-label"><span data-geometry-timeline>Data flow</span><input type="range" data-geometry-progress min="0" max="1" step="0.01" value="0" aria-valuetext="0 percent"><output data-geometry-percent>0%</output></label>
    <div class="embedding-controls"><button type="button" data-geometry-play aria-pressed="false">${mode==='qkv'?'Play Q → K → V':'Play data flow'}</button><button type="button" data-geometry-next>Next step</button><button type="button" data-geometry-apply>Complete map</button><button type="button" data-geometry-reset>Reset</button></div>
    <p class="context-caption" data-geometry-caption>Blue cells contain the fixed weights. Outlined cells contain computed values. Moving labels carry the actual input numbers, products, and sum. ${mode==='qkv'?'Q, K, and V each receive the same original x.':'A new matrix row produces another output coordinate.'}</p>
  </${embedded?'div':'section'}>`;
}
