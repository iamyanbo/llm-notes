import {HEAD_PROJECTIONS,sequenceAttention} from './context-model.js';

export const GEOMETRY_MAPS={S:[[0,1],[0,0]],M:HEAD_PROJECTIONS.Q,...HEAD_PROJECTIONS};
export const geometryKinds=mode=>mode==='scalar'?['S']:mode==='basis'?['M']:['Q','K','V'];
export function applyMap(matrix,vector){return matrix.map(row=>row.reduce((sum,a,j)=>sum+a*vector[j],0));}
export function interpolateMap(target,progress){
  return target.map((row,i)=>row.map((v,j)=>(i===j?1:0)*(1-progress)+progress*v));
}
export function geometryData({mode='qkv',key='dog',positions=false,progress={}}={}){
  const {tokens,X}=sequenceAttention(key,positions),kinds=geometryKinds(mode),maps={};
  for(const kind of kinds){
    const t=progress[kind]??0,matrix=interpolateMap(GEOMETRY_MAPS[kind],t);
    maps[kind]={matrix,target:GEOMETRY_MAPS[kind],progress:t,points:X.map(x=>applyMap(matrix,x)),basis:[[matrix[0][0],matrix[1][0]],[matrix[0][1],matrix[1][1]]]};
  }
  return {tokens,X,kinds,maps};
}
export function transformedGrid(matrix){
  return [-2,-1,0,1,2].flatMap(v=>[
    [applyMap(matrix,[v,-2]),applyMap(matrix,[v,2])],
    [applyMap(matrix,[-2,v]),applyMap(matrix,[2,v])],
  ]);
}
