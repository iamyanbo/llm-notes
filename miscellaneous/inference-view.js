import {n,text,rect,line,svg,metrics} from './lab-graphics.js';
import {REQUESTS} from './inference-models.js';
export function inferenceView(data){
  const k=data.kind;
  if(k==='deployment'){
    const locations=['user’s local equipment','deployer-controlled remote host','provider-managed service'],names=['Local machine','Controlled remote machine','Provider API'];
    let body=text(20,25,names[data.choice]);
    body+=rect(20,70,178,84,data.step===0?'active':'face')+text(109,99,'User application','','middle')+text(109,125,'prompt / result','small','middle');
    body+=line(199,109,242,109)+rect(244,70,242,84,data.step===1?'active':'face')+text(365,102,'Model computation','','middle')+text(365,126,locations[data.choice],'small','middle');
    body+=line(487,109,527,109)+rect(530,70,130,84,data.step>=2?'active':'face')+text(595,103,'Answer','','middle')+text(595,126,'returned to app','small','middle');
    return {html:svg(body,201),status:'Execution location: '+locations[data.choice]+'. Weight availability and permissions remain separate questions.',note:'Schematic deployment choices, not a measured or connected service. The surrounding application can have additional remote tools, logging, and storage.'};
  }
  if(k==='request-phases'){
    const columns=data.length,rows=data.choice===1?1:data.prompt,cell=Math.min(32,440/columns),x=173,y=52;
    let body=text(20,25,data.choice===1?'One new query row reads retained positions':'Known prompt rows with a causal allowed-pair pattern');
    for(let r=0;r<rows;r++)for(let c=0;c<columns;c++)body+=rect(x+c*cell,y+r*cell,cell-3,cell-3,data.choice===1||c<=r?(data.choice===1||r===data.step%rows?'active':'face'):'warm');
    body+=text(20,75,'query rows: '+rows,'small')+text(20,103,'key rows: '+columns,'small')+text(173,y+rows*cell+26,'Blue/ink: allowed · warm: masked','small');
    return {html:svg(body,Math.max(195,y+rows*cell+52))+metrics([['Allowed pairs',data.pairs],['Query shape',rows+' × dₕ'],['Score shape',rows+' × '+columns]]),status:data.choice===1?'Retained positions '+data.length+'. Old keys/values remain; one current query row is added.':'Prompt length '+data.prompt+' has '+data.prompt+'('+data.prompt+' + 1)/2 = '+data.pairs+' allowed pairs.',note:'Connectivity and matrix shapes only, not learned attention weights. Rows are highlighted for inspection; prefill need not execute them sequentially.'};
  }
  if(k==='request-schedule'){
    let body=text(20,25,data.serial?'Serial policy, leaving available slots unused':'Continuous admission up to '+data.capacity+' decode slots');
    const width=75;
    REQUESTS.forEach((request,r)=>{body+=text(20,80+r*62,request.id+': arrives '+request.arrival,'small');for(let t=0;t<data.duration;t++){const worked=data.timeline[t].selected.includes(r),shown=t<data.step;body+=rect(166+t*width,51+r*62,width-8,39,shown&&worked?'active':t<request.arrival?'warm':'face')+text(166+t*width+33,77+r*62,shown&&worked?'token':'','small','middle');}});
    for(let t=0;t<data.duration;t++)body+=text(166+t*width+33,256,t,'small','middle');
    return {html:svg(body)+metrics([['Final completions',data.completion.join(', ')],['Mean completion latency',n(data.mean,3)],['Current time',data.step]]),status:'At time '+data.step+', '+data.timeline.slice(0,data.step).reduce((s,t)=>s+t.selected.length,0)+' of 6 tokens have been produced. Final latencies: '+data.latencies.join(', ')+'.',note:'Three requests whose prompts have already been processed. Iterations have fixed unit duration and bounded decode slots; real iteration cost can vary with occupancy and workload.'};
  }
  if(k==='cache-blocks'){
    let body=text(20,25,'Four positions per physical block');
    for(const [row,length,blocks] of [[0,data.a,data.aBlocks],[1,data.b,data.bBlocks]]){body+=text(20,77+row*80,(row===0?'A':'B')+': '+length+' positions','small');for(let b=0;b<blocks;b++){const shared=data.shared&&b===0;body+=rect(170+b*132,48+row*80,120,47,shared?'face':'warm');if(shared)body+=text(230+b*132,78+row*80,'shared reference','small','middle');else for(let t=0;t<4;t++)body+=rect(177+b*132+t*27,57+row*80,22,28,b*4+t<length?'active':'face');}}
    if(data.shared)body+=rect(245,233,155,43,'active')+text(322,260,'one prefix block','small','middle')+line(230,97,285,233)+line(230,175,315,233);
    return {html:svg(body,data.shared?305:228)+metrics([['Physical blocks',data.physical],['Allocated positions',data.allocated],['Unused physical slots',data.waste]]),status:'Logical positions '+data.logical+'; unique retained positions '+data.unique+'. '+(data.shared?'The four-position prefix has two references but one physical block.':'No prefix sharing in this view.'),note:'Authored block layout. The reuse view uses B length 7; the separate view uses B length 3. Reuse requires compatible, identical prefixes and a supporting implementation.'};
  }
  if(k==='cache-expiry'){
    let body=text(20,25,'An unchanged 10,000-position prefix plus 200 new inputs');
    body+=rect(45,62,480,46,data.hit?'active':'warm')+text(285,91,data.hit?'Prefix calculation reused':'Prefix calculation is not reused','','middle');
    body+=line(60,186,625,186,'axis')+text(60,215,'0 min','small')+text(625,215,'90 min','small','end');
    const expiryX=60+data.ttl/90*565,gapX=60+data.gap/90*565;
    body+=line(expiryX,140,expiryX,194)+text(expiryX,132,data.ttl+' min retention','small','middle')+'<circle cx="'+gapX+'" cy="186" r="7" class="signal"/>';
    return {html:svg(body,249)+metrics([['Cache-read tokens',data.cached],['Uncached input tokens',data.uncached],['Selected request units',n(data.cost)]]),status:'Pause '+n(data.gap)+' min; '+(data.stable?'same prefix':'changed prefix')+'. '+(data.hit?'Toy cache hit.':'Toy cache miss.')+' The full context still contains 10,200 input tokens.',note:'A hard-expiry teaching model, not a prediction of actual provider eviction. Hypothetical rates: read 1 and uncached 10 units per 1000 tokens, excluding earlier writes and output.'};
  }
  return null;
}
