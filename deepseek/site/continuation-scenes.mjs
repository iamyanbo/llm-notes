import {scene,linear,unary,zip,columnSum,definition,ref,term,fmt} from './trace-scene.mjs';
export const continuationTitles={
 'singlepass-input':'Use the carried mixture while preparing the next one',
 'engram-gate':'The same retrieved value, two contextual gates',
 'patch-contrast':'Two patches with equal brightness and different arrangement',
 'fp4-reconstruct':'Retain scaled codes, then reconstruct their coordinates',
 'draft-bias':'A sampled predecessor changes the next slot’s distribution',
 'headwise-muon':'Split the optimizer blocks before taking their polar factors',
 'table-balance':'Row normalization changes the next column normalization',
 'hca-coarse':'Fewer entries mean fewer separately addressable regions'
};
const sigmoid=x=>1/(1+Math.exp(-x));
const rowNorm=a=>Math.sqrt(a.reduce((s,v)=>s+v*v,0));
const softmax=a=>{const e=a.map(Math.exp),z=e.reduce((s,v)=>s+v,0);return e.map(v=>v/z);};
const fp4=[-6,-4,-3,-2,-1.5,-1,-.5,0,.5,1,1.5,2,3,4,6];
const nearest=x=>fp4.reduce((a,b)=>Math.abs(x-b)<Math.abs(x-a)?b:a);
function rowNormScene(title,label,X,{columns=false}={}){
 const values=columns?[X[0].map((_,j)=>rowNorm(X.map(r=>r[j])))]:X.map(r=>[rowNorm(r)]);
 const cells=values.flatMap((r,i)=>r.map((result,j)=>{
  const terms=(columns?X.map(r=>r[j]):X[i]).map((v,k)=>term(v*v,`${fmt(v)}²`,[ref(0,columns?k:i,columns?j:k)]));
  return {row:i,col:j,result,terms,finish:`√${fmt(terms.reduce((s,t)=>s+t.value,0))} = ${fmt(result)}`};
 }));
 return scene(title,[{label,values:X}],values,cells,{output:columns?'One norm per feature column':'One norm per address / head row',operation:'Square → add → square root',note:'The divisor uses all coordinates on the selected axis. The following scene applies it.'});
}
export function continuationDefinition(kind){
 let s=[];
 if(kind==='singlepass-input'){
  const X=[[1,0],[0,1]];
  s=[linear('Read using the coefficients already carried','Two streams for one token',X,[[.8,.2]],{left:true,map:'Carried input coefficients',output:'Current sublayer input',note:'These chosen coefficients came from the preceding update. They are available before the current predictor finishes.'}),
   linear('The new coefficients describe a different mixture','Same two streams',X,[[.3,.7]],{left:true,map:'Newly predicted input coefficients',output:'Mixture the new coefficients would read',note:'V4.1 carries these newly predicted coefficients onward. Substituting them into the current read would change the function.'})];
 }else if(kind==='engram-gate'){
  const z=[[1],[-1]],g=z.map(r=>[sigmoid(r[0])]),v=[[2,-1],[2,-1]],gates=g.map(r=>[r[0],r[0]]);
  s=[unary('Convert the two context comparisons into gates','Comparisons z · two contextual cases',z,v=>sigmoid(Math.sign(v)*Math.sqrt(Math.max(Math.abs(v),1e-6))),{operation:'sigmoid(signed square root)',output:'One gate per contextual case',note:'Chosen comparisons +1 and −1. The retrieved value is held fixed.'}),
   zip('Scale the shared retrieved value','Same retrieved value in both cases',v,'Contextual gates',gates,(a,b)=>a*b,'×',{output:'Additions to the two residual cases',note:'The table address and value did not change. The wider contextual state supplied different gates.'})];
 }else if(kind==='patch-contrast'){
  s=[linear('Measure a contrast and a sum','Two chosen patches · one row each',[[0,1],[1,0]],[[1,1],[-1,1]],{map:'Chosen patch map · contrast | sum',output:'Contrast and total for each patch',note:'Both patches have total brightness one. The contrast retains their different arrangement. These are chosen weights, not learned model measurements.'})];
 }else if(kind==='fp4-reconstruct'){
  const x=[[.7,4]],scale=.5,scaled=x.map(r=>r.map(v=>v/scale)),codes=scaled.map(r=>r.map(nearest));
  s=[unary('Express values in scale units','Chosen values · shared exact scale .5',x,v=>v/scale,{operation:'÷ .5',output:'Scaled coordinates',note:'This first example fixes an exact scale. The following text derives the released scale-encoding rule.'}),
   unary('Round to E2M1 codes','Scaled coordinates',scaled,nearest,{operation:'Nearest finite code · max magnitude 6',output:'Retained codes',note:'1.4 rounds to 1.5; 8 saturates at 6. The scale is retained alongside the codes.'}),
   unary('Reconstruct in the original units','Retained codes',codes,v=>v*scale,{operation:'× stored scale .5',output:'Approximate coordinates',note:'The values become (.75, 3). At scale one, the same method instead gives (.5, 4). This is a chosen group, not a trained-cache error estimate.'})];
 }else if(kind==='draft-bias'){
  const log3=Math.log(3),base=[[0,0]],b1=[[log3,0]],b2=[[0,log3]];
  s=[zip('Adjust this slot using the known predecessor','Fixed heavy-slot base logits',base,'Chosen predecessor bias',b1,(a,b)=>a+b,'+',{output:'Adjusted logits',note:'Temperature one; two-ID vocabulary. The heavy slot computation remains fixed.'}),
   unary('Normalize the two exponentials','Adjusted logits',b1,(v,i,j)=>softmax(b1[0])[j],{operation:'exp(logit) ÷ sum exp',output:'First proposal probabilities',note:'The distribution is (.75, .25). ID 1 is one possible sample, not a forced choice.'}),
   zip('If ID 1 was sampled, adjust the following slot','Next fixed heavy-slot base logits',base,'Bias selected by sampled ID 1',b2,(a,b)=>a+b,'+',{output:'Next adjusted logits',note:'A small embedding/readout changes the conditional bias without recomputing the heavy blocks.'}),
   unary('Normalize the following slot','Next adjusted logits',b2,(v,i,j)=>softmax(b2[0])[j],{operation:'exp(logit) ÷ sum exp',output:'Next conditional probabilities',note:'The next distribution is (.25, .75) on this chosen conditional path.'})];
 }else if(kind==='headwise-muon'){
  const P=[[3,0],[3,4]],root=Math.sqrt(58),joint=[[7/root,-3/root],[3/root,7/root]],flatRefs=P.flatMap((r,i)=>r.map((_,j)=>ref(0,i,j)));
  s=[rowNormScene('Find each one-row head’s singular gain','Chosen update P · one row per head',P),
   unary('Normalize each one-row head separately','Chosen update P · one row per head',P,(v,i)=>v/rowNorm(P[i]),{operation:'Divide by this head’s singular gain',output:'Separate head polar factors',note:'Head 0 has norm 3; head 1 has norm 5. This is an optimizer stored-weight layout, output coordinates by input coordinates.'}),
   scene('Compare with one joint matrix polar factor',[{label:'Same chosen update P',values:P}],joint,joint.flatMap((r,i)=>r.map((v,j)=>({row:i,col:j,result:v,terms:[term(v,`Exact joint polar coordinate = ${fmt(v)}`,flatRefs)]}))),{operation:'Exact joint polar factor · all entries coupled',output:'Joint factor Q',note:'Q = [[7, −3], [3, 7]] / √58. This analytic comparison isolates the block choice; it is not the production polynomial iteration or a quality measurement.'})];
 }else if(kind==='table-balance'){
  const P=[[3,-4],[0,1]],r=P.map(a=>a.map(v=>v/rowNorm(a))),norms=r[0].map((_,j)=>rowNorm(r.map(a=>a[j])));
  s=[rowNormScene('Find each active address row’s norm','Chosen table update · rows are addresses',P),
   unary('Normalize the active address rows','Chosen table update · rows are addresses',P,(v,i)=>v/rowNorm(P[i]),{operation:'Divide by this row’s Euclidean norm',output:'Row-normalized update',note:'The row norms are 5 and 1. The signs remain part of the update.'}),
   rowNormScene('Find the new feature-column norms','Row-normalized update',r,{columns:true}),
   unary('Normalize the feature columns next','Row-normalized update',r,(v,i,j)=>v/norms[j],{operation:'Divide by this column’s norm',output:'After one column step',note:'Column norms are .6 and √1.64. The changed row norms explain why the reported procedure alternates eleven steps.'})];
 }else if(kind==='hca-coarse'){
  const values=[[0],[0],[8],[8],[0],[0],[0],[0]];
  const products=values.map(r=>[r[0]/8]);
  s=[linear('Retain four separately addressed pair summaries','Eight chosen source positions',values,[[.5,.5,0,0,0,0,0,0],[0,0,.5,.5,0,0,0,0],[0,0,0,0,.5,.5,0,0],[0,0,0,0,0,0,.5,.5]],{left:true,map:'Chosen equal pair weights',output:'Four global entries',note:'The elevated pair remains separately addressable. These small groups illustrate the tradeoff; they are not V4’s released block sizes.'}),
   unary('Give all eight positions one equal share','Same eight source values',values,v=>v/8,{operation:'× 1/8',output:'Contributions to one coarse entry',note:'The coarse case uses the same source values, now combined into a single address.'}),
   columnSum('Retain one coarse entry','Eight weighted source contributions',products,{output:'One global entry',note:'The retained coordinate is 2. Attention cannot separately address the elevated pair through this single summary.'})];
  // Keep the full map visible, but animate only the two source positions in a pair.
  s[0].cells.forEach(c=>{c.terms=c.terms.filter(t=>s[0].parameters.values[t.weight[0]][t.weight[1]]!==0);});
 }else throw new RangeError('Unknown continuation calculation: '+kind);
 return definition(s);
}
