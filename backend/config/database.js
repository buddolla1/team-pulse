const mysql = require('mysql2');
require('dotenv').config();

const isTruthy = (value) => ['1', 'true', 'yes', 'on'].includes(String(value || '').toLowerCase());
const DEBUG_DB_QUERIES = isTruthy(process.env.DB_DEBUG_QUERIES || process.env.DEBUG_SQL || process.env.DB_LOG_QUERIES);
const DEBUG_DB_SLOW_QUERIES = isTruthy(process.env.DB_LOG_SLOW_QUERIES || process.env.DEBUG_SQL_SLOW);
const SLOW_QUERY_MS = Number(process.env.DB_SLOW_QUERY_MS || 250);

const formatQueryParams = (params) => {
  if (params === undefined) {
    return '[]';
  }

  try {
    return JSON.stringify(params);
  } catch (error) {
    return '[unserializable params]';
  }
};

const logQuery = (sql, params, elapsedMs = null) => {
  const suffix = elapsedMs === null ? '' : ` (${elapsedMs}ms)`;
  console.debug(`[DB]${suffix} ${sql} | params=${formatQueryParams(params)}`);
};

const logQueryError = (sql, params, error) => {
  console.error(`[DB ERROR] ${sql} | params=${formatQueryParams(params)}`);
  console.error(error);
};

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'myuser',
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : 'mypassword',
  database: process.env.DB_NAME || 'employee_management',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Get promise-based connection
const promisePool = pool.promise();

const originalQuery = promisePool.query.bind(promisePool);
promisePool.query = async (sql, params) => {
  const start = Date.now();

  try {
    const result = await originalQuery(sql, params);
    const elapsedMs = Date.now() - start;

    if (DEBUG_DB_QUERIES || (DEBUG_DB_SLOW_QUERIES && elapsedMs >= SLOW_QUERY_MS)) {
      logQuery(sql, params, elapsedMs);
    }

    return result;
  } catch (error) {
    if (DEBUG_DB_QUERIES || DEBUG_DB_SLOW_QUERIES) {
      logQueryError(sql, params, error);
    }
    throw error;
  }
};

const originalExecute = typeof promisePool.execute === 'function' ? promisePool.execute.bind(promisePool) : null;
if (originalExecute) {
  promisePool.execute = async (sql, params) => {
    const start = Date.now();

    try {
      const result = await originalExecute(sql, params);
      const elapsedMs = Date.now() - start;

      if (DEBUG_DB_QUERIES || (DEBUG_DB_SLOW_QUERIES && elapsedMs >= SLOW_QUERY_MS)) {
        logQuery(sql, params, elapsedMs);
      }

      return result;
    } catch (error) {
      if (DEBUG_DB_QUERIES || DEBUG_DB_SLOW_QUERIES) {
        logQueryError(sql, params, error);
      }
      throw error;
    }
  };
}

// Test connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error connecting to MySQL database:', err.message);
    return;
  }
  console.log('Successfully connected to MySQL database');
  connection.release();
});

module.exports = promisePool;
