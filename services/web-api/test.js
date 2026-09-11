const http = require('http');
const assert = require('assert');

process.env.PORT = '3902';
const server = require('./src/index');

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : '';
    const req = http.request({
      hostname: '127.0.0.1',
      port: 3902,
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
        resolve({
          statusCode: res.statusCode,
          body: body ? JSON.parse(body) : {}
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
    assert.strictEqual(health.body.status, 'healthy');
    console.log('✓ Health check passed');

    // 2. Status check
    const status = await makeRequest('/status');
    assert.strictEqual(status.statusCode, 200);
    assert.strictEqual(status.body.service, 'web-api');
    console.log('✓ Status endpoint passed');

    // 3. Items list
    const items = await makeRequest('/api/items');
    assert.strictEqual(items.statusCode, 200);
    assert.ok(Array.isArray(items.body.items));
    console.log('✓ Items list passed');

    // 4. Simulate error
    const errRes = await makeRequest('/simulate-error', 'POST', { message: 'test error' });
    assert.strictEqual(errRes.statusCode, 500);
    console.log('✓ Error simulation passed');

    console.log('All web-api tests passed!');
  } catch (err) {
    console.error('Test failed:', err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
}

setTimeout(runTests, 100);
