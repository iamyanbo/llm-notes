# DeepSeek V4 & V4.1

A continuous mathematical essay at [LLM Notes / DeepSeek](https://iamyanbo.github.io/llm-notes/deepseek/). The first seven reading days build V4, followed by a paced continuation through V4.1, training, systems and experiments.

Section sources live in `content/`, ordered by `chapters.json`. Numerical models and interactive renderers live in `site/`; `study-days.json` defines reading boundaries. The static builder renders one continuous document with local search, module maps, numerical traces and downloadable Python studies. Older chapter-style URLs redirect to their corresponding section anchors.

The publication retains the essay's calculations and interactions, including clean numerical-cell edges. Hand-chosen examples, recorded CPU checks and proposed experiments are distinguished in the essay's references and evidence sections. The miniature uses random weights and does not reproduce trained model quality or production serving performance.

## Build and verify

Requires Python 3.10+ and Node.js 22+. The build uses Python's standard library and bundled KaTeX; it needs no additional packages or network access.

```sh
python build.py
node --test tests/*.test.mjs
python check.py
python -m unittest discover -s tests -p 'test_*.py'
```

The parent repository's `npm run build` and `npm test` include this essay. `SITE_URL` supplies the parent publishing URL; the builder places DeepSeek beneath its `/deepseek/` path. Assets, downloads, chapter redirects and client search remain inside that path.

The `miniature/` package contains reduced V4/V4.1 text backbones, their 19 CPU tests and deterministic records. Reproducing those calculations requires PyTorch; building the essay packages the existing checked files without retraining. See `miniature/README.md` and `THIRD_PARTY_NOTICES.md` for scope and attribution.
