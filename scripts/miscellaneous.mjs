import {readFile,writeFile,mkdir,cp,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {groups,sources} from '../miscellaneous/topics.mjs';
import {introduction} from '../miscellaneous/introduction.mjs';
import {openingFigure} from '../miscellaneous/opening-view.js';
import {renderTopic,completedEssays} from './essay-renderer.mjs';
import {applyFavicons} from './favicon.mjs';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function contents(mobile=false){
  return `<a href="#introduction" class="toc-link">Introduction</a><a href="#prerequisites" class="toc-link">Prerequisites</a><ol class="contents-sections">${groups.map((group,i)=>`<li><details data-contents-chapter="${group.id}"><summary><a class="toc-link contents-section" href="#${group.id}"><span class="contents-number">${i+1}</span><span class="contents-title">${escape(group.title)}</span></a><span class="contents-expand" aria-hidden="true"></span></summary><ol class="contents-subsections">${group.topics.map((topic,j)=>`<li><a class="toc-link toc-subsection${mobile?' contents-subsection':''}" href="#${topic.id}"><span class="contents-number">${i+1}.${j+1}</span><span class="contents-title">${escape(topic.title)}</span></a></li>`).join('')}</ol></details></li>`).join('')}</ol>`;
}

export async function buildMiscellaneous({root,output,siteUrl,config}){
  const collectionPath=config.collectionPath??'miscellaneous';
  const destination=path.join(output,collectionPath);
  const foundations=siteUrl+'/foundations/',transformers=siteUrl+'/transformers/';
  await mkdir(destination,{recursive:true});
  const count=groups.reduce((n,g)=>n+g.topics.length,0);
  const body=groups.map((group,i)=>`<section class="topic-group" id="${group.id}" aria-labelledby="${group.id}-title"><header><span class="group-number">${String(i+1).padStart(2,'0')}</span><div><h2 id="${group.id}-title">${escape(group.title)}</h2><p>${escape(group.intro)}</p>${group.orientation?`<p>${escape(group.orientation)}</p>`:""}</div></header><div class="topic-list">${group.topics.map((topic,j)=>renderTopic(topic,`${i+1}.${j+1}`)).join('')}</div></section>`).join('');
  let html=`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>Miscellaneous Topics · Yanbo - LLM's</title><meta name="description" content="Essays on GPUs, CUDA, VRAM, scaling laws, inference systems, local and open models, evaluation, agents, compaction, ethics, and safety."><link rel="canonical" href="${escape(siteUrl+(collectionPath?'/'+collectionPath:'')+'/')}"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Source+Serif+4:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/katex/katex.min.css"><link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="neobrutalism.css"><link rel="stylesheet" href="background.css"><link rel="stylesheet" href="contents.css"><link rel="stylesheet" href="collection.css"><link rel="stylesheet" href="opening.css"><link rel="stylesheet" href="essays.css"><script type="module" src="collection.js"></script></head>
<body><a class="skip-link" href="#topics">Skip to topics</a><div class="reading-progress" role="progressbar" aria-label="Reading progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div id="reading-progress"></div></div><span class="reading-percent" id="reading-percent" aria-hidden="true">0%</span>
<header class="topbar"><a class="brand" href="${escape(siteUrl+'/')}">Yanbo - LLM's</a><div class="top-actions"><button class="theme-button" id="theme-toggle" type="button" aria-label="Switch to dark theme">◐</button></div></header>
<header class="essay-header" id="top"><div class="hero-copy"><div class="eyebrow">Notes beyond the theoretical essays</div><h1>Miscellaneous<br><em>Topics</em></h1><p class="hero-subtitle">The hardware, experiments, and systems <strong><u>around</u></strong> a language model.</p><div class="hero-actions"><a class="begin-link" href="#introduction">Begin reading</a></div></div>${openingFigure()}</header>
<div class="page-shell"><aside class="contents-rail"><nav aria-label="Contents"><span class="rail-label">Contents</span>${contents()}<div class="companion-links"><a href="${escape(foundations)}">Foundations ↗</a><a href="${escape(transformers)}">Transformers in Practice ↗</a></div></nav></aside><div class="reading-column">
<details class="mobile-contents"><summary>Contents</summary><nav aria-label="Mobile contents">${contents(true)}<div class="companion-links"><a href="${escape(foundations)}">Foundations ↗</a><a href="${escape(transformers)}">Transformers in Practice ↗</a></div></nav></details>

<main class="essay-body" id="topics"><section class="collection-introduction" id="introduction" aria-labelledby="introduction-title"><h2 id="introduction-title">Introduction</h2>${introduction.map((paragraph,i)=>`<p${i===0?' class="lede"':''}>${paragraph}</p>`).join('')}</section><section class="collection-prerequisites" id="prerequisites"><h2>Prerequisites</h2><p>The reader is assumed to be familiar with the following:</p><ul><li><strong>Elementary mathematical language:</strong> functions, finite sequences, summation notation, and reading a short proof.</li><li><strong>Linear algebra:</strong> vectors, matrices, dot products, and matrix multiplication.</li><li><strong>Calculus:</strong> derivatives, partial derivatives, gradients, and logarithms.</li><li><strong>Elementary probability:</strong> discrete distributions, conditional probability, and expectation.</li></ul><p>We also assume familiarity with the basic principles of machine learning—parameterized models, loss functions, gradient descent, and evaluation on unseen examples—and with the construction of an LLM: tokenization, embeddings, transformer blocks, and autoregressive generation. <a href="https://iamyanbo.github.io/llm-notes/foundations/">Foundations</a> develops that construction; <a href="https://iamyanbo.github.io/llm-notes/transformers/">Transformers in Practice</a> studies its variations. These essays take that background as their starting point.</p><p>Programming is not required to use the interactive examples. Their small matrices and numerical inputs are chosen by hand; measurements of trained models are identified with their sources.</p></section><div class="collection-body">${body}</div><aside class="collection-note"><p>The mathematical background is developed in <a href="${escape(foundations)}">Foundations</a>; many of the model mechanisms are explored in <a href="${escape(transformers)}">Transformers in Practice</a>. This collection follows those constructions into hardware, experiments, and the systems around the model.</p></aside><section class="collection-ending" aria-labelledby="thanks-title"><h2 id="thanks-title">Thanks for reading!</h2><p>And thanks for giving the dog and cat some time off. They have earned it.</p><img src="images/dog-cat-happy-paper.png" alt="The familiar illustrated dog and cat, smiling and facing the reader." loading="lazy" decoding="async"><p class="ending-links"><a href="#top">Return to the beginning ↑</a></p></section></main>
<footer class="essay-footer"><div><span>Written by Yanbo.</span><a href="#top">Back to the beginning ↑</a></div></footer></div></div></body></html>`;
  for(const file of ['styles.css','neobrutalism.css','background.css','contents.css'])await cp(path.join(root,'miscellaneous/site',file),path.join(destination,file));
  const assets=(await readdir(path.join(root,'miscellaneous'))).filter(file=>/\.(css|js)$/.test(file)).sort();
  const digest=createHash('sha256').update(html);
  for(const file of assets)digest.update(await readFile(path.join(root,'miscellaneous',file)));
  for(const file of ['styles.css','neobrutalism.css','background.css','contents.css'])digest.update(await readFile(path.join(root,'miscellaneous/site',file)));
  const revision=digest.digest('hex').slice(0,12);
  for(const file of assets){
    const content=await readFile(path.join(root,'miscellaneous',file),'utf8');
    await writeFile(path.join(destination,file),file.endsWith('.js')?content.replace(/(\bfrom\s+)(['"])(\.{1,2}\/[^'"]+\.js)\2/g,(_,from,quote,url)=>`${from}${quote}${url}?v=${revision}${quote}`):content);
  }
  html=html.replace(/((?:href|src)=")([^"]+\.(?:css|js))(")/g,(match,start,url,end)=>url.startsWith('http')?match:`${start}${url}?v=${revision}${end}`);
  await writeFile(path.join(destination,'index.html'),html);
  await mkdir(path.join(destination,'assets'),{recursive:true});
  await cp(path.join(root,'foundations/node_modules/katex/dist'),path.join(destination,'assets/katex'),{recursive:true});
  await cp(path.join(root,'foundations/node_modules/katex/LICENSE'),path.join(destination,'assets/katex/LICENSE'));
  await cp(path.join(root,'miscellaneous/THIRD_PARTY_NOTICES.md'),path.join(destination,'THIRD_PARTY_NOTICES.md'));
  await cp(path.join(root,'miscellaneous/site/images'),path.join(destination,'images'),{recursive:true});
  await applyFavicons(destination);
  console.log('Built Miscellaneous Topics: '+count+' topics; '+completedEssays+' completed essays.');
}
