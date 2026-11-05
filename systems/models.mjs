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

export function chunkBudget(prefix = 2048) {
  const budget = 20;
  const decodeRows = 4;
  const decodeContext = 1024;
  const fixed = 2;
  const linear = 0.02;
  const pairCost = 0.00002;
  const pairsFor = chunk => prefix * chunk + chunk * (chunk + 1) / 2;
  const timeFor = chunk => fixed + linear * (chunk + decodeRows) + pairCost * (pairsFor(chunk) + decodeRows * decodeContext);
  let lower = 0;
  let upper = 2048;
  while (lower < upper) {
    const middle = Math.ceil((lower + upper) / 2);
    if (timeFor(middle) <= budget) lower = middle;
    else upper = middle - 1;
  }
  return {prefix, budget, decodeRows, decodeContext, fixed, linear, pairCost, chunk: lower, pairs: pairsFor(lower), time: timeFor(lower), nextTime: timeFor(lower + 1), fixedChunkTime: timeFor(128)};
}

export function kvTransfer(bandwidth = 16, tokens = 32768) {
  const layers = 78;
  const coordinates = 576;
  const bytesPerCoordinate = 1;
  const bytes = tokens * layers * coordinates * bytesPerCoordinate;
  const gib = bytes / 2 ** 30;
  const fixedMs = 1;
  const transferMs = fixedMs + gib / bandwidth * 1000;
  return {tokens, layers, coordinates, bytesPerCoordinate, bytes, gib, bandwidth, fixedMs, transferMs};
}

export function specAllocation(extraA = 2) {
  const a = Math.max(0, Math.min(4, Math.round(extraA)));
  const b = 4 - a;
  const accepted = (probability, count) => Array.from({length: count}, (_, index) => probability ** (index + 1)).reduce((sum, value) => sum + value, 0);
  const outputA = 1 + accepted(0.9, a);
  const outputB = 1 + accepted(0.5, b);
  const compactMs = 10 + 2 * (a + b);
  const paddedMs = 10 + 2 * 2 * Math.max(a, b);
  return {a, b, outputA, outputB, total: outputA + outputB, compactMs, paddedMs, compactRate: (outputA + outputB) / compactMs * 1000, paddedRate: (outputA + outputB) / paddedMs * 1000};
}

export function outputUpdate(rate = 0.1) {
  const hidden = [1, 2];
  const probabilities = [0.12, 0.88];
  const coefficient = policyWeight().weight;
  const weights = [[Math.log(probabilities[0] / probabilities[1]), 0], [0, 0]];
  const logitGradient = [coefficient * (1 - probabilities[0]), -coefficient * probabilities[1]];
  const gradient = hidden.map(feature => logitGradient.map(value => feature * value));
  const updated = weights.map((row, i) => row.map((value, j) => value + rate * gradient[i][j]));
  const logits = [0, 1].map(column => hidden.reduce((sum, feature, row) => sum + feature * updated[row][column], 0));
  const probability = 1 / (1 + Math.exp(logits[1] - logits[0]));
  return {hidden, probabilities, coefficient, weights, logitGradient, gradient, rate, updated, logits, probability};
}

export function qualityAdvantages(weakQuality = 0.2, cap = 1.25) {
  const baseline = groupAdvantages().advantages;
  const qualities = [weakQuality, 1];
  const positiveMass = baseline[1] + baseline[2];
  const retainedMass = baseline[1] * qualities[0] + baseline[2] * qualities[1];
  const uncappedScale = positiveMass / retainedMass;
  const scale = Math.min(cap, uncappedScale);
  const adjusted = [baseline[0], baseline[1] * qualities[0] * scale, baseline[2] * qualities[1] * scale, baseline[3]];
  const mean = adjusted.reduce((sum, value) => sum + value, 0) / adjusted.length;
  return {baseline, qualities, positiveMass, retainedMass, uncappedScale, cap, scale, adjusted, mean, centered: adjusted.map(value => value - mean)};
}

export function groupFilter(success = 0.9, count = 16) {
  const allPass = success ** count;
  const allFail = (1 - success) ** count;
  const usable = 1 - allPass - allFail;
  return {success, count, allPass, allFail, usable, groupsPerAccepted: 1 / usable, rolloutsPerAccepted: count / usable};
}

export function reductionExample() {
  const rows = [
    {prompt: 'A', length: 2, mean: 0.2}, {prompt: 'A', length: 6, mean: 1},
    {prompt: 'B', length: 2, mean: 0.6}, {prompt: 'B', length: 2, mean: 0.6},
  ];
  const tokens = rows.reduce((sum, row) => sum + row.length, 0);
  const totals = new Map(['A', 'B'].map(prompt => [prompt, rows.filter(row => row.prompt === prompt).reduce((sum, row) => sum + row.length, 0)]));
  return {
    rows, tokens,
    tokenMean: rows.reduce((sum, row) => sum + row.length * row.mean, 0) / tokens,
    sequenceMean: rows.reduce((sum, row) => sum + row.mean, 0) / rows.length,
    promptMean: rows.reduce((sum, row) => sum + row.length * row.mean / (totals.size * totals.get(row.prompt)), 0),
    promptWeights: rows.map(row => 1 / (totals.size * totals.get(row.prompt))),
  };
}

export function fleetRamp(startup = 60) {
  const arrivals = 50;
  const initial = 35;
  const ready = 70;
  const deficit = Math.max(0, arrivals - initial);
  const backlog = deficit * startup;
  const surplus = ready - arrivals;
  const drain = backlog / surplus;
  return {arrivals, initial, ready, startup, deficit, backlog, surplus, drain, clear: startup + drain};
}

export function corpusExposure(codeShare = 50) {
  const budget = 40;
  const rows = [{name:'Code', unique:10, share:codeShare/100}, {name:'Web', unique:90, share:1-codeShare/100}];
  return {budget, rows:rows.map(row => ({...row, drawn:budget*row.share, exposure:budget*row.share/row.unique}))};
}

export function optimizerGeometry() {
  const gradient = [[4,3],[3,4]];
  const squares = gradient.map(row => row.map(value => value*value));
  const adam = gradient.map((row,i) => row.map((value,j) => value / Math.sqrt(squares[i][j])));
  const polar = [[1,0],[0,1]];
  return {gradient, squares, adam, polar, singularValues:[7,1]};
}

export function preferencePair(chosen = 0.4, rejected = 0.2, beta = 0.5) {
  const refChosen = 0.2;
  const refRejected = 0.2;
  const policyOdds = Math.log(chosen/rejected);
  const referenceOdds = Math.log(refChosen/refRejected);
  const margin = policyOdds-referenceOdds;
  const scaled = beta*margin;
  const loss = Math.log1p(Math.exp(-scaled));
  const derivative = -beta/(1+Math.exp(scaled));
  return {chosen,rejected,refChosen,refRejected,beta,policyOdds,referenceOdds,margin,scaled,loss,derivative};
}

export const STUDIES = {
  'service-map': {
    title:'An industrial inference service',
    note:'Schematic service path. Solid arrows carry requests or results. The lower control path prepares deployment capacity. Nodes link to the corresponding argument; they do not specify a vendor’s private topology.',
    steps:['Start with the application’s completion requirement','Check the account and admit work','Choose a compatible version and destination','Execute prompt processing and generation','Deliver a stream or a durable batch result','Measure the completed task and resources','Provision, upgrade and drain replicas','Prepare the model, precision and engine configuration'],
  },
  'recipe-map': {
    title:'A model through training and release',
    note:'Schematic reading order. Real recipes can repeat or combine stages. Optimizer state, data, numerical formats and held-out evaluations accompany the transitions. Each node links to its explanation.',
    steps:['Construct the retained corpus and mixture','Allocate and execute pretraining','Change context, data or optimization during mid-training','Learn demonstrated assistant actions','Learn from graded or preferred attempts','Transfer capabilities through a teacher','Select and validate a checkpoint','Publish a versioned serving artifact'],
  },
  fleet: {
    title:'The backlog formed before a replica is ready',
    note:'Authored constant-rate fluid model. Arrivals are 50 requests/s, existing ready capacity is 35/s, and total capacity after startup is 70/s. All work is queued and requests have equal cost in this illustration.',
    parameter:{label:'Replica startup time',unit:'s',min:0,max:120,step:15,value:60},
    steps:['Inspect arrivals and ready capacity','Count work accumulating each second','Accumulate the startup backlog','Count capacity left after new arrivals','Drain the backlog','Include startup and drain time'],
  },
  corpus: {
    title:'Sampling weights become token exposures',
    note:'Authored corpus with 10B code and 90B web tokens and a 40B training-token budget. Sampling cycles through shuffled sources. Exposure counts visits, not demonstrated learning quality.',
    parameter:{label:'Code fraction of sampled tokens',unit:'%',min:10,max:90,step:10,value:50},
    steps:['Inspect unique source sizes and the budget','Allocate sampled code tokens','Allocate sampled web tokens','Count average visits to each code token','Count average visits to each web token'],
  },
  optimizer: {
    title:'Coordinate normalization and matrix directions',
    note:'Authored symmetric positive-definite gradient. Adam’s first step has zero initial moments and negligible epsilon. The Muon reference uses this gradient as its momentum and exact polar normalization. Production momentum, scaling, decay and iterative approximation are omitted here.',
    steps:['Inspect the gradient matrix','Form the corrected second moment at the first Adam step','Normalize Adam coordinate 0,0','Normalize Adam coordinate 0,1','Normalize Adam coordinate 1,0','Normalize Adam coordinate 1,1','Inspect the gradient’s singular values','Replace the singular values with one in the polar reference'],
  },
  preference: {
    title:'One preference pair relative to a reference policy',
    note:'Authored three-reply distributions. Policy pair probabilities are (0.4,0.2), reference pair probabilities (0.2,0.2), with remaining mass elsewhere. Beta is 0.5. This isolates one basic DPO term, not a full training recipe.',
    steps:['Inspect both response probabilities and the reference','Form policy and reference log odds','Subtract to obtain the relative margin','Apply the sigmoid pair loss','Differentiate the pair loss with respect to the margin'],
  },
  chunk: {
    title: 'Choose a chunk from the whole step’s work',
    note: 'Authored timing model in milliseconds. One full-attention layer’s pair count is a proxy with fixed fitted coefficients, not a GPU measurement. Four decode rows of context 1024 share the 20 ms budget. The search is capped at 2048 new prefill tokens.',
    parameter: {label: 'Cached prefix length', unit: 'tokens', min: 2048, max: 16384, step: 2048, value: 2048},
    steps: ['Inspect the existing context and the budget', 'Count comparisons made by the chosen chunk', 'Include four active decode rows', 'Evaluate the predicted step time', 'Check that one more token would exceed the budget'],
  },
  transfer: {
    title: 'From a cache entry count to a transfer time',
    note: 'Chosen 32768-token prefix with 78 layers and 576 one-byte coordinates per layer. The geometry follows the discussed latent cache example. Effective bandwidth and 1 ms fixed overhead are illustrative, with no overlap.',
    parameter: {label: 'Effective transfer bandwidth', unit: 'GiB/s', min: 2, max: 32, step: 2, value: 16},
    steps: ['State the cache geometry', 'Count the stored bytes', 'Divide by effective bandwidth', 'Include the fixed transfer cost'],
  },
  speculation: {
    title: 'Allocate four proposals and count the work executed',
    note: 'Chosen conditional acceptance probabilities 0.9 and 0.5. Each request commits a base token plus its accepted prefix. Costs are 10 ms base plus 2 ms per executed proposal row. Compact and padded layouts execute different row counts.',
    parameter: {label: 'Proposals assigned to request A', unit: 'of 4', min: 0, max: 4, step: 1, value: 2},
    steps: ['Allocate the same four proposal positions', 'Count expected committed output', 'Count compact and padded execution rows', 'Compare committed tokens per second'],
  },
  gradient: {
    title: 'One token changes a two-feature output matrix',
    note: 'Authored two-token readout with h = (1, 2), initial probabilities (0.12, 0.88), and fixed coefficient 0.6 from the previous example. Only the displayed output weights are updated by gradient ascent. Other model parameters are held fixed.',
    parameter: {label: 'Learning rate', unit: '%', min: 0, max: 50, step: 5, value: 10},
    steps: ['Inspect the hidden row and current weights', 'Differentiate the token log probability', 'Form the first row of the weight gradient', 'Form the second row of the weight gradient', 'Update weight W₀₀', 'Update weight W₀₁', 'Update weight W₁₀', 'Update weight W₁₁', 'Compute the edit logit', 'Compute the other logit', 'Normalize the new token probabilities'],
  },
  filtering: {
    title: 'How often does a group contain useful binary variation?',
    note: 'Independent Bernoulli attempts at one chosen success probability. A usable group contains both a pass and a failure. This isolates binary mean-only feedback; richer grading can change the usability rule.',
    parameter: {label: 'Per-attempt success probability', unit: '%', min: 1, max: 99, step: 1, value: 90},
    steps: ['Compare groups of four and sixteen attempts', 'Count all-pass groups', 'Count all-fail groups', 'Keep the mixed-outcome groups', 'Count expected rollouts per accepted group'],
  },
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
  if (kind === 'optimizer' && step === 1) return 28000;
  if (['fleet','corpus','optimizer','preference'].includes(kind)) return 18000;
  if (kind === 'gradient') return 24000;
  if (kind === 'chunk' && [1, 3].includes(step)) return 24000;
  if (kind === 'transfer' && step === 1) return 28000;
  if (kind === 'speculation' && [2, 3].includes(step)) return 24000;
  if (kind === 'mask' && step === 4) return 24000;
  if (kind === 'advantage' && step === 1) return 18000;
  if (kind === 'routing' && step === 4) return 18000;
  return ['mask', 'policy', 'advantage', 'residency', 'queue', 'chunk', 'transfer', 'speculation', 'filtering'].includes(kind) ? 12000 : 8000;
}

export function advanceStudy(kind, step) {
  return Math.min(STUDIES[kind].steps.length - 1, step + 1);
}
