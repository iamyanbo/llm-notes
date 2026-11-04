export function routingBudget(warmWait = 140) {
  const restore = 20;
  const suffix = 40;
  const coldWait = 20;
  const recompute = 300;
  const warm = warmWait + restore + suffix;
  const cold = coldWait + recompute;
  return {
    warmWait, restore, suffix, coldWait, recompute, warm, cold,
    threshold: cold - restore - suffix,
    choice: warm === cold ? 'Equal estimated time' : warm < cold ? 'Warm worker' : 'Cold worker',
  };
}

export function sessionMemory(pause = 10) {
  const arrivals = 2;
  const active = 5;
  const gibPerSession = 0.5;
  const capacity = 16;
  const lifetime = active + pause;
  const sessions = arrivals * lifetime;
  const memory = sessions * gibPerSession;
  return {arrivals, active, pause, gibPerSession, capacity, lifetime, sessions, memory, fits: memory <= capacity};
}

export function prefixQueue(restore = true) {
  const prefix = restore ? 0.06 : 6;
  const suffix = 0.4;
  const service = prefix + suffix;
  const requests = Array.from({length: 4}, (_,index) => ({
    name: index === 3 ? 'Our session' : `Other session ${index + 1}`,
    start: index * service,
    prefixEnd: index * service + prefix,
    finish: (index + 1) * service,
  }));
  return {prefix, suffix, service, requests};
}

export function maskedTargets() {
  const tokens = ['〈start〉', 'question', '〈assistant〉', 'edit', '〈tool〉', 'fail', '〈assistant〉', 'done', '〈end〉'];
  const probabilities = new Map([[3, 0.5], [7, 0.25], [8, 0.8]]);
  const predictions = tokens.slice(1).map((target, index) => ({
    input: tokens[index], target, targetPosition: index + 1,
    probability: probabilities.get(index + 1) ?? null,
    mask: probabilities.has(index + 1) ? 1 : 0,
  }));
  const losses = [...probabilities.values()].map(probability => -Math.log(probability));
  const total = losses.reduce((sum, value) => sum + value, 0);
  return {tokens, predictions, losses, total, mean: total / losses.length};
}

export function policyWeight(current = 0.12) {
  const sampled = 0.1;
  const advantage = 0.5;
  const lower = 0.2;
  const upper = 5;
  const ratio = current / sampled;
  // Preserve inclusive boundaries after floating-point division.
  const mask = Number(ratio >= lower - Number.EPSILON && ratio <= upper + Number.EPSILON);
  const weight = mask * ratio * advantage;
  return {current, sampled, advantage, lower, upper, ratio, mask, weight};
}

export function groupAdvantages() {
  const rewards = [0, 1, 1, 0];
  const mean = rewards.reduce((sum, value) => sum + value, 0) / rewards.length;
  return {rewards, mean, advantages: rewards.map(reward => reward - mean)};
}

export function mixtureSchedule(tick = 0, balanced = true) {
  const fastSlots = balanced ? 2 : 5;
  const slowSlots = 10 - fastSlots;
  return {
    fastSlots, slowSlots, tick,
    fast: fastSlots * tick,
    slow: slowSlots * Math.floor(tick / 4),
  };
}

export const STUDIES = {
  request: {
    title: 'A coding session across model turns',
    note: 'One illustrative session. The tool wait is outside model execution; retained state can survive between turns. Paths are schematic.',
    steps: ['The harness sends the repository question', 'The service processes the first prompt', 'An action returns to the harness', 'The harness runs the test', 'The session waits while its prefix may remain cached', 'The test result extends the next model request', 'The service resumes the session'],
  },
  residency: {
    title: 'Memory stays occupied during the pause',
    note: 'Chosen steady-state model. Two sessions arrive per second, each holds a private 0.5 GiB for five active seconds plus its tool pause. Shared prefixes and eviction are omitted. The 16 GiB bound concerns average residency.',
    steps: ['Each retained session occupies 0.5 GiB', 'Include active time and the tool pause', 'Count the overlapping session lifetimes', 'Calculate average retained memory', 'Compare with the memory budget'],
    parameter: {label: 'Tool pause', unit: 's', min: 0, max: 30, step: 1, value: 10},
  },
  queue: {
    title: 'A prefix miss changes the next request’s wait',
    note: 'Four chosen simultaneous arrivals share one prefill processor. Each prefix takes 6 s to recompute or 0.06 s to restore, followed by 0.4 s for new work. This is an illustrative serial queue, independent of the published measurements.',
    steps: ['Four sessions return together', 'Recompute the first prefix', 'Recompute the second prefix', 'Recompute the third prefix', 'Our session reaches output after recomputation', 'Restore the first prefix', 'Restore the second prefix', 'Restore the third prefix', 'Our session reaches output after restoration'],
  },
  routing: {
    title: 'A cached prefix and a busy worker',
    note: 'Chosen millisecond estimates. This serial model omits overlap and holds the other costs fixed.',
    steps: ['Inspect both workers', 'Account for waiting', 'Restore or recompute the prefix', 'Include the uncached suffix', 'Compare arrival-to-result time'],
    parameter: {label: 'Warm worker queue', unit: 'ms', min: 0, max: 400, step: 10, value: 140},
  },
  cluster: {
    title: 'A documented 64-H200 deployment',
    note: 'Published llm-d GLM-5.2 topology on CoreWeave. GPU counts are literal; network routes are schematic.',
    steps: ['Eight nodes with eight H200s each', 'A router selects a prefill replica', 'That replica processes the prompt', 'Retained state crosses the network', 'The decode replica advances the request', 'Output tokens stream back to the client'],
  },
  training: {
    title: 'One task through a learning cycle',
    note: 'Schematic agentic RL cycle. A rollout contains generated tokens, observations, and its termination reason.',
    steps: ['Choose a task', 'Generate an action', 'Run the action in its environment', 'Grade the completed episode', 'Construct the training signal', 'Update the learner', 'Refresh the rollout weights', 'Generate with the refreshed policy'],
  },
  mask: {
    title: 'Which next-token predictions contribute to the loss?',
    note: 'Hand-chosen token sequence and probabilities. The three selected targets are edit, done, and the end marker. These labels illustrate a training mask and do not reproduce a model’s tokenizer.',
    steps: ['Every input position predicts the next token', 'Select the first assistant target', 'Select the final answer and its end marker', 'Read the three target probabilities', 'Average their negative log probabilities'],
  },
  policy: {
    title: 'Weight one token from a successful repair',
    note: 'Chosen probabilities and advantage. The displayed positive-advantage ratio bounds [0.2, 5] are MiMo’s reported initial bounds. This traces one coefficient, with the ratio held fixed during differentiation.',
    steps: ['Keep the recorded sampling probability', 'Compare the learner probability', 'Form the probability ratio', 'Check its permitted interval', 'Weight the log-probability gradient'],
    parameter: {label: 'Learner probability', unit: '%', min: 2, max: 90, step: 1, value: 12},
  },
  advantage: {
    title: 'Four returns, one shared baseline',
    note: 'Chosen rewards. This first calculation uses a mean-only baseline; the later token coefficient uses the reported ratio mask.',
    steps: ['Four sampled episodes', 'Compute the group mean', 'Compare episode A', 'Compare episode B', 'Compare episode C', 'Compare episode D'],
  },
  mixer: {
    title: 'Completion time changes the collected mixture',
    note: 'Chosen durations of one and four time units, ten slots, and no filtering. Both schedules have the same capacity.',
    steps: ['Allocate ten rollout slots', 'One time unit', 'Two time units', 'Three time units', 'Four time units'],
  },
};

export function studyDuration(kind, step = 0) {
  if (kind === 'mask' && step === 4) return 24000;
  if (kind === 'advantage' && step === 1) return 18000;
  if (kind === 'routing' && step === 4) return 18000;
  return ['mask', 'policy', 'advantage', 'residency', 'queue'].includes(kind) ? 12000 : 8000;
}

export function advanceStudy(kind, step) {
  return Math.min(STUDIES[kind].steps.length - 1, step + 1);
}
