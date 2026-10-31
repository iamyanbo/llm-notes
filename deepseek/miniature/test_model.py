"""CPU correctness checks, not language-quality or performance benchmarks."""
import math
from dataclasses import replace
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import torch
from torch import nn
from torch.nn import functional as F
from model import (Config, Miniature, Compressor, Block, Attention, attention_with_sink,
                   collapse, rms, rope, route, sinkhorn, transport)

torch.set_num_threads(1)


class ReferenceTests(unittest.TestCase):
    def setUp(self):
        torch.manual_seed(20261016)

    def models(self):
        for cfg in (Config(), Config.v41()):
            yield Miniature(cfg).double().eval()

    def test_01_attention_scalar_oracle(self):
        q = torch.tensor([[1., 2.], [-1., 0.5]], dtype=torch.float64)
        entries = torch.tensor([[3., 1.], [-2., 4.], [0.5, -0.5]], dtype=torch.float64)
        sink = torch.tensor([0.3, -0.2], dtype=torch.float64)
        expected = []
        for h in range(2):
            masses = [math.exp(sum(float(q[h, d] * entry[d]) for d in range(2)) / math.sqrt(2)) for entry in entries]
            denominator = sum(masses) + math.exp(float(sink[h]))
            expected.append([sum(masses[j] * float(entries[j, d]) for j in range(3)) / denominator for d in range(2)])
        torch.testing.assert_close(attention_with_sink(q, entries, sink), torch.tensor(expected, dtype=q.dtype))

    def test_02_sink_zero_logits_has_real_denominator_mass(self):
        query = torch.zeros(1, 2, dtype=torch.float64)
        entries = torch.tensor([[2., 4.], [4., 8.]], dtype=torch.float64)
        output = attention_with_sink(query, entries, torch.zeros(1, dtype=query.dtype))
        torch.testing.assert_close(output, entries.sum(0, keepdim=True) / 3)

    def test_03_rope_inverse_and_relative_position(self):
        x = torch.randn(1, 3, 2, 8, dtype=torch.float64)
        pos = torch.tensor([0, 3, 7])
        torch.testing.assert_close(rope(rope(x, pos, 4), pos, 4, inverse=True), x)
        torch.testing.assert_close(rope(x, pos, 4)[..., :4], x[..., :4])
        a = torch.randn(1, 1, 8, dtype=torch.float64)
        b = torch.randn(1, 1, 8, dtype=torch.float64)
        left = (rope(a, torch.tensor([5]), 4) * rope(b, torch.tensor([2]), 4)).sum()
        right = (a * rope(b, torch.tensor([-3]), 4)).sum()
        torch.testing.assert_close(left, right)

    def test_04_channel_pool_known_case_and_incomplete_tail(self):
        cfg = replace(Config(), dim=2)
        pool = Compressor(cfg, 2, 2).double()
        with torch.no_grad():
            pool.values.weight.copy_(torch.eye(2))
            pool.gates.weight.zero_()
        x = torch.tensor([[[1., 3.], [3., 5.], [100., 100.]]], dtype=torch.float64)
        expected = rms(torch.tensor([[[2., 4.]]], dtype=x.dtype), cfg.eps)
        torch.testing.assert_close(pool(x), expected)
        self.assertEqual(pool(x[:, :1]).shape, (1, 0, 2))

    def test_05_overlap_uses_previous_first_current_second_channels(self):
        cfg = replace(Config(), dim=2)
        pool = Compressor(cfg, 2, 2, overlap=True).double()
        with torch.no_grad():
            pool.values.weight.copy_(torch.cat((torch.eye(2), 2 * torch.eye(2))))
            pool.gates.weight.zero_()
        x = torch.tensor([[[1., 2.], [3., 4.], [5., 6.], [7., 8.]]], dtype=torch.float64)
        first = 2 * x[:, :2].mean(1)
        second = (x[:, :2].sum(1) + 2 * x[:, 2:4].sum(1)) / 4
        torch.testing.assert_close(pool(x), rms(torch.stack((first, second), 1), cfg.eps))

    def test_06_transport_orientation_nonsymmetric_three_stream_case(self):
        combination = torch.tensor([[0., 1., 0.], [0., 0., 1.], [1., 0., 0.]], dtype=torch.float64)
        streams = torch.tensor([[1., 2.], [3., 4.], [5., 6.]], dtype=torch.float64)
        torch.testing.assert_close(transport(streams, combination), streams[[2, 0, 1]])
        self.assertFalse(torch.equal(transport(streams, combination), combination @ streams))

    def test_07_sinkhorn_sums_and_fixed_matrix_norm(self):
        matrix = sinkhorn(torch.randn(3, 3, dtype=torch.float64), 80)
        torch.testing.assert_close(matrix.sum(0), torch.ones(3, dtype=matrix.dtype), atol=1e-12, rtol=0)
        torch.testing.assert_close(matrix.sum(1), torch.ones(3, dtype=matrix.dtype), atol=1e-12, rtol=0)
        self.assertLessEqual(float(torch.linalg.matrix_norm(matrix, ord=2)), 1 + 1e-12)

    def test_08_bias_changes_selection_not_original_affinity_weights(self):
        affinity = torch.tensor([[1., 2., 4.]], dtype=torch.float64)
        ids, weights = route(affinity, torch.tensor([10., 0., 0.]), 2, 1.5)
        self.assertEqual(ids.tolist(), [[0, 2]])
        torch.testing.assert_close(weights, torch.tensor([[0.3, 1.2]], dtype=affinity.dtype))

    def test_09_future_tokens_do_not_change_earlier_logits(self):
        ids = torch.tensor([[1, 2, 3, 4, 5, 6, 7, 8]])
        changed = ids.clone()
        changed[:, 4:] = torch.tensor([18, 19, 20, 21])
        for model in self.models():
            torch.testing.assert_close(model(ids)[:, :4], model(changed)[:, :4], atol=1e-12, rtol=1e-12)

    def test_10_every_prefix_matches_full_causal_forward(self):
        ids = torch.tensor([[1, 3, 5, 7, 9, 11, 13, 15]])
        for model in self.models():
            full = model(ids)
            for end in range(1, ids.shape[1] + 1):
                torch.testing.assert_close(model(ids[:, :end])[:, -1], full[:, end-1], atol=2e-12, rtol=2e-12)

    def test_11_chunk_api_recomputes_prefix_with_identical_results(self):
        ids = torch.tensor([[1, 2, 3, 4, 5, 6, 7, 8]])
        for model in self.models():
            history, outputs = None, []
            begin = 0
            for end in (1, 4, 6, 8):
                out, history = model.step(ids[:, begin:end], history)
                outputs.append(out)
                begin = end
            torch.testing.assert_close(torch.cat(outputs, 1), model(ids), atol=2e-12, rtol=2e-12)
            self.assertTrue(torch.equal(history, ids))

    def test_12_batch_isolation_and_no_request_state_leak(self):
        ids = torch.tensor([[1, 2, 3, 4], [9, 8, 7, 6]])
        for model in self.models():
            full = model(ids)
            separate = torch.cat([model(row[None]) for row in ids], 0)
            torch.testing.assert_close(full, separate, atol=2e-12, rtol=2e-12)
            model(torch.tensor([[17, 18]]))
            torch.testing.assert_close(full, model(ids))

    def test_13_backpropagation_is_finite_through_composed_graph(self):
        ids = torch.tensor([[1, 2, 3, 4, 5, 6, 7, 8]])
        for model in self.models():
            output = model(ids)
            loss = F.cross_entropy(output[:, :-1].flatten(0, 1), ids[:, 1:].flatten())
            loss.backward()
            gradients = [p.grad for p in model.parameters() if p.grad is not None]
            self.assertTrue(gradients and all(torch.isfinite(g).all() for g in gradients))
            self.assertGreater(float(model.embedding.weight.grad.abs().sum()), 0)
            self.assertGreater(float(model.blocks[1].attention.q_a.weight.grad.abs().sum()), 0)
            self.assertGreater(float(model.blocks[1].attention.compressor.values.weight.grad.abs().sum()), 0)
            self.assertGreater(float(model.blocks[1].moe.shared.down.weight.grad.abs().sum()), 0)

    def test_14_serialization_preserves_config_dtype_and_logits(self):
        for model in self.models():
            with tempfile.TemporaryDirectory() as directory:
                path = Path(directory) / "miniature.pt"
                model.save(path)
                loaded = Miniature.load(path)
                self.assertEqual(model.cfg, loaded.cfg)
                ids = torch.tensor([[1, 2, 3, 4]])
                torch.testing.assert_close(model(ids), loaded(ids), atol=0, rtol=0)

    def test_15_config_rejects_incompatible_graphs(self):
        invalid = ({"heads": 3}, {"active": 9}, {"rotary": 3}, {"window": 0},
                   {"ratios": (2,), "modes": ("reuse",)},
                   {"family": "v41"}, {"hash_layers": 9})
        for kwargs in invalid:
            with self.assertRaises(ValueError):
                Config(**kwargs)

    def test_16_v41_ownership_and_reindex_selection_provenance(self):
        model = Miniature(Config.v41()).double()
        _, trace = model(torch.tensor([[1, 2, 3, 4, 5, 6, 7, 8]]), return_trace=True)
        self.assertEqual([row["global_source"] for row in trace["layers"]], [None, 1, 1, 3, 3, 3])
        self.assertEqual([row["selection_source"] for row in trace["layers"]], [None, 1, 1, 3, 4, 4])
        self.assertEqual(trace["local_owners"], 6)
        for row in trace["layers"]:
            self.assertEqual(row["local_shape"], [1, 8, 8])

    def test_17_single_pass_uses_carried_pre_then_current_attention_pre(self):
        cfg = Config.v41()
        block = Block(cfg, 0).double()
        class FixedMix(nn.Module):
            def __init__(self, pre):
                super().__init__()
                self.pre = pre
            def forward(self, x):
                shape = x.shape[:-1]
                return (self.pre.expand(shape), x.new_zeros(shape),
                        torch.eye(cfg.streams, dtype=x.dtype).expand(*shape[:-1], cfg.streams, cfg.streams))
        class Capture(nn.Module):
            def forward(self, x, *args):
                self.seen = x.detach().clone()
                return torch.zeros_like(x)
        attn_pre = torch.tensor([0., 1., 0., 0.], dtype=torch.float64)
        block.attn_mix = FixedMix(attn_pre)
        block.moe_mix = FixedMix(torch.tensor([0., 0., 0., 1.], dtype=torch.float64))
        block.attention, block.moe = Capture(), Capture()
        x = torch.randn(1, 2, 4, cfg.dim, dtype=torch.float64)
        carried = x.new_tensor([0., 0., 1., 0.]).expand(1, 2, 4)
        result, next_pre = block(x, torch.tensor([[1, 2]]), {}, carried)
        torch.testing.assert_close(block.attention.seen, rms(x[:, :, 2], cfg.eps))
        torch.testing.assert_close(block.moe.seen, rms(x[:, :, 1], cfg.eps))
        torch.testing.assert_close(result, x)
        torch.testing.assert_close(next_pre, x.new_tensor([0., 0., 0., 1.]).expand(1, 2, 4))

    def test_18_float32_forward_and_greedy_generation(self):
        for cfg in (Config(), Config.v41()):
            model = Miniature(cfg).eval()
            ids = torch.tensor([[1, 2, 3, 4]])
            logits = model(ids)
            self.assertEqual(logits.dtype, torch.float32)
            self.assertTrue(torch.isfinite(logits).all())
            generated = model.generate(ids, 3)
            self.assertEqual(generated.shape, (1, 7))
            self.assertTrue(torch.equal(generated[:, :4], ids))
            self.assertTrue(torch.equal(generated[:, 4], logits[:, -1].argmax(-1)))

    def test_19_v4_main_head_norm_is_absent_in_v41(self):
        for cfg in (Config(), Config.v41()):
            attention = Attention(cfg, 0).double()
            x = torch.randn(1, 2, cfg.dim, dtype=torch.float64)
            raw = attention.q_b(attention.q_norm(attention.q_a(x))).unflatten(-1, (cfg.heads, cfg.head_dim))
            expected = rms(raw, cfg.eps) if cfg.family == "v4" else raw
            expected = rope(expected, torch.arange(2), cfg.rotary)
            recorded = []
            def capture(query, entries, sink):
                recorded.append(query.detach().clone())
                return attention_with_sink(query, entries, sink)
            with patch("model.attention_with_sink", side_effect=capture):
                attention(x, {"global": None, "locals": [], "trace": []})
            torch.testing.assert_close(torch.stack(recorded), expected[0])
            if cfg.family == "v41":
                self.assertGreater(float((raw.square().mean(-1) - 1).abs().max().detach()), 0.1)


if __name__ == "__main__":
    unittest.main(verbosity=2)
