export const BLOCK_SYMBOLS={
  X:{label:'X',description:'The incoming sequence matrix: n rows, one per token position, with d coordinates in each row.'},
  Y:{label:'Y',description:'The output sequence matrix, passed to the next block. It has the same n × d shape as X.'},
  U:{label:'U',description:'The intermediate matrix after the attention update, first residual addition, and first normalization.'},
  O:{label:'O',description:'The multi-head attention update, O = M(X), before adding the incoming X.'},
  R:{label:'R',description:'The first residual sum, R = X + O, before the first normalization.'},
  T:{label:'T',description:'The row-wise feed-forward update, T = F_rows(U), before the second residual addition.'},
  Z:{label:'Z',description:'The second residual sum, Z = U + T, before the second normalization. This Z is local to this table.'},
  M:{label:'ℳ',description:'Multi-head self-attention: combine the head outputs and apply their learned output projection. Here it is unmasked encoder attention.'},
  N1:{label:'N₁',description:'The first row-wise layer normalization. Its gains and offsets are learned separately from those of N₂.'},
  N2:{label:'N₂',description:'The second row-wise layer normalization, applied after the feed-forward residual addition.'},
  F:{label:'F_rows',description:'Apply the same learned feed-forward network separately to every row; it does not mix positions.'},
  n:{label:'n',description:'The number of token positions in the supplied sequence: the number of rows.'},
  d:{label:'d',description:'The model width: the number of coordinates in each position’s representation.'}
};
