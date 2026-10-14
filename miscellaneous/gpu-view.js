import {text,rect,line,svg,metrics,transfer} from './lab-graphics.js';

const stages=[
  'The host program selects and launches a GPU kernel.',
  'Input tiles are available in the GPU’s high-bandwidth memory.',
  'Loads bring the input tiles through the on-chip cache.',
  'A cooperating thread block stages data in shared memory and registers.',
  'The matrix unit forms the output tile from the inputs.',
  'The kernel writes its output to device memory.',
  'A later GPU kernel can reuse the output without returning it to the CPU.',
  'If the host requests the result, it is copied back to host memory.'
];

function stack(x,y,active=false){
  let out='';for(let i=3;i>=0;i--)out+=rect(x+i*3,y-i*7,78,24,active?'active':'warm');
  return out+text(x+42,y+18,'HBM','small','middle');
}

export function packagingFigure(){
  let body=rect(64,232,552,32,'face')+rect(91,195,498,24,'active');
  body+=rect(251,128,180,52,'face')+text(341,159,'Logic chip','','middle');
  body+=stack(122,151)+stack(482,151);
  for(let x=112;x<580;x+=22)body+='<circle cx="'+x+'" cy="224" r="3" class="signal"/>';
  body+=line(175,191,175,179,'axis')+line(340,191,340,181,'axis')+line(527,191,527,179,'axis');
  body+=text(340,38,'Logic and memory assembled in one package','','middle')+text(155,94,'Stacked memory','small','middle')+text(526,94,'Stacked memory','small','middle');
  body+=text(340,294,'Dense connections through an interposer','small','middle')+text(340,321,'Package substrate connects the assembly to the board','small','middle');
  return '<figure class="hardware-picture">'+svg(body,345)+'<figcaption>Original cross-section schematic of logic and HBM on an interposer, following the arrangement described for CoWoS-S. Layers and spacing are enlarged for readability; this is not a drawing of a particular product.</figcaption></figure>';
}

export function gpuView(d){
  const s=d.step,exploded=d.choice===1,left=exploded?25:82,right=exploded?576:520,my=exploded?170:218,base=exploded?458:426;
  let body=rect(178,23,325,54,s===0||s===7?'active':'face')+text(340,46,'Host: CPU + program','','middle')+text(340,66,'CUDA launches a compiled kernel','small','middle');
  body+=rect(60,base,560,35,'face')+text(340,base+24,'Package substrate','small','middle');
  for(let x=82;x<=598;x+=24)body+=line(x,base-12,x,base,'axis');
  body+='<g class="gpu-piece" style="--gpu-x:'+(exploded?57:-57)+'px;--gpu-y:'+(exploded?48:-48)+'px">'+stack(left,my,s===1||s===5||s===6)+'</g>';
  body+='<g class="gpu-piece" style="--gpu-x:'+(exploded?-56:56)+'px;--gpu-y:'+(exploded?48:-48)+'px">'+stack(right,my,s===1||s===5||s===6)+'</g>';
  body+=rect(212,155,256,255,'face')+text(340,181,'GPU compute die','','middle');
  body+=rect(231,198,218,33,s===2?'active':'warm')+text(340,220,'L2 cache','small','middle');
  body+=rect(231,249,218,138,'face')+text(340,272,'One processing unit (SM)','small','middle');
  body+=rect(245,283,190,26,s===3?'active':'face')+text(340,302,'Shared memory','small','middle');
  body+=rect(245,316,190,24,s===3||s===4?'active':'face')+text(340,333,'Registers / operands','small','middle');
  body+=rect(245,347,190,27,s===4?'active':'warm')+text(340,366,'Tensor Core matrix unit','small','middle');
  body+=text(477,371,'× many','small');
  // Arrows show one illustrative kernel path, not mandatory cache residency.
  if(s===0)body+=line(340,78,340,145)+text(354,111,'launch','small');
  if(s===1)body+=line(184,71,left+40,my-30)+text(78,114,'inputs copied','small');
  if(s===2){body+=line(left+82,my+9,230,215)+transfer([left+82,my+9],[230,215],'A, B');}
  if(s===3){body+=line(340,232,340,282)+transfer([340,233],[340,280],'A, B');}
  if(s===4){body+=line(434,328,455,357)+text(506,314,'C = A × B','small','middle');}
  if(s===5){body+=line(436,360,right+40,my+28)+transfer([436,360],[right+40,my+28],'C');}
  if(s===6)body+=line(right,my+9,449,215)+text(530,121,'next kernel reads C','small','middle');
  if(s===7){body+=line(right+40,my-25,503,65)+transfer([right+40,my-25],[503,65],'C');}
  body+=text(20,base+65,exploded?'Exploded package: parts separated to reveal their roles.':'Assembled package: memory sits beside the compute die.','small');
  return {html:svg(body,base+89)+metrics([['Input A','[[1, 2], [3, 4]]'],['Input B','[[2, 0], [1, 2]]'],['Output C',s>=4?'['+d.output.map(row=>'['+row.join(', ')+']').join(', ')+']':'not computed yet']]),status:stages[s],note:'A simplified NVIDIA-style tiled kernel, with exact hand-chosen inputs. The number and positions of components are schematic. Hardware may overlap or bypass transfers; CUDA is software, not a destination inside the chip. AMD uses compute units and Matrix Cores with its own memory organization.'};
}
