import {p, math, equation, study, source, definition, table} from '../systems/markup.mjs';

const deepinfer = 'https://github.com/deepseek-ai/DeepInfer/blob/main/doc/inference_deployment_qa.md';
const cluster = 'https://llm-d.ai/docs/dev/well-lit-paths/models/glm-5-2';
const routing = 'https://llm-d.ai/blog/sticky-until-saturated-token-aware-routing';

export const serving = {
  slug: 'serving',
  title: 'Serving LLMs',
  heading: 'Serving<br><em>language models.</em>',
  subtitle: 'A prompt arrives. Other people are already waiting. What should the machines do next?',
  description: 'A reading prototype on LLM execution, scheduling, cache reuse, real GPU clusters, and the cost of delivering generated tokens.',
  hero: 'request',
  companion: {slug: 'training', title: 'Training and post-training'},
  introduction:
    p('Consider a coding assistant examining a repository. It reads a collection of files, proposes a change, runs a test, and receives the result. The next request contains much of the same conversation and a little new information. While the test runs, another person asks the service a short question. A third person submits a long document.') +
    p('All three may use the same model, yet their requests place different demands on the machines. The long document needs substantial initial processing. The returning assistant may be able to reuse a previous calculation. A person already receiving an answer cares about the gaps between its successive pieces. A serving system has to arrange this work while each request occupies memory and competes with the others.') +
    p('The model supplies a calculation for predicting another token. A service must decide when that calculation runs, which requests share an execution, where their retained state lives, and how the result returns to the caller. These decisions determine how much of the available hardware becomes useful work and how long a person waits.') +
    p('We will begin with one request, then introduce arrivals, memory limits, and returning conversations. Small, stated workloads let us inspect the consequences of a decision. Published deployments provide the physical setting in which those decisions have to work. The order follows the construction of a contemporary service.') +
    p('The transformer, causal attention, and next-token generation are assumed from <a href="../foundations/">Foundations</a>. The cache, precision, and speculation essays in <a href="../transformers/">Transformers in Practice</a> supply the underlying model operations. Here we account for their execution across requests and machines. Readers who want to investigate a result can follow the original report, change the example, or inspect the implementation linked beside it.'),
  sections: [
    {
      id: 'one-request', title: 'Following one request',
      body:
        p('Suppose the assistant sends the service a conversation ending with a test failure. The input first has to become the sequence the model expects. Messages and tool definitions are rendered with the model’s chat template, then converted to token IDs. The ordered IDs determine the model inputs. A change to the template can therefore change the calculation even when the visible conversation looks similar.') +
        p('The initial forward evaluation processes the supplied positions. In causal attention, the representation at an earlier position cannot depend on a later position. Keys and values computed for the earlier positions can consequently be retained for an extension. This initial processing is called <em>prefill</em>. Its final position supplies the distribution used for the first output token.') +
        p('After that token is selected, it becomes the input at the next position. The model computes the new row at each layer while reading the permitted retained keys and values. Repeating this operation extends the output. This is the <em>decode</em> phase. The cache grows with the generated sequence according to the model’s attention architecture.') +
        p('The service can return decoded text pieces as generation proceeds. The first visible piece and the last visible piece occur at different times, and pauses between pieces can matter throughout the answer. A person watching a stream may notice a stall that an average tokens-per-second number conceals.') +
        definition('1.1', 'The <strong>time to first token</strong> is the elapsed time from a stated request start to the first returned output token. An <strong>inter-token latency</strong> is the elapsed time between successive returned output tokens. The start boundary and the treatment of buffering belong with either measurement.') +
        p('This gives us a first way to examine a slow request. We can locate the delay before admission, during input preparation, in prefill, in a decode step, or in returning the result. An execution trace should retain those boundaries. Otherwise a fast model kernel can appear to explain a request whose time was actually spent elsewhere.') +
        source('vLLM execution and serving implementation', 'https://github.com/vllm-project/vllm'),
    },
    {
      id: 'memory-and-work', title: 'What occupies the machine',
      body:
        p('Before another request can join, its state needs somewhere to live. Model weights are shared across requests using that model instance. Each active sequence also has its own retained attention state. Temporary workspaces, communication buffers, and captured execution graphs occupy further memory. A scheduling decision must fit all of these at once.') +
        p('Take a deliberately small memory account. A hypothetical device has 16 GiB available, weights occupy 8 GiB, and the execution workspace occupies 2 GiB. Assume each admitted request currently needs 32 MiB of KV state. Here one GiB is 1,024 MiB. The remaining 6 GiB can hold at most') +
        equation(String.raw`\frac{6\cdot1024\ \mathrm{MiB}}{32\ \mathrm{MiB/request}}=192\ \mathrm{requests}.`) +
        p('That count is a capacity bound under the chosen assumptions. Actual sequences have different lengths and continue to grow. Reserving memory only for their current length can force a later eviction or recomputation. Reserving every possible future position can leave most of the device unused. Allocating state in blocks allows physical placement to follow demand while a table preserves logical sequence order.') +
        p('Suppose a lower-precision weight representation reduces the weight allocation to 4 GiB, with the other quantities held fixed. The same arithmetic now gives 320 requests. The freed memory has several possible uses. It can admit more active sequences, keep more idle prefixes reusable, or accommodate replicated experts. Which allocation helps depends on the work that arrives next.') +
        p('Memory capacity and memory bandwidth answer different questions. Capacity asks whether the data fits. Bandwidth asks how quickly the required bytes can be read and written. A decode step may touch a large weight set for a small number of new token rows. Combining several rows into one matrix multiplication can reuse those weight reads. As the batch grows, arithmetic and communication can become the limiting resources.') +
        p('We should therefore account for both the bytes resident on the device and the bytes moved during a step. Lower precision can change both, while introducing numerical error. A meaningful comparison records the format, its scales, and the evaluation results alongside its memory and timing gains.') +
        source('PagedAttention and KV memory management', 'https://arxiv.org/abs/2309.06180'),
    },
    {
      id: 'arriving-requests', title: 'When another request arrives',
      body:
        p('A single request leaves little choice about who runs next. Several requests create a scheduling problem. To isolate that choice, suppose prefill has already finished and the machine can advance at most two requests during each unit of decode time. A arrives at time 0 and needs three tokens. B arrives at time 1 and needs two. C arrives at time 2 and needs one.') +
        table(['Request', 'Arrival', 'Decode tokens required'], [['A', '0', '3'], ['B', '1', '2'], ['C', '2', '1']], 'Chosen arrivals and output lengths') +
        p('First run one request to completion before considering the next. A occupies the machine until time 3, B until time 5, and C until time 6. Their elapsed times from their own arrivals are 3, 4, and 4. The second available slot has done no work.') +
        p('Now allow the active batch to change between iterations. A advances alone in the first interval. B joins at time 1. Both advance in the next two intervals and finish at time 3. C then uses a released slot and finishes at time 4. Their elapsed times are 3, 2, and 2. The operation at each occupied slot is unchanged. The admission and completion order have changed.') +
        study('batch') +
        p('The mean completion latency falls from 11/3 to 7/3 time units in this example. We have assumed that an iteration takes one unit regardless of occupancy and that every admitted request fits in memory. Those assumptions make the scheduling effect visible. Measurements on hardware must include how batch composition changes iteration time.') +
        p('A new prompt adds another difficulty. A large prefill can occupy the execution stream for long enough to interrupt existing decodes. Breaking prefill into chunks gives the scheduler opportunities to admit other work between them. The chunk size then becomes a latency decision as well as a throughput decision. Tiny chunks add overhead. Large chunks leave longer uninterrupted waits.') +
        p('A token count by itself need not predict the chunk’s duration. The context already present affects attention work, and experts can receive unequal token loads. A service can fit a cost model and choose work that stays within a step-time budget. The quantity being scheduled is estimated execution demand, with token counts supplying some of its inputs.') +
        source('Chunked prefill and the throughput–latency tradeoff', 'https://www.usenix.org/system/files/osdi24-agrawal.pdf'),
    },
    {
      id: 'returning-prefixes', title: 'The conversation returns',
      body:
        p('The assistant’s test has finished. Its next request repeats the earlier conversation and appends the test result. If a worker retains compatible state for an identical prefix, it can continue from that calculation. The unchanged conversation now has a physical location in addition to its logical contents.') +
        p('A cache entry must correspond to the relevant model, token sequence, positions, and execution settings. Reusing its state saves the work of constructing that state. It still occupies storage, must be found, and may need to be transferred. A retained conversation and its previously computed KV tensors are separate things the system manages.') +
        p('Suppose the worker holding this prefix has a queue. We estimate a wait of 140 ms, followed by 20 ms to restore the prefix and 40 ms for the new suffix. Another worker has a 20 ms queue but would spend 300 ms computing the complete prompt, including the suffix. These are chosen estimates for a serial timing model.') +
        study('routing') +
        p('The warm worker’s estimated time is 200 ms. The cold worker’s is 320 ms. Increase the warm worker’s queue while keeping the other estimates fixed. At 260 ms of waiting the totals meet. Beyond that point, recomputation at the colder worker gives the earlier result in this model.') +
        p('Call the warm queue wait '+math('W')+'. The decision follows directly from the operations we counted,') +
        equation(String.raw`W+20+40<20+300\quad\Longleftrightarrow\quad W<260\ \mathrm{ms}.`) +
        p('Cache-aware routing must weigh reuse against congestion. Its estimates depend on what limits the workload. A queue of uncached input tokens helps describe pending prefill work. Active streams and their context lengths help describe decode demand. A cached prefix is valuable only in relation to the work it avoids and the waiting it creates.') +
        p('Restoration can itself become the bottleneck. If each returning request needs many bytes from remote storage, arrival rate multiplied by bytes per request gives the required read bandwidth. DualPath studies a setting where storage interfaces at prefill workers saturate while decode workers have unused storage bandwidth. It uses another loading route through those workers. The computation avoided by caching has exposed a data-movement limit.') +
        source('Cache affinity with a saturation threshold', routing) +
        source('DualPath and the storage-bandwidth bottleneck', 'https://arxiv.org/abs/2602.21548'),
    },
    {
      id: 'physical-cluster', title: 'Where the request goes in a cluster',
      body:
        p('We can now put the scheduler and retained state on actual machines. The published llm-d GLM-5.2 deployment includes a configuration with eight nodes, each containing eight H200 GPUs. Three prefill replicas each span two nodes. A fourth, two-node replica performs decode. The allocation is 48 prefill GPUs and 16 decode GPUs.') +
        study('cluster') +
        p('Follow one request through the drawing. The router chooses one prefill replica. Its GPUs cooperate on that request according to their parallel layout. Retained state is handed to the decode replica over the network. That replica advances the sequence and returns tokens. Other prefill replicas remain available for other requests.') +
        p('The same published study also measures an allocation with two prefill and two decode replicas, using the same total GPU count. The comparison asks how much capacity to give each phase under its workload and latency requirements. Its tested infrastructure uses CoreWeave and InfiniBand, with NIXL transferring KV state between phases.') +
        source('GLM-5.2 deployment topology and operating points', cluster) +
        p('Several forms of parallelism coexist inside such a drawing. Data-parallel attention can keep different sequences’ state on different ranks. Expert parallelism distributes expert weights and sends a token’s features to the devices holding its selected experts. Tensor parallelism divides a calculation across devices. Pipeline parallelism assigns successive portions of the model to stages. Each changes both the work placement and the messages that must cross a link.') +
        p('An MoE layer introduces a second placement decision after the model selects a logical expert. If the service holds several physical copies of that expert, it can distribute execution among them. The model’s selected function stays the same while its physical destination changes. Replicas can shorten an overloaded device’s tail, but their weights consume memory that could otherwise hold sequences or prefixes.') +
        p('DeepSeek’s deployment description uses small expert-parallel groups for prefill and much wider ones for decode. It also separates vision encoding, prefill, decode, and persistent cache storage. Those choices make sense only with the per-expert batch, weight traffic, state footprint, and network topology in view. We should evaluate each movement in the physical graph against the saving that motivated it.') +
        source('DeepSeek production deployment', deepinfer) +
        source('Dispatching work across physical expert replicas', 'https://www.lmsys.org/blog/2026-06-26-waterfill-lplb'),
    },
    {
      id: 'verification-budget', title: 'How much work should a step attempt?',
      body:
        p('Autoregressive generation requires a succession of model steps. A draft model can propose several tokens for the target to verify together. Accepted proposals allow one verification cycle to advance farther. The cycle also spends time producing drafts and evaluating proposals that may be rejected.') +
        p('Consider chosen timings at one operating point. An ordinary step costs 20 ms and commits one token. A speculative cycle costs 3 ms to draft and 36 ms to verify, and commits three tokens on average. Its time per committed token is 39/3 = 13 ms. If verification instead costs 70 ms at a busier operating point, the same accepted length yields 73/3, about 24.3 ms per committed token.') +
        p('Acceptance has remained the same while the execution cost has changed. Let '+math('C')+' be a cycle’s wall-clock duration and '+math('M')+' its committed token count. Under a stable repeated-cycle model, the long-run output rate is described by') +
        equation(String.raw`\frac{\mathbb E[M]}{\mathbb E[C]}.`) +
        p('Choosing the verification length therefore requires a cost estimate as well as a confidence estimate. Additional proposals compete with other requests for the verification budget. A sensible allocation spends work where the expected additional committed output justifies it at the current batch size.') +
        p('The saving also has to survive the implementation. If a shorter proposal is padded back to the same execution size, reducing its logical length may leave the expensive computation intact. SGLang’s DSpark implementation uses compact variable-length verification and execution graphs keyed to the resulting work. The representation of the batch is part of the optimization.') +
        source('DSpark confidence scheduling and compact verification', 'https://www.lmsys.org/blog/2026-07-06-dspark-sglang/') +
        p('Between model steps, the CPU prepares metadata and interprets sampled results. A trace can show the GPU idle while that work runs. Overlapping preparation of the next step with the current device computation removes some of this gap. The dependencies still have to be respected. A decision that needs the latest device result cannot simply read that result early.') +
        p('This gives another reason to inspect a full timeline. Fusing a kernel helps the interval containing that kernel. Reducing synchronization can shorten the gap around it. The two interventions affect different parts of the request’s critical path.'),
    },
    {
      id: 'operating-service', title: 'Keeping the service available',
      body:
        p('A deployment configured for a steady trace will eventually encounter different traffic. More people arrive, a shared document becomes popular, outputs become longer, or a device fails. The service has to change its allocation while requests are already in progress.') +
        p('Adding a replica takes time. Weights must be available, placed on devices, and prepared for execution. Kernels may need compilation and graphs may need capture. Existing useful prefixes may live elsewhere. A newly allocated machine consequently has a different state from an already warm worker.') +
        p('Scaling decisions should use the resource demand of the relevant phase. Additional uncached input creates prefill work. More active output streams create decode demand and retained state. A single fleet-wide GPU-utilization number can conceal an overloaded phase alongside an underused one.') +
        p('Moving a running request also means moving enough state to continue it. Keeping its text permits reconstruction, which costs time. Transferring compatible retained state can avoid reconstruction, which costs bandwidth and coordination. A failure policy needs to specify which of these paths is available and how the client observes the interruption.') +
        p('Cancellation matters for the same reason. Once the caller stops waiting, continuing a long generation consumes capacity that another request could use. Admission limits, cancellation, draining, and recovery belong in the service’s execution model. They determine which work remains valuable under changing demand.') +
        source('Dynamo request, control, and state paths', 'https://docs.nvidia.com/dynamo/latest/knowledge-base/overview'),
    },
    {
      id: 'measurements-and-providers', title: 'What a performance claim measures',
      body:
        p('Suppose one configuration completes 100 requests per second, but only half meet the specified latency requirements. Another completes 80, with 90% meeting them. Under this chosen comparison, the first delivers 50 qualifying requests per second and the second delivers 72. Aggregate throughput has ranked them differently from useful capacity under the requirement.') +
        definition('8.1', '<strong>Request goodput</strong> is the number of completed requests per unit time that satisfy a stated set of service requirements. The workload, latency boundaries, and qualifying conditions are part of its definition.') +
        p('The load generator affects what we observe. A fixed-concurrency client waits for completions before sending replacement requests. A timestamped arrival trace can keep sending work while queues grow. These experiments answer different questions. Latency measured only after dispatch may omit time spent waiting to dispatch, especially when the client is itself throttling demand.') +
        source('Effective latency and coordinated omission', 'https://docs.nvidia.com/aiperf/v0.13.0/reference/effective-vs-active-metrics') +
        p('The output counter also needs inspection. DeepInfer’s example benchmark documents a decode-throughput calculation using full speculative acceptance accounting, irrespective of actual acceptance. Its profiling and measurement windows are separated because the profiler changes timing. A reproduction should retain those conventions and separately count committed output when answering a user-facing capacity question.') +
        source('DeepInfer benchmark methodology', 'https://github.com/deepseek-ai/DeepInfer/blob/main/examples/README.md') +
        p('Provider comparisons become clearer when the same request trace is carried through them. Record the model revision, numerical format when disclosed, prompt template, sampling settings, cache condition, region, arrival process, output lengths, and failures. Then relate the observed timings and charges to the operations the service exposes.') +
        table(['Service or implementation', 'What the comparison can examine'], [
          ['OpenAI, Anthropic, Google, DeepSeek, Mistral, xAI, Cohere', 'Model APIs, streamed behavior, cache accounting, quotas, and service tiers.'],
          ['Together, Fireworks, DeepInfra, FriendliAI, Nebius, Novita, Hyperbolic, SiliconFlow', 'Hosted open-model inference, dedicated capacity, custom models, and published deployment details.'],
          ['Baseten, Modal, Hugging Face Endpoints, Replicate, Runpod', 'Model packaging, cold starts, scaling, concurrency, and operating responsibility.'],
          ['AWS, Google Cloud, Microsoft Foundry, Alibaba Cloud', 'Managed endpoints, reserved capacity, deployment placement, and infrastructure choices.'],
          ['Groq, Cerebras, SambaNova', 'Different memory and execution architectures, measured at the same workload and requirements.'],
          ['vLLM, SGLang, TensorRT-LLM, DeepInfer, Dynamo, llm-d', 'Inspectable execution, scheduling, routing, and state-management mechanisms.'],
        ], 'Provider and implementation groups for the comparative study') +
        p('An API’s price per token is one input to this account. For an agent task, the number of requests, repeated input, generated reasoning, tool waiting, retries, and successful completion also affect the cost. For dedicated hardware, paid idle capacity and the number of qualifying completions determine the effective cost per task. The request trace lets us connect these quantities to a deployment decision.') +
        source('Hugging Face provider directory', 'https://huggingface.co/docs/inference-providers/index') +
        source('Together deployment configurations and capacity-aware routing', 'https://www.together.ai/blog/configuring-dedicated-model-inference'),
    },
  ],
  sources: [
    ['DeepInfer deployment Q&A', deepinfer],
    ['DeepInfer benchmark methodology', 'https://github.com/deepseek-ai/DeepInfer/blob/main/examples/README.md'],
    ['llm-d GLM-5.2 deployment', cluster],
    ['llm-d token-aware routing', routing],
    ['DualPath', 'https://arxiv.org/abs/2602.21548'],
    ['SGLang DSpark implementation', 'https://www.lmsys.org/blog/2026-07-06-dspark-sglang/'],
    ['SGLang expert-replica load balancing', 'https://www.lmsys.org/blog/2026-06-26-waterfill-lplb'],
    ['NVIDIA Dynamo architecture', 'https://docs.nvidia.com/dynamo/latest/knowledge-base/overview'],
    ['AIPerf effective and active metrics', 'https://docs.nvidia.com/aiperf/v0.13.0/reference/effective-vs-active-metrics'],
    ['PagedAttention', 'https://arxiv.org/abs/2309.06180'],
    ['Sarathi-Serve', 'https://www.usenix.org/system/files/osdi24-agrawal.pdf'],
  ],
};
