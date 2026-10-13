import { PRESETS, swapWords, wordCounts, sentenceText, describeOrder } from './sentence-model.js';
import { TRANSFORMER_STAGES } from './transformer-model.js';
import { FLOW_STEPS, createFlowPlayer } from './flow-player.js';
import { createPageMotion } from './page-motion.js';
import { createAttentionStudy } from './attention-study.js';
import { createGrammarExplorer } from './grammar-explorer.js';
import { createRepresentationExplorer } from './representation-explorer.js';
import { createEmbeddingExplorer } from './embedding-explorer.js';
import { createContextMixer, createSequenceAttention } from './context-explorers.js';
import { createSumWalkthrough } from './sum-walkthrough.js';
import { createProjectionComparison } from './projection-comparison.js';
import {createScoreStudy,createValueStudy,createPositionStudy,createScaleStudy} from './attention-studies.js';
import {createGeometryStudy} from './geometry-study.js';
import {createWordRelevanceStudy} from './word-relevance-study.js';
import {createChapterAtlas} from './chapter-atlas.js';
import {createBlockStudy} from './block-study.js';
import {createArchitectureOperations} from './architecture-operations.js';
import {createCompletionStudies} from './completion-studies.js';
import {createSymbolHints} from './symbol-hints.js';

const root = document.documentElement;
const themeButton = document.getElementById('theme-toggle');
let theme;
try { theme = localStorage.getItem('language-notes-theme'); } catch {}
if (theme === 'light' || theme === 'dark') root.dataset.theme = theme;
const updateThemeButton = () => {
  const dark = root.dataset.theme === 'dark' || (!root.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
  themeButton.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`);
};
updateThemeButton();
themeButton.addEventListener('click', () => {
  const dark = root.dataset.theme === 'dark' || (!root.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
  root.dataset.theme = dark ? 'light' : 'dark';
  try { localStorage.setItem('language-notes-theme', root.dataset.theme); } catch {}
  updateThemeButton();
});

const progress = document.getElementById('reading-progress');
const progressPercent = document.getElementById('reading-percent');
const updateProgress = () => {
  const available = document.documentElement.scrollHeight - innerHeight;
  const fraction=available > 0 ? Math.min(1,Math.max(0,scrollY/available)) : 0;
  const percent=Math.round(fraction*100);
  progress.style.transform = `scaleX(${fraction})`;
  progressPercent.textContent=percent+'%';
  progress.parentElement.setAttribute('aria-valuenow',String(percent));
};
addEventListener('scroll', updateProgress, {passive:true});
addEventListener('resize', updateProgress);
document.addEventListener('load',updateProgress,true);
document.fonts?.ready.then(updateProgress);
if(typeof ResizeObserver!=='undefined')new ResizeObserver(updateProgress).observe(document.documentElement);
updateProgress();
const links = [...document.querySelectorAll('.toc-link')];
const headings = links.map(link => document.querySelector(link.getAttribute('href')));
let activeChapter;
const openChapter=chapter=>document.querySelectorAll('[data-contents-chapter]').forEach(detail=>{detail.open=detail.dataset.contentsChapter===chapter;});
const updateContents = () => {
  let active = headings[0];
  for (const heading of headings) if (heading.getBoundingClientRect().top <= 180) active = heading;
  links.forEach(link => {
    const selected = link.getAttribute('href') === `#${active.id}`;
    link.classList.toggle('active',selected);
    if (selected) link.setAttribute('aria-current','location'); else link.removeAttribute('aria-current');
  });
  const chapter=links.find(link=>link.getAttribute('href')===`#${active.id}`)?.closest('[data-contents-chapter]')?.dataset.contentsChapter;
  document.querySelectorAll('[data-contents-chapter]').forEach(detail=>{detail.dataset.current=String(detail.dataset.contentsChapter===chapter);});
  if(chapter!==activeChapter){activeChapter=chapter;openChapter(chapter);}
};
addEventListener('scroll', updateContents, {passive:true});
updateContents();
document.querySelectorAll('[data-contents-chapter] a').forEach(link=>link.addEventListener('click',()=>openChapter(link.closest('[data-contents-chapter]').dataset.contentsChapter)));
document.querySelectorAll('.mobile-contents a').forEach(link=>link.addEventListener('click',()=>{document.querySelector('.mobile-contents').open=false;}));

const openingSurfaces={querySelectorAll:selector=>[...document.querySelectorAll(selector)].filter(node=>node.closest('.essay-header,#architecture-dialog'))};
const architectureNodes=[...openingSurfaces.querySelectorAll('[data-transformer-node]')];
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
const pageMotion=createPageMotion(document,motionPreference);
createGrammarExplorer(document.querySelector('[data-grammar-explorer]'),{motion:pageMotion});
createRepresentationExplorer(document.querySelector('[data-representation-explorer]'),{motion:pageMotion});
createEmbeddingExplorer(document.querySelector('[data-embedding-explorer]'),{motion:pageMotion,preference:motionPreference});
createContextMixer(document.querySelector('[data-context-mixer]'));
createWordRelevanceStudy(document.querySelector('[data-word-relevance]'),{preference:motionPreference});
createSumWalkthrough(document.querySelector('[data-sum-walkthrough]'),{preference:motionPreference});
createProjectionComparison(document.querySelector('[data-projection-comparison]'),{preference:motionPreference});
createScoreStudy(document.querySelector('[data-score-study]'),{preference:motionPreference});
createValueStudy(document.querySelector('[data-value-study]'));
createPositionStudy(document.querySelector('[data-position-study]'));
createScaleStudy(document.querySelector('[data-scale-study]'));
openingSurfaces.querySelectorAll('.essay-body [data-geometry-study]').forEach(element=>createGeometryStudy(element,{preference:motionPreference}));
createSequenceAttention(document.querySelector('[data-sequence-attention]'),{motion:pageMotion,preference:motionPreference});
let overviewOnly=true,diagramRunning=false,inspectedExpansion=null;
const attentionStudy=createAttentionStudy(openingSurfaces,motionPreference,{onInspect:()=>flowPlayer.pause()});
const operationStudy=createArchitectureOperations(openingSurfaces,motionPreference,{onInspect:()=>flowPlayer.pause()});
const setExpandedStage=key=>{
  openingSurfaces.querySelectorAll('[data-stage-expansion]').forEach(panel=>{
    const expanded=panel.dataset.stageExpansion===key;
    panel.dataset.expanded=String(expanded);panel.setAttribute('aria-hidden',String(!expanded));
    if(panel.hasAttribute('data-attention-study')||panel.hasAttribute('data-stage-study')){
      expanded?panel.removeAttribute('inert'):panel.setAttribute('inert','');
    }
  });
  const attentionOpen=key==='1';
  const operationOpen=openingSurfaces.querySelectorAll('[data-stage-study]').some(panel=>panel.dataset.stageExpansion===key);
  openingSurfaces.querySelectorAll('.architecture-canvas').forEach(canvas=>{
    canvas.dataset.attentionOpen=String(attentionOpen);
    canvas.dataset.operationOpen=String(operationOpen);
    canvas.querySelector('.transformer-svg').setAttribute('aria-hidden',String(attentionOpen||operationOpen));
  });
  architectureNodes.forEach(node=>{
    node.setAttribute('aria-expanded',String(node.dataset.expansionKey===key));
    node.setAttribute('tabindex',attentionOpen||operationOpen?'-1':'0');
  });
  attentionStudy.update({active:attentionOpen,running:diagramRunning});
  operationStudy.update({key:operationOpen?key:null,running:diagramRunning});
};
const flowPlayer=createFlowPlayer({autoplay:!motionPreference.matches,delay:index=>index===1?11200:9200,onChange:state=>{
  const step=FLOW_STEPS[state.index],stage=TRANSFORMER_STAGES[step.stage];
  diagramRunning=state.running;
  if(state.playing)inspectedExpansion=null;
  if(state.index!==0&&state.playing)overviewOnly=false;
  setExpandedStage(overviewOnly?null:inspectedExpansion??String(state.index));
  openingSurfaces.querySelectorAll('.transformer-svg').forEach(svg=>{
    svg.dataset.step=state.index;svg.dataset.motion=state.running?'playing':'paused';
  });
  architectureNodes.forEach(node=>{
    node.dataset.active=String(Number(node.dataset.flowStep)===state.index);
    node.setAttribute('aria-pressed',String(Number(node.dataset.flowStep)===state.index&&node.dataset.transformerNode===step.stage));
  });
  openingSurfaces.querySelectorAll('[data-flow-phase]').forEach(group=>{group.dataset.active=String(Number(group.dataset.flowPhase)===state.index);});
  openingSurfaces.querySelectorAll('[data-flow-toggle]').forEach(button=>{
    button.textContent=state.playing?'Pause':'Play';button.setAttribute('aria-pressed',String(state.playing));
  });
  openingSurfaces.querySelectorAll('[data-flow-position]').forEach(label=>{label.textContent=`${state.index+1} / ${FLOW_STEPS.length}`;});
  openingSurfaces.querySelectorAll('[data-flow-scrubber]').forEach(input=>{
    input.value=state.index;input.setAttribute('aria-valuetext',step.title);input.style.setProperty('--flow-percent',`${state.index/(FLOW_STEPS.length-1)*100}%`);
  });
  openingSurfaces.querySelectorAll('[data-architecture-detail]').forEach(detail=>{
    detail.setAttribute('aria-live',state.playing?'off':'polite');
    detail.querySelector('strong').textContent=step.title;detail.querySelector('p').textContent=stage.description;
  });
}});
openingSurfaces.querySelectorAll('[data-flow-toggle]').forEach(button=>button.addEventListener('click',()=>{overviewOnly=false;flowPlayer.state().playing?flowPlayer.pause():flowPlayer.play();}));
openingSurfaces.querySelectorAll('[data-flow-next]').forEach(button=>button.addEventListener('click',()=>{overviewOnly=false;inspectedExpansion=null;flowPlayer.step();}));
openingSurfaces.querySelectorAll('[data-flow-restart]').forEach(button=>button.addEventListener('click',()=>{overviewOnly=true;inspectedExpansion=null;flowPlayer.restart();}));
openingSurfaces.querySelectorAll('[data-flow-scrubber]').forEach(input=>input.addEventListener('input',()=>{overviewOnly=false;inspectedExpansion=null;flowPlayer.select(Number(input.value));}));
openingSurfaces.querySelectorAll('[data-stage-expansion]').forEach(panel=>panel.addEventListener('click',()=>{if(flowPlayer.state().playing)flowPlayer.pause();}));
motionPreference.addEventListener?.('change',event=>{if(event.matches)flowPlayer.pause();});
const selectStage = (id,key) => {
  const stage=TRANSFORMER_STAGES[id];
  if(!stage)return;
  inspectedExpansion=key;
  setExpandedStage(key);
  architectureNodes.forEach(node=>node.setAttribute('aria-pressed',String(node.dataset.transformerNode===id&&node.dataset.expansionKey===key)));
  openingSurfaces.querySelectorAll('[data-architecture-detail]').forEach(detail=>{
    detail.querySelector('strong').textContent=stage.title;
    detail.querySelector('p').textContent=stage.description;
  });
};
architectureNodes.forEach(node=>{
  const inspect=()=>{overviewOnly=false;inspectedExpansion=null;flowPlayer.select(Number(node.dataset.flowStep));selectStage(node.dataset.transformerNode,node.dataset.expansionKey);};
  node.addEventListener('click',inspect);
  node.addEventListener('keydown',event=>{
    if(event.key==='Enter'||event.key===' '){
      event.preventDefault();inspect();
      if(node.dataset.expansionKey==='1')node.closest('.architecture-canvas').querySelector('[data-attention-back]').focus();
      else node.closest('.architecture-canvas').querySelector(`[data-stage-expansion="${node.dataset.expansionKey}"] [data-stage-back]`)?.focus();
    }
  });
});
openingSurfaces.querySelectorAll('[data-attention-back],[data-stage-back]').forEach(button=>button.addEventListener('click',()=>{
  const returnKey=button.closest('[data-stage-expansion]').dataset.stageExpansion;
  overviewOnly=true;inspectedExpansion=null;flowPlayer.pause();setExpandedStage(null);
  architectureNodes.forEach(node=>node.setAttribute('aria-pressed','false'));
  openingSurfaces.querySelectorAll('[data-architecture-detail]').forEach(detail=>{
    detail.querySelector('strong').textContent='The original transformer';
    detail.querySelector('p').textContent='Encoder–decoder architecture, Vaswani et al. (2017). Select a component to inspect it.';
  });
  button.closest('.architecture-canvas').querySelector(`[data-expansion-key="${returnKey}"]`)?.focus();
}));
const architectureDialog=document.getElementById('architecture-dialog');
const enlargeButton=document.getElementById('diagram-enlarge');
let openingVisible=true;
const updateAnimationVisibility=()=>{
  const visible=!document.hidden&&(openingVisible||architectureDialog.hasAttribute('open'));
  flowPlayer.setVisible(visible);
  if(!visible)operationStudy.suspend();
};
if(typeof IntersectionObserver!=='undefined'){
  const observer=new IntersectionObserver(entries=>{openingVisible=entries[0].isIntersecting;updateAnimationVisibility();},{threshold:.12});
  observer.observe(document.querySelector('.architecture-plate'));
}
document.addEventListener('visibilitychange',updateAnimationVisibility);
updateAnimationVisibility();
enlargeButton.addEventListener('click',()=>{architectureDialog.showModal();updateAnimationVisibility();});
document.getElementById('diagram-close').addEventListener('click',()=>architectureDialog.close());
architectureDialog.addEventListener('close',()=>{enlargeButton.focus();updateAnimationVisibility();});
architectureDialog.addEventListener('click',event=>{if(event.target===architectureDialog)architectureDialog.close();});
document.querySelectorAll('[data-chapter-atlas]').forEach(element=>createChapterAtlas(element,{preference:motionPreference}));
document.querySelectorAll('[data-block-study]').forEach(element=>createBlockStudy(element,{preference:motionPreference}));
createCompletionStudies(document,motionPreference);
createSymbolHints(document);

let words = [...PRESETS.dog], selected = null;
const wordButtons = [...document.querySelectorAll('[data-word-index]')];
const renderWords = () => {
  wordButtons.forEach((button,i)=>{
    button.textContent=words[i];
    button.setAttribute('aria-label',`Word ${i+1}: ${words[i]}`);
    button.setAttribute('aria-pressed',String(selected===i));
    button.dataset.kind=words[i]==='dog'?'dog':words[i]==='cat'?'cat':'neutral';
  });
  document.getElementById('sentence-reading').textContent=sentenceText(words);
  document.getElementById('order-detail').textContent=describeOrder(words);
  document.getElementById('selection-hint').textContent=selected===null?'No word selected':`Selected: ${words[selected]}. Choose another word.`;
  const counts=wordCounts(words), list=document.getElementById('count-list');
  list.replaceChildren();
  for(const word of ['the','dog','chased','cat']) {
    const dt=document.createElement('dt'),dd=document.createElement('dd');
    dt.textContent=word; dd.textContent=counts[word]; list.append(dt,dd);
  }
  document.querySelectorAll('[data-preset]').forEach(button=>button.setAttribute('aria-pressed',String(PRESETS[button.dataset.preset].join(' ')===words.join(' '))));
};
const changeWords=next=>{
  const previous=[...words],origins=wordButtons.map(button=>button.getBoundingClientRect());
  words=next;selected=null;renderWords();
  if(previous.some((word,index)=>word!==next[index])){
    pageMotion.exchange(wordButtons,previous,next,origins);
    pageMotion.feedback(document.getElementById('sentence-reading'));
    pageMotion.feedback(document.getElementById('order-detail'));
  }
};
wordButtons.forEach((button,i)=>button.addEventListener('click',()=>{
  if(selected===null)selected=i;
  else if(selected===i)selected=null;
  else {changeWords(swapWords(words,selected,i));return;}
  renderWords();
}));
document.querySelectorAll('[data-preset]').forEach(button=>button.addEventListener('click',()=>changeWords([...PRESETS[button.dataset.preset]])));
document.getElementById('counts-toggle').addEventListener('click',event=>{
  const panel=document.getElementById('word-counts'); panel.hidden=!panel.hidden;
  event.currentTarget.setAttribute('aria-expanded',String(!panel.hidden));
  event.currentTarget.textContent=panel.hidden?'Compare word counts':'Hide word counts';
});
renderWords();
