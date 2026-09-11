const http = require('http');
const assert = require('assert');

process.env.PORT = '3900';
const server = require('./src/server');

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : '';
    const req = http.request({
      hostname: '127.0.0.1',
      port: 3900,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        let parsed = body;
        try {
          parsed = JSON.parse(body);
        } catch {}
        resolve({
          statusCode: res.statusCode,
          body: parsed
        });
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  try {
    // 1. Health check
    const health = await makeRequest('/health');
    assert.strictEqual(health.statusCode, 200);
    assert.strictEqual(health.body.service, 'dashboard');
    console.log('✓ Dashboard health check passed');

    // 2. Ingest log
    const ingest = await makeRequest('/api/logs', 'POST', {
      service: 'test-service',
      level: 'ERROR',
      message: 'test error event',
      metadata: { code: 500 }
    });
    assert.strictEqual(ingest.statusCode, 201);
    assert.strictEqual(ingest.body.success, true);
    console.log('✓ Log ingestion passed');

    // 3. Query logs with filter
    const query = await makeRequest('/api/logs?service=test-service&level=ERROR');
    assert.strictEqual(query.statusCode, 200);
    assert.ok(query.body.logs.length >= 1);
    assert.strictEqual(query.body.logs[0].service, 'test-service');
    assert.strictEqual(query.body.logs[0].level, 'ERROR');
    console.log('✓ Log query with service/level filter passed');

    // 4. Static UI file check
    const html = await makeRequest('/');
    assert.strictEqual(html.statusCode, 200);
    assert.ok(typeof html.body === 'string' && html.body.includes('LogFlow'));
    console.log('✓ Static UI serving passed');

    console.log('All dashboard tests passed!');
  } catch (err) {
    console.error('Test failed:', err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
}

setTimeout(runTests, 100);
