import {STUDIES, REQUESTS, scheduleRequests, routingBudget, supervisedUpdate, groupAdvantages, mixtureSchedule} from './models.mjs';

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
  const nodes = [
    [30, 55, 220, 'A request', 'messages and options'],
    [340, 55, 220, 'Tokenize', 'ordered token IDs'],
    [660, 55, 260, 'Prefill', 'prompt computation'],
    [660, 260, 260, 'Generate', 'one new position'],
    [340, 260, 220, 'Select a token', 'scores and sampling'],
    [30, 260, 220, 'Stream text', 'a decoded text piece'],
  ];
  const paths = [
    [[250, 97], [340, 97]], [[560, 97], [660, 97]],
    [[790, 139], [790, 210], [880, 210], [880, 430]],
    [[790, 430], [790, 344]], [[660, 302], [560, 302]], [[340, 302], [250, 302]],
  ];
  let body = paths.map(points => wire(points, 'request')).join('');
  body += nodes.map((node, index) => block(...node, index === step)).join('');
  body += block(660, 430, 260, 'Retained KV state', 'kept between token steps', step === 2 || step === 3);
  body += text(36, 420, 'The selected token becomes input to the next step.', 'scene-note');
  body += wire([[450, 344], [450, 390], [625, 390], [625, 278], [660, 278]], 'request');
  const travel = [paths[0], paths[1], paths[3], paths[4], paths[5]];
  return frame('request', 550, body, step ? {points: travel[step - 1], label: ['','messages','IDs','state','scores','text'][step]} : null);
}

function batchFrame(step) {
  const serial = scheduleRequests(2, true);
  const continuous = scheduleRequests(2, false);
  let body = text(28, 27, 'A arrives at 0 and needs 3 tokens. B arrives at 1 and needs 2. C arrives at 2 and needs 1.', 'scene-note');
  for (const [group, model, top] of [['One request at a time', serial, 96], ['Continuous batching, two slots', continuous, 350]]) {
    body += text(28, top - 24, group, 'section-label');
    for (let time = 0; time <= 6; time++) body += text(235 + time * 92, top - 3, time, 'tick-label');
    REQUESTS.forEach((request, index) => {
      const y = top + index * 48;
      body += text(35, y + 29, `Request ${request.id}`, 'row-label');
      for (let time = 0; time < 6; time++) body += `<rect class="timeline-empty" x="${235 + time * 92}" y="${y}" width="85" height="38" rx="3"/>`;
      for (const interval of model.timeline) {
        if (interval.time >= step || !interval.selected.includes(index)) continue;
        const arriving = interval.time === step - 1;
        body += `<g ${arriving ? 'data-arrival=""' : ''}><rect class="timeline-fill ${index === 2 ? 'warm' : ''}" x="${235 + interval.time * 92}" y="${y}" width="85" height="38" rx="3"/>${text(277 + interval.time * 92, y + 25, request.id, 'timeline-token')}</g>`;
      }
      if (step >= model.completion[index]) body += `<g ${step === model.completion[index] ? 'data-arrival=""' : ''}>${text(830, y + 27, `done at ${model.completion[index]}`, 'row-label')}</g>`;
    });
  }
  if (step === 6) body += `<g data-arrival="">${text(28, 570, 'Mean completion latency   serial 11/3   ·   continuous 7/3 time units', 'scene-note')}</g>`;
  return frame('batch', 600, body, step ? {points: [[170, 120], [200, 120], [235 + (step - 1) * 92, 120]], label: `t = ${step}`} : null);
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

function updateFrame(step) {
  const model = supervisedUpdate();
  let body = text(28, 34, 'A binary readout predicts the correct alternative with probability σ(wx). We choose x = 1.', 'scene-note');
  body += cell(28, 100, 170, 'Current probability p', number(model.probability), {active: step === 1});
  body += text(224, 149, '−', 'operator');
  body += cell(270, 100, 170, 'Target y', model.target, {active: step === 1});
  body += text(467, 149, '=', 'operator');
  body += cell(510, 100, 190, 'Gradient g = p − y', step >= 1 ? number(model.gradient) : null, {warm: true, arrived: step === 1});
  body += cell(755, 100, 170, 'Current weight w', model.weight, {active: step === 3});
  body += cell(28, 290, 170, 'Learning rate η', model.rate, {active: step === 2});
  body += text(224, 339, '×', 'operator');
  body += cell(270, 290, 170, 'Gradient g', step >= 1 ? model.gradient : null, {active: step === 2});
  body += text(467, 339, '=', 'operator');
  body += cell(510, 290, 190, 'Step ηg', step >= 2 ? model.change : null, {warm: true, arrived: step === 2});
  body += cell(755, 290, 170, 'New weight w − ηg', step >= 3 ? model.nextWeight : null, {warm: true, arrived: step === 3});
  if (step === 3) body += text(730, 251, '−', 'operator');
  body += text(28, 460, `Initial weight 0   ·   initial loss ${number(model.loss)}   ·   update rule w′ = w − ηg`, 'scene-note');
  if (step === 4) body += `<g data-arrival="">${text(28, 510, `New probability ${number(model.nextProbability)}   ·   new loss ${number(model.nextLoss)}`, 'result-note')}</g>`;
  const calculations = {
    1: [
      {points: [[113, 138], [235, 138]], label: '0.5', start: 0.06, end: 0.25},
      {points: [[355, 138], [235, 138]], label: '1', start: 0.31, end: 0.50},
      {points: [[235, 138], [605, 138]], label: '−0.5', start: 0.60, end: 0.86},
    ],
    2: [
      {points: [[113, 328], [235, 328]], label: '0.4', start: 0.06, end: 0.25},
      {points: [[355, 328], [235, 328]], label: '−0.5', start: 0.31, end: 0.50},
      {points: [[235, 328], [605, 328]], label: '−0.2', start: 0.60, end: 0.86},
    ],
    3: [
      {points: [[840, 138], [840, 235], [740, 235]], label: '0', start: 0.06, end: 0.25},
      {points: [[605, 328], [740, 328], [740, 235]], label: '−0.2', start: 0.31, end: 0.50},
      {points: [[740, 235], [840, 235], [840, 328]], label: '0.2', start: 0.60, end: 0.86},
    ],
    4: [{points: [[840, 328], [840, 420], [440, 420], [440, 490]], label: '0.5498', start: 0.08, end: 0.86}],
  };
  return frame('update', 550, body, step ? {segments: calculations[step]} : null);
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

const renderers = {request: requestFrame, batch: batchFrame, routing: routingFrame, cluster: clusterFrame, training: trainingFrame, update: updateFrame, advantage: advantageFrame, mixer: mixerFrame};

export function sceneFrame(kind, step = 0, options = {}) {
  return renderers[kind](step, options);
}

export function studyFigure(kind) {
  const study = STUDIES[kind];
  const parameter = study.parameter;
  const options = parameter ? `<label class="study-parameter">${escape(parameter.label)} <output data-parameter-output>${parameter.value} ${parameter.unit}</output><input data-study-parameter type="range" min="${parameter.min}" max="${parameter.max}" step="${parameter.step}" value="${parameter.value}" aria-label="${escape(parameter.label)}"/></label>` : '';
  return `<figure class="systems-study" data-study="${kind}" aria-labelledby="figure-${kind}-title"><div class="study-heading"><h3 id="figure-${kind}-title">${escape(study.title)}</h3><button type="button" data-study-enlarge aria-haspopup="dialog">Enlarge ↗</button></div>${options}<div class="scene-scroll" role="region" aria-label="Scrollable diagram" tabindex="0"><div data-study-canvas>${sceneFrame(kind).markup}</div></div><div class="study-controls"><button type="button" data-study-play aria-pressed="false">Play</button><button type="button" data-study-next>Next</button><button type="button" data-study-restart>Restart</button><label class="speed-label">Speed <select data-study-speed aria-label="Animation speed"><option value="0.5">0.5×</option><option value="0.75">0.75×</option><option value="1" selected>1×</option><option value="1.5">1.5×</option></select></label><span class="step-count" data-study-count>1 / ${study.steps.length}</span></div><div class="study-scrub"><input type="range" data-study-step min="0" max="${study.steps.length - 1}" step="1" value="0" aria-label="Diagram step"/></div><p class="study-stage" data-study-caption aria-live="polite">${escape(study.steps[0])}</p><figcaption>${escape(study.note)}</figcaption></figure>`;
}
