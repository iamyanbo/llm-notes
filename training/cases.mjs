import {p, math as m, equation as eq, heading as h, table, source, study} from '../systems/markup.mjs';
import {muownStep} from '../systems/models.mjs';

export const mimoRevision='79090e58195e80a9cfe251c95ae7a78a2132b6e2';
const code='https://github.com/XiaomiMiMo/verl/blob/'+mimoRevision+'/';
const superReport='https://arxiv.org/html/2604.12374';
const mimo='https://arxiv.org/html/2610.11959v1';
const muown='https://arxiv.org/html/2605.10797';
const priming='https://arxiv.org/html/2610.22019v1';
const rufus='https://arxiv.org/html/2609.29421v2';
const te='https://docs.nvidia.com/deeplearning/transformer-engine/features/low_precision_training/nvfp4/nvfp4.html';
const matrix=value=>'\\begin{bmatrix}'+value.map(row=>row.map(x=>Number(x.toFixed(4))).join('&')).join('\\\\')+'\\end{bmatrix}';
const mu=muownStep();

export const syntheticCodeCase=
  h('synthetic-code-pipeline','A generated solution can quietly change the problem')+
  p('Consider a synthetic training record asking for a Python function that returns an empty list when its input is empty. The problem generator writes that contract into the docstring. A stronger solution model supplies code, but rewrites the empty-input behavior to raise an exception. Concatenating its entire response would replace part of the task we meant to teach. This is an authored example of a data error that a successful generation request does not detect.')+
  p('Nemotron 3 Super’s synthetic-code pipeline separates problem and solution generation. It uses gpt-oss-20b for problems and gpt-oss-120b for solutions, preserves the original problem when assembling a pair, rejects added imports and checks Python syntax through an AST. Section 2.3.2 reports roughly 23 million generated pairs and 15 million after cleaning.')+
  source('Nemotron’s problem-generation and solution-cleaning procedure',superReport)+
  table(['Boundary in our example','Check','Property established'],[
    ['Original problem → solution request','Retain the problem text and identifier','A later response can be compared with the requested contract'],
    ['Solution response → assembled record','Extract the solution; retain the original problem','The teacher cannot silently redefine the prompt'],
    ['Assembled code → syntax filter','Parse an abstract-syntax tree','The retained text is syntactically valid Python'],
    ['Function → behavioral evaluation','Run empty-input and ordinary-input tests','Those tested cases satisfy the specified behavior'],
  ],'An authored record distinguishes task preservation, syntax and behavior')+
  p('The last row is an additional behavioral check in our proposed reproduction. The reported AST filter alone does not prove correctness. A syntactically valid function can still return the wrong value. A function can also pass the empty-input test and fail a repeated-element case that was never tested. Each filter certifies the property it actually examines.')+
  p('This gives a useful way to read a synthetic-data release. Count records at each boundary and retain the reason for rejection. In an authored 1,000-record audit, suppose 100 solutions alter the contract and another fifty fail syntax. Keeping 850 establishes neither that 85% are correct nor that the remaining errors are random. If contract changes concentrate in difficult tasks, cleaning also changes the difficulty distribution.')+
  p('Sampling adds another transformation. Generating several solutions for one problem gives that problem several chances to appear. Uniform pair sampling weights it by its retained solution count. Uniform problem sampling followed by one selected solution gives a different distribution. The exposure calculation above now has a concrete unit to count, and a concrete error to look for.');

export const distributedCase=
  h('released-rank-groups','Resolve a real launcher before drawing the rank groups')+
  p('The public MiMo code recipe lets us follow an update below these parallelism names. Pin the release to commit '+mimoRevision.slice(0,12)+' and begin at <code>scripts/code/train.sh</code>. Its wrapper exports values before invoking <code>recipes/code/run_train.sh</code>, which in turn supplies arguments to the v1 trainer. Reading the lower script in isolation gives different defaults.')+
  table(['Setting','Public wrapper default','Consequence under those defaults'],[
    ['Training allocation','8 nodes × 8 GPUs','64 devices during the learner phase'],
    ['Tensor / pipeline / context / expert widths (TP / PP / CP / EP)','8 / 1 / 1 / 1','Eight tensor partitions in each of eight data replicas'],
    ['Rollout allocation / TP','Colocated / 2','The same allocation can form 32 generation groups'],
    ['Prompts / rollouts per prompt','64 / 16','1,024 candidate trajectories before filtering'],
    ['Microbatch control','1, with dynamic batching enabled','Actual splitting also depends on token budgets and packing'],
  ],'Resolved public launcher defaults; environment and command-line overrides can change them')+
  source('Pinned wrapper and its call to the lower launcher',code+'scripts/code/train.sh')+
  p('Label a learner rank by '+m('(d,t)')+', where '+m('d\\in\\{0,\\ldots,7\\}')+' identifies a data replica and '+m('t\\in\\{0,\\ldots,7\\}')+' its tensor partition. The eight ranks at fixed '+m('d')+' cooperate on a model computation. The eight ranks at fixed '+m('t')+' hold corresponding parameter partitions for different examples. These labels describe logical groups, without assuming a particular mapping onto physical rank numbers.')+
  p('Take an authored '+m('4096\\times4096')+' dense matrix and split its output columns over the eight tensor ranks. Rank '+m('(d,t)')+' holds '+m('4096\\times512=2{,}097{,}152')+' coordinates of that matrix. Its forward pass produces 512 output features. During backward, its contribution to the input gradient must be combined with the other tensor partitions. Its weight-gradient shard must instead be combined with the corresponding shards from the other data replicas. Those are different collectives over different groups.')+
  p('The released engine enables a distributed optimizer by default. It can reduce-scatter the data-replica gradients so each rank receives the reduced slice it owns, update that slice using its optimizer state, then all-gather updated model parameters. Megatron’s documented flow explains why optimizer ownership can be narrower than the forward parameter partition.')+
  source('Pinned engine group construction, gradient accumulation and optimizer call',code+'verl/workers/engine/megatron/transformer_impl.py')+
  source('Pinned distributed-optimizer default',code+'verl/workers/config/engine.py')+
  source('Megatron distributed optimizer data flow','https://docs.nvidia.com/megatron-core/developer-guide/latest/user-guide/features/dist_optimizer.html')+
  table(['Object for our one matrix partition','Authored BF16/FP32 layout','Per-rank coordinate storage'],[
    ['BF16 forward weights','Entire tensor partition','4 MiB'],
    ['FP32 accumulation buffer','Entire tensor partition','8 MiB'],
    ['FP32 master + two FP32 moments','One eighth of the tensor partition','3 MiB'],
    ['Subtotal','Weights, gradient buffer and optimizer state','15 MiB'],
  ],'Calculated ledger for one evenly partitioned matrix; excludes activations, padding and other tensors')+
  p('An ideal ring reduce-scatter sends '+m('7/8')+' of the eight-MiB gradient buffer per rank, or seven MiB. All-gathering the four-MiB BF16 parameter partition sends another 3.5 MiB. The resulting 10.5 MiB is a calculated send-volume ledger for these two collectives. It excludes tensor-parallel traffic and does not establish which operation limits the measured step.')+
  p('Before those collectives, microbatches must accumulate the intended gradient. The engine forms token-count reductions, prepares dynamic microbatches and supplies their count to Megatron’s forward/backward schedule. It also compensates for that schedule’s microbatch scaling. The <a href="#distributed-normalization">later prompt-mean calculation</a> follows the normalization across this split. A microbatch setting of one is therefore insufficient to infer the number of optimizer updates or their token weight.')+
  p('Colocation adds a final boundary. Sixty-four devices used for learning and thirty-two two-device generation groups describe two uses of the same allocation. Adding those counts as if they were independent fleets would double-count capacity. Weight transfer, state offloading and the phase schedule determine how much time each use receives.');

export const muownCase=
  p('We can finish that separation as an actual update. Let '+m('A')+' denote the effective weight matrix used by a linear layer, with one output coordinate per row. Keep a direction matrix '+m('R')+' and one trainable magnitude '+m('s_i')+' per row. If '+m('r_i=\\|R_i\\|_2')+', the effective row is '+m('A_i=s_iR_i/r_i')+'. Using '+m('s')+' here avoids confusing a row magnitude with a policy-gradient coefficient. The paper calls this vector '+m('\\mathbf g')+'.')+
  eq('A=\\operatorname{diag}(s/r)R,\\qquad A=R=\\begin{bmatrix}3&4\\\\0&2\\end{bmatrix},\\qquad s=r=(5,2).')+
  p('Changing '+m('s_i')+' stretches a row while keeping its direction. Changing '+m('R_i')+' parallel to itself cannot change the effective unit row. The chain rule must therefore remove that radial component from the direction gradient. This is the mathematical reason for a projection in the optimizer.')+
  p('Choose the effective-weight gradient '+m('G=\\partial L/\\partial A=\\begin{bmatrix}1&0\\\\1&1\\end{bmatrix}')+'. Normalize the direction rows to obtain '+m('D_0=(0.6,0.8)')+' and '+m('D_1=(0,1)')+'. The two magnitude derivatives are their dot products with the corresponding gradient rows, '+m('\\alpha=(0.6,1)')+'. For the direction variables,')+
  eq('\\frac{\\partial L}{\\partial s_i}=\\alpha_i=G_iD_i^{\\mathsf T},\\qquad K_i=\\frac{\\partial L}{\\partial R_i}=\\frac{s_i}{r_i}(G_i-\\alpha_iD_i).')+
  p('In the first row, '+m('(1,0)-0.6(0.6,0.8)=(0.64,-0.48)')+'. Its dot product with '+m('(0.6,0.8)')+' is zero. In the second row, '+m('(1,1)-1(0,1)=(1,0)')+'. Both gradients can change the unit directions without merely stretching their current rows.')+
  p('We now follow Algorithm 1 with zero initial moments. Direction momentum 0.95 gives '+m('M=K')+' and Nesterov input '+m('H=0.95M+K=1.95K')+'. For this small calculation use the exact polar direction '+m('Q=UV^{\\mathsf T}')+' of '+m('H')+'. Production orthogonalization can approximate it iteratively. With learning rate 0.1 and no decay, the algorithm’s direction scale gives')+
  eq('Q\\approx'+matrix(mu.polar)+',\\qquad R^{\\prime}=R-0.2\\sqrt2(0.1)Q\\approx'+matrix(mu.nextDirection)+'.')+
  p('The magnitude path uses Adam. Choose '+m('(\\beta_1,\\beta_2)=(0.9,0.95)')+' and zero epsilon for this first-step example. Its new moments are '+m('(0.06,0.1)')+' and '+m('(0.018,0.05)')+'. Bias correction gives '+m('\\widehat m=(0.6,1)')+' and '+m('\\widehat v=(0.36,1)')+'. Both normalized derivatives are one, so '+m('s^{\\prime}=(4.9,1.9)')+'. These numerical hyperparameters are chosen for the illustration.')+
  study('muown-step')+
  p('The direction step changes its own row lengths to approximately '+m(matrix([mu.nextNorms]))+'. Cache these lengths as '+m('r^{\\prime}')+' and rebuild the weight actually used by the network,')+
  eq('A^{\\prime}=\\operatorname{diag}(s^{\\prime}/r^{\\prime})R^{\\prime}\\approx'+matrix(mu.nextWeight)+'.')+
  p('The effective rows now have lengths 4.9 and 1.9, up to displayed rounding. The next step recovers '+m('R^{\\prime}=\\operatorname{diag}(r^{\\prime}/s^{\\prime})A^{\\prime}')+'. Keeping the effective weights alone would lose the cached scale needed for that reconstruction. The magnitude moments and matrix momentum are additional optimizer state.')+
  source('Muown Algorithm 1 and its decoupled gradients',muown)+
  p('This completes one deliberately small step. It shows what row normalization changes in the chain rule and which state survives an update. It provides no evidence that this optimizer improves a particular language model. That conclusion needs the paper’s training comparisons or a matched experiment of our own.');

export const precisionCase=
  h('scaled-operations','Follow a low-precision weight-gradient product')+
  p('A uniform rounding grid explains why a master weight helps. An actual four-bit path must also control the range of the operands entering each multiplication. Transformer Engine’s NVFP4 representation combines an E2M1 value with a local FP8 E4M3 scale and a global FP32 scale. Its recipe uses 16-element blocks for activations and gradients and, by default, 16×16 weight blocks.')+
  eq('\\widehat x=q_{\\mathrm{E2M1}}\\,s_{\\mathrm{block}}\\,s_{\\mathrm{global}}.')+
  p('For an authored one-block example with maximum magnitude twelve, the documented scale rule gives '+m('s_{\\mathrm{global}}=12/(448\\cdot6)=1/224')+' and '+m('s_{\\mathrm{block}}=448')+'. Their product is two. A value three maps to the E2M1 value 1.5 and reconstructs exactly. A value 3.2 maps to 1.6, between the representable neighbors 1.5 and two. The scale has made the range usable while leaving a finite resolution.')+
  p('For a gradient using stochastic rounding, rounding 1.6 to two with probability 0.2 and to 1.5 with probability 0.8 preserves its expectation. After multiplying by the combined scale two, the expected reconstruction is 3.2. An individual result is three or four. Unbiased expectation does not make that individual matrix product exact.')+
  p('The weight-gradient product also receives an orthogonal transform to spread outliers before quantization. The following four-coordinate calculation isolates why matched transforms can help without changing the exact product. Choose')+
  eq('H=\\frac12\\begin{bmatrix}1&1&1&1\\\\1&-1&1&-1\\\\1&1&-1&-1\\\\1&-1&-1&1\\end{bmatrix},\\qquad HH^{\\mathsf T}=I.')+
  p('An outlier row '+m('a=(8,0,0,0)')+' becomes '+m('aH=(4,4,4,4)')+'. For '+m('b=(1,2,3,4)^{\\mathsf T}')+', '+m('H^{\\mathsf T}b=(5,-1,-2,0)^{\\mathsf T}')+'. The transformed dot product is '+m('20-4-8=8')+', the same as '+m('ab')+'. Quantizing after the transform perturbs a different distribution of values. There is no theorem here that every input’s quantization error improves.')+
  p('Transformer Engine applies its random-sign Hadamard transform to the columnwise input and gradient operands of the weight-gradient GEMM, with scales computed afterward. Stochastic rounding is enabled for gradients. The four-coordinate transform above is a chosen exact reference, rather than a bitwise simulation of that kernel.')+
  source('Transformer Engine NVFP4 scales, rounding and transform placement',te)+
  h('precision-exceptions','A real recipe protects specific operations')+
  table(['Nemotron 3 Super training component','Reported precision'],[
    ['Linear layers unless excepted','NVFP4'],
    ['Final 15% of network depth','BF16'],
    ['Latent projections, MTP, QKV/attention projections and embeddings','BF16'],
    ['Mamba output projection','MXFP8'],
  ],'Training exceptions in Nemotron 3 Super Table 3; network depth is distinct from training time')+
  p('These exceptions apply within the mixed-precision recipe. In particular, the final 15% describes layers near the output of the network. It is not a switch during the final 15% of training tokens.')+
  p('The report separately tests a late promotion to MXFP8 at 19 trillion tokens, continuing to 20.6 trillion. Loss improves, but downstream metrics show no sustained gain. The final model uses the NVFP4 recipe throughout its token horizon.')+
  source('Nemotron operation assignments and the unsuccessful higher-precision healing experiment',superReport)+
  p('This is a useful failed remedy. If the intended benefit is downstream task performance, a smoother loss curve has not established that benefit. A follow-up could separate gradient underflow, forward approximation and data-distribution effects, each at matched token counts. Promoting every operation simultaneously changes several of those mechanisms and can conceal which one mattered.');

export const midtrainingCase=
  h('tool-mask-ablation','A controlled test of whether to predict the tool response')+
  p('A tool log can be valuable context and a poor target. After a test runner returns a long failure trace, the agent needs to choose a useful edit. Teaching it to reproduce every line of that trace uses additional prediction targets. We need an experiment to decide whether that additional task helps the subsequent agent.')+
  p('The October 2026 report <em>Priming Base Models for Agentic Post-Training</em> supplies one. It midtrains N-3.5 Lightning-8K for 100 billion tokens with tool responses included or excluded from the loss, then applies identical SFT using an earlier version of its SFT recipe.')+
  table(['Tool-response targets during midtraining','SWE-bench Verified pass@1','pass@3'],[
    ['Included','27.5%','41.6%'],['Masked','37.8%','53.0%'],
  ],'Table 9’s reported masking comparison, followed by common SFT')+
  source('Version 1, §5.2 and Table 9',priming)+
  p('The pass@1 difference is 10.3 percentage points under that regime. It supports retaining tool text as context while withholding its direct prediction loss in this recipe. It does not show that environment prediction is universally harmful or isolate which kinds of logs consumed the useful learning capacity.')+
  p('An authored follow-up can separate short structured tool results from long unstructured dumps, keeping the action-token budget and later SFT fixed. A second comparison can hold total compute fixed instead. These controls answer different questions because adding targets can change both the objective and the amount of work needed to reach an action-token budget.')+
  p('The paper’s Appendix A schedules processing scripts and training metadata for a future version. Its reported ablation is evidence we can analyze now; a full recreation of its data pipeline still needs those artifacts. Keep that release boundary attached to a reproduction proposal.')+
  p('The earlier corpus-cleaning example and this mask experiment meet at the same point. A retained token has a role in the learning problem. Its presence in a sequence, permission to attend, and permission to contribute a target are three independently meaningful decisions.');

export const reportRecipeCase=
  h('report-versus-recipe','The report and the smaller public recipe take different gradients')+
  p('The stopped-coefficient calculation above follows MiMo’s production report. Before attempting it in released code, trace which loss the public launcher actually selects. At the pinned revision, the code recipe enables the v1 trainer, its actor worker binds <code>ppo_loss</code>, and the loss dispatcher’s default mode is <code>vanilla</code>. That registered function computes a differentiable clipped PPO surrogate. The public default is consequently a different update from the reported stopped-ratio mask.')+
  source('Launcher selects the v1 trainer',code+'recipes/code/run_train.sh#L199')+
  source('Actor worker binds the policy loss',code+'verl/workers/engine_workers.py#L632')+
  source('Loss-mode dispatch',code+'verl/workers/utils/losses.py#L106')+
  source('Registered vanilla PPO calculation',code+'verl/trainer/ppo/core_algos.py#L1337')+
  table(['Choice','Production report','Pinned smaller code recipe defaults'],[
    ['Positive token ratio','Stopped coefficient, with masking outside the chosen interval','Differentiable PPO surrogate, clipping interval [0.8, 1.2]'],
    ['Initial positive mask interval','[0.2, 5]','No identification with that reported mask'],
    ['Negative advantage','Separate reported mask control','Vanilla function also contains a dual-clip branch'],
    ['Optimizer','Reported Muown/AdamW parameter partition','Native Megatron Adam path under the default optimizer configuration'],
    ['Experiment','Production MiMo model and training system','Released distilled Qwen-based 9B experiment'],
  ],'Algorithm and release boundaries checked at commit '+mimoRevision.slice(0,12))+
  p('The difference is visible in one token. Keep rollout probability '+m('q=0.1')+' and advantage '+m('A=0.5')+', but choose learner probability '+m('p=0.15')+'. The ratio is 1.5. It is inside the report’s initial positive mask, giving coefficient '+m('1.5\\cdot0.5=0.75')+' on the log-probability gradient.')+
  p('For the positive-advantage PPO term, maximize '+m('\\min(rA,\\operatorname{clip}(r,0.8,1.2)A)')+'. At '+m('r=1.5')+', the selected term is '+m('1.2\\cdot0.5=0.6')+', locally constant in the learner log probability. Its gradient there is zero. These are different gradients, even though both constructions compare a current policy with a collection policy. Other loss terms and preprocessing are held aside in this comparison.')+
  p('The code path also inherits the optimizer name through configuration. Its default selects Adam in Megatron, while the launcher sets learning rate and decay. A README describing Muown in the production run cannot override that dispatch. Reproducing either experiment means preserving the resolved configuration and the function that receives it.')+
  source('Pinned optimizer selection and configuration',code+'verl/trainer/config/optim/megatron.yaml')+
  p('The subsequent worked output-matrix update continues with the report’s earlier fixed coefficient 0.6. It demonstrates that stated objective. It should not be read as an execution trace of the public default PPO loss.');

export const asyncCase=
  h('refreshing-kv','Refreshing weights leaves a choice about old attention state')+
  p('Attention state contains calculations made with the earlier weights. A policy-version tag on a newly generated suffix does not tell us whether the entire prefix was reevaluated with those weights. We need to follow both objects.')+
  table(['Reported system','After an in-flight weight refresh','Cost or approximation to examine'],[
    ['MiMo partial rollouts','Re-prefill the retained history','Reconstruction work before the continuation'],
    ['Nemotron 3 Super asynchronous RL','Retain rollout KV; bound policy lag to one update','A fresh suffix can use state produced by older weights'],
  ],'Different documented policies for attention state across a weight refresh')+
  source('MiMo partial-rollout reconstruction',mimo)+
  source('Nemotron §3.2.4 asynchronous weight updates and retained KV',superReport)+
  p('To see the approximation, call a prefix state '+m('K(\\theta_{10},x)')+' when weights version ten processed history '+m('x')+'. After loading version eleven, evaluating a continuation with that saved state generally differs from using '+m('K(\\theta_{11},x)')+'. Re-prefill computes the latter. Retention saves that work and accepts the mixed calculation. Bounding lag limits one source of mismatch without making the two states mathematically equal.')+
  p('A useful comparison records weight version and cache lineage separately. Sampled action probabilities should describe the actual generation calculation, including its state. A learner recomputing probabilities with a freshly evaluated prefix is then comparing against the rollout process that really occurred. A checkpoint label alone cannot diagnose their difference.')+
  h('router-restoration','A parameter intervention can isolate the cause of load collapse')+
  p('MiMo’s router study goes beyond noticing unstable loads. After twenty trainable-router steps, it restores only router parameters to their pre-RL values. Load balance recovers while benchmark performance remains unchanged in that diagnostic. This isolates router drift from changes in the expert weights more directly than a correlation between reward and utilization.')+
  source('MiMo’s router-only restoration and frozen-router comparison',mimo)+
  p('For an authored control, imagine restoring the entire checkpoint instead. That would change routers and experts together, so an improved load distribution could not identify which change caused it. The narrow intervention is what makes the reported experiment informative. Freezing routing parameters then prevents that source of drift, while the later microbatch example shows why individual token batches can still overload an expert.');

export const learnedRewardCase=
  h('reward-model-domain','The reward model limits which prompts are useful for RL')+
  p('A learned reward can improve its own score while steering the policy away from another capability. The scorer’s reliability on the current prompts determines whether more optimization pressure is useful. This is where a real negative result is more informative than another list of reward algorithms.')+
  p('Rufus-Air §3.8 reports that HelpSteer3 prompts were difficult for its Skywork reward model to score reliably, with scientific-reasoning and instruction-following regressions. Unfiltered HH-RLHF prompts also degraded capabilities. Its final run uses 75,815 HH-RLHF prompts after a validity filter and applies group-relative RL to newly sampled responses. The original preference pairs supply offline analysis, rather than the training responses.')+
  source('Rufus-Air prompt-source ablations and final learned-reward procedure',rufus)+
  p('That result suggests a more precise experiment than selecting the richest-looking prompt dataset. Audit a sample of the scorer’s judgments against the actual constraints, separate malformed records, and evaluate the policy on independent tasks at each stage. Diverse prompts can be valuable while being unsuitable for a particular evaluator. Raising the same evaluator’s score cannot resolve that mismatch.')+
  p('The report’s length control also has a condition. It penalizes over-length responses when their raw reward is positive and leaves negative rewards unchanged. Applying a penalty to every response would be another objective. For an authored illustration only, subtract 0.2 from a positive reward of one to obtain 0.8, while leaving a raw −1 at −1. A blanket penalty would instead produce −1.2 and change how the responses compare in a group.')+
  p('Preserve raw score, response length and adjusted score separately. Then a reward increase accompanied by shorter answers can be checked against held-out usefulness. The candidate policy, reward model, prompt filter and length rule together define this stage’s experiment. They cannot be compressed into a claim that a preference dataset alone improved the model.');
