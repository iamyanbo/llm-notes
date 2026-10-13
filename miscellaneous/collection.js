export function openLinkedOutline(root,viewport){
  const open=()=>{
    let id;try{id=decodeURIComponent(viewport.location.hash.slice(1));}catch{return;}
    const target=root.getElementById(id);
    if(target?.classList.contains('topic-plan'))target.open=true;
  };
  viewport.addEventListener('hashchange',open);open();return open;
}
if(typeof document!=='undefined'&&typeof window!=='undefined')openLinkedOutline(document,window);
