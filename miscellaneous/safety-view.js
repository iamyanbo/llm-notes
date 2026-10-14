import {n,text,rect,line,svg,metrics,pathLine,point,transfer} from './lab-graphics.js';
const box=(x,y,w,label,value,active=false)=>rect(x,y,w,64,active?'active':'face')+text(x+w/2,y+24,label,'small','middle')+text(x+w/2,y+48,value,'','middle');
function matrix(x,y,values,label){let body=text(x,y-16,label);values.forEach((row,i)=>row.forEach((v,j)=>{body+=rect(x+j*66,y+i*48,59,39,'active')+text(x+j*66+29.5,y+i*48+25,n(v),'','middle');}));return body;}
export function safetyView(d){
  const k=d.kind;
  if(k==='decision-objectives'){
    let body=text(20,25,'Prediction is correct with probability 0.9');
    body+=box(25,60,240,'Act · expected loss',d.step>=1?n(d.act):'pending',d.step>=3&&d.better==='Act')+box(365,60,240,'Perfect review · cost',d.step>=2?d.review:'pending',d.step>=3&&d.better==='Review');
    body+=text(20,179,'Change the cost of a wrong action; confidence stays fixed.','small');
    return {html:svg(body,207)+metrics([['Wrong-action cost',d.cost],['Lower expected loss',d.step>=3?d.better:'compare losses']]),status:d.step<3?['Start with the specified correctness probability.','Calculate the expected loss from acting.','Include the cost of perfect review.'][d.step]:'Act: 0.1 × '+d.cost+' = '+n(d.act)+'. Review: 2.',note:'Chosen loss units and perfect-review assumption. Consent and permission constraints are outside this cost comparison; probability calibration matters.'};
  }
  if(k==='incident-boundaries'){
    const labels=['Evaluation goal','Isolation','Coordination','External effect','Response'];
    let body=text(20,25,'An abstract incident sequence, not an exploit walkthrough');
    labels.forEach((label,i)=>{const x=22+(i%3)*219,y=55+Math.floor(i/3)*109;body+=box(x,y,193,label,['Assigned','Intended boundary','Unauthorized','Affected systems','Detection + review'][i],i===d.step);});
    body+=line(215,88,233,88)+line(434,88,452,88)+line(550,119,550,148)+line(550,148,119,148)+line(119,148,119,164)+line(215,196,233,196);
    return {html:svg(body,254),status:d.stages[d.step]+'.',note:'Conceptual sequence grounded in the linked accounts of the July 2026 research evaluation incident. No attack is simulated and no external system is contacted.'};
  }
  if(k==='refusal-projection'){
    let body='';
    if(d.choice===1){
      body=matrix(25,64,d.P,'Pₜ = I − t rrᵀ')+matrix(247,64,d.W,'W')+matrix(467,64,d.edited,'Pₜ W');
      body+=text(183,107,'×')+text(410,107,'=')+text(20,205,'Output dimensions are projected; every displayed entry is calculated.','small');
    }else{
      const map=([x,y])=>[220+x*58,211-y*40];
      body=line(40,211,564,211,'axis')+line(220,251,220,25,'axis');
      [-2,-1,0,1,2,3,4,5].forEach(v=>{body+=line(220+v*58,207,220+v*58,215,'axis')+text(220+v*58,233,v,'small','middle');});
      [-1,1,2,3,4].forEach(v=>{body+=line(216,211-v*40,224,211-v*40,'axis')+text(210,215-v*40,v,'small','end');});
      const origin=map([0,0]),original=map(d.h),retained=map(d.retained),removed=map(d.removed),direction=map(d.r.map(v=>v*4.8));
      body+=line(...origin,...direction,'axis')+line(...origin,...original,'wire')+line(...origin,...retained,'vector-blue')+line(...retained,...original,'vector-rust');
      body+=point(...original)+text(original[0]+8,original[1]-8,'h = (4, 3)')+text(retained[0]+9,retained[1]+17,'retained','small')+text(385,29,'r = (0.6, 0.8)','small');
      body+=text(30,272,'Ink: original h · blue: retained · rust: removed · dashed: r direction','small');
    }
    return {html:svg(body,d.choice===1?239:292)+metrics([['Removal',n(100*d.fraction)+'%'],['Retained coordinates','('+d.retained.map(v=>n(v)).join(', ')+')'],['rᵀ retained',n(d.remainingDot,3)]]),status:d.fraction===1?'The retained vector is orthogonal to r.':'A partial edit leaves a component along r.',note:'An exact geometric calculation with a normalized direction. These vectors and matrices are not extracted from a trained model; geometry does not establish a safety outcome.'};
  }
  if(k==='causal-intervention'){
    let body=box(25,98,135,'Input x',d.x.join(', '),d.step===0);
    body+=box(259,43,150,'h₁ = x₁',d.hidden[0],d.choice===1)+box(259,157,150,'h₂ = x₁ + x₂',d.hidden[1],d.choice===2)+box(510,98,150,'y = 2h₁ − h₂',d.output,d.step>=3);
    body+=line(160,130,259,75)+line(160,130,259,189)+line(409,75,510,130)+line(409,189,510,130);
    body+=text(435,87,'× 2','small')+text(435,188,'× −1','small');
    if(d.step===1)body+=transfer([93,130],[334,75],d.hidden[0]);
    if(d.step===2)body+=transfer([93,130],[334,189],d.hidden[1]);
    if(d.step===3)body+=transfer([334,75],[585,130],2*d.hidden[0])+transfer([334,189],[585,130],-d.hidden[1]);
    return {html:svg(body,254)+metrics([['Baseline output',d.baseline],['Intervened output',d.output],['Change',d.delta]]),status:'Original hidden values ('+d.original.join(', ')+'); used values ('+d.hidden.join(', ')+').',note:'A specified linear network, not a discovered LLM circuit. Setting a hidden value can create a state that does not naturally arise from any input.'};
  }
  if(k==='reasoning-channel'){
    const intermediate=d.choice===0?'Vocabulary token':d.choice===1?'Hidden trace':'Continuous state';
    let body=box(20,57,180,'Input','embedding',d.step===0)+box(246,57,180,'Transformer','hidden vector',d.step===1)+box(472,57,180,'Intermediate',intermediate,d.step===2);
    body+=line(200,89,234,89)+line(426,89,460,89);
    body+=line(562,121,562,159)+line(562,159,336,159)+line(336,159,336,121);
    body+=text(350,151,d.choice===2?'feed state as next embedding':'next input + retained context','small');
    body+=box(20,186,274,'What the observer receives',d.choice===0?'Chosen trace tokens':d.choice===1?'Separate displayed summary':'No intermediate vocabulary token',d.step===3);
    body+=box(370,186,282,'Final answer still needs a readout','Hidden state → output tokens',d.step===4);
    if(d.step===1)body+=transfer([110,89],[336,89],'embedding');
    if(d.step===2)body+=transfer([336,89],[562,89],'hidden state');
    if(d.step===3)body+=transfer([562,159],[336,159],d.choice===2?'state':'token input');
    return {html:svg(body,274),status:['Begin with embedded input.','Compute a continuous hidden state.','Choose or retain the intermediate representation.','Distinguish the observer’s access channel.','Read out a final textual answer.'][d.step],note:'Schematic alternatives, not a claim about an undisclosed model. Observable tokens and summaries do not by themselves prove faithful reporting of internal causes.'};
  }
  if(k==='unlearning-mean'){
    let body=text(20,25,'Three observations; the parameter is their squared-error minimizer');
    d.data.forEach((value,i)=>{body+=box(25+i*220,56,190,'Observation '+(i+1),value,value!==d.removed||d.step===0);if(value===d.removed&&d.step>=1)body+=line(25+i*220,56,215+i*220,120,'vector-rust');});
    body+=box(25,167,190,'Original mean',4,d.step===0)+box(245,167,190,'Remaining sum',d.step>=2?d.sum:'pending',d.step===2)+box(465,167,190,'New mean',d.step>=3?d.after:'pending',d.step>=3);
    body+=line(215,199,233,199)+line(435,199,453,199);
    return {html:svg(body,260)+metrics([['Removed observation',d.removed],['Exact update',d.after],['Retraining on remaining data',d.retrained]]),status:'(3 × 4 − '+d.removed+') / 2 = '+d.after+'. The exact update agrees with retraining.',note:'This model has a sufficient statistic: its sum and count. The formula is not a transformer unlearning method or a general privacy guarantee.'};
  }
  return null;
}
