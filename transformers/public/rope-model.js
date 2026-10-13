import {dot} from './models.js';
export const radians=degrees=>degrees*Math.PI/180;
export const rotationMatrix=angle=>[[Math.cos(angle),-Math.sin(angle)],[Math.sin(angle),Math.cos(angle)]];
export const rotate=(v,angle)=>{
  const c=Math.cos(angle),s=Math.sin(angle);
  return [c*v[0]-s*v[1],s*v[0]+c*v[1]];
};
export function comparison({shift=0,gap=1,degrees=30,relative=false,progress=1,q=[1,0],k=[0,1]}={}){
  const j=1+shift,i=j+gap,omega=radians(degrees);
  const a=(relative?0:i*omega)*progress,b=(relative?(j-i)*omega:j*omega)*progress;
  const query=rotate(q,a),key=rotate(k,b),products=query.map((v,c)=>v*key[c]);
  return {i,j,delta:j-i,omega,a,b,q,k,query,key,products,score:products.reduce((s,v)=>s+v,0),relativeScore:dot(q,rotate(k,(j-i)*omega*progress))};
}
export function pairComparison({gap=1,frequencies='standard',progress=1}={}){
  const rates=frequencies==='illustrative'?[Math.PI/6,Math.PI/60]:[1,.01];
  const pairs=rates.map(omega=>{
    const q=[1,0],k=rotate([0,1],-gap*omega*progress);
    return {omega,q,k,products:q.map((v,c)=>v*k[c]),score:dot(q,k)};
  });
  return {pairs,score:pairs.reduce((s,p)=>s+p.score,0)};
}
