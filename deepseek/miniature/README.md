# A miniature V4 / V4.1 text backbone

This package connects the blog's text-backbone constructions into a runnable
PyTorch calculation:

```
integer token IDs
  → embedding
  → four residual streams
  → six attention + MoE blocks
  → final stream reduction
  → RMS normalization
  → vocabulary logits at every position
  → greedy autoregressive generation
```

The parameters are random. The output tokens have no learned linguistic meaning.
This is a self-authored reduced reference, not a model-weight conversion or a
complete DeepSeek checkpoint reproduction. The complete public architecture
includes additional paths listed below. No upstream implementation is imported
or executed, and no model weights are required.

## Run

The recorded environment is Python 3.13.13 and PyTorch 2.12.0+cpu. Use an existing
CPU PyTorch environment. The package needs no GPU, training job, downloaded
checkpoint, or other dependency.

From this directory:

```
python -m unittest -v test_model.py
python run.py
python run.py --verify
```

`run.py` runs the tests and writes `results.json`. `--verify` repeats both the
tests and numerical calculations and compares the full result with the saved
record. Version or implementation changes can change this comparison. The JSON
records source revisions, implementation hashes, seeds, dimensions, shapes,
selected global addresses, ownership, actual floating-point values, causality
errors, and a finite-gradient check. It contains no throughput or VRAM benchmark.

## Use

```python
import torch
from model import Config, Miniature

torch.manual_seed(20261016)
torch.set_num_threads(1)
model = Miniature(Config()).double().eval()
tokens = torch.tensor([[1, 3, 5, 7]], dtype=torch.long)
logits, trace = model(tokens, return_trace=True)
assert logits.shape == (1, 4, 32)
generated = model.generate(tokens, count=3)

v41 = Miniature(Config.v41()).double().eval()
v41_logits, v41_trace = v41(tokens, return_trace=True)
model.save("miniature.pt")
restored = Miniature.load("miniature.pt")
```

`step(new_tokens, history)` is a **full-prefix recomputation reference**. Its
state contains integer token IDs. It concatenates the new IDs and calls the full
model again. It does not implement a KV-cache decode engine, compression-tail
buffers, ring-buffer updates, bounded replay, or an inference speedup. The
prefix and chunk checks establish consistency of the causal calculation; they
do not establish correctness of a separate cached-decode implementation.

## Follow the calculation

`Miniature.forward` expands embeddings to four residual streams and applies
`Block.forward`. The latter shows the difference between ordinary V4 mHC and
V4.1 Single-Pass coefficient timing directly. V4 predicts and uses its current
pre coefficients. V4.1 attention uses the preceding FFN's pre coefficients;
the current attention's pre coefficients feed the current FFN. The initial
V4.1 coefficients select stream zero. V4's final head predicts a learned stream
reduction; V4.1 uses the last carried coefficients.

`Mix.forward` predicts pre, post, and transport coefficients from the flattened
stream's RMS-normalized coordinates. Pre and post are sigmoid transforms;
only the transport matrix receives Sinkhorn normalization. `transport` uses
**source rows and destination columns**: output stream j sums
`combination[i,j] * input_stream[i]`. The nonsymmetric three-stream test catches
the transpose mistake that a two-stream doubly stochastic example cannot catch.

`Attention.forward` constructs a learned normalized low-rank query latent,
expands it to query heads, projects one local vector used as both K and V,
and rotates their tails. V4 has an additional unweighted per-head query RMS;
the pinned V4.1 implementation does not. Test 19 checks this distinction.

Completed compressed entries are rotated at their block's starting position.
Their availability uses the block's completion position. `Compressor.forward`
normalizes gates separately for each coordinate. In the V4 small-ratio branch,
an entry combines the previous block's first projection half with the current
block's second half. Missing preceding support has negative-infinite gates.
The larger-ratio V4 branch has no overlap and attends to all completed entries.

The sparse indexer sums signed learned head weights times rectified dot
products. It performs no softmax. Top-K addresses select global entries; the
main query then compares the selected entries again. `attention_with_sink`
combines local and global entries in one softmax with a learned zero-value sink.
An independent scalar oracle checks both the denominator and value sum.
Inverse RoPE at the query position precedes the independent group output maps
and final output projection.

`MoE.forward` uses square-root softplus affinities, selection-only bias,
normalized selected affinities times 1.5, and an always-executed shared expert.
The routed experts evaluate only their selected token rows. Gate activations
are clipped above 10, and the up branch is clipped to [-10,10], before SwiGLU.
The first V4 didactic layer uses an explicit cyclic token-to-expert table in
place of the checkpoint's learned/provided token lookup table.

The V4.1 six-layer schedule has the following source graph. Every layer retains
its own local representation; sharing a global tensor or selected addresses
does not share the main query, local KV, or attention output.

| Layer | Mode | Ratio | Global owner | Selection owner |
|---|---|---:|---:|---:|
| 0 | Local | 0 | — | — |
| 1 | Full | 2 | 1 | 1 |
| 2 | Reuse | 2 | 1 | 1 |
| 3 | Full, decoder entry | 1 | 3 | 3 |
| 4 | Reindex | 1 | 3 | 4 |
| 5 | Reuse | 1 | 3 | 4 |

At decoder entry, the Full layer creates global state from its own normalized
attention input. Later decoder layers borrow that exact global tensor. This
follows the **minimal released implementation's all-layer traversal**. It is
not a separate implementation of the report's encoder-output prefill shortcut:
all six layers process every supplied token. The encoder/decoder boundary is
explicit in the schedule, but no encoder-only prefill or replay claim follows.
Candidate selection groups addresses into blocks, retains the newest reachable
block, then restricts later reindexers to that candidate set. As in the minimal
reference, scoring happens before the mask; this is selection semantics rather
than a gather-before-score cost optimization.

## Exact scope and substitutions

The following differences are part of the implementation, rather than
experimental findings about the trained models.

| Area | This package | Released architecture / omitted operation |
|---|---|---|
| Weights | Random PyTorch initializations | No pretrained weights, tokenizer, learned hash table, or checkpoint conversion |
| Model size | 6 layers, width 16, 4 main heads of width 8, query rank 8, 4 routed experts with 2 active, expert width 24, vocabulary 32 | V4 Flash/Pro and V4.1 have their released much larger dimensions and layer counts |
| Streams | Four throughout | Preserves stream count, not trained coefficient distributions |
| V4 schedule | Ratios `(0,2,4,2,4,2)`; ratio 2 is sparse/overlapping and ratio 4 dense/nonoverlapping | Flash uses two initial local layers, CSA ratio 4 and HCA ratio 128; Pro has a different initial schedule |
| V4.1 schedule | The six-layer table above, three encoder and three decoder layers | Released 20+20 layers, Full owners 2/8/14/20 and index sources 2/8/14/20/24/28/32/36 |
| Sparse budgets | Top-2, 2 index heads of width 8, candidate blocks of 2 and at most 2 retained blocks | Released Top-512/1024, index dimensions and candidate budgets are larger |
| Local window | Four positions including the query | Released window 128 |
| Output map | Two independent groups, group rank 4 | Released group count/rank differs; group-independence and final mixing are preserved |
| Rotary positions | Ordinary adjacent-pair RoPE, tail width 4, theta 10000 everywhere | No YaRN scaling, training-length correction, separate compressed theta 160000, or long-context frequency schedule |
| Precision | Float64 for records, float32 smoke checks | No BF16/FP8/FP4 simulation, activation quantization, packed representations, scale metadata, or Hadamard quantization transforms |
| Normalization | Epsilon 1e-6; Sinkhorn 30 positive sum-normalization iterations | V4.1 released norm epsilon is 1e-20; transport's fused kernel epsilon/iteration arithmetic is not reproduced bitwise |
| Router | Scale 1.5, ordinary square-root softplus; cyclic fixed token IDs for first V4 layer | No Pro scale 2.5, released first-three-layer tid2eid contents, multimodal bias, or training-time bias updates |
| Serving state | Full local tensors and fresh per-forward global-owner dictionary | No persistent ring, partial-block states, cache eviction, prefix storage/replay, SSD/host transfers, or multi-request scheduling |
| CED | Unoptimized Full/Reindex/Reuse graph with explicit decoder entry | No optimized encoder-only prefill, final-encoder projection serving path, or bounded reconstruction |
| Conditional memory | Not in the miniature | V4.1 Engram hash/remapping tables, n-gram boundaries, per-stream retrieval gates and memory transfer remain in the blog explanation |
| Vision | Text-only inputs | No image preprocessing, ViT, 2D RoPE, 3×3 spatial rearrangement, projector, image merge, or image routing bias |
| Auxiliary prediction | Ordinary vocabulary head and greedy generation only | No V4 MTP training block, V4.1 DSpark heavy draft stages/Markov/confidence heads, speculative acceptance/verifier, or scheduler |
| Training | A next-token loss is differentiated as a correctness check | No optimization step, Muon, balancing optimizer, pretraining curriculum, alignment/RL, distillation, or trained language-quality result |
| Execution | Dense PyTorch tensors and explicit batch/token loops on one CPU thread | No custom sparse/fused kernels, tensor/expert/pipeline parallelism, distributed dispatch, production layout, or performance equivalence |

Discrete Top-K membership is not differentiated. Gradients through the selected
values, router weights, projections, expert computations, and stream mixes are
checked for finiteness. This says that the composed graph can backpropagate;
it does not establish that random routing has learned specialization.

## Tests and interpretation

The suite checks an independent scalar attention oracle, sink mass, RoPE
inverse and relative positions, known channel-pooling cases, missing previous
overlap support, nonsymmetric transport orientation, fixed Sinkhorn matrix
norm and sums, selection-only bias, future perturbations, every full-prefix
endpoint, arbitrary chunk boundaries in the recomputation API, batch/request
isolation, finite gradients, serialization, invalid configurations, V4.1
ownership and Single-Pass timing, float32 generation, and the V4/V4.1 query
normalization difference.

Floating-point differences near 1e-15 in float64 reflect different matrix
shapes/order of summation between whole-sequence and prefix calls. The tests
use explicit tolerances. The fixed transport matrix's norm bound does not
bound the Jacobian of the complete input-dependent mHC sublayer.

## Provenance

`sources.json` copies immutable source metadata from the blog's source lock:

- V4 Flash: revision `60d8d70770c6776ff598c94bb586a859a38244f1`,
  [minimal inference model](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash/blob/60d8d70770c6776ff598c94bb586a859a38244f1/inference/model.py).
- V4.1 Flash: revision `314113f8a7dadb388215396ba5fbee2c610a04d6`,
  [minimal inference model](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash/blob/314113f8a7dadb388215396ba5fbee2c610a04d6/inference/model.py).

These files were read as reference material. The local audit memos supplied
additional report/kernel distinctions. This code is independently authored
for explanation, and tests of it are not tests of the released checkpoint.
