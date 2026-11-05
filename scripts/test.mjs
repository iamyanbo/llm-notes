import {readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const drafts=spawnSync(process.execPath,['scripts/draft-essays.mjs'],{cwd:root,stdio:'inherit'});
if(drafts.error)throw drafts.error;
if(drafts.status!==0)process.exit(drafts.status||1);
for(const folder of ['foundations','transformers','deepseek','.']){
  const cwd=path.join(root,folder);
  const files=(await readdir(path.join(cwd,'tests'))).filter(f=>f.endsWith('.test.mjs')).map(f=>'tests/'+f);
  const result=spawnSync(process.execPath,['--test','--test-reporter=spec',...files],{cwd,stdio:'inherit'});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status||1);
}
const python=process.env.PYTHON||(process.platform==='win32'?'python':'python3');
for(const args of [['check.py'],['-m','unittest','discover','-s','tests','-p','test_*.py']]){
  const result=spawnSync(python,args,{cwd:path.join(root,'deepseek'),env:process.env,stdio:'inherit'});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status||1);
}
