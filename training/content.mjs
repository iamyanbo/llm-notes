import {p, math, equation, study, source, definition, table} from '../systems/markup.mjs';

const mimo = 'https://arxiv.org/html/2610.11959';
const rufus = 'https://arxiv.org/html/2609.29421v2';
const code = 'https://github.com/XiaomiMiMo/verl/tree/mimo-oss';

export const training = {
  slug: 'training',
  title: 'Training and post-training',
  heading: 'Teaching<br><em>a language model.</em>',
  subtitle: 'An example becomes a prediction, a mistake becomes a gradient, and an interaction becomes training experience.',
  description: 'A reading prototype following numerical training updates into a contemporary MiMo-V2.6 training case study, agentic RL, and cluster scheduling.',
  hero: 'training',
  companion: {slug: 'serving', title: 'Serving LLMs'},
  introduction:
    p('Consider a model that can write a plausible explanation of a failing test but repeatedly proposes a change that does not fix it. We could show it examples of successful repairs. We could also let it attempt repairs, execute them, and use the result to adjust its future behavior. These give us different sources of information for changing the model’s parameters.') +
    p('A demonstration supplies particular actions to imitate. An execution result can tell us whether a complete attempt succeeded without specifying the actions that should have produced that success. The second kind of feedback creates another problem. A successful episode may contain many generated tokens and tool calls. We need a way for its outcome to influence the probabilities of the actions that produced it.') +
    p('Before constructing that learning rule, we will follow a supervised example through one parameter update. It gives us a concrete account of a loss, its gradient, and a changed prediction. We can then ask how sampled attempts and their rewards supply a training signal when a preferred response has not been written down in advance.') +
    p('MiMo-V2.6 provides the main contemporary case study. Rufus-Air supplies a second perspective on successive post-training stages. The reports enter where a construction raises a question about an actual training run. Their settings and observations stay attached to the experiment that produced them.') +
    p('The assumed background is the transformer and basic gradient descent developed in <a href="../foundations/">Foundations</a>, with the learning essays in <a href="../transformers/">Transformers in Practice</a> as companions. Small numerical examples here have stated, hand-chosen parameters. The linked implementations provide the larger training configurations.'),
  sections: [
    {
      id: 'one-update', title: 'One prediction, one parameter update',
      body:
        p('A language model assigns probabilities to possible next tokens. To see how a training example changes such probabilities, take a binary readout with one input feature. Set that feature to '+math(String.raw`x=1`)+'. The readout has one trainable weight '+math(String.raw`w`)+' and gives the desired alternative probability '+math(String.raw`p=\sigma(wx)`)+', where '+math(String.raw`\sigma(s)=1/(1+\exp(-s))`)+'.') +
        p('Choose the observed target '+math(String.raw`y=1`)+' and the initial weight '+math(String.raw`w=0`)+'. The prediction is then '+math(String.raw`p=1/2`)+'. A training objective should favor assigning more probability to the observed outcome. The binary negative log-likelihood is') +
        equation(String.raw`L(w)=-y\log p-(1-y)\log(1-p).`) +
        p('With our target, the initial loss is '+math(String.raw`-\log(1/2)\approx0.6931`)+'. Differentiating through the sigmoid gives '+math(String.raw`\partial L/\partial w=(p-y)x`)+'. Since the input is one, the gradient is '+math(String.raw`0.5-1=-0.5`)+'. Its negative sign tells us that increasing this weight locally decreases the loss.') +
        p('We still need to choose the size of the change. Use a learning rate '+math(String.raw`\eta=0.4`)+' for this example. Gradient descent subtracts the scaled gradient from the current weight. The diagram follows the actual operands into that calculation.') +
        study('update') +
        equation(String.raw`w'=w-\eta\frac{\partial L}{\partial w}=0-0.4(-0.5)=0.2.`) +
        p('The updated prediction is '+math(String.raw`\sigma(0.2)\approx0.5498`)+' and the loss is about 0.5981. The single example has made the desired alternative more probable at this input. A real model’s update involves many interacting parameters and examples. Whether the change helps unseen inputs must be tested on data held apart from that update.') +
        definition('1.1', 'A <strong>training step</strong> applies an optimizer update using gradients accumulated from a stated batch of loss-bearing predictions. The examples, loss reduction, accumulation, and optimizer state determine the update associated with that step.'),
    },
    {
      id: 'pretraining-and-midtraining', title: 'What the starting checkpoint has learned',
      body:
        p('The update above began with a specified weight. A post-training run begins with a much larger specified object, its starting checkpoint. That checkpoint already determines which responses the model is likely to generate. Changing the training objective acts on those existing probabilities and representations.') +
        p('During next-token pretraining, recorded sequences supply many prediction problems. At position '+math(String.raw`t`)+', the permitted prefix supplies the input and the recorded next token supplies the target. Causal masking prevents a prediction from reading its target through a future position. A batch collects these losses so that their gradients can be evaluated together.') +
        p('More text does not by itself specify a useful mixture. Documents differ in source, quality, duplication, and relevance to the intended capabilities. Repeating one source increases its share of the optimization. If evaluation examples leak into training, performance on those examples changes its meaning. Data selection and evaluation design consequently meet before the first large run begins.') +
        p('MiMo-V2.6 reports text-only pretraining followed by joint multimodal training. Mid-training extends context support and prepares the model for its subsequent large-batch RL run, including an optimizer transition and quantization-aware training.') +
        source('MiMo-V2.6, pretraining and mid-training', mimo) +
        p('A context extension changes the range of dependencies the training examples can expose. It also changes the execution cost. Long sequences need retained activations for backpropagation and create attention and communication work. The architecture’s local and global attention pattern affects which data each device must exchange when a sequence is divided across devices.') +
        p('An optimizer transition introduces another stateful change. Momentum, per-coordinate statistics, and master weights may already reflect earlier updates. Moving to a new update rule therefore requires a decision about initialization and state transfer. A stable loss curve after the transition is an observation to examine together with validation behavior and the exact configuration.'),
    },
    {
      id: 'supervised-data', title: 'Which tokens should the example teach?',
      body:
        p('An assistant-training record usually contains more than the answer we want it to imitate. It may include instructions, a user request, a tool invocation, and a tool result. These positions help determine the next prediction. Their role as context does not require every position to contribute a training loss.') +
        p('Take a chosen record containing ten token positions. Two belong to a system message, two to the user, three to an assistant action, two to a tool result, and one to the assistant’s final answer. If we train on the assistant positions, four targets contribute to the objective while the other six positions supply context.') +
        table(['Part of the record', 'Positions', 'Loss-bearing targets'], [['System message', '2', '0'], ['User message', '2', '0'], ['Assistant action', '3', '3'], ['Tool result', '2', '0'], ['Assistant answer', '1', '1'], ['Total', '10', '4']], 'A hand-chosen loss mask') +
        p('Let '+math(String.raw`m_t`)+' equal one for a target included in training and zero otherwise. Let '+math(String.raw`\ell_t`)+' be its negative log-probability. A token-mean objective over this record is') +
        equation(String.raw`L=\frac{\sum_t m_t\ell_t}{\sum_t m_t}.`) +
        p('The denominator matters when examples have different answer lengths. Averaging all selected tokens gives longer answers more weight in the aggregate. Averaging each example first gives examples equal weight even when their selected lengths differ. Neither convention can be inferred from the phrase “batch size” alone.') +
        p('Packing several records into one physical sequence can reduce padding. Their attention boundaries must still match the intended examples. Chat templates and masks must also agree with the model’s generation format. A malformed boundary can teach an output under a context that the model will never receive at deployment.') +
        p('Rufus-Air describes assistant-only loss masking and packed supervised training. Its later stages start from the resulting checkpoint. This gives a concrete reason to inspect what the supervised data already teaches before attributing all later behavior to reinforcement learning.') +
        source('Rufus-Air supervised training and infrastructure', rufus),
    },
    {
      id: 'rewarded-attempts', title: 'Learning from several attempts',
      body:
        p('A demonstration gives us a target sequence. Now suppose we have a task and a verifier but no written solution. The current model can attempt the task several times. Each attempt produces a trajectory of generated actions and, eventually, a return from the verifier.') +
        p('Consider four attempts at the same task. Their binary returns are 0, 1, 1, and 0. The group mean is 0.5. Subtracting this mean from each return gives −0.5, 0.5, 0.5, and −0.5. The successful attempts receive positive relative signals, while the others receive negative ones.') +
        study('advantage') +
        p('For this first calculation, call the return of attempt '+math(String.raw`i`)+' '+math(String.raw`R_i`)+' and the number of attempts '+math(String.raw`G`)+'. We use a mean-only group baseline,') +
        equation(String.raw`\bar R=\frac1G\sum_{i=1}^{G}R_i,\qquad A_i=R_i-\bar R.`) +
        p('The difference '+math(String.raw`A_i`)+' is an advantage estimate for this construction. It can weight a log-probability term for generated actions. Gradient ascent on a positive-weighted log probability makes those actions more likely locally. A negative weight reverses that direction. This connects the verifier’s episode-level feedback to an update of the model’s output distribution.') +
        p('The sampled actions were generated by particular weights. After those weights change, their current probabilities may differ. A policy update can compare the current probability with the recorded sampling probability, using their ratio to account for the source of the data. Clipping or otherwise limiting that correction constrains how strongly an individual sample can drive the update.') +
        p('Normalization, loss reduction, and clipping alter this simple construction. They need their own numerical account before a full algorithm is compressed into one objective. An all-pass or all-fail group has zero differences under our baseline. Its generation consumed resources, but this particular relative signal provides no distinction among its attempts.') +
        p('MiMo-V2.6 reports a batch of 1,568 prompts with 16 rollouts each. That is 25,088 trajectories before the subsequent processing. It uses GRPO with asynchronous partial rollouts. These settings make collection, filtering, and the age of an experience consequential parts of each update.') +
        source('MiMo-V2.6 RL settings and objective', mimo),
    },
    {
      id: 'agent-experience', title: 'What an agent trajectory contains',
      body:
        p('A code-repair episode can begin with a task and an initialized working tree. The model chooses a command, the environment executes it, and the resulting output becomes context for another action. Files and processes persist between turns. The final test result grades an episode that may have contained many such interactions.') +
        p('We need to retain which tokens the model actually generated. A rendered transcript is convenient for reading, but reconstructing token sequences later can alter boundaries or formatting. Sampling probabilities must remain paired with the actions they describe. Tool observations provide context, while loss masks identify the model-generated positions to which the learning rule applies.') +
        p('The termination reason also carries information. A completed repair that fails its tests is a policy outcome. A broken sandbox or an unavailable grader prevents us from observing that outcome as intended. Treating every infrastructure interruption as a zero reward can change both the return and the group baseline.') +
        p('Rufus-Air records token trajectories directly and separates aborted infrastructure samples before advantage computation. Its agent infrastructure also keeps an environment alive for a trajectory’s lifetime. These decisions affect the training signal as well as reliability.') +
        source('Rufus-Air agentic RL environment', rufus) +
        p('Different tasks need different verifiers. Executable tests can check a program’s behavior. A learned judge may assess a response against a rubric. A visual task may require rendering and inspecting an artifact. In each case we should follow the raw observation into the final score and ask which errors or shortcuts that scoring procedure can detect.') +
        p('The released MiMo reproduction code provides environment-specific launch scripts, data references, model references, and harness integration. Its coding configuration defaults to eight nodes with eight GPUs each. The smaller 9B checkpoint supplies a concrete starting model for those experiments; an adapted small-cluster run would still need an explicit memory, length, and concurrency configuration.') +
        source('MiMo released training code and configurations', code),
    },
    {
      id: 'collecting-a-mixture', title: 'The scheduler changes the learning mixture',
      body:
        p('Suppose we want equal numbers of accepted episodes from two task sources. Episodes from the first take one unit of time. Episodes from the second take four. We have ten concurrent rollout slots, and for this example every completed episode is accepted.') +
        p('Allocate five slots to each source. After four time units, the fast source has completed twenty episodes and the slow source has completed five. Equal concurrency has produced a four-to-one collection. If we update on whichever episodes arrive, that completion pattern can determine the data the learner sees.') +
        p('Allocate two slots to the fast source and eight to the slow one. After four units each source has completed eight episodes. The same ten slots now produce the requested equal mixture. A source’s share of occupied slots and its share of completed training examples are different quantities.') +
        study('mixer') +
        p('We can express the account without assuming these particular durations. Suppose source '+math(String.raw`i`)+' should provide '+math(String.raw`\lambda_i`)+' accepted groups per time unit. Let '+math(String.raw`r_i`)+' be the fraction of generated groups accepted and '+math(String.raw`t_i`)+' the mean time a generated group occupies its slot. Generating '+math(String.raw`\lambda_i/r_i`)+' groups per time unit then requires, in a steady-state approximation,') +
        equation(String.raw`c_i\approx\frac{\lambda_i t_i}{r_i}`) +
        p('concurrent occupied slots. The formula follows by counting generated groups and multiplying by their occupied time. Lower acceptance increases required generation. Longer episodes increase required concurrency. At a fixed resource budget the scheduler must reconcile those demands, with estimates that may change as the policy learns.') +
        p('MiMo’s Sample Mixer addresses unequal task durations and filtering rates with adaptive collection and placement. Its failure analysis describes early short completions biasing length estimates and contributing to exhausted KV pools. The order in which observations become available can therefore affect the scheduler’s view of the workload.') +
        source('MiMo Sample Mixer and failure analysis', mimo) +
        p('A trace of this process should distinguish work in model generation from work in tools, work waiting for grading, and accepted groups waiting for a training batch. A queue that looks like spare inference capacity may be occupied by long-lived environments whose state will soon return to the model.'),
    },
    {
      id: 'learner-and-rollout', title: 'Keeping experience attached to its policy',
      body:
        p('The learner and rollout engine need different execution arrangements. The learner retains activations and optimizer state for gradient computation. The rollout engine generates sequences and retains attention state. Alternating those uses on the same devices requires state movement. Separating them allows overlap but introduces weight synchronization and experience generated by older policies.') +
        p('A partial episode can outlive an update. Its early and late actions may therefore have been sampled under different policy versions. The training record needs enough information to identify the sampling distribution of each action. Otherwise a probability ratio can silently compare the learner with the wrong reference.') +
        p('Precision and implementation also enter the comparison. A rollout engine and a training engine can use different kernels, reductions, or numerical formats. In an MoE model, a small difference can change expert selection. Matching a model name and a checkpoint path is insufficient to establish that the recorded and recomputed token probabilities agree.') +
        p('Rufus-Air describes replaying sampled expert-routing choices during the training forward pass. MiMo-V2.6 reports freezing its router during RL. These interventions act on different sources of instability and should be examined against their own measurements.') +
        source('Rufus-Air rollout routing replay', rufus) +
        source('MiMo router stability', mimo) +
        p('This is where the <a href="../serving/">serving essay</a> meets training. Faster generation can collect more experience, but the training system still has to deliver the intended mixture with valid probability metadata. The relevant trace follows both the parameter versions moving toward generation workers and the trajectories moving back toward the learner.'),
    },
    {
      id: 'reading-a-run', title: 'What changed during the run?',
      body:
        p('After an update, a rising training reward tells us that the policy is scoring better under the sampled tasks and their scoring procedure. We still need held-out measurements to determine which capabilities changed. The evaluation should retain the checkpoint, sampling settings, harness, budget, and scorer associated with each result.') +
        p('A sequence of training stages makes attribution harder. Each stage modifies parameters inherited from the previous one. A later result can reflect new learning and the loss of an earlier gain. Comparing adjacent checkpoints on the same measurements helps locate the change. Missing intermediate evaluations leave a gap that a final score alone cannot fill.') +
        p('Rufus-Air documents a sequential recipe and discusses limits on attributing intermediate-to-final changes. The authors describe practical and empirical reasons for their chosen stage order. Those observations belong with the particular stages and measurements that support them.') +
        source('Rufus-Air stagewise results and discussion', rufus) +
        p('An execution trace can reveal behavior the aggregate task score misses. Xiaomi’s analysis of tool-call repetition follows a concrete post-release failure back through training checkpoints and examines the penalty used for excessive calls. It supplies a case for asking whether a verifier rewards completion while overlooking a costly way of reaching it.') +
        source('MiMo tool-call repetition analysis', 'https://mimo.xiaomi.com/blog/mimo-v2-6-tool-call-repetition') +
        p('For a training experiment we can inspect, we should preserve raw returns, termination reasons, episode lengths, accepted-group counts, clipping statistics, parameter versions, and held-out results. These let us distinguish a change in the policy from a change in the data collected or the environment that scored it. A checkpoint then comes with an account of how it was produced and what was actually measured.'),
    },
  ],
  sources: [
    ['MiMo-V2.6 technical report', mimo],
    ['MiMo training code, mimo-oss branch', code],
    ['MiMo released RL environments', 'https://huggingface.co/datasets/XiaomiMiMo/MiMo-V2.6-RL-oss'],
    ['MiMo distilled 9B checkpoint', 'https://huggingface.co/XiaomiMiMo/MiMo-V2.6-Distill-Qwen-9B'],
    ['Rufus-Air post-training recipe', rufus],
    ['MiMo tool-call repetition analysis', 'https://mimo.xiaomi.com/blog/mimo-v2-6-tool-call-repetition'],
  ],
};
