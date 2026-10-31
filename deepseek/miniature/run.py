"""Reproduce the untrained CPU trace and run the correctness suite."""
import argparse
from dataclasses import asdict
import hashlib
import io
import json
from pathlib import Path
import platform
import unittest
import torch
from torch.nn import functional as F
from model import Config, Miniature
from test_model import ReferenceTests

HERE = Path(__file__).resolve().parent
SEED = 20261016


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def record_model(cfg):
    torch.manual_seed(SEED)
    model = Miniature(cfg).double().eval()
    ids = torch.tensor([[1, 3, 5, 7, 9, 11, 13, 15]])
    logits, trace = model(ids, return_trace=True)
    changed = ids.clone()
    changed[:, 4:] = torch.tensor([18, 19, 20, 21])
    with torch.no_grad():
        future_error = (logits[:, :4] - model(changed)[:, :4]).abs().max().item()
        prefix_error = max((model(ids[:, :end])[:, -1] - logits[:, end-1]).abs().max().item()
                           for end in range(1, ids.shape[1] + 1))
        history, chunks, begin = None, [], 0
        for end in (1, 4, 6, 8):
            output, history = model.step(ids[:, begin:end], history)
            chunks.append(output)
            begin = end
        recompute_error = (torch.cat(chunks, 1) - logits).abs().max().item()
        generated = model.generate(ids[:, :4], 4).tolist()
    loss = F.cross_entropy(logits[:, :-1].flatten(0, 1), ids[:, 1:].flatten())
    loss.backward()
    gradients = [p.grad for p in model.parameters() if p.grad is not None]
    return {"config": asdict(cfg), "parameter_count": sum(p.numel() for p in model.parameters()),
            "dtype": "float64", "input_ids": ids.tolist(), "trace": trace,
            "last_logits": logits[0, -1].detach().tolist(), "greedy_ids": generated,
            "checks": {"future_perturbation_max_abs": future_error,
                       "every_prefix_max_abs": prefix_error,
                       "chunked_prefix_recomputation_max_abs": recompute_error,
                       "next_token_cross_entropy_random_weights": loss.item(),
                       "embedding_gradient_l2": model.embedding.weight.grad.norm().item(),
                       "all_present_gradients_finite": all(torch.isfinite(g).all().item() for g in gradients),
                       "parameters_with_gradients": len(gradients)},
            "generation_method": "greedy argmax, full-prefix recomputation each step"}


def run():
    torch.set_num_threads(1)
    torch.use_deterministic_algorithms(True)
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(ReferenceTests)
    stream = io.StringIO()
    tests = unittest.TextTestRunner(stream=stream, verbosity=0).run(suite)
    if not tests.wasSuccessful():
        raise RuntimeError(stream.getvalue())
    return {"schema": 1, "seed": SEED, "threads": torch.get_num_threads(), "device": "cpu",
            "python": platform.python_version(), "pytorch": torch.__version__,
            "purpose": "Executable text-backbone derivation with random weights. No trained quality, latency, or VRAM claim.",
            "tests": {"run": tests.testsRun, "passed": tests.testsRun-len(tests.errors)-len(tests.failures),
                      "errors": len(tests.errors), "failures": len(tests.failures)},
            "implementation_sha256": {name: sha256(HERE / name) for name in ("model.py", "test_model.py", "run.py")},
            "reference_sources": json.loads((HERE / "sources.json").read_text(encoding="utf-8-sig")),
            "models": {"v4": record_model(Config()), "v41": record_model(Config.v41())}}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify", action="store_true", help="compare against the saved deterministic JSON without overwriting it")
    args = parser.parse_args()
    result = run()
    encoded = json.dumps(result, indent=2, ensure_ascii=False) + "\n"
    destination = HERE / "results.json"
    if args.verify:
        # JSON represents tuple-valued schedules as arrays; compare canonical JSON values.
        if json.loads(destination.read_text(encoding="utf-8")) != json.loads(encoded):
            raise SystemExit("Saved result differs: compare environments, implementation hashes, and numeric traces.")
        print("Verified saved trace and all", result["tests"]["run"], "tests.")
    else:
        destination.write_text(encoded, encoding="utf-8")
        print("Wrote", destination.name, "after", result["tests"]["passed"], "passing tests.")
    for family, model in result["models"].items():
        checks = model["checks"]
        print(f"{family}: {model['parameter_count']} parameters; future error {checks['future_perturbation_max_abs']:.3g}; prefix error {checks['every_prefix_max_abs']:.3g}")
