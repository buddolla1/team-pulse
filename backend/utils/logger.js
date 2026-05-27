const LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const normalizeLevel = (value) => {
  const level = String(value || 'info').toLowerCase();
  return Object.prototype.hasOwnProperty.call(LEVELS, level) ? level : 'info';
};

const APP_LOG_LEVEL = normalizeLevel(process.env.APP_LOG_LEVEL || process.env.LOG_LEVEL);

const shouldLog = (level) => LEVELS[level] <= LEVELS[APP_LOG_LEVEL];

const timestamp = () => new Date().toISOString();

const write = (level, message, meta = null) => {
  if (!shouldLog(level)) {
    return;
  }

  const prefix = `[${timestamp()}] [${level.toUpperCase()}]`;
  if (meta && Object.keys(meta).length > 0) {
    const payload = typeof meta === 'string' ? meta : JSON.stringify(meta);
    console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](`${prefix} ${message} ${payload}`);
    return;
  }

  console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](`${prefix} ${message}`);
};

module.exports = {
  debug: (message, meta) => write('debug', message, meta),
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta),
  shouldLog,
  APP_LOG_LEVEL
};
