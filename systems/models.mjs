import {REQUESTS, scheduleRequests} from '../miscellaneous/inference-models.js';

export {REQUESTS, scheduleRequests};

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

export function supervisedUpdate() {
  const input = 1;
  const weight = 0;
  const target = 1;
  const rate = 0.4;
  const probability = 1 / (1 + Math.exp(-weight * input));
  const loss = -Math.log(probability);
  const gradient = (probability - target) * input;
  const change = rate * gradient;
  const nextWeight = weight - change;
  const nextProbability = 1 / (1 + Math.exp(-nextWeight * input));
  return {input, weight, target, rate, probability, loss, gradient, change, nextWeight, nextProbability, nextLoss: -Math.log(nextProbability)};
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
    title: 'One request through the service',
    note: 'Schematic request flow. Arrows carry the named object; travel time is for reading.',
    steps: ['A prompt arrives', 'The prompt becomes token IDs', 'Prefill constructs retained state', 'Decode reads that state', 'A selected token returns', 'The stream continues'],
  },
  batch: {
    title: 'The same arrivals under two schedules',
    note: 'Chosen workload. Each occupied slot advances one request by one token per unit of time.',
    steps: ['Three requests, two available slots', 'Time 0 to 1', 'Time 1 to 2', 'Time 2 to 3', 'Time 3 to 4', 'Time 4 to 5', 'Time 5 to 6'],
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
  update: {
    title: 'One supervised parameter update',
    note: 'Hand-chosen binary readout with input 1, target 1, initial weight 0, and learning rate 0.4.',
    steps: ['The prediction and its target', 'Differentiate the loss', 'Scale the gradient', 'Change the weight', 'Evaluate the new prediction'],
  },
  advantage: {
    title: 'Four returns, one shared baseline',
    note: 'Chosen rewards. This first calculation uses a mean-only baseline; normalization and clipping follow in the text.',
    steps: ['Four sampled episodes', 'Compute the group mean', 'Compare episode A', 'Compare episode B', 'Compare episode C', 'Compare episode D'],
  },
  mixer: {
    title: 'Completion time changes the collected mixture',
    note: 'Chosen durations of one and four time units, ten slots, and no filtering. Both schedules have the same capacity.',
    steps: ['Allocate ten rollout slots', 'One time unit', 'Two time units', 'Three time units', 'Four time units'],
  },
};

export function studyDuration(kind, step = 0) {
  if (kind === 'advantage' && step === 1) return 18000;
  if (kind === 'routing' && step === 4) return 18000;
  return kind === 'update' || kind === 'advantage' ? 12000 : 8000;
}

export function advanceStudy(kind, step) {
  return Math.min(STUDIES[kind].steps.length - 1, step + 1);
}
