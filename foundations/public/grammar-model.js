// Manually annotated examples, not the output of a general-purpose parser.
const token=(word,category)=>({word,category});
export const GRAMMAR_EXAMPLES={
  active:{
    sentence:'The dog chased the cat.',
    tokens:[token('The','Determiner'),token('dog','Noun'),token('chased','Verb'),token('the','Determiner'),token('cat','Noun')],
    groups:[{start:0,end:2,syntax:'Subject',event:'Agent',tone:'agent'},{start:2,end:3,syntax:'Verb',event:'Action',tone:'action'},{start:3,end:5,syntax:'Direct object',event:'Affected participant',tone:'affected'}],
    agent:'dog',affected:'cat',
    detail:'The dog is the subject and the agent. The cat is the direct object and the affected participant.'
  },
  reversed:{
    sentence:'The cat chased the dog.',
    tokens:[token('The','Determiner'),token('cat','Noun'),token('chased','Verb'),token('the','Determiner'),token('dog','Noun')],
    groups:[{start:0,end:2,syntax:'Subject',event:'Agent',tone:'agent'},{start:2,end:3,syntax:'Verb',event:'Action',tone:'action'},{start:3,end:5,syntax:'Direct object',event:'Affected participant',tone:'affected'}],
    agent:'cat',affected:'dog',
    detail:'The word classes are unchanged, but the cat is now the subject and the agent. This describes the opposite direction of the action.'
  },
  passive:{
    sentence:'The cat was chased by the dog.',
    tokens:[token('The','Determiner'),token('cat','Noun'),token('was','Auxiliary verb'),token('chased','Verb'),token('by','Preposition'),token('the','Determiner'),token('dog','Noun')],
    groups:[{start:0,end:2,syntax:'Subject',event:'Affected participant',tone:'affected'},{start:2,end:4,syntax:'Passive verb construction',event:'Action',tone:'action'},{start:4,end:7,syntax:'Prepositional phrase',event:'Agent introduced by “by”',tone:'agent'}],
    agent:'dog',affected:'cat',
    detail:'The cat is the subject and the affected participant. The dog is introduced by a prepositional phrase and remains the agent. There is no direct object in this passive clause.'
  }
};
export const GRAMMAR_MODES={
  classes:'Classify each word: both animals are nouns in every example.',
  syntax:'Group the words by their grammatical functions and constructions.',
  event:'Follow the event: which animal performs the chasing, and which is chased?'
};
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function grammarAnalysis(exampleKey,mode){
  const example=GRAMMAR_EXAMPLES[exampleKey];
  if(!example||!Object.hasOwn(GRAMMAR_MODES,mode))throw new Error('Unknown grammar example or view');
  const segments=mode==='classes'?example.tokens.map(t=>({words:t.word,label:t.category,tone:'class'})):
    example.groups.map(g=>({words:example.tokens.slice(g.start,g.end).map(t=>t.word).join(' '),label:mode==='syntax'?g.syntax:g.event,tone:mode==='event'?g.tone:'syntax'}));
  return `<ol class="grammar-segments" aria-label="${escape(example.sentence)}">${segments.map(s=>`<li class="grammar-segment" data-grammar-tone="${s.tone}"><span class="grammar-words">${escape(s.words)}</span><span class="grammar-label">${escape(s.label)}</span></li>`).join('')}</ol>`;
}
