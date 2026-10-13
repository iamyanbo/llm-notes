export const TRANSFORMER_STAGES = {
  embedding: {title:'Embeddings and positions', description:'Each input symbol receives a learned vector. Positional encodings are added so that the model can distinguish sequence order.'},
  selfAttention: {title:'Encoder self-attention', description:'Each input position combines information from the input sequence. Separate heads use their own learned query, key, and value projections.'},
  maskedAttention: {title:'Masked decoder self-attention', description:'The decoder attends to earlier output positions and its current position. A causal mask prevents access to later positions.'},
  crossAttention: {title:'Encoder–decoder attention', description:'Queries come from the decoder; keys and values come from the encoder output. This connects the output sequence to the input.'},
  feedForward: {title:'Position-wise feed-forward network', description:'The same two-layer network is applied separately at every position, with a ReLU activation between its linear transformations.'},
  addNorm: {title:'Residual addition and normalization', description:'A residual connection adds the sublayer input to its output. In the original transformer, layer normalization follows this addition.'},
  output: {title:'Output projection', description:'A learned linear projection maps decoder vectors to vocabulary scores. Softmax converts those scores into probabilities for the next symbol.'},
};

export const ARCHITECTURE_OVERVIEW = {
  title:'The original transformer',
  description:'Encoder–decoder architecture, Vaswani et al. (2017). Select a component to inspect it.',
};
