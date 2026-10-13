import {cp,readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const icons=fileURLToPath(new URL('../site/icons/',import.meta.url));
const version=createHash('sha256').update(await readFile(path.join(icons,'favicon.svg'))).digest('hex').slice(0,10);
const iconLinks=`<link rel="icon" type="image/svg+xml" sizes="any" href="icons/favicon.svg?v=${version}"><link rel="icon" type="image/png" sizes="32x32" href="icons/favicon-32.png?v=${version}"><link rel="shortcut icon" href="icons/favicon.ico?v=${version}"><link rel="apple-touch-icon" sizes="180x180" href="icons/apple-touch-icon.png?v=${version}">`;
export async function applyFavicons(directory){
  await cp(icons,path.join(directory,'icons'),{recursive:true});
  for(const file of (await readdir(directory)).filter(file=>file.endsWith('.html'))){
    const target=path.join(directory,file);
    const html=(await readFile(target,'utf8')).replace(/<link\b[^>]*\brel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*>/gi,'');
    await writeFile(target,html.replace('</head>',iconLinks+'</head>'));
  }
}
