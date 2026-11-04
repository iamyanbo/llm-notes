import {STUDIES, routingBudget, sessionMemory, prefixQueue, maskedTargets, policyWeight, groupAdvantages, mixtureSchedule} from './models.mjs';

const escape = value => String(value).replace(/[&<>"']/g, character => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[character]));
const number = value => Number.isInteger(value) ? String(value) : value.toFixed(4);
const text = (x, y, value, className = '') => `<text x="${x}" y="${y}" class="${className}">${escape(value)}</text>`;
const wire = (points, kind) => `<polyline class="scene-wire" points="${points.map(point => point.join(',')).join(' ')}" marker-end="url(#arrow-${kind})"/>`;

function cell(x, y, width, label, value, {warm = false, arrived = false, active = false} = {}) {
  const content = value === null ? '' : text(x + width / 2, y + 51, value, 'cell-number');
  return `<g class="scene-cell ${warm ? 'warm' : ''} ${active ? 'selected' : ''}">${text(x, y - 12, label, 'cell-label')}<rect x="${x}" y="${y}" width="${width}" height="76" rx="4"/>${arrived ? `<g data-arrival="">${content}</g>` : content}</g>`;
}

function block(x, y, width, title, detail, active) {
  return `<g class="scene-block ${active ? 'selected' : ''}"><rect x="${x}" y="${y}" width="${width}" height="84" rx="5"/>${text(x + width / 2, y + 34, title, 'block-title')}${text(x + width / 2, y + 60, detail, 'block-detail')}</g>`;
}

function frame(kind, height, body, motion) {
  const packet = motion ? `<g data-packet="" aria-hidden="true"><rect x="-48" y="-18" width="96" height="36" rx="4"/><text x="0" y="6">${escape(motion.label ?? motion.segments[0].label)}</text></g>` : '';
  const markup = `<svg xmlns="http://www.w3.org/2000/svg" class="systems-scene" viewBox="0 0 960 ${height}" role="img" aria-labelledby="scene-${kind}-title"><title id="scene-${kind}-title">${escape(STUDIES[kind].title)}</title><defs><marker id="arrow-${kind}" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto"><path d="M0 0L8 4L0 8" fill="currentColor"/></marker></defs>${body}${packet}</svg>`;
  return {markup, motion};
}

function requestFrame(step) {
  const actors = [[50, 'Harness', 'the coding session'], [370, 'Model service', 'prefill and decode'], [690, 'Tool environment', 'repository and tests']];
  let body = actors.map(([x, title, detail], index) => block(x, 25, 220, title, detail, index === ([0,1,0,2,2,0,1][step]))).join('');
  for (const x of [160, 480, 800]) body += `<line x1="${x}" y1="110" x2="${x}" y2="585" class="scene-lifeline"/>`;
  const paths = [
    [[160,150],[480,150]], [[480,220],[160,220]], [[160,290],[800,290]],
    [[800,420],[160,420]], [[160,490],[480,490]], [[480,555],[160,555]],
  ];
  const labels = ['repository question', 'edit and test call', 'run the tests', 'test failure', 'history + test result', 'next action'];
  paths.forEach((points, index) => {
    body += wire(points, 'request');
    body += text(Math.min(points[0][0],points[1][0]) + 18, points[0][1] - 12, labels[index], 'row-label');
  });
  body += block(375,325,210,'Reusable prefix','may remain cached',step===4);
  body += block(695,325,210,'Test running','no model step here',step===4);
  const motions = [null, {points:paths[0],label:'prompt'}, {points:paths[1],label:'action'}, {points:paths[2],label:'test'}, null, {points:paths[3],label:'result'}, {segments:[
    {points:paths[4],label:'new turn',start:0.08,end:0.43},
    {points:paths[5],label:'action',start:0.52,end:0.86},
  ]}];
  return frame('request',615,body,motions[step]);
}

function residencyFrame(step, options) {
  const model = sessionMemory(options.value);
  let body = text(28,35,'Each session retains a private 0.5 GiB for its entire lifetime in this chosen model.','scene-note');
  body += cell(28,100,170,'Arrivals',`${model.arrivals} / s`,{active:step===2});
  body += cell(275,100,170,'Active time',`${model.active} s`,{active:step===1});
  body += text(480,149,'+','operator');
  body += cell(520,100,180,'Tool pause',`${model.pause} s`,{active:step===1});
  body += cell(765,100,165,'KV budget',`${model.capacity} GiB`,{active:step===4});
  body += cell(28,280,170,'Per session',`${model.gibPerSession} GiB`,{active:step===3});
  body += cell(275,280,425,'Retained lifetime',step>=1?`${model.lifetime} s`:null,{warm:true,arrived:step===1});
  body += cell(28,470,270,'Average resident sessions',step>=2?model.sessions:null,{warm:true,arrived:step===2});
  body += cell(365,470,300,'Average retained memory',step>=3?`${model.memory} GiB`:null,{warm:true,arrived:step===3});
  if(step===4)body += `<g data-arrival="">${text(715,505,model.fits?'Within budget':'Over budget','result-note')}${text(715,535,'on average','scene-note')}</g>`;
  const calculations = {
    1:[{points:[[360,138],[480,230]],label:5,start:.06,end:.3},{points:[[610,138],[480,230]],label:model.pause,start:.36,end:.6},{points:[[480,230],[487,318]],label:model.lifetime,start:.68,end:.86}],
    2:[{points:[[113,138],[160,410]],label:'2 / s',start:.06,end:.3},{points:[[487,318],[160,410]],label:`${model.lifetime} s`,start:.36,end:.6},{points:[[160,410],[163,508]],label:model.sessions,start:.68,end:.86}],
    3:[{points:[[163,508],[335,565]],label:model.sessions,start:.06,end:.3},{points:[[113,318],[113,390],[335,390],[335,565]],label:'0.5 GiB',start:.36,end:.6},{points:[[335,565],[515,565],[515,508]],label:`${model.memory} GiB`,start:.68,end:.86}],
    4:[{points:[[515,508],[800,508]],label:`${model.memory} / 16`,start:.1,end:.86}],
  };
  return frame('residency',635,body,step?{segments:calculations[step]}:null);
}

function queueFrame(step) {
  let body = text(28,30,'All four sessions arrive at time 0. Our session is fourth in this chosen prefill queue.','scene-note');
  for (const [restore,top,heading] of [[false,105,'Recompute each missing prefix'],[true,405,'Restore each retained prefix']]) {
    const model = prefixQueue(restore);
    body += text(28,top-45,heading,'section-label');
    for(const [x,label] of [[210,'Queue wait'],[385,'Prefix work'],[560,'New work'],[770,'First output']])body+=text(x,top-15,label,'cell-label');
    model.requests.forEach((request,index)=>{
      const y=top+index*48;
      const operation=index+1+(restore?4:0);
      body+=text(28,y+27,request.name,'row-label');
      const wait = index === 0 || step >= operation - 1 ? request.start : null;
      for(const [x,value] of [[210,wait],[385,model.prefix],[560,model.suffix],[770,step>=operation?request.finish:null]]){
        body+=`<g class="scene-cell ${x===770?'warm':''}"><rect x="${x}" y="${y}" width="140" height="38" rx="3"/>`;
        const arriving = (step===operation && x===770) || (index>0 && step===operation-1 && x===210);
        if(value!==null)body+=`<g ${arriving?'data-arrival=""':''}>${text(x+70,y+26,`${Number(value.toFixed(2))} s`,'queue-number')}</g>`;
        body+='</g>';
      }
      for(const [x,operator] of [[365,'+'],[540,'+'],[735,'=']])body+=text(x,y+27,operator,'row-label');
    });
  }
  if(!step)return frame('queue',635,body,null);
  const restore=step>4;
  const model=prefixQueue(restore);
  const index=(step-1)%4;
  const y=(restore?405:105)+index*48+19;
  const request=model.requests[index];
  const values=[request.start,model.prefix,model.suffix];
  const segments=values.map((value,index)=>({points:[[280+index*175,y],[750,y]],label:Number(value.toFixed(2)),start:.04+index*.2,end:.19+index*.2}));
  segments.push({points:[[750,y],[840,y]],label:Number(request.finish.toFixed(2)),start:.7,end:.86});
  return frame('queue',635,body,{segments});
}

function routingFrame(step, options) {
  const model = routingBudget(options.value);
  let body = text(28, 30, 'Both workers receive the same request. The estimates below are chosen for this calculation.', 'scene-note');
  body += text(28, 84, 'Warm worker', 'section-label');
  body += cell(28, 120, 180, 'Queue wait', `${model.warmWait} ms`, {active: step === 1});
  body += text(235, 168, '+', 'operator');
  body += cell(275, 120, 180, 'Restore prefix', '20 ms', {active: step === 2});
  body += text(480, 168, '+', 'operator');
  body += cell(520, 120, 180, 'New suffix', '40 ms', {active: step === 3});
  body += text(725, 168, '=', 'operator');
  body += cell(765, 120, 165, 'Estimated total', step === 4 ? `${model.warm} ms` : null, {warm: true, arrived: true});
  body += text(28, 280, 'Cold worker', 'section-label');
  body += cell(28, 315, 180, 'Queue wait', '20 ms', {active: step === 1});
  body += text(235, 363, '+', 'operator');
  body += cell(275, 315, 425, 'Compute the entire prompt, including its new suffix', '300 ms', {active: step === 2 || step === 3});
  body += text(725, 363, '=', 'operator');
  body += cell(765, 315, 165, 'Estimated total', step === 4 ? `${model.cold} ms` : null, {warm: true, arrived: true});
  if (step === 4) body += `<g data-arrival="">${text(28, 470, `${model.choice}   ·   the crossover is a warm queue of ${model.threshold} ms`, 'scene-note')}</g>`;
  const origins = [[118, 158], [365, 158], [610, 158]];
  if (step === 4) return frame('routing', 510, body, {segments: [
    {points: [[118, 158], [118, 235], [735, 235]], label: model.warmWait, start: 0.04, end: 0.18},
    {points: [[365, 158], [365, 235], [735, 235]], label: 20, start: 0.23, end: 0.37},
    {points: [[610, 158], [610, 235], [735, 235]], label: 40, start: 0.42, end: 0.56},
    {points: [[735, 235], [847, 235], [847, 158]], label: model.warm, start: 0.67, end: 0.86},
  ]});
  return frame('routing', 510, body, step ? {points: [origins[step - 1], [720, 240], [847, 158]], label: ['','wait','restore','suffix'][step]} : null);
}

function gpuNode(x, y, name, active) {
  let body = `<g class="gpu-node ${active ? 'selected' : ''}"><rect x="${x}" y="${y}" width="238" height="94" rx="4"/>${text(x + 12, y + 25, name, 'node-label')}`;
  for (let gpu = 0; gpu < 8; gpu++) body += `<rect class="gpu-chip" x="${x + 12 + gpu * 27}" y="${y + 42}" width="21" height="27" rx="2"/>`;
  return body + text(x + 12, y + 85, '8 × H200', 'node-detail') + '</g>';
}

function clusterFrame(step) {
  let body = block(25, 25, 190, 'Client', 'one returning request', step === 0 || step === 5);
  body += block(330, 25, 220, 'Request router', 'choose one replica', step === 1);
  body += wire([[215, 67], [330, 67]], 'cluster');
  for (let replica = 0; replica < 3; replica++) {
    const x = 25 + replica * 315;
    body += text(x, 165, `Prefill replica ${replica + 1} · 16 GPUs`, 'section-label');
    body += gpuNode(x, 185, `Node ${replica * 2 + 1}`, step === 2 && replica === 0);
    body += gpuNode(x, 294, `Node ${replica * 2 + 2}`, step === 2 && replica === 0);
    body += wire([[440, 109], [440, 131], [x + 290, 131], [x + 290, 232], [x + 238, 232]], 'cluster');
  }
  body += text(25, 442, 'Decode replica · 16 GPUs', 'section-label');
  body += gpuNode(25, 460, 'Node 7', step === 4);
  body += gpuNode(283, 460, 'Node 8', step === 4);
  body += block(645, 467, 275, 'CPU / NVMe cache tiers', 'restore prefixes to prefill', step === 2);
  const handoff = [[145, 389], [145, 412], [272, 412], [272, 507], [263, 507]];
  body += wire(handoff, 'cluster');
  body += text(305, 438, 'KV handoff over InfiniBand / NIXL', 'scene-note');
  body += wire([[782, 467], [782, 405], [295, 405], [295, 341], [263, 341]], 'cluster');
  body += text(25, 604, '48 prefill GPUs + 16 decode GPUs = 64 GPUs. One request uses one selected prefill replica.', 'scene-note');
  const paths = [null, [[215, 67], [330, 67]], [[440, 109], [440, 131], [315, 131], [315, 232], [263, 232]], handoff, [[144, 507], [403, 507]], [[25, 507], [8, 507], [8, 67], [25, 67]]];
  return frame('cluster', 635, body, paths[step] ? {points: paths[step], label: step === 3 ? 'KV' : step === 5 ? 'text' : 'request'} : null);
}

function trainingFrame(step) {
  const nodes = [
    [30, 50, 190, 'Task sampler', 'prompt and environment'],
    [340, 50, 220, 'Rollout model', 'sampled actions'],
    [690, 50, 235, 'Environment', 'observations and state'],
    [690, 260, 235, 'Grader', 'episode return'],
    [340, 260, 220, 'Learning signal', 'rewards and advantages'],
    [30, 260, 190, 'Learner', 'gradients and update'],
    [30, 450, 190, 'Weight refresh', 'a new policy version'],
  ];
  const paths = [
    [[220, 92], [340, 92]], [[560, 92], [690, 92]], [[807, 134], [807, 260]],
    [[690, 302], [560, 302]], [[340, 302], [220, 302]], [[125, 344], [125, 450]],
    [[30, 492], [12, 492], [12, 32], [375, 32], [375, 50]],
  ];
  let body = paths.map(points => wire(points, 'training')).join('');
  body += wire([[807, 50], [807, 15], [450, 15], [450, 50]], 'training');
  body += nodes.map((node, index) => block(...node, index === (step === 7 ? 1 : step))).join('');
  body += text(285, 410, 'The environment may be called many times before the episode is graded.', 'scene-note');
  body += text(285, 554, 'Generated tokens stay paired with their sampling policy and recorded probabilities.', 'scene-note');
  return frame('training', 590, body, step ? {points: paths[step - 1], label: ['','task','action','return','signal','gradient','weights','weights'][step]} : null);
}

function maskFrame(step) {
  const model=maskedTargets();
  let body=text(25,30,'A toy conversation. Arrows align each input position with its next-token target.','scene-note');
  body+=text(25,65,'Recorded tokens','row-label');
  model.tokens.forEach((token,index)=>{
    const x=25+index*100;
    body+=`<g class="scene-cell"><rect x="${x}" y="85" width="90" height="55" rx="3"/>${text(x+45,118,token,'token-label')}</g>`;
    body+=text(x+45,160,index,'tick-label');
  });
  body+=text(25,220,'Target','row-label');
  body+=text(25,345,'Loss mask','row-label');
  model.predictions.forEach((prediction,index)=>{
    const x=125+index*100;
    const selected=(step>=1&&prediction.targetPosition===3)||(step>=2&&prediction.targetPosition>=7);
    body+=wire([[70+index*100,168],[x+45,235]],'mask');
    body+=`<g class="scene-cell ${selected?'selected':''}"><rect x="${x}" y="240" width="90" height="55" rx="3"/>${text(x+45,273,prediction.target,'token-label')}</g>`;
    body+=text(x+45,345,step>=2?prediction.mask:selected?1:'·','cell-number');
  });
  const chosen=model.predictions.filter(prediction=>prediction.mask);
  chosen.forEach((prediction,index)=>{
    body+=cell(65+index*300,430,230,`P(${prediction.target} | its prefix)`,step>=3?prediction.probability:null,{warm:true,arrived:step===3});
    if(step===4)body+=text(155+index*300,545,'−log','row-label');
  });
  if(step===4)body+=text(420,575,'add, then divide by 3','cell-label');
  if(step===4)body+=`<g data-arrival="">${text(65,600,`Mean loss = (${model.losses.map(value=>value.toFixed(4)).join(' + ')}) / 3 = ${model.mean.toFixed(4)}`,'result-note')}</g>`;
  const motions={
    1:{points:[[370,112],[370,267]],label:'edit'},
    2:{segments:[{points:[[770,112],[770,267]],label:'done',start:.08,end:.42},{points:[[870,112],[870,267]],label:'end',start:.52,end:.86}]},
    4:{segments:chosen.flatMap((prediction,index)=>[
      {points:[[180+index*300,468],[180+index*300,540]],label:prediction.probability,start:.03+index*.26,end:.13+index*.26},
      {points:[[180+index*300,550],[480,575]],label:model.losses[index].toFixed(4),start:.17+index*.26,end:.25+index*.26},
    ]).concat([{points:[[480,575],[480,590]],label:model.mean.toFixed(4),start:.8,end:.86}])},
  };
  return frame('mask',640,body,motions[step]||null);
}

function policyFrame(step, options) {
  const model=policyWeight((options.value??12)/100);
  let body=text(28,30,'One generated token from a successful repair has chosen advantage A = 0.5.','scene-note');
  body+=cell(28,100,245,'Sampling probability q',model.sampled,{active:step===0});
  body+=cell(345,100,245,'Learner probability p',number(model.current),{active:step===1});
  body+=cell(690,100,240,'Ratio r = p / q',step>=2?number(model.ratio):null,{warm:true,arrived:step===2});
  body+=block(28,275,520,'Permitted positive-advantage ratio','0.2 ≤ r ≤ 5 at initialization',step===3);
  body+=cell(690,275,240,'In range?  M',step>=3?model.mask:null,{warm:true,arrived:step===3});
  body+=cell(28,475,170,'M',step>=3?model.mask:null);
  body+=text(230,525,'×','operator');
  body+=cell(275,475,170,'r',step>=2?number(model.ratio):null);
  body+=text(480,525,'×','operator');
  body+=cell(520,475,170,'A',model.advantage);
  body+=text(725,525,'=','operator');
  body+=cell(765,475,165,'Gradient weight',step>=4?number(model.weight):null,{warm:true,arrived:step===4});
  body+=text(28,610,'The ratio is held fixed when differentiating the weighted log probability.','scene-note');
  const motions={
    2:{segments:[{points:[[467,138],[625,210]],label:number(model.current),start:.06,end:.3},{points:[[150,138],[150,210],[625,210]],label:model.sampled,start:.36,end:.6},{points:[[625,210],[810,210],[810,138]],label:number(model.ratio),start:.68,end:.86}]},
    3:{points:[[810,138],[810,313]],label:model.mask?'in range':'outside'},
    4:{segments:[model.mask,model.ratio,model.advantage].map((value,index)=>({points:[[113+index*247,513],[750,570]],label:number(value),start:.05+index*.2,end:.2+index*.2})).concat([{points:[[750,570],[847,570],[847,513]],label:number(model.weight),start:.72,end:.86}])},
  };
  return frame('policy',645,body,motions[step]||null);
}

function advantageFrame(step) {
  const model = groupAdvantages();
  let body = text(28, 32, 'One prompt, four sampled episodes. A verifier supplies the returns below.', 'scene-note');
  for (let index = 0; index < 4; index++) {
    const x = 35 + index * 230;
    body += cell(x, 105, 180, `Episode ${'ABCD'[index]} return`, model.rewards[index], {active: step === index + 2});
    body += cell(x, 365, 180, 'Return − group mean', step >= index + 2 ? model.advantages[index] : null, {warm: true, arrived: step === index + 2});
    body += wire([[x + 90, 181], [x + 90, 327]], 'advantage');
  }
  body += cell(380, 225, 195, '(0 + 1 + 1 + 0) / 4', step >= 1 ? model.mean : null, {warm: true, arrived: step === 1});
  body += text(28, 510, 'These differences become signed learning signals for the generated actions in each episode.', 'scene-note');
  const index = Math.max(0, step - 2);
  if (step === 1) {
    const segments = model.rewards.map((reward, sourceIndex) => ({
      points: [[125 + sourceIndex * 230, 143], [125 + sourceIndex * 230, 205], [477, 205]],
      label: reward, start: 0.04 + sourceIndex * 0.16, end: 0.16 + sourceIndex * 0.16,
    }));
    segments.push({points: [[477, 205], [477, 263]], label: '0.5', start: 0.72, end: 0.86});
    return frame('advantage', 545, body, {segments});
  }
  if (step >= 2) return frame('advantage', 545, body, {segments: [
    {points: [[125 + index * 230, 143], [125 + index * 230, 310]], label: model.rewards[index], start: 0.06, end: 0.25},
    {points: [[477, 263], [125 + index * 230, 263], [125 + index * 230, 310]], label: model.mean, start: 0.31, end: 0.50},
    {points: [[125 + index * 230, 310], [125 + index * 230, 403]], label: number(model.advantages[index]), start: 0.60, end: 0.86},
  ]});
  return frame('advantage', 545, body, null);
}

function mixerFrame(step) {
  let body = text(28, 30, 'Fast episodes take 1 time unit. Slow episodes take 4. The desired completed mixture is 1 : 1.', 'scene-note');
  for (const [balanced, top, title] of [[false, 100, 'Equal concurrency'], [true, 340, 'Duration-aware allocation']]) {
    const model = mixtureSchedule(step, balanced);
    body += text(28, top - 17, title, 'section-label');
    for (let slot = 0; slot < 10; slot++) {
      const fast = slot < model.fastSlots;
      body += `<g class="scene-cell ${fast ? '' : 'warm'}"><rect x="${28 + slot * 90}" y="${top}" width="80" height="68" rx="4"/>${text(68 + slot * 90, top + 28, fast ? 'fast' : 'slow', 'slot-label')}${text(68 + slot * 90, top + 51, fast ? '1 unit' : '4 units', 'slot-detail')}</g>`;
    }
    body += `<g ${step ? 'data-arrival=""' : ''}>${text(28, top + 116, `Completed after ${step} units`, 'scene-note')}${text(380, top + 116, `${model.fast} fast`, 'result-note')}${text(650, top + 116, `${model.slow} slow`, 'result-note')}</g>`;
  }
  return frame('mixer', 520, body, step ? {points: [[70, 375], [70, 450], [680, 450]], label: `t = ${step}`} : null);
}

const renderers = {request: requestFrame, residency: residencyFrame, queue: queueFrame, routing: routingFrame, cluster: clusterFrame, training: trainingFrame, mask: maskFrame, policy: policyFrame, advantage: advantageFrame, mixer: mixerFrame};

export function sceneFrame(kind, step = 0, options = {}) {
  return renderers[kind](step, options);
}

export function studyFigure(kind) {
  const study = STUDIES[kind];
  const parameter = study.parameter;
  const options = parameter ? `<label class="study-parameter">${escape(parameter.label)} <output data-parameter-output>${parameter.value} ${parameter.unit}</output><input data-study-parameter type="range" min="${parameter.min}" max="${parameter.max}" step="${parameter.step}" value="${parameter.value}" aria-label="${escape(parameter.label)}"/></label>` : '';
  return `<figure class="systems-study" data-study="${kind}" aria-labelledby="figure-${kind}-title"><div class="study-heading"><h3 id="figure-${kind}-title">${escape(study.title)}</h3><button type="button" data-study-enlarge aria-haspopup="dialog">Enlarge ↗</button></div>${options}<div class="scene-scroll" role="region" aria-label="Scrollable diagram" tabindex="0"><div data-study-canvas>${sceneFrame(kind).markup}</div></div><div class="study-controls"><button type="button" data-study-play aria-pressed="false">Play</button><button type="button" data-study-next>Next</button><button type="button" data-study-restart>Restart</button><label class="speed-label">Speed <select data-study-speed aria-label="Animation speed"><option value="0.5">0.5×</option><option value="0.75">0.75×</option><option value="1" selected>1×</option><option value="1.5">1.5×</option></select></label><span class="step-count" data-study-count>1 / ${study.steps.length}</span></div><div class="study-scrub"><input type="range" data-study-step min="0" max="${study.steps.length - 1}" step="1" value="0" aria-label="Diagram step"/></div><p class="study-stage" data-study-caption aria-live="polite">${escape(study.steps[0])}</p><figcaption>${escape(study.note)}</figcaption></figure>`;
}
