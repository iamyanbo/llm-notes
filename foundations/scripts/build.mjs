import { readFile, writeFile, mkdir, cp, readdir } from 'node:fs/promises';
import {createHash} from 'node:crypto';
import { evaluate } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { pathToFileURL } from 'node:url';
import {architectureCanvas} from './architecture-canvas.mjs';
import {chapterAtlas} from './chapter-atlas.mjs';
import {blockStudy} from '../public/block-study-view.js';
import { grammarExplorer } from './grammar-explorer.mjs';
import { representationExplorer } from './representation-explorer.mjs';
import { embeddingExplorer } from './embedding-explorer.mjs';
import { contextMixer, sequenceAttentionExplorer } from './context-explorers.mjs';
import { sumWalkthrough } from './sum-walkthrough.mjs';
import { projectionComparison } from '../public/projection-comparison.js';
import {scoreToWeights,valueTransformation,positionComparison,scoreScale} from '../public/attention-studies-view.js';
import {geometryStudy} from '../public/geometry-view.js';
import {wordRelevanceStudy} from '../public/word-relevance-view.js';
import { ARCHITECTURE_OVERVIEW } from '../public/transformer-model.js';
import {chapterCalculation,generationLoop,trainingShift,tokenText} from './completion-studies.mjs';
import {symbolMath,blockSummaryTable} from './symbol-math.mjs';
const flowControls = prefix => `<div class="flow-controls" role="group" aria-label="Diagram animation"><div class="flow-buttons"><button type="button" data-flow-toggle aria-pressed="false">Play</button><button type="button" data-flow-next>Next</button><button type="button" data-flow-restart>Restart</button></div><label class="flow-scrubber" for="${prefix}-stage"><span data-flow-position>1 / 7</span><input id="${prefix}-stage" data-flow-scrubber type="range" min="0" max="6" step="1" value="0" aria-label="Diagram stage" aria-valuetext="Embeddings and positions"></label></div>`;

const h = React.createElement;
const source = (await readFile('content/essay.mdx', 'utf8')).replaceAll('https://iamyanbo.github.io/llm-notes', (process.env.SITE_URL||'https://iamyanbo.github.io/llm-notes').replace(/\/$/,''));
const siteUrl=(process.env.SITE_URL||'https://iamyanbo.github.io/llm-notes').replace(/\/$/,'');
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const headings = {Introduction:'introduction', Prerequisites:'prerequisites', '1 Meaning and structure':'meaning-and-structure','2 From language to representations':'language-to-representations','3 From context to weighted combinations':'context-to-attention','4 Learning a comparison':'learning-comparisons','5 From comparisons to attention':'comparisons-to-attention','6 From attention to a transformer':'attention-to-transformer','7 From representations to predictions':'representations-to-predictions','8 Reading only what is available':'causal-decoder','9 Learning and generating a sequence':'learning-and-generation'};
const subsections = {
  '1.1 Grammatical roles':'same-words','1.2 Grammar as we understand it':'human-grammar','1.3 Word order and grammatical structure':'word-order','1.4 Semantics and context':'semantics-and-context',
  '2.1 Tokens and sequences':'tokens-and-sequences','2.2 Assigning vectors to tokens':'token-vectors','2.3 What a representation preserves':'preserving-information','2.4 A construction that forgets order':'forgetting-order',
  '3.1 A representation that depends on its surroundings':'context-dependence','3.2 Combining information from other words':'weighted-context','3.3 The contributions must adapt':'adaptive-contributions',
  '4.1 Two roles in a comparison':'choosing-contributions','4.2 Scalar queries and keys':'scalar-queries-keys','4.3 What one coordinate forgets':'one-coordinate','4.4 A matrix as a map of the plane':'matrix-plane','4.5 Comparing transformed vectors':'comparison-vectors',
  '5.1 From scores to weights':'scores-to-weights','5.2 What values transmit':'transmitting-values','5.3 Making position available':'position-information','5.4 Choosing the score scale':'score-scale','5.5 Collecting the attention computation':'attention-computation',
  '6.1 What should a layer accomplish?':'layer-purpose','6.2 Several comparisons in parallel':'parallel-heads','6.3 Keeping the original input':'residual-connections','6.4 Processing the gathered information':'processing-features','6.5 Controlling the scale':'layer-normalization','6.6 Repeating the construction':'repeated-blocks',
  '7.1 What should the output describe?':'prediction-distribution','7.2 One comparison for each vocabulary token':'vocabulary-readout','7.3 Normalizing the vocabulary scores':'vocabulary-probabilities',
  '8.1 A mask before normalization':'causal-mask','8.2 Why later text cannot leak through another layer':'prefix-dependence','8.3 A decoder for one growing sequence':'decoder-only','8.4 When there is a separate source sequence':'cross-attention',
  '9.1 Autoregression is a dependence, not another vector space':'autoregressive-factorization','9.2 Where the training answers come from':'training-targets','9.3 Choosing a continuation':'generation-loop','9.4 From token identifiers to readable text':'token-decoding','9.5 What we have constructed':'conclusion',
};
const numberedContents=mobile=>Object.entries(headings).filter(([title])=>/^\d+ /.test(title)).map(([title,id])=>{
  const [number,...words]=title.split(' ');
  const main=`<a href="#${id}" class="${mobile?'':'toc-link '}contents-section"><span class="contents-number">${number}.</span> <span class="contents-title">${escape(words.join(' '))}</span></a>`;
  const children=Object.entries(subsections).filter(([subtitle])=>subtitle.startsWith(`${number}.`)).map(([subtitle,anchor])=>{
    const [subnumber,...label]=subtitle.split(' ');
    const link=`<a href="#${anchor}" class="${mobile?'contents-subsection':'toc-link toc-subsection'}"><span class="contents-number">${subnumber}</span> <span class="contents-title">${escape(label.join(' '))}</span></a>`;
    return `<li>${link}</li>`;
  }).join('');
  return `<li><details data-contents-chapter="${number}"><summary aria-label="Toggle subsections for ${escape(words.join(' '))}">${main}<span class="contents-expand" aria-hidden="true"></span></summary><ul class="contents-subsections">${children}</ul></details></li>`;
}).join('');
const contentsList=mobile=>`<ul class="contents-sections">${numberedContents(mobile)}</ul>`;
let sectionNumber=0, statementNumber=0;
const numberedStatement = (kind,children) => h('aside', {className:`statement ${kind.toLowerCase()}`, 'aria-label':`${kind} ${sectionNumber}.${++statementNumber}`}, h('div', {className:'aside-label'}, `${kind} ${sectionNumber}.${statementNumber}`), children);
const components = {
  Passage: ({id, children}) => h('div', {id, className:'passage'}, children),
  ChapterCalculation: ({kind}) => h('div',{dangerouslySetInnerHTML:{__html:chapterCalculation(kind)}}),
  GenerationLoop: () => h('div',{dangerouslySetInnerHTML:{__html:generationLoop()}}),
  TrainingShift: () => h('div',{dangerouslySetInnerHTML:{__html:trainingShift()}}),
  TokenText: () => h('div',{dangerouslySetInnerHTML:{__html:tokenText()}}),
  SymbolMath: ({kind}) => h(kind==='block-shape'?'span':'div',{dangerouslySetInnerHTML:{__html:symbolMath(kind)}}),
  BlockSummaryTable: () => h('div',{dangerouslySetInnerHTML:{__html:blockSummaryTable()}}),
  ContinuationIllustration: () => h('figure',{className:'continuation-figure'},
    h('img',{src:'assets/chase-possibilities-paper.png',width:2172,height:724,alt:'Three possible continuations: the same golden retriever chases the tabby cat, a ball, or a squirrel.',loading:'lazy',decoding:'async'}),
    h('figcaption',null,...['cat','ball','squirrel'].map(word=>h('span',{key:word},'The dog chased the ',h('em',null,word),'.')))),
  ThanksForReading: () => h('section',{className:'essay-signoff','aria-label':'Thanks for reading'},
    h('p',{className:'signoff-message'},'Thanks for reading!'),
    h('figure',{className:'animal-vignette animal-vignette-happy'},h('img',{src:'assets/dog-cat-happy-paper.png',width:1536,height:1024,alt:'The same golden retriever and striped tabby sit happily together, looking toward the reader.',loading:'lazy',decoding:'async'}))),
  AttentionAtlas: () => h('div',{dangerouslySetInnerHTML:{__html:chapterAtlas('attention')}}),
  TransformerAtlas: () => h('div',{dangerouslySetInnerHTML:{__html:chapterAtlas('transformer')}}),
  BlockStudy: ({kind}) => h('div',{dangerouslySetInnerHTML:{__html:blockStudy(kind)}}),
  DiagramFocus: ({diagram,step,children}) => h('button',{type:'button',className:'chapter-focus','data-atlas-focus':diagram,'data-atlas-focus-step':step,'aria-haspopup':'dialog'},children),
  h2: ({children}) => {
    const title=String(children), number=title.match(/^(\d+) /);
    if(number){sectionNumber=Number(number[1]);statementNumber=0;}
    return h('h2', {id:headings[title]}, number ? [h('span',{className:'section-number',key:'number'},`${number[1]}.`),' ',title.replace(/^\d+ /,'')] : title);
  },
  h3: ({children}) => h('h3', {id:subsections[String(children)]}, children),
  AuthorNote: ({title, children}) => h('aside', {className:'author-note'}, h('div', {className:'aside-label'}, title), children),
  Observation: ({children}) => numberedStatement('Observation',children),
  Definition: ({children}) => numberedStatement('Definition',children),
  Theorem: ({children}) => numberedStatement('Theorem',children),
  Lemma: ({children}) => numberedStatement('Lemma',children),
  Proposition: ({children}) => numberedStatement('Proposition',children),
  Proof: ({children}) => {
    const blocks=React.Children.toArray(children).filter(child=>typeof child!=='string'||child.trim());
    const last=blocks.pop(),equation=last?.props?.className?.includes('katex-display');
    return h('div',{className:'proof'},h('strong',{className:'proof-label'},'Proof.'),blocks,
      h('div',{className:'proof-conclusion'+(equation?' proof-equation':'')},last,
        h('span',{className:'proof-end','aria-label':'End of proof'},'□')));
  },
  RepresentationExplorer: () => h('div',{dangerouslySetInnerHTML:{__html:representationExplorer()}}),
  EmbeddingExplorer: () => h('div',{dangerouslySetInnerHTML:{__html:embeddingExplorer()}}),
  ContextMixer: () => h('div',{dangerouslySetInnerHTML:{__html:contextMixer()}}),
  WordRelevanceStudy: () => h('div',{dangerouslySetInnerHTML:{__html:wordRelevanceStudy()}}),
  WeightedSumWalkthrough: () => h('div',{dangerouslySetInnerHTML:{__html:sumWalkthrough()}}),
  ProjectionComparison: () => h('div',{dangerouslySetInnerHTML:{__html:projectionComparison()}}),
  ScalarProjection: () => h('div',{dangerouslySetInnerHTML:{__html:geometryStudy({mode:'scalar',prefix:'geometry-scalar'})}}),
  PlaneTransformation: () => h('div',{dangerouslySetInnerHTML:{__html:geometryStudy({mode:'basis',prefix:'geometry-basis'})}}),
  QKVGeometry: () => h('div',{dangerouslySetInnerHTML:{__html:geometryStudy({mode:'qkv',prefix:'geometry-qkv'})}}),
  MatrixMapIllustration: () => h('figure',{className:'coordinate-illustration'},
    h('img',{src:'assets/plane-map.svg',width:720,height:340,alt:'The unit square becomes a parallelogram under M. Its basis vectors become (1, one half) and (0, 1).',loading:'lazy'}),
    h('figcaption',null,'The columns of M specify the two transformed basis vectors. Their images determine the image of the unit square.')),
  ScoreToWeights: () => h('div',{dangerouslySetInnerHTML:{__html:scoreToWeights()}}),
  ValueTransformation: () => h('div',{dangerouslySetInnerHTML:{__html:valueTransformation()}}),
  PositionComparison: () => h('div',{dangerouslySetInnerHTML:{__html:positionComparison()}}),
  ScoreScale: () => h('div',{dangerouslySetInnerHTML:{__html:scoreScale()}}),
  SequenceAttentionExplorer: () => h('div',{dangerouslySetInnerHTML:{__html:sequenceAttentionExplorer()}}),
  RepresentationReferences: () => h('aside',{className:'grammar-references'},
    'For further reading, see ',h('a',{href:'https://huggingface.co/docs/transformers/tokenizer_summary'},'tokenization'),', ',
    h('a',{href:'https://docs.pytorch.org/docs/stable/generated/torch.nn.Embedding'},'embedding lookup tables'),', and ',
    h('a',{href:'https://nlp.stanford.edu/IR-book/html/htmledition/term-frequency-and-weighting-1.html'},'bag-of-words representations'),'.'),
  GrammarExplorer: () => h('div',{dangerouslySetInnerHTML:{__html:grammarExplorer()}}),
  GrammarReferences: () => h('aside',{className:'grammar-references'},
    'For further discussion, see ',
    h('a',{href:'https://ecampusontario.pressbooks.pub/essentialsoflinguistics2/chapter/functional-categories/'},'word categories'),', ',
    h('a',{href:'https://ecampusontario.pressbooks.pub/essentialsoflinguistics2/chapter/a-starting-point-word-order/'},'grammatical functions'),', and ',
    h('a',{href:'https://pressbooks.pub/essentialsoflinguistics/chapter/9-4-thematic-roles-and-passive-sentences/'},'event roles and passive sentences'),
    ' in Essentials of Linguistics.'),
  ChaseIllustration: () => h('figure', {className:'chase-figure'},
    h('img', {src:'assets/chasing-roles.png', width:2048, height:683, alt:'Left: a dog runs behind a cat, chasing it. Right: the same cat runs behind the dog, chasing it.', loading:'lazy'}),
    h('figcaption', null,
      h('span', null, 'The ', h('b', {className:'dog'}, 'dog'), ' chased the cat.'),
      h('span', null, 'The ', h('b', {className:'cat'}, 'cat'), ' chased the dog.'))),
  AnimalVignette: ({scene}) => h('figure', {className:`animal-vignette animal-vignette-${scene}`},
    h('img', {src:`assets/dog-cat-${scene}-paper.png`,
      width:scene==='resting'?2172:1774, height:scene==='resting'?724:887,
      alt:scene==='resting'
        ? 'The golden retriever and striped tabby rest beside each other, panting after their chase.'
        : 'The same golden retriever and striped tabby sit together and gently touch their raised front paws.',
      loading:'lazy', decoding:'async'})),
  SentenceExplorer: () => h('section', {className:'sentence-explorer', 'aria-labelledby':'experiment-title'},
    h('div', {className:'experiment-heading'}, h('span', {className:'aside-label'}, 'Experiment'), h('span', {className:'experiment-index'}, '01')),
    h('h3', {id:'experiment-title'}, 'Word order'),
    h('p', {className:'experiment-instruction'}, 'Choose two words to exchange their positions.'),
    h('div', {className:'word-row', id:'word-row', 'aria-label':'Words in sentence order'}, ['the','dog','chased','the','cat'].map((word,i)=>h('button',{key:i,type:'button',className:'word', 'data-word-index':i,'aria-pressed':'false','aria-label':`Word ${i+1}: ${word}`},word))),
    h('p', {className:'sentence-reading',id:'sentence-reading','aria-live':'polite'}, 'The dog chased the cat.'),
    h('div', {className:'preset-row'}, h('button',{type:'button','data-preset':'dog',className:'text-button'},'Dog chases cat'),h('button',{type:'button','data-preset':'cat',className:'text-button'},'Cat chases dog'),h('button',{type:'button','data-preset':'scrambled',className:'text-button'},'Scrambled words')),
    h('div', {className:'experiment-bottom'}, h('button',{type:'button',id:'counts-toggle',className:'text-button','aria-expanded':'false','aria-controls':'word-counts'},'Compare word counts'), h('span', {id:'selection-hint',className:'selection-hint','aria-live':'polite'},'No word selected')),
    h('div',{id:'word-counts',hidden:true},h('p',{className:'counts-note'},'Counting the words gives the same result in all three examples.'),h('dl',{className:'count-list',id:'count-list'},['the','dog','chased','cat'].flatMap((word,i)=>[h('dt',{key:`t${i}`},word),h('dd',{key:`d${i}`},word==='the'?'2':'1')]))),
    h('p',{id:'order-detail',className:'order-detail','aria-live':'polite'},'The dog performs the action; the cat is chased.')),
};

const {default: Essay} = await evaluate(source, {...runtime, baseUrl:pathToFileURL(process.cwd()+'/'), remarkPlugins:[remarkMath], rehypePlugins:[rehypeKatex]});
const body = renderToStaticMarkup(h(Essay, {components}));
const words = source.replace(/<[^>]+>/g,'').replace(/\([^)]*\)/g,'').replace(/[#>*![\]]/g,'').split(/\s+/).filter(Boolean).length;
const minutes = Math.max(1,Math.ceil(words/200));
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><link rel="canonical" href="${siteUrl}/foundations/">
<title>Understanding Attention and Transformers</title><meta name="description" content="An interactive, carefully motivated essay about language, context, and the mathematics behind attention and transformers.">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%233f6389'/%3E%3Ctext x='32' y='45' text-anchor='middle' font-family='Georgia' font-size='42' fill='%23f9f6ef'%3Ea%3C/text%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Source+Serif+4:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/katex/katex.min.css"><link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="architecture.css"><link rel="stylesheet" href="motion.css"><link rel="stylesheet" href="hero.css"><link rel="stylesheet" href="neobrutalism.css"><link rel="stylesheet" href="chapter-atlas.css"><link rel="stylesheet" href="block-study.css"><link rel="stylesheet" href="background.css"><link rel="stylesheet" href="contents.css"><link rel="stylesheet" href="architecture-operations.css"><link rel="stylesheet" href="popup-layout.css"><link rel="stylesheet" href="completion.css"><script type="module" src="app.js"></script></head>
<body><a class="skip-link" href="#essay">Skip to essay</a><div class="reading-progress" role="progressbar" aria-label="Reading progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div id="reading-progress"></div></div><span class="reading-percent" id="reading-percent" aria-hidden="true">0%</span>
<header class="topbar"><a class="brand" href="${siteUrl}/"><span>Yanbo - LLM's</span></a><div class="top-actions"><button class="theme-button" id="theme-toggle" type="button" aria-label="Switch to dark theme">◐</button></div></header>
<header class="essay-header" id="top">
  <div class="hero-copy"><div class="eyebrow">An essay on language models</div><h1><span class="hero-line"><span>Understanding</span></span> <span class="hero-line"><span><em>attention</em> and</span></span> <span class="hero-line"><span>transformers</span></span></h1><div class="hero-actions"><a class="begin-link" href="#introduction">Begin reading</a><span class="hero-read-time">${minutes} min read · Introduction & sections 1–9</span></div></div>
  <figure class="architecture-plate" aria-labelledby="architecture-heading"><div class="architecture-heading"><span id="architecture-heading">Transformer architecture</span><button class="diagram-enlarge" id="diagram-enlarge" type="button" aria-haspopup="dialog">Enlarge diagram</button></div>${architectureCanvas('opening')}${flowControls('opening')}<figcaption class="architecture-caption"><div class="architecture-detail" aria-live="polite" data-architecture-detail><strong>${ARCHITECTURE_OVERVIEW.title}</strong><p>${ARCHITECTURE_OVERVIEW.description}</p></div><div class="architecture-citation"><span>Schematic animation</span><a class="architecture-source" href="https://arxiv.org/abs/1706.03762" target="_blank" rel="noopener noreferrer">Vaswani et al. (2017), Figure 1</a></div></figcaption></figure>
</header>
<dialog class="architecture-dialog" id="architecture-dialog" aria-labelledby="dialog-title"><div class="dialog-heading"><h2 id="dialog-title">Transformer architecture</h2><button id="diagram-close" type="button">Close</button></div>${architectureCanvas('enlarged')}${flowControls('enlarged')}<div class="architecture-detail" aria-live="polite" data-architecture-detail><strong>${ARCHITECTURE_OVERVIEW.title}</strong><p>${ARCHITECTURE_OVERVIEW.description}</p></div><div class="architecture-citation"><span>Schematic animation</span><a class="architecture-source" href="https://arxiv.org/abs/1706.03762" target="_blank" rel="noopener noreferrer">Vaswani et al. (2017), Figure 1</a></div></dialog>
<div class="page-shell"><aside class="contents-rail"><nav aria-label="Contents"><span class="rail-label">Contents</span><a href="#introduction" class="toc-link">Introduction</a><a href="#prerequisites" class="toc-link">Prerequisites</a>${contentsList(false)}</nav></aside>
<div class="reading-column">
<details class="mobile-contents"><summary>Contents</summary><nav aria-label="Mobile contents"><a href="#introduction">Introduction</a><a href="#prerequisites">Prerequisites</a>${contentsList(true)}</nav></details>
<main class="essay-body" id="essay">${body}</main>
<footer class="essay-footer"><div><a href="${siteUrl}/">← All essays</a><a href="#top">Back to top</a></div></footer>
</div></div></body></html>`;
await mkdir('dist/assets/katex', {recursive:true});
await cp('public', 'dist', {recursive:true});
const publicAssets=(await readdir('public')).filter(file=>/\.(js|css)$/.test(file)).sort();
const digest=createHash('sha256').update(source);
for(const file of publicAssets)digest.update(await readFile('public/'+file));
const assetRevision=digest.digest('hex').slice(0,12);
for(const file of publicAssets.filter(file=>file.endsWith('.js'))){
  const code=await readFile('public/'+file,'utf8');
  await writeFile('dist/'+file,code.replace(/(\bfrom\s+)(['"])(\.{1,2}\/[^'"]+\.js)\2/g,(_,from,quote,path)=>`${from}${quote}${path}?v=${assetRevision}${quote}`));
}
await cp('node_modules/katex/dist/katex.min.css','dist/assets/katex/katex.min.css');
await cp('node_modules/katex/dist/fonts','dist/assets/katex/fonts',{recursive:true});
await writeFile('dist/index.html',html.replace(/((?:href|src)=")([^"]+\.(?:css|js))(")/g,(match,start,path,end)=>path.startsWith('http')?match:`${start}${path}?v=${assetRevision}${end}`));
console.log(`Built foundations: ${words} words.`);
