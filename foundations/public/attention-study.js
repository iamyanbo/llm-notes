// A numerical example for one head. These are specified matrices, not model activations.
import {attentionPackets} from './attention-packets.js';
export const ATTENTION_EXAMPLE = (() => {
  const X=[[1,0],[0,1],[1,1]];
  const WQ=[[1,.5],[0,1]], WK=[[1,0],[.5,1]], WV=[[.5,1],[1,-.5]];
  const multiply=(a,b)=>a.map(row=>b[0].map((_,j)=>row.reduce((sum,value,k)=>sum+value*b[k][j],0)));
  const Q=multiply(X,WQ),K=multiply(X,WK),V=multiply(X,WV);
  const scores=Q.map(q=>K.map(k=>q.reduce((sum,value,j)=>sum+value*k[j],0)/Math.sqrt(2)));
  const weights=scores.map(row=>{
    const exps=row.map(value=>Math.exp(value-Math.max(...row)));
    return exps.map(value=>value/exps.reduce((sum,x)=>sum+x,0));
  });
  return {X,WQ,WK,WV,Q,K,V,scores,weights,H:multiply(weights,V)};
})();

export const ATTENTION_OPERATIONS=['Project Q, K, V','Score and scale','Row-wise softmax','Weight values','Join heads and project'];

export function createAttentionStudy(document,preference,{onInspect=()=>{},schedule=setTimeout,cancel=clearTimeout}={}) {
  const panels=[...document.querySelectorAll('[data-attention-study]')];
  let active=false,running=false,operation=0,row=0,timer=null;
  const stop=()=>{if(timer!==null)cancel(timer);timer=null;};
  const render=()=>panels.forEach(panel=>{
    panel.dataset.operation=String(operation);
    panel.dataset.running=String(running&&!preference.matches);
    panel.querySelectorAll('[data-attention-operation]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.attentionOperation)===operation)));
    panel.querySelectorAll('[data-attention-row]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.attentionRow)===row)));
    panel.querySelectorAll('[data-matrix-row]').forEach(group=>group.dataset.rowActive=String(Number(group.dataset.matrixRow)===row));
    panel.querySelectorAll('[data-operation-step]').forEach(group=>{
      const step=Number(group.dataset.operationStep);
      group.dataset.reached=String(step<=operation);group.dataset.current=String(step===operation);
      group.setAttribute('aria-hidden',String(step>operation));
    });
    panel.querySelectorAll('[data-attention-equation]').forEach(equation=>equation.hidden=Number(equation.dataset.attentionEquation)!==operation);
    panel.querySelector('[data-attention-status]').textContent=ATTENTION_OPERATIONS[operation];
    const layer=panel.querySelector('[data-attention-packets]'),stamp=[operation,row,active,preference.matches].join(':');
    if(layer){
      if(layer.dataset.frame!==stamp){
        layer.dataset.frame=stamp;layer.innerHTML=attentionPackets(ATTENTION_EXAMPLE,operation,row,active&&!preference.matches);
        if(active&&!preference.matches){panel.querySelector('svg')?.setCurrentTime?.(0);panel.querySelector('svg')?.unpauseAnimations?.();}
      }
      else if(!running)panel.querySelector('svg')?.pauseAnimations?.();
      if(running)panel.querySelector('svg')?.unpauseAnimations?.();
    }
  });
  const advance=()=>{
    stop();
    if(active&&running&&!preference.matches&&operation<4)timer=schedule(()=>{timer=null;operation++;render();advance();},1800);
  };
  const selectOperation=next=>{
    if(!Number.isInteger(next)||next<0||next>4)return;
    onInspect({operation:next,row});running=false;stop();operation=next;render();
  };
  panels.forEach(panel=>{
    panel.querySelectorAll('[data-attention-operation]').forEach(button=>button.addEventListener('click',()=>selectOperation(Number(button.dataset.attentionOperation))));
    panel.querySelectorAll('[data-attention-row]').forEach(button=>button.addEventListener('click',()=>{
      onInspect({operation,row:Number(button.dataset.attentionRow)});running=false;stop();row=Number(button.dataset.attentionRow);render();
    }));
  });
  preference.addEventListener?.('change',()=>{if(preference.matches){running=false;stop();render();}});
  render();
  return {
    update(next){
      if(next.active&&!active)operation=0;
      const changed=active!==next.active||running!==next.running;
      active=next.active;running=next.running;render();
      if(changed)advance();
    },
    state:()=>({active,running,operation,row}),
    setOperation(next){
      if(!Number.isInteger(next)||next<0||next>4)return;
      stop();operation=next;render();advance();
    },
    destroy:stop,
  };
}
