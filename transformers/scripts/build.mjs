import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {evaluate} from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import {pathToFileURL} from 'node:url';
import {LAB_LABELS,cacheView,tilesView,expertsView,precisionView,speculationView} from '../public/views.js';
import {ropeStudy} from '../public/rope-view.js';
import {extensionStudy} from '../public/extension-views.js';
import {expertArchitecture} from '../public/expert-architecture.js';
import {overviewHero} from '../public/overview-view.js';
const pages=[
 {slug:'index',title:'Transformers in Practice',short:'Overview',number:'00',description:'An extension to the original Transformer foundations.'},
 {slug:'rope',title:'Rotary position embedding (RoPE)',short:'RoPE',number:'01',part:'Architecture',description:'A geometric construction for position-dependent attention comparisons.'},
 {slug:'attention',title:'Attention variants',short:'Attention variants',number:'02',part:'Architecture',description:'Sliding windows, sparse patterns, and linear attention.'},
 {slug:'experts',title:'Mixture of experts (MoE)',short:'MoE',number:'03',part:'Architecture',description:'Routing, expert matrices, and the distinction between stored and active parameters.'},
 {slug:'multimodal',title:'Multimodal inputs',short:'Multimodal inputs',number:'04',part:'Architecture',description:'Pixels, patches, vision features, and connections to text representations.'},
 {slug:'pretraining',title:'Pre-training',short:'Pre-training',number:'05',part:'Learning and adaptation',description:'From recorded text to prediction losses, gradients, and learned parameters.'},
 {slug:'posttraining',title:'Post-training',short:'Post-training',number:'06',part:'Learning and adaptation',description:'Demonstrations, loss masks, preferences, and rewards.'},
 {slug:'lora',title:'Low-rank adaptation (LoRA)',short:'LoRA',number:'07',part:'Learning and adaptation',description:'Two paths through a frozen base and a low-rank update.'},
 {slug:'memory',title:'KV cache and FlashAttention',short:'KV cache',number:'08',part:'Generation and serving',description:'KV caches, shared heads, and attention without a saved score matrix.'},
 {slug:'precision',title:'Quantization',short:'Quantization',number:'09',part:'Generation and serving',description:'Integer grids, reconstruction error, and what low precision actually saves.'},
 {slug:'thought',title:'Chain of thought',short:'Chain of thought',number:'10',part:'Generation and serving',description:'Intermediate context, probability, verification, and unfaithful explanations.'},
 {slug:'speculation',title:'Speculative decoding',short:'Speculative decoding',number:'11',part:'Generation and serving',description:'A probability-preserving way to propose and verify continuations.'}
];
const escape=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const anchors=s=>s.toLowerCase().replace(/[^\p{L}\p{N} ]/gu,'').trim().replace(/\s+/g,'-');
const label=(name,title)=>`<label>${title} <output data-option-label="${name}"></output>`;
const select=(name,title,values,initial)=>`<label>${title}<select data-option="${name}">${values.map(v=>`<option value="${v}" ${v===initial?'selected':''}>${v}</option>`).join('')}</select></label>`;
const range=(name,title,min,max,step,value)=>label(name,title)+`<input type="range" data-option="${name}" min="${min}" max="${max}" step="${step}" value="${value}"></label>`;
const options={
 cache:range('n','Toy prefix length',3,8,1,4)+select('heads','KV heads',[1,4,8,32],8)+select('tokens','Cache tokens',[2048,4096,8192,32768],4096),
 tiles:'',
 experts:range('x2','Second input coordinate',-1,1,.1,0)+select('k','Active experts',[1,2,3,4],2),
 precision:select('bits','Weight bits',[2,3,4,8],4)+range('scale','Grid scale',.05,.5,.01,.1),
 speculation:range('draft','Draft probability of A',.3,.8,.01,.6)+select('proposal','Inspect proposal',[0,1,2],0)+range('draw','Uniform acceptance draw',0,.99,.01,.9)
};
const views={cache:cacheView,tiles:tilesView,experts:expertsView,precision:precisionView,speculation:speculationView};
function lab(kind){return `<section class="lab" data-lab="${kind}" data-step="0" data-running="false" aria-label="${kind} numerical illustration"><div class="lab-heading"><span>Compute and inspect</span><h3>${{cache:'Keep the old rows',tiles:'Softmax one tile at a time',experts:'A token passes through selected experts',precision:'Follow each rounded weight',speculation:'Where the probability mass goes'}[kind]}</h3></div><div class="lab-options">${options[kind]}</div><div data-lab-view>${views[kind]({})}</div><ol class="lab-stages">${LAB_LABELS[kind].map((text,i)=>`<li><button type="button" data-lab-step="${i}" aria-pressed="${i===0}">${i+1}. ${text}</button></li>`).join('')}</ol><div class="lab-playback"><button type="button" data-lab-play aria-pressed="false">Play</button><button type="button" data-lab-next>Next</button><button type="button" data-lab-reset>Restart</button></div></section>`;}
const siteUrl=(process.env.SITE_URL||'https://iamyanbo.github.io/llm-notes').replace(/\/$/,'');
const sourceLink=siteUrl+'/foundations/';
const headingAnchors=JSON.parse(await readFile('scripts/heading-anchors.json','utf8'));
const statements=new Map();
const statement=(kind,{children,id,number})=>React.createElement('aside',{id,className:'statement '+kind.toLowerCase(),'aria-label':`${kind} ${number}`},React.createElement('span',{className:'statement-label'},`${kind} ${number}`),children);
const components={
 ExpertArchitecture:()=>React.createElement('div',{dangerouslySetInnerHTML:{__html:expertArchitecture()}}),
 ExtensionStudy:({kind})=>React.createElement('div',{dangerouslySetInnerHTML:{__html:extensionStudy(kind)}}),
 RopeStudy:({kind})=>React.createElement('div',{dangerouslySetInnerHTML:{__html:ropeStudy(kind)}}),
 Lab:({kind})=>React.createElement('div',{dangerouslySetInnerHTML:{__html:lab(kind)}}),
 h2:({children})=>React.createElement('h2',{id:anchors(String(children))},children),
 h3:({children})=>React.createElement('h3',{id:anchors(String(children))},children),
 Note:({children})=>React.createElement('aside',{className:'author-note'},children),
 Definition:props=>statement('Definition',props),
 Lemma:props=>statement('Lemma',props),
 Proposition:props=>statement('Proposition',props),
 Theorem:props=>statement('Theorem',props),
 StatementRef:({id})=>{const s=statements.get(id);if(!s)throw new Error('Unknown mathematical statement: '+id);return React.createElement('a',{href:'#'+id},`${s.kind} ${s.number}`);},
 Proof:({children})=>{
   const parts=React.Children.toArray(children),last=parts.findLastIndex(React.isValidElement);
   const end=React.createElement('span',{className:'qed','aria-label':'End of proof'},'\u25a1');
   if(last>=0)parts[last]=React.createElement('div',{className:'proof-conclusion'},parts[last],end);
   else parts.push(end);
   return React.createElement('div',{className:'proof'},React.createElement('strong',{className:'proof-label'},'Proof.'),...parts);
 },
};
await mkdir('dist/assets/katex',{recursive:true});await cp('public','dist',{recursive:true});
await cp('node_modules/katex/dist/katex.min.css','dist/assets/katex/katex.min.css');await cp('node_modules/katex/dist/fonts','dist/assets/katex/fonts',{recursive:true});
const revision=createHash('sha256');
for(const file of ['overview.css','overview-model.js','overview-view.js','overview-controller.js','expert-architecture.js','rotary-attention.js','attention.css','attention-models.js','attention-views.js','extensions.css','extension-models.js','extension-views.js','extension-controller.js','patch-data.js','rope.css','rope-model.js','rope-view.js','rope-controller.js','styles.css','theme.css','reader.css','contents.css','reader.js','app.js','models.js','views.js','flow.js'])revision.update(await readFile('public/'+file));
const hash=revision.digest('hex').slice(0,12);
for(const file of ['overview-model.js','overview-view.js','overview-controller.js','rotary-attention.js','attention-models.js','attention-views.js','extension-models.js','extension-views.js','extension-controller.js','patch-data.js','rope-model.js','rope-view.js','rope-controller.js','reader.js','app.js','models.js','views.js','flow.js']){const code=await readFile('public/'+file,'utf8');await writeFile('dist/'+file,code.replace(/(from\s+['"])(\.\/[^'"]+\.js)(['"])/g,`$1$2?v=${hash}$3`));}
const chapters=[];
for(const page of pages){
 let statementNumber=0;
 const source=((await readFile('content/'+page.slug+'.mdx','utf8')).replaceAll('https://iamyanbo.github.io/llm-notes',siteUrl)).replace(/<(Definition|Lemma|Proposition|Theorem)([^>]*)>/g,(_,kind,attrs)=>{
   const number=`${Number(page.number)}.${++statementNumber}`,id=attrs.match(/\bid="([^"]+)"/)?.[1]??`${page.slug}-${kind.toLowerCase()}-${statementNumber}`;
   if(statements.has(id))throw new Error('Duplicate mathematical statement: '+id);
   statements.set(id,{kind,number});
   return `<${kind}${attrs}${attrs.includes('id=')?'':` id="${id}"`} number="${number}">`;
 });
 const {default:Essay}=await evaluate(source,{...runtime,baseUrl:pathToFileURL(process.cwd()+'/'),remarkPlugins:[remarkMath],rehypePlugins:[rehypeKatex]});
 const prefix=page.slug==='index'?'':page.slug+'-';
 const headingAnchor=title=>headingAnchors[page.slug]?.[title]??anchors(title);
 const headings=[...source.matchAll(/^## (.+)$/gm)].map((m,i)=>({title:m[1],id:prefix+headingAnchor(m[1]),old:headingAnchor(m[1]),number:page.slug==='index'?null:`${Number(page.number)}.${i+1}`}));
 const heading=level=>({children})=>{
   const title=String(children),number=level==='h3'?headings.find(h=>h.title===title)?.number:null;
   return React.createElement(level,{id:prefix+headingAnchor(title)},number?`${number} `:null,children);
 };
 const body=renderToStaticMarkup(React.createElement(Essay,{components:{...components,h2:heading('h3'),h3:heading('h4')}}))
   .replace(/href="(index|memory|experts|precision|speculation|rope|attention|pretraining|posttraining|lora|thought|multimodal)\.html"/g,(_,slug)=>`href="#${slug==='index'?'introduction':slug}"`);
 chapters.push({...page,body,headings,id:page.slug==='index'?'introduction':page.slug});
 console.log(page.slug+': '+source.split(/\s+/).length+' words');
}
function contentsList(mobile=false){
 const link=(chapter,id,title,number,main=false)=>`<a class="toc-link ${main?'contents-section':mobile?'contents-subsection':'toc-subsection'}" href="#${id}" data-contents-link="${id}" data-contents-owner="${chapter.id}" ${main?`data-chapter-link="${chapter.id}"`:''}><span class="contents-number">${number}</span><span class="contents-title">${escape(title)}</span></a>`;
 const introduction=`<a class="toc-link" href="#introduction" data-chapter-link="introduction" data-contents-link="introduction" data-contents-owner="introduction">Introduction</a>`;
 const sections=chapters.slice(1).map((chapter,i)=>`${i===0||chapter.part!==chapters[i].part?`<li class="contents-part">${escape(chapter.part)}</li>`:''}<li><details data-contents-chapter="${chapter.id}"><summary>${link(chapter,chapter.id,chapter.title,Number(chapter.number),true)}<span class="contents-expand" aria-hidden="true"></span></summary><ul class="contents-subsections">${chapter.headings.map(heading=>`<li>${link(chapter,heading.id,heading.title,heading.number)}</li>`).join('')}</ul></details></li>`).join('');
 return introduction+`<ul class="contents-sections">${sections}</ul><a class="toc-link" href="#ending-thoughts" data-contents-link="ending-thoughts" data-contents-owner="ending-thoughts">Ending thoughts</a>`;
}
const sidebar=`<aside class="contents-rail"><nav aria-label="Contents"><span class="rail-label">Contents</span>${contentsList()}</nav></aside>`;
const mobileContents=`<details class="mobile-contents"><summary>Contents</summary><nav aria-label="Mobile contents">${contentsList(true)}</nav></details>`;
const hero=overviewHero();
const {default:Ending}=await evaluate(await readFile('content/ending.mdx','utf8'),{...runtime,baseUrl:pathToFileURL(process.cwd()+'/')});
const ending=`<section class="reader-ending" id="ending-thoughts" aria-labelledby="ending-thoughts-title"><header class="chapter-heading"><h2 id="ending-thoughts-title">Ending thoughts</h2></header>${renderToStaticMarkup(React.createElement(Ending))}</section>`;
for(const entry of chapters){
 const body=chapters.map(chapter=>{
   // Keep incoming subsection links on the earlier article URLs usable.
   let body=chapter.body;
   if(entry.slug===chapter.slug&&entry.slug!=='index')for(const h of chapter.headings){
     body=body.replace(`<h3 id="${h.id}"`,`<span class="anchor-alias" id="${h.old}" aria-hidden="true"></span><h3 id="${h.id}"`);
   }
   const title=chapter.slug==='index'?'Introduction':`${Number(chapter.number)}. ${chapter.title}`;
   return `<section class="reader-chapter" id="${chapter.id}" aria-labelledby="${chapter.id}-title"><header class="chapter-heading"><h2 id="${chapter.id}-title">${escape(title)}</h2></header>${body}</section>`;
 }).join('');
 const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>Transformers in Practice · Yanbo - LLM's</title><meta name="description" content="${escape(pages[0].description)}"><link rel="canonical" href="${siteUrl}/transformers/"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Source+Serif+4:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet"><link rel="stylesheet" href="assets/katex/katex.min.css"><link rel="stylesheet" href="styles.css?v=${hash}"><link rel="stylesheet" href="theme.css?v=${hash}"><link rel="stylesheet" href="reader.css?v=${hash}"><link rel="stylesheet" href="contents.css?v=${hash}"><link rel="stylesheet" href="rope.css?v=${hash}"><link rel="stylesheet" href="extensions.css?v=${hash}"><link rel="stylesheet" href="attention.css?v=${hash}"><link rel="stylesheet" href="overview.css?v=${hash}"><script type="module" src="app.js?v=${hash}"></script></head><body data-entry-chapter="${entry.id}"><a class="skip" href="#essay">Skip to essay</a><div class="reading-progress" data-reading-progress role="progressbar" aria-label="Reading progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div data-reading-fill></div></div><span class="reading-percent" data-reading-percent aria-hidden="true">0%</span><header class="topbar"><a class="brand" href="${siteUrl}/"><span class="brand-name">Yanbo - LLM's</span></a><div class="top-actions"><button class="theme-button" type="button" data-theme-toggle aria-label="Switch to dark theme">◐</button></div></header><header class="title-region" id="top"><a class="series-link" href="${sourceLink}">← Attention &amp; Transformer foundations</a><h1>Transformers in Practice</h1><p class="subtitle">${escape(pages[0].description)}</p><div class="reader-actions"><a class="begin-link" href="#introduction">Begin reading</a></div></header>${hero}<div class="reading-shell">${sidebar}<div class="reading-column">${mobileContents}<main class="essay" id="essay">${body}${ending}<div class="essay-outro"><p>Thanks for reading!</p><figure><img src="assets/dog-cat-happy-paper.png" width="1536" height="1024" loading="lazy" alt="The same golden retriever and tabby cat, happy and looking toward the reader"></figure></div></main><footer class="essay-footer"><div><a href="${sourceLink}">← Return to Foundations</a><a href="#introduction">Return to the introduction ↑</a></div><p>The numerical examples and toy training run locally, with stated initial parameters; no hosted language model is called.</p></footer></div></div></body></html>`;
 await writeFile('dist/'+entry.slug+'.html',html);
}
