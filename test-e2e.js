const { spawn } = require('child_process');
const http = require('http');
const assert = require('assert');
const path = require('path');

function request(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : '';
    const parsed = new URL(url);
    const req = http.request(parsed, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 3000
    }, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        let parsedBody = body;
        try { parsedBody = JSON.parse(body); } catch {}
        resolve({ statusCode: res.statusCode, body: parsedBody });
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function runE2E() {
  console.log('\n======================================================');
  console.log('   LOGFLOW END-TO-END INTEGRATION TEST SUITE');
  console.log('======================================================\n');

  const procs = [];

  try {
    console.log('[1/7] Spawning all 4 services...');
    // Dashboard
    procs.push(spawn('node', ['src/server.js'], {
      cwd: path.join(__dirname, 'dashboard'),
      env: { ...process.env, PORT: '3000' },
      stdio: 'ignore'
    }));

    // Payments API
    procs.push(spawn('node', ['src/index.js'], {
      cwd: path.join(__dirname, 'services', 'payments-api'),
      env: { ...process.env, PORT: '3001', LOG_COLLECTOR_URL: 'http://127.0.0.1:3000' },
      stdio: 'ignore'
    }));

    // Web API
    procs.push(spawn('node', ['src/index.js'], {
      cwd: path.join(__dirname, 'services', 'web-api'),
      env: { ...process.env, PORT: '3002', LOG_COLLECTOR_URL: 'http://127.0.0.1:3000' },
      stdio: 'ignore'
    }));

    // Worker
    procs.push(spawn('node', ['src/index.js'], {
      cwd: path.join(__dirname, 'services', 'worker'),
      env: { ...process.env, PORT: '3003', WORK_INTERVAL_MS: '1000', LOG_COLLECTOR_URL: 'http://127.0.0.1:3000' },
      stdio: 'ignore'
    }));

    await sleep(1500);

    console.log('[2/7] Verifying health endpoints across all services...');
    const hDash = await request('http://127.0.0.1:3000/health');
    const hPay = await request('http://127.0.0.1:3001/health');
    const hWeb = await request('http://127.0.0.1:3002/health');
    const hWork = await request('http://127.0.0.1:3003/health');

    assert.strictEqual(hDash.statusCode, 200, 'Dashboard should be healthy');
    assert.strictEqual(hPay.statusCode, 200, 'Payments API should be healthy');
    assert.strictEqual(hWeb.statusCode, 200, 'Web API should be healthy');
    assert.strictEqual(hWork.statusCode, 200, 'Worker should be healthy');
    console.log('✓ All 4 service health endpoints verified healthy!');

    console.log('[3/7] Generating normal application traffic & testing centralized log ingestion...');
    await request('http://127.0.0.1:3001/payments', 'POST', { amount: 150 });
    await request('http://127.0.0.1:3002/api/items', 'GET');
    await sleep(1200);

    const logsRes = await request('http://127.0.0.1:3000/api/logs?limit=50');
    assert.strictEqual(logsRes.statusCode, 200);
    assert.ok(logsRes.body.totalLogs >= 3, 'Logs should be collected from multiple services');

    const logServices = new Set(logsRes.body.logs.map(l => l.service));
    console.log(`✓ Central log collector received logs from services: ${Array.from(logServices).join(', ')}`);
    assert.ok(logServices.has('payments-api'), 'Should include payments-api logs');
    assert.ok(logServices.has('web-api'), 'Should include web-api logs');

    console.log('[4/7] Testing Failure Scenario 1: Service Failure (payments-api crash)...');
    await request('http://127.0.0.1:3000/api/simulate/service-failure', 'POST');
    await sleep(500);
    const payStatus = await request('http://127.0.0.1:3001/health');
    assert.strictEqual(payStatus.statusCode, 503, 'Payments API should return 503');
    const clusterHealth1 = await request('http://127.0.0.1:3000/api/services');
    const payNode = clusterHealth1.body.services.find(s => s.service === 'payments-api');
    assert.strictEqual(payNode.status, 'unhealthy', 'Dashboard should detect unhealthy payments-api');
    console.log('✓ Scenario 1 verified: Payments API failure detected by dashboard and health probe!');

    console.log('[5/7] Testing Failure Scenario 2: Application Error Storm (web-api)...');
    await request('http://127.0.0.1:3000/api/simulate/app-error', 'POST');
    await sleep(500);
    const errorLogs = await request('http://127.0.0.1:3000/api/logs?level=ERROR');
    assert.ok(errorLogs.body.logs.length >= 1, 'Should have logged ERROR entries');
    console.log(`✓ Scenario 2 verified: Error storm logged ${errorLogs.body.logs.length} ERROR entries in central store!`);

    console.log('[6/7] Testing Failure Scenario 3: Degraded Worker (queue lag)...');
    await request('http://127.0.0.1:3000/api/simulate/degraded-worker', 'POST');
    await sleep(1200);
    const clusterHealth3 = await request('http://127.0.0.1:3000/api/services');
    const workerNode = clusterHealth3.body.services.find(s => s.service === 'worker');
    assert.strictEqual(workerNode.status, 'degraded', 'Worker should be flagged as degraded');
    const warnLogs = await request('http://127.0.0.1:3000/api/logs?service=worker&level=WARN');
    assert.ok(warnLogs.body.logs.length >= 1, 'Worker should emit WARN slow queue logs');
    console.log('✓ Scenario 3 verified: Worker degraded state and WARN logs confirmed!');

    console.log('[7/7] Testing Cluster Reset & Recovery...');
    await request('http://127.0.0.1:3000/api/simulate/reset-all', 'POST');
    await sleep(500);
    const clusterHealthReset = await request('http://127.0.0.1:3000/api/services');
    for (const svc of clusterHealthReset.body.services) {
      assert.strictEqual(svc.status, 'healthy', `${svc.service} should be restored to healthy`);
    }
    console.log('✓ Cluster recovery verified: All services successfully restored to HEALTHY!');

    console.log('\n======================================================');
    console.log('   ALL LOGFLOW INTEGRATION TESTS PASSED (100% OK)');
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n❌ E2E Test Failed:', err);
    process.exitCode = 1;
  } finally {
    console.log('Cleaning up processes...');
    procs.forEach(p => {
      try { p.kill(); } catch {}
    });
  }
}

runE2E();
