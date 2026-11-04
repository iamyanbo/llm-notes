import katex from '../foundations/node_modules/katex/dist/katex.mjs';
import {studyFigure} from './views.mjs';

export const escape = value => String(value).replace(/[&<>"']/g, character => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[character]));
export const p = text => `<p>${text}</p>`;
export const heading = (id, title) => `<h3 id="${escape(id)}">${escape(title)}</h3>`;
export const math = source => katex.renderToString(String(source), {throwOnError: true});
export const equation = source => katex.renderToString(source, {displayMode: true, throwOnError: true});
export const study = kind => studyFigure(kind);
export const source = (label, url) => `<p class="source-note"><a href="${escape(url)}">${escape(label)} ↗</a></p>`;
export const definition = (number, text) => `<aside class="statement definition" aria-label="Definition ${escape(number)}"><div class="aside-label">Definition ${escape(number)}</div><p>${text}</p></aside>`;
export const table = (headers, rows, caption) => `<div class="table-scroll" role="region" aria-label="${escape(caption)}" tabindex="0"><table><caption>${escape(caption)}</caption><thead><tr>${headers.map(value => `<th scope="col">${value}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map((value, index) => `<${index ? 'td' : 'th scope="row"'}>${value}</${index ? 'td' : 'th'}>`).join('')}</tr>`).join('')}</tbody></table></div>`;
