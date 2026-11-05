import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {STUDIES, routingBudget, sessionMemory, prefixQueue, maskedTargets, policyWeight, groupAdvantages, mixtureSchedule, advanceStudy, chunkBudget, kvTransfer, specAllocation, outputUpdate, qualityAdvantages, groupFilter, reductionExample, fleetRamp, corpusExposure, optimizerGeometry, preferencePair} from '../systems/models.mjs';
import {serving} from '../serving/content.mjs';
import {training} from '../training/content.mjs';
import {sceneFrame, studyFigure} from '../systems/views.mjs';
import {createStudy, initializeStudies} from '../systems/app.mjs';

const require = createRequire(new URL('../foundations/package.json', import.meta.url));
const {parseHTML} = require('linkedom');

function harness(kind, reduced = false) {
  const {document, window} = parseHTML(`<html><body>${studyFigure(kind)}</body></html>`);
  let time = 0;
  let sequence = 0;
  const callbacks = new Map();
  window.requestAnimationFrame = callback => { callbacks.set(++sequence, callback); return sequence; };
  window.cancelAnimationFrame = id => callbacks.delete(id);
  window.matchMedia = () => ({matches: reduced, addEventListener() {}});
  const figure = document.querySelector('[data-study]');
  const controller = createStudy(figure, window, window.matchMedia());
  const click = selector => figure.querySelector(selector).dispatchEvent(new window.Event('click'));
  const frames = count => {
    for (let index = 0; index < count; index++) {
      time += 100;
      const pending = [...callbacks.values()];
      callbacks.clear();
      pending.forEach(callback => callback(time));
    }
  };
  return {document, window, figure, controller, click, frames, callbacks};
}

test('startup debt and later spare capacity account for the same admitted work', () => {
  for(const startup of [0,15,60,120]){
    const model=fleetRamp(startup);
    assert.ok(model.drain>=0);
    assert.equal(model.initial*startup+model.ready*model.drain,model.arrivals*model.clear);
    assert.equal(model.backlog-model.surplus*model.drain,0);
  }
  assert.deepEqual([fleetRamp().backlog,fleetRamp().drain,fleetRamp().clear],[900,45,105]);
});

test('corpus sampling conserves the token budget while changing source exposures', () => {
  for(const share of [10,50,90]){
    const model=corpusExposure(share);
    assert.ok(Math.abs(model.rows.reduce((sum,row)=>sum+row.drawn,0)-model.budget)<1e-12);
    assert.ok(Math.abs(model.rows.reduce((sum,row)=>sum+row.unique*row.exposure,0)-40)<1e-12);
  }
  assert.deepEqual(corpusExposure(10).rows.map(row=>row.exposure),[0.4,0.4]);
  assert.equal(corpusExposure().rows[0].exposure,2);
  assert.ok(Math.abs(corpusExposure().rows[1].exposure-2/9)<1e-12);
});

test('the optimizer comparison preserves the stated first-step and polar-reference assumptions', () => {
  const model=optimizerGeometry();
  const determinant=matrix=>matrix[0][0]*matrix[1][1]-matrix[0][1]*matrix[1][0];
  assert.equal(determinant(model.adam),0);
  assert.equal(determinant(model.polar),1);
  const root=Math.sqrt(0.5);
  for(const [vector,value] of [[[root,root],7],[[root,-root],1]]){
    const product=model.gradient.map(row=>row.reduce((sum,entry,index)=>sum+entry*vector[index],0));
    product.forEach((entry,index)=>assert.ok(Math.abs(entry-value*vector[index])<1e-12));
  }
  model.gradient.forEach((row,i)=>row.forEach((gradient,j)=>{
    const m=(1-0.9)*gradient/(1-0.9);
    const v=(1-0.95)*gradient**2/(1-0.95);
    assert.equal(m/Math.sqrt(v),model.adam[i][j]);
  }));
});

test('the preference pair derivative agrees with normalized-probability finite differences', () => {
  const initial=preferencePair();
  const lossAt=margin=>{
    const fraction=1/(1+Math.exp(-margin));
    return preferencePair(0.6*fraction,0.6*(1-fraction)).loss;
  };
  const epsilon=1e-6;
  const numerical=(lossAt(initial.margin+epsilon)-lossAt(initial.margin-epsilon))/(2*epsilon);
  assert.ok(Math.abs(numerical-initial.derivative)<1e-8);
  assert.ok(Math.abs(preferencePair(0.3,0.3).loss-Math.log(2))<1e-12);
  assert.ok(lossAt(initial.margin+1)<initial.loss);
  assert.ok(initial.derivative<0);
});

test('the broader routes retain old anchors and begin before agent execution', () => {
  assert.equal(serving.sections[0].id,'workloads-and-contracts');
  assert.equal(training.sections[0].id,'corpus-construction');
  const servingIds=serving.sections.map(section=>section.id);
  const trainingIds=training.sections.map(section=>section.id);
  for(const id of ['one-request','memory-and-work','arriving-requests','returning-prefixes','physical-cluster','verification-budget','operating-service','measurements-and-providers','shared-and-dedicated','model-execution','offline-and-online','fleet-changes','provider-case-studies'])assert.ok(servingIds.includes(id));
  for(const id of ['pretraining-and-midtraining','one-update','supervised-data','rewarded-attempts','agent-experience','collecting-a-mixture','learner-and-rollout','reading-a-run','pretraining-budget','distributed-training','optimizer-families','precision-and-stability','posttraining-objectives','exploration-and-curriculum','distillation-and-release'])assert.ok(trainingIds.includes(id));
  assert.equal(serving.hero,'service-map');
  assert.equal(training.hero,'recipe-map');
});

test('retention lifetime, serial prefix work, and queue crossover agree with the examples', () => {
  assert.equal(sessionMemory(0).memory, 5);
  assert.equal(sessionMemory(10).sessions, 30);
  assert.equal(sessionMemory(10).memory, 15);
  assert.equal(sessionMemory(11).fits, true);
  assert.equal(sessionMemory(12).fits, false);
  for (const restore of [false, true]) {
    const model = prefixQueue(restore);
    model.requests.forEach((request, index) => {
      assert.equal(request.start, index * model.service);
      assert.ok(Math.abs(request.finish - request.start - model.prefix - model.suffix) < 1e-12);
    });
  }
  assert.equal(prefixQueue(false).requests[3].finish, 25.6);
  assert.ok(Math.abs(prefixQueue(true).requests[3].finish - 1.84) < 1e-12);
  assert.equal(routingBudget(140).warm, 200);
  assert.equal(routingBudget(260).choice, 'Equal estimated time');
  assert.equal(routingBudget(270).choice, 'Cold worker');
});

test('the loss mask selects shifted assistant targets and the ratio mask includes its boundaries', () => {
  const model = maskedTargets();
  assert.deepEqual(model.predictions.filter(prediction => prediction.mask).map(prediction => prediction.targetPosition), [3,7,8]);
  model.predictions.forEach((prediction,index) => {
    assert.equal(prediction.input, model.tokens[index]);
    assert.equal(prediction.target, model.tokens[index+1]);
  });
  assert.ok(Math.abs(model.mean - Math.log(10)/3) < 1e-12);
  assert.ok(Math.abs(policyWeight().weight - 0.6) < 1e-12);
  assert.equal(policyWeight(0.02).mask, 1);
  assert.equal(policyWeight(0.019).mask, 0);
  assert.equal(policyWeight(0.5).mask, 1);
  assert.equal(policyWeight(0.51).weight, 0);
});

test('advantages use the displayed returns and the mixture comparison keeps ten slots', () => {
  assert.deepEqual(groupAdvantages(), {rewards: [0, 1, 1, 0], mean: 0.5, advantages: [-0.5, 0.5, 0.5, -0.5]});
  const equal = mixtureSchedule(4, false);
  const matched = mixtureSchedule(4, true);
  assert.equal(equal.fastSlots + equal.slowSlots, 10);
  assert.equal(matched.fastSlots + matched.slowSlots, 10);
  assert.deepEqual([equal.fast, equal.slow], [20, 5]);
  assert.deepEqual([matched.fast, matched.slow], [8, 8]);
});

test('every progressive SVG is finite, uniquely labelled, and leaves future outputs empty', () => {
  for (const [kind, spec] of Object.entries(STUDIES)) {
    for (let step = 0; step < spec.steps.length; step++) {
      const markup = sceneFrame(kind, step, {value: spec.parameter?.value}).markup;
      assert.doesNotMatch(markup, /NaN|undefined|Infinity/);
      assert.doesNotMatch(markup, /\bdata-[\w-]+(?:\s|>)/);
      const {document} = parseHTML(markup);
      assert.ok(document.querySelector(`title#scene-${kind}-title`));
      const ids = [...document.querySelectorAll('[id]')].map(node => node.id);
      assert.equal(new Set(ids).size, ids.length);
      assert.equal(advanceStudy(kind, spec.steps.length - 1), spec.steps.length - 1);
    }
  }
  assert.doesNotMatch(sceneFrame('mask', 0).markup, /0\.7675/);
  assert.doesNotMatch(sceneFrame('queue', 0).markup, /19\.2 s|25\.6 s|1\.84 s/);
  assert.doesNotMatch(sceneFrame('advantage', 0).markup, /-0\.5<\/text>/);
  const {document} = parseHTML(sceneFrame('cluster', 0).markup);
  assert.equal(document.querySelectorAll('.gpu-node').length, 8);
  assert.equal(document.querySelectorAll('.gpu-chip').length, 64);
});

test('whole-step chunk search respects the budget as the cached context grows', () => {
  let previous = Infinity;
  for (let prefix = 2048; prefix <= 16384; prefix += 2048) {
    const model = chunkBudget(prefix);
    assert.ok(model.time <= model.budget);
    assert.ok(model.nextTime > model.budget);
    assert.ok(model.chunk <= previous);
    previous = model.chunk;
    assert.equal(model.pairs, prefix * model.chunk + model.chunk * (model.chunk + 1) / 2);
  }
  assert.equal(chunkBudget().chunk, 279);
  assert.equal(chunkBudget(8192).chunk, 96);
  assert.ok(chunkBudget().fixedChunkTime < 20);
  assert.ok(chunkBudget(8192).fixedChunkTime > 20);
});

test('cache geometry, bandwidth, and executed verification rows alter the serving decision', () => {
  const transfer = kvTransfer();
  assert.equal(transfer.bytes, 1472200704);
  assert.equal(transfer.gib, 1.37109375);
  assert.equal(transfer.transferMs, 86.693359375);
  assert.equal(kvTransfer(8).transferMs - 1, 2 * (transfer.transferMs - 1));
  const equal = specAllocation(2);
  const concentrated = specAllocation(4);
  assert.ok(Math.abs(equal.total - 4.46) < 1e-12);
  assert.ok(Math.abs(concentrated.total - 5.0951) < 1e-12);
  assert.equal(concentrated.compactMs, equal.compactMs);
  assert.equal(concentrated.paddedMs, 26);
  assert.ok(concentrated.compactRate > equal.compactRate);
  assert.ok(concentrated.paddedRate < equal.paddedRate);
});

test('the displayed output gradient agrees with finite differences of the stopped-coefficient objective', () => {
  const model = outputUpdate();
  const objective = weights => {
    const logits = [0, 1].map(column => model.hidden.reduce((sum, feature, row) => sum + feature * weights[row][column], 0));
    return model.coefficient * -Math.log1p(Math.exp(logits[1] - logits[0]));
  };
  for (let row = 0; row < 2; row++) for (let column = 0; column < 2; column++) {
    const plus = model.weights.map(row => row.slice());
    const minus = model.weights.map(row => row.slice());
    plus[row][column] += 1e-6;
    minus[row][column] -= 1e-6;
    const numerical = (objective(plus) - objective(minus)) / 2e-6;
    assert.ok(Math.abs(numerical - model.gradient[row][column]) < 1e-8);
    assert.equal(model.updated[row][column], model.weights[row][column] + model.rate * model.gradient[row][column]);
  }
  assert.ok(Math.abs(outputUpdate(0).probability - 0.12) < 1e-12);
  assert.ok(Math.abs(model.probability - 0.18779067805113286) < 1e-12);
  assert.ok(objective(model.updated) > objective(model.weights));
});

test('quality rescaling and group filtering preserve their stated experimental units', () => {
  const capped = qualityAdvantages();
  const uncapped = qualityAdvantages(0.2, Infinity);
  assert.ok(Math.abs(uncapped.adjusted[1] + uncapped.adjusted[2] - uncapped.positiveMass) < 1e-12);
  assert.equal(capped.scale, 1.25);
  assert.deepEqual(capped.centered, [-0.4375, 0.1875, 0.6875, -0.4375]);
  assert.equal(capped.centered.reduce((sum, value) => sum + value, 0), 0);
  for (const count of [4, 16]) {
    const model = groupFilter(0.9, count);
    assert.ok(Math.abs(model.allPass + model.allFail + model.usable - 1) < 1e-12);
    assert.equal(model.rolloutsPerAccepted, count * model.groupsPerAccepted);
    assert.ok(Math.abs(model.usable - groupFilter(0.1, count).usable) < 1e-12);
  }
  assert.ok(groupFilter(0.9, 16).usable > groupFilter(0.9, 4).usable);
  assert.ok(groupFilter(0.9, 16).rolloutsPerAccepted > groupFilter(0.9, 4).rolloutsPerAccepted);
});

test('global prompt normalization survives unequal rank partitions', () => {
  const model = reductionExample();
  assert.ok(Math.abs(model.tokenMean - 8.8 / 12) < 1e-12);
  assert.ok(Math.abs(model.sequenceMean - 0.6) < 1e-12);
  assert.ok(Math.abs(model.promptMean - 0.7) < 1e-12);
  assert.deepEqual(model.promptWeights, [1 / 16, 1 / 16, 1 / 8, 1 / 8]);
  const ranks = [[0, 2], [1, 3]];
  const localWeightedSums = ranks.map(indices => indices.reduce((sum, index) => sum + model.rows[index].length * model.rows[index].mean * model.promptWeights[index], 0));
  const averagedScaled = localWeightedSums.reduce((sum, local) => sum + 2 * local, 0) / 2;
  assert.ok(Math.abs(averagedScaled - model.promptMean) < 1e-12);
  const wrongLocalMeans = ranks.map(indices => indices.reduce((sum, index) => sum + model.rows[index].length * model.rows[index].mean, 0) / indices.reduce((sum, index) => sum + model.rows[index].length, 0));
  assert.ok(Math.abs(wrongLocalMeans.reduce((sum, value) => sum + value, 0) / 2 - 0.65) < 1e-12);
});

test('manual controls, scrubber and changed parameters remain tied to the numerical model', () => {
  const {figure, controller, click, window} = harness('routing');
  for (let index = 0; index < 4; index++) click('[data-study-next]');
  assert.equal(controller.state.step, 4);
  assert.match(figure.textContent, /200 ms/);
  const parameter = figure.querySelector('[data-study-parameter]');
  parameter.value = '400';
  parameter.dispatchEvent(new window.Event('input'));
  assert.equal(controller.state.running, false);
  assert.match(figure.textContent, /460 ms/);
  assert.match(figure.textContent, /Cold worker/);
  const scrubber = figure.querySelector('[data-study-step]');
  scrubber.value = '2';
  scrubber.dispatchEvent(new window.Event('input'));
  assert.equal(controller.state.step, 2);
  click('[data-study-restart]');
  assert.equal(controller.state.step, 0);
});

test('new numerical controls reach model results and keep later parameter updates empty', () => {
  for (const kind of ['chunk', 'transfer', 'speculation', 'gradient', 'filtering', 'fleet', 'corpus']) {
    const {figure, controller, click, window} = harness(kind);
    const parameter = figure.querySelector('[data-study-parameter]');
    parameter.value = String(STUDIES[kind].parameter.max);
    parameter.dispatchEvent(new window.Event('input'));
    while (controller.state.step < STUDIES[kind].steps.length - 1) click('[data-study-next]');
    assert.equal(controller.state.running, false);
    assert.doesNotMatch(figure.textContent, /NaN|Infinity|undefined/);
    if (kind === 'chunk') assert.match(figure.textContent, new RegExp(chunkBudget(16384).time.toFixed(4).replace('.', '\\.')));
    if (kind === 'gradient') assert.match(figure.textContent, new RegExp(outputUpdate(0.5).probability.toFixed(4).replace('.', '\\.')));
  }
  assert.doesNotMatch(sceneFrame('gradient', 0).markup, /0\.1878/);
  assert.doesNotMatch(sceneFrame('gradient', 4).markup, /-0\.0528/);
  assert.match(sceneFrame('gradient', 5).markup, /-0\.0528/);
  assert.match(sceneFrame('filtering', 2).markup, /e-16/);
});

test('playback preserves SVG nodes during travel, pauses, resumes, and stops at the result', () => {
  const {figure, controller, click, frames, callbacks} = harness('mask');
  click('[data-study-play]');
  frames(32);
  const svg = figure.querySelector('svg');
  const progress = controller.state.progress;
  assert.ok(progress > 0 && progress < 1);
  frames(4);
  assert.equal(figure.querySelector('svg'), svg);
  click('[data-study-play]');
  const paused = controller.state.progress;
  frames(20);
  assert.equal(controller.state.progress, paused);
  click('[data-study-play]');
  frames(2);
  assert.ok(controller.state.progress >= paused);
  frames(600);
  assert.equal(controller.state.step, STUDIES.mask.steps.length - 1);
  assert.equal(controller.state.running, false);
  assert.equal(callbacks.size, 0);
  assert.match(figure.textContent, /0\.7675/);
});

test('reduced motion and offscreen suspension keep results manually inspectable', () => {
  const reduced = harness('advantage', true);
  reduced.click('[data-study-play]');
  assert.equal(reduced.controller.state.step, 1);
  assert.equal(reduced.controller.state.running, false);
  assert.equal(reduced.callbacks.size, 0);
  const regular = harness('queue');
  regular.click('[data-study-play]');
  regular.frames(10);
  regular.controller.setVisible(false);
  assert.equal(regular.controller.state.running, false);
  assert.equal(regular.callbacks.size, 0);
});

test('the enlarged view moves the same figure and restores its inspected state', () => {
  const {document, window} = parseHTML(`<html><body><button data-study-open="mask">Open map</button>${studyFigure('mask')}</body></html>`);
  window.matchMedia = () => ({matches: false, addEventListener() {}});
  window.requestAnimationFrame = () => 1;
  window.cancelAnimationFrame = () => {};
  const {controllers, dialog} = initializeStudies(document, window);
  dialog.showModal = () => dialog.setAttribute('open', '');
  dialog.close = () => { dialog.removeAttribute('open'); dialog.dispatchEvent(new window.Event('close')); };
  const figure = document.querySelector('[data-study]');
  figure.getBoundingClientRect = () => ({height: 600});
  controllers.get(figure).inspect(3);
  document.querySelector('[data-study-open]').dispatchEvent(new window.Event('click'));
  assert.equal(dialog.querySelector('[data-study]'), figure);
  assert.equal(controllers.get(figure).state.step, 3);
  dialog.close();
  assert.equal(document.body.querySelector('[data-study]'), figure);
  assert.equal(dialog.querySelector('[data-study]'), null);
  assert.equal(controllers.get(figure).state.step, 3);
});

test('both prototypes have working reading entry points, references, and Foundations styles', async () => {
  const player = await readFile('dist/systems/app.mjs', 'utf8');
  const views = await readFile('dist/systems/views.mjs', 'utf8');
  assert.match(player, /from '\.\/models\.mjs\?v=/);
  assert.match(player, /from '\.\/views\.mjs\?v=/);
  assert.match(views, /from '\.\/models\.mjs\?v=/);
  for (const essay of [serving, training]) {
    const slug=essay.slug;
    const html = await readFile(`dist/${slug}/index.html`, 'utf8');
    const {document} = parseHTML(html);
    assert.equal(document.querySelectorAll('h1').length, 1);
    assert.equal(document.querySelectorAll('main>section').length, essay.sections.length + 2);
    assert.ok(document.querySelector('a[href="#introduction"]'));
    assert.ok(document.querySelector('link[href="../foundations/neobrutalism.css"]'));
    assert.ok(document.querySelector('button[data-study-open]'));
    assert.equal(document.querySelectorAll('nav[aria-label="Contents"] details[data-contents-chapter]').length, essay.sections.length);
    assert.ok(document.querySelectorAll('nav[aria-label="Contents"] a.toc-subsection').length >= 10);
    assert.equal(document.querySelectorAll('a.toc-subsection[href^="#figure-"]').length, 0);
    assert.ok(document.querySelector('a[href="../miscellaneous/"]'));
    assert.ok(document.querySelectorAll('a[href^="../miscellaneous/#"]').length >= 4);
    assert.doesNotMatch(html, /11\/3|7\/3|One supervised parameter update/);
    assert.equal(document.querySelectorAll('.katex-error').length, 0);
    const ids = [...document.querySelectorAll('[id]')].map(node => node.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const link of document.querySelectorAll('a[href^="#"]')) assert.ok(document.getElementById(link.getAttribute('href').slice(1)));
    assert.match(document.querySelector('.prototype-label').textContent, /prototype/i);
    assert.doesNotMatch(html, /chatgpt\.site|\.agents\/|conversation-handoff/);
  }
});
