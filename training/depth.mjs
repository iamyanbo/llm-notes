import {p, math as m, equation as eq, study, source, table, definition, heading as h} from '../systems/markup.mjs';
import {outputUpdate, qualityAdvantages, groupFilter, reductionExample} from '../systems/models.mjs';

const report = 'https://arxiv.org/html/2610.11959v1';
const revision = '79090e58195e80a9cfe251c95ae7a78a2132b6e2';
const released = 'https://github.com/XiaomiMiMo/verl/blob/'+revision+'/';
const n = value => Number(value.toFixed(4));
const update = outputUpdate();
const quality = qualityAdvantages();
const reduction = reductionExample();
const f4 = groupFilter(0.9, 4);
const f16 = groupFilter();

export const trainingDepth = {
  'one-update':
    h('loss-reduction', 'Choose which experimental unit receives equal weight') +
    p('Our three selected targets belonged to one conversation. A batch contains several conversations and may contain several rollouts for each prompt. “Average the loss” leaves open which of those units is being averaged.') +
    p('Take two prompts, A and B, with two rollouts each. Use the authored token counts and mean token losses below. These can represent supervised negative log-probabilities for the arithmetic. The same normalization issue applies when the values are policy-loss terms.') +
    table(['Prompt', 'Rollout', 'Action tokens', 'Mean token loss'], reduction.rows.map((row, index) => [
      row.prompt, index % 2 + 1, row.length, row.mean,
    ]), 'Unequal lengths in an authored two-prompt batch') +
    p('Adding token losses gives 8.8 over twelve action tokens, so a token mean is '+m(n(reduction.tokenMean))+'. Averaging the four rollout means gives '+m(n(reduction.sequenceMean))+'. Pooling the tokens within each prompt gives A mean 0.8 and B mean 0.6; averaging those two prompt means gives '+m(n(reduction.promptMean))+'.') +
    eq('L_{\\mathrm{token}}=\\frac{8.8}{12},\\quad L_{\\mathrm{rollout}}=\\frac{0.2+1+0.6+0.6}{4},\\quad L_{\\mathrm{prompt}}=\\frac{0.8+0.6}{2}.') +
    p('The short rollout for A receives one quarter of its prompt’s token weight, while its longer rollout receives three quarters. They do not receive equal shares within that prompt under the pooled-token construction. Prompt-mean and equal-rollout averaging can therefore disagree even when every prompt has the same number of rollouts.') +
    p('The released MiMo fork makes the pooled-token interpretation inspectable. Its compute_prompt_loss_weights function totals action tokens by prompt identity over the full optimizer batch, then assigns each row the corresponding per-token normalization weight.') +
    source('Pinned implementation of prompt normalization', released+'verl/trainer/ppo/core_algos.py') +
    p('Let '+m('q')+' label a prompt, '+m('i')+' one of its rollouts, and '+m('t')+' a target position. Write '+m('m_{q,i,t}')+' for its binary action mask and '+m('\\ell_{q,i,t}')+' for its loss. Let '+m('Q')+' be the number of prompts with at least one selected action token, and '+m('N_q')+' that count pooled over prompt '+m('q')+'’s rollouts. Its per-token coefficient is') +
    eq('w_{q,i,t}=\\frac{m_{q,i,t}}{Q N_q},\\qquad L=\\sum_{q,i,t}w_{q,i,t}\\ell_{q,i,t}.') +
    p('For our example, every selected A token receives weight 1/16 and every selected B token 1/8. Each prompt’s weights sum to one half. If the action counts were computed independently in each microbatch, those weights could change when the same batch was packed differently.') +
    h('distributed-normalization', 'Preserve that objective when the batch is split across devices') +
    p('Suppose rank zero gets A’s short rollout and B’s first rollout. Rank one gets A’s long rollout and B’s second. Their local token means are 0.4 and 0.9. Averaging those scalars gives 0.65, which matches neither the desired global token mean nor the desired prompt mean.') +
    p('With the global prompt weights, the local weighted sums are 0.175 and 0.525. Their sum is the intended 0.7. If the distributed runtime averages gradients over two ranks, multiplying each local sum by two before that average recovers the gradient of the global sum. The pinned aggregation code includes the data-parallel scaling for this reason.') +
    p('Gradient accumulation has the same requirement. Dividing every microbatch by its own token count changes the effective objective when lengths vary. The normalization weights need to describe the intended optimizer batch, while the execution can split that batch for memory. A correct mathematical objective must survive both operations.'),

  'supervised-data':
    h('verifier-integrity', 'Follow the evidence that the reward is allowed to trust') +
    p('Our repair has an instruction, a repository state, a candidate patch, and executable tests. The model may be allowed to modify some repository files, but the training experiment needs a boundary around the evidence used for grading. If the same policy can freely rewrite both the solution and the test that declares it correct, a passing result becomes ambiguous.') +
    p('A verifier can retain trusted tests outside the writable work tree, reapply them at grading, or inspect the patch for changes to protected artifacts. Its exact procedure must match the task. A dependency update may legitimately alter a lockfile, while deleting a failing assertion can evade the intended requirement. A fixed filename blacklist alone does not decide every case.') +
    p('The release’s anti-hack preparation is one part of that boundary. The trajectory should also record which files were changed and which environment produced the grade. An unexpectedly fast success is then a result to inspect against the patch, rather than evidence that the task became easier in the intended way.') +
    h('reward-resolution', 'Ask what distinctions the score can express') +
    p('Two repairs can both pass the supplied tests while differing in scope and maintainability. One might fix the relevant branch; another might swallow the exception broadly. Binary success gives them the same return. A learning rule using only that return cannot recover a preference the grader never expressed.') +
    p('A chosen composite score can multiply binary test success by solution quality and behavior quality. If all three lie in [0,1], a failed test remains zero. A passing repair with quality values 0.8 and 0.9 receives 0.72. This preserves a test gate while adding resolution among passes.') +
    p('That extra resolution has its own uncertainty. A judge needs access to the artifact, a rubric tied to the instruction, and a procedure for invalid or missing outputs. Repeated judgments can disagree. Saving the raw test result and each score component lets us investigate whether a reward change came from the patch or from its evaluator.') +
    p('We can also spend grading effort comparatively. Put the passing and failing attempts for the same instruction beside one another and inspect the differences that account for success. The next calculation shows how supplied quality factors can redistribute the available positive signal without silently changing the baseline.'),

  'rewarded-attempts':
    h('quality-redistribution', 'Allocate the positive signal between successful repairs') +
    p('The four returns above gave advantages '+m('(-0.5,0.5,0.5,-0.5)')+'. Suppose a supplied comparison assigns the two successful repairs quality factors 0.2 and 1. Multiplying only their advantages by those factors leaves 0.1 and 0.5, reducing the total positive mass from one to 0.6 while the negative total remains −1.') +
    p('One way to preserve the original positive mass is to multiply the retained positive advantages by '+m('\\lambda=1/0.6=5/3')+'. They become one sixth and five sixths. Their ratio follows the supplied quality factors, their sum returns to one, and the failed attempts retain their original values.') +
    eq('\\lambda=\\frac{\\sum_{j\\in\\mathcal P}A_j}{\\sum_{j\\in\\mathcal P}f_j A_j},\\qquad A_i^{\\prime}=\\lambda f_i A_i\\quad(i\\in\\mathcal P).') +
    p('Here '+m('\\mathcal P')+' contains the passing attempts and '+m('f_i')+' is a positive quality factor. If the denominator is tiny, the rescaling can be large. MiMo describes capping this rescaling and then subtracting the resulting group mean. For a numerical illustration, choose a cap of 1.25; this cap is authored for the example.') +
    table(['Attempt', 'Original advantage', 'After quality and capped scale', 'After subtracting group mean'], quality.baseline.map((value, index) => [
      'ABCD'[index], value, n(quality.adjusted[index]), n(quality.centered[index]),
    ]), 'Chosen quality factors 0.2 and 1, with cap 1.25') +
    p('The capped values sum to −0.25, so their mean is −0.0625. Subtracting that mean produces '+m('(-0.4375,0.1875,0.6875,-0.4375)')+', whose sum is zero. The stronger successful repair now receives more of the positive signal, and recentering has affected every member of the group.') +
    source('Quality-based advantage redistribution', report) +
    p('The raw return, quality factor, cap, and recentering are distinct operations. Retaining only the final advantage would make it difficult to identify which operation changed the next update. We will keep the earlier coefficient 0.6 for the next example so that its path from the already understood ratio calculation remains visible.') +
    h('policy-to-weights', 'Carry the coefficient through an actual parameter update') +
    p('A coefficient multiplying a log probability is still one step away from changed weights. To expose that step, take a two-token output vocabulary and hold the incoming hidden row fixed at '+m('h=(1,2)')+'. Label edit as token zero and the other token one. Its output map has two rows, one per hidden feature, and two columns, one per possible token.') +
    p('Choose the first column’s initial weight on feature one to be '+m('\\log(0.12/0.88)\\approx-1.9924')+', with its feature-two weight zero. Set both weights in the other column to zero. Then '+m('z=hW')+' gives logits '+m('(-1.9924,0)')+', whose softmax is '+m('(0.12,0.88)')+'. Every starting number in the diagram now has a source.') +
    eq('W=\\begin{bmatrix}\\log(0.12/0.88)&0\\\\0&0\\end{bmatrix},\\qquad z=hW.') +
    p('For the selected first token, the derivative of its log probability with respect to logit '+m('z_j')+' is '+m('\\mathbf1[j=0]-p_j')+'. Multiplying by the fixed coefficient '+m('c=0.6')+' gives logit derivatives '+m('(0.528,-0.528)')+'. The derivative for the competing token is negative because increasing its logit would lower the selected token’s probability.') +
    p('Call the derivative row '+m('g_z')+'. Since '+m('z_j=\\sum_a h_aW_{aj}')+', the chain rule multiplies each logit derivative by its corresponding input feature. The weight gradient is the outer product') +
    eq('\\nabla_W J=h^{\\mathsf T}g_z=\\begin{bmatrix}1\\\\2\\end{bmatrix}\\begin{bmatrix}0.528&-0.528\\end{bmatrix}=\\begin{bmatrix}0.528&-0.528\\\\1.056&-1.056\\end{bmatrix}.') +
    study('gradient') +
    p('For gradient ascent on this isolated objective, choose '+m('\\eta=0.1')+' and set '+m('W^{\\prime}=W+\\eta\\nabla_WJ')+'. The new logits are approximately '+m('(-1.7284,-0.2640)')+'. Normalizing them gives selected-token probability '+m(n(update.probability))+', up from 0.12.') +
    p('The other token’s probability falls by the corresponding amount because the two probabilities must still sum to one. We held the hidden row fixed to isolate the output map. In a full model, the chain rule also sends a gradient through that hidden row into earlier layers, and other tokens and prompts contribute their own parameter gradients.') +
    p('The stopped coefficient matters when checking this derivative. A finite-difference check should hold 0.6 fixed while perturbing '+m('W')+'. Recomputing the ratio for each perturbation differentiates a different function, even if its displayed scalar value agrees at the starting weights.') +
    p('An optimizer then transforms the accumulated gradient using its state and schedule. Our single ascent step demonstrates the link from a recorded episode to a changed distribution. Its learning rate, restricted vocabulary, and fixed hidden row are explanatory choices. They do not predict the size of a production model’s behavioral change.'),

  'agent-experience':
    h('sampling-distribution', 'Specify the distribution that produced the saved probability') +
    p('A policy checkpoint produces logits. The rollout sampler may apply a temperature and restrict which tokens can be drawn. The log probability stored beside a sampled token needs a precise definition relative to those operations.') +
    p('Take a chosen vocabulary with model probabilities 0.4, 0.3, 0.2, and 0.1. A nucleus cutoff of 0.8 keeps the first three tokens because the first two sum to only 0.7. Renormalizing the retained mass of 0.9 gives sampling probabilities '+m('(4/9,1/3,2/9,0)')+'.') +
    p('The first token now has model probability 0.4 and sampling probability about 0.4444. Dividing the unchanged full-model probability by that sampling probability gives 0.9. Dividing two corresponding truncated probabilities gives one. Equal weights alone therefore do not identify which ratio a log-probability record represents.') +
    p('Importance reweighting also needs support. A token with zero sampling probability can never appear in those samples, even if a target distribution assigns it positive probability. Reweighting the observed tokens cannot create the missing events. An objective can use compatible restricted support, or collect data that covers the target events; the convention must be explicit.') +
    p('For an actual rollout record, save or reconstruct the sampler settings, candidate-set convention, and the probability used by the objective. MiMo discusses candidate-set replay as part of training–inference consistency. The purpose is to compare corresponding calculations instead of attributing every difference to an update.') +
    source('Sampling consistency in the reported system', report) +
    p('Tool-generated text enters later prefixes but was never sampled by the policy. The action mask keeps that provenance visible. A tokenizer or template transformation that changes earlier token boundaries can make the later prefix different even when the rendered conversation appears equivalent. Exact token records let us test the correspondence directly.'),

  'collecting-a-mixture':
    h('usable-groups', 'Count the work discarded by a binary group filter') +
    p('Our concurrency formula includes an accepted fraction '+m('r_i')+'. To understand how that fraction can change while a policy improves, return to the binary mean-only baseline. A group supplies variation only when it contains both a pass and a failure.') +
    p('Suppose each of '+m('G')+' attempts independently succeeds with probability '+m('p')+'. The group is all-pass with probability '+m('p^G')+' and all-fail with probability '+m('(1-p)^G')+'. Those events are disjoint, so the mixed-outcome probability is') +
    eq('r(p,G)=1-p^G-(1-p)^G.') +
    p('At '+m('p=0.9')+', a group of four is usable with probability '+m(n(f4.usable))+', while a group of sixteen is usable with probability '+m(n(f16.usable))+'. A larger group is more likely to contain variation, but it also costs more rollouts.') +
    study('filtering') +
    p('With independent repeated collection under fixed '+m('p')+', the number of generated groups until one usable group is geometric, with mean '+m('1/r')+'. Multiplying by group size gives expected rollout count '+m('G/r')+'. Our two group sizes require approximately '+m(n(f4.rolloutsPerAccepted))+' and '+m(n(f16.rolloutsPerAccepted))+' rollouts per accepted group respectively.') +
    p('An accepted group of sixteen also contains more attempts, so accepted groups alone are not equal learning units. The useful comparison records accepted prompts, selected action tokens, and the update’s normalization. The calculation isolates wasted collection under this usability rule.') +
    p('As success approaches one, binary outcomes become less variable and the filter can discard more groups. More accurate performance on easy tasks can therefore reduce the rate of this particular learning signal. A different task difficulty, richer grading, or a different usability rule changes the account.') +
    p('The independence assumption can fail when attempts share a misconception or deterministic harness behavior. In that case, the binomial expression must be replaced by the observed group-outcome distribution. The scheduler’s accepted fraction should be measured at the group boundary that actually supplies training.') +
    p('Combine this with '+m('c_i\\approx\\lambda_i t_i/r_i')+'. A source can need more concurrency because episodes became longer, because the policy’s outcomes became less variable, or because grading rejects more samples. Those causes suggest different interventions. A throughput graph without accepted-work counters cannot identify them.'),

  'learner-and-rollout':
    h('microbatch-load', 'A balanced full batch can still overflow a microbatch') +
    p('Suppose eight expert-parallel ranks receive eight microbatches in sequence. Each microbatch contains 32 equal-size activation items, all assigned to one different rank. Over the full batch, every rank receives 32 items and the aggregate distribution is perfectly balanced.') +
    p('Within any one microbatch, the busiest rank receives 32 items while the mean is four. Its peak-to-mean load is eight. If activation storage is allocated for a mean load of four, perfect aggregate balance does not prevent an overflow during the individual execution.') +
    table(['Quantity', 'Our authored eight-rank example'], [
      ['Full-batch items per rank', '32 for every rank'],
      ['Items per microbatch', '32 total'],
      ['Mean per-rank microbatch load', '4'],
      ['Peak per-rank microbatch load', '32'],
      ['Peak / mean', '8'],
    ], 'Packing changes local peaks even when full-batch counts agree') +
    p('The parameter update can still be the same mathematical batch if accumulation and normalization are correct. Memory demand depends on the intermediate partition. Changing sequence packing, expert-parallel width, or a per-rank activation allowance can affect whether that update is executable.') +
    p('This connects router stability to physical feasibility. Freezing routing parameters can reduce one source of drift, while sampled token composition can still produce uneven local loads. Replaying an expert choice aligns a computation but does not redistribute its activation storage. Each intervention needs the statistic it actually controls.') +
    h('rollout-age', 'Measure age at the point where the learner uses the episode') +
    p('The chosen version table above associates each sampled segment with its source weights. For a trainer at update '+m('u')+' and a segment generated at version '+m('v')+', one simple age is '+m('u-v')+'. Elapsed seconds supply a different age. A fast sequence can be several updates old, while a long tool call can be old in wall time but span few updates.') +
    p('An age threshold decides which collected work remains eligible. Dropping stale work consumes rollout resources without a gradient contribution. Accepting it changes how much the objective relies on recorded probabilities from older distributions. The probability-ratio histogram and mask rate help reveal that difference.') +
    p('The public launch script selects a drop policy with a configured off-policy threshold. That is a reproducible parameter to inspect along with collection speed and learner speed. It should be interpreted through the caller’s definition of age, rather than guessed from the field name alone.') +
    source('Pinned public age policy and rollout settings', released+'scripts/code/train.sh'),

  'reading-a-run':
    h('released-batch-path', 'Trace the released settings into the batch the trainer receives') +
    p('The public code script makes a concrete smaller experiment available. At the pinned revision below, it defaults to 64 training prompts and sixteen rollouts per prompt. That requests 1,024 trajectories before filtering and recovery decisions. The script also selects prompt-mean loss, disables standard-deviation normalization of GRPO advantages, and enables group filtering.') +
    table(['Setting in the pinned script', 'Default', 'Meaning to verify in the run'], [
      ['TRAIN_BATCH_SIZE / N', '64 / 16', 'Prompt selection and candidate trajectories'],
      ['TRAIN_NNODES / TRAIN_NGPUS_PER_NODE', '8 / 8', '64 training GPUs in the supplied layout'],
      ['ROLLOUT_NNODES', '0', 'Colocate rollout on the training allocation'],
      ['ACTOR_TP / ROLLOUT_TP', '8 / 2', 'Different tensor-parallel layouts for learning and generation'],
      ['MAXLEN / PROMPT_LENGTH', '262144 / 16384', 'Length limits entering the launch path'],
      ['MICRO_BSZ_PER_GPU', '1', 'A microbatch control, with dynamic batching also enabled'],
      ['MAX_OFF_POLICY_THRESHOLD / strategy', '2 / drop', 'Eligibility policy for older work'],
    ], 'Public code defaults checked at commit '+revision.slice(0,12)+'; overrides change the experiment') +
    source('Pinned code launch script', released+'scripts/code/train.sh') +
    p('The launch path computes a response allowance from the total length minus the prompt allowance when no explicit override is supplied. With these defaults that is 245,760 tokens. A separate per-turn cap defaults to 32,768. A trajectory can contain several model turns, so those two limits govern different objects.') +
    p('The script passes training-batch, optimizer-minibatch, microbatch, and length settings into the framework. Those units should be followed through the worker’s normalization and packing code. Multiplying the number printed as “batch” by the GPU count without checking those callers can double-count a global setting.') +
    source('Pinned launch arguments and optimizer configuration', released+'recipes/code/run_train.sh') +
    p('There is also a practical difference between task capacity and inference capacity. A live session can own a task pod while waiting on a tool. The environment example explains that its session ceiling is constrained by cluster quota. It is not determined solely by the GPU KV budget. A GPU-free tool wait can still hold an environment slot.') +
    source('Pinned environment and topology notes', released+'scripts/code/env.example') +
    p('A useful first reproduction follows one selected batch. Save prompt IDs and harness assignments, record which groups survive filtering, inspect action-token counts, verify prompt weights before microbatch splitting, and compare a few recomputed log probabilities with the rollout record. Then save the resulting parameter update and evaluation output.') +
    p('This gives each measurement a place in the process. A mismatch before the update is a data or numerical-consistency issue. A mismatch after the update can involve reduction, optimizer state, or execution. A behavioral change with matching updates belongs to the evaluation conditions or sampling. The raw records let another reader investigate the same boundary.'),
};
