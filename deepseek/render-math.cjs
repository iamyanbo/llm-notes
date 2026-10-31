const fs=require('fs');
const katex=require('./assets/katex/katex.min.js');
const inputs=JSON.parse(fs.readFileSync(0,'utf8'));
process.stdout.write(JSON.stringify(inputs.map(({text,display})=>katex.renderToString(text,{displayMode:display,throwOnError:true,strict:'error',output:'htmlAndMathml'}))));
