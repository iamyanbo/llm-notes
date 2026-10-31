import fs from 'node:fs';
import {miniatureFigure} from './site/miniature.mjs';
process.stdout.write(miniatureFigure(JSON.parse(fs.readFileSync(0,'utf8'))));
