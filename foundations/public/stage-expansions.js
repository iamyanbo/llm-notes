// Source: Vaswani et al. (2017), Sections 3.1–3.5. Geometry stays within the SVG.
export const STAGE_EXPANSIONS = [
  {step:0,title:'Embeddings and positions',x:72,y:516,width:632,height:154,origin:[380,608],operations:['Symbol lookup','Scale embedding','Add position'],formula:String.raw`x_i=\sqrt{d_{\mathrm{model}}}\,E[t_i]+PE_i`},
  {step:1,title:'Encoder self-attention',x:30,y:392,width:340,height:174,origin:[210,488],operations:['Project Q, K, V','Score and scale','Softmax','Weight values','Join heads and project'],formula:String.raw`\mathrm{head}_j=\operatorname{softmax}\!\left(\frac{Q_jK_j^{\mathsf T}}{\sqrt{d_k}}\right)V_j`},
  {step:2,title:'Encoder feed-forward',x:30,y:276,width:340,height:166,origin:[210,372],operations:['Linear layer','ReLU','Linear layer'],formula:String.raw`\mathrm{FFN}(x)=\max(0,xW_1+b_1)W_2+b_2`},
  {step:3,title:'Masked decoder attention',x:396,y:392,width:340,height:200,origin:[558,488],operations:['Project Q, K, V','Score and scale','Apply causal mask','Softmax and weight V','Join heads and project'],formula:String.raw`\mathrm{head}_j=\operatorname{softmax}\!\left(\frac{Q_jK_j^{\mathsf T}}{\sqrt{d_k}}+M\right)V_j`},
  {step:4,title:'Encoder–decoder attention',x:396,y:272,width:340,height:200,origin:[558,368],operations:['Q from decoder','K, V from encoder','Score and scale','Softmax and weight V','Join heads and project'],formula:String.raw`\mathrm{head}_j=\operatorname{softmax}\!\left(\frac{Q_jK_j^{\mathsf T}}{\sqrt{d_k}}\right)V_j`},
  {step:5,title:'Decoder feed-forward',x:396,y:152,width:340,height:166,origin:[558,248],operations:['Linear layer','ReLU','Linear layer'],formula:String.raw`\mathrm{FFN}(x)=\max(0,xW_1+b_1)W_2+b_2`},
  {step:6,title:'Output probabilities',x:396,y:12,width:340,height:162,origin:[558,96],operations:['Decoder vector','Vocabulary projection','Softmax'],formula:String.raw`p(y_{i+1})=\operatorname{softmax}(h_iW_{\mathrm{vocab}}+b)`},
];

export const NORM_EXPANSION = {
  title:'Residual addition and normalization',width:340,height:164,
  operations:['Sublayer output','Add original input','Layer normalization'],
  formula:String.raw`y=\operatorname{LayerNorm}(x+\operatorname{Sublayer}(x))`,
};
