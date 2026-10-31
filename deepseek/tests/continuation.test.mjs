import test from 'node:test';
import assert from 'node:assert/strict';
import {continuationDefinition as definition} from '../site/continuation-scenes.mjs';
import {dayMap} from '../site/day-maps.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-12,`${a} != ${b}`);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);

test('head-wise and joint polar factors have their claimed independent geometry',()=>{
 const scenes=definition('headwise-muon').scenes,heads=scenes[1].output.values,joint=scenes[2].output.values;
 heads.forEach(r=>near(dot(r,r),1));near(dot(heads[0],heads[1]),.6);
 joint.forEach(r=>near(dot(r,r),1));near(dot(joint[0],joint[1]),0);
 // Characterization independent of the closed-form construction: Q^T P is symmetric positive definite.
 const P=[[3,0],[3,4]],qtP=joint[0].map((_,i)=>P[0].map((_,j)=>joint.reduce((s,r,k)=>s+r[i]*P[k][j],0)));
 near(qtP[0][1],qtP[1][0]);assert.ok(qtP[0][0]>0);assert.ok(qtP[0][0]*qtP[1][1]-qtP[0][1]**2>0);
 assert.equal(heads[0][1],0);assert.ok(joint[0][1]<0);
});

test('coarse pooling reduces addressability while retaining the chosen mean',()=>{
 const scenes=definition('hca-coarse').scenes;
 assert.deepEqual(scenes[0].output.values,[[0],[8],[0],[0]]);
 assert.deepEqual(scenes.at(-1).output.values,[[2]]);
 near(scenes[0].output.values.flat().reduce((a,b)=>a+b)/4,2);
});

test('Engram gates a fixed value and DSpark changes only the conditional bias',()=>{
 const engram=definition('engram-gate').scenes;
 assert.deepEqual(engram[1].inputs[0].values,[[2,-1],[2,-1]]);
 near(engram[0].output.values[0][0]+engram[0].output.values[1][0],1);
 const draft=definition('draft-bias').scenes;
 assert.deepEqual(draft[0].inputs[0].values,draft[2].inputs[0].values);
 draft[1].output.values[0].forEach((v,i)=>near(v,[.75,.25][i]));
 draft[3].output.values[0].forEach((v,i)=>near(v,[.25,.75][i]));
});

test('later maps preserve memory sources, contextual gates and draft conditioning',()=>{
 const edges=d=>dayMap(d).edges;
 assert.ok(edges(8).some(e=>e.from==='encoder'&&e.to==='global'));
 assert.ok(!edges(8).some(e=>e.from==='streams'&&e.to==='global'));
 assert.ok(edges(11).some(e=>e.from==='project'&&e.to==='add'&&e.type==='features'));
 assert.ok(edges(11).some(e=>e.from==='gate'&&e.to==='add'&&e.type==='control'));
 assert.ok(!edges(14).some(e=>e.from==='previous'&&e.to==='heavy'));
 assert.ok(edges(14).some(e=>e.from==='base'&&e.to==='proposal'));
});
