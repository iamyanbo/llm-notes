import {p, math as m, equation as eq, heading as h, table, source, study} from '../systems/markup.mjs';
import {corpusExposure, preferencePair} from '../systems/models.mjs';
import {syntheticCodeCase, distributedCase, muownCase, precisionCase, learnedRewardCase} from './cases.mjs';

const nemo='https://docs.nvidia.com/nemotron/0.2.0/nemotron/super3/pretrain.html';
const nemoRL='https://docs.nvidia.com/nemotron/0.2.0/nemotron/super3/rl/index.html';
const mimo='https://arxiv.org/html/2610.11959v1';
const v4='https://arxiv.org/html/2606.19348';
const muown='https://arxiv.org/html/2605.10797';
const rufus='https://arxiv.org/html/2609.29421v2';
const parallel='https://docs.nvidia.com/nemo/megatron-bridge/latest/parallelisms.html';

export const productionTrainingSections=[
  {
    id:'corpus-construction', title:'Constructing the distribution the model will learn',
    body:
      p('Before the first optimizer step, a training run has already made consequential choices. Someone has selected text, code and other modalities, filtered them, assigned their sampling rates and converted them into sequences. The next-token objective learns from the resulting distribution. It cannot recover useful material that the preparation removed or distinguish a carefully sourced record from an accidental duplicate unless the data and objective make that distinction available.')+
      p('Start with a corpus record and its provenance. We need to know its source, revision, filtering history and permitted uses. A stable identity lets later deduplication, evaluation exclusion and error analysis refer to the same object. If a dataset is regenerated with different filters, its name alone does not identify the experiment.')+
      h('quality-and-duplicates','Filtering changes both content and effective sampling weight')+
      p('An exact duplicate appearing ten times receives roughly ten times as many opportunities to contribute a gradient under uniform record sampling. Removing copies therefore changes the training distribution as well as saving storage. Near-duplicate detection is harder because different boilerplate or formatting can conceal the same substantive passage.')+
      p('A similarity filter also has a threshold. Aggressive filtering can remove repeated code patterns that are legitimate examples, while permissive filtering can preserve benchmark solutions or templated spam. Keep the retained counts and inspect what each filter removes within a domain. A single corpus-wide retention percentage can hide severe losses in a small language or a specialized technical source.')+
      p('Evaluation exclusion has a different purpose from generic deduplication. A held-out problem can leak through its statement, solution, translation or a repository containing its tests. Track the overlap procedure and evaluate on independently sourced material as well. A clean split of file names does not establish a clean split of underlying tasks.')+
      h('sampling-exposure','A corpus size and a training mixture answer different questions')+
      p('Suppose our authored retained corpus has ten billion code tokens and ninety billion web tokens. A forty-billion-token run drawing half its tokens from each gives code twenty billion exposures and web twenty billion. With shuffled sampling that cycles through each source, code is visited twice on average and web only about 0.222 times.')+
      study('corpus')+
      p('Let '+m('T')+' be the total training-token budget, '+m('w_i')+' the fraction assigned to source '+m('i')+', and '+m('N_i')+' that source’s retained token count. Its average exposure is')+
      eq('e_i=\\frac{T w_i}{N_i},\\qquad \\sum_i w_i=1.')+
      p('Changing code’s share to a tenth gives four billion code exposures and thirty-six billion web exposures. Both averages become 0.4. This equalizes visits under the stated accounting. It does not establish that equal visits or the previous code-heavy mixture produce the better model. That requires controlled training and evaluation.')+
      p('Sampling documents uniformly would yield another distribution because their lengths differ. State whether a mixture weight governs documents, sequences or tokens. Curriculum changes need the same precision. Increasing a source’s share late in training changes what the current checkpoint sees, potentially improving one domain while displacing another.')+
      h('packing-and-history','Filling a sequence must preserve the intended prediction problem')+
      p('Tokenization determines the length used for these counts. Packing several short documents into one sequence reduces padding, but the boundary between documents requires a choice. The later document can be allowed to read the earlier one, or an attention mask can isolate them. A separator token marks a boundary without itself preventing attention across it.')+
      p('The loss mask is a separate choice about targets. A position can be permitted as context while excluded as a direct prediction target. Keep document boundaries, position conventions and target masks aligned after packing. The supervised section will use the same distinction for tool observations.')+
      syntheticCodeCase,
  },
  {
    id:'pretraining-budget', title:'Choosing a model, token budget and training clock',
    body:
      p('Once the retained sources and their mixture are available, the run still has to fit a compute budget. Spending more on one pass through a larger model can leave fewer tokens to learn from. Spending more on tokens can require a smaller model. A training recipe is a choice among these alternatives, followed by measurements that test the choice.')+
      h('compute-and-loss','A scaling fit describes a particular experimental regime')+
      p('For a dense linear map, a forward multiply uses about two floating-point operations per weight per input row. Computing gradients for inputs and weights adds about twice that forward work. Summed over an idealized dense model, this motivates the approximation '+m('C\\approx6NT')+', with '+m('N')+' participating parameters and '+m('T')+' training tokens. Attention comparisons, embeddings, recomputation, communication and hardware efficiency need further accounting.')+
      p('An MoE model requires another distinction. Total stored parameters determine weight and optimizer storage; the parameters activated for a token determine much of its expert arithmetic. Replacing total parameters with an active count in the approximation can help describe that arithmetic, but leaves routing, communication, load imbalance and attention costs to measure. A sparse model’s headline parameter count cannot by itself determine its training cost.')+
      p('Suppose controlled experiments support a loss fit '+m('L(N,T)=L_\\infty+aN^{-\\alpha}+bT^{-\\beta}')+'. The constants and exponents are estimated for a specified data mixture and model family. Under a fixed product '+m('NT')+', differentiating the fit along that constraint gives the balance condition')+
      eq('\\alpha aN^{-\\alpha}=\\beta bT^{-\\beta}.')+
      p('For an authored dimensionless example with '+m('a=b=1')+', '+m('\\alpha=\\beta=1/2')+' and '+m('NT=100')+', the balanced choice '+m('N=T=10')+' contributes about 0.6325 above '+m('L_\\infty')+'. The choice '+m('N=20,T=5')+' contributes about 0.6708. This is a consequence of the chosen fit. Real exponents, irreducible losses and downstream behavior can change the preferred allocation.')+
      source('Background on empirical compute allocation','../miscellaneous/#scaling-laws')+
      p('Training-optimal and deployment-optimal choices can differ because a larger model also costs more to serve afterward. A project expecting an enormous inference volume may rationally train a smaller model longer. The comparison needs the intended inference workload and lifetime, not only the pretraining loss at a fixed training budget.')+
      h('token-clock','A learning-rate schedule needs a unit')+
      p('NVIDIA’s released Nemotron 3 Super pretraining recipe specifies sequences of 8,192 tokens and a global batch of 3,072 sequences, about 25.17 million tokens per update. It also records a warmup-stable-decay schedule. These settings let us translate an update counter into a token clock.')+
      source('Nemotron 3 Super’s released batch and schedule',nemo)+
      eq('3072\\cdot8192=25{,}165{,}824\\quad\\text{tokens per full update}.')+
      p('At that fixed full batch, 200 billion tokens correspond to about 7,947 updates. Padding, batch ramps and later length changes alter that translation. A schedule described as “warm up for 8,000 steps” can represent a different amount of data after a batch-size change.')+
      p('Gradient accumulation makes the distinction operational. Several microbatches can contribute to one optimizer update. Advancing the learning-rate schedule per microbatch would change the experiment if the intended clock was per optimizer step. Reducing microbatch size for memory should not silently shorten the warmup in training tokens.')+
      p('A useful scaling experiment therefore records model size, unique and sampled tokens, optimizer updates, batch schedule and achieved compute. Wall time includes communication and idle intervals. The next chapter places those intervals and state objects on actual training devices.'),
  },
  {
    id:'distributed-training', title:'Distributing a training update across machines',
    body:
      p('A model can fit for inference and still be too large to train in the same allocation. Training retains gradients, optimizer state and activations in addition to the forward parameters. It also has to move enough information between devices to make their local computations one intended parameter update.')+
      h('training-state-ledger','Count persistent state before activations')+
      p('Use an authored mixed-precision AdamW layout with two bytes per forward parameter, two per stored gradient, four for a master parameter and four each for two moment estimates. That is sixteen bytes per parameter before activations, temporary buffers and communication workspace. Implementations using FP32 gradients or another state layout have a different count.')+
      p('At ten billion parameters the ledger gives 160 GB in decimal units. Keeping a complete copy on every data-parallel rank leaves that full persistent cost on each rank. Sharding optimizer state can distribute some of it. Sharding gradients and parameters distributes further objects, while requiring the corresponding gathers or reductions at execution boundaries.')+
      table(['Parallel dimension','What it divides','Dependency it introduces'],[
        ['Data parallel','Different examples contribute to shared parameters','Gradient reduction or equivalent sharded update'],
        ['Tensor parallel','An operation’s parameter and feature dimensions','Layer-level communication between cooperating ranks'],
        ['Pipeline parallel','Different layer ranges','Forward/backward activations crossing stage boundaries'],
        ['Expert parallel','Different expert parameters','Token dispatch and gradient traffic'],
        ['Context parallel','Sequence positions','Attention state or partial results crossing ranks'],
      ],'Parallel dimensions divide different objects and can be combined')+
      source('Megatron Bridge parallelism guide',parallel)+
      distributedCase+
      h('pipeline-occupancy','A larger global batch does not instantly fill every stage')+
      p('In a simple pipeline with four equal-time stages and eight microbatches, filling and draining takes time in addition to the steady flow. An idealized single-direction schedule occupies eight useful slots out of eleven elapsed slots on average, an efficiency of '+m('8/(8+4-1)\\approx0.727')+'. Actual training schedules interleave forward and backward work and may recompute activations, so their bubble calculation must use their actual timeline.')+
      p('Adding microbatches can reduce a fill/drain fraction but also changes activation liveness and sometimes the optimizer batch. If we split the same batch more finely, each operation may become less efficient. If we enlarge the batch, the optimization regime changes. A throughput tuning result needs to say which of these experiments was performed.')+
      h('long-context-layout','Longer sequences change the partition as well as the memory total')+
      p('Context parallelism can divide a long sequence across ranks. Each rank still needs enough remote information to compute its permitted attention interactions. Communication then depends on the attention algorithm and model architecture. Dividing the sequence length by the rank count does not divide every cost by that count.')+
      p('Nemotron’s published recipe uses a different topology for long-context extension, including 64-way context parallelism. Its main pretraining and extension phases therefore have different execution layouts as well as different lengths. That is a concrete reason to follow a stage change down into the launcher.')+
      source('Main and long-context parallel layouts',nemo)+
      p('Activation checkpointing trades stored intermediates for recomputation during backward. It can make a sequence executable while increasing arithmetic. The persistent-state ledger and the activation peak must be measured separately, especially for uneven MoE loads and variable-length packed sequences.')+
      p('The checkpoint on disk is another boundary. Resuming with a different partition may require resharding parameters and optimizer state. Save the global training progress, random and data-stream state, configuration and numerical format alongside the tensors. A run that restarts from weights alone has not necessarily resumed the same optimization trajectory.'),
  },
  {
    id:'optimizer-families', title:'AdamW, Muon and an optimizer transition',
    body:
      p('A gradient says which local parameter changes increase the objective. An optimizer decides how to combine that gradient with earlier observations and how to scale the resulting update. The choice matters more at scale because an update is expensive, batches can become large, and small numerical instabilities can waste a long run.')+
      h('adamw-update','Elementwise adaptation remembers two different statistics')+
      p('For one parameter coordinate, AdamW maintains a moving average '+m('m_t')+' of gradients and '+m('v_t')+' of their squares. With gradient '+m('g_t')+' and decay coefficients '+m('\\beta_1,\\beta_2')+',')+
      eq('m_t=\\beta_1m_{t-1}+(1-\\beta_1)g_t,\\qquad v_t=\\beta_2v_{t-1}+(1-\\beta_2)g_t^2.')+
      p('Starting those averages at zero biases their early values toward zero. The usual corrections divide by '+m('1-\\beta_1^t')+' and '+m('1-\\beta_2^t')+' to form '+m('\\widehat m_t,\\widehat v_t')+'. One common decoupled-weight-decay update is')+
      eq('w_{t+1}=(1-\\eta_t\\lambda)w_t-\\eta_t\\frac{\\widehat m_t}{\\sqrt{\\widehat v_t}+\\epsilon}.')+
      p('Here '+m('\\eta_t')+' is the learning rate, '+m('\\lambda')+' the weight-decay coefficient and '+m('\\epsilon')+' the denominator stabilizer. The division acts separately on coordinates. A parameter that repeatedly sees a large squared gradient can receive a smaller normalized step than its current gradient alone would suggest.')+
      h('matrix-update-geometry','A matrix also has directions that a coordinatewise rule does not normalize together')+
      p('Consider the authored gradient matrix shown below. At Adam’s first step with zero moments and negligible epsilon, bias correction gives the gradient as the first moment and its entrywise square as the second. Dividing by the square root of that second moment leaves the gradient divided by its absolute value. Every positive entry becomes one. In this example that produces a rank-one matrix even though the gradient has two nonzero singular directions.')+
      study('optimizer')+
      p('Muon instead constructs a matrix momentum and approximately replaces its nonzero singular values by a common scale. For momentum '+m('M=U\\Sigma V^{\\mathsf T}')+', the idealized direction is '+m('UV^{\\mathsf T}')+'. The positive-definite symmetric example has singular values seven and one and polar direction equal to the identity. Both directions in the figure are descent directions for that gradient, but their geometry differs.')+
      p('The figure isolates one first-step Adam normalization and one exact polar reference. Production Muon adds momentum, scaling, decay and approximate orthogonalization. DeepSeek V4 uses a hybrid Newton–Schulz iteration and retains AdamW for specified parameter groups. The numerical Muon treatment in the architecture notes follows that iteration explicitly.')+
      source('DeepSeek V4 optimizer configuration',v4)+
      source('Follow the numerical Muon construction','../deepseek/#training--muon')+
      h('row-magnitude','Controlling update singular values does not fix weight magnitudes')+
      p('The direction of an update and the size of the accumulated weight are different objects. Repeated updates can change weight norms even when the update has a controlled spectrum. Muown’s research diagnosis identifies row-magnitude growth as an empirical contributor to weight spectral-norm drift in its experiments.')+
      source('Muown’s diagnosis and reparameterization',muown)+
      muownCase+
      h('switching-and-partitioning','A temporal switch and a parameter partition need separate records')+
      p('MiMo pretrains with AdamW, switches hidden matrices to Muown during mid-training, and keeps AdamW for embeddings, the output head and router. It reports carrying FP32 master weights and Muown row state from SFT into RL. This is both a stage transition and simultaneous use of different optimizers on different parameter groups.')+
      source('MiMo’s optimizer transition and retained state',mimo)+
      p('The reported SFT-to-RL state retention does not specify an AdamW-to-Muown conversion at the earlier transition. An Adam second-moment tensor cannot simply stand in for matrix momentum or a row magnitude. That earlier boundary still needs its initialization rule. A matched optimizer comparison should hold data order and token budget fixed while measuring loss, downstream results, norm behavior and achieved updates per second.')+
      p('A method with fewer steps to a target loss can still take longer if each step is expensive. A larger-batch efficiency claim also belongs to its tested regime. These comparisons need both the optimization curve and its physical cost. We next examine another change that touches both sides, low-precision training.'),
  },
  {
    id:'precision-and-stability', title:'Low precision without losing the update',
    body:
      p('Training efficiency depends on the representation of the arithmetic as well as the number of operations. A low-precision matrix product can move less data and use a faster hardware path. The update accumulating over thousands of steps may require a finer representation than that forward product.')+
      h('master-and-forward','An update smaller than one storage step can still matter')+
      p('Use an authored uniform rounding grid with spacing 0.01, rather than any particular floating-point format. A weight starts at 1.000 and receives a change of −0.003 per step. If each update is applied to the rounded stored value, 0.997 rounds back to 1.00. Repeating that procedure loses every update.')+
      p('Keep a finer master value instead. After one, two and three steps it is 0.997, 0.994 and 0.991. The rounded forward copies are 1.00, 0.99 and 0.99. After ten steps the master reaches 0.970. An initially invisible change has accumulated into a visible one.')+
      table(['Step','Master value','Forward copy on the chosen 0.01 grid'],[
        [0,'1.000','1.00'],[1,'0.997','1.00'],[2,'0.994','0.99'],[3,'0.991','0.99'],[10,'0.970','0.97'],
      ],'A chosen uniform-grid example of why the master parameter is separate')+
      p('Stochastic rounding supplies another possible tool. Between 0.99 and 1.00, rounding 0.997 upward with probability 0.7 and downward with probability 0.3 preserves its expectation. It introduces randomness rather than preserving each individual value. Its effect on a training run still requires measurement.')+
      precisionCase+
      h('quantization-aware-learning','The model can be trained to tolerate the forward approximation')+
      p('Rounding is piecewise constant, so its ordinary derivative is zero almost everywhere. Quantization-aware training often uses a surrogate gradient through a simulated or actual quantized forward path. That surrogate is an algorithmic choice. It is not the mathematical derivative of the rounding function.')+
      p('Nemotron 3 Super’s recipe describes native NVFP4 pretraining, while MiMo introduces MXFP4 quantization-aware training during mid-training. Their timelines differ. The relevant comparison includes when the approximation was introduced and which state was retained across that boundary.')+
      source('Nemotron low-precision pretraining recipe',nemo)+
      source('MiMo’s mid-training numerical transition',mimo)+
      p('The gradient scale belongs to this record too. In a path using loss scaling, multiplying the loss multiplies its gradients. Unscale before the intended clipping and optimizer calculation. An overflow that skips a step changes the update clock even if the data reader advanced. A restart needs the scale and skip history where the implementation uses them, alongside the master parameters and optimizer state.'),
  },
  {
    id:'posttraining-objectives', title:'Demonstrations, preferences and rewards',
    body:
      p('A correct code patch is one kind of supervision. A preference between two explanations is another. An executable test can evaluate a newly sampled attempt. The objective needs to match the evidence we possess and the behaviors we want the policy to explore.')+
      h('supervision-choices','The source of feedback determines what can be optimized')+
      table(['Available evidence','One possible learning construction','What still needs validation'],[
        ['A successful demonstration','Assistant-target supervised likelihood','Coverage of the histories the trained policy will encounter'],
        ['A preferred and rejected response','Pairwise preference objective such as DPO','Preference reliability and coverage of the response distribution'],
        ['A deterministic task check','RL from sampled attempts and verifier returns','The verifier’s scope and possible shortcuts'],
        ['A learned evaluator','RL using a reward-model score','Evaluator bias, score drift and reward hacking'],
        ['A teacher distribution','Token-level distillation on chosen histories','Teacher correctness and student-history coverage'],
      ],'Different supervision objects produce different training experiments')+
      p('SFT increases the likelihood of the recorded assistant actions. A pairwise objective can instead increase preference for one whole response relative to another without requiring an environment execution on every optimization step. This makes saved preference pairs useful, but ties learning to the histories and alternatives represented by those pairs.')+
      h('preference-odds','A pairwise objective measures a change relative to a reference')+
      p('Let '+m('y^+')+' and '+m('y^-')+' be a preferred and rejected reply for prompt '+m('x')+'. Let '+m('\\pi_\\theta')+' be the policy being trained and '+m('\\pi_{\\mathrm{ref}}')+' a fixed reference. Sequence log probabilities add the conditional token log probabilities across the reply. Define the policy’s change in log odds relative to that reference as')+
      eq('\\Delta=\\log\\frac{\\pi_\\theta(y^+\\mid x)}{\\pi_\\theta(y^-\\mid x)}-\\log\\frac{\\pi_{\\mathrm{ref}}(y^+\\mid x)}{\\pi_{\\mathrm{ref}}(y^-\\mid x)}.')+
      p('The basic DPO pair loss is '+m('-\\log\\sigma(\\beta\\Delta)')+', with positive coefficient '+m('\\beta')+' and sigmoid '+m('\\sigma')+'. At a tie relative to the reference, '+m('\\Delta=0')+' and the loss is '+m('\\log2')+'. Increasing the preferred reply’s relative log odds reduces that loss.')+
      study('preference')+
      p('The authored figure uses a three-reply distribution. The policy gives the chosen pair probabilities 0.4 and 0.2, with the remaining 0.4 assigned elsewhere. The reference gives the pair 0.2 and 0.2. With '+m('\\beta=0.5')+', the margin is '+m('\\log2')+' and the pair loss is about '+m(preferencePair().loss.toFixed(4))+'.')+
      eq('\\frac{\\partial L_{\\mathrm{pair}}}{\\partial\\Delta}=-\\beta\\sigma(-\\beta\\Delta).')+
      p('This derivative is about '+m(preferencePair().derivative.toFixed(4))+' for the chosen example. Gradient descent pushes the preferred relative odds upward. A missing or incorrect preference label still pushes according to that label. The objective has no independent access to whether either answer solves the actual task.')+
      source('The DPO objective and its assumptions','https://arxiv.org/abs/2305.18290')+
      h('reward-and-reference','The old sampling policy and the reference policy have different jobs')+
      p('On-policy RL generates attempts from a current or recent policy and grades what it actually does. The old rollout probabilities describe that collection distribution. A reference policy, when used for regularization, supplies a separate behavioral anchor. Updating the rollout policy does not require updating that reference on the same schedule.')+
      p('A common regularizer subtracts '+m('\\beta_{KL}D_{KL}(\\pi_\\theta\\|\\pi_{\\mathrm{ref}})')+' from expected reward. The KL term penalizes distributional movement relative to the reference under the states used by that objective. It does not establish that the reference is correct or prevent every form of reward hacking.')+
      learnedRewardCase+
      p('Nemotron’s released staged recipe likewise distinguishes verifier-driven phases from a final learned-reward phase and changes their KL settings. The choice of feedback and regularization belongs to each stage, rather than to one universal post-training loss.')+
      source('Nemotron’s staged RL configuration',nemoRL)+
      p('We can now return to a verifier-based group calculation with its scope understood. Later, we will compare its collection and exploration choices with the other sources of feedback.'),
  },
  {
    id:'exploration-and-curriculum', title:'Keeping exploration and task difficulty useful',
    body:
      p('A policy can receive many samples and still explore very little. Repeating nearly identical attempts supplies weak coverage of alternative solutions. On the other hand, unconstrained sampling can spend most of the rollout budget on invalid actions. Exploration is a resource allocation problem coupled to the feedback signal.')+
      h('entropy-and-budget','Diversity has to reach the environment')+
      p('Token entropy measures uncertainty in a next-token distribution. It does not directly count distinct successful strategies. Several differently worded attempts can execute the same failing command. A task-level analysis should retain actions, intermediate states and termination causes alongside token statistics.')+
      p('MiMo describes adapting its positive- and negative-advantage ratio bounds using policy entropy and monitoring clipping rates. This gives the bounds an operational role beyond the fixed initial interval used in our earlier figure. Changing a bound alters which sampled tokens contribute to the update, so its runtime history belongs in the experiment record.')+
      source('MiMo’s runtime policy controls',mimo)+
      p('A generation budget can prevent an otherwise useful strategy from completing. Suppose an authored task needs two tool calls and a final response, but an evaluation allows only one call. A failure then measures the policy under that budget, not its unconstrained ability to solve the task. Training and evaluation must record per-turn and whole-episode limits separately.')+
      p('Increasing the budget also changes cost. If an episode doubles its generated action tokens, it can occupy rollout capacity longer and contribute more selected tokens to the batch. The prompt-normalization calculation earlier tells us which parts of that length increase change the gradient weight. The collection chapter will account for its occupancy.')+
      h('curriculum-order','A later stage can improve its target and damage an earlier capability')+
      p('A staged curriculum can first establish valid actions, then increase reasoning difficulty, then train a complex agent, then refine open-ended behavior. It can also overwrite useful behavior because all these stages update shared parameters. Keep a fixed suite evaluated at each boundary rather than inspecting only the last checkpoint.')+
      p('Nemotron’s released recipe runs multi-environment verifier RL, then separate software-engineering phases, then a final learned-reward phase. The stages have different prompt counts, generations per prompt and sequence limits. Rufus-Air’s <a href="#reward-model-domain">prompt-source failures</a> give a reason to inspect capability changes at each such boundary.')+
      source('Nemotron’s phase order and execution settings',nemoRL)+
      source('Rufus-Air stage ordering and reward-model ablations',rufus)+
      p('For one authored sequence, imagine math accuracy rises from 70 to 76 after a reasoning stage, then falls to 71 after agent training while coding rises. A final average can hide that trade if the evaluation weights happen to compensate. Per-domain trajectories expose it and let us test replay data, mixture changes or a different stage boundary.')+
      h('reward-budget','An improved reward can justify spending more on grading')+
      p('A cheap verifier can accept a superficial shortcut. A stronger grader can run additional tests, inspect artifacts or compare several attempts. Its cost competes with generating more candidates and with learner updates. The useful quantity is improvement at a total budget that includes rollout, grading and learning.')+
      p('A score increase accompanied by repeated no-op commands, longer explanations or weakened tests suggests an objective or environment problem. Requiring an unchanged trusted test suite, inspecting patch scope and retaining raw grader components makes that diagnosis possible. Simply lowering the learning rate would leave the missing distinction in the feedback.')+
      p('Mixed training can reduce sharp boundaries between domains, while making task sampling and acceptance more important. Staging and mixing are experiments with different controls. Their effects must be compared at matched compute and evaluation conditions, with the collection distribution made visible.'),
  },
  {
    id:'distillation-and-release', title:'Distillation, checkpoint selection and release',
    body:
      p('A large teacher can supply more than a final answer. It can evaluate a student’s continuation at the histories the student actually reaches. This matters when a small deviation changes which next action is useful. A student trained only on polished teacher transcripts can encounter unfamiliar states as soon as it makes its first different choice.')+
      h('teacher-distribution','A distribution teaches alternatives that one sampled answer omits')+
      p('Let a teacher supply probabilities '+m('q_j')+' and a student supply '+m('p_j')+' over a shared token vocabulary at the same history. Minimizing teacher-to-student cross-entropy uses '+m('-\\sum_j q_j\\log p_j')+'. Its derivative with respect to student logit '+m('z_j')+' is '+m('p_j-q_j')+'.')+
      p('For an authored two-token example with teacher '+m('(0.8,0.2)')+' and student '+m('(0.5,0.5)')+', the logit gradient is '+m('(-0.3,0.3)')+'. It moves probability toward the teacher’s distribution. Imitating a single sampled first token would instead use a one-hot target, giving '+m('(-0.5,0.5)')+' on that observation. The expected one-hot gradient matches the soft target when samples are truly drawn from the teacher, but individual updates differ.')+
      p('The vocabulary and temperature convention matter. A tokenizer mismatch prevents direct identification of corresponding token coordinates. A teacher that exposes only sampled text supplies a different interface from one exposing probabilities. A top-k probability response leaves omitted mass to handle under an explicit approximation.')+
      h('student-histories','Choose who generates the states that are being taught')+
      p('Sequence distillation stores teacher-generated continuations and trains the student to imitate them. On-policy distillation instead lets the student generate a continuation and uses teacher feedback at those student prefixes. The second construction can address histories induced by the student’s own errors, while spending teacher compute during collection.')+
      p('MiMo’s MOPD2 combines teachers and prefix-conditioned student turns. Saved teacher or demonstration histories initialize a turn; the student generates the continuation and receives token-level supervision from the assigned teacher. The preceding transcript supplies context rather than forcing that turn to imitate a fixed answer.')+
      source('MiMo prefix-conditioned and multi-teacher distillation',mimo)+
      p('A prefix-conditioned turn is cheaper than regenerating every earlier interaction. It also leaves earlier state visitation fixed to the source histories. Fully autonomous student episodes can cover compounded deviations that one isolated turn misses. The choice changes both collection cost and the failure modes visible during training.')+
      h('checkpoint-selection','Averaging weights is an intervention on the model')+
      p('A low training loss at one noisy checkpoint need not identify the most useful release. NVIDIA’s pretraining recipe includes checkpoint merging and selects a merged base checkpoint before alignment. The choice belongs in the provenance of the model that later stages receive.')+
      source('Nemotron checkpoint merging and selection',nemo)+
      p('Weight averaging is not generally equivalent to averaging model outputs. Consider a two-layer scalar linear function with weights '+m('(2,0.5)')+' and another with '+m('(0.5,2)')+'. Both multiply an input by one. Averaging their weights gives '+m('(1.25,1.25)')+', which multiplies by 1.5625. Even this tiny network shows why merging needs compatibility and evaluation.')+
      p('Checkpoints from one compatible trajectory can behave more smoothly than that deliberately constructed pair. They still need testing after a merge, quantization or tokenizer/template conversion. Preserve the input checkpoints, merge rule and validation record so that a later regression can be traced to the actual release operation.')+
      h('training-to-serving','Release validation closes the numerical and behavioral loop')+
      p('Evaluate the final artifact in the engine that will serve it. Recompute selected log probabilities where meaningful, test long-context and tool boundaries, and compare held-out task outcomes, output lengths and malformed responses. A correct trainer checkpoint can still be deployed with a different template or incompatible numerical path.')+
      p('Training and serving now meet at a versioned artifact with known data history, optimization state transitions and validation conditions. The final chapter follows that chain into the smaller released experiments and the measurements another reader can inspect.'),
  },
];
