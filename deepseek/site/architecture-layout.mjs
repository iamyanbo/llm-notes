// One routing layout serves both the opening and enlarged architecture.
export function layoutArchitecture(c,variant,{node,path,text}){
 const v41=variant==='v41';let b='';
 const arrow=(d,phase,x,y,direction='up',kind='')=>{
  const tip=direction==='up'?`M${x-4} ${y+6} L${x} ${y} L${x+4} ${y+6}`:direction==='left'?`M${x+6} ${y-4} L${x} ${y} L${x+6} ${y+4}`:`M${x-6} ${y-4} L${x} ${y} L${x-6} ${y+4}`;
  return path(d,phase,kind)+`<path class="arch-wire ${kind}" d="${tip}"/>`;
 };
 const frame=(y,h,title)=>`<rect class="arch-stack" x="260" y="${y}" width="300" height="${h}" rx="6"/>${text(276,y+24,title,'arch-stack-title','start')}`;
 const residual=(bottom,top,phase)=>arrow(`M420 ${bottom} H286 Q278 ${bottom} 278 ${bottom-8} V${top+8} Q278 ${top} 286 ${top} H310`,phase,310,top,'right','arch-residual');
 const mix=(y,title)=>node('residual',310,y,220,22,title);
 b+=v41?frame(476,215,'Encoder × 20')+frame(194,218,'Decoder × 20'):frame(413,278,`Backbone × ${c.layers}`);
 b+=arrow('M420 786 V766',0,420,766);
 b+=arrow('M420 720 V667',0,420,667);
 if(v41)b+=arrow('M224 743 H300',0,300,743,'right');
 if(v41){
  b+=residual(680,608,1)+residual(594,531,2)+residual(398,326,4)+residual(312,249,5);
  b+=arrow('M420 625 V619',1,420,619)+arrow('M420 597 V590',1,420,590);
  b+=arrow('M420 548 V542',2,420,542)+arrow('M420 520 V470',2,420,470);
  b+=arrow('M420 442 V385',3,420,385);
  b+=arrow('M420 343 V337',4,420,337)+arrow('M420 315 V308',4,420,308);
  b+=arrow('M420 266 V260',5,420,260)+arrow('M420 238 V177',5,420,177);
  b+=arrow('M540 456 H790 V416 H690 V404',3,690,404,'up','arch-memory');
  b+=arrow('M604 365 H530',4,530,365,'left','arch-memory');
  b+=arrow('M560 287 H584 V205 H604',5,604,205,'right','arch-memory');
  b+=arrow('M224 574 H240 V680 H260',1,260,680,'right','arch-memory');
  b+=node('embedding',300,720,240,46,'Merged embeddings','text + image rows · width 5120','embedding');
  b+=node('encoder-attention',310,625,220,42,'Local + CSA2 attention','','attention');
  b+=mix(597,'Single-Pass mHC');
  b+=node('encoder-experts',310,548,220,42,'Routed + shared experts','','feed');
  b+=mix(520,'Single-Pass mHC');
  b+=node('memory',300,442,240,28,'Encoder boundary');
  b+=node('attention',310,343,220,42,'Local + global attention','','attention');
  b+=mix(315,'Single-Pass mHC');
  b+=node('experts',310,266,220,42,'Routed + shared experts','','feed');
  b+=mix(238,'Single-Pass mHC');
  b+=node('memory',604,340,172,64,'Global memory','decoder owner: layer 20','attention');
  b+=node('draft',604,170,172,70,'DSpark drafting','taps before 37, 38, 39','feed');
  b+=node('engram',24,543,200,62,'Engram memory','layers 1 and 14','feed');
  b+=node('vision',24,720,200,46,'Vision → projector','','embedding');
  b+=text(607,478,'Encoder-source row','arch-port-label','start');
  b+=text(608,324,'Shared global entries','arch-port-label','start');
  b+=text(690,257,'3 draft blocks · 5 proposals','arch-note');
 }else{
  b+=residual(680,596,2)+residual(552,464,3);
  b+=arrow('M420 625 V607',2,420,607)+arrow('M420 585 V535',2,420,535);
  b+=arrow('M420 493 V475',3,420,475)+arrow('M420 453 V177',4,420,177);
  b+=arrow('M420 702 H790 V690 H690 V674',1,690,674,'up','arch-memory');
  b+=arrow('M604 627 H582 V646 H530',2,530,646,'left','arch-memory');
  b+=arrow('M420 386 H244 V291 H224',5,224,291,'left','arch-memory');
  b+=arrow('M124 341 V324',5,124,324,'up','arch-memory');
  b+=`<circle class="arch-junction" cx="420" cy="702" r="2.5"/>`;
  b+=node('embedding',300,720,240,46,'Token embeddings',`four residual copies · width ${c.dim}`,'embedding');
  b+=node('attention',310,625,220,42,'Hybrid attention','','attention');
  b+=mix(585,'mHC update');
  b+=node('experts',310,493,220,42,'Routed + shared experts','','feed');
  b+=mix(453,'mHC update');
  b+=node('compression',604,580,172,94,'Global branches','CSA × 4 / HCA × 128','attention');
  b+=text(690,664,'separate indexer in CSA','arch-node-sub');
  b+=node('mtp',24,258,200,66,'MTP auxiliary block','predict token t + 2','feed');
  b+=text(124,361,'Training: next embedding','arch-note');
  b+=text(120,596,'Thin bypasses carry the','arch-note')+text(120,614,'four-stream residual.','arch-note');
  b+=text(690,711,`${c.heads} main query heads`,'arch-note');
 }
 b+=arrow('M420 139 V116',v41?6:5,420,116);
 b+=arrow('M420 76 V54',v41?7:6,420,54);
 b+=node('head',300,139,240,38,v41?'Carried mix + RMSNorm':'Learned mix + RMSNorm');
 b+=node('output',300,76,240,40,'Vocabulary projection','129,280 scores','output');
 b+=node('output',300,20,240,34,'Select the next token ID','','output');
 b+=text(420,805,'Token IDs · append the selected ID and continue','arch-sequence');
 return b;
}
