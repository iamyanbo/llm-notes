// Match repeated words by occurrence, so identical articles keep distinct origins.
export function wordOrigins(previous,next) {
  const available=new Map();
  previous.forEach((word,index)=>{
    if(!available.has(word))available.set(word,[]);
    available.get(word).push(index);
  });
  return next.map(word=>available.get(word)?.shift()??null);
}

export function createPageMotion(document,preference,{Observer=globalThis.IntersectionObserver}={}) {
  const targets=[...document.querySelectorAll('.essay-body h2,.essay-body>h3,.author-note,.statement,.chase-figure,.sentence-explorer')];
  const animations=new Set();let observer=null;
  const showEverything=()=>{
    observer?.disconnect();observer=null;
    targets.forEach(target=>target.classList.remove('reveal-ready'));
    document.documentElement.classList.remove('motion-enabled');
    for(const animation of animations)animation.cancel();animations.clear();
  };
  const observe=()=>{
    if(preference.matches){showEverything();return;}
    document.documentElement.classList.add('motion-enabled');
    if(!Observer)return;
    try {
      observer=new Observer(entries=>{
        for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('is-revealed');observer.unobserve(entry.target);}
      },{threshold:0,rootMargin:'0px 0px 24px 0px'});
      targets.forEach(target=>{
        // Keep content already on screen fully visible when enhancement starts.
        const bounds=target.getBoundingClientRect();
        if(bounds.top<globalThis.innerHeight&&bounds.bottom>0){target.classList.add('is-revealed');return;}
        target.classList.add('reveal-ready');observer.observe(target);
      });
    } catch {showEverything();}
  };
  const animate=(element,frames,options)=>{
    if(preference.matches||typeof element.animate!=='function')return;
    const animation=element.animate(frames,options);animations.add(animation);
    animation.finished?.then(()=>animations.delete(animation),()=>animations.delete(animation));
    return animation;
  };
  preference.addEventListener?.('change',()=>{preference.matches?showEverything():observe();});
  observe();
  return {
    exchange(buttons,previous,next,origins){
      const mapping=wordOrigins(previous,next);
      buttons.forEach((button,index)=>{
        if(mapping[index]===null||mapping[index]===index)return;
        button.getAnimations?.().forEach(animation=>animation.cancel());
        const from=origins[mapping[index]],to=button.getBoundingClientRect();
        const x=from.left-to.left,y=from.top-to.top;
        const lift=mapping[index]<index?-20:14;
        animate(button,[{transform:`translate(${x}px,${y}px)`},{transform:`translate(${x*.5}px,${y*.5+lift}px)`,offset:.5},{transform:'translate(0,0)'}],{duration:520,easing:'cubic-bezier(.2,.7,.25,1)'});
      });
    },
    feedback(element){
      element.getAnimations?.().forEach(animation=>animation.cancel());
      animate(element,[{opacity:.35,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:320,easing:'ease-out'});
    },
    destroy:showEverything,
  };
}
