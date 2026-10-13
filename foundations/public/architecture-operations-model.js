import {ATTENTION_EXAMPLE} from './attention-study.js';
import {B1,B2,mv,add,feedForward,normalization} from './block-study-model.js';
import {softmax} from './context-model.js';
export const OPERATION_KINDS={
  embedding:{title:'Embeddings and positions',labels:['Look up a token','Scale its vector','Add its position']},
  feed:{title:'Position-wise feed-forward',labels:['Input vector','First matrix','ReLU','Second matrix']},
  mask:{title:'Masked decoder attention',labels:['Scaled scores','Apply causal mask','Normalize the row','Combine values']},
  cross:{title:'Encoder–decoder attention',labels:['Two sources','Compare Q with K','Normalize scores','Combine encoder values']},
  norm:{title:'Residual addition and normalization',labels:['Two paths','Add coordinates','Subtract the mean','Divide by spread','Gain and offset']},
  output:{title:'Output projection and probabilities',labels:['Decoder vector','Vocabulary scores','Positive amounts','Probabilities']},
};
export const OPERATION_PANELS=[
  {key:'0',kind:'embedding'}, {key:'2',kind:'feed',title:'Encoder feed-forward'},
  {key:'3',kind:'mask'}, {key:'4',kind:'cross'}, {key:'5',kind:'feed',title:'Decoder feed-forward'},
  {key:'6',kind:'output'},
  ...['114-418','114-302','462-418','462-298','462-178'].map(position=>({key:'norm-'+position,kind:'norm'})),
];
export function maskedExample(row=1){
  const {scores,V}=ATTENTION_EXAMPLE;
  const masked=scores.map((values,i)=>values.map((v,j)=>j>i?-Infinity:v));
  const weights=softmax(masked[row]),output=[0,1].map(c=>weights.reduce((sum,a,j)=>sum+a*V[j][c],0));
  return {scores,masked,weights,output,V};
}
export function crossExample(){
  const q=[.5,1],K=[[1,0],[0,1],[1,1]],V=[[.5,0],[0,1],[1,.5]];
  const scores=K.map(k=>q.reduce((sum,v,c)=>sum+v*k[c],0)/Math.sqrt(2)),weights=softmax(scores);
  return {q,K,V,scores,weights,output:[0,1].map(c=>weights.reduce((sum,a,j)=>sum+a*V[j][c],0))};
}
export const VOCABULARY=['dog','cat','chased'],VOCAB_MAP=[[2,0],[0,1],[-1,0]];
const fmt=v=>Number.isFinite(v)?Number(v.toFixed(3)).toString():'−∞';
const tuple=x=>'('+x.map(fmt).join(', ')+')';
export function operationFrame(kind,step=0,row=1){
  const nodes=[],maps=[],edges=[];let caption;
  const node=(label,data,x,y,at=0,w=200,tone='blue',labels=null)=>{
    nodes.push({label,data:Array.isArray(data[0])?data:[data],x,y,at,w,tone,labels});return nodes.length-1;
  };
  const edge=(from,to,at,extra={})=>edges.push({from,to,at,...extra});
  if(kind==='embedding'){
    const e=[.5,1],scaled=e.map(v=>Math.sqrt(2)*v),position=[Math.sin(1),Math.cos(1)],out=add(scaled,position);
    node('E[dog] · two coordinates',e,20,55);node('√2 E[dog]',scaled,240,55,1);node('x at position 1',out,460,55,2);
    node('Position 1: (sin 1, cos 1)',position,460,255,0,200,'rust');
    edge(0,1,1);edge(1,2,2);edge(3,2,2);
    caption=['A token selects one row of the learned table. In this example E[dog] = (0.5, 1).',
      'With model width 2, multiply both coordinates by √2: '+tuple(scaled)+'.',
      'Add corresponding coordinates of the position vector: '+tuple(scaled)+' + '+tuple(position)+' = '+tuple(out)+'.'][step];
  }else if(kind==='feed'){
    const x=[.8,1.9],f=feedForward(x);
    node('Incoming x',x,20,25);node('B₁x · three coordinates',f.hidden,460,25,1);
    node('ReLU(B₁x)',f.activated,460,255,2);node('B₂ ReLU(B₁x)',f.output,20,255,3);
    maps.push({label:'B₁ · 3 × 2',matrix:B1,x:250,y:23,w:180,at:1},{label:'B₂ · 2 × 3',matrix:B2,x:250,y:250,w:180,at:3});
    edge(0,1,1,{map:0});edge(1,2,2);edge(2,3,3,{map:1});
    caption=['Use the same network separately at each position. These example biases are zero.',
      'Matrix rows form the sum, difference, and negative first coordinate: (2.7, −1.1, −0.8).',
      'ReLU keeps positive coordinates and replaces negative coordinates by zero: (2.7, 0, 0).',
      'The second matrix returns to two coordinates. Its rows give 2.7 and 0 − 0, so the output is (2.7, 0).'][step];
  }else if(kind==='mask'){
    const m=maskedExample(row);
    node(step===3?'V · decoder values':'S · scaled comparisons',step===3?m.V:m.scores,20,20,0,290,step===3?'rust':'blue');
    node('S + M · later positions blocked',m.masked,350,20,1,310);
    node('a'+(row+1)+' · receiving row',m.weights,350,265,2,310);
    node('Σ aⱼvⱼ · output',m.output,20,265,3,290);
    edge(0,1,1,{mask:true});edge(1,2,2);edge(2,3,3);
    edge(0,3,3);
    caption=['Select a receiving position. Scores alone allow comparison with all three positions.',
      'At receiving position '+(row+1)+', columns after '+(row+1)+' are set to −∞ before softmax. The current position remains available.',
      'Softmax gives '+tuple(m.weights)+'. A blocked score has exp(−∞) = 0, hence exactly zero weight.',
      'Combine only the permitted values '+m.V.map(tuple).join(', ')+': Σ aⱼvⱼ = '+tuple(m.output)+'. Later positions contribute zero.'][step];
  }else if(kind==='cross'){
    const c=crossExample();
    node('Q · decoder query',c.q,20,20);node('S · query–key scores',c.scores,240,20,1);
    node('A · weights',c.weights,460,20,2);
    node('K · encoder keys',c.K,20,225,0,200,'rust');
    node('V · encoder values',c.V,460,225,0,200,'rust');
    node('Weighted encoder information',c.output,240,275,3);
    edge(0,1,1);edge(3,1,1);edge(1,2,2);edge(2,5,3);edge(4,5,3);
    caption=['The decoder supplies Q = (0.5, 1). K and V come from the encoder. The two sources remain separate.',
      'Compare the decoder query with each encoder key and divide by √2: '+tuple(c.scores)+'.',
      'Softmax turns those three scores into weights '+tuple(c.weights)+'.',
      'Those weights combine the encoder value vectors, giving '+tuple(c.output)+'. The decoder query chooses contributions; it is not one of the transmitted values.'][step];
  }else if(kind==='norm'){
    const x=[.5,1,1.5],update=[.5,1,1.5],r=add(x,update),n=normalization(r);
    node('Original input x',x,20,20);node('Sublayer update',update,20,250,0,200,'rust');
    node('r = x + update',r,240,20,1);node('r − μ(r)',n.centered,240,250,2);
    node('Divide by √(variance + ε)',n.standardized,460,250,3);node('Normalized output',n.output,460,20,4);
    edge(0,2,1);edge(1,2,1);edge(2,3,2);edge(3,4,3);edge(4,5,4);
    caption=['Keep the original vector on the bypass while the sublayer computes an update.',
      'Add corresponding coordinates: (0.5, 1, 1.5) + (0.5, 1, 1.5) = (1, 2, 3).',
      'The coordinate mean of this one vector is 2. Subtract it to obtain (−1, 0, 1).',
      'Coordinate variance is 2/3. Divide by √(2/3 + 0.00001), giving '+tuple(n.standardized)+'.',
      'Apply learned coordinate gains and offsets. Here the gains are all 1 and offsets all 0, so the standardized coordinates are unchanged.'][step];
  }else if(kind==='output'){
    const h=[.8,.2],logits=mv(VOCAB_MAP,h),maximum=Math.max(...logits),exps=logits.map(v=>Math.exp(v-maximum)),probabilities=softmax(logits);
    node('Final decoder vector h',h,20,25);node('Vocabulary logits',logits,460,25,1,200,'blue',VOCABULARY);
    node('exp(logit − max)',exps,460,255,2,200,'blue',VOCABULARY);
    node('Next-token probabilities',probabilities,20,255,3,200,'blue',VOCABULARY);
    maps.push({label:'W_vocab · 3 × 2',matrix:VOCAB_MAP,x:250,y:23,w:180,at:1});
    edge(0,1,1,{map:0});edge(1,2,2);edge(2,3,3);
    caption=['Use three candidate tokens and a zero projection bias to inspect this example. An actual model uses its full vocabulary.',
      'One matrix row per candidate gives logits (1.6, 0.2, −0.8). These are scores, not probabilities.',
      'Subtract the largest logit, 1.6, then exponentiate: '+tuple(exps)+'. This common shift preserves softmax.',
      'Divide each positive amount by their sum '+fmt(exps.reduce((s,v)=>s+v,0))+'. Probabilities are '+tuple(probabilities)+' and sum to 1.'][step];
  }
  return {kind,step,row,nodes,maps,edges,caption,labels:OPERATION_KINDS[kind].labels};
}
