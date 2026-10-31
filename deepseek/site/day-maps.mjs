import {ease,roundedPolylinePoint} from './trace-motion.mjs';
import {esc} from './trace-scene.mjs';
import {continuationMaps} from './continuation-maps.mjs';

const N=(id,x,y,w,h,title,lines,href,extra={})=>({id,x,y,w,h,title,lines,href,...extra});
const E=(id,from,to,points,tag,type='features')=>({id,from,to,points,tag,type});
const S=(title,detail,edges)=>({title,detail,edges});
const maps=[
 {day:1,title:'More stored capacity, a few experts per token',part:['moe'],height:720,
  purpose:['How can we add learned functions without running all of them for every token?'],
  result:'One feed-forward update. Day 2 determines how that update enters the retained state.',
  nodes:[
   N('input',285,290,195,94,'Current token',['Features after attention'],'#experts--expert-function'),
   N('router',540,122,235,86,'Router',['Choose expert IDs and weights'],'#experts--selection-weight'),
   N('bank',540,282,245,112,'Routed expert bank',['Many networks stored;','run the chosen few'],'#experts--mixture',{bank:true}),
   N('shared',540,457,245,86,'Shared expert',['Runs for every token'],'#experts--mixture'),
   N('combine',920,282,285,112,'Combine outputs',['Weight the routed results;','add the shared result'],'#experts--mixture'),
   N('output',920,484,285,80,'Feed-forward update',['One row for this token'],'#experts--mixture',{output:true})],
  edges:[
   E('route','input','router',[[382,290],[382,165],[540,165]],'current input'),
   E('identities','router','bank',[[657,208],[657,282]],'chosen IDs','control'),
   E('weight','router','combine',[[775,165],[1062,165],[1062,282]],'mixture weights','control'),
   E('routed-input','input','bank',[[480,337],[540,337]],'input features'),
   E('shared-input','input','shared',[[382,384],[382,500],[540,500]],'same input'),
   E('routed-output','bank','combine',[[785,337],[920,337]],'expert outputs'),
   E('shared-output','shared','combine',[[785,500],[850,500],[850,370],[920,370]],'shared output'),
   E('return','combine','output',[[1062,394],[1062,484]],'combined update')],
  steps:[S('Choose the work','The router reads the current row and chooses identities and mixture weights. Those choices do not replace the row supplied to the experts.',['route','identities','weight']),S('Run only the chosen routed experts','Each selected expert receives the same input row. Other routed experts retain parameters but are not evaluated for this token.',['routed-input','routed-output']),S('Keep the shared computation','The shared expert always processes this row, alongside the chosen routed experts.',['shared-input','shared-output']),S('Return one update','The weighted routed outputs and shared output form one row. Its residual connection is the next construction.',['return'])]},
 {day:2,title:'Several retained rows, one sublayer input',part:['streams','connections'],height:740,
  purpose:['Can several working rows retain more choices without widening the sublayer?'],
  result:'Read one mixture, compute one update, carry old state and add the update to the streams.',
  nodes:[
   N('old',285,305,195,112,'Old residual streams',['Four rows for one token'],'#residuals--wider-stream',{streams:true}),
   N('read',550,125,235,86,'Read a mixture',['One narrow input row'],'#residuals--hyper-connections'),
   N('sublayer',930,125,275,86,'Attention or MoE',['One sublayer evaluation'],'#residuals--whole-block'),
   N('predictor',550,310,235,100,'Connection predictor',['Learn read, bypass','and write coefficients'],'#residuals--coefficient-map'),
   N('write',930,330,275,86,'Distribute the update',['Different amount per stream'],'#residuals--hyper-connections'),
   N('carry',550,520,235,86,'Carry or mix old rows',['Bypass the sublayer'],'#residuals--stochastic'),
   N('next',930,535,275,112,'New residual streams',['Carried state + new update','at each destination'],'#residuals--whole-block',{streams:true,output:true})],
  edges:[
   E('read-input','old','read',[[382,305],[382,168],[550,168]],'old rows'),
   E('evaluate','read','sublayer',[[785,168],[930,168]],'one mixed row'),
   E('predict','old','predictor',[[480,360],[550,360]],'old features'),
   E('read-rule','predictor','read',[[667,310],[667,211]],'read coefficients','control'),
   E('carry-rule','predictor','carry',[[667,410],[667,520]],'bypass matrix','control'),
   E('write-rule','predictor','write',[[785,360],[930,373]],'write coefficients','control'),
   E('new-update','sublayer','write',[[1067,211],[1067,330]],'one update'),
   E('old-path','old','carry',[[382,417],[382,563],[550,563]],'retained state'),
   E('carry-result','carry','next',[[785,563],[930,563]],'carried rows'),
   E('inject','write','next',[[1067,416],[1067,535]],'scaled updates')],
  steps:[S('Predict the connections','A predictor reads the current streams and generates separate read, bypass and write coefficients. Attention and MoE have separate predictors.',['predict','read-rule','carry-rule','write-rule']),S('Supply one narrow input','The input connection mixes the retained rows. The whole attention or MoE sublayer receives this one row; routed experts inside MoE share it.',['read-input','evaluate']),S('Compute and distribute one result','The sublayer runs once. Output coefficients determine how much of this same update reaches each destination stream.',['new-update','inject']),S('Keep a route for existing state','The old streams travel around the sublayer. The constrained bypass can mix them without evaluating extra sublayers.',['old-path','carry-result']),S('Continue with several streams','At each stream, add its carried row and its part of the new update. The following sublayer reads this changed state.',['carry-result','inject'])]},
 {day:3,title:'Recent detail and compressed history coexist',part:['attention'],height:740,
  purpose:['A nearby call may need both its surrounding lines and a much older definition.'],
  result:'Today builds completed compressed entries. Days 4–5 develop selection and the main read.',
  nodes:[
   N('input',285,310,195,96,'Attention inputs',['One prepared row per token'],'#compression--projection-order'),
   N('local',555,125,250,86,'Recent individual entries',['Keep nearby positions distinct'],'#compression--v4-overlap'),
   N('compressor',555,350,250,92,'Compressor · Day 3',['Learned weighted pooling','over neighboring blocks'],'#compression--weighted-block'),
   N('global',900,350,305,92,'Compressed memory',['Completed summaries','spanning the history'],'#compression--completion'),
   N('indexer',555,540,250,90,'Indexer · Day 4',['Current queries + own keys'],'#attention--query-construction',{later:true}),
   N('selected',900,540,305,90,'Gather chosen summaries',['Use selected block addresses'],'#attention--two-comparisons',{later:true}),
   N('reader',900,125,305,100,'Main attention · Day 5',['Read recent + chosen entries'],'#attention--local-global',{later:true,output:true})],
  edges:[
   E('keep-local','input','local',[[382,310],[382,168],[555,168]],'individual entries'),
   E('prepare','input','compressor',[[480,358],[520,358],[520,396],[555,396]],'same inputs'),
   E('pool','compressor','global',[[805,396],[900,396]],'block summaries'),
   E('query','input','indexer',[[382,406],[382,585],[555,585]],'current input'),
   E('ids','indexer','selected',[[805,585],[900,585]],'selected addresses','control'),
   E('gather','global','selected',[[1052,442],[1052,540]],'stored summaries'),
   E('global-read','selected','reader',[[1205,585],[1220,585],[1220,175],[1205,175]],'chosen entries'),
   E('local-read','local','reader',[[805,168],[900,168]],'recent entries')],
  steps:[S('Keep nearby detail','The local branch retains individual recent entries. Nearby positions remain separately accessible.',['keep-local']),S('Build a second memory at the same time','The same attention inputs also supply the compressor. Pooling combines neighboring source positions into a smaller collection of entries; it does not wait for local eviction.',['prepare','pool']),S('Select addresses for the current token','The indexer uses current queries and its own separately compressed keys. It supplies addresses, not the main vectors that attention will transmit.',['query','ids']),S('Read both memories','Main attention gathers the selected compressed vectors alongside recent entries. A recent source position can contribute to both representations.',['gather','global-read','local-read'])]},
 {day:4,title:'Choose where main attention will read',part:['attention'],height:760,
  purpose:['Compression still leaves many summaries. Which should the current token read?'],
  result:'A list of completed block addresses. The wider main-memory vectors are read on Day 5.',
  nodes:[
   N('input',285,135,225,92,'Current attention input',['After stream mixture + RMSNorm'],'#attention--query-construction'),
   N('queries',585,135,240,92,'Indexer query heads',['Shared latent → own expansion'],'#attention--query-construction'),
   N('keys',585,375,240,100,'Compressed indexer keys',['Own compressor;','one key per block address'],'#attention--query-construction'),
   N('weights',285,375,250,92,'Head-weight predictor',['Reads the same current input'],'#attention--two-comparisons'),
   N('scores',930,135,275,112,'Compare and combine',['Positive head matches,','then learned head mixture'],'#attention--two-comparisons'),
   N('select',930,375,275,100,'Mask, then select',['Exclude unfinished entries;','keep the greatest valid scores'],'#attention--two-comparisons'),
   N('addresses',930,585,275,84,'Selected addresses',['The indexer’s result'],'#attention--two-comparisons',{output:true})],
  edges:[
   E('make-query','input','queries',[[510,181],[585,181]],'current features'),
   E('compare-query','queries','scores',[[825,181],[930,181]],'query heads'),
   E('compare-key','keys','scores',[[825,425],[875,425],[875,220],[930,220]],'stored keys'),
   E('predict-weight','input','weights',[[397,227],[397,375]],'same input'),
   E('mix-weight','weights','scores',[[535,421],[555,421],[555,520],[905,520],[905,232],[930,232]],'head coefficients','control'),
   E('rank','scores','select',[[1067,247],[1067,375]],'block scores'),
   E('result','select','addresses',[[1067,475],[1067,585]],'completed addresses','control')],
  steps:[S('Describe the current token for comparison','The prepared attention input supplies a shared latent and the indexer’s own query heads. This is the receiving side of the comparison.',['make-query','compare-query']),S('Compare against the indexer’s memory','The stored keys come from a separate compressor. Each key describes a block address; it is not the wider vector main attention will read.',['compare-key']),S('Combine the head matches','The same current input predicts head coefficients. The score mixes rectified query–key matches across heads.',['predict-weight','mix-weight','rank']),S('Exclude unavailable entries before ranking','A high score cannot make an unfinished block causal. Mask it before keeping the greatest completed scores.',['rank']),S('Return addresses','The output locates main-memory entries. No main-attention value sum has been calculated yet.',['result'])]},
 {day:5,title:'Read recent and selected memory in one sum',part:['attention'],height:760,
  purpose:['After choosing addresses, how do their vectors contribute to the current token?'],
  result:'One vector per main head, in the query’s rotary frame. Day 6 returns heads to model width.',
  nodes:[
   N('query',285,135,245,86,'Current main query',['Prepared from the token input'],'#attention--local-global'),
   N('local',285,350,245,90,'Recent local entries',['Individual nearby positions'],'#attention--local-global'),
   N('global',285,555,245,90,'Selected global entries',['Vectors at Day 4’s addresses'],'#attention--local-global'),
   N('list',620,350,245,104,'One allowed-entry list',['Recent + selected vectors'],'#attention--attention-reference'),
   N('sink',620,135,245,86,'Learned sink logit',['Competes; transmits zero'],'#attention--sink'),
   N('scores',930,135,275,90,'Query–key comparisons',['One score per real entry'],'#attention--local-global'),
   N('normalize',930,350,275,104,'Normalize once',['Real entries + head’s sink'],'#attention--sink'),
   N('output',930,555,275,104,'One head output',['Weighted stored-vector sum;','inverse query rotation'],'#positions--shared-vector',{output:true})],
  edges:[
   E('query-read','query','scores',[[530,178],[565,178],[565,100],[1067,100],[1067,135]],'main query'),
   E('recent','local','list',[[530,395],[620,395]],'local vectors'),
   E('global-read','global','list',[[530,600],[575,600],[575,425],[620,425]],'chosen summaries'),
   E('compare','list','scores',[[865,390],[895,390],[895,197],[930,197]],'same vectors as keys'),
   E('real-scores','scores','normalize',[[1067,225],[1067,350]],'real-entry scores'),
   E('sink-score','sink','normalize',[[742,221],[742,280],[900,280],[900,420],[930,420]],'sink score','control'),
   E('values','list','output',[[742,454],[742,607],[930,607]],'same vectors as values'),
   E('weights','normalize','output',[[1067,454],[1067,555]],'attention weights','control')],
  steps:[S('Gather the permitted vectors','Recent individual entries and selected completed summaries join one list. Both kinds remain distinct entries even when their source positions overlap.',['recent','global-read']),S('Compare with one main query','This head compares its own query with each entry. The list is shared across heads, while queries and resulting weights can differ.',['query-read','compare','real-scores']),S('Use one denominator, including the sink','All real entries compete together with the head’s learned sink. The sink can absorb weight while contributing a zero value.',['sink-score','real-scores','weights']),S('Transmit the stored vectors','The same vectors used as keys also serve as values. Multiply by their weights and add once, then inverse-rotate the rotary tail at the query position.',['values','weights'])]},
 {day:6,title:'Put the modules into a complete V4 prediction',part:['embedding','streams','attention','moe','head','connections'],height:1040,
  purpose:['How do the parts we have built turn token IDs into a next-token prediction?'],
  result:'Backbone next-token scores, with a separate MTP training path for the further target.',
  nodes:[
   N('ids',575,110,285,62,'Input token IDs',[],'#v4-forward--embedding'),
   N('embedding',575,205,285,70,'Embedding lookup',['Copy each row into four streams'],'#v4-forward--embedding'),
   N('attention',575,350,285,76,'Attention update',['CSA or HCA, inside mHC'],'#v4-forward--attention-update'),
   N('moe',575,460,285,76,'Expert update',['Shared + routed, inside mHC'],'#v4-forward--expert-update'),
   N('memory',285,350,240,92,'Memory at this layer',['CSA: finer + selected;','HCA: coarser + all complete'],'#v4-forward--hca'),
   N('final',575,590,285,76,'Final residual streams',['After the repeated blocks'],'#v4-forward--layer-schedule',{streams:true}),
   N('head',575,710,285,88,'Vocabulary head',['Stream reduction → RMSNorm','→ vocabulary projection'],'#v4-forward--readout'),
   N('next',575,845,285,62,'Next-token scores',[],'#v4-forward--generation',{output:true}),
   N('next-embedding',955,355,250,86,'Observed next token',['Shared embedding lookup'],'#v4-forward--auxiliary-branch'),
   N('fusion',955,530,250,86,'MTP fusion',['Hidden streams + next embedding'],'#v4-forward--auxiliary-branch'),
   N('aux',955,675,250,86,'Extra block + readout',['Separate auxiliary computation'],'#prediction--v4-auxiliary-readout'),
   N('further',955,845,250,62,'Further-token scores',[],'#prediction--mtp',{output:true})],
  edges:[
   E('lookup','ids','embedding',[[717,172],[717,205]],'token IDs','control'),
   E('start','embedding','attention',[[717,275],[717,350]],'four streams'),
   E('memory-read','memory','attention',[[525,393],[575,393]],'memory vectors'),
   E('attn-ffn','attention','moe',[[717,426],[717,460]],'changed streams'),
   E('stack','moe','final',[[717,536],[717,590]],'repeat blocks'),
   E('reduce','final','head',[[717,666],[717,710]],'four final rows'),
   E('vocab','head','next',[[717,798],[717,845]],'vocabulary logits'),
   E('aux-hidden','final','fusion',[[860,628],[905,628],[905,573],[955,573]],'final streams'),
   E('teacher-input','next-embedding','fusion',[[1080,441],[1080,530]],'next embedding'),
   E('extra','fusion','aux',[[1080,616],[1080,675]],'four fused streams'),
   E('aux-output','aux','further',[[1080,761],[1080,845]],'auxiliary logits')],
  steps:[S('Initialize the streams','Each token ID selects an embedding row. Four copies initialize the residual streams; later updates can make them differ.',['lookup','start']),S('Read memory, then process features','The attention update reads the layer’s memory. The following MoE update receives the changed streams. Each update has its own mHC connections.',['memory-read','attn-ffn']),S('Repeat blocks without resetting state','The released schedule chooses each layer’s attention mode. Its four-stream result becomes the next block’s input.',['stack']),S('Produce ordinary next-token scores','The final head combines the streams, normalizes one row and projects it to vocabulary logits. Decoding subsequently chooses a token ID.',['reduce','vocab']),S('Construct the separate MTP task','The auxiliary branch receives the final hidden streams and the observed next-token embedding. That embedding never enters the earlier backbone prediction.',['aux-hidden','teacher-input','extra']),S('Predict the further target','The extra block and auxiliary readout predict the token after the supplied next token. This is an additional training task.',['aux-output'])]},
 {day:7,title:'Use prediction error to change the parameters',part:['training'],height:760,
  purpose:['The forward graph can run with random weights. How are its weights updated?'],
  result:'Updated parameters for another training step. The complete forward trace checks composition.',
  nodes:[
   N('parameters',285,145,235,94,'Current parameters',['Matrices and other learned weights'],'#training--muon'),
   N('forward',610,145,250,94,'Forward computation',['Training prefix → scores'],'#reference--forward-code'),
   N('loss',950,145,255,94,'Prediction loss',['Compare with recorded target'],'#training--objective'),
   N('gradients',950,390,255,94,'Backpropagation',['Gradient for each parameter'],'#training--muon'),
   N('optimizer',610,390,250,112,'Optimizer groups',['Muon for most matrices;','AdamW for specified groups'],'#training--optimizer-groups'),
   N('updated',285,390,235,94,'Updated parameters',['Used by the next forward pass'],'#training--optimizer-groups',{output:true})],
  edges:[
   E('apply','parameters','forward',[[520,192],[610,192]],'current weights'),
   E('evaluate','forward','loss',[[860,192],[950,192]],'predicted scores'),
   E('backward','loss','gradients',[[1077,239],[1077,390]],'loss derivatives','gradient'),
   E('gradient','gradients','optimizer',[[950,437],[860,437]],'matrix gradients','gradient'),
   E('step','optimizer','updated',[[610,437],[520,437]],'parameter updates','gradient'),
   E('repeat','updated','parameters',[[402,390],[402,239]],'next training step','control')],
  steps:[S('Evaluate the current model','Training begins with a forward computation using the current parameters. The recorded target is used to evaluate the prediction, not supplied as the answer to that same prediction.',['apply','evaluate']),S('Differentiate the loss','Backpropagation gives a gradient with each parameter’s shape. It measures local change of the loss through the computation.',['backward','gradient']),S('Apply the specified optimizer group','Muon uses momentum and transforms matrix directional gains before scale, decay and the parameter step. The specified AdamW groups follow their own rule.',['step']),S('Use the changed weights','The resulting parameters are available for another training step. The miniature’s final forward trace checks the composed computation; it is not a trained language-quality demonstration.',['repeat','apply'])]}
];

maps.push(...continuationMaps);
export function dayMap(day){const m=maps.find(m=>m.day===Number(day));if(!m)throw new RangeError('Unknown study day: '+day);return m;}
export const dayMapDays=maps.map(m=>m.day);
export function dayMapMotion(day,index){
 const m=dayMap(day),chosen=new Set(m.steps[index-1]?.edges??[]),edges=m.edges.filter(e=>chosen.has(e.id)),layers={};
 const depth=(edge,visiting=new Set())=>{
  if(layers[edge.id]!==undefined)return layers[edge.id];
  if(visiting.has(edge.id))throw new Error('A tour step must not animate a dependency cycle');
  const path=new Set(visiting).add(edge.id),parents=edges.filter(e=>e.to===edge.from);
  return layers[edge.id]=parents.length?1+Math.max(...parents.map(e=>depth(e,path))):0;
 };
 edges.forEach(e=>depth(e));
 return {layers,duration:edges.length?2000+8000*(Math.max(...Object.values(layers))+1):1800};
}
function roundedPath(points,radius=20){
 let d=`M${points[0].join(' ')}`;
 for(let i=1;i<points.length-1;i++){
  const a=points[i-1],p=points[i],b=points[i+1],da=Math.hypot(p[0]-a[0],p[1]-a[1]),db=Math.hypot(b[0]-p[0],b[1]-p[1]),r=Math.min(radius,da/2,db/2);
  if(!da||!db){d+=` L${p.join(' ')}`;continue;}
  const before=p.map((v,j)=>v+(a[j]-v)*r/da),after=p.map((v,j)=>v+(b[j]-v)*r/db);
  d+=` L${before.join(' ')} Q${p.join(' ')} ${after.join(' ')}`;
 }
 return d+` L${points.at(-1).join(' ')}`;
}
const text=(x,y,value,cls='',anchor='start')=>`<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${esc(value)}</text>`;
function arrowHead(points){
 const b=points.at(-1),a=points.at(-2),len=Math.hypot(b[0]-a[0],b[1]-a[1]),u=b.map((v,i)=>(v-a[i])/len),base=b.map((v,i)=>v-8*u[i]),normal=[-u[1]*4,u[0]*4];
 return `M${base.map((v,i)=>v+normal[i]).join(' ')} L${b.join(' ')} L${base.map((v,i)=>v-normal[i]).join(' ')}`;
}
function smallModel(m){
 if(m.location){
  const labels=['V4 modules · Days 1–7','Memory source · Days 8–10','Lookup / vision · Days 11–12','Storage / draft · Days 13–15','Assembly · Day 16','Training / systems · 17–19'];
  const group=m.day<=10?1:m.day<=12?2:m.day<=15?3:m.day===16?4:5;
  return text(24,102,'WHERE THIS FITS','dm-eyebrow')+text(24,125,m.location,'dm-small')+labels.map((s,i)=>`<rect x="24" y="${160+i*73}" width="196" height="48" rx="4" class="dm-context-node ${i===group?'dm-context-active':''}"/>${text(122,189+i*73,s,'dm-small','middle')}`).join('');
 }
 const items=[['embedding','Embedding',150,'#v4-forward--embedding'],['streams','Four residual streams',235,'#residuals--wider-stream'],['attention','Attention',350,'#attention--local-global'],['moe','MoE',445,'#experts--capacity'],['head','Vocabulary head',580,'#v4-forward--readout']];
 let out=text(24,102,'WHERE THIS FITS','dm-eyebrow')+text(24,125,'V4 backbone · read down','dm-small');
 if(m.day===7)out+='<rect x="14" y="140" width="216" height="500" rx="5" class="dm-training-frame"/>';
 out+=`<rect x="14" y="320" width="216" height="200" rx="5" class="dm-block ${m.part.includes('connections')?'dm-context-active':''}"/>`+text(26,340,'Block · repeat','dm-small');
 for(let i=0;i<items.length-1;i++){const y=items[i][2]+48,to=items[i+1][2];out+=`<path d="M122 ${y} V${to} m-4 -7 l4 7 4 -7" class="dm-context-wire"/>`;}
 for(const [id,label,y,href] of items)out+=`<a href="${href}" aria-label="Locate ${esc(label)}"><rect x="24" y="${y}" width="196" height="48" rx="4" class="dm-context-node ${m.part.includes(id)?'dm-context-active':''}"/>${text(122,y+29,label,'dm-context-label','middle')}</a>`;
 if(m.day===7)out+=text(24,676,'Training changes these weights.','dm-small');
 return out;
}
function node(m,n,active){
 let out=`<a href="${n.href}" data-day-map-node="${n.id}" aria-label="Read: ${esc(n.title)}"><rect x="${n.x+4}" y="${n.y+5}" width="${n.w}" height="${n.h}" rx="4" class="dm-depth"/><rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="4" class="dm-node ${active?'dm-active':''} ${n.output?'dm-output':''} ${n.later?'dm-later':''}"/>${text(n.x+15,n.y+28,n.title,'dm-title')}`;
 n.lines.forEach((line,i)=>{out+=text(n.x+15,n.y+52+i*20,line,'dm-sub');});
 if(n.bank)for(let i=0;i<6;i++)out+=`<rect x="${n.x+16+i*35}" y="${n.y+n.h-20}" width="26" height="9" class="dm-bank ${i===1||i===4?'dm-bank-chosen':''}"/>`;
 if(n.streams)for(let i=0;i<4;i++)out+=`<path d="M${n.x+16+i*(n.w-32)/4} ${n.y+n.h-14} h${(n.w-48)/4}" class="dm-stream"/>`;
 return out+'</a>';
}
export function dayMapSVG(day,index=0,phase=1,{motion=true}={}){
 const m=dayMap(day),step=Math.max(0,Math.min(m.steps.length,index)),s=step?m.steps[step-1]:null,active=new Set(s?.edges??[]),activeNodes=new Set(m.edges.filter(e=>active.has(e.id)).flatMap(e=>[e.from,e.to]));
 const timing=dayMapMotion(day,step),elapsed=phase*timing.duration;
 let wires='',packets='';
 for(const e of m.edges){
  const cls=e.type==='features'?'dm-feature':'dm-control',on=active.has(e.id);
  wires+=`<path data-map-edge="${e.id}" data-from="${e.from}" data-to="${e.to}" data-kind="${e.type}" class="dm-wire ${cls} ${on?'dm-wire-active':''}" d="${roundedPath(e.points)} ${arrowHead(e.points)}"/>`;
  const travel=(elapsed-1000-(timing.layers[e.id]??0)*8000)/6000;
  if(on&&motion&&travel>0&&travel<1){
   const pos=roundedPolylinePoint(e.points,ease(travel)),before=roundedPolylinePoint(e.points,Math.max(0,ease(travel)-.005)),after=roundedPolylinePoint(e.points,Math.min(1,ease(travel)+.005)),angle=Math.atan2(after[1]-before[1],after[0]-before[0])*180/Math.PI;
   packets+=`<g class="day-map-packet ${cls}" transform="translate(${pos[0].toFixed(2)} ${pos[1].toFixed(2)}) rotate(${angle.toFixed(2)})"><title>${esc(e.tag)}</title><path d="M-14 0 H12 m-5 -4 l5 4 -5 4" class="dm-pulse"/></g>`;
  }
 }
 const control=m.day===7||m.day===17?'Dashed: gradients / parameter updates':'Dashed: IDs / coefficients';
 return `<svg xmlns="http://www.w3.org/2000/svg" class="day-overview-svg" viewBox="0 0 1280 ${m.height}" role="img" aria-label="Day ${m.day}: ${esc(m.title)}"><title>Day ${m.day} · ${esc(m.title)}</title><desc>${esc(m.purpose.join(' '))} ${esc(m.result)} Solid arrows carry feature vectors or scores; dashed arrows distinguish addresses, coefficients or training updates. This is a schematic module map, not numerical activations.</desc>${text(285,37,m.purpose[0],'dm-question')}${text(285,65,step?`${step} / ${m.steps.length} · ${s.title}`:'Overview · follow the inputs, the separate paths and the result','dm-sub')}<path d="M253 92 V${m.height-85}" class="dm-divider"/>${smallModel(m)}${m.day===6?`<rect x="555" y="326" width="325" height="230" rx="5" class="dm-block"/>${text(578,344,'Repeated block','dm-small')}`:''}${wires}${m.nodes.map(n=>node(m,n,activeNodes.has(n.id))).join('')}<path d="M285 ${m.height-62} H330" class="dm-wire dm-feature"/>${text(342,m.height-57,'Solid: vectors / scores','dm-small')}<path d="M535 ${m.height-62} H580" class="dm-wire dm-control"/>${text(592,m.height-57,control,'dm-small')}${text(285,m.height-24,m.result,'dm-result')}<g data-trace-motion="" aria-hidden="true">${packets}</g></svg>`;
}
export function dayMapDefinition(day){
 const m=dayMap(day),all=[S('Overview',m.purpose[0]+' '+m.result,[]),...m.steps];
 const steps=all.map((s,i)=>({scene:i,cell:-1,label:s.title,detail:s.detail,motionDetail:'Follow the labelled dependency arrows. These are schematic roles, not computed activations.'}));
 return {scenes:all.map((s,i)=>({title:s.title,start:i,cells:[]})),steps,timing:(i,elapsed)=>{const {duration}=dayMapMotion(day,i);return {phase:Math.min(1,Math.max(0,elapsed)/duration),duration};},render:(i,p,o)=>dayMapSVG(day,i,p,o)};
}
export function dayMapFigure(day){
 const m=dayMap(day);
 return `<figure class="week-study day-overview" id="study-day-${m.day}-map" data-day-map="${m.day}"><figcaption><span class="day-map-heading">Day ${m.day} · ${esc(m.title)}<small>Module map · select a box to read its explanation. Arrows trace dependencies, not numerical activations.</small></span><button type="button" data-day-map-enlarge aria-haspopup="dialog">Open large map</button></figcaption><div class="week-viewport" tabindex="0" role="region" aria-label="Day ${m.day} module map; scroll horizontally if needed"><div data-week-diagram>${dayMapSVG(day)}</div></div></figure>`;
}
