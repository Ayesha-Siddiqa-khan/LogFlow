const http = require('http');
const https = require('https');

const SERVICE_NAME = process.env.SERVICE_NAME || 'web-api';
const LOG_COLLECTOR_URL = process.env.LOG_COLLECTOR_URL;

function sendToCollector(logEntry) {
  if (!LOG_COLLECTOR_URL) return;
  try {
    const url = new URL('/api/logs', LOG_COLLECTOR_URL);
    const postData = JSON.stringify(logEntry);
    const client = url.protocol === 'https:' ? https : http;
    const req = client.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 1500
    });
    req.on('error', () => {});
    req.write(postData);
    req.end();
  } catch (err) {}
}

function log(level, message, metadata = {}) {
  const timestamp = new Date().toISOString();
  const entry = {
    timestamp,
    service: SERVICE_NAME,
    level: level.toUpperCase(),
    message,
    metadata
  };

  console.log(JSON.stringify(entry));
  sendToCollector(entry);
  return entry;
}

module.exports = {
  info: (msg, meta) => log('INFO', msg, meta),
  warn: (msg, meta) => log('WARN', msg, meta),
  error: (msg, meta) => log('ERROR', msg, meta),
  debug: (msg, meta) => log('DEBUG', msg, meta)
};
