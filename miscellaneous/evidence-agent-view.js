import {n,text,rect,line,svg,metrics,pathLine,point,transfer} from './lab-graphics.js';
import {selectedScore,ATTEMPTS} from './evidence-agent-models.js';
const box=(x,y,w,label,value,active=false)=>rect(x,y,w,64,active?'active':'face')+text(x+w/2,y+24,label,'small','middle')+text(x+w/2,y+48,value,'','middle');
export function evidenceAgentView(d){
  const k=d.kind;
  if(k==='release-conditions'){
    let body=text(20,25,'System B: the same ten tasks; inspect which attempts count');
    for(let j=0;j<4;j++)body+=text(125+j*57,49,'Try '+(j+1),'small','middle');
    for(let i=0;i<10;i++){
      body+=text(20,80+i*24,'Task '+(i+1),'small');
      for(let j=0;j<4;j++)body+=rect(103+j*57,63+i*24,43,19,j<d.attempts&&i<d.step?'active':'face')+text(125+j*57,77+i*24,i<d.step?(ATTEMPTS[i][j]?'✓':'·'):'?','small','middle');
    }
    body+=box(400,70,245,'A · one attempt',d.a+' successes',true)+box(400,159,245,'B · '+d.attempts+' counted attempts',d.b+' successes',true);
    body+=text(400,261,'✓ = correct candidate; · = incorrect.','small')+text(400,285,'Blue cells count in this comparison.','small');
    return {html:svg(body,322),status:'A: '+d.a+'/10. B: '+d.b+'/10 with '+d.attempts+' attempt'+(d.attempts===1?'':'s')+' per task.',note:'Authored outcomes. Four-attempt success assumes a perfect selector; no live model or judge is running.'};
  }
  if(k==='selection-bias'){
    const map=(k,a)=>[65+(k-1)*28,245-a*195];
    let body=line(65,40,65,245,'axis')+line(65,245,625,245,'axis')+line(65,108.5,625,108.5,'axis');
    body+=pathLine(Array.from({length:20},(_,i)=>map(i+1,selectedScore(i+1).accuracy)));
    const [x,y]=map(d.k,d.accuracy);body+=point(x,y)+text(70,100,'Population success stays 70%','small')+text(320,274,'Number of candidate procedures inspected','','middle');
    [1,5,10,15,20].forEach(k=>{body+=text(map(k,0)[0],263,k,'small','middle');});
    body+=text(23,52,'100%','small')+text(30,248,'0%','small');
    return {html:svg(body,292)+metrics([['True accuracy','70%'],['Expected selected score',n(100*d.accuracy)+'%'],['Candidates inspected',d.k]]),status:'Expected maximum from '+d.k+' independent ten-task binomial evaluations: '+n(d.expected)+' successes.',note:'An exact calculation assuming independent evaluations with the same success probability. Reusing the same tasks usually creates correlations; this curve is not a measured benchmark.'};
  }
  if(k==='report-comparison'){
    let body=box(25,40,190,'Dense parameters',d.parameters+' billion',d.step>=1)+box(245,40,190,'Training tokens',d.tokens+' billion',d.step>=2);
    body+=line(215,72,235,72)+line(340,104,340,151)+box(213,152,255,'Proxy C ≈ 6ND',n(d.computeProxy)+' × 10²¹ FLOPs',d.step>=3);
    body+=text(20,246,'Reported counts are inputs. The proxy is our derived approximation.','small');
    return {html:svg(body,269),status:d.name+' ('+d.year+'): N = '+d.parameters+'B, D = '+d.tokens+'B. Their product does not specify capability.',note:'Gopher, Chinchilla, and Llama 3.1 report different procedures and evaluations. This proxy omits additional work and is not the reported financial cost.'};
  }
  if(k==='calibration'){
    const map=(p,a)=>[65+210*p,239-190*a];
    let body=line(65,49,65,239,'axis')+line(65,239,275,239,'axis')+line(65,239,275,49,'axis');
    d.shownBins.forEach((b,i)=>{if(b.count){const [x,y]=map(b.confidence,b.accuracy);body+=point(x,y)+text(x-8,y-12,'group '+(i+1)+' · n='+b.count,'small','end');}});
    body+=text(163,275,'Mean predicted probability','small','middle')+text(15,34,'Observed proportion correct','small');
    [0,.5,1].forEach(v=>{body+=text(map(v,0)[0],257,v,'small','middle')+text(56,map(0,v)[1]+4,v,'small','end');});
    d.probabilities.forEach((p,i)=>{const x=345+(i%5)*58,y=45+Math.floor(i/5)*99;body+=rect(x,y,49,73,i<d.observed?'active':'face')+text(x+24.5,y+24,n(p),'','middle')+text(x+24.5,y+52,i<d.observed?(d.labels[i]?'correct':'wrong'):'pending','small','middle');});
    const meanConfidence=d.observed?d.probabilities.slice(0,d.observed).reduce((sum,p)=>sum+p,0)/d.observed:null;
    const accuracy=d.observed?d.labels.slice(0,d.observed).reduce((sum,y)=>sum+y,0)/d.observed:null;
    return {html:svg(body,291)+metrics([['Average reported confidence',meanConfidence===null?'pending':n(meanConfidence*100)+'%'],['Observed correctness',accuracy===null?'pending':n(accuracy*100)+'%'],['Observed cases',d.observed+' / 10']]),status:'Temperature '+n(d.temperature)+'. '+d.observed+' outcomes revealed; changing confidence leaves those recorded outcomes fixed.',note:'Ten illustrative confidence estimates. The two groups stay fixed, with five examples each. The control rescales confidence logits; it does not generate new answers.'};
  }
  if(k==='harness-loop'){
    const labels=['Model','Harness','Environment','Observation','Next model call'],values=['read_file(...)','dispatch tool','data.csv','total = 42','context + result'];
    let body=text(20,25,'The model’s proposed call has no effect until a tool executes it');
    labels.forEach((label,i)=>{const x=22+(i%3)*219,y=55+Math.floor(i/3)*110;body+=box(x,y,193,label,values[i],i===d.step);});
    body+=line(215,88,233,88)+line(434,88,452,88)+line(550,119,550,150)+line(550,150,119,150)+line(119,150,119,165)+line(215,198,233,198);
    if(d.step===1)body+=transfer([119,88],[338,88],'read_file');
    if(d.step===2)body+=transfer([338,88],[557,88],'read_file');
    if(d.step===3)body+=transfer([550,150],[119,150],'total = 42');
    if(d.step===4)body+=transfer([119,198],[338,198],'total = 42');
    return {html:svg(body,259),status:d.stages[d.step]+'.',note:'Authored tool trace. No file is read or command executed by this page. State and observations feed the next call without changing model weights.'};
  }
  if(k==='cloud-agent'){
    let body=box(25,60,160,'Client interface',d.clientOpen?'Connected':'Closed',d.clientOpen)+box(240,60,190,d.remote?'Remote execution':'Laptop execution',d.processRunning?'Task running':'Host stopped',d.processRunning);
    body+=line(185,92,228,92,d.clientOpen?'wire':'axis')+box(475,60,180,'Artifact storage',d.artifactExists?'report.txt saved':'No artifact yet',d.artifactExists);
    body+=line(430,92,463,92)+text(20,203,'Closing a client and stopping an execution host are different events.','small')+text(20,231,d.remote?'Here the configured remote execution remains available.':'In this local case, the laptop sleeps when the user leaves.','small');
    return {html:svg(body,257),status:'Step '+d.step+': client '+(d.clientOpen?'open':'closed')+'; process '+(d.processRunning?'running':'stopped')+'; artifact '+(d.artifactExists?'retained':'not yet written')+'.',note:'Configured persistence scenario, not a guarantee about a named product. A local service on an available host can also continue; a remote backend can stop.'};
  }
  if(k==='memory-retrieval'){
    let body=text(20,26,'Query q = ('+d.query.join(', ')+'); retrieve '+d.count+' highest scores');
    const records=d.step>=2?d.records:[...d.records].sort((a,b)=>a.order-b.order);
    records.forEach((record,i)=>{const y=57+i*65;body+=rect(20,y,632,52,d.step>=3&&i<d.count?'active':'face')+text(36,y+22,record.label)+text(36,y+40,'Vector ('+record.vector.join(', ')+') · '+(record.valid?'current':'superseded'),'small')+text(628,y+31,d.step>=1?n(record.score,3):'score pending','','end');});
    return {html:svg(body,267),status:d.step<3?['Inspect the stored records and their provenance.','Compute cosine scores for this query.','Order the scores before choosing records.'][d.step]:'Highest similarity: '+d.records[0].label+'. Its validity is '+(d.records[0].valid?'current':'superseded')+'.',note:'Hand-chosen vectors and cosine scores. Similarity does not establish truth or authority; the superseded marker is separate provenance.'};
  }
  if(k==='context-compaction'){
    let body=text(20,26,'Structured replacement · omission index follows the six fields below');
    d.fields.forEach((field,i)=>{const x=20+(i%2)*335,y=55+Math.floor(i/2)*73,retained=d.step<2||field.retained;body+=rect(x,y,305,58,retained?'active':'face')+text(x+13,y+22,(i+1)+'. '+field.label,'small')+text(x+13,y+44,retained?field.value:'[omitted]');});
    return {html:svg(body,295)+metrics([['Required next action',d.required],['Summary supports it?',d.step<3?'Inspect the replacement':d.decisionKnown?'Yes, constraint retained':'No, histories collapse']]),status:d.step<3?['Read the original task records.','Identify a field to omit from the replacement.','Construct the shorter replacement context.'][d.step]:d.decisionKnown?'The retained constraint distinguishes the required action.':'Both histories now have the same summary, but require different actions.',note:'Illustrative summaries. Omitting another field can still lose useful information; the decision test here concerns the local-versus-upload constraint only.'};
  }
  if(k==='agent-coordination'){
    const positions=Array.from({length:d.n},(_,i)=>[340+135*Math.cos(i*2*Math.PI/d.n-Math.PI/2),151+105*Math.sin(i*2*Math.PI/d.n-Math.PI/2)]);
    let body='';
    if(d.rule===2)positions.forEach(([x,y],i)=>positions.slice(i+1).forEach(([a,b])=>{body+=line(x,y,a,b,'axis');}));
    positions.forEach(([x,y],i)=>{body+=rect(x-34,y-23,68,46,i<d.step?'active':'face')+text(x,y+5,'W'+(i+1),'','middle');});
    body+=text(20,25,d.rule===0?'Every subtask must succeed':d.rule===1?'Any attempt succeeds · perfect selector':'Every subtask and pair interface must succeed');
    return {html:svg(body,293)+metrics([['Workers',d.n],['Overall success',n(100*d.success)+'%'],['Pair interfaces',d.rule===2?d.pairs:0]]),status:'Per-worker success 90%, independent. '+(d.rule===2?'Independent interface success 98%.':'Composition rule: '+(d.rule===0?'all':'any')+'.'),note:'Authored probabilities. Required-subtask success is the same for sequential execution. Correlation and imperfect selection can invalidate these formulas.'};
  }
  if(k==='error-propagation'){
    let body=text(20,25,'Each descendant retains source ID S₀ · expected new contaminated records');
    const positions=Array.from({length:4},(_,g)=>Array.from({length:d.branching**g},(_,i)=>[35+(i+.5)*610/d.branching**g,65+g*64]));
    positions.forEach((row,g)=>{
      if(g>d.depth)return;
      row.forEach(([x,y],i)=>{
        if(g>0){const parent=positions[g-1][Math.floor(i/d.branching)];body+=line(parent[0],parent[1]+10,x,y-10,'axis');}
        body+='<circle cx="'+x+'" cy="'+y+'" r="'+(g===3?6:10)+'" class="'+(d.verification===0?'signal':'face')+'"/>';
      });
    });
    body+=text(20,317,'A shared source can produce many agreeing outputs without new evidence.','small');
    return {html:svg(body,338)+metrics([['Expected generations',d.counts.map(v=>n(v,3)).join(' → ')],['Multiplier b·a·(1−v)',n(d.multiplier)],['Expected total through this depth',n(d.total,3)]]),status:d.verification===0?'One false origin fans out to '+d.counts.at(-1)+' newly contaminated records at generation '+d.depth+'.':'The potential fan-out remains; checking reduces the expected contaminated count to '+n(d.counts.at(-1),3)+'.',note:'A tree with new recipients, certain adoption, constant checking rate, and no repair or overlap. Circles show potential recipients; metrics show expectation, not sampled agents or a measured production error rate.'};
  }
  return null;
}
