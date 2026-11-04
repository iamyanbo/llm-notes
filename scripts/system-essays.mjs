import {readFile, writeFile, mkdir, cp} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {applyFavicons} from './favicon.mjs';
import {escape, study} from '../systems/markup.mjs';
import {serving} from '../serving/content.mjs';
import {training} from '../training/content.mjs';

function contents(essay) {
  return `<a class="toc-link" href="#introduction" data-contents-link="introduction" data-contents-owner="introduction">Introduction</a><ol class="contents-sections">${essay.sections.map((section, index) => `<li><a class="toc-link contents-section" href="#${section.id}" data-contents-link="${section.id}" data-contents-owner="${section.id}"><span class="contents-number">${index + 1}</span><span class="contents-title">${escape(section.title)}</span></a></li>`).join('')}</ol><a class="toc-link" href="#sources" data-contents-link="sources" data-contents-owner="sources">Sources and further reading</a><div class="companion-links"><button class="overview-button" type="button" data-study-open="${essay.hero}">${escape(essay.overviewLabel)}</button><a href="../miscellaneous/">Miscellaneous Topics ↗</a><a href="../foundations/">Foundations ↗</a><a href="../transformers/">Transformers in Practice ↗</a><a href="../${essay.companion.slug}/">${escape(essay.companion.title)} ↗</a><a href="../">All essays ←</a></div>`;
}

export async function buildSystemEssays({root, output, siteUrl}) {
  const assets = ['models.mjs', 'views.mjs', 'app.mjs', 'systems.css'];
  const shared = path.join(output, 'systems');
  await mkdir(shared, {recursive: true});
  const digest = createHash('sha256');
  for (const file of assets) {
    const source = path.join(root, 'systems', file);
    digest.update(await readFile(source));
    await cp(source, path.join(shared, file));
  }
  const appSource = await readFile(path.join(root, 'systems', 'app.mjs'), 'utf8');
  const deployedApp = appSource
    .replace('../transformers/public/reader.js', '../transformers/reader.js')
    .replace('../deepseek/site/trace-motion.mjs', '../deepseek/assets/trace-motion.mjs');
  await writeFile(path.join(shared, 'app.mjs'), deployedApp);
  const version = digest.digest('hex').slice(0, 12);
  for (const essay of [serving, training]) {
    const destination = path.join(output, essay.slug);
    await mkdir(destination, {recursive: true});
    const css = ['styles.css', 'neobrutalism.css', 'background.css', 'contents.css'].map(file => `<link rel="stylesheet" href="../foundations/${file}">`).join('');
    const navigation = contents(essay);
    const body = essay.sections.map((section, index) => `<section id="${section.id}" aria-labelledby="${section.id}-title"><h2 id="${section.id}-title">${index + 1}. ${escape(section.title)}</h2>${section.body}</section>`).join('');
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>${escape(essay.title)} · Yanbo’s LLM Notes</title><meta name="description" content="${escape(essay.description)}"><link rel="canonical" href="${escape(siteUrl + '/' + essay.slug + '/')}"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Source+Serif+4:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet"><link rel="stylesheet" href="../foundations/assets/katex/katex.min.css">${css}<link rel="stylesheet" href="../systems/systems.css?v=${version}"><script type="module" src="../systems/app.mjs?v=${version}"></script></head><body data-entry-chapter="introduction"><a class="skip-link" href="#introduction">Skip to essay</a><div class="reading-progress" data-reading-progress role="progressbar" aria-label="Reading progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div data-reading-fill></div></div><span class="reading-percent" data-reading-percent aria-hidden="true">0%</span><header class="topbar"><a class="brand" href="../"><span class="brand-mark" aria-hidden="true">y</span>Yanbo · LLM Notes</a><div class="top-actions"><button class="theme-button" data-theme-toggle type="button" aria-label="Switch to dark theme">◐</button></div></header><header class="essay-header" id="top"><div class="hero-copy"><a class="series-link" href="../">← Return to the essays</a><h1>${essay.heading}</h1><p class="hero-subtitle">${escape(essay.subtitle)}</p><div class="hero-actions"><a class="begin-link" href="#introduction">Begin reading <span aria-hidden="true">↓</span></a><a class="series-link" href="../${essay.companion.slug}/">${escape(essay.companion.title)} ↗</a></div><span class="prototype-label">Reading prototype · November 2026</span></div><div class="hero-figure">${study(essay.hero)}</div></header><div class="page-shell"><aside class="contents-rail"><nav aria-label="Contents"><span class="rail-label">Contents</span>${navigation}</nav></aside><div class="reading-column"><details class="mobile-contents"><summary>Contents</summary><nav aria-label="Mobile contents">${navigation}</nav></details><main class="essay-body"><section id="introduction" aria-labelledby="introduction-title"><h2 id="introduction-title">Introduction</h2>${essay.introduction}</section>${body}<section id="sources" aria-labelledby="sources-title"><h2 id="sources-title">Sources and further reading</h2><p>The original reports and released implementations give the settings behind the examples. They also provide starting points for changing a workload, inspecting a trace, or reproducing a calculation.</p><ol class="sources-list">${essay.sources.map(([title, url]) => `<li><a href="${escape(url)}">${escape(title)} ↗</a></li>`).join('')}</ol></section></main><footer class="essay-footer"><p class="prototype-note">This reading prototype develops the opening arguments and selected worked examples. The larger deployment and training studies will be extended as the essay develops.</p><div><a href="../">All essays ←</a><a href="#top">Return to the beginning ↑</a><span>Written by Yanbo.</span></div></footer></div></div></body></html>`;
    await writeFile(path.join(destination, 'index.html'), html);
    await applyFavicons(destination);
    console.log(`Built ${essay.title} prototype with ${essay.sections.length} sections.`);
  }
}
