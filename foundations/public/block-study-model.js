import {softmax} from './context-model.js';
export const B1=[[1,1],[1,-1],[-1,0]],B2=[[1,0,0],[0,1,-1]];
export const OUTPUT_MAPS={select:[[1,0,0,0],[0,0,0,1]],mix:[[.5,0,.5,0],[0,.5,0,.5]]};
export const mv=(M,x)=>M.map(row=>row.reduce((sum,w,c)=>sum+w*x[c],0));
export const add=(a,b)=>a.map((v,c)=>v+b[c]);
export function normalization(x,gamma=x.map(()=>1),beta=x.map(()=>0)){
  const mean=x.reduce((a,b)=>a+b,0)/x.length;
  const centered=x.map(v=>v-mean),variance=centered.reduce((s,v)=>s+v*v,0)/x.length,denominator=Math.sqrt(variance+1e-5);
  const standardized=centered.map(v=>v/denominator),output=standardized.map((v,c)=>gamma[c]*v+beta[c]);
  return {mean,centered,variance,denominator,standardized,output};
}
export function feedForward(x,activate=true){
  const hidden=mv(B1,x),activated=activate?hidden.map(v=>Math.max(0,v)):hidden;
  return {hidden,activated,output:mv(B2,activated)};
}
export function toyBlock(X){
  const scores=[ [.8,.2], [.1,.9] ].map(weights=>{
    const keyMap=weights.map(Math.log);
    return X.map(query=>X.map(key=>query[1]*key.reduce((sum,v,c)=>sum+keyMap[c]*v,0)));
  });
  const weights=scores.map(head=>head.map(softmax));
  const heads=weights.map(head=>head.map(row=>[0,1].map(c=>row.reduce((sum,a,j)=>sum+a*X[j][c],0))));
  const O=X.map((_,i)=>mv(OUTPUT_MAPS.select,[...heads[0][i],...heads[1][i]]));
  const R=X.map((x,i)=>add(x,O[i])),U=R.map(x=>normalization(x).output),T=U.map(x=>feedForward(x).output);
  const Z=U.map((x,i)=>add(x,T[i])),Y=Z.map(x=>normalization(x).output);
  return {X,scores,weights,heads,O,R,U,T,Z,Y};
}
export const STUDIES={
  heads:{title:'Keep the heads separate, then choose an output',labels:['Two heads','Concatenate','Output row 1','Output row 2']},
  residual:{title:'Follow both paths into the addition',labels:['Input','Split paths','Add coordinates']},
  feed:{title:'Follow one vector through the network',labels:['Input','First map','Activation','Second map']},
  norm:{title:'Normalize one representation',labels:['Input','Center','Divide by spread','Gain and offset']},
  block:{title:'One complete block, one receiving position',labels:['Input','Attention','First addition','First norm','Feed-forward','Second addition','Second norm']},
};
export function studyFrame(kind,options={},step=0){
  let nodes,operations,details=[],caption,links=[];
  if(kind==='heads'){
    const h1=[.8,.2],h2=[.1,.9],u=[...h1,...h2],W=OUTPUT_MAPS[options.map??'select'],o=mv(W,u);
    nodes=[{label:'Head 1',v:h1,x:25,y:36,at:0,tone:'blue'},{label:'Head 2',v:h2,x:25,y:193,at:0,tone:'rust'},{label:'u · four coordinates',v:u,x:248,y:113,w:224,at:1},{label:'o · two coordinates',v:o,x:777,y:113,at:2,count:Math.max(0,step-1)}];
    operations=[{x:524,y:67,w:200,label:'W_O · output map',matrix:W,current:step>=2?step-2:null}];
    const c=Math.max(0,Math.min(1,step-2)),products=W[c].map((w,j)=>w*u[j]);
    caption=step===0?'The two heads have produced different combinations. Keep their two pairs of coordinates visible.':step===1?'Copy Head 1 into slots 1–2 and Head 2 into slots 3–4. Concatenation keeps all four numbers; it performs no averaging.':`Output coordinate ${c+1}: ${W[c].map((w,j)=>`(${w} × ${u[j]})`).join(' + ')} = ${products.map(v=>Number(v.toFixed(3))).join(' + ')} = ${Number(o[c].toFixed(3))}. Each row of W_O produces one output coordinate.`;
    details=[['W_O',W]];links=[{from:0,to:2,at:1,part:[0,1]},{from:1,to:2,at:1,part:[2,3]},{from:2,to:3,at:2,operation:0,coordinate:0},{from:2,to:3,at:3,operation:0,coordinate:1}];
  }
  if(kind==='residual'){
    const x=[0,1],o=options.update==='zero'?[0,0]:options.update==='cancel'?[0,-1]:[.8,.9],z=add(x,o);
    nodes=[{label:'Original x',v:x,x:25,y:112,at:0},{label:'Attention update o',v:o,x:284,y:30,at:1,tone:'rust'},{label:'Bypass copy of x',v:x,x:284,y:205,at:1},{label:'z = x + o',v:z,x:777,y:112,at:2}];
    operations=[{x:534,y:93,w:165,label:'Coordinate addition',lines:x.map((v,c)=>`${v} + ${o[c]} = ${z[c]}`)}];
    caption=step===0?'The original representation is available before we compute an update.':step===1?'Keep x on the bypass while the attention branch supplies o. The update shown here was chosen in the preceding example.':`Add corresponding coordinates: (${x.join(', ')}) + (${o.join(', ')}) = (${z.join(', ')}). ${options.update==='zero'?'A zero update leaves x unchanged.':options.update==='cancel'?'Here the update cancels x. Residual addition permits an identity contribution; it does not guarantee recoverability.':'Both paths have arrived at the same representation.'}`;
    links=[{from:0,to:1,at:1,label:'attention branch'},{from:0,to:2,at:1,label:'identity bypass'},{from:1,to:3,at:2,operation:0},{from:2,to:3,at:2,operation:0}];
  }
  if(kind==='feed'){
    const x=[.8,1.9],r=feedForward(x,options.relu!==false);
    nodes=[{label:'Input z · 2 coordinates',v:x,x:25,y:112,at:0},{label:'B₁z · 3 coordinates',v:r.hidden,x:272,y:112,at:1},{label:options.relu!==false?'ReLU(B₁z)':'No activation',v:r.activated,x:521,y:112,at:2},{label:'F(z) · 2 coordinates',v:r.output,x:777,y:112,at:3}];
    operations=[{x:72,y:220,w:364,label:'First map: B₁ · 3 rows, 2 columns',matrix:B1},{x:526,y:220,w:364,label:'Second map: B₂ · 2 rows, 3 columns',matrix:B2}];
    caption=['Begin with z = (0.8, 1.9). We will inspect this network separately from normalization.','The three rows of B₁ produce 0.8 + 1.9 = 2.7, 0.8 − 1.9 = −1.1, and −0.8.',options.relu!==false?'ReLU acts on each coordinate. The positive 2.7 remains; the negative coordinates become zero.':'Removing ReLU passes the signed intermediate coordinates straight to B₂.',`B₂ returns to two coordinates: (${r.output.map(v=>Number(v.toFixed(3))).join(', ')}). Toggle the activation to compare with the affine composition.`][step];
    details=[['B₁',B1],['B₂',B2]];links=[{from:0,to:1,at:1},{from:1,to:2,at:2},{from:2,to:3,at:3}];
  }
  if(kind==='norm'){
    const shift=options.shift??0,scale=options.scale??1,x=[1,2,3].map(v=>v*scale+shift),affine=options.affine??false,gamma=affine?[2,1,.5]:[1,1,1],beta=affine?[0,1,-1]:[0,0,0],r=normalization(x,gamma,beta);
    nodes=[{label:'One position: z',v:x,x:25,y:112,at:0},{label:'z − μ(z)',v:r.centered,x:272,y:112,at:1},{label:'Standardized',v:r.standardized,x:521,y:112,at:2},{label:'γ ⊙ standardized + β',v:r.output,x:777,y:112,at:3}];
    operations=[{x:105,y:239,w:300,label:'Statistics of this vector',lines:[`mean = ${r.mean.toFixed(3)}`,`variance = ${r.variance.toFixed(3)}`,`√(variance + ε) = ${r.denominator.toFixed(3)}`]},{x:525,y:239,w:330,label:'Coordinate gains and offsets',lines:[`γ = (${gamma.join(', ')})`,`β = (${beta.join(', ')})`,'ε = 0.00001']}];
    caption=[`Only these three coordinates supply the statistics. The common offset is ${shift}; the scale multiplier is ${scale}.`,`Subtract the mean ${r.mean.toFixed(3)} from each coordinate. Changing only the common offset gives the same centered vector.`,`Divide every centered coordinate by ${r.denominator.toFixed(3)}. A single denominator is shared within this vector.`,affine?'Apply the selected gains (2, 1, 0.5) and offsets (0, 1, −1) coordinate by coordinate. Their values would be learned in a model.':'With gains all one and offsets all zero, the final vector equals the standardized vector. Turn on the affine parameters to see their effect.'][step];
    links=[{from:0,to:1,at:1},{from:1,to:2,at:2},{from:2,to:3,at:3}];
  }
  if(kind==='block'){
    const layer=options.layer??1,initial=[[1,0],[0,1]],first=toyBlock(initial),r=layer===1?first:toyBlock(first.Y),row=1;
    const values=[r.X[row],r.O[row],r.R[row],r.U[row],r.T[row],r.Z[row],r.Y[row]],labels=['x','o = M(X)ᵢ','x + o','u = N₁(x + o)','t = F(u)','u + t','y = N₂(u + t)'];
    nodes=values.map((v,j)=>({label:labels[j],v,x:12+148*j,y:105,w:127,at:j}));
    operations=[];
    caption=[`Follow the second receiving position through block ${layer}. The attention operation can read both input rows.`,'Both heads read the sequence; joining and projecting their outputs gives this attention update.','Add the original x to the attention update. The first bypass preserves access to the original input.','Normalize the coordinates of the first residual sum. This u, not the unnormalized sum, enters the feed-forward network.','Apply B₁, ReLU, and B₂ to u. This produces an update t at the receiving position.','Add t to the normalized representation u, using the second bypass.','Normalize the second residual sum. Its output becomes the incoming representation for a subsequent block.'][step];
    links=nodes.slice(1).map((_,j)=>({from:j,to:j+1,at:j+1}));
    links.push({from:0,to:2,at:2,bypass:true},{from:3,to:5,at:5,bypass:true});
    details=[['B₁',B1],['B₂',B2],['W_O',OUTPUT_MAPS.select],['Input rows',r.X]];
  }
  return {kind,step,nodes,operations,links,details,caption,labels:STUDIES[kind].labels};
}
