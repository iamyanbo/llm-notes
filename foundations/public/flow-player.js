export const FLOW_STEPS = [
  {stage:'embedding',title:'Embeddings and positions'},
  {stage:'selfAttention',title:'Encoder self-attention'},
  {stage:'feedForward',title:'Encoder feed-forward'},
  {stage:'maskedAttention',title:'Masked decoder attention'},
  {stage:'crossAttention',title:'Encoder–decoder attention'},
  {stage:'feedForward',title:'Decoder feed-forward'},
  {stage:'output',title:'Output probabilities'},
];

export function createFlowPlayer({onChange,autoplay=true,delay=4600,schedule=setTimeout,cancel=clearTimeout}) {
  let index=0, playing=autoplay, visible=true, timer=null;
  const snapshot=()=>({index,playing,running:playing&&visible});
  const publish=()=>{
    if(timer!==null){cancel(timer);timer=null;}
    onChange(snapshot());
    if(playing&&visible)timer=schedule(()=>{timer=null;index=(index+1)%FLOW_STEPS.length;publish();},typeof delay==='function'?delay(index):delay);
  };
  const player={
    state:snapshot,
    play:()=>{playing=true;publish();},
    pause:()=>{playing=false;publish();},
    step:()=>{playing=false;index=(index+1)%FLOW_STEPS.length;publish();},
    select:next=>{if(!Number.isInteger(next)||next<0||next>=FLOW_STEPS.length)return;playing=false;index=next;publish();},
    restart:()=>{index=0;publish();},
    setVisible:next=>{if(visible===Boolean(next))return;visible=Boolean(next);publish();},
    destroy:()=>{playing=false;if(timer!==null)cancel(timer);timer=null;},
  };
  publish();
  return player;
}
