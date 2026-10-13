import {transformerDiagram} from './transformer-diagram.mjs';
import {attentionStudy} from './attention-study.mjs';
import {architectureOperations} from './architecture-operations.mjs';

// The opening diagram and Section 6 use the same architecture and calculation panels.
export function architectureCanvas(prefix,className=''){
  return `<div class="architecture-canvas ${className}">${transformerDiagram(prefix,{operationStudies:true})}${attentionStudy(prefix)}${architectureOperations(prefix)}</div>`;
}
