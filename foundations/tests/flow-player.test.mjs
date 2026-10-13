import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createFlowPlayer,FLOW_STEPS} from '../public/flow-player.js';

const fixture=autoplay=>{
  const timers=new Map(),changes=[];let next=0;
  const player=createFlowPlayer({autoplay,onChange:state=>changes.push(state),schedule:fn=>{timers.set(++next,fn);return next;},cancel:id=>timers.delete(id)});
  const tick=()=>{const [id,fn]=timers.entries().next().value;timers.delete(id);fn();};
  return {player,timers,changes,tick};
};
test('playback visits all stages, loops, and maintains just one timer',()=>{
  const {player,timers,tick}=fixture(true);
  for(let index=1;index<=FLOW_STEPS.length;index++){tick();assert.equal(player.state().index,index%FLOW_STEPS.length);assert.equal(timers.size,1);}
  player.destroy();assert.equal(timers.size,0);
});
test('pause, inspect, step, and restart give the reader control of the sequence',()=>{
  const {player,timers}=fixture(true);
  player.pause();assert.equal(timers.size,0);
  player.select(4);assert.deepEqual(player.state(),{index:4,playing:false,running:false});
  player.step();assert.equal(player.state().index,5);assert.equal(timers.size,0);
  player.select(99);assert.equal(player.state().index,5);
  player.restart();assert.equal(player.state().index,0);assert.equal(timers.size,0);
  player.play();assert.equal(timers.size,1);player.destroy();
});
test('offscreen playback suspends scheduling without overriding a manual pause',()=>{
  const {player,timers}=fixture(true);
  player.setVisible(false);assert.equal(timers.size,0);assert.equal(player.state().playing,true);
  player.setVisible(true);assert.equal(timers.size,1);
  player.pause();player.setVisible(false);player.setVisible(true);
  assert.equal(timers.size,0);assert.equal(player.state().playing,false);
});
test('reduced-motion initialization leaves the diagram still until requested',()=>{
  const {player,timers}=fixture(false);
  assert.equal(player.state().running,false);assert.equal(timers.size,0);
  player.step();assert.equal(player.state().index,1);assert.equal(timers.size,0);
  player.destroy();
});
