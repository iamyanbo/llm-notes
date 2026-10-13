export const READING_QUESTIONS=[
  {id:'actor',label:'Who is doing the chasing?'},
  {id:'patient',label:'Who is being chased?'},
  {id:'event',label:'What does the sentence assert?'},
];
export const READING_EXAMPLES={
  active:{
    label:'Dog chases cat',sentence:'The dog chased the cat.',
    tokens:['The','dog','chased','the','cat'],
    amounts:{actor:[1,12,5,1,3],patient:[1,3,5,1,12],event:[1,4,12,1,4]},
    answers:{actor:'The dog is the chaser.',patient:'The cat is the participant being chased.',event:'The sentence describes the dog chasing the cat.'},
    notes:['The article belongs to the noun phrase “the dog”.','Dog names the chaser in this active sentence.','Chased names the action and connects its participants.','The article belongs to the noun phrase “the cat”.','Cat names the participant being chased.'],
  },
  reversed:{
    label:'Cat chases dog',sentence:'The cat chased the dog.',
    tokens:['The','cat','chased','the','dog'],
    amounts:{actor:[1,12,5,1,3],patient:[1,3,5,1,12],event:[1,4,12,1,4]},
    answers:{actor:'The cat is the chaser.',patient:'The dog is the participant being chased.',event:'The sentence describes the cat chasing the dog.'},
    notes:['The article belongs to the noun phrase “the cat”.','Cat now names the chaser. Its role differs from the original sentence.','Chased names the action and connects its participants.','The article belongs to the noun phrase “the dog”.','Dog now names the participant being chased.'],
  },
  passive:{
    label:'Passive sentence',sentence:'The cat was chased by the dog.',
    tokens:['The','cat','was','chased','by','the','dog'],
    amounts:{actor:[1,3,3,5,5,1,12],patient:[1,12,3,5,4,1,3],event:[1,4,5,12,5,1,4]},
    answers:{actor:'The dog is the chaser, introduced by the phrase “by the dog”.',patient:'The cat is being chased, although cat is the grammatical subject.',event:'The sentence describes the same direction of chasing as the original, using a passive construction.'},
    notes:['The article belongs to “the cat”.','Cat is the grammatical subject and the participant being chased.','Was helps form the passive construction “was chased”.','Chased names the action in the passive verb phrase.','By introduces the agent in “by the dog”.','The article belongs to “the dog”.','Dog names the chaser despite occurring at the end.'],
  },
  negated:{
    label:'Add negation',sentence:'The dog did not chase the cat.',
    tokens:['The','dog','did','not','chase','the','cat'],
    amounts:{actor:[1,10,3,12,5,1,3],patient:[1,3,3,12,5,1,10],event:[1,4,3,14,8,1,4]},
    answers:{actor:'Dog is the subject of “did not chase”; the sentence denies that a chase occurred.',patient:'Cat is the object of the denied chase. A chase is not asserted.',event:'The sentence denies that the dog chased the cat. The word “not” changes the assertion.'},
    notes:['The article belongs to “the dog”.','Dog is the subject of the negated verb phrase.','Did supports the negative construction “did not chase”.','Not negates the assertion that the dog chased the cat.','Chase names the action being denied.','The article belongs to “the cat”.','Cat is the object named in the denied action.'],
  },
};
export function relevanceLevel(weight){return weight>=.4?4:weight>=.22?3:weight>=.1?2:weight>0?1:0;}
export function readingWeights(example='active',question='actor',uniform=false){
  const data=READING_EXAMPLES[example];
  if(!data||!data.amounts[question])throw new RangeError('Unknown reading example or question');
  const amounts=uniform?data.tokens.map(()=>1):data.amounts[question],total=amounts.reduce((s,v)=>s+v,0);
  const weights=amounts.map(v=>v/total),levels=weights.map(relevanceLevel);
  const strongest=weights.indexOf(Math.max(...weights));
  return {...data,weights,levels,strongest,question:READING_QUESTIONS.find(q=>q.id===question),answer:data.answers[question]};
}
