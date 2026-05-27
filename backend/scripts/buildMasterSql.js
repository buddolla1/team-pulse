const fs = require('fs');
const path = require('path');
const mysql = require('mysql2');
const db = require('../config/database');

const OUTPUT_FILE = path.join(__dirname, '..', '..', 'employee_management_master.sql');
const SCHEMA_NAME = process.env.DB_NAME || 'employee_management';

const TABLE_ORDER = [
  'roles',
  'permissions',
  'common_lookups',
  'employees',
  'admin_users',
  'audit_logs',
  'assets',
  'pos',
  'projects',
  'project_teams',
  'project_employees',
  'employee_roles',
  'invoices',
  'invoice_items',
  'visa_history',
  'visa_reminders',
  'upcoming_visa_expirations',
  'incident_tracker_incidents',
  'incident_tracker_comments',
  'incident_tracker_attachments',
  'incident_tracker_notifications',
  'incident_tracker_activity_logs',
  'release_management',
  'sprint_kpi_sprints',
  'sprint_kpi_stories',
  'sprint_kpi_entries'
];

const VIEW_ORDER = [
  'admin_users_with_roles',
  'role_permissions_view'
];

const SEED_TABLES = [
  'admin_users',
  'common_lookups',
  'permissions',
  'roles',
  'role_permissions',
  'employee_roles'
];

const literal = (value) => {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  if (value instanceof Date) {
    return mysql.escape(value);
  }

  if (Buffer.isBuffer(value)) {
    return mysql.escape(value);
  }

  return mysql.escape(value);
};

const stripNoise = (sql) => sql
  .replace(/\s+AUTO_INCREMENT=\d+/gi, '')
  .replace(/DEFINER=`[^`]+`@`[^`]+`\s*/gi, '')
  .trim();

const sortByPreferredOrder = (names, preferredOrder) => {
  const rank = new Map(preferredOrder.map((name, index) => [name, index]));
  return [...names].sort((a, b) => {
    const rankA = rank.has(a) ? rank.get(a) : Number.MAX_SAFE_INTEGER;
    const rankB = rank.has(b) ? rank.get(b) : Number.MAX_SAFE_INTEGER;
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    return a.localeCompare(b);
  });
};

const dumpCreateStatement = async (name, type) => {
  const query = type === 'VIEW'
    ? `SHOW CREATE VIEW \`${name}\``
    : `SHOW CREATE TABLE \`${name}\``;
  const [rows] = await db.query(query);
  const row = rows[0] || {};
  const createKey = Object.keys(row).find((key) => /^Create /i.test(key));
  const createSql = stripNoise(row[createKey] || '');

  return [
    `-- --------------------------------------------------------`,
    `-- ${type === 'VIEW' ? 'View' : 'Table'} structure for ${name}`,
    `-- --------------------------------------------------------`,
    type === 'VIEW'
      ? `DROP VIEW IF EXISTS \`${name}\`;`
      : `DROP TABLE IF EXISTS \`${name}\`;`,
    `${createSql};`
  ].join('\n');
};

const dumpSeedTable = async (name) => {
  const [rows] = await db.query(`SELECT * FROM \`${name}\``);
  if (!rows.length) {
    return '';
  }

  const columns = Object.keys(rows[0]);
  const valuesSql = rows.map((row) => `(${columns.map((column) => literal(row[column])).join(', ')})`).join(',\n');
  const columnList = columns.map((column) => `\`${column}\``).join(', ');

  return [
    `-- Seed data for ${name}`,
    `INSERT INTO \`${name}\` (${columnList}) VALUES`,
    `${valuesSql};`
  ].join('\n');
};

const main = async () => {
  const [tableRows] = await db.query(
    `SELECT TABLE_NAME, TABLE_TYPE
     FROM information_schema.tables
     WHERE table_schema = ?
       AND TABLE_NAME <> ?
     ORDER BY TABLE_TYPE, TABLE_NAME`,
    [SCHEMA_NAME, path.basename(OUTPUT_FILE, '.sql')]
  );

  const tableMap = new Map(tableRows.map((row) => [row.TABLE_NAME, row.TABLE_TYPE]));
  const baseTables = sortByPreferredOrder(
    tableRows.filter((row) => row.TABLE_TYPE === 'BASE TABLE').map((row) => row.TABLE_NAME),
    TABLE_ORDER
  );
  const views = sortByPreferredOrder(
    tableRows.filter((row) => row.TABLE_TYPE === 'VIEW').map((row) => row.TABLE_NAME),
    VIEW_ORDER
  );

  const lines = [
    '-- Generated master schema dump rebuilt from the current local database schema.',
    '-- Keep migration files as the source of truth for future schema changes.',
    '',
    `CREATE DATABASE IF NOT EXISTS \`${SCHEMA_NAME}\`;`,
    `USE \`${SCHEMA_NAME}\`;`,
    'SET FOREIGN_KEY_CHECKS = 0;',
    ''
  ];

  for (const name of [...baseTables, ...views]) {
    const type = tableMap.get(name);
    if (!type) {
      continue;
    }

    lines.push(await dumpCreateStatement(name, type), '');
  }

  const seedBlocks = [];
  for (const name of SEED_TABLES) {
    if (!tableMap.has(name)) {
      continue;
    }
    const block = await dumpSeedTable(name);
    if (block) {
      seedBlocks.push(block);
    }
  }

  if (seedBlocks.length > 0) {
    lines.push('-- --------------------------------------------------------', '-- Stable seed data', '-- --------------------------------------------------------', '');
    for (const block of seedBlocks) {
      lines.push(block, '');
    }
  }

  lines.push('SET FOREIGN_KEY_CHECKS = 1;', '');

  fs.writeFileSync(OUTPUT_FILE, `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`, 'utf8');
  if (typeof db.end === 'function') {
    await db.end();
  }
  console.log(`Wrote ${OUTPUT_FILE}`);
};

main().catch((error) => {
  console.error(error);
  if (typeof db.end === 'function') {
    db.end().catch(() => {});
  }
  process.exit(1);
});
