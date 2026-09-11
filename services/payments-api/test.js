const http = require('http');
const assert = require('assert');

// Test that payments-api can start, handle /health, /status, /payments, and shut down
process.env.PORT = '3901';
const server = require('./src/index');

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : '';
    const req = http.request({
      hostname: '127.0.0.1',
      port: 3901,
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
    assert.strictEqual(status.body.service, 'payments-api');
    console.log('✓ Status endpoint passed');

    // 3. Process payment
    const payment = await makeRequest('/payments', 'POST', { amount: 120 });
    assert.strictEqual(payment.statusCode, 200);
    assert.strictEqual(payment.body.status, 'completed');
    console.log('✓ Payment processing passed');

    // 4. Payment error simulation
    const paymentError = await makeRequest('/payments', 'POST', { fail: true });
    assert.strictEqual(paymentError.statusCode, 500);
    console.log('✓ Payment error simulation passed');

    console.log('All payments-api tests passed!');
  } catch (err) {
    console.error('Test failed:', err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
}

setTimeout(runTests, 100);
