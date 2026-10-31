import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dayMapDays,dayMap,dayMapSVG,dayMapDefinition,dayMapMotion} from '../site/day-maps.mjs';
import {withTrace,traceSVG,createTracePlayer,initializeDay2Traces} from '../site/day2-trace.mjs';
import {dayMapFigure} from '../site/day-maps.mjs';
import {motionParts} from '../site/trace-motion.mjs';
import {readingDay,initializeDayMaps} from '../site/day-maps-ui.mjs';

const edge=(day,id)=>dayMap(day).edges.find(e=>e.id===id);
const children=(day,id,type)=>dayMap(day).edges.filter(e=>e.from===id&&(!type||e.type===type)).map(e=>e.to);
function reaches(day,from,to){const seen=new Set(),todo=[from];while(todo.length){const id=todo.shift();if(id===to)return true;if(!seen.has(id)){seen.add(id);todo.push(...children(day,id));}}return false;}

test('each daily map locates a real input, connected result and existing explanation',()=>{
 assert.deepEqual(dayMapDays,Array.from({length:19},(_,i)=>i+1));
 for(const day of dayMapDays){
  const m=dayMap(day),ids=m.nodes.map(n=>n.id);assert.equal(ids.length,new Set(ids).size);
  assert.ok(m.nodes.some(n=>n.output));assert.ok(m.purpose[0].length>35);assert.ok(m.result.length>35);
  for(const n of m.nodes){const [chapter,section]=n.href.slice(1).split('--');assert.match(readFileSync(new URL(`../content/${chapter}.html`,import.meta.url),'utf8'),new RegExp(`<section id="${section}">`));}
  for(const e of m.edges){assert.ok(ids.includes(e.from));assert.ok(ids.includes(e.to));assert.ok(e.points.length>=2);assert.ok(e.tag);}
  for(const step of m.steps)for(const id of step.edges)assert.ok(m.edges.some(e=>e.id===id));
  const html=withTrace(dayMapFigure(day),'day-overview-'+day);
  assert.match(html,/data-day-map-enlarge/);assert.match(html,/data-flow-speed/);assert.match(html,/data-week-diagram/);
  assert.match(html,/not numerical activations/);
 }
});

test('map arrows meet their own nodes and avoid unrelated module boxes',()=>{
 const boundary=(p,n)=>p[0]>=n.x&&p[0]<=n.x+n.w&&p[1]>=n.y&&p[1]<=n.y+n.h&&(p[0]===n.x||p[0]===n.x+n.w||p[1]===n.y||p[1]===n.y+n.h);
 for(const day of dayMapDays){const m=dayMap(day);for(const e of m.edges){
  const a=m.nodes.find(n=>n.id===e.from),b=m.nodes.find(n=>n.id===e.to);
  assert.ok(boundary(e.points[0],a),`Day ${day} ${e.id} starts at ${a.id}`);assert.ok(boundary(e.points.at(-1),b),`Day ${day} ${e.id} ends at ${b.id}`);
  for(let i=1;i<e.points.length;i++)for(let k=1;k<20;k++){
   const t=k/20,p=e.points[i].map((v,j)=>v*t+e.points[i-1][j]*(1-t));
   assert.ok(!m.nodes.some(n=>n!==a&&n!==b&&p[0]>n.x+1&&p[0]<n.x+n.w-1&&p[1]>n.y+1&&p[1]<n.y+n.h-1),`Day ${day} ${e.id} crosses an unrelated box`);
  }
 }}
});

test('expert and residual maps preserve shared input and the bypass',()=>{
 assert.deepEqual(new Set(children(1,'input','features')),new Set(['router','bank','shared']));
 assert.equal(edge(1,'identities').type,'control');assert.equal(edge(1,'weight').type,'control');
 assert.deepEqual(children(1,'router','features'),[]);
 assert.deepEqual(children(2,'read','features'),['sublayer']);
 assert.deepEqual(new Set(dayMap(2).edges.filter(e=>e.to==='next').map(e=>e.from)),new Set(['write','carry']));
 assert.equal(edge(2,'carry-rule').type,'control');assert.ok(reaches(2,'old','next'));
});

test('memory, address selection and the main value sum remain different paths',()=>{
 assert.ok(children(3,'input').includes('local'));assert.ok(children(3,'input').includes('compressor'));
 assert.equal(edge(3,'ids').type,'control');assert.ok(!reaches(3,'local','compressor'));
 assert.equal(edge(4,'compare-key').from,'keys');assert.equal(edge(4,'result').type,'control');
 assert.equal(dayMap(4).nodes.find(n=>n.output).id,'addresses');
 assert.deepEqual(new Set(children(5,'list')),new Set(['scores','output']));
 assert.equal(edge(5,'values').type,'features');assert.equal(edge(5,'weights').type,'control');
 assert.equal(edge(5,'sink-score').to,'normalize');
});

test('MTP receives its next embedding without leaking it into the backbone head',()=>{
 assert.ok(reaches(6,'final','head'));assert.ok(reaches(6,'final','fusion'));
 assert.ok(reaches(6,'next-embedding','further'));assert.ok(!reaches(6,'next-embedding','head'));
 assert.deepEqual(children(7,'loss'),['gradients']);assert.deepEqual(children(7,'gradients'),['optimizer']);
 assert.equal(edge(7,'gradient').type,'gradient');assert.ok(reaches(7,'updated','forward'));
});

test('schematic packets wait for incoming dependencies and retain a stable canvas',()=>{
 const t=dayMapMotion(4,3);assert.equal(t.layers['predict-weight'],0);assert.equal(t.layers['mix-weight'],1);assert.equal(t.layers.rank,2);
 assert.equal(t.duration,26000);
 const a=motionParts(dayMapSVG(4,3,2000/t.duration)),b=motionParts(dayMapSVG(4,3,3000/t.duration));
 assert.equal(a.base,b.base);assert.equal(a.packets.length,1);assert.notEqual(a.packets[0].transform,b.packets[0].transform);
 assert.match(a.packets[0].body,/same input/);assert.doesNotMatch(a.packets[0].body,/block scores/);
 for(const day of dayMapDays){const d=dayMapDefinition(day);for(let i=0;i<d.steps.length;i++){
  assert.equal(motionParts(dayMapSVG(day,i,1)).packets.length,0);
  assert.equal(motionParts(dayMapSVG(day,i,.5,{motion:false})).packets.length,0);
  for(const p of [0,.2,.6,1])assert.doesNotMatch(traceSVG('day-overview-'+day,{},i,p),/NaN|undefined|Infinity/);
 }}
});

function clock(){let serial=0;const pending=new Map();return {schedule:fn=>{pending.set(++serial,fn);return serial;},cancel:id=>pending.delete(id),advance:t=>{const list=[...pending.values()];pending.clear();list.forEach(fn=>fn(t));},size:()=>pending.size};}
test('module tours preserve pause and half-speed, and stop at the last part',()=>{
 const d=dayMapDefinition(4),c=clock(),p=createTracePlayer({count:d.steps.length,render:()=>{},schedule:c.schedule,cancel:c.cancel,timing:d.timing});
 p.next();c.advance(0);c.advance(3000);assert.equal(p.state().phase,3000/18000);
 p.pause();const old=p.state().phase;p.setSpeed(.5);p.play();c.advance(6000);c.advance(8000);assert.equal(p.state().phase,old+1000/18000);
 p.pause();assert.equal(c.size(),0);p.seek(d.steps.length-2);p.setSpeed(1);p.next();c.advance(10000);c.advance(10000+d.timing(d.steps.length-1,0).duration+1);
 assert.equal(p.state().playing,false);assert.equal(p.state().index,d.steps.length-1);assert.equal(c.size(),0);
});

test('the live map binds part selection, inspection pause and reduced motion',()=>{
 const nodes=new Map(),listeners={},c=clock(),preference={matches:false,addEventListener(_t,fn){this.changed=fn;},removeEventListener(){}};
 const e={dataset:{flowKind:'day-overview-4',flowParams:'{}'},querySelector(s){if(['[data-d2-svg]','[data-residual-svg]'].includes(s))return null;if(!nodes.has(s))nodes.set(s,{value:'0',textContent:'',innerHTML:'',events:{},setAttribute(k,v){this[k]=v;},addEventListener(t,fn){this.events[t]=fn;}});return nodes.get(s);},addEventListener(t,fn){listeners[t]=fn;},removeEventListener(){}};
 const root={querySelectorAll:()=>[e],addEventListener(){},removeEventListener(){}};
 const bound=initializeDay2Traces(root,{preference,schedule:c.schedule,cancel:c.cancel,Observer:null}),canvas=e.querySelector('[data-week-diagram]'),p=bound.players[0].player;
 e.querySelector('[data-flow-next]').events.click();c.advance(0);c.advance(3000);assert.equal(p.state().playing,true);
 const phase=p.state().phase;listeners['day-map-inspect']();assert.equal(p.state().playing,false);assert.equal(p.state().phase,phase);
 const retained={...p.state()};listeners.click({target:{closest:s=>s==='[data-day-map-enlarge]'||s==='button,input,select'?{}:null}});assert.deepEqual(p.state(),retained,'The enlarge click must not be mistaken for a parameter change');
 const select=e.querySelector('[data-flow-scene]');select.value='3';select.events.change({target:select});assert.match(canvas.innerHTML,/Combine the head matches/);
 preference.matches=true;preference.changed();e.querySelector('[data-flow-play]').events.click();assert.equal(c.size(),0);assert.equal(p.state().index,dayMapDefinition(4).steps.length-1);assert.doesNotMatch(canvas.innerHTML,/<g class="day-map-packet/);
 bound.destroy();
});

class Node {
 constructor(tag,doc){this.tag=tag;this.doc=doc;this.children=[];this.dataset={};this.events={};this.attrs={};this.hidden=false;this.classList={add(){},remove(){}};this.rect={top:-1000,bottom:-100};}
 append(...nodes){for(const n of nodes){n.remove();n.parent=this;this.children.push(n);}}
 before(n){const p=this.parent;n.parent=p;p.children.splice(p.children.indexOf(this),0,n);}
 replaceWith(n){const p=this.parent,index=p.children.indexOf(this);n.remove();p.children.splice(index,1,n);n.parent=p;this.parent=null;}
 remove(){if(this.parent){const p=this.parent;p.children.splice(p.children.indexOf(this),1);this.parent=null;}}
 setAttribute(k,v){this.attrs[k]=v;}
 removeAttribute(k){delete this.attrs[k];}
 addEventListener(k,fn){(this.events[k]??=[]).push(fn);}
 removeEventListener(k,fn){this.events[k]=(this.events[k]??[]).filter(f=>f!==fn);}
 dispatchEvent(e){(this.events[e.type]??[]).forEach(fn=>fn(e));}
 focus(){this.doc.activeElement=this;}
 getBoundingClientRect(){return this.rect;}
 closest(s){return s==='a'&&this.tag==='a'?this:null;}
 showModal(){this.attrs.open='';}
 close(){this.removeAttribute('open');this.dispatchEvent({type:'close'});}
 set innerHTML(_html){if(this.tag==='dialog'){this.selectors={};for(const name of ['title','close','content']){const n=new Node(name,this.doc);this.selectors['[data-day-map-'+(name==='close'?'close':'dialog-'+name)+']']=n;this.append(n);}}}
 querySelector(s){return this.selectors?.[s]??null;}
}
function fixture(){
 const doc={createElement(tag){return new Node(tag,doc);},createComment(){return new Node('comment',doc);}};
 doc.body=new Node('body',doc);doc.documentElement=new Node('html',doc);
 const article=new Node('article',doc);doc.body.append(article);
 const figure=new Node('figure',doc),button=new Node('button',doc),link=new Node('a',doc);figure.dataset.dayMap='4';link.dataset.openDayMap='4';
 figure.selectors={'[data-day-map-enlarge]':button};figure.append(button);article.append(figure);
 const section=new Node('section',doc);section.dataset.studyDay='4';section.rect={top:-1200,bottom:1200};
 doc.querySelectorAll=s=>s==='[data-day-map]'?[figure]:s==='[data-open-day-map]'?[link]:s==='section[data-study-day]'?[section]:[];
 const events={},view={Event:class{constructor(type){this.type=type;}},addEventListener(k,fn){events[k]=fn;},removeEventListener(k){delete events[k];}};
 return {doc,article,figure,button,link,section,view,events};
}
test('large map moves the same figure, pauses it and restores its original position',()=>{
 const f=fixture(),state={index:3,phase:.42};let paused=0;f.figure.state=state;f.figure.addEventListener('day-map-inspect',()=>paused++);
 const ui=initializeDayMaps(f.doc,{view:f.view});
 f.button.dispatchEvent({type:'click'});assert.equal(paused,1);assert.notEqual(f.figure.parent,f.article);
 assert.equal(f.figure.state,state);assert.deepEqual(f.figure.state,{index:3,phase:.42});
 ui.close();assert.equal(f.figure.parent,f.article);assert.equal(f.article.children[0],f.figure);assert.equal(f.doc.activeElement,f.button);assert.equal(paused,2);
 let prevented=false;f.link.dispatchEvent({type:'click',preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.notEqual(f.figure.parent,f.article);
 ui.close();assert.equal(f.doc.activeElement,f.link);ui.destroy();assert.equal(f.doc.body.children.length,1);
});

test('the map dock follows the active day and hides outside the study route',()=>{
 const f=fixture(),ui=initializeDayMaps(f.doc,{view:f.view}),dock=f.doc.body.children.at(-1);
 assert.equal(readingDay([f.section]),4);assert.equal(dock.hidden,false);assert.match(dock.textContent,/Day 4/);
 dock.dispatchEvent({type:'click'});assert.equal(dock.hidden,true);ui.close();assert.equal(dock.hidden,false);
 f.section.rect.bottom=100;f.events.scroll();assert.equal(readingDay([f.section]),null);assert.equal(dock.hidden,true);ui.destroy();
});
