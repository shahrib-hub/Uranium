const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.db'));

async function inspect() {
  for (const file of files) {
    const p = path.join(dataDir, file);
    const db = new sqlite3.Database(p);
    
    await new Promise((resolve) => {
      db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
        if (err) {
          console.error(`Error reading ${file}:`, err.message);
        } else {
          console.log(`Tables in ${file}:`, rows.map(r => r.name).join(', '));
        }
        db.close(resolve);
      });
    });
  }
}

inspect();
