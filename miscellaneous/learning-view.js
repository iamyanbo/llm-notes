import {n,text,rect,line,svg,metrics,pathLine,point} from './lab-graphics.js';
export function learningView(data){
  const k=data.kind;
  if(k==='scaling-fit'){
    let body=text(20,25,'Baseline: 2B parameters trained on 100B tokens');
    const rows=[['Parameters',data.parameters/2,data.parameters+'B','active'],['Training tokens',data.tokens/100,n(data.tokens)+'B','warm']];
    rows.forEach(([label,multiple,count,style],i)=>{
      const y=65+i*95;
      body+=text(20,y+15,label)+text(20,y+39,count,'small')+rect(190,y,multiple*52,37,style)+line(242,y-8,242,y+47,'axis')+text(632,y+25,n(multiple,2)+'×','','end');
    });
    body+=text(190,257,'Dashed mark: the original amount','small');
    return {html:svg(body,280)+metrics([['Parameters',n(data.parameters)+' billion'],['Training tokens',n(data.tokens)+' billion'],['Estimated weight work',n(data.compute,2)+' × 10²¹ FLOPs']]),status:'Training-work multiplier: '+n(data.multiplier,2)+'×. Doubling both counts multiplies the estimate by four.',note:'Illustrative resource counts. Each bar is relative to its own baseline, and estimated weight work is calculated as 6ND. Prediction quality must be measured in a training experiment.'};
  }
  if(k==='model-history'){
    const x=b=>255+Math.log10(b/.1)*60;
    const height=105+data.models.length*63;
    let body=text(20,25,'Blue: total parameters · rust: active per token for MoE','small')+text(20,49,'Parameter axis: each interval is a tenfold increase','small');
    [.1,1,10,100,1000,10000].forEach(v=>{body+=line(x(v),80,x(v),height-37,'axis')+text(x(v),70,v>=1000?v/1000+'T':v+'B','small','middle')+text(x(v),height-17,v>=1000?v/1000+'T':v+'B','small','middle');});
    data.models.forEach((model,i)=>{
      const y=78+i*63,selected=model===data.selected;
      body+=text(20,y+15,model.name)+text(20,y+34,model.year+' · '+(model.active?'MoE':'dense'),'small');
      if(i<=data.step){
        body+=line(255,y+12,x(model.billions),y+12,'vector-blue')+point(x(model.billions),y+12)+text(646,y+9,model.billions>=1000?model.billions/1000+'T':model.billions+'B','small','end');
        if(model.active)body+=line(255,y+33,x(model.active),y+33,'vector-rust')+point(x(model.active),y+33)+text(646,y+38,model.active+'B active','small','end');
      }
      if(selected)body+=rect(9,y-5,3,43,'active');
    });
    return {html:svg(body,height)+metrics([['Selected model',data.selected.name],['Total parameters',data.selected.billions>=1000?data.selected.billions/1000+' trillion':data.selected.billions+' billion'],['Active per token',data.selected.active?data.selected.active+' billion':'Dense model']]),status:'Counts describe the model; a capability measurement requires a separate task.',note:'The horizontal axis is logarithmic: equal distances mean equal ratios. A billion is 10⁹; a trillion is 1,000 billion. Model reports linked in the text supply the counts.'+(data.choice===1?' Qwen3.8-27B counts its language component; its separate vision encoder is excluded.':'')};
  }
  if(k==='lifetime-compute'){
    let body=text(20,25,'7B parameters · trained on 1T tokens');
    body+=text(20,80,'Training once','small')+rect(190,52,data.training*48,43,'active')+text(645,80,n(data.training)+'','','end');
    body+=text(20,160,'Later inference','small')+rect(190,131,data.inference*48,43,'warm')+text(645,160,n(data.inference)+'','','end');
    body+=text(190,210,'Bar units: 10²² floating-point operations','small');
    return {html:svg(body,239)+metrics([['Later processed tokens',n(data.tokens)+' trillion'],['Training work','4.2 × 10²² FLOPs'],['Later weight work',n(data.inference)+' × 10²² FLOPs']]),status:'After '+n(data.tokens)+' trillion inference tokens: 4.2 + '+n(data.inference)+' = '+n(data.total)+' in units of 10²² FLOPs.',note:'The weights remain fixed during inference. These estimates count dense-weight work, using six operations per parameter-token in training and two at inference.'};
  }
  if(k==='learning-update'){
    const minimum=Math.min(0,...data.series.map(v=>v.weight)),maximum=Math.max(1.5,...data.series.map(v=>v.weight)),span=Math.max(.1,maximum-minimum);
    const x=i=>65+i*46.5,y=w=>228-(w-minimum)/span*180;
    let body=line(65,228,625,228,'axis')+line(65,228,65,32,'axis')+pathLine(data.series.map(v=>[x(v.step),y(v.weight)]));
    body+=line(65,y(1.5),625,y(1.5),'axis')+point(x(data.step),y(data.weight))+text(58,49,n(maximum),'small','end')+text(58,228,n(minimum),'small','end')+text(65,24,'weight w','small')+text(625,254,'update number','','end');
    [0,3,6,9,12].forEach(v=>{body+=text(x(v),245,v,'small','middle');});
    return {html:svg(body)+metrics([['Weight',n(data.weight,4)],['Prediction 2w',n(data.prediction,4)],['Loss',n(data.loss,4)]]),status:'Update '+data.step+': error multiplier 1 − 4η = '+n(data.factor)+'. '+(data.convergent?'Its magnitude is below one.':'Its magnitude is not below one; contraction is not guaranteed.'),note:'Exact scalar quadratic: x = 2, y = 3, w₀ = 0. The plotted weight scale adapts to the chosen learning rate; it is not an LLM training experiment.'};
  }
  if(k==='learning-curves'){
    const x=u=>65+u*28,y=l=>230-l*48;
    let body=line(65,230,625,230,'axis')+line(65,230,65,32,'axis');
    body+=pathLine(data.curves.map(v=>[x(v.updates),y(v.training)]));
    body+='<path d="'+data.curves.map((v,i)=>(i?'L':'M')+x(v.updates)+' '+y(v.heldOut)).join(' ')+'" fill="none" stroke="var(--rust)" stroke-width="3"/>';
    body+=point(x(data.updates),y(data.training))+point(x(data.updates),y(data.heldOut))+text(76,25,'Blue: learning examples · rust: new checking examples','small')+text(625,254,'update count','','end')+text(20,50,'Loss','small');
    [0,5,10,15,20].forEach(v=>{body+=text(x(v),245,v,'small','middle');});
    [0,1,2,3,4].forEach(v=>{body+=text(55,y(v)+4,v,'small','end');});
    return {html:svg(body)+metrics([['Loss on learning examples',n(data.training,3)],['Loss on new examples',n(data.heldOut,3)],['Updates',data.updates]]),status:data.updates<=8?'Both measurements improve during these early updates.':'Loss on the training examples keeps falling; loss on the new examples has begun rising.',note:'Hand-chosen curves illustrate possible overfitting. The new checking examples are held out from the parameter updates; these curves are not measurements from a trained LLM.'};
  }
  if(k==='distillation'){
    let body=text(20,25,'Target and student probabilities in a three-token vocabulary');
    for(let i=0;i<3;i++){body+=text(20,75+i*61,['cat','dog','the'][i],'small')+rect(111,47+i*61,data.target[i]*465,15,'warm')+rect(111,68+i*61,data.probabilities[i]*465,15,'active')+text(644,62+i*61,n(data.target[i],3),'small','end')+text(644,84+i*61,n(data.probabilities[i],3),'small','end');}
    return {html:svg(body,255)+metrics([['Updates',data.steps],['Logits',data.logits.map(v=>n(v,3)).join(', ')]]),status:'Target (warm) '+data.target.join(', ')+'. Student (blue) '+data.probabilities.map(v=>n(v,4)).join(', ')+'.',note:'Teacher probabilities are supplied by hand. The student starts uniformly and takes softmax cross-entropy updates at learning rate 0.3; the optional calculation below explains them.'};
  }
  return null;
}
