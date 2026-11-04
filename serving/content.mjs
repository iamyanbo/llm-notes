import {p, math, equation, study, source, definition, table} from '../systems/markup.mjs';

const deployment = 'https://github.com/deepseek-ai/DeepInfer/blob/main/doc/inference_deployment_qa.md';
const measured = 'https://llm-d.ai/blog/serving-glm-5-2-agentic-workloads-on-llm-d';
const topology = 'https://llm-d.ai/docs/dev/well-lit-paths/models/glm-5-2';
const offloading = 'https://docs.nvidia.com/dynamo/v1.6.1/knowledge-base/modular-components/backends/v-llm/native-kv-offloading';
const misc = '../miscellaneous/';

export const serving = {
  slug: 'serving',
  title: 'Serving LLMs',
  heading: 'Serving<br><em>language models.</em>',
  subtitle: 'Follow a coding session through model calls, tool waits, cached state, and the machines sharing its work.',
  description: 'A continuous investigation of agent serving, cache lifetimes, queueing, physical GPU placement, and performance evidence, with DeepInfer and llm-d case studies.',
  hero: 'request',
  overviewLabel: 'Open the session map',
  companion: {slug: 'training', title: 'Training and post-training'},
  introduction:
    p('Consider asking a coding assistant to repair a failing test. It reads the repository, makes an edit, and runs the test. While the test is executing, the model has nothing new to generate. A little later, the result returns and the assistant asks the model what to do next. To us this is one piece of work. The model service receives several requests, with a pause between them.') +
    p('That pause creates an awkward choice. Keeping the earlier calculation in GPU memory can make the next turn cheaper, but occupies space that another session could use now. Moving it elsewhere frees that space and creates a future transfer. Discarding it leaves a future calculation. The service has to choose before it knows exactly when the session will return.') +
    p('We will stay with this repair as other sessions arrive, memory fills, and the work spreads across machines. Each change gives us a reason to examine another part of the service. Hand-chosen examples make the accounting visible. Published deployments let us test whether the same pressures matter in an actual cluster.') +
    p('The background explanations of <a href="'+misc+'#request-scheduling">continuous batching</a>, <a href="'+misc+'#cache-systems">cache allocation and prefix sharing</a>, and <a href="'+misc+'#gpu">GPU memory</a> are in Miscellaneous Topics. We will recall what each construction provides when we use it. <a href="../transformers/">Transformers in Practice</a> develops the model operations, including cached generation and speculative decoding.'),
  sections: [
    {
      id: 'one-request', title: 'One session, several requests',
      body:
        p('The harness is the program keeping track of the repair. It sends the conversation to a model service, executes the returned tool calls, and includes their results in later requests. The opening map follows those messages. Its vertical lines belong to the harness, service, and tool environment. A horizontal arrow is a message passing between them.') +
        p('On the first call, the service renders the messages with the model’s chat template and converts the result to token IDs. Prefill processes the supplied positions. Decode then extends the response using retained attention state. The assistant’s edit and test invocation return to the harness, which starts the test in the repository environment.') +
        p('The next model call cannot include a test result that has not arrived. During that wait, the environment can be busy while the model service runs other sessions. Once the test fails, the harness appends the result. An identical earlier prefix may be reusable, while the new observation still requires processing.') +
        p('We therefore need to retain two kinds of continuity. The harness records the task and what happened in the repository. The serving system may retain compatible numerical state for repeated model inputs. A durable task record allows reconstruction after a cache miss. A reusable cache saves some of that reconstruction work.') +
        source('The model and harness loop', misc+'#harnesses') +
        p('We can measure a model call from its arrival to its first returned token, then measure the gaps between later tokens. We can also measure the repair from the original instruction to a checked result. Tool execution and dependencies between calls contribute to this second clock. Improving one decode interval helps only the portion of the repair that depends on it.') +
        definition('1.1', 'A <strong>session</strong> is the continuing unit of work whose requests share a task and accumulated state. A <strong>request</strong> is one invocation of the model service. The session’s completion criterion and the request’s timing boundaries must be stated when measuring either.') +
        p('A plausible first design sends every returning call to the worker that handled the previous one. This preserves locality as long as the state survives there. Before adopting that rule, we need to account for the memory occupied while the test is running.'),
    },
    {
      id: 'memory-and-work', title: 'State during the tool pause',
      body:
        p('Suppose we keep a private 0.5 GiB of state for each session. In a chosen steady workload, two new sessions begin each second. Each uses the model for five seconds and then waits ten seconds for its tool, retaining that state throughout. We are counting one lifetime per session to isolate the effect of the pause.') +
        p('Without the pause, about ten such lifetimes overlap. Including it makes the retained lifetime fifteen seconds, so about thirty overlap. At 0.5 GiB each, the average occupied memory rises from 5 GiB to 15 GiB. The number of tokens processed during the active part has stayed fixed.') +
        study('residency') +
        p('The calculation multiplies an arrival rate by a duration. Let '+math(String.raw`\lambda`)+ ' be the number of new sessions per second, '+math('T')+' their mean retained lifetime in seconds, and '+math('B')+' their constant private memory in GiB. Under this steady-state model,') +
        equation(String.raw`\text{mean resident sessions}=\lambda T,\qquad \text{mean retained memory}=\lambda T B.`) +
        p('For varying memory within a lifetime, we would first count how much memory the session holds over time, then average that quantity across arrivals. Shared physical prefix blocks require their own account because counting the same block separately for each session would overstate residency. A mean below capacity also leaves bursts to handle. Using this estimate for admission requires a separate allowance for bursts.') +
        p('Our repair now has a reason to leave expensive GPU memory during the tool wait. A host-memory copy can preserve reuse while freeing space for active requests. The choice depends on the likely return time, the cost of moving the state, and the work saved on return.') +
        p('In llm-d’s GLM-5.2 study, one 64-GPU run writes roughly 5 TB to CPU cache over 24 minutes and performs no restores because active prefixes still fit in HBM. Its provisioned NVMe tier receives no reads in those measurements.') +
        source('Observed cache-tier use', measured) +
        p('A configured tier can therefore be doing preparatory work before its additional capacity is needed. To judge it, we would record writes, restores, evictions, and avoided recomputation as concurrent sessions increase. A capacity diagram alone would hide when the tier begins to help.') +
        p('The test has now finished. Our session returns alongside others. Whether the prefix survived will affect both its own work and the queue behind it.'),
    },
    {
      id: 'arriving-requests', title: 'The clock the client sees',
      body:
        p('Take four simultaneous returning sessions sharing one prefill processor. Our session is fourth. In this chosen workload, each old prefix takes six seconds to recompute, followed by 0.4 seconds for new work before the first output. Processing one call occupies 6.4 seconds, so our session reaches its first output after 25.6 seconds.') +
        p('Now suppose the same prefixes can be restored in 0.06 seconds each. Keep the 0.4 seconds of new work and the serial order fixed. Each call occupies 0.46 seconds, and the fourth reaches its first output after 1.84 seconds. The fourth call benefits from the work avoided for the preceding three as well as its own prefix.') +
        study('queue') +
        p('The diagram adds each request’s wait, prefix work, and new work. It uses a deliberately simple processor with no overlap. A real server may transfer state while another calculation runs, and several requests may execute together. Those details change the numerical result. The dependence of later waiting time on earlier work is already visible here.') +
        p('In llm-d’s controlled restore-versus-recompute comparison, the no-offload configuration reports about 5.7 seconds of server processing once work begins, while client time to first token reaches 59 seconds with 97 requests queued. These aggregate timings are reported separately. Their difference does not identify an individual request’s queue time.') +
        source('Client timing and server timing in the measured experiment', measured) +
        p('For our repair, a fast output stream would not remove the wait before it started. A useful trace records request arrival, admission, prefix restoration or recomputation, first output, and completion. We can then ask which interval changed when a deployment improved.') +
        p('Continuous batching supplies one mechanism for sharing execution. The existing scheduling essay works through its admission and completion arithmetic. Here the next question is placement. If the worker holding our prefix is busy, how long should we wait for it?') +
        source('Review continuous batching and completion latency', misc+'#request-scheduling'),
    },
    {
      id: 'returning-prefixes', title: 'Which worker should resume the session?',
      body:
        p('Suppose the worker holding our prefix has an estimated 140 ms queue, a 20 ms restore, and 40 ms of new work. Another worker has a 20 ms queue and would spend 300 ms computing the whole input, including the suffix. These are a separate set of chosen estimates for comparing two destinations.') +
        study('routing') +
        p('The first total is 200 ms and the second is 320 ms. Keeping all other estimates fixed, a warm-worker queue of 260 ms makes the totals equal. Call that queue '+math('W')+'. The decision we just made collects into') +
        equation(String.raw`W+20+40<20+300\quad\Longleftrightarrow\quad W<260\ \mathrm{ms}.`) +
        p('A locality rule needs a limit when it concentrates too much work on one destination. Its prediction should use the work actually pending there. Uncached input helps estimate prefill demand. Active streams and context lengths help describe decode demand. The estimate can be wrong, so its error belongs beside the resulting placement decisions.') +
        source('llm-d token-aware routing and saturation', 'https://llm-d.ai/blog/sticky-until-saturated-token-aware-routing') +
        p('There is another requirement hidden in “the worker holding our prefix.” The router must know where the state exists. Consider a block copied from GPU to CPU, then evicted from GPU. A directory that sees only the GPU eviction can conclude that the useful copy has disappeared.') +
        table(['Event', 'Worker’s actual copies', 'What the router needs to learn'], [
          ['Prefix computed', 'GPU', 'GPU copy available'],
          ['Host copy completes', 'GPU and CPU', 'CPU copy available too'],
          ['GPU copy evicted', 'CPU', 'Remove only GPU residency'],
          ['CPU copy evicted', 'None', 'Remove CPU residency'],
        ], 'One prefix block through a chosen sequence of cache events') +
        p('Dynamo’s vLLM offloading integration documents this failure mode. Without CPU-tier events, local offloading can work while routing treats CPU-resident prefixes as misses. The event interface is part of the usable cache.') +
        source('Dynamo cache events and routing visibility', offloading) +
        p('Once restoration becomes common, storage bandwidth can limit arrivals. Multiply bytes restored per request by requests per second to estimate the required read rate. DualPath studies a deployment where prefill workers’ storage interfaces saturate and adds a loading route through decode workers and the compute network.') +
        source('DualPath’s alternative KV-loading path', 'https://arxiv.org/abs/2602.21548') +
        p('We now have a placement rule involving queues, state, and transfers. Giving those destinations physical locations exposes the links over which the transfers must travel.'),
    },
    {
      id: 'physical-cluster', title: 'Putting the session on physical machines',
      body:
        p('The documented llm-d GLM-5.2 reference uses eight nodes with eight H200 GPUs each. Three prefill replicas span two nodes apiece, and one two-node replica performs decode. That is 48 prefill GPUs and 16 decode GPUs. Our session is routed to one prefill replica, then its KV state moves to decode.') +
        study('cluster') +
        source('Documented 64-GPU topology and configuration', topology) +
        p('A replica is a cooperating group of devices here. The model can divide attention work across different sequences while distributing expert weights across devices. At an MoE layer, selected token features must reach the devices holding their experts, and their results must return before the dependent calculation continues.') +
        p('Imagine one layer with four ranks receiving 32, 12, 12, and 8 equal-cost work items. There are 64 items, or sixteen per rank on average. With equal processing rates and a synchronization after the layer, the rank with 32 determines completion. The quieter ranks cannot use their spare capacity unless some of that selected work has a valid destination there.') +
        p('A redundant copy of a busy expert creates such a destination. The learned router still selects the logical function. A serving dispatcher can choose among its physical copies. In the idealized count above, balancing to sixteen items per rank halves the longest local work interval. Network transfers, kernel efficiency, and dispatch overhead determine how much of that saving survives.') +
        p('The extra copy also occupies memory. If it displaces prefixes, later turns may need more restoration or recomputation. Expert placement and cache allocation consequently compete within the same memory budget. SGLang’s Waterfill and LPLB implementations provide concrete dispatch strategies to inspect at this point.') +
        source('Physical expert copies and dispatch-time balancing', 'https://www.lmsys.org/blog/2026-06-26-waterfill-lplb/') +
        p('Separating prefill from decode gives each pool its own resource allocation. It adds the transfer between them. DeepSeek’s deployment description uses different expert-parallel group sizes for the two phases, and persistent cache storage adds another path. The relevant comparison includes the execution saved and the traffic introduced.') +
        source('DeepSeek production placement and cache paths', deployment) +
        p('Our repair has reached decode. It can now trade additional work within a step for a chance to advance several tokens at once.'),
    },
    {
      id: 'verification-budget', title: 'How much should a decode step attempt?',
      body:
        p('A draft model can propose a continuation for the target to verify. The mechanism and distribution-preserving checks are developed in Transformers in Practice. For this service, we need to decide how much verification work to give our session while other sessions are waiting.') +
        p('Choose an ordinary step costing 20 ms and committing one token. A speculative cycle takes 3 ms to draft and 36 ms to verify, committing three tokens on average. That is 39/3 = 13 ms per committed token. At a busier operating point, suppose verification takes 70 ms with the same accepted length. The result becomes 73/3, about 24.3 ms per committed token.') +
        p('Let '+math('C')+' denote a cycle’s duration and '+math('M')+' its committed token count. Under a stable repeated-cycle model, expected committed work divided by expected duration gives the long-run rate,') +
        equation(String.raw`\text{output rate}=\frac{\mathbb E[M]}{\mathbb E[C]}.`) +
        p('The current cost of verification matters alongside acceptance. An additional proposal competes with other requests for device time. A policy can allocate more work to proposals whose expected useful continuation justifies that cost.') +
        p('That saving must appear in the executed batch. If shortened proposals are padded back to the old shape, the logical budget shrinks while much of the device work remains. SGLang’s DSpark integration uses compact variable-length verification and matching execution graphs to make trimming reduce execution.') +
        source('DSpark verification budgets and executed shapes', 'https://www.lmsys.org/blog/2026-07-06-dspark-sglang/') +
        p('A timing trace should also include CPU preparation between device steps. Metadata construction and decisions that await sampled results can leave the GPU idle. Overlap can hide independent preparation. A decision requiring the latest result still has to wait for it. The useful optimization depends on which dependency lies on our session’s path.') +
        p('Once the assistant launches several investigations, those paths form a graph. Finishing one fast stream will no longer be enough to finish the repair.'),
    },
    {
      id: 'operating-service', title: 'Parallel calls, interruptions, and recovery',
      body:
        p('Suppose the harness asks twenty parallel investigations for results and needs all twenty before proceeding. In a chosen independence model, each meets a deadline with probability 0.99. The probability that all meet it is') +
        equation(String.raw`0.99^{20}\approx0.8179.`) +
        p('About 81.8% of these groups meet the deadline under those assumptions. A shared queue or overloaded expert can correlate delays, changing that result. The calculation gives a reason to measure the group’s finishing time and its dependencies, alongside individual request percentiles.') +
        source('Task dependencies and several agents', misc+'#multi-agent') +
        p('If one investigation has already found what the harness needs, cancellation may release the others. That release has to reach the engine and allocator. A closed client stream by itself does not establish when device work or retained state was reclaimed.') +
        p('A worker failure presents the same state question more sharply. The harness can resend recorded text, which permits reconstruction. A compatible KV copy elsewhere may shorten recovery. Either path needs a definition of which outputs were committed before interruption and how a resumed stream is joined to the earlier one.') +
        p('Reconstruction can itself use an approximation. DeepInfer documents rebuilding sliding-window state from the latest 128 tokens with a truncated replay window. It identifies that rebuilt cache as approximate, while reusing the separate block cache.') +
        source('DeepInfer bounded replay and its cache policy', deployment) +
        p('To assess that choice for our repair, we would compare task success and output behavior after the same interruptions, then record recovery time and work. Exact reuse, recomputation, and bounded reconstruction provide different experimental conditions. The model revision and cache policy are part of the service being tested.') +
        p('Adding machines also has a delay. Weights must become available, execution must be prepared, and useful prefixes may still live on older workers. A freshly allocated replica enters with a different state. Scaling based on uncached prefill work and active decode demand gives a more direct account of those needs than one fleet-wide utilization percentage.'),
    },
    {
      id: 'measurements-and-providers', title: 'Comparing services on completed work',
      body:
        p('Return to the repair we started with. The task is complete when the required change passes its checks. We can now compare deployments using the time and resources needed to reach that result, including repeated turns, tools, parallel calls, retries, and failures.') +
        p('For request capacity, suppose one configuration completes 100 requests per second and half meet the required latency bounds. Another completes 80 and 90% qualify. They deliver 50 and 72 qualifying requests per second. The second serves more work under the stated requirement.') +
        definition('8.1', '<strong>Request goodput</strong> is the number of completed requests per unit time satisfying a stated set of service requirements. Task goodput additionally needs a task completion criterion and a rule for counting the requests belonging to it.') +
        p('The existing evaluation essays develop uncertainty, budgets, and matched comparisons. Here we need a workload record detailed enough to replay arrivals, repeated prefixes, and pauses. A fixed-concurrency client sends replacement work after completions. A recorded arrival trace can continue sending work while queues grow. These load experiments expose different behavior.') +
        source('Experimental conditions and evaluation evidence', misc+'#frontier-release') +
        table(['Workload probe', 'Record through the whole run', 'Decision it informs'], [
          ['Short interactive calls', 'Queue-inclusive first-token time, stream gaps, errors', 'Responsiveness under competing arrivals'],
          ['A returning coding session', 'Prefix overlap, cache tiers, tool pauses, complete repair time', 'Value of retention and locality'],
          ['Parallel investigations', 'Arrival burst, dependency graph, cancellation, final completion', 'Capacity for the complete group'],
          ['Interrupted work', 'Committed output, state recovered, replay policy, success', 'Recovery cost and behavior'],
        ], 'Use the same specified workload when comparing providers or implementations') +
        p('Input counters also need a common meaning. A logical prompt-token count includes the repeated prefix. Uncached tokens describe new computation. Bytes restored describe a transfer. Counting all three allows us to see whether a high input-token rate came from processing new material or reusing earlier work.') +
        p('DeepInfer’s example benchmark documents full speculative-acceptance accounting for its decode-throughput number. A user-facing capacity comparison also needs the output actually committed. Keeping the original counter and its definition makes the reproduction auditable.') +
        source('DeepInfer benchmark counters', 'https://github.com/deepseek-ai/DeepInfer/blob/main/examples/README.md') +
        p('The provider study can carry these probes through model APIs such as OpenAI, Anthropic, Google, and DeepSeek; open-model hosts such as Together, Fireworks, DeepInfra, and FriendliAI; deployment platforms such as Baseten and Modal; and accelerator services such as Groq and Cerebras. For each tested endpoint, record its exact model, access tier, region, template, settings, prices, and observation date. Engine assignments that a provider has not disclosed remain unknown.') +
        source('Hosted-provider starting points', 'https://huggingface.co/docs/inference-providers/index') +
        p('For dedicated capacity, divide the full cost over the observation period by successful qualifying tasks, including idle periods and failed attempts. For an API, retain the billable categories across the same tasks. The earlier question about a cached prefix now reaches the final account through waiting time, transfers, repeated work, and the result the service delivered.'),
    },
  ],
  sources: [
    ['llm-d GLM-5.2 measurements', measured],
    ['llm-d deployment configuration', topology],
    ['llm-d token-aware routing', 'https://llm-d.ai/blog/sticky-until-saturated-token-aware-routing'],
    ['Dynamo v1.6.1 native KV offloading', offloading],
    ['DeepInfer deployment and replay', deployment],
    ['DeepInfer benchmark methodology', 'https://github.com/deepseek-ai/DeepInfer/blob/main/examples/README.md'],
    ['DualPath', 'https://arxiv.org/abs/2602.21548'],
    ['SGLang expert dispatch', 'https://www.lmsys.org/blog/2026-06-26-waterfill-lplb/'],
    ['SGLang DSpark', 'https://www.lmsys.org/blog/2026-07-06-dspark-sglang/'],
  ],
};
