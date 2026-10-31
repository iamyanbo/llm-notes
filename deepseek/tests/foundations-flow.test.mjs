import test from 'node:test';
import assert from 'node:assert/strict';
import {linear,definition,renderTrace} from '../site/trace-scene.mjs';
import {motionParts} from '../site/trace-motion.mjs';
import {weekKinds} from '../site/week-studies.mjs';
import {weekFlowDefinition} from '../site/week-flow-scenes.mjs';
import {withTrace} from '../site/day2-trace.mjs';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} differs from ${b}`);
function centre(svg,id){
 const escaped=id.replaceAll(':','\\:');
 const m=svg.match(new RegExp(`data-cell="${escaped}"[^>]*><rect x="([\\d.]+)" y="([\\d.]+)" width="([\\d.]+)" height="([\\d.]+)"`));
 assert.ok(m,id);const [x,y,w,h]=m.slice(1).map(Number);return [x+w/2,y+h/2];
}

test('right and left matrix products retain their original matrix and connect exact matching cells',()=>{
 const X=[[2,3],[5,7]],W=[[.25,.75],[.5,.5]];
 for(const left of [false,true]){
  const d=definition([linear('Chosen multiplication','X',X,W,{left})]);
  for(let i=1;i<d.steps.length;i++){
   const c=d.steps[i].calculation,svg=renderTrace(d,i,.1),paths=[...svg.matchAll(/<path class="trace-route [^"]*" d="M([\d.]+) ([\d.]+) C([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+)"/g)].map(m=>m.slice(1).map(Number));
   c.terms.forEach((t,k)=>{
    const q=t.sources[0],from=centre(svg,`in0:${q.row}:${q.col}`),to=centre(svg,`map:${t.weight[0]}:${t.weight[1]}`),path=paths[k*3];
    from.forEach((v,j)=>near(path[j],v));to.forEach((v,j)=>near(path[6+j],v));
   });
   for(let r=0;r<2;r++)for(let j=0;j<2;j++)assert.match(svg,new RegExp(`data-cell="map:${r}:${j}"[\\s\\S]*?>${W[r][j]}<`));
  }
 }
});

test('products enter the adder one at a time and the total grows only at their arrival',()=>{
 const d=definition([linear('Two terms','x',[[2,3]],[[2],[4]])]);
 const first=renderTrace(d,1,.65+.15*.25),second=renderTrace(d,1,.65+.15*.75);
 assert.equal(motionParts(first).packets.length,1);assert.equal(motionParts(second).packets.length,1);
 assert.match(first,/Sum so far: 0/);assert.match(second,/Sum so far: 4/);
 assert.match(renderTrace(d,1,.8),/Sum so far: 16/);
 assert.match(renderTrace(d,1,.95),/data-present="false" data-cell="out:0:0"/);
 assert.match(renderTrace(d,1,.96),/data-present="true" data-cell="out:0:0"/);
});

test('all weekly calculations use the shared contributions, adder and finite progressive output',()=>{
 for(const kind of weekKinds){
  const d=weekFlowDefinition(kind);
  for(const s of d.scenes){
   const first=renderTrace(d,s.start),last=renderTrace(d,s.start+s.cells.length);
   assert.match(first,/foundations-flow/);assert.match(first,/trace-contribution/);assert.doesNotMatch(first,/class="trace-operation"><rect x="345"/);
   const cells=[...last.matchAll(/<g data-present="(true|false)" data-cell="out:/g)];
   assert.equal(cells.length,s.output.values.flat().length);assert.ok(cells.every(m=>m[1]==='true'));
   assert.doesNotMatch(last,/NaN|undefined|Infinity/);
  }
 }
 const html=withTrace('<figure class="week-study"><div class="week-viewport"><svg></svg></div></figure>','week-indexer-scores');
 assert.ok(html.indexOf('week-viewport')<html.indexOf('flow-controls'));
 assert.match(html,/flow-transport/);assert.match(html,/flow-position/);
});
