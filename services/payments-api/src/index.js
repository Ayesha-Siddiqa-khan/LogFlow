const http = require('http');
const logger = require('./logger');

const PORT = parseInt(process.env.PORT || '3001', 10);
const SERVICE_NAME = process.env.SERVICE_NAME || 'payments-api';

let isHealthy = true;
let totalTransactions = 0;
let totalErrors = 0;
const startTime = Date.now();

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

  // Health check endpoint (for K8s liveness & readiness probes)
  if (pathname === '/health' && method === 'GET') {
    if (!isHealthy) {
      return sendJson(res, 503, { status: 'unhealthy', service: SERVICE_NAME });
    }
    return sendJson(res, 200, { status: 'healthy', service: SERVICE_NAME });
  }

  // Basic status endpoint
  if (pathname === '/status' && method === 'GET') {
    return sendJson(res, 200, {
      service: SERVICE_NAME,
      status: isHealthy ? 'healthy' : 'unhealthy',
      uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
      totalTransactions,
      totalErrors
    });
  }

  // Payment processing endpoint
  if (pathname === '/payments' && (method === 'POST' || method === 'GET')) {
    const body = method === 'POST' ? await parseBody(req) : {};
    const shouldFail = reqUrl.searchParams.get('fail') === 'true' || body.fail === true;

    if (shouldFail) {
      totalErrors++;
      const errReason = body.reason || 'Insufficient funds or gateway timeout';
      logger.error(`payment processing failed: ${errReason}`, {
        amount: body.amount || 100,
        currency: 'USD'
      });
      return sendJson(res, 500, {
        error: 'Payment processing failed',
        reason: errReason
      });
    }

    totalTransactions++;
    const paymentId = 'pay_' + Math.random().toString(36).substring(2, 9);
    logger.info(`payment processed successfully [id: ${paymentId}]`, {
      paymentId,
      amount: body.amount || 50,
      currency: 'USD'
    });
    return sendJson(res, 200, {
      message: 'Payment processed successfully',
      paymentId,
      status: 'completed'
    });
  }

  // Failure simulation endpoint (Scenario 2: Application Error)
  if (pathname === '/simulate-error' && method === 'POST') {
    totalErrors++;
    logger.error('simulated payment gateway outage detected', {
      gateway: 'StripeMock',
      errorCode: 'GATEWAY_TIMEOUT'
    });
    return sendJson(res, 500, {
      error: 'Simulated payment processing error triggered'
    });
  }

  // Failure simulation endpoint (Scenario 1: Service Failure)
  if (pathname === '/simulate-crash' && method === 'POST') {
    const body = await parseBody(req);
    const exitProcess = body.exit === true || reqUrl.searchParams.get('exit') === 'true';
    isHealthy = false;
    logger.error('CRITICAL: service failure simulated, transitioning to unhealthy state');

    sendJson(res, 200, {
      message: 'Simulated service failure activated',
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

  // Recovery / Reset endpoint
  if (pathname === '/reset' && method === 'POST') {
    isHealthy = true;
    logger.info('service state reset to healthy');
    return sendJson(res, 200, { message: 'Service state reset to healthy', isHealthy: true });
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
