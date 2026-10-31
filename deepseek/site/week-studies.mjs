import {withTrace} from './day2-trace.mjs';
import {continuationTitles} from './continuation-scenes.mjs';
import {weekFlowDefinition} from './week-flow-scenes.mjs';
import {renderTrace} from './trace-scene.mjs';
import {residualBridge,residualWalkthrough,poolingWalkthrough,queryWalkthrough,indexerWalkthrough,attentionWalkthrough,rotaryWalkthrough,groupedWalkthrough,readoutWalkthrough,muonWalkthrough} from './week-models.mjs';
const f=x=>Math.abs(x)<1e-10?'0':Number.isInteger(x)?String(x):x.toFixed(4).replace(/0+$/,'').replace(/\.$/,'');
const row=a=>'('+a.map(f).join(', ')+')';
const t=(x,y,s,cls='')=>`<text x="${x}" y="${y}" class="${cls}">${s}</text>`;
const line=(x,y,x2,y2)=>`<path class="wk-wire" d="M${x} ${y} H${x2} V${y2}"/>`;
const down=(x,y,to)=>`<path class="wk-wire" d="M${x} ${y} V${to} m-4 -6 l4 6 4 -6"/>`;
const right=(x,y,to)=>`<path class="wk-wire" d="M${x} ${y} H${to} m-6 -4 l6 4 -6 4"/>`;
function matrix(x,y,title,a,width=230,highlight=-1){
 const cell=(width-30)/a[0].length;
 return t(x,y,title,'wk-label')+`<path class="wk-bracket" d="M${x+9} ${y+12} h-9 v${a.length*29+8} h9 M${x+width-9} ${y+12} h9 v${a.length*29+8} h-9"/>`+a.map((r,i)=>`<g>${i===highlight?`<rect class="wk-highlight" x="${x+12}" y="${y+16+i*29}" width="${width-24}" height="28"/>`:''}${r.map((v,j)=>t(x+15+cell*(j+.5),y+36+i*29,f(v),'wk-number')).join('')}</g>`).join('');
}
const band=(y,label,value)=>`<rect x="20" y="${y}" width="560" height="56" class="wk-result"/>`+t(35,y+22,label,'wk-small')+t(35,y+44,value,'wk-label');
function stage(y,n,label,active,x=30){return `<g class="${n===active?'wk-current':''}"><circle cx="${x}" cy="${y-5}" r="13" class="wk-step"/>${t(x,y,String(n+1),'wk-number')}${t(x+23,y,label,'wk-label')}</g>`;}
const svg=(height,label,body)=>`<svg class="week-svg" viewBox="0 0 600 ${height}" role="img" aria-label="${label}"><title>${label}</title>${body}</svg>`;
export function residualBridgeFigure(){
 const m=residualBridge(),box=(x,y,w,label,value)=>`<rect class="wk-map" x="${x}" y="${y}" width="${w}" height="65"/>${t(x+12,y+24,label,'wk-small')}${t(x+12,y+49,value,'wk-label')}`;
 const body=t(25,30,'Ordinary residual addition','wk-label')+box(25,55,145,'Before update',row(m.before))+t(186,97,'+','wk-plus')+box(220,55,145,'Returned update',row(m.update))+right(375,90,407)+box(420,55,155,'Carried onward',row(m.after))
  +t(25,177,'A first extension: carry both the old and updated rows','wk-label')+box(25,205,220,'Retained row 0 · before',row(m.before))+box(355,205,220,'Retained row 1 · after',row(m.after))
  +line(135,270,135,309)+line(465,270,465,309)+`<path class="wk-wire" d="M135 309 H465"/>`+down(300,309,341)+t(25,375,'Choose one width-two input for the next sublayer:','wk-label')
  +m.alternatives.map((a,i)=>box(25+i*190,400,170,['Use row 0','Average the rows','Use row 1'][i],row(a.input))).join('')+t(25,502,'Two rows remain available; the sublayer still reads only two features.','wk-small');
 return `<figure class="week-study"><figcaption>Keep a choice that immediate addition removes<span>One token · chosen two-feature values · a simplified two-row construction</span></figcaption><div class="week-viewport" tabindex="0" role="region" aria-label="Residual addition and a two-row alternative; scroll horizontally if needed">${svg(525,'Retain an old row and an updated row, then choose one narrow input',body)}</div></figure>`;
}

const titles={residual:'Four streams supply one transformation',pooling:'Two coordinates, two source mixtures','pool-content':'From attention inputs to candidate content','pool-scores':'The same attention inputs supply pooling scores',query:'One small latent supplies several queries','indexer-inputs':'The same input supplies indexer queries and head weights',indexer:'From head comparisons to cache addresses','attention-base':'Read the local and global entries in one sum',attention:'Add a zero-valued sink to that same sum','rotation-comparison':'Compare position pairs before and after a common shift',rotation:'Return the value to the query’s frame',grouped:'Reduce within groups, then combine groups',readout:'From predictor biases to vocabulary scores','mtp-fusion':'The recorded next-token embedding joins all four streams',muon:'Change the gains of a matrix update','muon-gains':'Transform the directional gains before taking a step','muon-step':'Turn that transformed direction into a parameter update'};
titles['muon-input']='From the current gradient and buffer to Muon’s input';
Object.assign(titles,{
 'query-latent':'Prepare the shared latent from the current input',
 'main-queries':'Reference: expand the same latent for main attention',
 'indexer-queries':'Make two indexer queries from that latent',
 'indexer-matches':'Compare each key, then keep positive head matches',
 'indexer-weights':'The current input chooses the head mixture',
 'indexer-scores':'Combine the rectified head matches into block scores',
 'indexer-selection':'Choose the best scores among completed entries'
});
Object.assign(titles,continuationTitles);
export const weekKinds=Object.keys(titles);
export function weekDiagram(kind,step=0){return renderTrace(weekFlowDefinition(kind),step);}
export function weekDetail(kind,step){return weekFlowDefinition(kind).steps[step]?.detail??'';}
export function weekFigure(kind){
 const title=titles[kind],def=weekFlowDefinition(kind);
 return withTrace(`<figure class="week-study"><figcaption>${title}<span>Chosen small values · trace the calculation before generalizing</span></figcaption><div class="week-viewport" tabindex="0" role="region" aria-label="${title}; scroll horizontally if needed"><div data-week-diagram>${renderTrace(def)}</div></div></figure>`,'week-'+kind);
}
