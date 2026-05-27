const fs = require('fs');
const path = require('path');
const db = require('../config/database');

async function runMigration() {
  try {
    console.log('Adding generaluser role and incident/release permissions...');

    const migrationPath = path.join(__dirname, '../migrations/add_generaluser_role.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    const statements = migrationSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n')
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    for (const statement of statements) {
      await db.query(statement);
      console.log('Executed statement');
    }

    console.log('General user role migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('General user role migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
