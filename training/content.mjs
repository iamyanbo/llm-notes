import {productionTrainingSections} from './production.mjs';
import {trainingDepth} from './depth.mjs';
import {midtrainingCase, reportRecipeCase, asyncCase} from './cases.mjs';
import {p, math, equation, study, source, definition, table} from '../systems/markup.mjs';

const mimo = 'https://arxiv.org/html/2610.11959v1';
const rufus = 'https://arxiv.org/html/2609.29421v2';
const code = 'https://github.com/XiaomiMiMo/verl/tree/mimo-oss';
const repetition = 'https://mimo.xiaomi.com/blog/mimo-v2-6-tool-call-repetition';
const misc = '../miscellaneous/';

const coreTraining = {
  slug: 'training',
  title: 'Training and post-training',
  heading: 'Teaching<br><em>a language model.</em>',
  subtitle: 'From corpus construction and distributed pretraining to optimizer transitions, post-training and release.',
  description: 'A comparative treatment of corpus construction, pretraining budgets, distributed execution, AdamW/Muon/Muown, precision, preferences, RL and distillation across modern recipes.',
  hero: 'recipe-map',
  overviewLabel: 'Open the training and release map',
  companion: {slug: 'serving', title: 'Serving LLMs'},
  introduction:
    p('Consider the decisions behind a new model checkpoint. A team chooses the material it will learn from, the size of the model, the amount of training and the machines that will carry it out. Later it changes the data, context length or objective. A final export hides this history, even though those choices helped determine what the model can do.') +
    p('The purpose of this essay is to follow that history. We begin with corpus construction and pretraining, place a training update on a distributed cluster, then examine optimizer and precision choices. Mid-training and supervised learning prepare a checkpoint for later feedback. Preferences, verifiers, learned rewards and teachers give different ways to continue changing it.') +
    p('DeepSeek V4, Nemotron 3 Super, MiMo V2.6 and Rufus-Air provide complementary research cases. They disclose different choices and different amounts of the experiment. We will compare a decision where the evidence supports it, keeping each recipe’s data, architecture, scale and numerical conventions attached to its result.') +
    p('The coding repair from the serving essay returns when we need a concrete demonstration and agent environment. It is one application of the training process. The opening map covers the larger route from retained data to a released model, including the stages before any agent can attempt that repair.') +
    p('Foundations develops next-token likelihood and the chain rule through the transformer. Miscellaneous Topics develops <a href="'+misc+'#learning-efficiency">gradient descent and generalization</a>, <a href="'+misc+'#synthetic-data">synthetic data</a>, and <a href="'+misc+'#harnesses">the harness loop</a>. Small numerical examples here state their chosen inputs. Published training results retain their original sources.'),
  sections: [
    {
      id: 'pretraining-and-midtraining', title: 'Changing the recipe during mid-training',
      body:
        p('The earlier chapters separated data, optimization and numerical execution so that we could inspect each choice. A real stage boundary often changes several together. Mid-training is a useful name for continuing the broad foundation toward the contexts and behaviors later training will need. Its exact objective and boundary depend on the recipe.') +
        p('MiMo first trains a language backbone and then integrates vision and audio. Its agent-centric mid-training combines trajectories with text and multimodal material while extending context. The optimizer and precision transitions discussed above occur within this larger change of regime.') +
        source('MiMo pretraining and mid-training stages', mimo) +
        p('A model that rarely emits a valid test invocation offers an agent verifier little useful variation. Demonstrations and trajectory data can make that behavior available before expensive reinforcement learning begins. Similarly, a long-context RL environment needs a checkpoint that can use its history before it can learn a good long-horizon strategy.') +
        midtrainingCase +
        '<h3 id="context-extension">Context extension changes work, data and execution</h3>' +
        p('Increasing a maximum-length setting does not show that a model can retrieve distant evidence or reason across it. The positional construction must support the new range, the training data must exercise useful long-distance dependencies, and evaluation must test more than a single memorized retrieval pattern.') +
        p('Full attention also reads more pairs. If sequence length doubles, the triangular comparison count approaches four times its earlier value, while a fixed token budget contains fewer sequences. Local, sparse or recurrent architectures change that account. The parallel layout and batch schedule therefore need to follow the architecture actually being extended.') +
        p('For a chosen global allowance of 1,048,576 tokens per update, using length 8,192 permits 128 full sequences. At length 65,536 it permits sixteen. The token total matches, but the number of independent sequences and the attention work differ. An unchanged token count does not preserve every property of the update.') +
        p('NVIDIA’s released long-context phase uses a dedicated context-parallel layout and a small learning rate. It is a separate execution regime to inspect, with its own data and checkpoints. MiMo’s mid-training is another concrete example of preparing long-context capability before large-scale agent RL.') +
        source('Nemotron long-context extension', 'https://docs.nvidia.com/nemotron/0.2.0/nemotron/super3/pretrain.html') +
        '<h3 id="stage-boundary-evidence">Evaluate the boundary before attributing the result</h3>' +
        p('Save the incoming and outgoing checkpoint identities, optimizer-state policy, data-mixture change, length schedule and numerical configuration. Evaluate both short- and long-context tasks. If several changes land together, an improvement cannot be attributed to one of them without an ablation or another controlled comparison.') +
        p('After this preparation, a supervised stage can teach the assistant actions the next environment expects. We return to the coding conversation and follow exactly which predictions are selected, before comparing its supervision with preferences and sampled rewards.'),
    },
    {
      id: 'one-update', title: 'Which parts of the conversation should teach?',
      body:
        p('Suppose we have one demonstration containing a question, an assistant edit, a failing tool observation, and a final assistant response. The tool observation must be available when the model predicts the final response. We can still choose to apply loss only to the assistant’s generated positions.') +
        p('Use a toy token sequence with nine positions. Its labels stand for individual tokens in this example, including the role markers. A real tokenizer would usually split this conversation into many more positions. In the diagram, input position '+math('t')+' predicts the token at '+math('t+1')+'. We select edit, done, and the final end marker as the three training targets.') +
        study('mask') +
        p('At the position before edit, suppose the model assigns edit probability 0.5. Before done it assigns done probability 0.25, and before the end marker it assigns that marker probability 0.8. Each probability is conditional on its own permitted prefix.') +
        p('The negative log-probabilities are approximately 0.6931, 1.3863, and 0.2231. Averaging the three gives') +
        equation(String.raw`L=\frac{-\log(0.5)-\log(0.25)-\log(0.8)}{3}\approx0.7675.`) +
        p('The tool’s fail token influenced the context of the final answer but contributes no direct target loss in this example. Predicting edit is also evaluated before fail exists in the prefix. Keeping the one-position shift visible prevents a training row from accidentally reading its own next-token target.') +
        definition('7.1', 'A <strong>loss mask</strong> assigns each target position a coefficient indicating whether its prediction contributes to the objective. With binary mask '+math('m_t')+' and per-target loss '+math(String.raw`\ell_t`)+', a token-mean loss is '+math(String.raw`L=\sum_t m_t\ell_t/\sum_t m_t`)+', provided at least one target is selected.') +
        p('The denominator determines weighting. Combining all selected tokens across a batch gives longer answers more influence. Averaging each example’s selected losses first gives examples equal influence. Our repair might contain a short edit and a very long explanation, so the reduction can affect which part dominates the update.') +
        p('Backpropagation now follows the selected losses into the shared parameters. The gradient-descent construction is the one already developed in the learning essay. What we have added is a precise account of the predictions whose gradients enter it.') +
        source('Review parameter updates and loss behavior', misc+'#learning-efficiency') +
        p('This mask is one illustrative supervised construction. Rufus-Air documents assistant-only supervised loss. The exact template, selected positions, and reduction must be taken from the particular recipe being reproduced.') +
        source('Rufus-Air supervised setup', rufus) +
        trainingDepth['one-update'],
    },
    {
      id: 'supervised-data', title: 'Turning a repair into a training task',
      body:
        p('A demonstration cannot cover every useful repair. We may instead have an initial repository, an instruction, and tests capable of checking a result. Let the current model attempt the work. It can obtain feedback even when no preferred action sequence has been written down.') +
        p('The task needs a repeatable initial state. Two attempts should begin from the specified repository revision and dependencies. Their file changes and processes should be isolated. Otherwise a patch left by one attempt can become an unrecorded hint or an obstacle for another.') +
        p('The verifier also needs its own scope. A failing test before the repair helps establish that there is something to fix. A passing test afterward supplies evidence about the tested behavior. Additional checks can catch regressions outside that case. An instruction asking for a narrow change leaves quality questions that one binary pass result may not resolve.') +
        table(['Episode boundary', 'Record for our repair', 'Why it affects learning'], [
          ['Initialization', 'Repository revision, dependencies, task', 'Defines the state the policy receives'],
          ['Action', 'Generated command or edit', 'Identifies what the model chose'],
          ['Observation', 'Tool output and resulting files', 'Determines the next permitted input'],
          ['Termination', 'Completion, budget exhaustion, or infrastructure abort', 'Determines whether the intended outcome was observed'],
          ['Grading', 'Raw tests and any additional scoring', 'Supplies the outcome used by the learning rule'],
        ], 'A chosen repair episode before any reinforcement-learning formula') +
        p('Task construction can accidentally expose its answer. A committed solution, generated cache, or accessible grading artifact can provide a shortcut. A policy repeatedly optimized for the score has reason to find such paths. The environment and verifier therefore belong in the training specification.') +
        p('The MiMo public release supplies different task environments, verifiers, harness integrations, and launch scripts. Its code-task documentation calls for anti-hack cleanup when preparing the environment.') +
        source('Released environments and preparation settings', code) +
        trainingDepth['supervised-data'] +
        p('For the numerical development, a completed repair will receive return 1 if it passes the chosen tests and 0 otherwise. Before following four such attempts, we compare that binary scorer with the other feedback a post-training recipe can use.'),
    },
    {
      id: 'rewarded-attempts', title: 'From graded attempts to a token’s learning signal',
      body:
        p('Suppose four attempts produce returns 0, 1, 1, and 0. Their mean is 0.5. Subtracting it gives −0.5, 0.5, 0.5, and −0.5. Successful attempts receive a positive relative signal, and unsuccessful attempts receive a negative one.') +
        study('advantage') +
        p('Let '+math('R_i')+' be attempt '+math('i')+'’s return and '+math('G')+' the group size. The calculation above defines a mean-only baseline and its advantage,') +
        equation(String.raw`\bar R=\frac{1}{G}\sum_{i=1}^{G}R_i,\qquad A_i=R_i-\bar R.`) +
        p('We can associate a successful attempt’s positive advantage with its generated token log probabilities. Increasing those log probabilities locally favors the sampled actions. A negative coefficient reverses the local direction. The episode’s outcome has supplied a way to weight predictions without prescribing a complete reference answer.') +
        p('If every return is equal, these differences are zero. The group consumed generation and grading work, but the mean-only baseline provides no distinction within it. A richer scorer can distinguish different successful repairs, and a collection policy can seek tasks on which attempts vary. Any such change also changes the data or signal used by the learner.') +
        '<h3 id="sampling-probability-record">Keep the probability recorded when the action was sampled</h3>' +
        p('Our successful edit was generated before the latest update. For one of its tokens, suppose the rollout model assigned probability '+math('q=0.1')+'. The learner now assigns the same token probability '+math('p=0.12')+' under its recorded prefix. Their ratio is '+math('r=p/q=1.2')+'. It describes how the token’s probability has changed since collection.') +
        p('MiMo uses per-token learner-to-rollout probability ratios held fixed during differentiation. It masks ratios outside separately controlled intervals for positive and negative advantages, initialized to [0.2, 5], and uses prompt-mean aggregation.') +
        source('MiMo policy optimization rule', mimo) +
        study('policy') +
        p('For our positive advantage '+math('A=0.5')+', ratio 1.2 is inside the stated initial interval, so its mask '+math('M')+' equals one. Multiplying '+math('M r A')+' gives 0.6. That is the coefficient multiplying this token’s log-probability gradient in the isolated term.') +
        p('Move the learner probability to 0.6 in the figure. The ratio becomes six, outside the initial positive interval, and the mask becomes zero. The term supplies no gradient under that mask. The example exposes the rule’s boundary while keeping the sampled action and its recorded probability fixed.') +
        p('Writing '+math(String.raw`\operatorname{sg}`)+' for “use this value without differentiating through it,” the term we have examined is') +
        equation(String.raw`J_{\mathrm{token}}=\operatorname{sg}(M r A)\log p,\qquad \frac{\partial J_{\mathrm{token}}}{\partial\log p}=M r A.`) +
        reportRecipeCase +
        trainingDepth['rewarded-attempts'] +
        p('A full training step aggregates many such terms and may modify the episode advantages. This example isolates one positive-advantage coefficient at the reported initial bounds. It does not reproduce all grading, masking, entropy control, or aggregation choices in the run. To evaluate the complete update, those choices must be specified together.'),
    },
    {
      id: 'agent-experience', title: 'Preserving the episode that produced the signal',
      body:
        study('training') +
        p('The coefficient above depends on a particular sampled token, its prefix, its sampling probability, and its feedback. A readable transcript is useful for inspecting a repair. A training record must preserve the exact alignment among these quantities.') +
        p('Imagine repairing a malformed tool call before executing it. The environment may then succeed because of an action the model never sampled. If the altered call is stored as the model’s action, the learner receives a false account of what earned the return. The original and any repair should remain distinguishable in the record.') +
        p('Rufus-Air records token IDs directly with log probabilities, loss masks, and expert-routing metadata. It passes those records through to training and keeps infrastructure aborts apart from completed policy outcomes.') +
        source('Rufus-Air token fidelity and environment records', rufus) +
        p('For our repair, a test failure after a valid run is an observed outcome. A test worker disappearing before it reports a result leaves that intended outcome unknown. Giving both the same zero return can alter the group mean and penalize actions for an infrastructure event. Termination reasons let the training pipeline apply its actual policy for missing outcomes.') +
        p('The same distinction matters within a group. If one of four attempts is aborted, silently treating it as a failed repair leaves a four-member baseline. Excluding it creates a different group and denominator. A reproducible record states which attempts were included, and whether the group was discarded or replenished.') +
        p('Tool observations remain context for later actions. Loss masks determine where feedback applies. A policy version identifies the weights that generated a segment. The episode record joins these pieces so that the learner can compute the quantity the objective asks for.') +
        trainingDepth['agent-experience'] +
        p('Once records are valid, we still need to collect the intended mixture of them. Our code repair may take much longer than another task in the same run.'),
    },
    {
      id: 'collecting-a-mixture', title: 'Collecting the batch the recipe asked for',
      body:
        p('Suppose we want equal numbers of accepted episodes from two task sources. In our chosen model, one source takes one time unit per episode and the other takes four. Ten rollout slots are available, and every completed episode is accepted.') +
        p('Give each source five slots. After four units, the fast source has completed twenty episodes and the slow source five. Updating from the completions as they arrive would expose the learner to a four-to-one mixture.') +
        p('Give the fast source two slots and the slow one eight. After the same four units, each has completed eight episodes. We have used the same ten slots to supply a different learning mixture.') +
        study('mixer') +
        p('Filtering adds another cost. If only half of a source’s completed groups are usable, it needs twice as many generated groups to supply the same accepted rate. Let '+math(String.raw`\lambda_i`)+' be the desired accepted groups per unit time, '+math('r_i')+' the accepted fraction, and '+math('t_i')+' the mean time a generated group occupies a slot. The steady-state concurrency estimate is') +
        equation(String.raw`c_i\approx\frac{\lambda_i t_i}{r_i}.`) +
        p('We obtain it by counting '+math(String.raw`\lambda_i/r_i`)+' generated groups per unit time and multiplying by their occupied time. It assumes stable averages. Startup, correlated long episodes, changing policies, and finite buffers can make short intervals depart substantially from that estimate.') +
        p('MiMo reports 1,568 prompts with sixteen rollouts each, or 25,088 trajectories, and uses a Sample Mixer to adapt collection to durations and filtering. Its failure analysis describes early short completions biasing length estimates and exhausting KV pools.') +
        source('MiMo batch settings, Sample Mixer, and failure analysis', mimo) +
        p('The first completions are a selected sample of the work in flight. Measuring only those can underestimate how much memory the unfinished episodes will require. For our repair source, a scheduler should retain information about running work as well as completed work before revising its length budget.') +
        trainingDepth['collecting-a-mixture'] +
        p('Faster serving can improve collection. It can also change which source finishes first. The batch composition must therefore be checked after a serving change, even if the task-selection probabilities were left alone.'),
    },
    {
      id: 'learner-and-rollout', title: 'Refreshing the policy while episodes continue',
      body:
        p('A long repair can outlive the time needed to collect another batch. Waiting for every attempt keeps some workers idle. Continuing collection while the learner updates introduces another issue. Some actions now belong to an older policy.') +
        p('In a partial-rollout design, an unfinished episode can resume after an update. Its earlier tokens retain their earlier sampling probabilities. Its later tokens can come from the refreshed rollout weights. Recomputing every sampling probability under the latest weights would erase the information needed by the <a href="#sampling-probability-record">recorded probability ratio</a>.') +
        table(['Segment of our chosen episode', 'Sampling weights', 'Record retained for training'], [
          ['Initial inspection and edit', 'Version 10', 'Exact tokens and probabilities from version 10'],
          ['Tool execution', 'No model sampling', 'Observation and environment state'],
          ['Continuation after refresh', 'Version 11', 'Exact new tokens and probabilities from version 11'],
          ['Learner evaluation', 'Version 12', 'Current probabilities paired with each recorded segment'],
        ], 'Illustrative policy versions within one partial episode') +
        asyncCase +
        p('Precision and kernels can affect that alignment. The rollout engine and learner may perform different reductions or use different formats. A small numerical change can alter an MoE choice or the set of tokens considered by sampling. Probability comparisons need the corresponding implementation details, as well as a checkpoint name.') +
        p('Rufus-Air describes replaying sampled expert choices in the training forward pass. That intervention preserves a recorded route for the calculation being compared. Freezing router parameters and replaying a route answer different operational questions.') +
        source('Rufus-Air routing replay', rufus) +
        trainingDepth['learner-and-rollout'] +
        p('The serving essay follows retained state while a deployed model answers requests. Here that state participates in a changing-policy experiment. The lifetime of a reusable prefix ends at a different boundary when the model weights change.') +
        source('Follow session state through a serving cluster', '../serving/#memory-and-work'),
    },
    {
      id: 'reading-a-run', title: 'What changed, and what can we reproduce?',
      body:
        p('Return to the purpose of the training run. We wanted a model that performs useful tasks more reliably under the intended conditions. A better training loss, reward or teacher agreement is evidence about its own objective. Held-out evaluations and complete checkpoint provenance help determine which gains survive the next stage and the serving deployment.') +
        p('The evaluation principles are developed in Miscellaneous Topics. For this run, keep task identities, environments, model versions, generation budgets, and graders attached to each checkpoint result. Check both completion and the behavior used to reach it. A final total alone cannot locate a regression introduced by an earlier stage.') +
        source('Review experimental conditions and benchmark selection', misc+'#frontier-release') +
        p('Xiaomi’s tool-call repetition investigation supplies a concrete example. It traced problematic calls across RL checkpoints and examined a per-turn flooding penalty triggered above 32 calls. Lowering the threshold to eight in a separate experiment suppressed flooding, with limited generalization to other repetition cases. Flooding and exact duplicate calls were measured separately.') +
        source('MiMo’s post-release repetition investigation', repetition) +
        p('A task score can therefore improve while a costly behavior remains weakly constrained. For our repair, we would inspect repeated commands, unnecessary files touched, failed tool calls, and time spent reaching the passing test. Those observations help identify which part of the scoring procedure needs investigation.') +
        '<h3 id="released-experiment">Read the released experiment before choosing a reproduction</h3>' +
        p('The public MiMo fork provides a distilled Qwen-based 9B training checkpoint, five environment families, and launch scripts. Its code path combines a harness, model gateway, trajectory capture, and a verifier. Reproducing that released experiment requires their versions and configuration together.') +
        source('MiMo released training framework and smaller-model recipe', code) +
        table(['Artifact to preserve', 'Question it lets us answer'], [
          ['Starting checkpoint and tokenizer', 'Which policy and input representation began the experiment?'],
          ['Data, environment, and verifier revisions', 'Which task and feedback produced each sample?'],
          ['Batch, masks, reduction, and optimizer settings', 'Which computation produced the parameter update?'],
          ['Raw episode metadata and failure reasons', 'Which outcomes entered the learning signal?'],
          ['Held-out tasks and per-checkpoint results', 'Which gains and regressions survived evaluation?'],
        ], 'A reproduction record for the selected experiment') +
        p('The smaller released run and the production-scale report have different starting models and resource requirements. A reduced experiment can test a particular mechanism, such as masking or task collection, when those choices are stated. Its observed result then belongs to that configuration.') +
        trainingDepth['reading-a-run'],
    },
  ],
  sources: [
    ['MiMo-V2.6 report, version 1', mimo],
    ['Rufus-Air recipe, version 2', rufus],
    ['MiMo released training framework', code],
    ['MiMo released RL environments', 'https://huggingface.co/datasets/XiaomiMiMo/MiMo-V2.6-RL-oss'],
    ['MiMo distilled training checkpoint', 'https://huggingface.co/XiaomiMiMo/MiMo-V2.6-Distill-Qwen-9B'],
    ['MiMo tool-call repetition investigation', repetition],
    ['Pinned prompt-loss implementation', 'https://github.com/XiaomiMiMo/verl/blob/79090e58195e80a9cfe251c95ae7a78a2132b6e2/verl/trainer/ppo/core_algos.py'],
    ['Pinned public code-training launch script', 'https://github.com/XiaomiMiMo/verl/blob/79090e58195e80a9cfe251c95ae7a78a2132b6e2/scripts/code/train.sh'],
  ],
};

const trainingOrder=['corpus-construction','pretraining-budget','distributed-training','optimizer-families','precision-and-stability','pretraining-and-midtraining','one-update','supervised-data','posttraining-objectives','rewarded-attempts','exploration-and-curriculum','agent-experience','collecting-a-mixture','learner-and-rollout','distillation-and-release','reading-a-run'];
const trainingChapters=new Map([...coreTraining.sections,...productionTrainingSections].map(section=>[section.id,section]));
export const training={...coreTraining,sections:trainingOrder.map(id=>trainingChapters.get(id)),sources:[...coreTraining.sources,
  ['DeepSeek V4 training and optimization','https://arxiv.org/html/2606.19348'],
  ['Nemotron 3 Super pretraining recipe','https://docs.nvidia.com/nemotron/0.2.0/nemotron/super3/pretrain.html'],
  ['Nemotron 3 Super staged RL recipe','https://docs.nvidia.com/nemotron/0.2.0/nemotron/super3/rl/index.html'],
  ['Megatron Bridge parallelisms','https://docs.nvidia.com/nemo/megatron-bridge/latest/parallelisms.html'],
  ['Muown optimizer research','https://arxiv.org/html/2605.10797'],
  ['Nemotron 3 Super technical report','https://arxiv.org/html/2604.12374'],
  ['Priming Base Models for Agentic Post-Training, version 1','https://arxiv.org/html/2610.22019v1'],
  ['Transformer Engine NVFP4 numerical path','https://docs.nvidia.com/deeplearning/transformer-engine/features/low_precision_training/nvfp4/nvfp4.html'],
  ['Megatron distributed optimizer','https://docs.nvidia.com/megatron-core/developer-guide/latest/user-guide/features/dist_optimizer.html'],
  ['Direct Preference Optimization objective','https://arxiv.org/abs/2305.18290'],
]};
