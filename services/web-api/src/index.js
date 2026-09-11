const http = require('http');
const logger = require('./logger');

const PORT = parseInt(process.env.PORT || '3002', 10);
const SERVICE_NAME = process.env.SERVICE_NAME || 'web-api';

let isHealthy = true;
let totalRequests = 0;
let totalErrors = 0;
const startTime = Date.now();

const mockItems = [
  { id: 1, name: 'Server Monitoring Agent', category: 'observability', active: true },
  { id: 2, name: 'Log Shipper Daemon', category: 'logging', active: true },
  { id: 3, name: 'Metrics Collector', category: 'telemetry', active: true },
  { id: 4, name: 'Alert Dispatcher', category: 'alerting', active: false }
];

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = reqUrl.pathname;
  const method = req.method;

  totalRequests++;

  // Health probe endpoint
  if (pathname === '/health' && method === 'GET') {
    if (!isHealthy) {
      return sendJson(res, 503, { status: 'unhealthy', service: SERVICE_NAME });
    }
    return sendJson(res, 200, { status: 'healthy', service: SERVICE_NAME });
  }

  // Status endpoint
  if (pathname === '/status' && method === 'GET') {
    return sendJson(res, 200, {
      service: SERVICE_NAME,
      status: isHealthy ? 'healthy' : 'unhealthy',
      uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
      totalRequests,
      totalErrors
    });
  }

  // Root / welcome endpoint
  if (pathname === '/' && method === 'GET') {
    logger.info('root endpoint accessed', { ip: req.socket.remoteAddress });
    return sendJson(res, 200, {
      message: 'LogFlow Web API is running',
      version: '1.0.0',
      endpoints: ['/health', '/status', '/api/items', '/simulate-error']
    });
  }

  // API items endpoint
  if (pathname === '/api/items' && method === 'GET') {
    const shouldError = reqUrl.searchParams.get('error') === 'true';
    if (shouldError) {
      totalErrors++;
      logger.error('failed to retrieve catalog items from upstream datastore', {
        endpoint: '/api/items',
        query: reqUrl.search
      });
      return sendJson(res, 500, {
        error: 'Internal Server Error',
        message: 'Failed to retrieve catalog items'
      });
    }

    logger.info(`returned ${mockItems.length} items to client`, {
      count: mockItems.length,
      latencyMs: Math.floor(Math.random() * 20) + 5
    });
    return sendJson(res, 200, { items: mockItems });
  }

  // Simulate error (Scenario 2: Application Error)
  if (pathname === '/simulate-error' && method === 'POST') {
    totalErrors++;
    const body = await parseBody(req);
    const errMessage = body.message || 'database connection timeout on web-api';
    logger.error(`request failed: ${errMessage}`, {
      path: pathname,
      statusCode: 500
    });
    return sendJson(res, 500, {
      error: 'Simulated Application Error',
      message: errMessage
    });
  }

  // Simulate crash / failure (Scenario 1: Service Failure)
  if (pathname === '/simulate-crash' && method === 'POST') {
    const body = await parseBody(req);
    const exitProcess = body.exit === true || reqUrl.searchParams.get('exit') === 'true';
    isHealthy = false;
    logger.error('CRITICAL: web-api entering unhealthy state by user simulation');

    sendJson(res, 200, {
      message: 'Simulated web-api crash activated',
      isHealthy: false,
      exitProcess
    });

    if (exitProcess) {
      setTimeout(() => {
        logger.error('Process exiting due to simulated crash');
        process.exit(1);
      }, 500);
    }
    return;
  }

  // Reset to healthy
  if (pathname === '/reset' && method === 'POST') {
    isHealthy = true;
    logger.info('web-api state reset to healthy');
    return sendJson(res, 200, { message: 'Service restored to healthy', isHealthy: true });
  }

  sendJson(res, 404, { error: 'Not Found' });
});

server.listen(PORT, () => {
  logger.info(`${SERVICE_NAME} started and listening on port ${PORT}`);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, gracefully shutting down');
  server.close(() => process.exit(0));
});

module.exports = server;
