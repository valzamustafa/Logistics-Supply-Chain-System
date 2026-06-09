const fs = require('fs');
const path = require('path');
const root = path.join(process.cwd(),'src');
const pattern = />[^<>{}]*[A-Za-z][^<>{}]*</g;
function walk(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full = path.join(dir,entry.name);
    if(entry.isDirectory()) walk(full);
    else if(entry.isFile() && full.endsWith('.tsx')){
      const text = fs.readFileSync(full,'utf8');
      const matches = text.match(pattern);
      if(matches && matches.length) console.log(path.relative(root, full), matches.length);
    }
  }
}
walk(root);
