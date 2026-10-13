import {READING_QUESTIONS,readingWeights} from './word-relevance-model.js';
import {relevanceCard,relevanceConnections,relevanceInsight,percentage} from './word-relevance-view.js';

export function createWordRelevanceStudy(element,{preference,schedule=setTimeout,cancel=clearTimeout}={}){
  if(!element)return;
  let example='active',question='actor',uniform=false,showWeights=false,selected=1,timer=null;
  const play=element.querySelector('[data-reading-play]'),words=element.querySelector('[data-reading-words]');
  const pause=()=>{if(timer!==null)cancel(timer);timer=null;play.textContent='Play the questions';play.setAttribute('aria-pressed','false');};
  const render=(replaceWords=false)=>{
    const data=readingWeights(example,question,uniform);
    if(replaceWords)words.innerHTML=data.tokens.map((token,i)=>relevanceCard(token,i,data.weights[i],data.levels[i],i===selected,showWeights)).join('');
    for(const [i,card] of [...words.querySelectorAll('[data-reading-word]')].entries()){
      card.dataset.level=String(data.levels[i]);card.style.setProperty('--share',data.weights[i]*100+'%');
      card.setAttribute('aria-pressed',String(i===selected));
      card.setAttribute('aria-label',data.tokens[i]+', position '+(i+1)+', contribution '+percentage(data.weights[i])+', inspect its role');
      const output=card.querySelector('[data-reading-share]');output.hidden=!showWeights;output.textContent=percentage(data.weights[i]);
    }
    element.querySelector('[data-reading-canvas]').style.setProperty('--word-count',data.tokens.length);
    element.querySelector('[data-reading-sentence]').textContent=data.sentence;
    element.querySelector('[data-reading-connections]').innerHTML=relevanceConnections(example,question,uniform);
    element.querySelector('[data-reading-insight]').innerHTML=relevanceInsight(example,question,uniform,selected);
    element.querySelector('[data-reading-total]').hidden=!showWeights;
    element.querySelector('[data-reading-uniform]').setAttribute('aria-pressed',String(uniform));
    for(const button of element.querySelectorAll('[data-reading-question]'))button.setAttribute('aria-pressed',String(button.dataset.readingQuestion===question));
    element.querySelector('[data-reading-status]').textContent=data.question.label+' · '+(uniform?'Equal contributions.':data.sentence);
  };
  const choose=id=>{question=id;selected=readingWeights(example,question,uniform).strongest;render();};
  for(const button of element.querySelectorAll('[data-reading-question]'))button.addEventListener('click',()=>{pause();choose(button.dataset.readingQuestion);});
  element.querySelector('[data-reading-example]').addEventListener('change',event=>{
    pause();example=event.target.value;selected=readingWeights(example,question,uniform).strongest;render(true);
  });
  element.querySelector('[data-reading-numbers]').addEventListener('change',event=>{pause();showWeights=event.target.checked;render();});
  words.addEventListener('click',event=>{const button=event.target.closest('[data-reading-word]');if(!button)return;pause();selected=Number(button.dataset.readingWord);render();});
  element.querySelector('[data-reading-uniform]').addEventListener('click',()=>{pause();uniform=!uniform;render();});
  const next=()=>choose(READING_QUESTIONS[(READING_QUESTIONS.findIndex(q=>q.id===question)+1)%READING_QUESTIONS.length].id);
  element.querySelector('[data-reading-next]').addEventListener('click',()=>{pause();next();});
  const advance=()=>{next();if(question==='event'){pause();return;}timer=schedule(advance,2700);};
  play.addEventListener('click',()=>{
    if(timer!==null){pause();return;}
    uniform=false;
    if(preference?.matches){choose('event');return;}
    choose('actor');play.textContent='Pause questions';play.setAttribute('aria-pressed','true');timer=schedule(advance,2700);
  });
  preference?.addEventListener?.('change',()=>{if(preference.matches)pause();});
  element.ownerDocument.addEventListener('visibilitychange',()=>{if(element.ownerDocument.hidden)pause();});
}
