import {p, math as m, equation as eq, study, source, table, definition, heading as h} from '../systems/markup.mjs';
import {chunkBudget, kvTransfer, specAllocation} from '../systems/models.mjs';

const measured = 'https://llm-d.ai/blog/serving-glm-5-2-agentic-workloads-on-llm-d';
const matrixGuide = 'https://docs.nvidia.com/deeplearning/performance/dl-performance-matrix-multiplication/index.html';
const scheduler = 'https://docs.vllm.ai/en/latest/configuration/optimization/';
const n = value => Number(value.toFixed(4));
const shortChunk = chunkBudget();
const longChunk = chunkBudget(8192);
const transfer = kvTransfer();
const equal = specAllocation(2);
const concentrated = specAllocation(4);

export const servingDepth = {
  'one-request':
    h('request-critical-path', 'Follow dependencies before adding durations') +
    p('The first useful timestamp is when the harness has enough information to send a call. A model response can trigger a test and a documentation lookup in parallel. The next decision may require both results. Adding their durations would overcount the part that overlaps. Ignoring either would omit a dependency.') +
    p('For a chosen repair, let a model turn take two seconds, then let a test take eight seconds and a lookup take three seconds concurrently. A final model turn takes one second after both results arrive. The dependent path lasts '+m('2+\\max(8,3)+1=11')+' seconds. Serializing the same tools would take fourteen. Improving the lookup from three seconds to one leaves the eleven-second path unchanged.') +
    p('Represent each operation as a node with a duration. Its finishing time is its own duration plus the latest finishing prerequisite. A node with no prerequisites begins at the stated release time. For node '+m('v')+' with predecessors '+m('\\operatorname{pred}(v)')+',') +
    eq('f(v)=d(v)+\\max_{u\\in\\operatorname{pred}(v)}f(u).') +
    p('The resource scheduler adds further dependencies. Two independent model calls can still wait for the same prefill worker. A transfer can overlap a tool only if that tool does not need the transferred state first. A complete trace therefore records both logical prerequisites and resource occupancy. The path determines which local speedup can shorten the user’s wait.') +
    p('When reading a cluster diagram, I would follow our repair through those dependencies before adding an aggregate throughput number. The diagram needs to say which arrows carry a prompt, an activation, cached state, or a control message. They occupy different links and unlock different work.'),

  'memory-and-work':
    h('physical-kv-bytes', 'Turn the attention representation into physical bytes') +
    p('The 0.5 GiB session above was a supplied number. To obtain one for a deployment, start with what the architecture actually retains. In a conventional layer with '+m('H_{kv}')+' key/value heads of width '+m('d_h')+', a position stores '+m('2H_{kv}d_h')+' coordinates. The factor two accounts for keys and values. Multiply by the number of cached layers and bytes per coordinate.') +
    p('A latent attention cache can retain a different object. Suppose each of 78 layers stores a 512-coordinate latent plus 64 positional coordinates, each occupying one byte. These dimensions are the cache geometry described in the GLM-5.2 deployment discussion. The resulting per-position count is') +
    eq('78(512+64)\\cdot1=44{,}928\\ \\mathrm{bytes}.') +
    p('For a 32,768-position prefix, the coordinate storage alone is '+m('44{,}928\\cdot32{,}768=1{,}472{,}200{,}704')+' bytes, or '+m('1.37109375')+' GiB. Scales, metadata, allocator rounding, and additional model-specific state must be added according to the implementation.') +
    source('Latent cache dimensions and measured allocations', measured) +
    p('Logical and physical counts can diverge after parallelization. If a cache is copied on each of eight tensor-parallel ranks, one logical prefix consumes eight physical copies. If data-parallel attention assigns different sequences to different ranks, those ranks can instead hold different prefixes. The aggregate free memory is useful only through the layout that can actually allocate it.') +
    p('Suppose one rank has room for 100 blocks and another has room for ten. A request needing twenty blocks cannot be admitted on the second rank simply because the group has 110 free blocks in total. Its allocation must be legal on the rank or ranks that will execute it. Per-rank pressure is the relevant constraint.') +
    h('matrix-work-and-bandwidth', 'Find the resource that can supply the next matrix operation') +
    p('Capacity tells us what can stay resident. To estimate a step’s duration, consider a single square weight matrix with width 4,096 and two bytes per weight. Reading its weights once moves 33,554,432 bytes. Applying it to '+m('B')+' input rows performs roughly '+m('2B\\cdot4096^2')+' floating-point operations.') +
    p('Use hypothetical sustained resources of 1 TB/s memory bandwidth and 100 TFLOP/s arithmetic. At one row, the weight read alone needs about 33.55 microseconds, while the arithmetic needs about 0.34 microseconds. At 128 rows, arithmetic rises to about 42.95 microseconds. Sharing the weight read among rows can therefore move the operation toward an arithmetic limit.') +
    p('Let '+m('F')+' be the operation count and '+m('X')+' the bytes that must move through a given interface. With sustained compute rate '+m('P')+' and bandwidth '+m('D')+', a lower bound that allows perfect overlap is') +
    eq('T\\geq\\max\\!\\left(\\frac{F}{P},\\frac{X}{D}\\right).') +
    definition('4.1', '<strong>Arithmetic intensity</strong> is the operation count divided by bytes moved through a stated interface. The balance point for this lower bound occurs at '+m('F/X=P/D')+'. The interface, data reuse, and sustained rates belong with the calculation.') +
    p('Counting only weight traffic makes this example’s intensity approximately '+m('B')+' operations per byte. Input and output traffic, cache behavior, launch cost, and tile efficiency loosen the bound. Small MoE expert batches can remain inefficient even when the whole request batch looks large. NVIDIA’s matrix guide explains how shapes, reuse, and tiling affect realized throughput.') +
    source('Matrix shapes and arithmetic intensity', matrixGuide) +
    p('This supplies a reason to examine several counters together. More active sequences can share weight work, yet also occupy more KV memory and lengthen attention reads. The useful batch is constrained by all three quantities. We can now choose how much prompt work to place beside the decodes already running.'),

  'arriving-requests':
    h('context-dependent-chunks', 'A chunk size does not specify its attention work') +
    p('Suppose four output streams already need their next decode steps. A new or returning prompt also needs prefill. Processing a large uninterrupted prompt chunk can delay those streams. Breaking it into chunks gives the scheduler points at which to run the dependent decode work.') +
    p('The amount of attention inside a chunk depends on the prefix already present. For a full causal attention layer, let '+m('L')+' old positions be available and let '+m('c')+' new positions enter. The first new query reads '+m('L+1')+' keys, the second '+m('L+2')+', and so on. The number of query–key pairs in this chunk is') +
    eq('A(L,c)=\\sum_{j=1}^{c}(L+j)=cL+\\frac{c(c+1)}{2}.') +
    p('The cache has saved the old projections. It has not removed the comparisons between new queries and those old keys. At a fixed chunk size, a longer prefix can therefore consume more of a time budget. Local or sparse attention changes the entries read, so its scheduler needs the corresponding work estimate.') +
    p('We can fit a small timing model to measured shapes. To inspect the dependency without claiming a hardware fit, choose the authored millisecond model below. The fixed term represents launch and other constant costs. The linear term represents work approximately proportional to new rows. The final term charges for the pair count, including four decode rows each reading 1,024 positions.') +
    eq('\\widehat T(L,c)=2+0.02(c+4)+0.00002\\bigl[A(L,c)+4\\cdot1024\\bigr].') +
    p('Choose a twenty-millisecond step budget. At '+m('L=2048')+', a 128-token chunk is predicted to take '+m(n(shortChunk.fixedChunkTime))+' ms. At '+m('L=8192')+', the same chunk takes '+m(n(longChunk.fixedChunkTime))+' ms and exceeds the budget. Searching integer chunk sizes gives '+m(shortChunk.chunk)+' and '+m(longChunk.chunk)+' respectively.') +
    study('chunk') +
    p('The search takes the largest chunk whose predicted whole-step time fits. Its next larger integer is checked too. As the prefix grows, the linear '+m('cL')+' term makes the permissible chunk smaller in this model. For an actual model, calibration should include active decode contexts, expert loads, precision, kernel transitions, and uncertainty in the estimate.') +
    p('A scheduler can reserve headroom for prediction error. If the target is twenty milliseconds and recent positive errors reach three milliseconds, admitting work up to the full predicted twenty leaves little protection against a stall. The latency target motivates both the cost estimate and its error allowance.') +
    source('Chunked prefill and scheduling controls in vLLM', scheduler) +
    p('Even an accurate local scheduler must decide where to send the returning prompt. A worker with a reusable prefix can avoid work, while its queue can consume the saving before execution begins.'),

  'returning-prefixes':
    h('cache-transfer-break-even', 'Charge a cache hit for the bytes it must move') +
    p('The earlier 20 ms restoration estimate now needs a physical explanation. Use the 32,768-position latent prefix counted above. Suppose its '+m(n(transfer.gib))+' GiB must move through a path sustaining sixteen GiB/s, with one millisecond of fixed setup. Ignoring overlap,') +
    eq('T_{\\mathrm{restore}}=1+1000\\frac{1.37109375}{16}\\approx86.6934\\ \\mathrm{ms}.') +
    study('transfer') +
    p('The bandwidth in this expression is an achieved rate for the path. A network adapter’s advertised rate does not by itself establish it. Copies, pinned-memory limits, contention, and the layout of the source and destination can change the rate seen by a request.') +
    p('For two serial stages moving the whole prefix, transfer durations add. With chunked pipelining, different blocks can occupy different stages concurrently. The slowest stage then bounds steady transfer throughput, with additional fill and drain time. A correct trace distinguishes those schedules instead of applying one bandwidth number to both.') +
    p('For a chosen destination, let '+m('W_h')+' be its queue, '+m('X/D+\\delta')+' the restore cost, and '+m('S')+' the new-suffix work. A cold destination has queue '+m('W_c')+' and full recomputation '+m('R')+'. Reuse is favored by the serial prediction when') +
    eq('W_h+\\delta+X/D+S<W_c+R.') +
    p('If '+m('W_c+R-W_h-S-\\delta')+' is positive, the bandwidth needed to win is greater than '+m('X')+' divided by that remaining time. If that remaining time is zero or negative, improving transfer bandwidth alone cannot overcome the chosen queue and suffix costs.') +
    p('A cache representation that stores fewer coordinates changes '+m('X')+'. A faster prefill implementation changes '+m('R')+'. Adding a prefill replica changes queues and may change where reusable blocks exist. These improvements move the same break-even condition through different terms.') +
    h('immutable-prefix-sharing', 'Sharing a prefix also needs ownership rules') +
    p('Suppose two sessions share a physical block. Reading it concurrently is harmless if it is immutable. Extending a partly filled shared tail is different. Writing a private token into a block still referenced by another session would alter that session’s history.') +
    p('One solution seals reusable blocks and allocates a private tail. Another copies a shared tail before modifying it. In either case, the directory needs reference and generation information that keeps an evicted or recycled address from masquerading as the old prefix. A hash match identifies candidate content; the cache manager must still provide a live compatible object.') +
    p('For a transfer, the destination should become routable after the required data is usable. Advertising it before a copy completes creates a race between the next request and the transfer. Retaining a source until the destination acknowledges ownership can make failure recovery possible, at the cost of temporary duplicate storage. These are concrete implementation questions to inspect beside a cache-hit benchmark.'),

  'physical-cluster':
    h('moe-dispatch-bytes', 'Count the MoE messages before choosing the group width') +
    p('Our four-rank load example treated work items as free to move. For a token row of width '+m('d')+' sent to '+m('k')+' experts, each remote expert needs an input payload. If the returned row has the same width and coordinates use '+m('b')+' bytes, a batch of '+m('B')+' tokens moves approximately '+m('2B k d b')+' payload bytes when all choices are remote. This count covers dispatch and return, before metadata or padding.') +
    p('With '+m('B=128')+', '+m('k=6')+', '+m('d=5120')+', and two-byte coordinates, the all-remote count is 15 MiB per such layer. Under an illustrative uniform placement over '+m('E')+' ranks, a choice is remote with probability '+m('1-1/E')+'. The expected count becomes') +
    eq('X_{\\mathrm{MoE}}\\approx2B k d b\\left(1-\\frac1E\\right).') +
    p('At eight ranks this gives 13.125 MiB; at sixty-four it gives about 14.7656 MiB. The byte count changes modestly, while the number of peers and network topology can change sharply. A fabric optimized for large transfers may have a different small-message latency. Expert replication and local choices also change the uniform-placement assumption.') +
    p('Wide expert parallelism spreads weight storage and can free memory for sequences. It also changes the dispatch group and the per-expert batch. The count above shows why one cannot infer latency from the number of devices alone. We need message sizes, communication schedules, and the busiest rank’s work.') +
    h('phase-capacity', 'Size the two pools at the same workload') +
    p('Let requests arrive at rate '+m('\\lambda')+'. Suppose their mean uncached input is '+m('U')+' tokens and their mean generated output is '+m('O')+'. A prefill pool sustaining '+m('C_p')+' uncached tokens per second needs capacity above '+m('\\lambda U')+'. Decode similarly needs capacity above '+m('\\lambda O')+' at the relevant context and latency conditions.') +
    eq('\\lambda U<C_p,\\qquad\\lambda O<C_d.') +
    p('These are necessary average-work conditions for this simplified model. Transfer bandwidth and memory can impose additional limits. A stable average is also insufficient to guarantee a tail-latency target under bursts. The capacities themselves can depend on batch size and the mixture of lengths.') +
    p('For a chosen rate of ten requests per second, 4,000 uncached input tokens and 200 output tokens per request require 40,000 prefill and 2,000 output tokens per second. If available capacities are 50,000 and 1,500, adding only prefill capacity leaves decode overloaded. If prefix misses double '+m('U')+', the same allocation can become insufficient in both pools.') +
    p('This is how I would read a fixed-GPU topology comparison. Record what is moved from one pool to the other, which queue shrinks, and which queue grows. Hardware held constant does not make the service rate constant. The allocation changes the shape and batch size of the work each pool performs.'),

  'verification-budget':
    h('expected-speculative-output', 'An accepted prefix gives a calculable amount of progress') +
    p('Suppose a cycle proposes '+m('k')+' tokens and commits one target token in addition to the accepted draft prefix. Let '+m('a_j')+' be the probability of accepting proposal '+m('j')+' conditional on all earlier proposals having been accepted. Proposal three can contribute only if proposals one and two also survive.') +
    eq('\\mathbb E[M(k)]=1+\\sum_{j=1}^{k}\\prod_{\\ell=1}^{j}a_\\ell.') +
    p('This follows by writing accepted-prefix length as the sum of indicators that it reaches each position. The expectation of the '+m('j')+'th indicator is the probability of reaching that position. The extra base token assumes the verification rule supplies it on rejection or after full acceptance. Different termination or verification rules need their corresponding count.') +
    p('For two chosen requests, let every conditional acceptance be 0.9 for A and 0.5 for B. Allocate four proposal positions total. Splitting them two each yields expected committed output '+m('1+0.9+0.81=2.71')+' for A and '+m('1+0.5+0.25=1.75')+' for B, totaling '+m(equal.total)+'.') +
    p('Giving all four proposals to A yields '+m('1+0.9+0.81+0.729+0.6561=4.0951')+' there and one base token for B, totaling '+m(concentrated.total)+'. Both requests still advance. The allocation gives the additional verification work to the higher expected return.') +
    study('speculation') +
    p('Now charge ten milliseconds per cycle plus two milliseconds for each proposal row actually executed. A compact layout uses four rows in either allocation and costs eighteen milliseconds. Padding both requests to the longest draft uses eight rows under the four/zero allocation and costs twenty-six milliseconds.') +
    table(['Allocation A / B', 'Expected committed tokens', 'Compact tokens/s', 'Padded tokens/s'], [
      ['2 / 2', n(equal.total), n(equal.compactRate), n(equal.paddedRate)],
      ['4 / 0', n(concentrated.total), n(concentrated.compactRate), n(concentrated.paddedRate)],
    ], 'Authored verification model with the same proposal budget') +
    p('Concentrating proposals wins in the compact model but loses against the balanced allocation when padded execution is charged. The probability calculation stayed fixed. The work representation changed which decision improved the delivered rate.') +
    p('More generally, choose per-request lengths '+m('k_i')+' to optimize expected progress divided by the measured cycle cost '+m('C(k_1,\\ldots,k_B)')+', subject to latency or fairness constraints. Cost is a function of the executed shapes and current load. A token budget can approximate that problem only where the cost model supports it.') +
    p('The SGLang DSpark integration is useful to read here because its compact verification and cost-table machinery connect a proposed schedule to an actual smaller execution. Acceptance alone cannot establish the saving.') +
    source('DSpark execution shape and measured cost tables', 'https://www.lmsys.org/blog/2026-07-06-dspark-sglang/'),

  'operating-service':
    h('recovery-state', 'Locate the failure relative to committed output') +
    p('Suppose a worker has sampled token 501, appended its state locally, and sent it toward the frontend. The worker fails before knowing whether the frontend committed that token to the client stream. Replaying from 500 can duplicate output if 501 arrived. Continuing from 502 can omit output if it did not.') +
    table(['Boundary', 'What may already exist', 'Recovery question'], [
      ['Sampled', 'A token and local speculative state', 'Which proposals were actually accepted?'],
      ['Stored', 'A longer worker-local prefix', 'Is there a compatible surviving copy?'],
      ['Frontend accepted', 'A recorded stream offset', 'Can a retried send be recognized?'],
      ['Client observed', 'Text delivered outside the service', 'What continuation contract does the API provide?'],
    ], 'A chosen failure timeline; actual recovery guarantees depend on the implementation') +
    p('A resumable design can associate requests and committed sequence offsets, retain the selected token IDs, and make repeated transfer or delivery attempts recognizable. Sampling the same prompt again is a new computation unless the needed decisions and numerical behavior are reproduced. A deterministic seed alone need not reproduce execution across different batching and kernels.') +
    p('Cancellation introduces an ownership transition too. The frontend can stop accepting output before the worker stops computing. A transfer in flight can complete after cancellation. Reference counts and completion messages need to reclaim the resulting objects without freeing state still used by another session.') +
    p('These questions give fault injection a precise purpose. Interrupt after sampling, during KV transfer, after frontend acceptance, and during draining. Record the visible stream, the task result, and the physical state left behind. A recovery claim then names the boundary it survived.'),

  'measurements-and-providers':
    h('cost-at-operating-point', 'Include the utilization needed to obtain the quoted cost') +
    p('Take a hypothetical cluster costing 100 accounting units per hour. Under a stated workload it can complete twenty qualifying sessions per minute. At sustained full use, the rental component is '+m('100/(20\\cdot60)=1/12')+' unit per qualifying session. At one quarter of that completed workload while paying for the same cluster, it is one third of a unit.') +
    p('Autoscaling can change the paid capacity, but its startup and draining intervals need accounting. An API comparison can spread those intervals over a shared fleet and include a margin. A self-hosted comparison should include the capacity it actually pays for over the whole interval. Storage, network traffic, engineering, and failed work add further terms.') +
    p('Cache reuse can also inflate a logical-input denominator. Suppose each of a hundred calls carries a 10,000-token repeated prefix and 100 new tokens. The logical input count is 1,010,000 tokens. If the first prefix is computed once and the remaining prefixes are perfectly reused, only 20,000 distinct input positions require forward construction under this idealized account. Both counters describe the same calls.') +
    p('The repeated prefix still participates in later attention and may be transferred or read repeatedly. The smaller construction count therefore does not determine runtime by itself. Reporting logical input, uncached construction, KV bytes moved, and completed output makes the operating point interpretable.') +
    h('paired-workloads', 'Keep the same work when testing a proposed improvement') +
    p('For a matched experiment, preserve each session’s arrivals, pauses, tokenized inputs or an equivalent prefix map, generation settings, tool results, and completion criteria. Repeat it across the compared systems and keep the session-level outcomes paired. Compare delays for the same work before averaging across sessions.') +
    p('If both load tests run for a fixed duration, the faster system may finish a different subset of requests. Comparing average latency only among completed requests can then reward a system that leaves slow sessions unfinished. Include the unfinished population and state how the observation window treats it.') +
    p('A useful artifact is a small downloadable trace with a reproducible analysis. It can expose the predicted route, actual hit tier, queue entry, transfer interval, first token, stream gaps, and final task status for each session. The reader can then change a policy and determine which decisions changed, with the raw records available for inspection.'),
};
