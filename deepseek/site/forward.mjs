export const configurations={
 flash:{name:'V4 Flash',dim:4096,layers:43,latent:1024,heads:64,groups:8,vocab:129280},
 pro:{name:'V4 Pro',dim:7168,layers:61,latent:1536,heads:128,groups:16,vocab:129280},
 v41:{name:'V4.1 Flash',dim:5120,layers:40,latent:1280,heads:64,groups:8,vocab:129280}
};
export function forwardStages(variant='flash'){
 const c=configurations[variant];if(!c)throw new RangeError('Unknown architecture');
 const v41=variant==='v41';
 return [
  {title:'Token identifiers',shape:'B × T',detail:v41?'Text IDs plus aligned image-span metadata.':'Tokenizer output; no hidden vectors yet.',url:'#'+(v41?'v41-forward--input':'v4-forward--embedding')},
  {title:v41?'Merge text and visual embeddings':'Embedding lookup',shape:`B × T × ${c.dim}`,detail:v41?'Visual features replace reserved rows; learned delimiters preserve the image layout.':'Each identifier selects one width-d table row.',url:v41?'#vision--merge':'#v4-forward--embedding'},
  {title:'Four residual streams',shape:`B × T × 4 × ${c.dim}`,detail:v41?'Initial mixture selects stream 0. Engram updates the incoming streams at layers 1 and 14.':'The same embedding row begins in all four streams.',url:v41?'#v41-forward--single-pass-block':'#residuals--whole-block'},
  {title:v41?'20 encoder + 20 decoder layers':`${c.layers} attention-and-expert blocks`,shape:`B × T × 4 × ${c.dim}`,detail:v41?'Each block retains its own queries and local state; global cache and selections follow their source schedule.':'Two residual updates per block. Local, CSA and HCA layers share this interface.',url:v41?'#v41-forward--prompt-and-decode':'#v4-forward--attention-update'},
  {title:v41?'Carried mixture → final RMSNorm':'Learned head reduction → final RMSNorm',shape:`B × T × ${c.dim}`,detail:v41?'Use the last expert sublayer’s carried input mixture.':'The readout has its own four sigmoid coefficients.',url:v41?'#v41-forward--head-and-draft':'#v4-forward--readout'},
  {title:'Vocabulary projection',shape:`B × ${c.vocab.toLocaleString('en-US')}`,detail:'Last-position inference logits. Training can project all supervised rows.',url:v41?'#v41-forward--head-and-draft':'#v4-forward--readout'},
  {title:'Select an ID → append → embed again',shape:'B × (T + 1)',detail:'The decoding rule chooses an identifier; the tokenizer supplies its text piece.',url:'#v4-forward--generation'}
 ];
}
export function forwardBody(variant='flash'){
 const c=configurations[variant],v41=variant==='v41';if(!c)throw new RangeError('Unknown architecture');
 return `<ol class="forward-path">${forwardStages(variant).map((s,i)=>`<li><span class="forward-step">${i+1}</span><div><a href="${s.url}">${s.title}</a><p>${s.detail}</p></div><strong>${s.shape}</strong></li>`).join('')}</ol><div class="forward-branch"><p><strong>Inside attention:</strong> one normalized width-${c.dim} input supplies parallel projections.</p><div class="table-wrap"><table><caption>One token row; batch and token axes stay unchanged</caption><thead><tr><th>Path</th><th>Shape through the operation</th><th>Used by</th></tr></thead><tbody><tr><td>Query latent → main heads</td><td>${c.dim} → ${c.latent} → ${c.heads} × 512</td><td>Main attention</td></tr><tr><td>Query latent → index heads</td><td>${c.latent} → ${v41?32:64} × 128</td><td>Global-address selection</td></tr><tr><td>Local shared KV</td><td>${c.dim} → 512</td><td>Recent-window entries</td></tr><tr><td>${v41?'Global owner’s latent':'Global values and gates'}</td><td>${v41?'Pair-compressed or ratio-one, width 512':'CSA: overlapping width-512 summaries; HCA: width-512 block summaries'}</td><td>Global entries; ${v41?'index K projects from this latent':'CSA index K has a separate compressor'}</td></tr><tr><td>Joint attention → grouped output</td><td>${c.heads} × 512 → ${c.groups} × 1024 → ${c.dim}</td><td>Residual post-injection</td></tr></tbody></table></div></div>${v41?'<p class="forward-note">The 20/20 split describes the reported CED organization. The minimal Python forward traverses all 40 layers and does not implement the report’s encoder-only prompt shortcut. See the linked prompt-and-decode section for the source difference.</p>':'<p class="forward-note">The MTP block is an auxiliary branch outside the ordinary backbone loop. This figure shows the main next-token path.</p>'}`;
}
export function forwardFigure(family='v4'){
 const v41=family==='v41';return `<figure class="forward-study" data-forward="${family}"><figcaption>${v41?'V4.1: input, shared state and prediction':'V4: token IDs through the complete backbone'}<span>Configuration shapes · not measured activations</span></figcaption>${v41?'':`<label class="forward-control">Configuration<select data-forward-variant><option value="flash">V4 Flash</option><option value="pro">V4 Pro</option></select></label>`}<div data-forward-output>${forwardBody(v41?'v41':'flash')}</div></figure>`;
}
