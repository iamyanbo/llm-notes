import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,access} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(new URL('../foundations/package.json',import.meta.url));
const {parseHTML}=require('linkedom');
const config=JSON.parse(await readFile('site.config.json','utf8'));
const siteUrl=new URL((process.env.SITE_URL||config.siteUrl).replace(/\/$/,'')+'/');
const root=path.resolve('dist');

async function files(directory){
  const result=[];
  for(const entry of await readdir(directory,{withFileTypes:true})){
    const name=path.join(directory,entry.name);
    if(entry.isDirectory())result.push(...await files(name));else result.push(name);
  }
  return result;
}
const built=await files(root);
const htmlFiles=built.filter(f=>f.endsWith('.html'));
function localFile(reference,base){
  const url=new URL(reference,base);
  if(url.origin!==siteUrl.origin)return null;
  assert.ok(url.pathname.startsWith(siteUrl.pathname),'URL escaped the project subpage: '+url.href);
  let relative=decodeURIComponent(url.pathname.slice(siteUrl.pathname.length));
  if(!relative||relative.endsWith('/'))relative+='index.html';
  const file=path.resolve(root,relative);
  assert.ok(file.startsWith(root+path.sep),'URL escaped the build output: '+reference);
  return {file,url};
}

test('every published page, image, stylesheet, and script resolves under the project subpage',async()=>{
  for(const file of htmlFiles){
    const base=new URL(path.relative(root,file).replaceAll(path.sep,'/'),siteUrl);
    const html=await readFile(file,'utf8');
    const {document}=parseHTML(html);
    for(const element of document.querySelectorAll('a[href],link[href],script[src],img[src]')){
      const reference=element.getAttribute('href')??element.getAttribute('src');
      if(/^(data:|mailto:|tel:)/.test(reference))continue;
      const local=localFile(reference,base);
      if(!local)continue;
      await access(local.file);
      if(local.url.hash){
        const target=local.file===file?document:parseHTML(await readFile(local.file,'utf8')).document;
        assert.ok(target.getElementById(decodeURIComponent(local.url.hash.slice(1))),reference);
      }
    }
    assert.equal(document.querySelector('#review-toggle,#review-panel,[data-review],.feedback-item'),null);
    assert.doesNotMatch(html,/hypothes\.is|chatgpt\.site|Original draft & comments|\\u[0-9a-f]{4}/i);
    assert.equal(document.querySelectorAll('.katex-error').length,0);
  }
});

test('browser modules and local CSS font/image references resolve after copying the essays',async()=>{
  for(const file of built.filter(f=>/\.(js|css)$/.test(f))){
    const code=await readFile(file,'utf8');
    const base=new URL(path.relative(root,file).replaceAll(path.sep,'/'),siteUrl);
    const refs=file.endsWith('.js')?[...code.matchAll(/\b(?:from|import)\s*['"](\.{1,2}\/[^'"]+)['"]/g)].map(m=>m[1]):[...code.matchAll(/url\(\s*['"]?([^)'"\s]+)['"]?\s*\)/g)].map(m=>m[1]);
    for(const ref of refs){
      const local=localFile(ref,base);
      if(local)await access(local.file);
    }
    assert.doesNotMatch(code,/hypothes\.is\/embed|hypothesis-loader|js-hypothesis-config/);
  }
});

test('the public source excludes source hosting identities and draft comment archives',async()=>{
  for(const chapter of ['foundations','transformers']){
    const entries=await readdir(chapter);
    assert.ok(!entries.includes('.openai'));
    assert.ok(!entries.includes('.sites-runtime'));
    const content=await readdir(chapter+'/content');
    assert.ok(content.every(file=>file.endsWith('.mdx')));
    assert.ok(!content.includes('page-archive.json'));
  }
  assert.equal(htmlFiles.length,14);
  const {document}=parseHTML(await readFile('dist/index.html','utf8'));
  assert.ok(document.querySelector('a[href="foundations/"]'));
  assert.ok(document.querySelector('a[href="transformers/"]'));
});

test('every public page uses the same tab icon with existing SVG, PNG, and ICO files',async()=>{
  let version;
  for(const file of htmlFiles){
    const {document}=parseHTML(await readFile(file,'utf8'));
    const svg=document.querySelector('link[rel=icon][type="image/svg+xml"]');assert.ok(svg,file);
    const png=document.querySelector('link[rel=icon][type="image/png"]');assert.ok(png,file);
    const ico=document.querySelector('link[rel="shortcut icon"]');assert.ok(ico,file);
    const base=new URL(path.relative(root,file).replaceAll(path.sep,'/'),siteUrl);
    const ref=svg.getAttribute('href');
    if(version===undefined)version=ref;else assert.equal(ref,version);
    for(const icon of [svg,png,ico])await access(localFile(icon.getAttribute('href'),base).file);
    assert.doesNotMatch(ref,/^data:/);
  }
});
