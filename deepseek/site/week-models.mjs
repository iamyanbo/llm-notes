import {softmax,topK,visibleBlock} from './models.mjs';
export const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
export const matmul=(a,b)=>a.map(row=>b[0].map((_,j)=>dot(row,b.map(r=>r[j]))));
const add=(a,b)=>a.map((r,i)=>r.map((x,j)=>x+b[i][j]));
export function residualBridge(){
 const before=[1,0],update=[0,1],after=before.map((v,i)=>v+update[i]);
 const alternatives=[0,.5,1].map(weight=>({weight,input:before.map((v,i)=>(1-weight)*v+weight*after[i])}));
 return {before,update,after,streams:[before,after],alternatives};
}
export function residualWalkthrough(){
 const X=[[1,0],[0,1],[1,1],[2,0]],A=[[.25,.25,.25,.25]],B=[[.5,.5,0,0],[0,.5,.5,0],[0,0,.5,.5],[.5,0,0,.5]],C=[[.5],[1],[.5],[1]],update=[[2,-1]];
 const input=matmul(A,X),transport=matmul(B,X),injection=matmul(C,update),output=add(transport,injection);
 const nextInput=matmul(A,output),nextUpdate=[[-1,1]],next=add(matmul(B,output),matmul(C,nextUpdate));
 return {X,A,B,C,update,input,transport,injection,output,nextInput,nextUpdate,next};
}
export function poolingWalkthrough(){
 const H=[[1,0],[0,1]],WC=[[1,4],[5,2]],WZ=[[0,Math.log(3)],[Math.log(3),0]],P=[[0,0],[0,0]];
 const values=matmul(H,WC),scores=add(matmul(H,WZ),P),amounts=scores.map(r=>r.map(Math.exp));
 const weights=values.map((r,i)=>r.map((_,j)=>softmax(scores.map(s=>s[j]))[i]));
 const products=values.map((r,i)=>r.map((v,j)=>v*weights[i][j])),output=products[0].map((_,j)=>products.reduce((s,r)=>s+r[j],0));
 return {H,WC,WZ,P,values,scores,amounts,weights,products,output};
}
export function queryWalkthrough(){
 const x=[[3,4]],Wa=[[1,0],[0,1]],Wb=[[1,0,1,1],[0,1,1,-1]],raw=matmul(x,Wa)[0],rms=Math.sqrt(dot(raw,raw)/raw.length),latent=raw.map(v=>v/rms),expanded=matmul([latent],Wb)[0],heads=[expanded.slice(0,2),expanded.slice(2)];
 const normalized=heads.map(h=>{const r=Math.sqrt(dot(h,h)/h.length);return h.map(v=>v/r);});
 return {x,Wa,Wb,raw,rms,latent,expanded,heads,normalized};
}
export function indexerWalkthrough(k=2,query=15){
 const main=queryWalkthrough(),x=main.x,z=main.latent,WI=[[1/z[0],0,0,0],[0,0,0,1/z[1]]],Ww=[[2/3,1/3],[0,0]],expanded=matmul([z],WI)[0],queries=[expanded.slice(0,2),expanded.slice(2)],rawHeadWeights=matmul(x,Ww)[0],headScale=2,headWeights=rawHeadWeights.map(v=>v/headScale),keys=[[4,-1],[2,2],[-1,4],[0,1],[99,0]];
 const dots=keys.map(key=>queries.map(q=>dot(q,key))),positive=dots.map(r=>r.map(v=>Math.max(0,v))),scores=positive.map(r=>dot(r,headWeights)),valid=keys.map((_,i)=>visibleBlock(query,i,4));
 const selected=topK(scores.map((s,i)=>valid[i]?s:-Infinity),Math.min(k,valid.filter(Boolean).length)).sort((a,b)=>a-b);
 return {x,z,WI,Ww,expanded,rawHeadWeights,headScale,queries,headWeights,keys,dots,positive,scores,valid,selected,query};
}
export function attentionWalkthrough(sink=true){
 const query=[Math.SQRT2,0],entries=[[0,2],[Math.log(3),10]],logits=entries.map(v=>dot(query,v)/Math.SQRT2),amounts=logits.map(Math.exp),sinkAmount=sink?4:0,denominator=amounts.reduce((s,v)=>s+v,0)+sinkAmount,weights=amounts.map(v=>v/denominator),products=entries.map((r,i)=>r.map(v=>v*weights[i])),output=entries[0].map((_,j)=>products.reduce((s,r)=>s+r[j],0));
 return {query,entries,logits,amounts,sinkAmount,denominator,weights,products,output};
}
export function rotatePair(v,angle){return [Math.cos(angle)*v[0]-Math.sin(angle)*v[1],Math.sin(angle)*v[0]+Math.cos(angle)*v[1]];}
export function rotaryWalkthrough(shift=0){
 const source=shift,query=shift+1,base=[1,0],key=rotatePair(base,source*Math.PI/2),q=rotatePair(base,query*Math.PI/2),returned=rotatePair(key,-query*Math.PI/2);
 return {source,query,key,q,score:dot(q,key),returned};
}
export function groupedWalkthrough(){
 const heads=[[1,2,3,4],[5,6,7,8]],maps=[[[1],[0],[0],[0]],[[1],[0],[0],[0]]],intermediate=heads.map((r,i)=>matmul([r],maps[i])[0][0]),WO=[[1,0,1,0],[0,1,0,1]],output=matmul([intermediate],WO)[0];
 return {heads,maps,intermediate,WO,output};
}
export function readoutWalkthrough(){
 const X=residualWalkthrough().next,bias=[-Math.log(3),0,-Math.log(3),0],a=bias.map(v=>1/(1+Math.exp(-v))),mixed=matmul([a],X)[0],rms=Math.sqrt(dot(mixed,mixed)/2),normalized=mixed.map(v=>v/rms),WU=[[1,0,-1],[0,1,1]],logits=matmul([normalized],WU)[0];
 return {X,bias,a,mixed,rms,normalized,WU,logits,probabilities:softmax(logits)};
}
export function mtpWalkthrough(){
 const X=readoutWalkthrough().X,embedding=[0,1],WH=[[1,0],[0,1]],WE=[[1,0],[0,1]],rms=v=>Math.sqrt(dot(v,v)/v.length),divisors=X.map(rms),hiddenNormalized=X.map((v,i)=>v.map(a=>a/divisors[i])),embeddingRMS=rms(embedding),embeddingNormalized=embedding.map(v=>v/embeddingRMS),hidden=matmul(hiddenNormalized,WH),projected=matmul([embeddingNormalized],WE)[0],repeated=X.map(()=>[...projected]),fused=add(hidden,repeated);
 return {X,embedding,WH,WE,divisors,hiddenNormalized,embeddingRMS,embeddingNormalized,hidden,projected,repeated,fused};
}
export function muonWalkthrough(){
 const momentum=.95,previous=[0,0],rawGradient=[4/(1+momentum),1/(1+momentum)],buffer=rawGradient.map((g,i)=>momentum*previous[i]+g),gradient=buffer.map((v,i)=>momentum*v+rawGradient[i]),norm=Math.hypot(...gradient),initial=gradient.map(v=>v/norm),steps=[initial];
 for(let i=0;i<10;i++){const [a,b,c]=i<8?[3.4445,-4.775,2.0315]:[2,-1.5,.5];steps.push(steps.at(-1).map(v=>a*v+b*v**3+c*v**5));}
 const scale=.18*Math.sqrt(2),eta=.01,decay=.1,W=[1,1],direction=steps.at(-1).map(v=>v*scale),updated=W.map((v,i)=>(1-eta*decay)*v-eta*direction[i]);
 return {momentum,previous,rawGradient,buffer,gradient,norm,initial,steps,scale,eta,decay,W,direction,updated};
}
