const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT || '3000', 10);
const MAX_LOGS = parseInt(process.env.MAX_LOGS || '2000', 10);

const SERVICES_CONFIG = {
  'payments-api': process.env.PAYMENTS_API_URL || 'http://127.0.0.1:3001',
  'web-api': process.env.WEB_API_URL || 'http://127.0.0.1:3002',
  'worker': process.env.WORKER_URL || 'http://127.0.0.1:3003'
};

// In-memory central log store
const logStore = [];
let errorCount = 0;
let warnCount = 0;
let infoCount = 0;

function addLog(entry) {
  if (!entry || !entry.service || !entry.message) return;
  const level = (entry.level || 'INFO').toUpperCase();
  const normalized = {
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    timestamp: entry.timestamp || new Date().toISOString(),
    service: entry.service,
    level,
    message: entry.message,
    metadata: entry.metadata || {}
  };

  if (level === 'ERROR') errorCount++;
  else if (level === 'WARN') warnCount++;
  else infoCount++;

  logStore.unshift(normalized);
  if (logStore.length > MAX_LOGS) {
    const popped = logStore.pop();
    if (popped.level === 'ERROR' && errorCount > 0) errorCount--;
    if (popped.level === 'WARN' && warnCount > 0) warnCount--;
    if (popped.level === 'INFO' && infoCount > 0) infoCount--;
  }
}

// Seed initial startup log
addLog({
  timestamp: new Date().toISOString(),
  service: 'dashboard',
  level: 'INFO',
  message: 'Central log collector initialized and ready for ingestion',
  metadata: { maxLogs: MAX_LOGS }
});

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
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

// Check upstream service health
async function checkServiceHealth(name, baseUrl) {
  return new Promise((resolve) => {
    const start = Date.now();
    try {
      const url = new URL('/health', baseUrl);
      const req = http.request(url, { method: 'GET', timeout: 1500 }, (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          const latency = Date.now() - start;
          let status = 'down';
          try {
            const data = JSON.parse(body);
            status = data.status || (res.statusCode === 200 ? 'healthy' : 'unhealthy');
          } catch {
            status = res.statusCode === 200 ? 'healthy' : 'unhealthy';
          }
          resolve({ service: name, status, statusCode: res.statusCode, latencyMs: latency, url: baseUrl });
        });
      });
      req.on('error', () => {
        resolve({ service: name, status: 'down', statusCode: 0, latencyMs: Date.now() - start, url: baseUrl });
      });
      req.on('timeout', () => {
        req.destroy();
        resolve({ service: name, status: 'timeout', statusCode: 0, latencyMs: 1500, url: baseUrl });
      });
      req.end();
    } catch {
      resolve({ service: name, status: 'error', statusCode: 0, latencyMs: 0, url: baseUrl });
    }
  });
}

// Forward simulation commands
function forwardPost(targetBaseUrl, targetPath, payload = {}) {
  return new Promise((resolve) => {
    try {
      const url = new URL(targetPath, targetBaseUrl);
      const postData = JSON.stringify(payload);
      const req = http.request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 2500
      }, (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, body });
        });
      });
      req.on('error', (err) => resolve({ statusCode: 502, error: err.message }));
      req.write(postData);
      req.end();
    } catch (err) {
      resolve({ statusCode: 500, error: err.message });
    }
  });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = reqUrl.pathname;
  const method = req.method;

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  // Dashboard health
  if (pathname === '/health' && method === 'GET') {
    return sendJson(res, 200, { status: 'healthy', service: 'dashboard' });
  }

  // Log Ingestion Endpoint
  if (pathname === '/api/logs' && method === 'POST') {
    const body = await parseBody(req);
    if (Array.isArray(body)) {
      body.forEach(addLog);
    } else {
      addLog(body);
    }
    return sendJson(res, 201, { success: true, count: logStore.length });
  }

  // Log Query Endpoint
  if (pathname === '/api/logs' && method === 'GET') {
    const serviceFilter = reqUrl.searchParams.get('service');
    const levelFilter = reqUrl.searchParams.get('level');
    const searchQuery = (reqUrl.searchParams.get('query') || '').toLowerCase();
    const limit = parseInt(reqUrl.searchParams.get('limit') || '100', 10);

    let filtered = logStore;

    if (serviceFilter && serviceFilter !== 'all') {
      filtered = filtered.filter(l => l.service === serviceFilter);
    }
    if (levelFilter && levelFilter !== 'all') {
      filtered = filtered.filter(l => l.level === levelFilter.toUpperCase());
    }
    if (searchQuery) {
      filtered = filtered.filter(l =>
        l.message.toLowerCase().includes(searchQuery) ||
        l.service.toLowerCase().includes(searchQuery) ||
        JSON.stringify(l.metadata).toLowerCase().includes(searchQuery)
      );
    }

    return sendJson(res, 200, {
      totalLogs: logStore.length,
      filteredCount: filtered.length,
      stats: {
        errorCount,
        warnCount,
        infoCount
      },
      logs: filtered.slice(0, limit)
    });
  }

  // Clear Logs Endpoint
  if (pathname === '/api/logs' && method === 'DELETE') {
    logStore.length = 0;
    errorCount = 0;
    warnCount = 0;
    infoCount = 0;
    addLog({ service: 'dashboard', level: 'INFO', message: 'Log buffer cleared by user' });
    return sendJson(res, 200, { message: 'Logs cleared successfully' });
  }

  // Polling service health
  if (pathname === '/api/services' && method === 'GET') {
    const checks = await Promise.all([
      checkServiceHealth('payments-api', SERVICES_CONFIG['payments-api']),
      checkServiceHealth('web-api', SERVICES_CONFIG['web-api']),
      checkServiceHealth('worker', SERVICES_CONFIG['worker'])
    ]);
    return sendJson(res, 200, { services: checks, timestamp: new Date().toISOString() });
  }

  // Trigger Simulations from Dashboard
  if (pathname.startsWith('/api/simulate/') && method === 'POST') {
    const action = pathname.replace('/api/simulate/', '');
    let result = { message: 'Unknown action' };

    if (action === 'service-failure') {
      // Scenario 1: Service Failure on payments-api
      result = await forwardPost(SERVICES_CONFIG['payments-api'], '/simulate-crash', { exit: false });
      addLog({ service: 'dashboard', level: 'WARN', message: 'Triggered Scenario 1: payments-api marked unhealthy' });
    } else if (action === 'app-error') {
      // Scenario 2: Application Error storm on web-api
      result = await forwardPost(SERVICES_CONFIG['web-api'], '/simulate-error', { message: 'High volume database deadlock' });
      addLog({ service: 'dashboard', level: 'WARN', message: 'Triggered Scenario 2: web-api application error' });
    } else if (action === 'degraded-worker') {
      // Scenario 3: Degraded Worker
      result = await forwardPost(SERVICES_CONFIG['worker'], '/simulate-degraded', {});
      addLog({ service: 'dashboard', level: 'WARN', message: 'Triggered Scenario 3: worker degraded mode' });
    } else if (action === 'normal-traffic') {
      // Generate normal traffic across services
      await forwardPost(SERVICES_CONFIG['payments-api'], '/payments', { amount: 85 });
      await forwardPost(SERVICES_CONFIG['web-api'], '/api/items', {});
      result = { success: true, message: 'Normal traffic sent to payments-api and web-api' };
    } else if (action === 'reset-all') {
      // Restore all services to healthy
      await forwardPost(SERVICES_CONFIG['payments-api'], '/reset', {});
      await forwardPost(SERVICES_CONFIG['web-api'], '/reset', {});
      await forwardPost(SERVICES_CONFIG['worker'], '/reset', {});
      addLog({ service: 'dashboard', level: 'INFO', message: 'All services restored to normal healthy operation' });
      result = { success: true, message: 'All services reset successfully' };
    }

    return sendJson(res, 200, result);
  }

  // Serve static UI files
  let filePath = pathname === '/' ? '/index.html' : pathname;
  const safePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
  const publicDir = path.join(__dirname, 'public');
  const fullPath = path.join(publicDir, safePath);

  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    return fs.createReadStream(fullPath).pipe(res);
  }

  sendJson(res, 404, { error: 'Not Found' });
});

server.listen(PORT, () => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    service: 'dashboard',
    level: 'INFO',
    message: `LogFlow Central Dashboard running on port ${PORT}`
  }));
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});

module.exports = server;
