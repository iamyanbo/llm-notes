import {createRequire} from 'node:module';
const require=createRequire(new URL('../foundations/package.json',import.meta.url));
const katex=require('katex');
import {sources} from '../miscellaneous/topics.mjs';
export const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const p=text=>`<p>${text}</p>`;
export const math=(tex,display=false)=>katex.renderToString(tex,{displayMode:display,throwOnError:true,strict:'warn',output:'htmlAndMathml'});
export const eq=tex=>`<div class="essay-equation">${math(tex,true)}</div>`;
export const section=(id,title,...body)=>({id,title,body:body.join('\n')});
export function cite(key,label){if(!sources[key])throw new Error('Unknown source '+key);return `<a href="${escape(sources[key][1])}">${escape(label||sources[key][0])}</a>`;}
export const note=(title,text)=>`<aside class="author-note"><div class="aside-label">${escape(title)}</div>${p(text)}</aside>`;
export const statement=(title,text)=>`<div class="essay-statement"><strong>${escape(title)}</strong>${p(text)}</div>`;
export const demo=(kind,title)=>`<div class="essay-lab" data-lab="${escape(kind)}" aria-label="${escape(title)}"><div class="lab-heading"><span class="aside-label">A worked example</span><h5>${escape(title)}</h5></div><div data-lab-content></div><noscript><p>Enable JavaScript to manipulate this example. Its assumptions and calculation are explained in the surrounding text.</p></noscript></div>`;
export const table=(headers,rows,caption='')=>`<div class="essay-table-scroll" tabindex="0" role="region" aria-label="${escape(caption||'Comparison table')}"><table>${caption?`<caption>${escape(caption)}</caption>`:''}<thead><tr>${headers.map(text=>`<th scope="col">${text}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map((text,i)=>i===0?`<th scope="row">${text}</th>`:`<td>${text}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
export const proof=(title,body)=>`<details class="essay-proof"><summary>${escape(title)}</summary>${body}<span class="qed" aria-label="End of proof">□</span></details>`;
export const figure=(url,alt,caption)=>`<figure class="essay-figure"><img src="${escape(url)}" alt="${escape(alt)}" loading="lazy" decoding="async"><figcaption>${caption}</figcaption></figure>`;
