import {readFile,writeFile,mkdir,cp,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const config=JSON.parse(await readFile(path.join(root,'site.config.json'),'utf8'));
const siteUrl=(process.env.SITE_URL||config.siteUrl).replace(/\/$/,'');
// Only generated output beneath this repository is replaced.
const output=path.join(root,'dist');
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
for(const chapter of ['foundations','transformers']){
  const checkout=path.join(root,chapter);
  await rm(path.join(checkout,'dist'),{recursive:true,force:true});
  const result=spawnSync(process.execPath,['scripts/build.mjs'],{cwd:checkout,env:{...process.env,SITE_URL:siteUrl},stdio:'inherit'});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status||1);
  await cp(path.join(checkout,'dist'),path.join(output,chapter),{recursive:true});
}
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const portfolio=config.portfolioUrl?`<a href="${escape(config.portfolioUrl)}">\u2190 Portfolio</a>`:'';
const template=await readFile(path.join(root,'site/index.html'),'utf8');
await writeFile(path.join(output,'index.html'),template.replaceAll('{{SITE_URL}}',escape(siteUrl+'/')).replaceAll('{{PROFILE_URL}}',escape(config.profileUrl)).replaceAll('{{REPOSITORY_URL}}',escape(config.repositoryUrl)).replaceAll('{{PORTFOLIO_LINK}}',portfolio));
await cp(path.join(root,'site/styles.css'),path.join(output,'styles.css'));
await writeFile(path.join(output,'.nojekyll'),'');
await writeFile(path.join(output,'robots.txt'),`User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`);
await writeFile(path.join(output,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['','foundations/','transformers/'].map(route=>`<url><loc>${escape(siteUrl+'/'+route)}</loc></url>`).join('')}</urlset>`);
console.log('Built GitHub Pages site at '+siteUrl+'/');
