import {p, math as m, equation as eq, heading as h, table, source, study} from '../systems/markup.mjs';

export const deepinferCommit='a679bb86ce36e883a98a97733492b686e5b9a08e';
const repo='https://github.com/deepseek-ai/DeepInfer/blob/'+deepinferCommit+'/';
const measured='https://llm-d.ai/blog/serving-glm-5-2-agentic-workloads-on-llm-d';

export const engineCase=
  h('engine-profile-boundary','An inspectable engine benchmark and the number it actually counts')+
  p('DeepInfer provides a concrete public execution experiment alongside the provider disclosures. At the pinned revision, the default example loads DeepSeek-V4.1-Flash-1017. Its benchmark constructs a shared prefix and forks requests from it, with separate controls for prefill chunks and the decode batch. Those choices let an experiment isolate engine operations, while deliberately omitting a production arrival queue.')+
  p('The release supplies an offline inference engine and its internal execution machinery. Its README leaves the complete cache system, phase disaggregation and cross-replica load balancing outside the release. The deployment Q&A describes those production services. Running the example engine does not instantiate that whole service.')+
  source('Released engine and production-service boundary',repo+'README.md')+
  p('Its decode-throughput counter assumes every draft is accepted. With the documented default of 64 requests and five draft positions, one step accounts for '+m('64(1+5)=384')+' tokens regardless of measured acceptance. The profiler is a second boundary. The documentation warns that it can substantially inflate small-batch step times and restricts its trace to inspecting kernel composition. Unprofiled steady-state intervals supply the rate.')+
  source('Pinned engine workloads, counter definitions and profiler placement',repo+'examples/README.md')+
  p('For a hypothetical step rate of 100 steps/s for that decode batch, full-acceptance accounting would report 38,400 tokens/s for the batch. Now suppose each successive draft is accepted with conditional probability 0.75. The expected committed length per request is')+
  eq('\\mathbb E[M]=1+0.75+0.75^2+0.75^3+0.75^4+0.75^5=3.2880859375.')+
  p('Under those chosen acceptance assumptions, expected committed output is '+m('100\\cdot64\\cdot3.2880859375=21{,}043.75')+' tokens/s. The engine has not become slower between these two calculations. The counted output has changed. The first number is useful for the benchmark’s stated accounting, while the second estimates accepted output under the authored probabilities.')+
  table(['Measurement boundary','Question it can answer','Additional observation needed for service capacity'],[
    ['Kernel trace','Which launches, copies and collectives occupy the step?','An unprofiled timing window'],
    ['Steady-state engine steps','How fast does this fixed batch advance?','True committed tokens and acceptance'],
    ['Request service','How do arrivals wait and recover state?','Queue-inclusive timing and failures'],
    ['Application task','Does the result satisfy the user’s request?','Validation and total resource cost'],
  ],'One benchmark can be correct while answering only one layer of the capacity question')+
  p('A useful hardware reproduction would preserve the model revision, precision, parallel layout, context, chunk size, decode batch and draft count, then retain both raw intervals and accepted output. No GPU run is claimed here. A public engine profile would also remain evidence about that engine and configuration. It could not establish DeepInfra’s private scheduler simply because the provider uses other NVIDIA components.');

export const deepinferCase=
  h('deepinfer-request-path','A returning request in DeepSeek’s production design')+
  p('Our earlier placement example assumed that a useful prefix belonged to a particular worker. DeepSeek describes another arrangement for V4.1. Its block cache is globally accessible through 3FS. Sliding-window attention (SWA) state stays in compute-host memory, with a directory allowing another machine to fetch it. A router can therefore move the request without abandoning the global prefix. It must still find or reconstruct the state needed to continue.')+
  p('Follow this as the documented production design, with the <a href="#engine-profile-boundary">earlier release boundary</a> in mind. The request crosses services beyond the offline engine.')+
  table(['Request boundary','Documented action','What our trace must retain'],[
    ['Before routing','Match prefix metadata and compatibility identity','Matched length, deployment/weight identity and user-group boundary'],
    ['After placement','Fetch global blocks through host memory; fetch or reconstruct SWA state','Bytes restored and the prefix that is actually usable'],
    ['Prefill admission','Choose context tier and remaining compute quota','Queue, cached length and selected chunk'],
    ['Cooperating ranks','Use the lowest remaining rank budget','The limiting rank and synchronized budget'],
    ['Decode','Advance the admitted requests','Concurrency, retained context and committed output'],
  ],'DeepSeek’s documented production path, rather than a topology implemented in this essay')+
  source('Production cache, routing and compute-quota policy',repo+'doc/inference_deployment_qa.md')+
  p('Consider a returning prefix of '+m('L=131{,}072')+' tokens with matching global blocks available. The documented recovery rule leaves the 128-token local-attention window plus six positions for speculative backtracking, then rounds the reusable block prefix down to a multiple of 128. Applying that cap gives')+
  eq('L_{\\mathrm{block}}=128\\left\\lfloor\\frac{L-134}{128}\\right\\rfloor=130{,}816.')+
  p('A compatible sliding-window state must have its endpoint in '+m('[130{,}688,130{,}816]')+'. With such a state available locally or through the directory, the example reprocesses '+m('131{,}072-130{,}816=256')+' suffix tokens. Without it, the policy backs off one block, leaving '+m('131{,}072-130{,}688=384')+' tokens. The animation changes only that state-availability condition.')+
  study('deepinfer-recovery')+
  p('The extra 128 positions rebuild the SWA state with bounded replay. Their existing global block cache is reused without recomputation or overwrite. Our count therefore measures input positions, rather than identical full-model work per position. A metric reporting only the matched text would miss this distinction. Record both the initial metadata hit and the recovery work it actually unlocks.')+
  p('The Q&A also divides prefill work into four context tiers, with boundaries at 16K, 64K and 256K tokens. Workers pull work under a remaining compute quota. Within a cooperating group, the minimum quota limits the chunk, whose cost is fitted as a quadratic in new and cached lengths and capped at 32,768 new tokens.')+
  p('Suppose four cooperating ranks have chosen remaining budgets of 18, 14, 16 and 20 ms. Synchronizing their minimum gives 14 ms. Choosing a chunk that costs 18 ms would overrun the second rank’s budget, even though that chunk fits the first rank’s allowance. This is why a local capacity estimate can be insufficient for a distributed operation.')+
  p('Our <a href="#context-dependent-chunks">earlier chunk model</a> provides explicit illustrative coefficients. DeepSeek does not publish the production fit’s coefficients in this Q&A, so we cannot calculate its actual chunk from these four budgets. The documented constraint tells us which timing data we would need to collect.');

export const mtpCase=
  h('mtp-operating-point','A measured speedup can still fail the first-token target')+
  p('The proposal model above predicts useful output per unit execution time. Now put that reasoning against a published serving result. llm-d compares GLM-5.2-FP8 on the same 32-H200, 1P1D DEP16 layout, with CPU offloading in both runs. Multi-token prediction (MTP) adds three draft positions in the enabled run. At concurrency 64 it reports the following operating points.')+
  table(['Configuration','TTFT median','Token-interval median','Output throughput'],[
    ['CPU offloading','1.3 s','30.7 ms','2,178 tokens/s'],
    ['CPU offloading + MTP','1.6 s','14.7 ms','3,788 tokens/s'],
  ],'Published 32-GPU MTP comparison at concurrency 64')+
  source('llm-d configuration, measured table and fixed-duration methodology',measured+'#speculative-decoding')+
  p('Output throughput rises by about '+m('3788/2178-1\\approx73.9\\%')+'. The median stream interval falls by about 52.1%. Yet the median wait for a first token rises by 300 ms. A service buying the speedup has gained decode capacity without a corresponding improvement in prompt responsiveness.')+
  study('mtp-case')+
  p('Choose a median first-token target of 1.5 seconds and a median stream-interval target of 20 ms. The baseline meets the first screen and fails the second. The MTP configuration meets the second and fails the first. Neither passes both. Relaxing the first screen to 1.6 seconds admits the MTP point. These targets are our decision exercise, rather than promises made by the benchmark.')+
  p('Two passing medians still say little about the joint tail. In an authored population of 100 requests, fifty could have a fast first token and a slow stream, while the other fifty have the reverse. Separate marginal summaries cannot recover the number that met both conditions. To estimate useful service capacity under a request-level contract, retain paired timestamps and count requests satisfying the whole contract.')+
  p('The study’s stages have fixed durations and can complete different slices of the request trace. The comparison matches the deployment and concurrency, rather than pairing identical completed requests. Its separate 64-GPU prefill/decode sweep answers another allocation question and should not be substituted as the control here. MTP’s average output-rate capacity claim also supplies no tail-latency guarantee.')+
  p('The practical next experiment is now specific. Keep this model, hardware and workload, then vary prefill allocation or admission while retaining MTP. Measure whether first-token tails improve without losing the useful decode gain. A combined service result has to be measured after combining the mechanisms.');
