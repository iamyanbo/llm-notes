import test from 'node:test';
import assert from 'node:assert/strict';
import {residualAlternatives,repeatedCarry,hcWiringExample,transportCases,transportReplay,sinkhornStep,coefficientExample,blockExample} from '../site/residual-model.mjs';
import {residualAlternativesDiagram,residualAlternativesFigure,hcOverviewDiagram,hcInputDiagram,hcOutputDiagram,hcWiringDiagram,hcWiringFigure,constraintDiagram,featureColumnDiagram,transportReplayDiagram,transportReplayFigure,sinkhornDiagram,coefficientDiagram,blockDiagram,constraintFigure,sinkhornFigure,coefficientFigure,blockFigure,initializeResidualStudies} from '../site/residual-study.mjs';
import {expertExample} from '../site/expert-model.mjs';
const near=(a,b,tol=1e-12)=>assert.ok(Math.abs(a-b)<tol,`${a} differs from ${b}`);
test('a narrow read from before/after rows reproduces gated addition while preserving its sources',()=>{
 const expert=expertExample();
 for(const fraction of [0,.25,.5,.75,1]){
  const m=residualAlternatives(fraction);
  assert.deepEqual(m.input,expert.input);assert.deepEqual(m.update,expert.output);
  m.read.forEach((v,i)=>{near(v,expert.input[i]+fraction*expert.output[i]);near(v,m.oneRow[i]);});
  assert.deepEqual(m.retained,residualAlternatives(0).retained);
  assert.equal(m.concatenated.length,2*m.inputWidth);assert.equal(m.oneRow.length,m.inputWidth);
 }
 assert.deepEqual(residualAlternatives(0).read,expert.input);
 residualAlternatives(1).read.forEach((v,i)=>near(v,expert.input[i]+expert.output[i]));
 for(const bad of [-1,1.1,NaN,Infinity])assert.throws(()=>residualAlternatives(bad),RangeError);
});
test('the zero-update carried path compounds the old-row gain across layers',()=>{
 assert.deepEqual(repeatedCarry(.5).at(-1),[.0625,.125]);
 assert.deepEqual(repeatedCarry(1).at(-1),[1,2]);
 assert.deepEqual(repeatedCarry(2).at(-1),[16,32]);
 assert.deepEqual(repeatedCarry(0),[[1,2],[0,0],[0,0],[0,0],[0,0]]);
 assert.deepEqual(repeatedCarry(2,0),[[1,2]]);
 assert.throws(()=>repeatedCarry(-1),RangeError);assert.throws(()=>repeatedCarry(1,.5),RangeError);
});
test('the HC baseline recovers the ordinary residual using the actual Day 1 expert',()=>{
 const m=hcWiringExample(0),e=expertExample();
 assert.deepEqual(m.input,e.input);assert.deepEqual(m.update,e.output);
 m.result[0].forEach((v,j)=>near(v,e.input[j]+e.output[j]));
 assert.deepEqual(m.result[1],[0,1]);assert.deepEqual(m.B,[[1,0],[0,1]]);
});
test('each connection view changes one map and recomputes only its dependent quantities',()=>{
 const states=Array.from({length:4},(_,s)=>hcWiringExample(s));
 const changed=['A','C','B'];
 for(let s=1;s<4;s++)for(const map of ['A','B','C']){
  if(map===changed[s-1])assert.notDeepEqual(states[s][map],states[s-1][map]);
  else assert.deepEqual(states[s][map],states[s-1][map]);
 }
 assert.deepEqual(states[1].input,[.5,1.5]);
 near(states[1].update[0],2.6341792478364);near(states[1].update[1],2.1414937629800037);
 assert.deepEqual(states[2].update,states[1].update);assert.deepEqual(states[3].update,states[2].update);
 assert.deepEqual(states[3].transport,[[.75,1.75],[.25,1.25]]);
 near(states[3].result[0][0],2.0670896239182);near(states[3].result[1][1],3.3914937629800037);
});
test('all HC connection diagrams expose their maps and computed values',()=>{
 for(let stage=0;stage<4;stage++){
  const svg=hcWiringDiagram(stage);assert.doesNotMatch(svg,/NaN|undefined/);
  assert.match(svg,/A · input connections/);assert.match(svg,/B · bypass connections/);assert.match(svg,/C · output connections/);
  assert.match(svg,/F is evaluated once/);
 }
 assert.match(hcWiringFigure(),/aria-live="polite"/);assert.match(hcWiringFigure(),/hand-set connection examples/);
});
test('the four bypass cases distinguish gain, signed overshoot, duplication and constrained mixing',()=>{
 const cases=transportCases();assert.deepEqual(cases.map(c=>c.output),[[1.2,0],[2,-1],[1,1],[.75,.25]]);
 cases.forEach((c,i)=>near(c.squaredLength,[1.44,5,2,.625][i]));
 assert.deepEqual(cases[1].columns,[1,1]);assert.ok(cases[1].matrix.flat().some(v=>v<0));
 assert.deepEqual(cases[2].columns,[2,0]);
 assert.equal(cases[2].inputMean,.5);assert.equal(cases[2].outputMean,1);assert.equal(cases[3].outputMean,.5);
 const B=cases[3].matrix;
 for(const x of [-2,-1,0,1,2])for(const y of [-2,-1,0,1,2]){
  const out=B.map(r=>r[0]*x+r[1]*y);assert.ok(out[0]**2+out[1]**2<=x*x+y*y+1e-12);
 }
});
test('Sinkhorn divisions reproduce the prose fractions and report the unfixed axis',()=>{
 const first=sinkhornStep(1),second=sinkhornStep(2);
 near(first.matrix[0][0],1/3);near(first.matrix[1][1],4/7);
 near(first.columns[0],16/21);near(first.columns[1],26/21);
 near(second.matrix[0][0],7/16);near(second.matrix[0][1],7/13);
 near(second.matrix[1][0],9/16);near(second.matrix[1][1],6/13);
 near(second.rows[0],203/208);near(second.rows[1],213/208);
 for(let step=1;step<=40;step++){
  const s=sinkhornStep(step);assert.ok(s.matrix.flat().every(v=>v>0));
  (step%2?s.rows:s.columns).forEach(v=>near(v,1));
 }
 assert.ok(sinkhornStep(40).maxError<1e-12);
 assert.throws(()=>sinkhornStep(41),RangeError);assert.throws(()=>sinkhornStep(.5),RangeError);
});
test('complete predictor columns give the stated gated input and injection coefficients',()=>{
 const a=coefficientExample('input'),c=coefficientExample('injection');
 assert.deepEqual(a.products,[0,0,0,1,0,0,-2,0]);assert.equal(a.measurement,-1);assert.equal(c.measurement,1);
 near(a.rms,Math.sqrt(1.000001));
 near(a.result,.26894247052294434);near(c.result,1.462117058954111);
 near(a.result-a.sigmoid,1e-6);near(c.result,2*c.sigmoid);
 assert.equal(a.column.length,8);assert.equal(c.column.length,8);
});
test('the composed example uses each mixed row for its own normalization',()=>{
 const b=blockExample();near(b.attentionNorm.rms,Math.sqrt(.625+1e-6));
 near(b.expertNorm.rms,Math.sqrt(3.15625+1e-6));
 near(b.attentionNorm.row[0],1.2649100521397147);near(b.expertNorm.row[0],1.4071948665386422);
 assert.deepEqual(b.next,[[1.5,.5],[1.5,1],[2.5,0],[1.5,.5]]);
 assert.notEqual(b.attentionNorm.rms,coefficientExample().rms);
});
test('all diagram states have described finite arithmetic and matching SSR controls',()=>{
 const diagrams=[featureColumnDiagram(),...[0,1,2,3].map(constraintDiagram),...[0,.25,.5,.75,1].flatMap(a=>[1,2,6].map(n=>transportReplayDiagram(a,n))),...[0,.5,1].map(residualAlternativesDiagram),hcOverviewDiagram(),hcInputDiagram(),hcOutputDiagram(),hcWiringDiagram(),constraintDiagram(),blockDiagram(),...['input','injection'].map(coefficientDiagram),...Array.from({length:41},(_,i)=>sinkhornDiagram(i))];
 for(const s of diagrams){assert.match(s,/role="img"/);assert.match(s,/<title>.+<\/title>/);assert.doesNotMatch(s,/NaN|undefined/);}
 assert.match(sinkhornFigure(),/max="40"/);assert.match(sinkhornFigure(),/aria-live="polite"/);
 [constraintFigure(),sinkhornFigure(),coefficientFigure(),blockFigure()].forEach(s=>assert.match(s,/tabindex="0"/));
});
function fakeStudy(){const nodes=new Map();return {querySelector(key){if(!nodes.has(key))nodes.set(key,{value:'0',innerHTML:'',textContent:'',disabled:false,events:{},addEventListener(t,fn){this.events[t]=fn;}});return nodes.get(key);}};}
test('the alternatives control changes the read and resets without replacing its retained sources',()=>{
 const study=fakeStudy(),root={querySelectorAll:s=>s==='[data-residual-alternatives]'?[study]:[]};
 initializeResidualStudies(root);
 const range=study.querySelector('[data-alternatives-fraction]'),reset=study.querySelector('[data-alternatives-reset]');
 range.value='1';range.events.input();
 assert.match(study.querySelector('[data-alternatives-detail]').textContent,/λ = 1/);
 assert.match(study.querySelector('[data-residual-svg]').innerHTML,/6\.5666/);assert.equal(reset.disabled,false);
 range.value='0';range.events.input();assert.match(study.querySelector('[data-alternatives-detail]').textContent,/both next inputs are \(1, 2\)/);
 reset.events.click();assert.equal(range.value,'0.5');assert.equal(reset.disabled,true);
 assert.match(study.querySelector('[data-alternatives-detail]').textContent,/3\.7833, 3\.9113/);
 assert.match(residualAlternativesFigure(),/value="0.5"/);assert.match(residualAlternativesFigure(),/aria-live="polite"/);
});
test('HC wiring inspection has four finite stages and resets the same numerical diagram',()=>{
 const study=fakeStudy(),root={querySelectorAll:s=>s==='[data-hc-wiring]'?[study]:[]};initializeResidualStudies(root);
 const get=s=>study.querySelector(`[data-hc-${s}]`),fire=(s,t)=>get(s).events[t]();
 fire('next','click');assert.match(study.querySelector('[data-residual-svg]').innerHTML,/2.6342/);
 fire('next','click');fire('next','click');assert.equal(get('next').disabled,true);assert.match(get('count').textContent,/4 \/ 4/);
 fire('next','click');assert.equal(get('stage').value,'3');fire('reset','click');assert.equal(get('stage').value,'0');
 assert.equal(get('reset').disabled,true);assert.match(study.querySelector('[data-residual-svg]').innerHTML,/6.5666/);
});
test('the Sinkhorn control stops at forty divisions, supports inspection and resets',()=>{
 const study=fakeStudy(),root={querySelectorAll:s=>s==='[data-residual-sinkhorn]'?[study]:[]};initializeResidualStudies(root);
 const get=s=>study.querySelector(`[data-sinkhorn-${s}]`),fire=(s,t)=>get(s).events[t]();
 fire('next','click');assert.equal(get('step').value,'1');assert.match(get('detail').textContent,/rows/);
 get('step').value='2';fire('step','input');assert.match(get('detail').textContent,/0.976/);
 get('step').value='40';fire('step','input');assert.equal(get('next').disabled,true);
 fire('next','click');assert.equal(get('step').value,'40');
 fire('reset','click');assert.equal(get('step').value,'0');assert.equal(get('reset').disabled,true);assert.equal(get('next').disabled,false);
});
test('the coefficient selector changes the full weight column and resulting gain together',()=>{
 const study=fakeStudy(),root={querySelectorAll:s=>s==='[data-residual-coefficient]'?[study]:[]};initializeResidualStudies(root);
 const select=study.querySelector('[data-coefficient-kind]');select.value='injection';select.events.change();
 assert.match(study.querySelector('[data-residual-svg]').innerHTML,/1.4621171/);
 select.value='input';select.events.change();assert.match(study.querySelector('[data-residual-svg]').innerHTML,/0.2689425/);
});


test('repeated bypasses keep the mean while contracting, keeping or reversing the stream difference',()=>{
 for(const a of [0,.25,.5,.75,1])for(let n=1;n<=6;n++){
  const m=transportReplay(a,n),difference=(2*a-1)**n;
  near(m.output[0],(1+difference)/2);near(m.output[1],(1-difference)/2);
  near(m.outputMean,.5);near(m.difference,difference);
  assert.deepEqual(m.initial,hcWiringExample().X.map(r=>r[0]));
  if(n>1)assert.deepEqual(m.input,transportReplay(a,n-1).output);
 }
 assert.deepEqual(transportReplay(.75,2).output,[.625,.375]);
 assert.deepEqual(transportReplay(.5,6).output,[.5,.5]);
 for(const [a,n] of [[-.1,1],[1.1,1],[NaN,1],[.75,0],[.75,7],[.75,1.5]])assert.throws(()=>transportReplay(a,n),RangeError);
});

test('the bypass replay advances the changed state, restarts coefficient comparisons and stops at six',()=>{
 const study=fakeStudy(),root={querySelectorAll:s=>s==='[data-transport-replay]'?[study]:[]};
 const select=study.querySelector('[data-transport-coefficient]');select.value='0.75';
 initializeResidualStudies(root);
 const next=study.querySelector('[data-transport-next]'),reset=study.querySelector('[data-transport-reset]');
 next.events.click();assert.match(study.querySelector('[data-residual-svg]').innerHTML,/0.625/);
 assert.match(study.querySelector('[data-transport-detail]').textContent,/starts from \(0.75, 0.25\)/);
 for(let i=0;i<8;i++)next.events.click();
 assert.equal(next.disabled,true);assert.equal(study.querySelector('[data-transport-count]').textContent,'6 / 6 applications');
 select.value='0';select.events.change();assert.equal(next.disabled,false);
 assert.match(study.querySelector('[data-transport-detail]').textContent,/produces \(0, 1\)/);
 next.events.click();assert.match(study.querySelector('[data-transport-detail]').textContent,/produces \(1, 0\)/);
 reset.events.click();assert.equal(select.value,'0.75');assert.equal(reset.disabled,true);
 assert.match(study.querySelector('[data-transport-count]').textContent,/1 \/ 6/);
 assert.match(transportReplayFigure(),/value="0.75" selected/);
});
