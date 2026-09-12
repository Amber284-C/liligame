import {existsSync, renameSync, rmSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const output=fileURLToPath(new URL('../dist/client/',import.meta.url));
const nested=path.join(output,'liligame','_next');
const assets=path.join(output,'_next');
if(!existsSync(path.join(output,'index.html'))||!existsSync(nested))throw new Error('GitHub Pages build output is incomplete');
if(existsSync(assets))rmSync(assets,{recursive:true});
renameSync(nested,assets);
rmSync(path.join(output,'liligame'),{recursive:true});
writeFileSync(path.join(output,'.nojekyll'),'');
