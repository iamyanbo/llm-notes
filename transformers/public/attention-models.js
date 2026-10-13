const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const WINDOW_TOKENS=['the','dog','chased','the','cat','past','the','gate'];
export const WINDOW_SCORES=[.2,1.8,.9,.1,1.1,.3,.2,.6];
export const WINDOW_VALUES=[[0,0],[2,0],[1,1],[0,0],[0,2],[.5,1],[0,0],[1,.5]];
export function permitted(i,w,pattern='window'){
 const local=Array.from({length:i+1},(_,j)=>j).filter(j=>j>=i-w+1);
 if(pattern==='dense'||(pattern==='anchors'&&i<2))return Array.from({length:i+1},(_,j)=>j);
 return pattern==='anchors'?[...new Set([...local,...[0,1].filter(j=>j<=i)])].sort((a,b)=>a-b):local;
}
export function windowExample({row=8,width=3,layers=1,pattern='window'}={}){
 const i=clamp(Math.round(row)-1,0,7),w=clamp(Math.round(width),1,8),L=clamp(Math.round(layers),1,4),J=permitted(i,w,pattern);
 const max=Math.max(...J.map(j=>WINDOW_SCORES[j])),mass=J.map(j=>Math.exp(WINDOW_SCORES[j]-max)),den=mass.reduce((a,b)=>a+b,0);
 const weights=WINDOW_SCORES.map((_,j)=>J.includes(j)?mass[J.indexOf(j)]/den:0);
 const products=WINDOW_VALUES.map((v,j)=>v.map(x=>x*weights[j]));
 const output=[0,1].map(c=>products.reduce((a,p)=>a+p[c],0));
 const mask=WINDOW_TOKENS.map((_,r)=>WINDOW_TOKENS.map((_,c)=>permitted(r,w,pattern).includes(c)));
 let frontier=new Set([i]);const reach=[[i]];
 for(let layer=0;layer<L;layer++){frontier=new Set([...frontier].flatMap(j=>permitted(j,w,pattern)));reach.push([...frontier].sort((a,b)=>a-b));}
 return {i,w,L,J,weights,products,output,mask,reach,edges:mask.flat().filter(Boolean).length};
}
export const LINEAR_KEYS=[[1,0],[0,1],[1,1],[2,1],[1,2]];
export const LINEAR_VALUES=[[1,0],[0,2],[1,1],[0,1],[2,0]];
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
export function linearExample({prefix=2,q1=2,q2=1}={}){
 const n=clamp(Math.round(prefix),1,5),q=[Math.max(0,q1),Math.max(0,q2)],k=LINEAR_KEYS[n-1],v=LINEAR_VALUES[n-1];
 const S=[[0,0],[0,0]],z=[0,0];
 for(let j=0;j<n-1;j++)for(let a=0;a<2;a++){z[a]+=LINEAR_KEYS[j][a];for(let b=0;b<2;b++)S[a][b]+=LINEAR_KEYS[j][a]*LINEAR_VALUES[j][b];}
 const previous=S.map(r=>[...r]),previousZ=[...z],outer=k.map(a=>v.map(b=>a*b));
 for(let a=0;a<2;a++){z[a]+=k[a];for(let b=0;b<2;b++)S[a][b]+=outer[a][b];}
 const numerator=[0,1].map(b=>dot(q,S.map(r=>r[b]))),denominator=dot(q,z);
 const similarities=LINEAR_KEYS.slice(0,n).map(key=>dot(q,key));
 const weights=similarities.map(s=>denominator>0?s/denominator:0);
 const direct=[0,1].map(c=>weights.reduce((s,a,j)=>s+a*LINEAR_VALUES[j][c],0));
 return {n,q,k,v,previous,previousZ,outer,S,z,numerator,denominator,similarities,weights,direct,output:denominator>0?numerator.map(x=>x/denominator):null};
}
