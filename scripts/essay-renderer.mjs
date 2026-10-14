import {essays} from '../content/essays.mjs';
import {sources} from '../miscellaneous/topics.mjs';
const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderTopic(topic,number){
  const essay=essays[topic.id];
  if(!essay)return '<details class="topic-plan" id="'+topic.id+'"><summary><div><h3>'+escape(topic.title)+'</h3><p>'+escape(topic.question)+'</p></div><span class="plan-toggle" aria-hidden="true"></span></summary><div class="plan-body"><p>'+escape(topic.plan)+'</p><p class="visual-plan"><strong>Planned demonstration.</strong> '+escape(topic.visual)+'</p><div class="topic-sources"><span>Starting points</span>'+topic.refs.map(key=>{const [title,url]=sources[key];return '<a href="'+escape(url)+'">'+escape(title)+'</a>';}).join('')+'</div></div></details>';
  const references=[...new Set([...topic.refs,...essay.refs])];
  return '<article class="topic-essay'+(essay.flat?' flat-essay':'')+'" id="'+topic.id+'" aria-labelledby="'+topic.id+'-title"><header><h3 id="'+topic.id+'-title">'+number+' '+escape(topic.title)+'</h3></header>'+essay.sections.map(part=>'<section class="essay-section" id="'+topic.id+'-'+part.id+'"'+(part.title?' aria-labelledby="'+topic.id+'-'+part.id+'-title"':'')+'>'+(part.title?'<h4 id="'+topic.id+'-'+part.id+'-title">'+escape(part.title)+'</h4>':'')+part.body+'</section>').join('')+'<details class="essay-references"><summary>Sources and further reading</summary><ol>'+references.map(key=>{if(!sources[key])throw new Error('Missing source '+key);return '<li><a href="'+escape(sources[key][1])+'">'+escape(sources[key][0])+'</a></li>';}).join('')+'</ol></details></article>';
}
export const completedEssays=Object.keys(essays).length;
