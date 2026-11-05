import {access,cp,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {buildSystemEssays} from './system-essays.mjs';

// Draft output is deliberately outside the directory uploaded by Pages.
const root=fileURLToPath(new URL('../',import.meta.url));
const published=path.join(root,'dist');
const output=path.join(root,'draft-dist');
await access(path.join(published,'index.html'));
const config=JSON.parse(await readFile(path.join(root,'site.config.json'),'utf8'));
const siteUrl=(process.env.SITE_URL||config.siteUrl).replace(/\/$/,'');
await cp(published,output,{recursive:true});
const index=await readFile(path.join(output,'index.html'),'utf8');
const drafts=await readFile(path.join(root,'site/drafts.html'),'utf8');
await writeFile(path.join(output,'index.html'),index.replace('<!-- DRAFT_ESSAYS -->',drafts));
await buildSystemEssays({root,output,siteUrl});
console.log('Built local reading drafts in draft-dist/. Pages uploads dist/ only.');
