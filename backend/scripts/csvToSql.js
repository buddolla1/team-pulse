const fs = require('fs');
const path = require('path');

const escapeSqlValue = (value) => {
  if (value === null || value === undefined || value === '') {
    return 'NULL';
  }

  return `'${String(value).replace(/'/g, "''")}'`;
};

const parseCsvLine = (line) => {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values.map((value) => {
    if (value === '') {
      return '';
    }
    return value;
  });
};

const parseCsv = (content) => {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    throw new Error('CSV file must contain a header row and at least one data row.');
  }

  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map(parseCsvLine);

  return { headers, rows };
};

const buildInsertSql = (tableName, headers, rows) => {
  const columns = headers.map((column) => `\`${column}\``).join(', ');
  const values = rows
    .map((row) => {
      if (row.length !== headers.length) {
        throw new Error(`Row has ${row.length} values but expected ${headers.length}.`);
      }

      return `(${row.map(escapeSqlValue).join(', ')})`;
    })
    .join(',\n');

  return [
    `INSERT INTO \`${tableName}\` (${columns}) VALUES`,
    `${values};`
  ].join('\n');
};

const main = () => {
  const [, , inputFile, outputFileArg, tableNameArg] = process.argv;

  if (!inputFile) {
    console.error('Usage: node scripts/csvToSql.js <input.csv> [output.sql] [table_name]');
    process.exit(1);
  }

  const resolvedInput = path.resolve(process.cwd(), inputFile);
  const outputFile = outputFileArg
    ? path.resolve(process.cwd(), outputFileArg)
    : resolvedInput.replace(/\.csv$/i, '.sql');
  const tableName = tableNameArg || path.basename(resolvedInput, path.extname(resolvedInput));

  const content = fs.readFileSync(resolvedInput, 'utf8');
  const { headers, rows } = parseCsv(content);
  const sql = buildInsertSql(tableName, headers, rows);

  fs.writeFileSync(outputFile, `${sql}\n`, 'utf8');
  console.log(`Wrote ${outputFile}`);
};

main();
