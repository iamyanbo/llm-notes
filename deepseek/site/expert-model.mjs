// Chosen parameters for the worked SwiGLU expert.
const multiply=(x,w)=>w[0].map((_,j)=>x.reduce((sum,v,i)=>sum+v*w[i][j],0));
export function expertExample(){
 const input=[1,2],gateMatrix=[[1,0,-1],[0,1,1]],featureMatrix=[[2,1,0],[0,1,1]],returnMatrix=[[1,-1],[.5,1],[1,0]];
 const gateInput=multiply(input,gateMatrix),features=multiply(input,featureMatrix);
 const gate=gateInput.map(s=>s/(1+Math.exp(-s))),products=gate.map((g,j)=>g*features[j]);
 return {input,gateMatrix,featureMatrix,returnMatrix,gateInput,features,gate,products,output:multiply(products,returnMatrix)};
}
