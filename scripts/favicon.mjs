import {cp,readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const icons=fileURLToPath(new URL('../site/icons/',import.meta.url));
const version=createHash('sha256').update(await readFile(path.join(icons,'favicon.svg'))).digest('hex').slice(0,10);
const iconLinks=`<link rel="icon" type="image/svg+xml" sizes="any" href="icons/favicon.svg?v=${version}"><link rel="icon" type="image/png" sizes="32x32" href="icons/favicon-32.png?v=${version}"><link rel="shortcut icon" href="icons/favicon.ico?v=${version}"><link rel="apple-touch-icon" sizes="180x180" href="icons/apple-touch-icon.png?v=${version}">`;
export async function applyFavicons(directory,{recursive=false}={}){
  await cp(icons,path.join(directory,'icons'),{recursive:true});
  const pages=[];
  async function collect(folder){for(const entry of await readdir(folder,{withFileTypes:true})){
    const file=path.join(folder,entry.name);
    if(entry.isFile()&&entry.name.endsWith('.html'))pages.push(file);
    else if(recursive&&entry.isDirectory())await collect(file);
  }}
  await collect(directory);
  for(const target of pages){
    const html=(await readFile(target,'utf8')).replace(/<link\b[^>]*\brel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*>/gi,'');
    const relative=path.relative(path.dirname(target),directory).replaceAll(path.sep,'/');
    const links=relative?iconLinks.replaceAll('href="icons/',`href="${relative}/icons/`):iconLinks;
    await writeFile(target,html.replace('</head>',links+'</head>'));
  }
}
