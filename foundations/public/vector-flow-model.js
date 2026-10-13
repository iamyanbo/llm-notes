import {geometryData,GEOMETRY_MAPS} from './geometry-model.js';

export function vectorFlowData({mode='qkv',key='dog',positions=false,selected=1,kind=mode==='scalar'?'S':mode==='basis'?'M':'Q',progress=0}={}){
  const data=geometryData({mode,key,positions}),input=data.X[selected];
  const matrix=mode==='scalar'?[GEOMETRY_MAPS.S[0]]:GEOMETRY_MAPS[kind];
  const products=matrix.map(row=>row.map((weight,j)=>weight*input[j]));
  const output=products.map(row=>row.reduce((s,v)=>s+v,0));
  const count=matrix.length,scaled=Math.max(0,Math.min(1,progress))*count,complete=progress>=1;
  const row=Math.min(count-1,Math.floor(scaled)),fraction=complete?1:scaled-row;
  const phase=complete?4:Math.min(3,Math.floor(fraction*4));
  return {data,input,matrix,products,output,count,row,phase,complete,completed:complete?count:row,fraction,phaseProgress:complete?1:fraction*4-phase,kind};
}
export function cubicPoint(points,t){
  const u=1-t;
  return [0,1].map(r=>u*u*u*points[0][r]+3*u*u*t*points[1][r]+3*u*t*t*points[2][r]+t*t*t*points[3][r]);
}
