import {p,math as m,eq,section,cite,demo,table,statement} from './essay-helpers.mjs';
import {deploymentFlows,cacheAllocation,cacheTimelines} from './static-figures.mjs';
export const inferenceEssays={
  'local-open-closed':{refs:['local','openness','gpu'],sections:[
    section('access','Deployment and access',
      p("Consider running a language model on a laptop with no network connection. We need its weights and tokenizer, a program that can evaluate it, and enough hardware to hold and use its state. We might instead send the same prompt to a service. These choices change where the computation occurs and which parts of the system we control."),
      p("A <strong>local</strong> deployment runs on equipment at the user’s location. We can also operate downloaded weights on a rented remote machine, or call a provider’s hosted API. Access to weights and the location of execution are separate: an available checkpoint can be hosted, while a closed model can provide remote access without providing its parameters.")),
    section('openness','What has been made available?',
      p("A weight file supplies numerical parameters. To evaluate them, we also need to know the operations that use them and how text becomes their input. Architecture, code, configuration, and a tokenizer provide that information. Reproducing the training adds requirements concerning the data and training procedure."),
      p('The '+cite('openness','Open Source Initiative’s AI definition')+' connects use, study, modification, and sharing to access to the relevant materials under suitable terms. It includes code, parameters, and data information. It is a particular published definition, not a claim that every publicly downloadable checkpoint grants every freedom.'),
      table(['Question','Examples of what to inspect'],[
        ['Where does it run?','User device, controlled remote machine, provider service'],
        ['What is available?','Weights, code, architecture, tokenizer, training information'],
        ['What is permitted?','The terms applying to those particular artifacts and uses'],
        ['Who operates the surrounding system?','Logs, telemetry, storage, updates, and connected tools']
      ],'Deployment, artifact access, permissions, and operation are separate axes.'),
      deploymentFlows()),
    section('resources','Control also creates responsibilities',
      p('Obtaining weights does not guarantee that a device can run the intended workload. The weight budget from the hardware chapter and the KV-cache calculation in Transformers in Practice still apply. We also need an implementation compatible with the architecture, precision, tokenizer, and available device. '+cite('local','Local and offline loading documentation')+' gives a concrete example of downloading the required files before offline use.'),
      p("If we operate the service, we must keep its software, capacity, and monitoring working. A provider can perform some of that work for us, while retaining control of model updates and operating conditions. The choice depends on which responsibilities and forms of access our application needs.")),
    section('comparison','One workload across the alternatives',
      p("Suppose the workload consists of short prompts and long outputs. Its demands differ from a service receiving long documents and returning a few tokens. To compare deployments, use the same prompt and output lengths, concurrency, and quality requirement. We can then measure waiting time, output rate, memory, and cost."),
      p('Let us do some napkin arithmetic. Imagine a server costs 1,000 units a month to keep available, plus one unit for each request it serves. At 100 requests, the total is 1,100 units: eleven per request. At 1,000 requests, the total is 2,000 units: two per request. The server has not become cheaper to keep running; more requests share that fixed expense. These are invented accounting units.'),
      p("This comparison treated requests as separate uses of the server. In practice, several can arrive together and need very different amounts of work. How should the service let them share its machines?"))
  ]},
  'request-scheduling':{refs:['serving','distserve'],sections:[
    section('waiting','Several people are waiting for different amounts of work',
      p("Before a model generates its first output token, it processes the known prompt. This phase is called <strong>prefill</strong>. It then generates a continuation one token at a time, reusing the retained keys and values of previous positions. This phase is called <strong>decoding</strong>.</p><p>Suppose two requests start together. One finishes after a few output tokens; the other continues for hundreds. If the service waits for both to finish before admitting new work, the space freed by the short request remains unused. <strong>Continuous batching</strong> allows another request to enter when space becomes available."),
      p("Admitting work immediately can increase throughput, but each admitted request also competes for time and memory. A service may have a latency target or a fairness rule that restricts admission. We will first examine capacity use in a small workload, then ask what its improvement tells us about waiting time.")),
    section('workload','Three requests',
      p("Take three requests that have finished prefill. A arrives at time 0 and needs three decoding iterations; B arrives at time 1 and needs two; C arrives at time 2 and needs one. At most two requests can advance in an iteration. For this example, each iteration takes one time unit."),
      p('A serial policy advances only the first unfinished request. A finishes at time 3, B at time 5, and C at time 6. Their latencies from arrival to completion are 3, 4, and 4 time units. A continuous-batching policy can advance A and B together after B arrives; C gets the freed capacity later. A and B finish at 3, and C at 4.'),
      demo('request-schedule','Watch requests share and release capacity'),
      p("An iteration takes the same unit of time at each occupancy in this example. This lets us isolate admission and completion order. On a real device, increasing the batch can change the iteration time, so a throughput measurement must include that effect.")),
    section('metrics','Completion latency',
      p('For the three requests above, serial execution gives an average completion latency of '+m('(3+4+4)/3=11/3')+'. Continuous batching gives '+m('(3+2+2)/3=7/3')+'. Each difference is measured from that request\'s own arrival, so the request that arrives later is not charged for time before it existed.'),
      p('For a request arriving at '+m('a_i')+' and completing at '+m('c_i')+', its completion latency is '+m('c_i-a_i')+'. Mean latency summarizes these differences, but a worst-case or percentile measure answers another question. A long request can also care about gaps between successive tokens even when total completion time is acceptable.'),
      eq('\\overline{\\ell}=\\frac1n\\sum_{i=1}^n(c_i-a_i).'),
      p('The batched schedule has used the stated capacity more effectively. Other arrival patterns can make fairness a problem: a continuing stream of new work may delay an older request unless the admission policy accounts for it.'),
      p(cite('serving','Serving systems such as vLLM')+' make scheduling and memory management work together. A request needs space for retained state as well as arithmetic capacity. If memory is unavailable, a policy may have to wait, move state, or recompute it later.')),
    section('policy','The workload behind a measurement',
      p("The schedule depends on when work arrives and how long it remains. Prompt lengths affect prefill; output lengths determine how long requests occupy decode slots. Concurrency and device memory constrain how many can coexist. These quantities belong with a reported latency or throughput result."),
      p("The schedule also assumes there is room for every admitted request’s cached state. A free arithmetic slot is of little use if no additional state fits in memory. We therefore need to examine the cache allocator alongside the admission rule."))
  ]},
  'cache-systems':{refs:['serving','openaiCache','claudeCache','claudeCodeCache','geminiCache'],sections:[
    section('state','Keeping a calculation and keeping a conversation',
      p("Consider resuming a conversation after a long pause. Its text may still be present in the client, while the server no longer retains the keys and values calculated from it. Sending the text again reconstructs that state. The saved conversation preserves the inputs; the cache preserves a previous calculation on them."),
      p("During one decoding request, new positions enlarge the KV cache. Between requests, a compatible prefix may also be reused. The service must decide how long to retain it and how to share finite storage among requests. A provider’s prompt-caching policy adds its own scope, retention, and accounting rules.")),
    section('blocks','Allocation at the size of a block',
      p('As a sequence grows, reserving one large uninterrupted region for its future state can waste memory. A serving system can instead allocate smaller blocks as they are needed. The sequence still has a definite order, but its blocks can be placed wherever space is available.'),
      cacheAllocation(),
      p('A sequence needs its earlier positions in the correct logical order. Their stored blocks do not have to occupy one uninterrupted region of physical memory. A lookup table can record which block holds each part of the sequence. Paging separates those logical positions from the physical allocation. '+cite('serving','PagedAttention')+' investigates this arrangement and its consequences for serving. A block table records the physical locations in logical order. The block size and allocator determine how much room is unused at the end of a growing sequence.'),
      p('If two sequences share an identical reusable prefix, its stored block can be referenced by both when the implementation permits it. Their private suffixes remain separate. We should count the physical block once while retaining both logical uses.')),
    section('expiry','What a pause can change',
      p("A prefix occupies memory even while no one uses it. Retaining every prefix forever would eventually leave no room for new work. The service can evict idle state, expire it, or fail to find a compatible copy when a request is routed elsewhere. A pause therefore makes reuse less certain."),
      table(['Documentation','Selected distinction'],[
        [cite('openaiCache','OpenAI API'),'GPT-5.6 and later document a minimum 30-minute lifetime after write/reuse; earlier models have different retention modes. A minimum is not a promised exact eviction time.'],
        [cite('claudeCache','Claude API'),'Five-minute default, with a one-hour option; reuse refreshes the lifetime.'],
        [cite('claudeCodeCache','Claude Code'),'Main conversations and subagent requests can have different defaults depending on usage route.'],
        [cite('geminiCache','Gemini explicit cache'),'Configurable TTL, with a one-hour default for the documented explicit-cache mechanism.']
      ],'Provider and product policies differ; consult the linked documentation for the selected model and access route.'),
      cacheTimelines()),
    section('accounting','The prefix remains part of the request',
      p('Why can a cache hit be cheaper? The server reuses keys and values already calculated for an identical prefix, avoiding the forward computation needed to reconstruct them. It still reads that state and performs the work for new tokens. Providers can charge differently for writing a cache, reading it, and processing uncached input; '+cite('claudeCache','Claude’s caching documentation')+' makes those categories explicit.'),
      p('Take an unchanged 10,000-token prefix and 200 new input tokens. A compatible cache hit can reuse the prefix calculation; a miss processes the full 10,200-token input. “Cached” does not mean the prefix was absent from the model’s context.'),
      p('For a second piece of napkin arithmetic, assign one accounting unit per 1,000 cache-read tokens and ten per 1,000 uncached input tokens. The selected hit costs '+m('10\\cdot1+0.2\\cdot10=12')+' units, while the selected miss costs '+m('10.2\\cdot10=102')+'. These are hypothetical rates for this request, excluding earlier writes and output charges; they are not vendor prices.'),
      p("To investigate a larger bill after a pause, inspect the request and the reported cache-read and uncached-input quantities. An expired prefix is one explanation; a changed prefix, a longer conversation, or additional requests can produce a different one. The accounting fields let us test which work was charged."))
  ]}
};
