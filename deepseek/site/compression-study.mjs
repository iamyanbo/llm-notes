import {dayMapFigure} from './day-maps.mjs';
const t=(x,y,s,cls='')=>'<text x="'+x+'" y="'+y+'" class="'+cls+'">'+s+'</text>';
export function csaOverviewFigure(){return dayMapFigure(3);}
export function compressionOriginFigure(){
 const streams=[0,1,2,3].map(i=>'<g>'+t(32,103+i*31,'stream '+i,'origin-small')+'<rect class="origin-cells" x="105" y="'+(85+i*31)+'" width="65" height="25" rx="2"/>'+t(124,103+i*31,'···','origin-small')+'</g>').join('');
 const box=(x,y,w,h,title,lines=[])=>'<rect class="origin-box" x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="4"/>'+t(x+14,y+26,title,'origin-label')+lines.map((s,i)=>t(x+14,y+53+i*24,s,'origin-small')).join('');
 const arrow=(x,y,to)=>'<path class="origin-wire" d="M'+x+' '+y+' H'+to+' m-7 -4 l7 4 -7 4"/>';
 return [
 '<figure class="week-study compression-origin"><figcaption>Locate the candidate content in one layer<span>One token position · the numerical trace below starts at the prepared attention input hₜ</span></figcaption><div class="week-viewport" tabindex="0" role="region" aria-label="From one token’s residual streams to candidate content; scroll horizontally if needed">',
 '<svg xmlns="http://www.w3.org/2000/svg" class="compression-origin-svg" viewBox="0 0 1040 310" role="img" aria-label="Four residual streams for one token are mixed and RMS-normalized into h_t. Multiplying h_t by W_C produces candidate c_t before pooling and rotary position encoding."><title>The attention input supplies the compressor, before this layer’s attention result</title>',
 t(20,29,'For one token position t','origin-title'),box(20,52,170,166,'Retained state'),streams,arrow(190,145,224),
 box(228,89,200,111,'Input preparation',['Mix the four streams','Apply RMSNorm']),arrow(428,145,462),
 box(466,107,206,76,'Attention input hₜ',['One vector for token t']),arrow(672,145,705),
 box(709,107,112,76,'W_C',['Learned map']),arrow(821,145,855),box(859,107,160,76,'Candidate cₜ',['Content to pool']),
 t(20,263,'Repeat at each token position: h₀, h₁, … become the token rows of H.','origin-small'),
 t(20,288,'After candidate formation: combine positions → normalize the pooled entry → apply its positional rotation.','origin-small'),
 '</svg></div></figure>'
 ].join('');
}
