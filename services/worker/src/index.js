const http = require('http');
const logger = require('./logger');

const PORT = parseInt(process.env.PORT || '3003', 10);
const SERVICE_NAME = process.env.SERVICE_NAME || 'worker';
const INTERVAL_MS = parseInt(process.env.WORK_INTERVAL_MS || '4000', 10);

let isHealthy = true;
let isDegraded = false;
let processedBatches = 0;
let totalProcessedJobs = 0;
const startTime = Date.now();

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// Background worker task loop
function runWorkerTask() {
  if (!isHealthy) {
    logger.error('worker loop stalled due to unrecoverable queue error');
    return;
  }

  if (isDegraded) {
    const lagMs = Math.floor(Math.random() * 2000) + 3500;
    logger.warn(`queue processing is slow (lag: ${lagMs}ms, memory backpressure detected)`, {
      lagMs,
      queueDepth: 420,
      activeWorkers: 1
    });
    return;
  }

  // Normal operation
  const batchSize = Math.floor(Math.random() * 5) + 3;
  processedBatches++;
  totalProcessedJobs += batchSize;
  logger.info(`processed batch #${processedBatches} (${batchSize} queue items completed)`, {
    batchNumber: processedBatches,
    jobsInBatch: batchSize,
    totalCompleted: totalProcessedJobs
  });
}

const timerId = setInterval(runWorkerTask, INTERVAL_MS);

// HTTP Management & Health Server for Kubernetes probes & Dashboard
const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = reqUrl.pathname;
  const method = req.method;

  // Health endpoint (K8s liveness & readiness)
  if (pathname === '/health' && method === 'GET') {
    if (!isHealthy) {
      return sendJson(res, 503, { status: 'unhealthy', service: SERVICE_NAME });
    }
    const state = isDegraded ? 'degraded' : 'healthy';
    return sendJson(res, 200, { status: state, service: SERVICE_NAME });
  }

  // Status endpoint
  if (pathname === '/status' && method === 'GET') {
    const state = !isHealthy ? 'unhealthy' : (isDegraded ? 'degraded' : 'healthy');
    return sendJson(res, 200, {
      service: SERVICE_NAME,
      status: state,
      isDegraded,
      uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
      processedBatches,
      totalProcessedJobs
    });
  }

  // Simulate degraded worker (Scenario 3: Degraded Worker)
  if (pathname === '/simulate-degraded' && method === 'POST') {
    isDegraded = true;
    logger.warn('SIMULATION TRIGGERED: worker switched to degraded mode (slow queue processing)');
    runWorkerTask(); // immediately fire degraded warning
    return sendJson(res, 200, {
      message: 'Worker degraded mode enabled',
      isDegraded: true
    });
  }

  // Simulate worker crash / failure (Scenario 1)
  if (pathname === '/simulate-crash' && method === 'POST') {
    isHealthy = false;
    logger.error('CRITICAL: worker fatal crash simulated');
    return sendJson(res, 200, {
      message: 'Worker crash simulated',
      isHealthy: false
    });
  }

  // Reset worker state
  if (pathname === '/reset' && method === 'POST') {
    isHealthy = true;
    isDegraded = false;
    logger.info('worker restored to healthy and optimal processing speed');
    return sendJson(res, 200, {
      message: 'Worker restored to healthy',
      isHealthy: true,
      isDegraded: false
    });
  }

  sendJson(res, 404, { error: 'Not Found' });
});

server.listen(PORT, () => {
  logger.info(`${SERVICE_NAME} started with ${INTERVAL_MS}ms processing loop on port ${PORT}`);
});

process.on('SIGTERM', () => {
  clearInterval(timerId);
  logger.info('Received SIGTERM, gracefully stopping worker');
  server.close(() => process.exit(0));
});

module.exports = { server, timerId };
