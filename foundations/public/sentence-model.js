export const PRESETS = Object.freeze({
  dog: ['the', 'dog', 'chased', 'the', 'cat'],
  cat: ['the', 'cat', 'chased', 'the', 'dog'],
  scrambled: ['cat', 'the', 'chased', 'dog', 'the'],
});
export function swapWords(words, first, second) {
  if (![first, second].every(i=>Number.isInteger(i) && i>=0 && i<words.length)) throw new RangeError('Invalid word position');
  const next = [...words];
  [next[first],next[second]]=[next[second],next[first]];
  return next;
}
export function wordCounts(words) {
  return words.reduce((counts,word)=>({...counts,[word]:(counts[word]||0)+1}),{});
}
export function sentenceText(words) {
  const text = words.join(' ');
  return text[0].toUpperCase()+text.slice(1)+'.';
}
export function describeOrder(words) {
  const text = words.join(' ');
  if (text===PRESETS.dog.join(' ')) return 'The dog performs the action; the cat is chased.';
  if (text===PRESETS.cat.join(' ')) return 'The cat performs the action; the dog is chased.';
  if (text===PRESETS.scrambled.join(' ')) return 'The words are familiar, but this arrangement does not form an ordinary English sentence.';
  return 'What statement, if any, does this arrangement express? The word counts alone cannot tell us.';
}
