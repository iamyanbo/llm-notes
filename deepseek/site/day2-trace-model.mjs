export {flowDefinition} from './day2-flow-scenes.mjs';
export {fmt as format} from './trace-scene.mjs';
import {fmt} from './trace-scene.mjs';
export const display=v=>Array.isArray(v)?'('+v.map(fmt).join(', ')+')':fmt(v);
