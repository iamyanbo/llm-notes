# Yanbo - LLM's

Interactive mathematical essays by Yanbo, published at https://iamyanbo.github.io/llm-notes/.

- [Foundations](https://iamyanbo.github.io/llm-notes/foundations/): grammar, representations, attention, transformers, causal decoding, training, and generation.
- [Transformers in Practice](https://iamyanbo.github.io/llm-notes/transformers/): architecture, learning and adaptation, generation and serving.
- [DeepSeek V4 & V4.1](https://iamyanbo.github.io/llm-notes/deepseek/): a module-by-module study of experts, residual streams, compressed attention, visual input, drafting and training, with a paced reading route and numerical traces.
- [Miscellaneous Topics](https://iamyanbo.github.io/llm-notes/miscellaneous/): proposed essays on hardware, compute, serving systems, evaluation, agents, ethics, and safety. Outlines and sources are stored in `miscellaneous/topics.mjs`; full essays will be added separately.

Foundations and Transformers in Practice build from MDX; DeepSeek renders its HTML section sources with Python. All publish static HTML. Mathematical typesetting uses KaTeX; numerical animations run in the browser. There is no hosted model or application server. Commenting controls, annotation scripts, and archived draft feedback are excluded from this public edition.

## Local development

Requires Node.js 22 or later and Python 3.10 or later.

```sh
npm ci --prefix foundations
npm ci --prefix transformers
npm run build
npm test
```

Serve `dist/` with a static HTTP server. To test the project path exactly, serve its parent with `dist/` mapped to `/llm-notes/`. Do not open the HTML as a `file:` URL: the demonstrations use JavaScript modules.

Edit essay text in `foundations/content/essay.mdx` or `transformers/content/*.mdx`. Preserve passage identifiers and the subsection aliases in `transformers/scripts/heading-anchors.json` so links continue to work. DeepSeek sources are in `deepseek/content/*.html`, with its reading route in `deepseek/study-days.json`. Each essay retains its own mathematical models, diagrams, styles, and tests.

## Publishing and the future portfolio

GitHub Actions builds all essay collections, runs their tests, and deploys `dist/` to GitHub Pages when `main` changes. The project occupies `/llm-notes/`; the account's root website is managed separately.

Link to `/llm-notes/` from the future portfolio. Set `portfolioUrl` in `site.config.json` when that website exists to add a return link on the essay index. `siteUrl` is the default local build URL; the Pages workflow supplies the actual publishing URL automatically. The essay headers return to the shared index, and their cross-references connect the public essays.

The initial migration preserves the approved essay text and interactive assets from the Foundations and Transformers in Practice source checkouts. Source deployment identities and private review archives are not included.

## Credits

See `foundations/THIRD_PARTY_NOTICES.md`, `transformers/THIRD_PARTY_NOTICES.md` and `deepseek/THIRD_PARTY_NOTICES.md` for the component design attribution and license. Images accompany the essays' original dog and cat illustrations.
