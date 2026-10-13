import {PRESETS} from './sentence-model.js';
import {REPRESENTATION_VOCABULARY,exampleEmbeddings,orderedVectors} from './representation-model.js';

export function embeddingAnalysis(key='dog',position=0){
  const tokens=PRESETS[key],embeddings=exampleEmbeddings(),rows=orderedVectors(tokens,embeddings);
  const token=tokens[position],selected=embeddings[token];
  const px=x=>94+50*x,py=y=>104-50*y;
  return `<div class="embedding-panels">
    <div class="embedding-panel"><h4>1. Lookup table</h4>
      <table class="embedding-table"><thead><tr><th scope="col">ID</th><th scope="col">Token</th><th scope="col">e(t)</th></tr></thead>
      <tbody>${REPRESENTATION_VOCABULARY.map((word,i)=>`<tr data-embedding-entry="${word}" data-selected="${word===token}"><td>${i+1}</td><th scope="row">${word}</th><td>(${embeddings[word].join(', ')})</td></tr>`).join('')}</tbody></table>
    </div>
    <div class="embedding-panel embedding-space"><h4>2. Retrieved vector</h4>
      <svg viewBox="0 0 210 200" role="img" aria-label="Vector for ${token}: (${selected.join(', ')}). Coordinates chosen for this example.">
        <defs><marker id="embedding-vector-tip" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7 Z" fill="currentColor"/></marker></defs>
        <g class="embedding-grid">${[-1,0,1].map(v=>`<path d="M${px(v)} 30 V170 M20 ${py(v)} H180"/>`).join('')}</g>
        <g class="embedding-axis"><path d="M20 104 H184 M94 174 V26"/><text x="187" y="109">x₁</text><text x="100" y="23">x₂</text><text x="80" y="121">0</text></g>
        <path class="embedding-vector" pathLength="1" d="M94 104 L${px(selected[0])} ${py(selected[1])}" marker-end="url(#embedding-vector-tip)"/>
        ${REPRESENTATION_VOCABULARY.map(word=>{const [x,y]=embeddings[word];return `<g class="embedding-point" data-selected="${word===token}"><circle cx="${px(x)}" cy="${py(y)}" r="${word===token?6:4}"/><text x="${px(x)+9}" y="${py(y)-9}">${word}</text></g>`;}).join('')}
      </svg>
      <p class="embedding-vector-label">e(${token}) = <strong>(${selected.join(', ')})</strong></p>
    </div>
    <div class="embedding-panel"><h4>3. Ordered matrix Xₑ(s)</h4>
      <table class="embedding-output"><caption class="embedding-table-caption">Row i receives e(tᵢ)ᵀ</caption><thead><tr><th scope="col">i</th><th scope="col">x₁</th><th scope="col">x₂</th></tr></thead>
      <tbody>${rows.map((row,i)=>`<tr data-embedding-output="${i}" data-selected="${i===position}"><th scope="row">${i+1}</th>${row.map(value=>`<td>${value}</td>`).join('')}</tr>`).join('')}</tbody></table>
    </div>
  </div>`;
}
