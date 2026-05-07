const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'src', 'data');
const files = [
  'ranking_data.db',
  'ticket.db',
  'yt_verify.db',
  'verification.db',
  'giveaway.db'
];

async function inspect() {
  for (const file of files) {
    const p = path.join(dataDir, file);
    if (!fs.existsSync(p)) {
      console.log(`File not found: ${file}`);
      continue;
    }
    const db = new sqlite3.Database(p);
    
    db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
      if (err) return console.error(err);
      console.log(`\n--- ${file} ---`);
      tables.forEach(t => {
        if (t.name === 'sqlite_sequence') return;
        db.all(`PRAGMA table_info(${t.name})`, [], (err, cols) => {
          console.log(`Table: ${t.name}`);
          console.log(cols.map(c => `${c.name} (${c.type})`).join(', '));
        });
      });
    });
  }
}

inspect();
