const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const n=(value,digits=2)=>{const rounded=Number(value.toFixed(digits));return (Object.is(rounded,-0)?0:rounded).toLocaleString('en-US');};
export const text=(x,y,value,cls='',anchor='start')=>'<text x="'+x+'" y="'+y+'" class="'+cls+'" text-anchor="'+anchor+'">'+escape(value)+'</text>';
export const rect=(x,y,w,h,cls='face')=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="4" class="'+cls+'"/>';
export function line(x,y,x2,y2,cls='wire'){
  let body='<path d="M'+x+' '+y+' L'+x2+' '+y2+'" class="'+cls+'"/>';
  if(cls==='wire'){
    const angle=Math.atan2(y2-y,x2-x),a=angle+.45,b=angle-.45;
    body+='<path d="M'+(x2-6*Math.cos(a))+' '+(y2-6*Math.sin(a))+' L'+x2+' '+y2+' L'+(x2-6*Math.cos(b))+' '+(y2-6*Math.sin(b))+'" class="wire"/>';
  }
  return body;
}
export const transfer=(from,to,value)=>'<g transform="translate('+from.join(' ')+')"><g class="lab-transfer" style="--lab-dx:'+(to[0]-from[0])+'px;--lab-dy:'+(to[1]-from[1])+'px">'+rect(-45,-12,90,24,'warm')+text(0,5,value,'small','middle')+'</g></g>';
export const svg=(body,height=280)=>'<div class="lab-scroll" tabindex="0" role="region" aria-label="Worked calculation; scroll horizontally if needed"><svg class="lab-svg" viewBox="0 0 680 '+height+'" role="img" aria-label="The values and states of the worked example">'+body+'</svg></div>';
export const metrics=items=>'<div class="lab-metrics">'+items.map(([label,value])=>'<span>'+escape(label)+'<strong>'+escape(value)+'</strong></span>').join('')+'</div>';
export const pathLine=(points,cls='')=>'<path d="'+points.map(([x,y],i)=>(i?'L':'M')+x+' '+y).join(' ')+'" class="'+cls+'" fill="none" stroke="var(--blue)" stroke-width="3"/>';
export const point=(x,y)=>'<circle cx="'+x+'" cy="'+y+'" r="6" class="signal"/>';
