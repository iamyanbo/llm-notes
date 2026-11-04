import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {STUDIES, routingBudget, sessionMemory, prefixQueue, maskedTargets, policyWeight, groupAdvantages, mixtureSchedule, advanceStudy} from '../systems/models.mjs';
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
      const markup = sceneFrame(kind, step, {value: 140}).markup;
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
  for (const slug of ['serving', 'training']) {
    const html = await readFile(`dist/${slug}/index.html`, 'utf8');
    const {document} = parseHTML(html);
    assert.equal(document.querySelectorAll('h1').length, 1);
    assert.equal(document.querySelectorAll('main>section').length, 10);
    assert.ok(document.querySelector('a[href="#introduction"]'));
    assert.ok(document.querySelector('link[href="../foundations/neobrutalism.css"]'));
    assert.ok(document.querySelector('button[data-study-open]'));
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
