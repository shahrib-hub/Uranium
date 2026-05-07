const fs = require('fs');
let t = fs.readFileSync('src/economy/constants.js', 'utf8');
t = t.replace(/["']coins["']\s*:/g, '"Atoms":');
fs.writeFileSync('src/economy/constants.js', t);
console.log('Unified quest properties to Atoms');
