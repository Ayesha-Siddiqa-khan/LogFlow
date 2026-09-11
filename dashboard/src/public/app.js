// LogFlow Frontend Controller
const state = {
  serviceFilter: 'all',
  levelFilter: 'all',
  searchQuery: '',
  liveStream: true,
  logs: [],
  services: []
};

// DOM Elements
const el = {
  metricTotal: document.getElementById('metric-total'),
  metricErrors: document.getElementById('metric-errors'),
  metricErrorRate: document.getElementById('metric-error-rate'),
  metricWarnings: document.getElementById('metric-warnings'),
  metricHealthy: document.getElementById('metric-services-healthy'),
  clusterBadge: document.getElementById('cluster-status-badge'),
  clusterStatusText: document.getElementById('cluster-status-text'),
  servicesGrid: document.getElementById('services-grid'),
  logStream: document.getElementById('log-stream'),
  filteredCountTag: document.getElementById('filtered-count-tag'),
  lastPingTime: document.getElementById('last-ping-time'),
  simFeedback: document.getElementById('sim-feedback'),
  searchInput: document.getElementById('log-search-input'),
  serviceFilter: document.getElementById('filter-service'),
  levelFilter: document.getElementById('filter-level'),
  autoScrollToggle: document.getElementById('auto-scroll-toggle'),
  btnClearLogs: document.getElementById('btn-clear-logs'),
  btnRefresh: document.getElementById('btn-refresh')
};

// Format Timestamp for display
function formatTime(isoString) {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString() + '.' + String(d.getMilliseconds()).padStart(3, '0');
  } catch {
    return isoString;
  }
}

// Show simulation feedback toast/bar
function showFeedback(message, isError = false) {
  el.simFeedback.textContent = message;
  el.simFeedback.className = isError ? 'sim-feedback sim-error' : 'sim-feedback';
  el.simFeedback.classList.remove('hidden');
  setTimeout(() => {
    el.simFeedback.classList.add('hidden');
  }, 4500);
}

// Fetch Services Health
async function updateServices() {
  try {
    const res = await fetch('/api/services');
    if (!res.ok) return;
    const data = await res.json();
    state.services = data.services || [];
    renderServices(state.services);
    el.lastPingTime.textContent = 'Updated: ' + new Date().toLocaleTimeString();
  } catch (err) {
    console.error('Failed to query service status:', err);
  }
}

// Render Services Health Cards
function renderServices(services) {
  let healthyCount = 0;
  let hasDegraded = false;
  let hasDown = false;

  el.servicesGrid.innerHTML = services.map(svc => {
    const isHealthy = svc.status === 'healthy';
    const isDegraded = svc.status === 'degraded';
    const isDown = !isHealthy && !isDegraded;

    if (isHealthy) healthyCount++;
    if (isDegraded) hasDegraded = true;
    if (isDown) hasDown = true;

    const statusClass = isHealthy ? 'healthy' : (isDegraded ? 'degraded' : 'down');
    const displayStatus = svc.status.toUpperCase();

    return `
      <div class="service-card">
        <div class="service-card-header">
          <span class="service-name">${svc.service}</span>
          <span class="status-tag ${statusClass}">
            <span class="pulse-dot"></span>
            ${displayStatus}
          </span>
        </div>
        <div class="service-meta-row">
          <span>Latency: <strong>${svc.latencyMs}ms</strong></span>
          <span>HTTP: <strong>${svc.statusCode || 'ERR'}</strong></span>
        </div>
        <div class="service-meta-row">
          <span style="font-size:0.75rem; color: var(--text-dim);">${svc.url}</span>
        </div>
      </div>
    `;
  }).join('');

  el.metricHealthy.textContent = `${healthyCount} / ${services.length}`;

  // Update Cluster Status Badge
  el.clusterBadge.className = 'pulse-badge';
  if (hasDown) {
    el.clusterBadge.classList.add('down');
    el.clusterStatusText.textContent = 'Degraded Cluster (Down Node)';
  } else if (hasDegraded) {
    el.clusterBadge.classList.add('degraded');
    el.clusterStatusText.textContent = 'Cluster Alert (Degraded Node)';
  } else {
    el.clusterStatusText.textContent = 'Cluster All Healthy';
  }
}

// Fetch Logs
async function updateLogs() {
  try {
    const params = new URLSearchParams();
    if (state.serviceFilter !== 'all') params.set('service', state.serviceFilter);
    if (state.levelFilter !== 'all') params.set('level', state.levelFilter);
    if (state.searchQuery.trim()) params.set('query', state.searchQuery.trim());
    params.set('limit', '150');

    const res = await fetch(`/api/logs?${params.toString()}`);
    if (!res.ok) return;
    const data = await res.json();

    // Update Metrics
    el.metricTotal.textContent = Number(data.totalLogs || 0).toLocaleString();
    const errors = data.stats?.errorCount || 0;
    const warns = data.stats?.warnCount || 0;
    el.metricErrors.textContent = errors.toLocaleString();
    el.metricWarnings.textContent = warns.toLocaleString();

    const rate = data.totalLogs > 0 ? ((errors / data.totalLogs) * 100).toFixed(1) : 0;
    el.metricErrorRate.textContent = `${rate}% error rate`;

    el.filteredCountTag.textContent = `${data.filteredCount || 0} matching`;

    renderLogs(data.logs || []);
  } catch (err) {
    console.error('Failed to fetch logs:', err);
  }
}

// Render Logs to Terminal Viewer
function renderLogs(logs) {
  if (logs.length === 0) {
    el.logStream.innerHTML = '<div class="empty-logs">No logs found matching active filters</div>';
    return;
  }

  el.logStream.innerHTML = logs.map(log => {
    const metaStr = (log.metadata && Object.keys(log.metadata).length > 0)
      ? ` <span style="color:var(--text-dim);">[meta: ${JSON.stringify(log.metadata)}]</span>`
      : '';

    return `
      <div class="log-row">
        <span class="log-time">${formatTime(log.timestamp)}</span>
        <span class="log-service">${log.service}</span>
        <span class="log-level ${log.level}">${log.level}</span>
        <span class="log-message">${escapeHtml(log.message)}${metaStr}</span>
      </div>
    `;
  }).join('');

  if (state.liveStream && el.autoScrollToggle.checked) {
    el.logStream.scrollTop = 0; // Recent logs at top
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Trigger Simulation Action
async function triggerSimulation(scenario, label) {
  try {
    showFeedback(`Triggering ${label}...`);
    const res = await fetch(`/api/simulate/${scenario}`, { method: 'POST' });
    const data = await res.json();
    showFeedback(`Success: ${label} executed. Logs and health updated.`);
    updateServices();
    updateLogs();
  } catch (err) {
    showFeedback(`Failed to execute simulation: ${err.message}`, true);
  }
}

// Event Listeners
document.getElementById('sim-traffic').addEventListener('click', () => {
  triggerSimulation('normal-traffic', 'Normal Traffic Generator');
});

document.getElementById('sim-scenario1').addEventListener('click', () => {
  triggerSimulation('service-failure', 'Scenario 1: Payments API Service Failure');
});

document.getElementById('sim-scenario2').addEventListener('click', () => {
  triggerSimulation('app-error', 'Scenario 2: Web API Application Error Storm');
});

document.getElementById('sim-scenario3').addEventListener('click', () => {
  triggerSimulation('degraded-worker', 'Scenario 3: Worker Degraded Processing');
});

document.getElementById('sim-reset').addEventListener('click', () => {
  triggerSimulation('reset-all', 'Cluster Reset (Restore All Services)');
});

el.serviceFilter.addEventListener('change', (e) => {
  state.serviceFilter = e.target.value;
  updateLogs();
});

el.levelFilter.addEventListener('change', (e) => {
  state.levelFilter = e.target.value;
  updateLogs();
});

el.searchInput.addEventListener('input', (e) => {
  state.searchQuery = e.target.value;
  updateLogs();
});

el.btnClearLogs.addEventListener('click', async () => {
  await fetch('/api/logs', { method: 'DELETE' });
  updateLogs();
});

el.btnRefresh.addEventListener('click', () => {
  updateServices();
  updateLogs();
});

// Initial load & Polling Loops
updateServices();
updateLogs();
setInterval(updateServices, 3000);
setInterval(updateLogs, 1800);
