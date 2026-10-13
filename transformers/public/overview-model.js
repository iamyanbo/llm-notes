export const OVERVIEW_PARTS=[
  {id:'architecture',name:'Architecture',question:'What enters the model, and which maps act on it?'},
  {id:'learning',name:'Learning and adaptation',question:'How do we choose and change the learned matrices?'},
  {id:'generation',name:'Generation and serving',question:'How do we evaluate a growing sequence?'}
];
export const OVERVIEW_TOPICS=[
  {id:'rope',part:'architecture',title:'Rotary position embedding',short:'RoPE',place:'Queries and keys',description:'Position enters after the representation has been projected into queries and keys. Rotate their coordinate pairs before comparing them; values follow a separate path into the weighted sum.'},
  {id:'attention',part:'architecture',title:'Attention variants',short:'Attention variants',place:'The attention calculation',description:'Change which earlier positions a query can read, or change the form of the comparison. Sliding windows and sparse patterns restrict connections; linear attention changes how the values can be collected.'},
  {id:'experts',part:'architecture',title:'Mixture of experts',short:'Mixture of experts',place:'The feed-forward sublayer',description:'A router chooses a few feed-forward functions for each token representation. Apply the selected experts and combine their outputs, while the other experts stay idle.'},
  {id:'multimodal',part:'architecture',title:'Multimodal inputs',short:'Multimodal inputs',place:'Before the decoder',description:'Image patches supply measurements that a word-ID lookup cannot provide. Project their features into representations that can join the text sequence.'},
  {id:'pretraining',part:'learning',title:'Pre-training',short:'Pre-training',place:'The prediction loss',description:'Recorded text supplies the next-token targets. Compare the model’s probabilities with those targets, differentiate the loss, and update the learned parameters.'},
  {id:'posttraining',part:'learning',title:'Post-training',short:'Post-training',place:'The learning objective',description:'Demonstrations, preferences, and rewards specify behavior beyond continuing recorded text. The objective determines which parameter changes are encouraged.'},
  {id:'lora',part:'learning',title:'Low-rank adaptation',short:'LoRA',place:'The parameter update',description:'Keep a base matrix fixed and learn an additive update from two smaller factors. We can examine the restriction on that update before counting the memory it saves.'},
  {id:'memory',part:'generation',title:'KV cache and FlashAttention',short:'KV cache · FlashAttention',place:'Stored state and memory access',description:'Reuse keys and values from earlier causal rows. FlashAttention addresses a different part of the work: evaluate attention in tiles without retaining the whole score matrix.'},
  {id:'precision',part:'generation',title:'Quantization',short:'Quantization',place:'The stored numbers',description:'Represent weights with integer codes and scales. Reconstruct the values used in a product and follow the error introduced by the coarser grid.'},
  {id:'thought',part:'generation',title:'Chain of thought',short:'Chain of thought',place:'The growing context',description:'Intermediate text becomes context for later predictions. The sequence grows and additional computation takes place while the model’s parameters stay fixed.'},
  {id:'speculation',part:'generation',title:'Speculative decoding',short:'Speculative decoding',place:'Proposing and checking tokens',description:'A cheaper draft proposes a continuation. The target checks the proposal, with an acceptance and correction rule that preserves the desired sampling distribution.'}
].map((topic,index)=>({...topic,number:index+1}));

export function overviewTopic(id){
  const topic=OVERVIEW_TOPICS.find(topic=>topic.id===id);
  if(!topic)throw new RangeError('Unknown overview topic: '+id);
  return topic;
}
