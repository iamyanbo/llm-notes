"""Small, self-authored dense reference for the V4 / V4.1 text-backbone graph.

Read README.md before interpreting a result. Random weights, reduced dimensions,
and prefix recomputation make this an executable derivation, not a checkpoint
reproduction or a fast inference engine. No upstream Python is imported.
"""
from dataclasses import asdict, dataclass
import math
import torch
from torch import nn
from torch.nn import functional as F


@dataclass(frozen=True)
class Config:
    family: str = "v4"
    vocab: int = 32
    dim: int = 16
    heads: int = 4
    head_dim: int = 8
    rotary: int = 4
    q_rank: int = 8
    groups: int = 2
    o_rank: int = 4
    experts: int = 4
    active: int = 2
    expert_width: int = 24
    streams: int = 4
    window: int = 4
    global_topk: int = 2
    index_heads: int = 2
    index_dim: int = 8
    sinkhorn_steps: int = 30
    eps: float = 1e-6
    route_scale: float = 1.5
    # A six-layer didactic schedule, not either released layer schedule.
    ratios: tuple = (0, 2, 4, 2, 4, 2)
    modes: tuple = ("local", "full", "full", "full", "full", "full")
    encoder_layers: int = 3
    hash_layers: int = 1
    candidate_block: int = 2
    candidate_blocks: int = 2

    def __post_init__(self):
        if self.family not in ("v4", "v41"):
            raise ValueError("family must be v4 or v41")
        positive = (self.vocab, self.dim, self.heads, self.head_dim, self.q_rank,
                    self.groups, self.o_rank, self.experts, self.active,
                    self.expert_width, self.streams, self.window,
                    self.global_topk, self.index_heads, self.index_dim,
                    self.sinkhorn_steps, self.candidate_block, self.candidate_blocks)
        if any(not isinstance(n, int) or n <= 0 for n in positive):
            raise ValueError("dimensions and counts must be positive integers")
        if self.heads % self.groups or self.active > self.experts:
            raise ValueError("groups must divide heads; active cannot exceed experts")
        if self.rotary <= 0 or self.rotary % 2 or self.rotary > min(self.head_dim, self.index_dim):
            raise ValueError("rotary width must be positive, even, and fit both head widths")
        if self.eps <= 0 or not math.isfinite(self.eps) or self.route_scale <= 0:
            raise ValueError("eps and route scale must be positive")
        if len(self.ratios) != len(self.modes) or not self.ratios:
            raise ValueError("each layer needs one ratio and mode")
        owner = False
        for ratio, mode in zip(self.ratios, self.modes):
            if not isinstance(ratio, int) or ratio < 0:
                raise ValueError("compression ratios are nonnegative integers")
            if mode not in ("local", "full", "reindex", "reuse"):
                raise ValueError("unknown attention mode")
            if (mode == "local") != (ratio == 0):
                raise ValueError("local layers have ratio zero, other layers a positive ratio")
            if mode in ("reindex", "reuse") and not owner:
                raise ValueError("reuse needs an earlier Full source")
            owner = owner or mode == "full"
        if self.family == "v4" and any(m in ("reuse", "reindex") for m in self.modes):
            raise ValueError("cross-layer reuse belongs to the v41 variant")
        if not 0 <= self.hash_layers <= len(self.ratios):
            raise ValueError("invalid hash-layer count")
        if self.family == "v41":
            if not 0 < self.encoder_layers < len(self.ratios):
                raise ValueError("v41 needs encoder and decoder layers")
            if self.modes[self.encoder_layers] != "full" or self.ratios[self.encoder_layers] != 1:
                raise ValueError("decoder entry must own a ratio-one global source")
            if any(m == "full" for m in self.modes[self.encoder_layers + 1:]):
                raise ValueError("this v41 graph has one decoder global owner")
            for i, mode in enumerate(self.modes):
                if mode in ("reuse", "reindex"):
                    source = max(j for j in range(i) if self.modes[j] == "full")
                    if self.ratios[i] != self.ratios[source]:
                        raise ValueError("reuse ratio must equal its owner's ratio")

    @classmethod
    def v41(cls):
        return cls(family="v41", ratios=(0, 2, 2, 1, 1, 1),
                   modes=("local", "full", "reuse", "full", "reindex", "reuse"),
                   hash_layers=0)


def rms(x, eps=1e-6):
    return x * torch.rsqrt(x.square().mean(-1, keepdim=True) + eps)


class RMSNorm(nn.Module):
    def __init__(self, width, eps):
        super().__init__()
        self.weight = nn.Parameter(torch.ones(width))
        self.eps = eps

    def forward(self, x):
        return rms(x, self.eps) * self.weight


def rope(x, positions, width, inverse=False, theta=10000.0):
    """Rotate the tail; token axis is one, with optional head axes after it."""
    frequencies = theta ** (-torch.arange(0, width, 2, device=x.device, dtype=x.dtype) / width)
    angle = positions.to(x.dtype)[:, None] * frequencies[None, :]
    angle = angle.reshape(1, len(positions), *([1] * (x.ndim - 3)), width // 2)
    if inverse:
        angle = -angle
    pairs = x[..., -width:].reshape(*x.shape[:-1], width // 2, 2)
    a, b = pairs.unbind(-1)
    rotated = torch.stack((a * angle.cos() - b * angle.sin(),
                           a * angle.sin() + b * angle.cos()), -1).flatten(-2)
    return torch.cat((x[..., :-width], rotated), -1)


def sinkhorn(logits, steps=30):
    """Rows index source streams, columns index destination streams."""
    matrix = logits.softmax(-1)
    for _ in range(steps):
        matrix = matrix / matrix.sum(-2, keepdim=True)
        matrix = matrix / matrix.sum(-1, keepdim=True)
    return matrix


def transport(streams, combination):
    # y_j = sum_i combination[i,j] * streams_i. Never silently use C @ X.
    return torch.einsum("...ij,...id->...jd", combination, streams)


class Mix(nn.Module):
    def __init__(self, cfg):
        super().__init__()
        self.n, self.eps, self.steps = cfg.streams, cfg.eps, cfg.sinkhorn_steps
        self.project = nn.Linear(cfg.streams * cfg.dim, cfg.streams * (2 + cfg.streams), bias=False)
        self.scale = nn.Parameter(torch.full((3,), 0.1))
        self.base = nn.Parameter(torch.zeros(cfg.streams * (2 + cfg.streams)))

    def forward(self, x):
        n = self.n
        raw = self.project(rms(x.flatten(-2), self.eps))
        pre = torch.sigmoid(raw[..., :n] * self.scale[0] + self.base[:n]) + self.eps
        post = 2 * torch.sigmoid(raw[..., n:2*n] * self.scale[1] + self.base[n:2*n])
        logits = raw[..., 2*n:] * self.scale[2] + self.base[2*n:]
        return pre, post, sinkhorn(logits.unflatten(-1, (n, n)), self.steps)


def collapse(x, pre):
    return (x * pre.unsqueeze(-1)).sum(-2)


class Compressor(nn.Module):
    def __init__(self, cfg, ratio, width, overlap=False):
        super().__init__()
        self.ratio, self.width, self.overlap = ratio, width, overlap
        channels = width * (2 if overlap else 1)
        self.values = nn.Linear(cfg.dim, channels, bias=False)
        self.gates = nn.Linear(cfg.dim, channels, bias=False) if ratio > 1 else None
        self.position_bias = nn.Parameter(torch.zeros(ratio, channels)) if overlap else None
        self.norm = RMSNorm(width, cfg.eps)

    def forward(self, x):
        """Only completed groups are emitted. Returned latent is pre-RoPE."""
        batch, length, _ = x.shape
        r, d = self.ratio, self.width
        count = length // r
        if count == 0:
            return x.new_empty(batch, 0, d)
        values = self.values(x[:, :count*r]).reshape(batch, count, r, -1)
        if self.gates is None:
            return self.norm(values.squeeze(2))
        scores = self.gates(x[:, :count*r]).reshape_as(values)
        if self.position_bias is not None:
            scores = scores + self.position_bias
        if self.overlap:
            previous_values = torch.cat((torch.zeros_like(values[:, :1, :, :d]), values[:, :-1, :, :d]), 1)
            previous_scores = torch.cat((torch.full_like(scores[:, :1, :, :d], -torch.inf), scores[:, :-1, :, :d]), 1)
            values = torch.cat((previous_values, values[..., d:]), 2)
            scores = torch.cat((previous_scores, scores[..., d:]), 2)
        return self.norm((scores.softmax(2) * values).sum(2))


def attention_with_sink(query, entries, sink):
    """query [heads,c], entries [entries,c], one shared K=V, zero-value sink."""
    logits = query @ entries.T / math.sqrt(query.shape[-1])
    weights = torch.cat((logits, sink[:, None]), -1).softmax(-1)
    return weights[:, :-1] @ entries


class Attention(nn.Module):
    def __init__(self, cfg, layer):
        super().__init__()
        self.cfg, self.layer = cfg, layer
        self.ratio, self.mode = cfg.ratios[layer], cfg.modes[layer]
        self.q_a = nn.Linear(cfg.dim, cfg.q_rank, bias=False)
        self.q_norm = RMSNorm(cfg.q_rank, cfg.eps)
        self.q_b = nn.Linear(cfg.q_rank, cfg.heads * cfg.head_dim, bias=False)
        self.local = nn.Linear(cfg.dim, cfg.head_dim, bias=False)
        self.local_norm = RMSNorm(cfg.head_dim, cfg.eps)
        self.sink = nn.Parameter(torch.zeros(cfg.heads))
        group_width = cfg.heads // cfg.groups * cfg.head_dim
        self.group_o = nn.Parameter(torch.empty(cfg.groups, cfg.o_rank, group_width))
        nn.init.normal_(self.group_o, std=group_width**-0.5)
        self.out = nn.Linear(cfg.groups * cfg.o_rank, cfg.dim, bias=False)
        # V4 alternates a sparse small-ratio branch and a dense larger-ratio branch.
        self.sparse = cfg.family == "v41" or self.ratio == 2
        if self.mode == "full":
            overlap = cfg.family == "v4" and self.ratio == 2
            self.compressor = Compressor(cfg, self.ratio, cfg.head_dim, overlap)
            if cfg.family == "v4" and self.sparse:
                self.index_compressor = Compressor(cfg, self.ratio, cfg.index_dim, True)
            elif cfg.family == "v41":
                self.index_key = nn.Linear(cfg.head_dim, cfg.index_dim, bias=False)
                self.index_norm = RMSNorm(cfg.index_dim, cfg.eps)
        if self.mode in ("full", "reindex") and self.sparse:
            self.index_query = nn.Linear(cfg.q_rank, cfg.index_heads * cfg.index_dim, bias=False)
            self.index_weights = nn.Linear(cfg.dim, cfg.index_heads, bias=False)

    def select(self, x, qr, keys, candidates=None, make_candidates=False):
        cfg = self.cfg
        iq = self.index_query(qr).unflatten(-1, (cfg.index_heads, cfg.index_dim))
        iq = rope(iq, torch.arange(x.shape[1], device=x.device), cfg.rotary)
        weights = self.index_weights(x) / math.sqrt(cfg.index_heads * cfg.index_dim)
        scores = (torch.einsum("bthi,bji->bthj", iq, keys).relu() * weights.unsqueeze(-1)).sum(-2)
        selection, pool = [], []
        for b in range(x.shape[0]):
            by_token, token_pool = [], []
            for t in range(x.shape[1]):
                count = (t + 1) // self.ratio
                reachable = torch.arange(count, device=x.device)
                score = scores[b, t, :count]
                if make_candidates and count:
                    block_ids = torch.arange(math.ceil(count / cfg.candidate_block), device=x.device)
                    block_scores = torch.stack([score[j*cfg.candidate_block:(j+1)*cfg.candidate_block].max() for j in block_ids])
                    # The newest reachable block is always retained.
                    block_scores = block_scores.clone()
                    block_scores[-1] = torch.inf
                    chosen = block_scores.topk(min(len(block_ids), cfg.candidate_blocks)).indices
                    reachable = reachable[torch.isin(reachable // cfg.candidate_block, chosen)]
                elif candidates is not None:
                    reachable = candidates[b][t]
                token_pool.append(reachable)
                chosen = reachable[score[reachable].topk(min(cfg.global_topk, len(reachable))).indices] if len(reachable) else reachable
                by_token.append(chosen.sort().values)
            selection.append(by_token)
            pool.append(token_pool)
        return selection, pool

    def forward(self, x, runtime):
        cfg = self.cfg
        batch, length, _ = x.shape
        positions = torch.arange(length, device=x.device)
        qr = self.q_norm(self.q_a(x))
        q = self.q_b(qr).unflatten(-1, (cfg.heads, cfg.head_dim))
        # The released V4 normalizes each main head; V4.1 removes that operation.
        if cfg.family == "v4":
            q = rms(q, cfg.eps)
        q = rope(q, positions, cfg.rotary)
        local = rope(self.local_norm(self.local(x)), positions, cfg.rotary)
        source = None
        global_kv = x.new_empty(batch, 0, cfg.head_dim)
        selected = [[torch.empty(0, dtype=torch.long, device=x.device) for _ in range(length)] for _ in range(batch)]
        if self.mode == "full":
            latent = self.compressor(x)
            anchors = torch.arange(latent.shape[1], device=x.device) * self.ratio
            global_kv = rope(latent, anchors, cfg.rotary)
            source = self.layer
            if self.sparse:
                ik = self.index_compressor(x) if cfg.family == "v4" else self.index_norm(self.index_key(latent))
                ik = rope(ik, anchors, cfg.rotary)
                selected, candidates = self.select(x, qr, ik, make_candidates=cfg.family == "v41" and self.layer == cfg.encoder_layers)
            else:
                ik, candidates = None, None
                selected = [[torch.arange((t + 1) // self.ratio, device=x.device) for t in range(length)] for _ in range(batch)]
            runtime["global"] = {"kv": global_kv, "index_keys": ik, "selected": selected,
                                 "candidates": candidates, "source": self.layer,
                                 "selection_source": self.layer}
        elif self.mode in ("reuse", "reindex"):
            owned = runtime["global"]
            source, global_kv = owned["source"], owned["kv"]
            if self.mode == "reindex":
                selected, _ = self.select(x, qr, owned["index_keys"], owned["candidates"])
                owned["selected"], owned["selection_source"] = selected, self.layer
            else:
                selected = owned["selected"]
        rows = []
        for b in range(batch):
            token_outputs = []
            for t in range(length):
                recent = local[b, max(0, t-cfg.window+1):t+1]
                entries = torch.cat((recent, global_kv[b, selected[b][t]]), 0)
                token_outputs.append(attention_with_sink(q[b, t], entries, self.sink))
            rows.append(torch.stack(token_outputs))
        attended = rope(torch.stack(rows), positions, cfg.rotary, inverse=True)
        grouped = attended.reshape(batch, length, cfg.groups, -1)
        projected = torch.einsum("btgi,gri->btgr", grouped, self.group_o)
        output = self.out(projected.flatten(-2))
        # Keep ownership explicit and retain each layer's distinct local representation.
        runtime["locals"].append(local)
        runtime["trace"].append({"layer": self.layer, "mode": self.mode, "ratio": self.ratio,
                                  "query_shape": list(q.shape), "local_shape": list(local.shape),
                                  "global_shape": list(global_kv.shape), "global_source": source,
                                  "selection_source": runtime["global"]["selection_source"] if source is not None else None,
                                  "last_selected": selected[0][-1].tolist(),
                                  "output_first4": output[0, -1, :4].detach().tolist()})
        return output


class Expert(nn.Module):
    def __init__(self, cfg):
        super().__init__()
        self.gate = nn.Linear(cfg.dim, cfg.expert_width, bias=False)
        self.up = nn.Linear(cfg.dim, cfg.expert_width, bias=False)
        self.down = nn.Linear(cfg.expert_width, cfg.dim, bias=False)

    def forward(self, x):
        return self.down(F.silu(self.gate(x).clamp(max=10)) * self.up(x).clamp(-10, 10))


def route(affinity, bias, active, scale, identities=None):
    ids = (affinity + bias).topk(active, -1).indices if identities is None else identities
    weights = affinity.gather(-1, ids)
    return ids, scale * weights / weights.sum(-1, keepdim=True)


class MoE(nn.Module):
    def __init__(self, cfg, layer):
        super().__init__()
        self.cfg, self.hashed = cfg, layer < cfg.hash_layers
        self.router = nn.Linear(cfg.dim, cfg.experts, bias=False)
        self.bias = nn.Parameter(torch.zeros(cfg.experts))
        self.experts = nn.ModuleList(Expert(cfg) for _ in range(cfg.experts))
        self.shared = Expert(cfg)
        # Explicit substitute for the checkpoint's tid2eid table; never called its hash.
        table = (torch.arange(cfg.vocab)[:, None] + torch.arange(cfg.active)[None, :]) % cfg.experts
        self.register_buffer("didactic_token_experts", table)

    def forward(self, x, tokens):
        cfg = self.cfg
        affinity = F.softplus(self.router(x)).sqrt()
        fixed = self.didactic_token_experts[tokens] if self.hashed else None
        ids, weights = route(affinity, self.bias, cfg.active, cfg.route_scale, fixed)
        output = self.shared(x)
        # Evaluate only the selected token rows for each routed expert.
        flat_x, flat_out = x.flatten(0, 1), output.flatten(0, 1)
        flat_ids, flat_weights = ids.flatten(0, 1), weights.flatten(0, 1)
        for e, expert in enumerate(self.experts):
            token, slot = torch.where(flat_ids == e)
            if len(token):
                contribution = expert(flat_x[token]) * flat_weights[token, slot, None]
                flat_out = flat_out.index_add(0, token, contribution)
        return flat_out.reshape_as(x)


class Block(nn.Module):
    def __init__(self, cfg, layer):
        super().__init__()
        self.cfg = cfg
        self.attention, self.moe = Attention(cfg, layer), MoE(cfg, layer)
        self.attn_mix, self.moe_mix = Mix(cfg), Mix(cfg)
        self.attn_norm, self.moe_norm = RMSNorm(cfg.dim, cfg.eps), RMSNorm(cfg.dim, cfg.eps)

    def forward(self, x, tokens, runtime, carried_pre):
        attn_pre, post, combination = self.attn_mix(x)
        used_pre = carried_pre if self.cfg.family == "v41" else attn_pre
        y = self.attention(self.attn_norm(collapse(x, used_pre)), runtime)
        x = transport(x, combination) + post.unsqueeze(-1) * y.unsqueeze(-2)
        moe_pre, post, combination = self.moe_mix(x)
        used_pre = attn_pre if self.cfg.family == "v41" else moe_pre
        y = self.moe(self.moe_norm(collapse(x, used_pre)), tokens)
        x = transport(x, combination) + post.unsqueeze(-1) * y.unsqueeze(-2)
        return x, moe_pre


class Miniature(nn.Module):
    def __init__(self, cfg=None):
        super().__init__()
        self.cfg = cfg or Config()
        cfg = self.cfg
        self.embedding = nn.Embedding(cfg.vocab, cfg.dim)
        self.blocks = nn.ModuleList(Block(cfg, i) for i in range(len(cfg.ratios)))
        self.head_mix = nn.Linear(cfg.streams * cfg.dim, cfg.streams, bias=False) if cfg.family == "v4" else None
        self.head_base = nn.Parameter(torch.zeros(cfg.streams)) if cfg.family == "v4" else None
        self.head_scale = nn.Parameter(torch.tensor(0.1)) if cfg.family == "v4" else None
        self.norm = RMSNorm(cfg.dim, cfg.eps)
        self.vocabulary = nn.Linear(cfg.dim, cfg.vocab, bias=False)

    def forward(self, tokens, return_trace=False):
        cfg = self.cfg
        if tokens.ndim != 2 or tokens.dtype != torch.long or tokens.shape[1] == 0:
            raise ValueError("tokens must be a nonempty [batch,tokens] int64 tensor")
        if tokens.shape[0] == 0 or tokens.min() < 0 or tokens.max() >= cfg.vocab:
            raise ValueError("invalid token ID or empty batch")
        h = self.embedding(tokens).unsqueeze(-2).expand(-1, -1, cfg.streams, -1)
        pre = h.new_zeros(*h.shape[:-1])
        pre[..., 0] = 1  # V4.1 initial Single-Pass input selects stream zero.
        runtime = {"global": None, "locals": [], "trace": []}
        for i, block in enumerate(self.blocks):
            h, pre = block(h, tokens, runtime, pre)
        if self.head_mix is not None:
            pre = torch.sigmoid(self.head_mix(rms(h.flatten(-2), cfg.eps)) * self.head_scale + self.head_base) + cfg.eps
        reduced = collapse(h, pre)
        logits = self.vocabulary(self.norm(reduced))
        if return_trace:
            return logits, {"embedding_shape": [*tokens.shape, cfg.dim],
                            "residual_shape": list(h.shape), "reduced_shape": list(reduced.shape),
                            "logits_shape": list(logits.shape), "layers": runtime["trace"],
                            "local_owners": len(runtime["locals"]),
                            "final_first4": logits[0, -1, :4].detach().tolist()}
        return logits

    @torch.no_grad()
    def step(self, new_tokens, history=None):
        """Reference state API: store IDs and RECOMPUTE the full prefix every call."""
        history = new_tokens.clone() if history is None else torch.cat((history, new_tokens), 1)
        return self(history)[:, -new_tokens.shape[1]:], history

    @torch.no_grad()
    def generate(self, tokens, count):
        if not isinstance(count, int) or count < 0:
            raise ValueError("count must be a nonnegative integer")
        for _ in range(count):
            tokens = torch.cat((tokens, self(tokens)[:, -1].argmax(-1, keepdim=True)), 1)
        return tokens

    def save(self, path):
        torch.save({"config": asdict(self.cfg), "state": self.state_dict()}, path)

    @classmethod
    def load(cls, path):
        saved = torch.load(path, map_location="cpu", weights_only=True)
        cfg = Config(**saved["config"])
        dtype = saved["state"]["embedding.weight"].dtype
        model = cls(cfg).to(dtype=dtype)
        model.load_state_dict(saved["state"])
        return model
