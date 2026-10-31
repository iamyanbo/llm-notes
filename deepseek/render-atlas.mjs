import {atlasFigure} from './site/atlas.mjs';
process.stdout.write(JSON.stringify(Object.fromEntries(['whole','block','ownership'].map(kind=>[kind,atlasFigure(kind)]))));
