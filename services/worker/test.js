const http = require('http');
const assert = require('assert');

process.env.PORT = '3903';
process.env.WORK_INTERVAL_MS = '60000'; // high interval so it doesn't spam during test
const { server, timerId } = require('./src/index');

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : '';
    const req = http.request({
      hostname: '127.0.0.1',
      port: 3903,
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
    console.log('✓ Worker health check passed');

    // 2. Status check
    const status = await makeRequest('/status');
    assert.strictEqual(status.statusCode, 200);
    assert.strictEqual(status.body.service, 'worker');
    assert.strictEqual(status.body.isDegraded, false);
    console.log('✓ Worker status check passed');

    // 3. Simulate degraded
    const degraded = await makeRequest('/simulate-degraded', 'POST');
    assert.strictEqual(degraded.statusCode, 200);
    assert.strictEqual(degraded.body.isDegraded, true);

    const degradedHealth = await makeRequest('/health');
    assert.strictEqual(degradedHealth.body.status, 'degraded');
    console.log('✓ Worker degraded simulation passed');

    // 4. Reset
    const reset = await makeRequest('/reset', 'POST');
    assert.strictEqual(reset.statusCode, 200);
    assert.strictEqual(reset.body.isDegraded, false);
    console.log('✓ Worker reset passed');

    console.log('All worker tests passed!');
  } catch (err) {
    console.error('Test failed:', err);
    process.exitCode = 1;
  } finally {
    clearInterval(timerId);
    server.close();
  }
}

setTimeout(runTests, 100);
