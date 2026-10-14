const card=(label,detail)=>`<div class="diagram-card"><strong>${label}</strong><span>${detail}</span></div>`;
const arrow='<span class="diagram-arrow" aria-hidden="true">→</span>';
const row=(...items)=>`<div class="diagram-flow">${items.join(arrow)}</div>`;
const figure=(title,body,caption)=>`<figure class="static-diagram"><div class="aside-label">${title}</div>${body}<figcaption>${caption}</figcaption></figure>`;
export const deploymentFlows=()=>figure('Where the model runs',
  row(card('Local','Your application'),card('Your device','Downloaded model'),card('Answer','Returned locally'))+
  row(card('Self-hosted','Your application'),card('Your remote server','Downloaded model'),card('Answer','Returned over the network'))+
  row(card('Provider-hosted','Your application'),card('Provider service','Provider operates the model'),card('Answer','Returned over the network')),
  'The middle column locates the model calculation. Access to its weights is a separate question.');
export const releaseComparison=()=>figure('One test, different attempt budgets',
  `<div class="diagram-panels">${card('A · one attempt','7 of 10 tasks solved')}${card('B · one attempt','5 of 10 tasks solved')}${card('B · four attempts','9 of 10 contain a correct candidate')}</div>`,
  'Only the first two results use the same attempt budget. The third additionally assumes that a perfect selector can identify the correct candidate. These are invented results.');
export const cacheAllocation=()=>figure('Logical order, physical blocks',
  `<div class="diagram-panels"><div class="diagram-card"><strong>Sequence A</strong><span>Prefix → A’s continuation</span><small>Block 7 → block 2</small></div><div class="diagram-card"><strong>Sequence B</strong><span>Same prefix → B’s continuation</span><small>Block 7 → block 9</small></div></div><div class="diagram-memory"><span>Block 2<br><strong>A’s continuation</strong></span><span>Block 7<br><strong>Shared prefix</strong></span><span>Block 9<br><strong>B’s continuation</strong></span></div>`,
  'The block table preserves each sequence’s order even when its physical blocks are elsewhere in memory. Both sequences reference the same stored prefix; their continuations occupy separate blocks. Block numbers are illustrative addresses.');
export const cacheTimelines=()=>figure('A pause between requests',
  `<div class="diagram-panels"><div class="diagram-card"><strong>Reuse after 4 minutes</strong><span>Write prefix at 0 → still available at 4 → reuse</span></div><div class="diagram-card"><strong>Reuse after 10 minutes</strong><span>Write prefix at 0 → evicted at 5 → recompute at 10</span></div></div>`,
  'This sketch assumes eviction after five idle minutes. A documented minimum lifetime does not imply eviction at that exact time; actual reuse also depends on compatibility and routing.');
export const cloudBeforeAfter=()=>figure('One cloud task, two moments',
  `<div class="diagram-panels"><div><h5>Client connected</h5>${row(card('Your device','Displays and directs the task'),card('Cloud computer','Harness, browser, files and running work'))}</div><div><h5>Client closed</h5>${row(card('Your device','No active connection'),card('Cloud computer','The configured task can continue'))}</div></div>`,
  'The task depends on the remote environment staying available. Closing the client does not itself shut that computer down.');
export const coordinationFigure=()=>figure('Two ways to use three workers',
  `<div class="diagram-panels"><div><h5>Three required parts</h5><div class="diagram-stack">${card('Parser','Required')}${card('Tests','Required')}${card('Documentation','Required')}</div><p class="diagram-result">Combine and check all three</p></div><div><h5>Three alternative answers</h5><div class="diagram-stack">${card('Attempt A','Candidate')}${card('Attempt B','Candidate')}${card('Attempt C','Candidate')}</div><p class="diagram-result">Check candidates and select one</p></div></div>`,
  'The first project needs every required contribution. The second can use one correct candidate, provided its checker can recognize it.');
