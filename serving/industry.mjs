import {p, math as m, equation as eq, heading as h, table, source, study} from '../systems/markup.mjs';
import {engineCase} from './cases.mjs';

const deepinfra='https://deepinfra.com/blog/deepinfra-nvidia-inference-stack';
const fireworks='https://docs.fireworks.ai/serverless/reserved-throughput';
const autoscaling='https://docs.fireworks.ai/deployments/autoscaling';
const together='https://www.together.ai/blog/configuring-dedicated-model-inference';
const batch='https://deepinfra.com/blog/batch-api';
const groq='https://console.groq.com/docs/flex-processing';

export const industrialSections = [
  {
    id:'workloads-and-contracts', title:'The workload and the service contract',
    body:
      p('Consider a company running three jobs on the same model. Its support assistant streams an answer while a customer waits. Its coding agent returns repeatedly with tool results. Overnight, a document pipeline extracts fields from two million records. All three submit tokens. They place different demands on the machines and promise different things to the people using them.')+
      p('For the support assistant, a long pause before the first word can make the service unusable even if the complete answer arrives quickly afterward. For the document job, an answer in one second is of little value if most of the dataset misses its morning deadline. The agent adds reusable history and unpredictable pauses. The first scheduling decision is therefore which promise each request belongs to.')+
      table(['Workload','Useful completion boundary','Resource pressure to retain'],[
        ['Interactive support','A correct answer with bounded initial wait and stream gaps','Bursts, output length and deadline slack'],
        ['Coding agent','A checked task result across several calls','Long repeated prefixes and tool waits'],
        ['Document extraction','Valid records delivered before a batch deadline','Total token work, validation failures and retry volume'],
        ['Retrieval pipeline','Evidence ready before the answering model runs','Embedding, search and reranking dependencies'],
      ],'Different production workloads can call the same model')+
      h('admission-and-quota','A request can fit the quota and still miss its deadline')+
      p('A request limit counts arrivals. A token limit approximates some of their work. Suppose an account is permitted sixty requests per minute and 120,000 input tokens per minute. Ten requests carrying 20,000 tokens each fit the request count but exceed the input allowance. A thousand-token prompt and a hundred-thousand-token prompt should not be interchangeable entries in a capacity estimate.')+
      p('The gateway authenticates an account, validates the request and applies these policies before the model engine executes it. A quota is an account entitlement. Admission asks whether the pending work can be served under the current conditions. An account with unused entitlement may still encounter overload if the underlying capacity is unavailable.')+
      p('For an authored first-token budget of 800 ms, suppose network and frontend work consume 80 ms and predicted prompt execution consumes 500 ms. Only 220 ms remain for waiting. If the selected worker already has 350 ms of incompatible work ahead, accepting the request there predicts 930 ms. Waiting for a larger batch could improve efficiency while making that promise impossible.')+
      eq('S=D-T_{\\mathrm{network}}-T_{\\mathrm{execution}}-W.')+
      p('Here '+m('D')+' is the allowed time to first token, '+m('W')+' is predicted waiting, and '+m('S')+' is remaining slack. The prediction uses compatible units and one specified execution path. Negative slack gives the service a reason to choose another destination, defer a flexible job, or reject work promptly. It does not establish that a particular real request will miss its deadline, since the estimates have error.')+
      h('service-class-isolation','A faster queue cannot manufacture another class’s capacity')+
      p('Giving interactive work priority can prevent an offline job from occupying every next execution slot. It can also starve that job if interactive demand remains high. A class therefore needs a policy for the capacity it can use, including what happens when a higher-priority class consumes the slack it was borrowing.')+
      p('Fireworks documents priority traffic with reduced exposure to load shedding and a separate reserved-throughput product with an availability commitment up to the reservation. Groq’s Flex service explicitly permits occasional failures in exchange for a different throughput-oriented contract. These are concrete service policies to inspect before comparing two latency numbers.')+
      source('Fireworks service modes','https://docs.fireworks.ai/serverless/serverless-modes')+
      source('Groq Flex contract',groq)+
      p('A retry remains work. If 100 logical operations each require 1.1 attempts on average, the engine sees 110 attempts. Retrying overload immediately can add demand precisely when capacity is least able to absorb it. The client needs a deadline, a retry policy and a way to identify completed work. Our first full trace will follow one interactive session through those boundaries.'),
  },
  {
    id:'shared-and-dedicated', title:'Buying and allocating a share of the fleet',
    body:
      p('The worker that handled our first call may also serve other organizations. Pooling requests lets a provider share model weights and fill otherwise empty execution slots. A dedicated deployment gives a customer control over an allocation, but quiet periods still leave the allocated machines to pay for. Neither arrangement removes the need to schedule the work on it.')+
      p('There are at least three distinct purchases. A per-token shared API supplies access to a common fleet. Reserved throughput commits some service capacity under a stated agreement. A dedicated deployment allocates replicas of a specified model and configuration. The contract determines whether unused capacity can serve someone else and what a customer can tune.')+
      source('Reserved API throughput and overage terms',fireworks)+
      source('Together endpoint, deployment and configuration objects',together)+
      h('deployment-control','An endpoint name is not a running model')+
      p('Together describes an endpoint as a stable address, a deployment as a model and hardware combination running behind it, and a configuration as the recipe for execution. This separation makes a routine operation intelligible. The address can remain fixed while an operator changes replicas or moves traffic to a validated configuration.')+
      p('The control plane stores that intended configuration, provisions replicas and decides when a replacement is ready. The execution path receives actual requests and streams results. A successful configuration update does not by itself say that all new weights have been loaded or that every request already uses them. Readiness must refer to a model, revision and usable execution state.')+
      p('A multi-node model adds a group requirement. A replica needing eight cooperating GPUs is not ready when seven have loaded. A quota showing eight free GPUs across unrelated placements does not establish that they form a legal group with the required interconnect. Fragmented capacity can remain unusable for this deployment even while a dashboard shows free devices.')+
      h('burst-and-isolation','Pooling improves utilization and couples the tails')+
      p('Use a deliberately small queue model to see the pressure. Suppose arrivals are Poisson at rate '+m('\\lambda')+' and one worker has independent exponential service times at rate '+m('\\mu')+'. Its steady-state mean total time is '+m('1/(\\mu-\\lambda)')+' when '+m('\\lambda<\\mu')+'. This is the M/M/1 model, not a model of an actual continuously batched engine.')+
      p('At ten jobs per second of capacity, arrival rates eight and nine give means 0.5 and one second. A 12.5% increase in offered work has doubled mean response time. Near saturation, an efficiency improvement that leaves less spare capacity can sharply change the waiting experience.')+
      p('Real model service times depend on batching and sequence lengths, so we would estimate their behavior from traces. The small model explains why idle capacity can be part of a latency commitment. A second tenant’s burst consumes the same headroom unless admission or isolation protects it.')+
      p('Isolation also applies to state. Prefix sharing must respect the service’s account and data boundary. Even identical numerical content can be subject to a policy that forbids reuse across tenants. A cache-hit saving belongs in a capacity prediction only where the cache can legally and operationally be shared.')+
      p('An autoscaler can target a queue or a per-replica load, but the target must match the workload. Fireworks exposes prompt-token, generated-token, request and concurrency targets. The same request rate can require a different allocation after prompt lengths grow. We next account for the state that remains resident between those arrivals.')+
      source('Deployment load targets and replica controls',autoscaling),
  },
  {
    id:'model-execution', title:'From checkpoint to a production execution engine',
    body:
      p('A model file defines parameters and operations. It leaves work for an engine before those operations run efficiently on a particular device. The engine chooses layouts, communication schedules, numerical formats and kernels. Its supported maximum context and execution shapes determine which requests the service can actually admit.')+
      p('DeepInfra’s June 2026 account names Blackwell GPUs including B300, TensorRT-LLM execution, Dynamo distributed serving and ModelOpt NVFP4 quantization. This is a useful industrial case because each component answers a different part of the deployment problem. Their names do not supply a benchmark for every model or traffic distribution.')+
      source('DeepInfra’s disclosed production stack',deepinfra)+
      h('kernel-and-graph','A mathematical operation has several physical implementations')+
      p('Consider adding a normalization, matrix product and activation around every layer. Separate kernels write intermediate arrays and require separate launches. A fused implementation may keep intermediates closer to the processor and avoid those boundaries. At a large shape, arithmetic dominates. At a few decode rows, launch and preparation costs can consume a substantial part of the step.')+
      p('A captured execution graph can avoid repeated host preparation for a compatible shape. The scheduler still needs to map a changing batch onto the shapes available. Padding a batch to a larger graph can waste work, while creating too many specialized graphs consumes preparation time and memory. A shape bucket is a deliberate compromise that should appear in the measured cost table.')+
      p('This is also why reducing the logical token count can fail to reduce time. A schedule of 57 rows executed with a 64-row graph may cost almost the same after trimming to 50. Crossing the next useful shape boundary can produce a larger improvement. The speculative-allocation chapter will expose an analogous effect explicitly.')+
      engineCase+
      h('deploying-low-precision','A smaller weight format needs a complete numerical path')+
      p('Quantized weights require scales, supported kernels and a validation procedure. Weight storage, activation arithmetic, accumulation and KV storage can use different precisions. Calling an endpoint “four-bit” leaves all four questions open. A model with four-bit expert weights can still spend substantial memory on activations, non-expert parameters and attention state.')+
      p('For a chosen 100-billion-parameter object, two bytes per coordinate require 200 GB and half a byte requires 50 GB before scales and unquantized components. This is a storage calculation. The realized speedup depends on whether the hardware executes that format efficiently, whether unpacking is needed, and which operations dominate the request.')+
      p('Compare two versions using the same tokenized inputs, chat template and sampling conditions. Check numerical agreement where exact agreement is intended, then measure task quality, malformed tool calls, length and repeated actions. A low average error can coexist with a changed discrete choice. The workload’s important errors belong in the deployment gate.')+
      h('specialized-models','Adapters and multimodal inputs change the batch the engine sees')+
      p('A provider can host several small adapters on one base model. The base weights may be shared, while each request selects its adapter. Requests using different adapters need their corresponding additional matrix calculations and compatible kernels. Filling the base batch does not guarantee that each adapter group has an efficient size.')+
      p('Suppose eight requests select adapters in counts six, one and one. A base operation sees eight rows, while a grouped adapter implementation encounters three groups with those sizes. The two singleton groups can have a different cost per row. Admission and pricing should be based on the work actually supported rather than treating every customization as free.')+
      p('A visual document also needs decoding, resizing, patch construction and encoder work before its language-model positions are ready. These operations can have their own batch and memory limits. A long text prompt and a high-resolution image with the same final language-token count can therefore have different initial latency. The service trace must begin early enough to include that preparation.'),
  },
  {
    id:'offline-and-online', title:'Offline jobs, retrieval and deadline scheduling',
    body:
      p('The extraction job has no reader waiting for its next word. It does have a morning deadline, an output schema and a large amount of unfinished work. Holding its requests to the interactive queue’s latency target would spend capacity on a promise nobody asked for.')+
      p('DeepInfra’s Batch API supplies an asynchronous submission and retrieval path with a 24-hour completion window. The same broad model interface can therefore expose a different scheduling contract. This public product description does not establish which internal scheduler or machines process the jobs.')+
      source('DeepInfra’s batch job lifecycle',batch)+
      h('deadline-work','Measure remaining work against remaining usable time')+
      p('Suppose our authored job has two million records, averaging 600 input and sixty output tokens. Its declared work is 1.2 billion input tokens and 120 million output tokens. With twelve hours remaining, the required averages are about 27,778 input and 2,778 output tokens per second.')+
      eq('R_{\\mathrm{in}}=\\frac{2{,}000{,}000\\cdot600}{12\\cdot3600},\\qquad R_{\\mathrm{out}}=\\frac{2{,}000{,}000\\cdot60}{12\\cdot3600}.')+
      p('These two rates cannot be added as interchangeable tokens. Prompt processing and output generation can compete for different resources, and their capacities depend on the chosen execution layout. A fleet plan must fit both, as well as memory, storage and validation work. A fixed discount says nothing about whether this particular deadline is feasible.')+
      p('An offline scheduler can reorder independent records by compatible length, group requests with reusable prefixes, or use capacity an interactive class is temporarily leaving idle. A long active device operation may still delay interactive work before the scheduler can intervene. Smaller chunks improve those intervention points while potentially losing some efficiency.')+
      p('Borrowed capacity is uncertain. If the job requires 2,778 output tokens per second and the estimated spare rate is 3,000, a brief interactive burst can consume the margin. Track remaining output work and recompute the required rate as the deadline approaches. A policy can reserve capacity later rather than assuming yesterday’s average spare capacity will persist.')+
      h('records-and-retries','Throughput must count valid records that survive interruption')+
      p('Give each logical record a stable identifier and validate its structured result. A batch can finish with some successful records and some failures. Retrying the entire submission can pay again for completed work and produce duplicate downstream effects. Resubmitting only unresolved IDs preserves a useful completion boundary.')+
      p('For an authored 2% independent invalid-output rate, repeated attempts need an expected '+m('1/0.98')+' calls per valid record, about 1.0204. A systematic schema error or inaccessible document violates that independence assumption. Retrying those records unchanged can consume a budget without increasing valid output.')+
      h('retrieval-is-a-pipeline','A retrieval service contains several different inference jobs')+
      p('A search application first embeds documents offline, then embeds a query, retrieves candidates, reranks them and asks a generator to answer. The reranker often evaluates many query–document pairs per query. Its workload scales with the number and length of candidates even when the final answer stays short.')+
      p('Consider an authored query with twenty retrieved candidates, each 1,000 tokens long. Sending all twenty to a cross-encoder reranker makes roughly twenty pair evaluations before the answering model starts. Keeping five afterward can reduce the generator’s prompt. That trade spends one model’s work to avoid another’s and may improve evidence selection. Its value requires measuring answer quality and total latency together.')+
      p('For scanned documents, OCR and image encoding precede extraction. A device can be underfed because CPU decoding or object storage is slow, while a generator’s tokens-per-second number remains excellent. The job trace therefore retains stage-level occupancy and valid-record progress. A GPU utilization plot alone cannot identify that upstream bottleneck.'),
  },
  {
    id:'fleet-changes', title:'Starting, upgrading and replacing the fleet',
    body:
      p('A new replica has to become useful before it can shorten a queue. Allocating devices, transferring weights, initializing communication, preparing kernels and declaring readiness all take time. A replica may then begin without the useful prefixes held by older workers.')+
      h('startup-debt','Reactive scaling leaves work accumulated during startup')+
      p('Use a fluid approximation with fifty arrivals per second and ready capacity for thirty-five. A new replica takes sixty seconds to become ready. During that interval, unfinished work grows by fifteen requests per second, accumulating 900 requests. Suppose capacity then rises to seventy per second. Only twenty per second remain after serving new arrivals, so clearing the backlog takes another forty-five seconds.')+
      study('fleet')+
      p('Let '+m('\\lambda')+' denote arrivals, '+m('\\mu_0')+' ready capacity, '+m('\\tau')+' startup time and '+m('\\mu_1>\\lambda')+' capacity afterward. Starting with an empty queue, the authored model gives')+
      eq('Q(\\tau)=\\max(0,\\lambda-\\mu_0)\\tau,\\qquad T_{\\mathrm{drain}}=\\frac{Q(\\tau)}{\\mu_1-\\lambda}.')+
      p('The model deliberately replaces varying jobs with constant rates. Its lesson is the debt accumulated before a scale-up helps. Keeping warm capacity, forecasting a known burst or admitting less work changes that interval. Faster steady-state kernels alone do not remove a startup delay that has already elapsed.')+
      p('A real service may reject rather than queue this work. Fireworks documents that requests to a scaled-to-zero deployment receive a scaling-up error and are not queued. The application’s retries then form part of the effective waiting path. A client must retain its deadline across those attempts.')+
      source('Documented scale-from-zero response behavior',autoscaling)+
      p('Baseten’s documented autoscaler gives a second concrete policy. It averages concurrency over a configured window and divides by the concurrency target times a target utilization. Its example of 25 concurrent requests, target ten and utilization 70% asks for '+m('\\lceil25/(10\\cdot0.7)\\rceil=4')+' replicas. A desired count is a control decision; the additional replicas still have to start.')+
      p('The concurrency metric includes streaming requests until their streams complete. It therefore differs from requests per second. Baseten also documents billable startup and a delay before scale-down. Those intervals make the warm-floor decision visible in the bill as well as in latency. Averaging and decision intervals add another delay before the startup interval in our fluid example begins.')+
      source('Baseten’s concurrency controller, startup and billing boundaries','https://docs.baseten.co/deployment/autoscaling/overview')+
      h('canary-and-drain','Changing weights changes the service being measured')+
      p('An upgrade can change a checkpoint, tokenizer, chat template, engine, precision or scheduler setting. Preserve those identities together. Start a small replacement allocation, run readiness checks, then send a controlled share of traffic. Compare latency, error types, output lengths and task success under recorded conditions before increasing that share.')+
      p('A randomized request split is useful for independent calls. A continuing session can require a sticky version assignment so that a trial does not silently change its model halfway through a repair. A switch can also invalidate KV state. The experiment should state which unit receives the version assignment and how repeated prefixes are handled.')+
      p('Draining stops new admissions to an old replica while its accepted work finishes or migrates under the service’s recovery policy. A maximum drain interval bounds how long an upgrade can wait. Terminating everything at that deadline can still interrupt a long session, so the client-visible behavior belongs in the contract.')+
      h('regional-headroom','Failover consumes spare capacity that was already doing something')+
      p('Two regions each able to serve 100 work units per second cannot each operate at eighty and also absorb the other’s complete traffic after one fails. The surviving region would receive 160. To preserve the same work and deadline under that failure, capacity, admitted traffic or service guarantees must change.')+
      p('Replication of a model does not imply replication of session state. A remote region can have the right weights but none of the cached history, with different transfer distance and warmup costs. Data-placement rules may also exclude it as a destination. Regional failover is consequently a capacity-and-state exercise before it is a routing toggle.')+
      p('The same budget applies to maintenance. Draining a fraction of the fleet, holding a canary and reserving failover room all reduce capacity available for ordinary arrivals. A cost calculation that assumes every device is continuously serving paid tokens leaves these operating intervals out.'),
  },
  {
    id:'provider-case-studies', title:'What the industrial implementations actually disclose',
    body:
      p('The providers below expose different parts of their systems. Some publish engine and precision choices. Others document a capacity product or deployment lifecycle. We can compare those disclosed mechanisms without pretending to know every private scheduling decision.')+
      table(['Case','Public evidence to inspect','Engineering question it supports'],[
        ['DeepInfra','TensorRT-LLM, Dynamo, NVFP4 and Blackwell stack account','How do engine, precision and hardware changes reach a production endpoint?'],
        ['Fireworks','Service modes, throughput reservations and replica controls','Which work is protected, rejected or retried under load?'],
        ['Together','Endpoint / deployment / configuration separation','How can the execution recipe change behind a stable address?'],
        ['Baseten','Documented concurrency controller and billable startup','How do startup and replica policy affect paid idle time?'],
        ['Groq','Flex service conditions','What does a throughput-oriented tier promise when capacity is unavailable?'],
        ['Cerebras','AMD partnership announcement describing phase specialization','Which hardware is intended to process prompts and which to generate tokens?'],
      ],'A source-led comparison of disclosed design choices, checked November 2026')+
      source('DeepInfra production-stack account',deepinfra)+
      source('Fireworks reserved-throughput contract',fireworks)+
      source('Together deployment objects',together)+
      source('Baseten autoscaling and request occupancy','https://docs.baseten.co/deployment/autoscaling/overview')+
      source('Groq Flex conditions',groq)+
      source('AMD–Cerebras phase-specialization announcement','https://investors.cerebras.ai/node/7256/pdf')+
      h('production-evidence','Separate a deployed result from a proposed architecture')+
      p('DeepInfra’s account is a provider report about its deployed stack. The AMD–Cerebras source is a partnership announcement. They have different evidential roles. A proposed split between prompt processing and generation supplies an architectural hypothesis; it does not supply a measured latency distribution for a currently purchased endpoint.')+
      p('Likewise, an advertised throughput gain needs its original workload and denominator. A useful comparison would retain the model variant, precision, hardware count, input and output lengths, concurrency, cache state and observation interval. Without those conditions, a “four times faster” statement cannot populate our fleet model.')+
      p('First-party model APIs and routing aggregators add other boundaries. An aggregator can select a provider while leaving the chosen engine private. An API-compatible response does not establish identical templates, precision, sampling or capacity. Record the provider actually selected and any available revision identifier when performing a matched comparison.')+
      h('workload-to-purchase','Choose the arrangement by the failure that matters')+
      p('For interactive support, begin with queue-inclusive first-token delay, stream gaps and failure rate at the expected burst shape. For the overnight job, begin with valid records before the deadline and paid retries. For the coding agent, retain long-prefix reuse and the full task result. A provider can be attractive on one of these workloads and expensive on another.')+
      p('The next chapter turns those observations into comparable measurements. A provider table is useful when each entry leads to a reproducible operating point. It becomes misleading when an undisclosed component is filled in by guesswork or a service’s best isolated number is treated as its sustained production capacity.'),
  },
];
