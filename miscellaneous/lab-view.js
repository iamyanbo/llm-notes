import {gpuView} from './gpu-view.js';
import {A,B} from './lab-models.js';
import {n,text,rect,line,svg,metrics,transfer} from './lab-graphics.js';
import {learningView} from './learning-view.js';
import {inferenceView} from './inference-view.js';
import {evidenceAgentView} from './evidence-agent-view.js';
import {safetyView} from './safety-view.js';
function matrix(x,y,values,active,label){
  let body=text(x,y-14,label);
  values.forEach((row,i)=>row.forEach((value,j)=>{body+=rect(x+j*52,y+i*48,44,38,active(i,j)?'active':'face')+text(x+j*52+22,y+i*48+25,value===null?'·':value,'','middle');}));
  return body;
}
export function viewFor(data){
  const k=data.kind;
  if(k==='matrix-tile'||k==='cuda-thread'){
    let body=matrix(32,37,A,(i,j)=>i===data.row&&j===data.term,'A')+matrix(231,37,B,(i,j)=>i===data.term&&j===data.column,'B')+matrix(535,37,data.stored,(i,j)=>i===data.row&&j===data.column,'C = AB');
    body+=text(172,85,'×')+text(421,85,'→');
    const states=['Read inputs','Multiply','Accumulate',data.term===1?'Write result':'Keep partial'];
    states.forEach((name,i)=>{body+=rect(20+i*165,161,148,70,data.phase===i?'active':'face')+text(94+i*165,181,name,'small','middle');});
    body+=text(94,209,data.left+' and '+data.right,'','middle')+text(259,209,data.left+' × '+data.right+' = '+data.value,'','middle')+text(424,209,data.phase>=2?data.partial:'waiting','','middle')+text(589,209,data.phase===3?(data.term===1?data.output[data.row][data.column]:data.partial):'waiting','','middle');
    for(let i=0;i<3;i++)body+=line(168+i*165,195,180+i*165,195);
    if(data.phase>=1&&!data.complete){const value=data.phase===1?data.left+' × '+data.right:data.phase===2?data.value:data.partial;body+='<g transform="translate('+(94+(data.phase-1)*165)+' 143)"><g class="lab-packet"><rect x="-29" y="-12" width="58" height="24" rx="3" class="warm"/>'+text(0,5,value,'small','middle')+'</g></g>';}
    if(k==='cuda-thread')body+=text(20,259,'Selected thread owns output ('+data.row+', '+data.column+'). Registers retain its partial sum.','small');
    else body+=text(20,259,'Output ('+data.row+', '+data.column+'), product '+(data.term+1)+' of 2. Each product is accumulated once.','small');
    return {html:svg(body),status:data.complete?(k==='cuda-thread'||data.single?'Selected output ('+data.row+', '+data.column+') = '+data.output[data.row][data.column]+'.':'Result: C = [[4, 4], [10, 8]].'):states[data.phase]+': '+data.left+' × '+data.right+' = '+data.value+'. Partial sum '+data.partial+'.',note:'An exact 2 × 2 calculation with hand-chosen inputs. The trace specifies data dependencies; it is not a GPU performance measurement.'};
  }
  if(k==='hardware-history'){
    let body=text(22,22,'Sixteen independent products');
    for(let i=0;i<16;i++)body+=rect(22+i%8*76,39+Math.floor(i/8)*38,62,29,i<data.rate*data.step?'active':'face')+text(53+i%8*76,59+Math.floor(i/8)*38,i+1,'small','middle');
    for(let i=0;i<data.resources;i++)body+=rect(22+i*76,151,62,48,i<data.rate?'active':'warm')+text(53+i*76,181,i<data.rate?'ready':'wait','small','middle');
    body+=text(22,139,'Arithmetic resources; memory supply can leave some waiting.','small');
    return {html:svg(body,222)+metrics([['Ready products per step',data.rate],['Ideal steps for 16 products',data.stepsNeeded]]),status:data.memoryLimited?'Memory supplies at most two ready products per step. Extra arithmetic waits.':'Inputs are assumed ready; independent products can use the arithmetic resources.',note:'A selected dependency model. No measured architecture speedups or historical performance ratios are implied.'};
  }
  if(k==='gpu-inside')return gpuView(data);
  if(k==='fabrication'){
    if(data.choice===0){
      const step=Math.min(data.step,4),labels=['A tin droplet arrives','The preparatory pulse flattens the droplet','The main pulse creates an EUV-emitting plasma','Mirrors guide EUV to the reflective mask','Projection optics expose a field on the wafer'];
      let body=text(20,25,labels[step],'small');
      body+=rect(32,89,133,57,step===1||step===2?'warm':'face')+text(98,122,'CO₂ laser','','middle');
      body+=text(239,65,'Tin droplet','small','middle')+text(238,210,'about 25 µm','small','middle');
      if(step===0)body+='<circle cx="239" cy="120" r="8" class="signal"/>';
      else if(step===1)body+='<ellipse cx="239" cy="120" rx="18" ry="5" class="warm"/>';
      else body+='<circle cx="239" cy="120" r="25" class="euv-plasma"/>'+text(239,125,'plasma','small','middle');
      if(step===1||step===2)body+='<path d="M165 117 L216 117" class="euv-laser"/>'+text(103,170,step===1?'preparatory pulse':'main pulse','small','middle');
      body+='<path d="M282 147 Q336 173 283 200" class="euv-mirror"/>'+text(311,233,'Collector','small','middle');
      body+=rect(374,52,72,12,step>=3?'active':'face')+text(410,41,'Reflective mask','small','middle');
      for(let i=0;i<5;i++)body+=rect(381+i*12,54,5,8,'warm');
      body+='<path d="M491 153 L523 177" class="euv-mirror"/>'+text(505,201,'Projection optics','small','middle');
      body+='<circle cx="584" cy="268" r="56" class="face"/>';
      for(let row=-2;row<=2;row++)for(let col=-2;col<=2;col++)if(row*row+col*col<=5)body+=rect(576+col*18,260+row*18,16,16,step===4&&row===-2&&col===0?'active':'warm');
      body+=text(584,345,'Patterned wafer','small','middle');
      if(step>=2){
        for(const [x,y] of [[260,83],[278,109],[267,148],[226,155],[213,98]])body+='<path d="M239 120 L'+x+' '+y+'" class="euv-light"/>';
        body+=text(20,276,'EUV: 13.5 nm','small');
      }
      if(step>=3)body+='<path d="M255 140 L306 172 L410 64" class="euv-light"/>';
      if(step===4)body+='<path d="M410 64 L507 165 L584 224" class="euv-light"/>';
      body+=text(20,376,'Laser light heats the tin; emitted EUV carries the exposure.','small');
      return {html:svg(body,397),status:labels[step]+'.',note:'A schematic NXE-style sequence, not an optical blueprint or a scaled drawing. Mirror positions and counts are simplified. The resolution view compares optical designs; the photographed NXE has NA 0.33.'};
    }
    if(data.choice===1){
      const widths=[.4*13.5/.33,.4*13.5/.55,data.resolution];
      let body=text(20,25,'CD = 0.4 × 13.5 nm / numerical aperture');
      widths.forEach((width,i)=>{body+=text(25,68+i*57,['NA 0.33','NA 0.55','Selected NA '+n(data.aperture)][i])+rect(211,45+i*57,width*20,34,i===2?'active':'face')+text(610,68+i*57,n(width)+' nm','','end');});
      return {html:svg(body,245),status:'Selected characteristic dimension '+n(data.resolution)+' nm. Higher numerical aperture reduces it in this relation.',note:'Illustrative optical relation, with k₁ = 0.4 and wavelength 13.5 nm. It is not a process-node label or yield guarantee.'};
    }
    const step=Math.min(data.step,4),labels=['Apply resist','Expose','Develop openings','Etch the film','Remove resist'];
    let body=text(20,24,labels[step])+rect(80,153,520,63,'face')+text(340,191,'substrate','','middle');
    for(let i=0;i<8;i++){const opening=i===2||i===5;if(!(step>=3&&opening))body+=rect(80+i*65,124,65,29,'warm');if(step<4&&!(step>=2&&opening))body+=rect(80+i*65,96,65,28,opening&&step>=1?'active':'face');if(step===1&&opening)body+=line(113+i*65,46,113+i*65,91);}
    body+=text(80,243,'The resist is a temporary mask. The film retains the transferred pattern.','small');
    return {html:svg(body),status:labels[step]+'. Exposure, resist openings, and material removal are different states.',note:'A schematic subtractive pattern-transfer cycle. It omits materials, process variants, and many manufacturing operations.'};
  }
  if(k==='chip-yield'){
    let path='',body=line(70,225,625,225,'axis')+line(70,225,70,32,'axis');
    for(let i=0;i<=80;i++){const a=i/20,y=225-180*Math.exp(-.5*a);path+=(i?' L':'M')+(70+a*135)+' '+y;}
    body+='<path d="'+path+'" fill="none" stroke="var(--blue)" stroke-width="3"/><circle cx="'+(70+data.area*135)+'" cy="'+(225-180*data.yield)+'" r="7" class="signal"/>'+text(20,40,'Y')+text(622,252,'die area, cm²','','end')+text(95,24,'Y(A) = exp(−0.5A)','small');
    [0,1,2,3,4].forEach(v=>{body+=text(70+v*135,242,v,'small','middle');});
    [0,.25,.5,.75,1].forEach(v=>{body+=text(61,229-180*v,v,'small','end');});
    return {html:svg(body)+metrics([['Expected defects',n(data.expectedDefects)],['No-defect probability',n(data.yield*100)+'%']]),status:'Area '+data.area+' cm² gives exp(−0.5 × '+data.area+') = '+n(data.yield,3)+'.',note:'Authored Poisson defect model. Every defect is assumed fatal; real clustering, redundancy, and repair are omitted.'};
  }
  if(k==='compute-supply'){
    const rows=[['Chips supplied',data.chips],['Racks prepared',data.racks],['Power/cooling supports',data.power]];
    let body=text(20,24,'Each constraint is converted into supported accelerator count');
    rows.forEach(([label,value],i)=>{body+=text(20,74+i*64,label,'small')+rect(215,46+i*64,value*.38,38,(data.step<3?i===data.step:value===data.available)?'active':'face')+text(640,73+i*64,value,'','end');});
    return {html:svg(body,259)+metrics([['Available in the scenario',data.available+' devices']]),status:'The limiting compatible count is min('+data.chips+', '+data.racks+', '+data.power+') = '+data.available+'.',note:'Selected scenario, not a measured lab cluster. Actual useful throughput also depends on workload, failures, communication, and utilization.'};
  }
  if(k==='energy'){
    let body=text(20,25,'Same six-hour interval and measurement boundary');
    const rows=[['8 accelerators',8*data.deviceAverage],['Host and networking',1.4],['Facility overhead',data.facilityPower-data.itPower]];
    rows.forEach(([label,value],i)=>{body+=text(20,77+i*65,label,'small')+rect(195,49+i*65,value*57,38,i===data.step%3?'active':i===2?'warm':'face')+text(641,76+i*65,n(value)+' kW','','end');});
    return {html:svg(body,260)+metrics([['IT energy',n(data.itEnergy)+' kWh'],['Facility energy',n(data.facilityEnergy)+' kWh'],['Average device power',n(data.deviceAverage)+' kW']]),status:n(data.itPower)+' kW × 6 h = '+n(data.itEnergy)+' kWh IT; × PUE 1.2 = '+n(data.facilityEnergy)+' kWh facility energy.',note:'Teaching inputs: 0.7 kW busy, 0.2 kW idle per accelerator; host/network 1.4 kW. PUE and time are fixed for this example.'};
  }
  if(k==='roofline'){
    let body=line(65,225,625,225,'axis')+line(65,225,65,34,'axis');
    body+='<path d="M65 225 L345 65 H625" fill="none" stroke="var(--blue)" stroke-width="3"/><circle cx="'+(65+data.intensity*28)+'" cy="'+(225-data.bound*1.6)+'" r="7" class="signal"/>'+text(24,35,'rate')+text(615,254,'operations / byte','','end')+text(355,48,'peak = 100 operations / time unit','small');
    [0,5,10,15,20].forEach(v=>{body+=text(65+v*28,242,v,'small','middle');});
    [0,25,50,75,100].forEach(v=>{body+=text(56,229-v*1.6,v,'small','end');});
    return {html:svg(body)+metrics([['Throughput ceiling',data.bound],['Limiting term',data.memoryBound?'memory':'arithmetic']]),status:'min(100, 10 × '+data.intensity+') = '+data.bound+' operations per selected time unit.',note:'A roofline example with bandwidth 10 bytes per time unit. These are not product specifications or achieved rates.'};
  }
  if(k==='memory-budget'){
    const values=[['Weights',data.weights],['KV cache',data.cache],['Gradients',data.gradients],['Adam moments',data.moments],['Master weights',data.master]].filter(([,v])=>v>0);
    let body=text(20,25,data.training?'Selected mixed-precision training bookkeeping':'Inference weights plus dense KV cache');
    values.forEach(([label,value],i)=>{const gib=value/2**30;body+=text(20,67+i*47,label,'small')+rect(167,42+i*47,gib*7,30,i<=data.step?'active':'face')+text(641,64+i*47,n(gib)+' GiB','','end');});
    return {html:svg(body,values.length*47+57)+metrics([['Subtotal',n(data.total/2**30)+' GiB'],['Batch size',data.batch]]),status:data.training?'16 bytes per parameter under selected bookkeeping; activations and workspace are not included.':'7 billion weights at 2 bytes plus '+data.batch+' dense caches: '+n(data.total/2**30)+' GiB.',note:'Hypothetical model: 32 layers, 4096 tokens, 8 KV heads, width 128, 2 bytes/coordinate. This is a subtotal, not a promise that a workload fits.'};
  }
  if(k==='distributed'){
    if(data.choice===1){
      let body=text(20,24,'Two devices split the inner dimension of AB');
      body+=matrix(35,67,data.partials[0],()=>data.step===0,'Device 1 · a₀b₀')+matrix(461,67,data.partials[1],()=>data.step===1,'Device 2 · a₁b₁');
      body+=line(151,110,270,181)+line(461,110,357,181)+matrix(270,190,data.step>=3?data.result:[[null,null],[null,null]],()=>data.step>=3,'Sum before the next operation');
      if(data.step===2)body+=transfer([92,110],[323,232],'C₀')+transfer([515,110],[323,232],'C₁');
      return {html:svg(body,300),status:data.step<3?'The two partial matrices have to meet before the full output is available.':'Their elementwise sum is [[4, 4], [10, 8]].',note:'Exact two-device algebra. This view is separate from the device-count speed model; a following nonlinearity generally cannot be applied independently to these partial sums.'};
    }
    let body=text(20,24,'Two equal-sized batches at the same starting parameters');
    body+=rect(35,59,180,69,data.step<1?'active':'face')+text(125,89,'worker 1','','middle')+text(125,113,'g₁ = 2','','middle');
    body+=rect(450,59,180,69,data.step<1?'active':'face')+text(540,89,'worker 2','','middle')+text(540,113,'g₂ = 6','','middle');
    body+=line(215,94,289,173)+line(450,94,385,173)+rect(252,173,178,52,data.step>=1?'active':'face')+text(341,205,data.step>=1?'mean gradient = 4':'reduce before update','','middle');
    if(data.step===1)body+=transfer([125,94],[341,193],'g₁ = 2')+transfer([540,94],[341,193],'g₂ = 6');
    return {html:svg(body,246)+metrics([['Devices in time model',data.devices],['Ideal speedup',n(data.ideal)],['With selected overhead',n(data.speedup)]]),status:'For f = 0.9, ideal speedup = 1 / (0.1 + 0.9/'+data.devices+'). The overhead model adds 0.05 normalized time.',note:'Original gradient and Amdahl examples, not a measured distributed trainer. A single device does not need a cross-device reduction.'};
  }
  const learning=learningView(data);if(learning)return learning;
  const inference=inferenceView(data);if(inference)return inference;
  const observed=evidenceAgentView(data);if(observed)return observed;
  const safe=safetyView(data);if(safe)return safe;
  throw new Error('No view for '+k);
}
