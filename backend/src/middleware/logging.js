const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

const requestLogger = (req, res, next) => {
  const requestId = uuidv4();
  const start = Date.now();
  
  // Log request
  logger.info('Request received', {
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    body: req.body ? JSON.stringify(req.body) : '{}'
  });

  // Store the request ID for logging in response
  res.locals.requestId = requestId;
  res.locals.startTime = start;

  // Log response when it's finished
  const originalSend = res.send;
  res.send = function (body) {
    const responseTime = Date.now() - res.locals.startTime;
    
    logger.info('Response sent', {
      requestId: res.locals.requestId,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      body: body ? JSON.parse(body) : {}
    });

    originalSend.call(this, body);
  };

  next();
};

// Error logging middleware
const errorLogger = (err, req, res, next) => {
  logger.error('Error occurred', {
    requestId: res.locals.requestId,
    error: {
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      name: err.name,
      ...err
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      params: req.params,
      query: req.query,
      body: req.body
    }
  });

  next(err);
};

module.exports = {
  requestLogger,
  errorLogger
};
