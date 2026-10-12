const { DatabaseSync } = require('node:sqlite');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
module.exports = function analyticsDb() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(resolve(__dirname, '../../migrations/analytics/0001_daily_counts.sql'), 'utf8'));
  const db = {
    sqlite,
    prepare(sql) { return { bind(...args) { return {
      async all() { return { results: sqlite.prepare(sql).all(...args) }; },
      run() { const result = sqlite.prepare(sql).run(...args); return { success: true, meta: { changes: Number(result.changes) } }; }
    }; } }; },
    async batch(statements) {
      sqlite.exec('BEGIN');
      try { const results = statements.map(statement => statement.run()); sqlite.exec('COMMIT'); return results; }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    }
  };
  return db;
};
