const fs = require('fs');
const path = require('path');

const DEFAULT_CHUNK_SIZE = 500;

const printUsage = () => {
  console.log('Usage:');
  console.log('  node scripts/csvToSql.js <input.csv> [output.sql] [--table <table_name>] [--chunk-size <n>] [--replace]');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/csvToSql.js ../po_import_sample.csv');
  console.log('  node scripts/csvToSql.js ../po_import_sample.csv ./po_import_sample.sql --table purchase_orders');
  console.log('  node scripts/csvToSql.js ./data.csv ./data.sql --chunk-size 1000');
};

const quoteIdentifier = (value) => `\`${String(value).replace(/`/g, '``')}\``;

const escapeSqlString = (value) => String(value)
  .replace(/\\/g, '\\\\')
  .replace(/\u0000/g, '\\0')
  .replace(/\u0008/g, '\\b')
  .replace(/\t/g, '\\t')
  .replace(/\n/g, '\\n')
  .replace(/\r/g, '\\r')
  .replace(/\u001a/g, '\\Z')
  .replace(/'/g, "\\'");

const inferTableName = (inputPath) => {
  const baseName = path.basename(inputPath, path.extname(inputPath));
  const cleaned = baseName
    .trim()
    .replace(/[^\w]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return cleaned || 'imported_rows';
};

const parseCsv = (input) => {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (next === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ',') {
      row.push(field);
      field = '';
      continue;
    }

    if (char === '\r' || char === '\n') {
      if (char === '\r' && next === '\n') {
        i += 1;
      }

      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }

    field += char;
  }

  row.push(field);
  rows.push(row);

  return rows.filter((currentRow) => currentRow.some((cell) => cell !== ''));
};

const normalizeHeaders = (headers) => {
  const counts = new Map();

  return headers.map((header, index) => {
    const base = String(header ?? '').trim() || `column_${index + 1}`;
    const count = counts.get(base) || 0;
    counts.set(base, count + 1);
    return count === 0 ? base : `${base}_${count + 1}`;
  });
};

const parseArgs = (argv) => {
  const options = {
    inputPath: null,
    outputPath: null,
    tableName: null,
    chunkSize: DEFAULT_CHUNK_SIZE,
    replace: false
  };

  const positional = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg === '--table') {
      options.tableName = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === '--output') {
      options.outputPath = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === '--chunk-size') {
      options.chunkSize = Number.parseInt(argv[i + 1], 10);
      i += 1;
      continue;
    }

    if (arg === '--replace') {
      options.replace = true;
      continue;
    }

    positional.push(arg);
  }

  if (!options.inputPath && positional[0]) {
    options.inputPath = positional[0];
  }

  if (!options.outputPath && positional[1]) {
    options.outputPath = positional[1];
  }

  return options;
};

const toSqlLiteral = (value) => {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  if (Buffer.isBuffer(value)) {
    return `X'${value.toString('hex')}'`;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : 'NULL';
  }

  if (typeof value === 'boolean') {
    return value ? '1' : '0';
  }

  if (value instanceof Date) {
    return `'${escapeSqlString(value.toISOString().slice(0, 19).replace('T', ' '))}'`;
  }

  return `'${escapeSqlString(value)}'`;
};

const buildInsertStatement = (tableName, columns, rows, replace) => {
  const verb = replace ? 'REPLACE INTO' : 'INSERT INTO';
  const columnList = columns.map(quoteIdentifier).join(', ');
  const valuesSql = rows
    .map((row) => `(${row.map(toSqlLiteral).join(', ')})`)
    .join(',\n');

  return `${verb} ${quoteIdentifier(tableName)} (${columnList}) VALUES\n${valuesSql};`;
};

const main = () => {
  const options = parseArgs(process.argv.slice(2));

  if (options.help || !options.inputPath) {
    printUsage();
    process.exit(options.help ? 0 : 1);
  }

  if (!fs.existsSync(options.inputPath)) {
    throw new Error(`Input file not found: ${options.inputPath}`);
  }

  if (!Number.isInteger(options.chunkSize) || options.chunkSize <= 0) {
    throw new Error('--chunk-size must be a positive integer');
  }

  const fileContents = fs.readFileSync(options.inputPath, 'utf8');
  const parsedRows = parseCsv(fileContents);

  if (parsedRows.length < 2) {
    throw new Error('The CSV file is empty or only contains headers');
  }

  const columns = normalizeHeaders(parsedRows[0]);
  if (columns.length === 0) {
    throw new Error('The CSV file does not contain any column headers');
  }

  const rows = parsedRows.slice(1).map((row) => {
    const record = {};

    columns.forEach((column, index) => {
      const value = row[index];
      record[column] = value === '' ? null : value;
    });

    return record;
  });

  const validRows = rows.filter((row) => Object.values(row).some((value) => value !== null));
  if (validRows.length === 0) {
    throw new Error('The CSV file is empty or only contains headers');
  }

  const tableName = options.tableName || inferTableName(options.inputPath);
  const outputPath = options.outputPath
    || path.join(
      path.dirname(options.inputPath),
      `${path.basename(options.inputPath, path.extname(options.inputPath))}.sql`
    );

  const statements = [];
  for (let index = 0; index < validRows.length; index += options.chunkSize) {
    const batch = validRows.slice(index, index + options.chunkSize);
    const values = batch.map((row) => columns.map((column) => row[column]));
    statements.push(buildInsertStatement(tableName, columns, values, options.replace));
  }

  const output = [
    `-- Generated from ${path.basename(options.inputPath)} on ${new Date().toISOString()}`,
    `-- Table: ${tableName}`,
    ''
  ]
    .concat(statements)
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd()
    .concat('\n');

  fs.writeFileSync(outputPath, output, 'utf8');
  console.log(`Wrote ${outputPath}`);
};

try {
  main();
} catch (error) {
  console.error(`CSV to SQL conversion failed: ${error.message}`);
  process.exit(1);
}
