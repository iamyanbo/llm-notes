import test from 'node:test';
import assert from 'node:assert/strict';
import {TRACE_TIMING,traceDuration,tracePhase,calculationTiming,ease,cubicPoint,roundedPolylinePoint,motionParts,createTraceView} from '../site/trace-motion.mjs';
import {createTracePlayer,traceSVG} from '../site/day2-trace.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} differs from ${b}`);
function clock(){let id=0;const pending=new Map();return {schedule:f=>{pending.set(++id,f);return id;},cancel:i=>pending.delete(i),advance:t=>{const list=[...pending.values()];pending.clear();list.forEach(f=>f(t));}};}

test('each operand and product keeps readable travel time when the number of terms grows',()=>{
 assert.ok(TRACE_TIMING.operand>=1200);assert.ok(TRACE_TIMING.product>=800);assert.ok(TRACE_TIMING.resultHold>=1800);
 assert.equal(traceDuration(1),7400);assert.equal(traceDuration(4),16100);
 for(const n of [1,2,4,8])for(let i=0;i<n;i++){
  const start=300+i*2900;
  near(tracePhase(start+600,n),.65*(i+.35)/n);
  near(tracePhase(start+1600,n),.65*(i+.85)/n);
  near(tracePhase(start+2100,n),.65*(i+1)/n);
  near(tracePhase(start+2800,n),.65*(i+1)/n);
 }
 near(tracePhase(300+4*2900+500,4),.65);near(tracePhase(traceDuration(4)-1000,4),1);
});

test('every display frame updates motion; speed changes and pause preserve the current position',()=>{
 const c=clock(),frames=[],p=createTracePlayer({count:3,terms:()=>2,render:s=>frames.push({...s}),schedule:c.schedule,cancel:c.cancel});
 p.play();c.advance(0);
 for(let i=1;i<=60;i++){const before=frames.length;c.advance(i*1000/60);assert.equal(frames.length,before+1);}
 near(p.state().phase,tracePhase(1000,2));const saved=p.state().phase;p.setSpeed(.5);near(p.state().phase,saved);
 c.advance(1200);near(p.state().phase,tracePhase(1100,2));p.pause();c.advance(10000);near(p.state().phase,tracePhase(1100,2));
 p.play();c.advance(20000);c.advance(20200);near(p.state().phase,tracePhase(1200,2));p.setSpeed(2);near(p.state().phase,tracePhase(1200,2));
 c.advance(20300);near(p.state().phase,tracePhase(1400,2));p.setSpeed(NaN);assert.equal(p.state().speed,2);p.destroy();
});

test('easing settles at both ends and numerical packets follow the displayed cubic route',()=>{
 assert.equal(ease(0),0);assert.equal(ease(1),1);near(ease(.5),.5);assert.ok(ease(.01)<.001);assert.ok(1-ease(.99)<.001);
 assert.deepEqual(cubicPoint([0,0],[0,100],[100,100],[100,0],0),[0,0]);
 assert.deepEqual(cubicPoint([0,0],[0,100],[100,100],[100,0],1),[100,0]);
 assert.deepEqual(cubicPoint([0,0],[0,100],[100,100],[100,0],.5),[50,75]);
 const svg=traceSVG('transport',{index:3},1,.65/2*.7*.5),p=motionParts(svg).packets[0];
 const path=svg.match(/class="trace-route [^"]*trace-active[^"]*" d="M([\d.]+) ([\d.]+) C([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+)"/).slice(1).map(Number);
 const pos=p.transform.match(/translate\(([\d.]+) ([\d.]+)\)/).slice(1).map(Number),expected=cubicPoint(path.slice(0,2),path.slice(2,4),path.slice(4,6),path.slice(6,8),.5);
 pos.forEach((v,i)=>assert.ok(Math.abs(v-expected[i])<.02));
});

test('addition has independent travel and a reading hold before the final result moves',()=>{
 for(const n of [1,2,4]){
  const contributions=TRACE_TIMING.lead+n*(TRACE_TIMING.operand+TRACE_TIMING.product+TRACE_TIMING.termHold);
  near(calculationTiming(contributions,n).phase,.65);
  near(calculationTiming(contributions+700*n,n).phase,.725);
  near(calculationTiming(contributions+1400*n+400,n).phase,.8);
  const arriving=calculationTiming(contributions+1400*n+900+TRACE_TIMING.result/2,n);
  near(arriving.phase,.88);
  assert.ok(arriving.duration>traceDuration(n));
  assert.equal(calculationTiming(arriving.duration,n).phase,1);
 }
});

function fakeCanvas(){
 let writes=0,svg={},layer;
 const node=()=>({attrs:{},contents:'',getAttribute(k){return this.attrs[k]??null;},setAttribute(k,v){this.attrs[k]=v;},set innerHTML(v){this.contents=v;},remove(){layer.children.splice(layer.children.indexOf(this),1);}});
 const c={ownerDocument:{createElementNS:node},get writes(){return writes;},get svg(){return svg;},get layer(){return layer;},externalReplace:()=>{layer=null;},querySelector:()=>layer,
  set innerHTML(markup){writes++;svg={};layer={children:[],appendChild(n){this.children.push(n);},get lastElementChild(){return this.children.at(-1);}};for(const p of motionParts(markup).packets){const n=node();n.attrs={class:p.className,transform:p.transform};n.contents=p.body;layer.children.push(n);}}
 };return c;
}
test('travel preserves SVG and packet identity rather than replacing the diagram each frame',()=>{
 for(const kind of ['transport','hc-overview','alternatives']){
  const c=fakeCanvas(),paint=createTraceView(c),first=traceSVG(kind,{},1,.05);paint(first);const svg=c.svg,packet=c.layer.children[0],start=packet.getAttribute('transform');
  for(const phase of [.07,.09,.11,.13])paint(traceSVG(kind,{},1,phase));
  assert.equal(c.writes,1);assert.equal(c.svg,svg);assert.equal(c.layer.children[0],packet);assert.notEqual(packet.getAttribute('transform'),start);
  paint(traceSVG(kind,{},1,1));assert.ok(c.writes>1);assert.equal(c.layer.children.length,0);
 }
});
test('the tracing layer remounts after an existing parameter control replaces the canvas',()=>{
 const c=fakeCanvas(),paint=createTraceView(c),svg=traceSVG('transport',{},0);
 paint(svg);assert.equal(c.writes,1);c.externalReplace();paint(svg);
 assert.equal(c.writes,2);assert.ok(c.layer);
});

test('the bypass turns through a rounded corner without jumping or overshooting',()=>{
 const points=[[0,0],[100,0],[100,100],[200,100]];
 assert.deepEqual(roundedPolylinePoint(points,0),points[0]);assert.deepEqual(roundedPolylinePoint(points,1),points.at(-1));
 const curve=Array.from({length:121},(_,i)=>roundedPolylinePoint(points,i/120));
 assert.ok(curve.some(([x,y])=>x<100&&y>0));
 for(let i=1;i<curve.length;i++){const [x,y]=curve[i];assert.ok(x>=0&&x<=200&&y>=0&&y<=100);assert.ok(Math.hypot(x-curve[i-1][0],y-curve[i-1][1])<3);}
});
