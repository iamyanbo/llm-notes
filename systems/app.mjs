import {createReadingProgress, createReaderNavigation} from '../transformers/public/reader.js';
import {ease, roundedPolylinePoint} from '../deepseek/site/trace-motion.mjs';
import {STUDIES, advanceStudy, studyDuration} from './models.mjs';
import {sceneFrame} from './views.mjs';

export function createStudy(figure, viewport, preference) {
  const kind = figure.dataset.study;
  const spec = STUDIES[kind];
  const canvas = figure.querySelector('[data-study-canvas]');
  const play = figure.querySelector('[data-study-play]');
  const next = figure.querySelector('[data-study-next]');
  const restart = figure.querySelector('[data-study-restart]');
  const speed = figure.querySelector('[data-study-speed]');
  const scrubber = figure.querySelector('[data-study-step]');
  const parameter = figure.querySelector('[data-study-parameter]');
  let step = 0;
  let progress = 1;
  let running = false;
  let visible = true;
  let pending = null;
  let previousTime = null;
  let motion = null;

  function paintMotion() {
    const arrived = progress >= 0.86;
    canvas.querySelectorAll('[data-arrival]').forEach(element => {
      element.style.visibility = arrived ? 'visible' : 'hidden';
    });
    const packet = canvas.querySelector('[data-packet]');
    if (!packet || !motion) return;
    const segments = motion.segments || [{points: motion.points, label: motion.label, start: 0.08, end: 0.86}];
    const segment = segments.find(part => progress >= part.start && progress < part.end);
    packet.style.visibility = running && !preference.matches && segment ? 'visible' : 'hidden';
    if (!segment) return;
    const fraction = (progress - segment.start) / (segment.end - segment.start);
    const [x, y] = roundedPolylinePoint(segment.points, ease(fraction));
    packet.setAttribute('transform', `translate(${x} ${y})`);
    const label = packet.querySelector('text');
    if (label.textContent !== String(segment.label)) label.textContent = String(segment.label);
  }

  function render() {
    const result = sceneFrame(kind, step, {value: parameter ? Number(parameter.value) : undefined});
    canvas.innerHTML = result.markup;
    motion = result.motion;
    figure.querySelector('[data-study-count]').textContent = `${step + 1} / ${spec.steps.length}`;
    figure.querySelector('[data-study-caption]').textContent = spec.steps[step];
    scrubber.value = String(step);
    next.disabled = step === spec.steps.length - 1;
    paintMotion();
  }

  function pause() {
    running = false;
    previousTime = null;
    if (pending !== null) viewport.cancelAnimationFrame(pending);
    pending = null;
    play.textContent = 'Play';
    play.setAttribute('aria-pressed', 'false');
    paintMotion();
  }

  function tick(time) {
    pending = null;
    if (!running) return;
    if (previousTime !== null) progress += Math.min(time - previousTime, 100) * Number(speed.value) / studyDuration(kind, step);
    previousTime = time;
    if (progress >= 1) {
      progress = 1;
      if (step === spec.steps.length - 1) {
        pause();
        paintMotion();
        return;
      }
      step = advanceStudy(kind, step);
      progress = 0;
      render();
    }
    paintMotion();
    pending = viewport.requestAnimationFrame(tick);
  }

  function inspect(value) {
    pause();
    step = Math.max(0, Math.min(spec.steps.length - 1, value));
    progress = 1;
    render();
  }

  play.addEventListener('click', () => {
    if (running) {
      pause();
      return;
    }
    if (preference.matches) {
      inspect(advanceStudy(kind, step));
      return;
    }
    if (step === spec.steps.length - 1 && progress === 1) step = 0;
    if (progress === 1) {
      step = advanceStudy(kind, step);
      progress = 0;
    }
    running = true;
    previousTime = null;
    play.textContent = 'Pause';
    play.setAttribute('aria-pressed', 'true');
    render();
    pending = viewport.requestAnimationFrame(tick);
  });
  next.addEventListener('click', () => inspect(advanceStudy(kind, step)));
  restart.addEventListener('click', () => inspect(0));
  scrubber.addEventListener('input', () => inspect(Number(scrubber.value)));
  speed.addEventListener('change', () => { previousTime = null; });
  parameter?.addEventListener('input', () => {
    figure.querySelector('[data-parameter-output]').textContent = `${parameter.value} ${spec.parameter.unit}`;
    inspect(step);
  });
  preference.addEventListener?.('change', pause);
  render();
  return {pause, inspect, get state() { return {step, progress, running, visible}; }, setVisible(value) { visible = value; if (!value) pause(); }};
}

export function initializeStudies(root, viewport) {
  const preference = viewport.matchMedia('(prefers-reduced-motion: reduce)');
  const controllers = new Map();
  const dialog = root.createElement('dialog');
  dialog.className = 'systems-dialog';
  dialog.setAttribute('aria-label', 'Enlarged diagram');
  dialog.innerHTML = '<div class="dialog-toolbar"><strong data-dialog-title></strong><button type="button" data-dialog-close>Close ×</button></div><div data-dialog-body></div>';
  root.body.append(dialog);
  let enlarged = null;
  let placeholder = null;
  let returnFocus = null;

  function restore() {
    if (!enlarged) return;
    controllers.get(enlarged).pause();
    placeholder.replaceWith(enlarged);
    enlarged = null;
    placeholder = null;
    returnFocus.focus();
  }

  root.querySelectorAll('[data-study]').forEach(figure => {
    const controller = createStudy(figure, viewport, preference);
    controllers.set(figure, controller);
    figure.querySelector('[data-study-enlarge]').addEventListener('click', event => {
      controller.pause();
      placeholder = root.createElement('div');
      placeholder.style.height = `${figure.getBoundingClientRect().height}px`;
      figure.replaceWith(placeholder);
      enlarged = figure;
      returnFocus = event.currentTarget;
      dialog.querySelector('[data-dialog-title]').textContent = STUDIES[figure.dataset.study].title;
      dialog.querySelector('[data-dialog-body]').append(figure);
      dialog.showModal();
      dialog.querySelector('[data-dialog-close]').focus();
    });
  });
  dialog.querySelector('[data-dialog-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', restore);
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  root.addEventListener('visibilitychange', () => {
    if (root.hidden) controllers.forEach(controller => controller.pause());
  });
  if (viewport.IntersectionObserver) {
    const observer = new viewport.IntersectionObserver(entries => {
      entries.forEach(entry => controllers.get(entry.target).setVisible(entry.isIntersecting || dialog.contains(entry.target)));
    }, {threshold: 0});
    controllers.forEach((controller, figure) => observer.observe(figure));
  }
  return {controllers, dialog};
}

function initializeTheme(root, viewport) {
  const button = root.querySelector('[data-theme-toggle]');
  const preference = viewport.matchMedia('(prefers-color-scheme: dark)');
  try {
    const saved = viewport.localStorage.getItem('language-notes-theme');
    if (saved === 'dark' || saved === 'light') root.documentElement.dataset.theme = saved;
  } catch { /* Reading remains available when storage is disabled. */ }
  const isDark = () => root.documentElement.dataset.theme === 'dark' || (!root.documentElement.dataset.theme && preference.matches);
  const label = () => button.setAttribute('aria-label', `Switch to ${isDark() ? 'light' : 'dark'} theme`);
  button.addEventListener('click', () => {
    root.documentElement.dataset.theme = isDark() ? 'light' : 'dark';
    try { viewport.localStorage.setItem('language-notes-theme', root.documentElement.dataset.theme); } catch { /* Theme can still change for this visit. */ }
    label();
  });
  preference.addEventListener?.('change', label);
  label();
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  initializeTheme(document, window);
  createReadingProgress(document, window);
  createReaderNavigation(document, window);
  initializeStudies(document, window);
}
