const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('telemetry.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS samples (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device TEXT,
    ts INTEGER,
    temperature REAL,
    humidity REAL,
    airQuality REAL
  )`);
});

module.exports = {
  insert: (row) => new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO samples(device, ts, temperature, humidity, airQuality)
       VALUES(?, ?, ?, ?, ?)`,
      [row.device, row.ts, row.temperature, row.humidity, row.airQuality],
      function (err) { err ? reject(err) : resolve(this.lastID); }
    );
  }),
  latest: (limit=200) => new Promise((resolve, reject) => {
    db.all(`SELECT * FROM samples ORDER BY ts DESC LIMIT ?`, [limit],
      (err, rows) => err ? reject(err) : resolve(rows));
  })
};
