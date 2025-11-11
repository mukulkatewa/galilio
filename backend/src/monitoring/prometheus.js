const client = require('prom-client');
const responseTime = require('response-time');

// Create a Registry to register the metrics
const register = new client.Registry();

// Enable collection of default metrics
client.collectDefaultMetrics({ register });

// Create custom metrics
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 5, 15, 50, 100, 200, 300, 400, 500]
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const databaseQueryDuration = new client.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'model']
});

const errorCounter = new client.Counter({
  name: 'http_errors_total',
  help: 'Total number of HTTP errors',
  labelNames: ['method', 'route', 'status_code']
});

// Register the metrics
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(httpRequestsTotal);
register.registerMetric(databaseQueryDuration);
register.registerMetric(errorCounter);

// Middleware for tracking request duration
const requestDurationMiddleware = responseTime((req, res, time) => {
  const route = req.route ? req.route.path : req.path;
  httpRequestDurationMicroseconds
    .labels(req.method, route, res.statusCode)
    .observe(time);
  
  httpRequestsTotal
    .labels(req.method, route, res.statusCode)
    .inc();

  // Track errors
  if (res.statusCode >= 400) {
    errorCounter
      .labels(req.method, route, res.statusCode)
      .inc();
  }
});

// Track database query duration
const trackQueryDuration = (operation, model, startTime) => {
  const duration = Date.now() - startTime;
  databaseQueryDuration
    .labels(operation, model)
    .observe(duration / 1000); // Convert to seconds
};

// Get metrics endpoint handler
const getMetrics = async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
};

module.exports = {
  register,
  requestDurationMiddleware,
  trackQueryDuration,
  getMetrics,
  client
};
