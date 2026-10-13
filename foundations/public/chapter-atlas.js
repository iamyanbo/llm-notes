import {TRANSFORMER_STAGES} from './transformer-model.js';
import {createAttentionStudy} from './attention-study.js';
import {createArchitectureOperations} from './architecture-operations.js';
export const ATLAS_STEPS={
  attention:[
    {label:'Inputs',title:'One representation at each position',description:'X contains the available input vectors. Attention will produce one output for each receiving position.',anchor:'position-information',formula:0},
    {label:'Q · K · V',title:'Three maps of the same inputs',description:'Queries and keys choose coordinates for comparison. Values choose the coordinates that will be transmitted. Each map receives X independently.',anchor:'transmitting-values',formula:1},
    {label:'Scores',title:'Compare, then scale',description:'Each receiving query is compared with every candidate key. Divide the dot products by √dₖ. Values bypass this calculation.',anchor:'score-scale',formula:2},
    {label:'Weights',title:'Turn each score row into contributions',description:'Softmax acts separately on every receiving row. Its positive weights sum to one; changing one score can change every weight in that row.',anchor:'scores-to-weights',formula:3},
    {label:'Output',title:'Bring the weighted values together',description:'Each weight multiplies a candidate value vector. Adding these contributions produces a contextual output at the receiving position.',anchor:'attention-computation',formula:4},
  ],
  transformer:[
    {label:'Overview',title:'From one head to a layer',description:'Read the original architecture upward. We will construct the encoder block on the left first, keeping one representation per input position.',anchor:'layer-purpose',phase:0,expansion:null},
    {label:'Heads',title:'Keep several comparisons available',description:'Parallel heads have separate query, key, and value maps. Concatenate their outputs, then project them back to the representation width.',anchor:'parallel-heads',phase:1,expansion:'1'},
    {label:'Residual',title:'Add an update to the existing representation',description:'The bypass carries the sublayer input around the attention computation. Addition reunites that input with the attention output.',anchor:'residual-connections',phase:1,expansion:'norm-114-418'},
    {label:'Feed-forward',title:'Process the features at each position',description:'After gathering context, the same nonlinear network processes each position separately. It introduces no additional exchange between positions.',anchor:'processing-features',phase:2,expansion:'2'},
    {label:'Normalize',title:'Normalize the coordinates of one representation',description:'In the original block, layer normalization follows each residual addition. Its statistics use the coordinates of one position, not the other words.',anchor:'layer-normalization',phase:2,expansion:'norm-114-302'},
    {label:'Repeat',title:'The output becomes the next layer’s input',description:'Another block receives contextual representations from this block. Its queries and keys can therefore begin with information already gathered from other positions.',anchor:'repeated-blocks',phase:2,expansion:null},
    {label:'Vocabulary',title:'From a representation to token probabilities',description:'The output map produces one logit per vocabulary token. Softmax normalizes these scores into the next-token distribution.',anchor:'vocabulary-readout',phase:6,expansion:'6'},
    {label:'Decoder mask',title:'Read only the available prefix',description:'Causal self-attention excludes later positions before softmax. The current row may read its own input and earlier inputs because it predicts the next token.',anchor:'causal-mask',phase:3,expansion:'3'},
    {label:'Cross-attention',title:'The decoder reads a separate source',description:'The decoder supplies queries; the encoder supplies keys and values. This extra source-reading sublayer belongs to the original encoder–decoder architecture and is omitted in decoder-only language modeling.',anchor:'cross-attention',phase:4,expansion:'4'},
  ],
};

export function createChapterAtlas(root,{preference={matches:false},schedule=setTimeout,cancel=clearTimeout}={}){
  if(!root)return;
  const kind=root.dataset.chapterAtlas,steps=ATLAS_STEPS[kind],doc=root.ownerDocument;
  let index=0,playing=false,timer=null,visible=true,figureVisible=true,entered=false,inspection=null,lastReading=null,returnFocus=null,tourEnd=steps.length-1;
  const dialog=root.querySelector('[data-atlas-dialog]'),dock=root.querySelector('[data-atlas-dock]');
  const attentionStudy=createAttentionStudy(root,preference,{onInspect:state=>{
    if(kind==='attention'&&state){index=[1,2,3,4,4][state.operation];lastAttentionIndex=index;}
    pause();
  },schedule,cancel});
  let lastAttentionIndex=null;
  const operationStudy=kind==='transformer'?createArchitectureOperations(root,preference,{onInspect:()=>pause(),schedule,cancel}):null;
  const clear=()=>{if(timer!==null)cancel(timer);timer=null;};
  const render=()=>{
    const step=steps[index],running=playing&&visible&&!doc.hidden&&!preference.matches;
    const expansion=inspection?.expansion??step.expansion,phase=inspection?.phase??step.phase;
    const description=inspection?TRANSFORMER_STAGES[inspection.node]:{title:step.title,description:step.description};
    root.dataset.atlasStep=String(index);root.dataset.atlasRunning=String(running);
    for(const button of root.querySelectorAll('[data-atlas-step]'))button.setAttribute('aria-pressed',String(Number(button.dataset.atlasStep)===index));
    for(const button of root.querySelectorAll('[data-atlas-play]')){button.textContent=playing?'Pause tour':'Play tour';button.setAttribute('aria-pressed',String(playing));}
    for(const caption of root.querySelectorAll('[data-atlas-caption]')){
      caption.querySelector('strong').textContent=description.title;caption.querySelector('p').textContent=description.description;
      caption.setAttribute('aria-live',playing?'off':'polite');
    }
    for(const equation of root.querySelectorAll('[data-atlas-equation]'))equation.hidden=Number(equation.dataset.atlasEquation)!==index;
    if(dock)dock.textContent=(kind==='attention'?'Attention':'Transformer')+' · '+step.label+' · Open diagram';
    for(const link of root.querySelectorAll('.atlas-reading-link'))link.setAttribute('href','#'+step.anchor);
    for(const svg of root.querySelectorAll('.transformer-svg')){
      svg.dataset.step=String(phase);svg.dataset.motion=running?'playing':'paused';svg.dataset.atlasSection=String(index);
      for(const node of svg.querySelectorAll('[data-transformer-node]')){
        const selected=inspection?node.dataset.expansionKey===expansion&&node.dataset.transformerNode===inspection.node:index===0?node.dataset.transformerNode==='embedding':index===5?node.dataset.flowStep==='1'||node.dataset.flowStep==='2':node.dataset.expansionKey===expansion;
        node.dataset.active=String(selected);node.setAttribute('aria-pressed',String(selected));
        node.setAttribute('aria-expanded',String(node.dataset.expansionKey===expansion));
        node.setAttribute('tabindex',expansion?'-1':'0');
      }
      for(const group of svg.querySelectorAll('[data-flow-phase]'))group.dataset.active=String(Number(group.dataset.flowPhase)===phase);
      for(const panel of svg.querySelectorAll('[data-stage-expansion]')){
        const open=panel.dataset.stageExpansion===expansion;
        panel.dataset.expanded=String(open);panel.setAttribute('aria-hidden',String(!open));
      }
    }
    if(kind==='transformer'){
      for(const panel of root.querySelectorAll('[data-stage-expansion]')){
        const open=panel.dataset.stageExpansion===expansion;
        panel.dataset.expanded=String(open);panel.setAttribute('aria-hidden',String(!open));
        open?panel.removeAttribute('inert'):panel.setAttribute('inert','');
      }
      const attentionOpen=expansion==='1',operationOpen=!!expansion&&!attentionOpen;
      for(const canvas of root.querySelectorAll('.chapter-architecture-canvas')){
        canvas.dataset.attentionOpen=String(attentionOpen);canvas.dataset.operationOpen=String(operationOpen);
        canvas.querySelector('.transformer-svg').setAttribute('aria-hidden',String(attentionOpen||operationOpen));
      }
      attentionStudy.update({active:attentionOpen,running});
      operationStudy.update({key:operationOpen?expansion:null,running});
      if(!visible||doc.hidden)operationStudy.suspend();
    }else{
      for(const panel of root.querySelectorAll('[data-attention-study]')){
        panel.dataset.expanded='true';panel.setAttribute('aria-hidden','false');panel.removeAttribute('inert');
      }
      attentionStudy.update({active:true,running});
      if(index!==lastAttentionIndex){
        lastAttentionIndex=index;attentionStudy.setOperation([0,0,1,2,3][index]);
      }
    }
    for(const node of root.querySelectorAll('[data-atlas-node]'))node.setAttribute('aria-pressed',String(Number(node.dataset.atlasNode)===index));
    for(const group of root.querySelectorAll('[data-atlas-route]'))group.dataset.active=String(Number(group.dataset.atlasRoute)===index);
  };
  const pause=()=>{clear();playing=false;render();};
  const advance=()=>{
    clear();
    if(playing&&visible&&!doc.hidden&&!preference.matches)timer=schedule(()=>{
      timer=null;if(index===tourEnd){pause();return;}
      index++;inspection=null;render();advance();
    },kind==='transformer'?(index===1?11200:9200):4400);
  };
  const select=next=>{if(!Number.isInteger(next)||!steps[next])return;clear();playing=false;inspection=null;index=next;render();};
  const play=()=>{
    tourEnd=kind==='transformer'&&index<6?5:steps.length-1;
    if(preference.matches){select(tourEnd);return;}
    if(index===tourEnd)index=kind==='transformer'&&tourEnd>5?6:0;
    inspection=null;playing=true;render();advance();
  };
  root.querySelectorAll('[data-atlas-play]').forEach(button=>button.addEventListener('click',()=>playing?pause():play()));
  root.querySelectorAll('[data-atlas-next]').forEach(button=>button.addEventListener('click',()=>select((index+1)%steps.length)));
  root.querySelectorAll('[data-atlas-reset]').forEach(button=>button.addEventListener('click',()=>select(0)));
  root.querySelectorAll('[data-atlas-step]').forEach(button=>button.addEventListener('click',()=>select(Number(button.dataset.atlasStep))));
  root.querySelectorAll('[data-attention-back],[data-stage-back]').forEach(button=>button.addEventListener('click',()=>{
    const key=button.closest('[data-stage-expansion]').dataset.stageExpansion;
    select(0);
    if(kind==='attention')attentionStudy.setOperation(0);
    else button.closest('.chapter-architecture-canvas').querySelector(`[data-expansion-key="${key}"]`)?.focus();
  }));
  const open=trigger=>{returnFocus=trigger;pause();dialog.showModal();visible=true;render();};
  root.querySelector('[data-atlas-enlarge]').addEventListener('click',event=>open(event.currentTarget));
  dock?.addEventListener('click',()=>open(dock));
  root.querySelector('[data-atlas-close]').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{visible=figureVisible;pause();returnFocus?.focus();});
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  root.querySelectorAll('[data-atlas-node],[data-transformer-node]').forEach(node=>{
    const inspect=()=>{
      if(node.hasAttribute('data-atlas-node')){select(Number(node.dataset.atlasNode));return;}
      pause();
      const expansion=node.dataset.expansionKey;
      index=expansion.startsWith('norm-')?4:({'1':1,'2':3,'3':7,'4':8,'5':3,'6':6}[expansion]??0);
      inspection={expansion,node:node.dataset.transformerNode,phase:Number(node.dataset.flowStep)};
      render();
    };
    node.addEventListener('click',inspect);
    node.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){
      event.preventDefault();inspect();
      if(kind==='transformer')node.closest('.chapter-architecture-canvas').querySelector(`[data-stage-expansion="${node.dataset.expansionKey}"] [data-attention-back],[data-stage-expansion="${node.dataset.expansionKey}"] [data-stage-back]`)?.focus();
    }});
  });
  const focuses=[...doc.querySelectorAll(`[data-atlas-focus="${kind}"]`)];
  const focusHandlers=focuses.map(button=>{
    const fn=()=>{select(Number(button.dataset.atlasFocusStep));open(button);};button.addEventListener('click',fn);return [button,fn];
  });
  const follow=()=>{
    const start=doc.getElementById(kind==='attention'?'comparisons-to-attention':'attention-to-transformer');
    const end=kind==='attention'?doc.getElementById('attention-to-transformer'):doc.querySelector('.essay-footer');
    if(!start||!end||typeof start.getBoundingClientRect!=='function')return;
    const reading=start.getBoundingClientRect().top<=180&&end.getBoundingClientRect().top>180;
    if(dock)dock.hidden=!reading;
    if(!reading){lastReading=null;return;}
    let next=0,readingAnchor=start.id;
    const readings=kind==='transformer'?[
      ...steps.slice(0,6).map((step,j)=>[step.anchor,j]),
      ['representations-to-predictions',6],['prediction-distribution',6],['vocabulary-readout',6],['vocabulary-probabilities',6],
      ['causal-decoder',7],['causal-mask',7],['prefix-dependence',7],['decoder-only',7],['cross-attention',8],
      ['learning-and-generation',7],['autoregressive-factorization',7],['training-targets',7],
      ['generation-loop',6],['token-decoding',6],['conclusion',6]
    ]:[['scores-to-weights',3],['transmitting-values',1],['position-information',0],['score-scale',2],['attention-computation',4]];
    for(const [anchor,j] of readings){if(doc.getElementById(anchor)?.getBoundingClientRect().top<=180){next=j;readingAnchor=anchor;}}
    const readingKey=readingAnchor+':'+next;
    if(readingKey!==lastReading){lastReading=readingKey;select(next);}
  };
  doc.defaultView?.addEventListener('scroll',follow,{passive:true});
  const hidden=()=>{if(doc.hidden){clear();render();}else{render();advance();}};
  const reduced=()=>{if(preference.matches)pause();};
  doc.addEventListener('visibilitychange',hidden);preference.addEventListener?.('change',reduced);
  let observer;
  if(typeof IntersectionObserver!=='undefined'){
    visible=false;figureVisible=false;
    observer=new IntersectionObserver(entries=>{
      figureVisible=entries[0].isIntersecting;visible=figureVisible||dialog.hasAttribute('open');
      if(visible&&!entered){entered=true;root.dataset.atlasEntered='true';if(!preference.matches){index=0;play();}}
      else{render();advance();}
    },{threshold:.25});
    observer.observe(root.querySelector('[data-atlas-figure]'));
  }
  render();follow();
  return {state:()=>({index,playing,visible}),select,pause,destroy:()=>{clear();attentionStudy?.destroy();operationStudy?.destroy();observer?.disconnect();doc.removeEventListener('visibilitychange',hidden);preference.removeEventListener?.('change',reduced);doc.defaultView?.removeEventListener('scroll',follow);focusHandlers.forEach(([button,fn])=>button.removeEventListener('click',fn));}};
}
