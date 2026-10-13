import {readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
for(const folder of ['foundations','transformers','.']){
  const cwd=path.join(root,folder);
  const files=(await readdir(path.join(cwd,'tests'))).filter(f=>f.endsWith('.test.mjs')).map(f=>'tests/'+f);
  const result=spawnSync(process.execPath,['--test','--test-reporter=spec',...files],{cwd,stdio:'inherit'});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status||1);
}
