const logger = require('../utils/logger');

const requestLogger = (req, res, next) => {
  const start = process.hrtime.bigint();
  const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  const userAgent = req.headers['user-agent'] || '-';
  const userType = req.employee?.user_type || req.admin?.user_type || 'anonymous';

  res.on('finish', () => {
    const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    logger[level](
      `${req.method} ${req.originalUrl} -> ${res.statusCode} (${elapsedMs.toFixed(1)}ms)`,
      {
        requestId,
        ip: req.ip,
        userType,
        userAgent
      }
    );
  });

  next();
};

module.exports = requestLogger;
