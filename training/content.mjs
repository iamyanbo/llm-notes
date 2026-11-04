import {trainingDepth} from './depth.mjs';
import {p, math, equation, study, source, definition, table} from '../systems/markup.mjs';

const mimo = 'https://arxiv.org/html/2610.11959v1';
const rufus = 'https://arxiv.org/html/2609.29421v2';
const code = 'https://github.com/XiaomiMiMo/verl/tree/mimo-oss';
const repetition = 'https://mimo.xiaomi.com/blog/mimo-v2-6-tool-call-repetition';
const misc = '../miscellaneous/';

export const training = {
  slug: 'training',
  title: 'Training and post-training',
  heading: 'Teaching<br><em>a language model.</em>',
  subtitle: 'Follow a code repair from a demonstration to a graded episode, then into the batch that changes a checkpoint.',
  description: 'A motivated investigation of MiMo-V2.6 training, assistant loss masks, per-token policy weights, agent trajectories, task collection, and reproducible evidence.',
  hero: 'training',
  overviewLabel: 'Open the learning cycle',
  companion: {slug: 'serving', title: 'Serving LLMs'},
  introduction:
    p('Consider the coding session in the serving essay. The assistant edits a repository, runs its tests, and receives a failure. It can continue trying with the same weights. Training asks a further question. How could experience from repairs change the model so that future attempts are more likely to succeed?') +
    p('A successful demonstration supplies actions to imitate. A test result supplies a judgment about an attempted repair. These give us different routes to a parameter update. In the second route, someone still has to define the task, run the environment, retain the generated actions, and turn the outcome into a learning signal.') +
    p('MiMo-V2.6 is our main research case. We will follow the preparation of a starting checkpoint, the construction of training targets, and the collection of graded agent episodes. The opening cycle shows the part where attempts return to a learner and revised weights reach the rollout model. Its arrows carry tasks, actions, feedback, and parameters at different points in the process.') +
    p('Miscellaneous Topics develops <a href="'+misc+'#learning-efficiency">gradient descent and generalization</a>, <a href="'+misc+'#synthetic-data">distillation</a>, and <a href="'+misc+'#harnesses">the harness loop</a>. We will use those explanations to investigate the decisions within a training recipe. Rufus-Air supplies a second, explicitly staged recipe where its design clarifies a choice. Small numerical examples below are authored calculations, with their inputs stated.'),
  sections: [
    {
      id: 'pretraining-and-midtraining', title: 'Where MiMo’s reinforcement learning begins',
      body:
        p('Before we ask a model to learn from repairs, it must be able to attempt one. It needs enough language and code knowledge to read an instruction, produce an edit, and use the tools presented by its harness. A verifier can distinguish attempts only among the behaviors that the starting checkpoint generates.') +
        p('MiMo reports text-only pretraining followed by joint multimodal training. Its mid-training develops agent behavior and extends context support before large-scale RL. Later distillation transfers behavior to smaller models.') +
        source('MiMo-V2.6 stages', mimo) +
        table(['Point in the recipe', 'What enters the learning process', 'What we need to inspect'], [
          ['Pretraining', 'Recorded sequences and their next-token targets', 'Data mixture, objective, and checkpoint'],
          ['Preparation for agent learning', 'Examples of actions, observations, and longer contexts', 'Which behaviors the checkpoint can already attempt'],
          ['Reinforcement learning', 'Sampled episodes with feedback', 'How outcomes weight generated actions'],
          ['Transfer to another model', 'Teacher examples or distributions', 'Student objective and independent evaluation'],
        ], 'Questions we carry through the recipe; mechanisms and stage boundaries depend on the report') +
        p('Imagine that our initial model rarely emits a valid test invocation. Rewarding a completed repair can leave almost every attempt at zero, even if successful repairs would be very valuable. Demonstrations can make the action format available before the verifier has enough useful variation to compare.') +
        p('Rufus-Air places supervised fine-tuning before successive reasoning, coding, instruction-following, agent, and preference stages. The authors motivate their order through the capabilities already available and the reliability of rewards. Later stages update the same parameters, so earlier gains still need measurement.') +
        source('Rufus-Air stage order and its limits', rufus) +
        trainingDepth['pretraining-and-midtraining'] +
        p('A stage name therefore leaves several questions open. Which exact tokens are targets? Which observations are context? How are examples weighted? The repair conversation lets us inspect those choices before we return to feedback from tests.'),
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
        definition('2.1', 'A <strong>loss mask</strong> assigns each target position a coefficient indicating whether its prediction contributes to the objective. With binary mask '+math('m_t')+' and per-target loss '+math(String.raw`\ell_t`)+', a token-mean loss is '+math(String.raw`L=\sum_t m_t\ell_t/\sum_t m_t`)+', provided at least one target is selected.') +
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
        p('For the numerical development, give a completed repair return 1 if it passes our chosen tests and 0 otherwise. This is a simplified binary scorer. We can now ask what four attempts at the same task tell the learner.'),
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
        trainingDepth['rewarded-attempts'] +
        p('A full training step aggregates many such terms and may modify the episode advantages. This example isolates one positive-advantage coefficient at the reported initial bounds. It does not reproduce all grading, masking, entropy control, or aggregation choices in the run. To evaluate the complete update, those choices must be specified together.'),
    },
    {
      id: 'agent-experience', title: 'Preserving the episode that produced the signal',
      body:
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
        p('In a partial-rollout design, an unfinished episode can resume after an update. Its earlier tokens retain their earlier sampling probabilities. Its later tokens can come from the refreshed rollout weights. Recomputing every sampling probability under the latest weights would erase the information needed by the ratio in §4.') +
        table(['Segment of our chosen episode', 'Sampling weights', 'Record retained for training'], [
          ['Initial inspection and edit', 'Version 10', 'Exact tokens and probabilities from version 10'],
          ['Tool execution', 'No model sampling', 'Observation and environment state'],
          ['Continuation after refresh', 'Version 11', 'Exact new tokens and probabilities from version 11'],
          ['Learner evaluation', 'Version 12', 'Current probabilities paired with each recorded segment'],
        ], 'Illustrative policy versions within one partial episode') +
        p('Revised weights also change attention state. A continuation needs KV state compatible with the policy now evaluating its prefix. MiMo describes re-prefill after policy updates in its partial-rollout design. Generation, state reconstruction, and learning therefore compete for the same overall training budget.') +
        p('MiMo also freezes its MoE router during RL after observing unstable expert loads. This addresses a parameter-drift problem alongside the need to align training and inference calculations.') +
        source('MiMo partial rollouts and router stability', mimo) +
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
        p('Return to the repair’s purpose. We wanted future attempts to make useful, valid changes more often. A higher training reward can reflect that improvement, a narrower adaptation to the verifier, or a change in the examples collected. We need checkpoints evaluated under recorded, comparable conditions to distinguish them.') +
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
