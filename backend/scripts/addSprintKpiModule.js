const fs = require('fs');
const path = require('path');
const db = require('../config/database');

async function runMigration() {
  try {
    console.log('Adding sprint KPI module...');

    const migrations = [
      '../migrations/create_sprint_kpi.sql',
      '../migrations/fix_sprint_kpi_missing_sprint_id.sql'
    ];

    for (const relativePath of migrations) {
      const migrationPath = path.join(__dirname, relativePath);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

      const statements = migrationSQL
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n')
        .split(';')
        .map((statement) => statement.trim())
        .filter((statement) => statement.length > 0);

      for (const statement of statements) {
        await db.query(statement);
        console.log(`Executed statement from ${path.basename(relativePath)}`);
      }
    }

    console.log('Sprint KPI module migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Sprint KPI module migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
