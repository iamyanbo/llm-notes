import {hcWiringExample,sinkhornStep,totals} from './residual-model.mjs';
import {matmul,dot} from './week-models.mjs';
import {expertExample} from './expert-model.mjs';
const copy=m=>m.map(r=>[...r]);
const add=(a,b)=>a.map((r,i)=>r.map((x,j)=>x+b[i][j]));
export function rmsRow(row){const meanSquare=dot(row,row)/row.length,divisor=Math.sqrt(meanSquare+1e-6);return {meanSquare,divisor,row:row.map(x=>x/divisor)};}
export function sinkhornTrial(step=0,scoreChange=0){
 if(!Number.isInteger(step)||step<0||step>40||!Number.isFinite(scoreChange)||Math.abs(scoreChange)>2)throw new RangeError('Choose zero through forty divisions and a score change between minus two and two');
 const seed=copy(sinkhornStep(0).seed);seed[0][0]*=Math.exp(scoreChange);
 const logits=seed.map(r=>r.map(Math.log));let matrix=copy(seed),previous=copy(seed),divisors=[];
 for(let i=1;i<=step;i++){previous=copy(matrix);const t=totals(matrix);divisors=i%2?t.rows:t.columns;matrix=matrix.map((r,j)=>r.map((v,k)=>v/divisors[i%2?j:k]));}
 const sums=totals(matrix),input=hcWiringExample().X.map(r=>[r[0]]),output=matmul(matrix,input).map(r=>r[0]);
 return {step,scoreChange,seed,logits,matrix,previous,divisors,axis:step===0?'none':step%2?'rows':'columns',...sums,rowError:Math.max(...sums.rows.map(v=>Math.abs(v-1))),columnError:Math.max(...sums.columns.map(v=>Math.abs(v-1))),output};
}
export function predictorTrial({swapped=false,scale=1,dynamic=.5,bias=0}={}){
 if(!Number.isFinite(scale)||scale<=0||!Number.isFinite(dynamic)||!Number.isFinite(bias))throw new RangeError('Choose finite predictor parameters and a positive input scale');
 const X=copy(hcWiringExample().X);if(swapped)X.reverse();X.forEach(r=>r.forEach((v,j)=>r[j]=v*scale));
 const v=X.flat(),column=[1,0,-1,0],products=v.map((x,i)=>x*column[i]),measurement=products.reduce((s,x)=>s+x,0),normalization=rmsRow(v),z=measurement/normalization.divisor,score=dynamic*z+bias,sigmoid=1/(1+Math.exp(-score));
 const inputCoefficient=sigmoid+1e-6,outputCoefficient=2*sigmoid;
 return {X,v,column,products,measurement,normalization,z,dynamic,bias,score,sigmoid,inputCoefficient,outputCoefficient,inputContribution:X[0].map(v=>inputCoefficient*v),streamMean:X[0].map((x,j)=>(x+X[1][j])/2)};
}
export function expertAt(input){
 const weights=expertExample(),gateRaw=matmul([input],weights.gateMatrix)[0],features=matmul([input],weights.featureMatrix)[0],gate=gateRaw.map(v=>v/(1+Math.exp(-v))),products=gate.map((v,i)=>v*features[i]);
 return {input,gateRaw,features,gate,products,output:matmul([products],weights.returnMatrix)[0]};
}
export function blockTrace(attentionStrength=1){
 if(!Number.isFinite(attentionStrength)||attentionStrength<0||attentionStrength>1)throw new RangeError('Choose attention output strength from zero through one');
 const {X,A,B,C}=hcWiringExample(3),attentionInput=matmul(A,X)[0],attentionNorm=rmsRow(attentionInput),attentionOutput=[2,-1].map(v=>v*attentionStrength),attentionCarry=matmul(B,X),attentionInjection=matmul(C,[attentionOutput]),Y=add(attentionCarry,attentionInjection);
 const expertInput=matmul(A,Y)[0],expertNorm=rmsRow(expertInput),expert=expertAt(expertNorm.row),expertCarry=matmul(B,Y),expertInjection=matmul(C,[expert.output]),result=add(expertCarry,expertInjection);
 return {attentionStrength,X,A,B,C,attentionInput,attentionNorm,attentionOutput,attentionCarry,attentionInjection,Y,expertInput,expertNorm,expert,expertCarry,expertInjection,result};
}
