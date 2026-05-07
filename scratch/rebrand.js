const fs = require('fs');
const path = require('path');

const dirs = [
  'd:\\MULTIBOT\\src\\economy',
  'd:\\MULTIBOT\\src\\economy\\handlers',
  'd:\\MULTIBOT\\src\\commands\\Economy'
];

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.json')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      let newContent = content
        .replace(/ coins/g, ' Atoms')
        .replace(/ Coins/g, ' Atoms')
        .replace(/coins!/g, 'Atoms!')
        .replace(/coins\./g, 'Atoms.')
        .replace(/💰/g, '⚛️')
        .replace(/🪙/g, '⚛️');
        
      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent, 'utf8');
        console.log(`Rebranded ${fullPath}`);
      }
    }
  }
}

for (const dir of dirs) {
  processDir(dir);
}
console.log('Rebrand complete.');
