// script.js — Dashboard frontend logic
const CHART_DEFAULTS = {
  color: '#94a3b8',
  gridColor: 'rgba(39,39,47,0.4)',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 11
};

Chart.defaults.color = CHART_DEFAULTS.color;
Chart.defaults.font.family = CHART_DEFAULTS.fontFamily;
Chart.defaults.font.size = CHART_DEFAULTS.fontSize;

// Null-safe DOM helpers
const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

// Escape user-controlled strings before injecting via innerHTML
const escapeHTML = (str) => {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag] || tag));
};

// Authenticated fetch — re-uses browser-cached Basic Auth credentials
const authFetch = (url) => fetch(url, { credentials: 'include' });

// ── Charts ─────────────────────────────────────────────────

const timelineChart = new Chart(
  document.getElementById('timelineChart').getContext('2d'),
  {
    type: 'line',
    data: { labels: [], datasets: [{
      label: 'Attacks', data: [],
      borderColor: '#e11d48', backgroundColor: 'rgba(225,29,72,0.1)',
      borderWidth: 1.5, pointRadius: 3, pointBackgroundColor: '#e11d48',
      tension: 0.3, fill: true
    }]},
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: CHART_DEFAULTS.gridColor }, ticks: { maxTicksLimit: 8 } },
        y: { grid: { color: CHART_DEFAULTS.gridColor }, beginAtZero: true }
      }
    }
  }
);

const typeChart = new Chart(
  document.getElementById('typeChart').getContext('2d'),
  {
    type: 'doughnut',
    data: {
      labels: [],
      datasets: [{ data: [], backgroundColor: [
        '#e11d48','#f43f5e','#f59e0b','#10b981','#8b5cf6','#3b82f6'
      ], borderWidth: 0, hoverOffset: 4 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { padding: 10, boxWidth: 10, font: { size: 10 } } } }
    }
  }
);

const countryChart = new Chart(
  document.getElementById('countryChart').getContext('2d'),
  {
    type: 'bar',
    data: { labels: [], datasets: [{
      data: [], backgroundColor: 'rgba(245,158,11,0.2)', borderColor: '#f59e0b', borderWidth: 1
    }]},
    options: {
      responsive: true, maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: CHART_DEFAULTS.gridColor }, beginAtZero: true },
        y: { grid: { display: false } }
      }
    }
  }
);

// ── Helpers ─────────────────────────────────────────────────

function getThreatLevel(stats) {
  const total = stats.total || 0;
  if (total > 500) return ['CRITICAL',   '#f43f5e'];
  if (total > 100) return ['HIGH',       '#f59e0b'];
  if (total > 20)  return ['MEDIUM',     '#e11d48'];
  if (total > 0)   return ['ACTIVE',     '#10b981'];
  return             ['MONITORING', '#94a3b8'];
}

function buildTopList(containerId, items, maxVal) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!items || items.length === 0) {
    el.innerHTML = '<li><span style="color:var(--muted);font-size:11px;">No data</span></li>';
    return;
  }
  el.innerHTML = items.map((item, i) => `
    <li>
      <span class="top-rank">${i + 1}</span>
      <span style="flex:1;font-family:var(--mono);font-size:11px;color:var(--text)">${escapeHTML(String(item[0]))}</span>
      <div class="top-bar-wrap"><div class="top-bar" style="width:${Math.round((item[1]/maxVal)*100)}%"></div></div>
      <span class="top-count">${item[1]}</span>
    </li>
  `).join('');
}

function threatBadge(level) {
  const l = (level || 'unknown').toLowerCase();
  return `<span class="badge badge-${l}">${l}</span>`;
}

// ── Map ─────────────────────────────────────────────────────

function updateMap(points) {
  const dotsEl = document.getElementById('attack-dots');
  if (!dotsEl) return;
  dotsEl.innerHTML = '';
  let shown = 0;
  points.forEach(p => {
    // Skip only true null-island (0,0) — valid equator/meridian coords are allowed
    if (p.lat === 0 && p.lon === 0) return;
    // Equirectangular projection onto 800×400 SVG viewBox
    const x = ((p.lon + 180) / 360) * 800;
    const y = ((90  - p.lat) / 180) * 400;
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x.toFixed(1));
    circle.setAttribute('cy', y.toFixed(1));
    circle.setAttribute('r', '4');
    circle.setAttribute('fill', '#e11d48');
    circle.setAttribute('opacity', '0.8');
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = `${p.ip} — ${p.country}`;
    circle.appendChild(title);
    dotsEl.appendChild(circle);
    shown++;
  });
  setText('map-count', shown + ' geolocated');
}

// ── Terminal ─────────────────────────────────────────────────

let terminalReady = false; // true once static boot lines have been replaced

function terminalLog(attack) {
  const term = document.getElementById('terminal');
  if (!term) return;

  // Clear static placeholder lines on first real event
  if (!terminalReady) {
    term.innerHTML = '';
    terminalReady = true;
  }

  const line  = document.createElement('div');
  line.className = 't-line';

  const ts = document.createElement('span');
  ts.className = 't-time';
  ts.textContent = attack.timestamp ? attack.timestamp.slice(11, 19) : '--:--:--';

  const body = document.createElement('span');
  body.className = 't-type';

  // Highlight IP in accent color, rest muted
  const ipSpan = document.createElement('span');
  ipSpan.style.color = 'var(--accent)';
  ipSpan.style.fontWeight = '600';
  ipSpan.textContent = `${attack.ip}:${attack.port}`;

  const info = document.createTextNode(
    `  ${(attack.attack_type || 'unknown').toUpperCase()}  ${attack.country || '—'}`
  );

  body.appendChild(ipSpan);
  body.appendChild(info);
  line.appendChild(ts);
  line.appendChild(document.createTextNode(' '));
  line.appendChild(body);
  term.appendChild(line);

  // Cap at 40 lines, auto-scroll
  while (term.children.length > 40) term.removeChild(term.firstChild);
  term.scrollTop = term.scrollHeight;
}

// ── Fetch loop ───────────────────────────────────────────────

let currentDataHash = '';
let lastAttackId    = 0;

async function fetchData() {
  try {
    const [statsRes, geoRes] = await Promise.all([
      authFetch('/api/stats'),
      authFetch('/api/geopoints'),
    ]);

    // If credentials expired or weren't accepted, tell the user — don't log a JS error
    if (!statsRes.ok || !geoRes.ok) {
      setText('last-updated', 'SESSION EXPIRED — reload page');
      return;
    }

    const stats     = await statsRes.json();
    const geoPoints = await geoRes.json();

    // Stat cards
    setText('stat-total', stats.total || 0);
    setText('stat-ips',   stats.unique_ips || 0);

    const [lvl, col] = getThreatLevel(stats);
    const threatEl = document.getElementById('stat-threat');
    if (threatEl) { threatEl.textContent = lvl; threatEl.style.color = col; }
    setText('stat-threat-sub', (stats.total || 0) + ' total events');

    // Timeline chart
    if (stats.timeline && stats.timeline.length > 0) {
      timelineChart.data.labels              = stats.timeline.map(t => t[0]);
      timelineChart.data.datasets[0].data   = stats.timeline.map(t => t[1]);
      timelineChart.update('none');
    }

    // Type doughnut
    if (stats.attack_types && stats.attack_types.length > 0) {
      typeChart.data.labels            = stats.attack_types.map(t => t[0]);
      typeChart.data.datasets[0].data  = stats.attack_types.map(t => t[1]);
      typeChart.update('none');
    }

    // Top lists
    const maxIp   = stats.top_ips   && stats.top_ips.length   > 0 ? stats.top_ips[0][1]   : 1;
    const maxPort = stats.top_ports && stats.top_ports.length > 0 ? stats.top_ports[0][1] : 1;
    buildTopList('ip-list',   stats.top_ips,   maxIp);
    buildTopList('port-list', stats.top_ports, maxPort);

    // Country chart
    if (stats.top_countries && stats.top_countries.length > 0) {
      countryChart.data.labels           = stats.top_countries.map(c => c[0]);
      countryChart.data.datasets[0].data = stats.top_countries.map(c => c[1]);
      countryChart.update('none');
    }

    // Geo map
    updateMap(geoPoints);

    // Attack log
    const search  = document.getElementById('search-input')?.value || '';
    const type    = document.getElementById('type-filter')?.value  || '';
    const atkRes  = await authFetch(
      `/api/attacks?limit=100&search=${encodeURIComponent(search)}&type=${encodeURIComponent(type)}`
    );

    if (!atkRes.ok) {
      setText('last-updated', 'SESSION EXPIRED — reload page');
      return;
    }

    const attacks = await atkRes.json();
    const hash    = `${search}|${type}|${attacks.length ? attacks[0].id : 0}|${stats.total}`;

    // Always update the timestamp — only rebuild the table when data changed
    setText('last-updated', 'LAST SYNC: ' + new Date().toLocaleTimeString());
    if (hash === currentDataHash) return;
    currentDataHash = hash;

    setText('log-count', attacks.length + ' entries');

    // Update log table
    const tbody = document.getElementById('log-tbody');
    if (tbody) {
      if (attacks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:30px;font-family:var(--mono);font-size:12px;">Waiting for connections…</td></tr>';
      } else {
        tbody.innerHTML = '';
        attacks.forEach(a => {
          const tr = document.createElement('tr');
          const cells = [
            { val: a.id,                             style: 'color:var(--muted)' },
            { val: a.timestamp,                      style: 'color:var(--muted)' },
            { val: a.ip,                             style: 'color:var(--accent)' },
            { val: a.port,                           style: '' },
            { val: a.attack_type,  cls: 'atype' },
            { html: threatBadge(a.threat_level) },
            { val: a.country || '—' },
            { val: (a.isp     || '').slice(0, 30), style: 'color:var(--muted);font-size:10px' },
            { val: (a.payload || '—').slice(0, 60), style: 'color:var(--muted);font-size:10px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' },
          ];
          cells.forEach(c => {
            const td = document.createElement('td');
            if (c.html)  td.innerHTML   = c.html;
            else         td.textContent = c.val;
            if (c.style) td.setAttribute('style', c.style);
            if (c.cls)   td.className   = c.cls;
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
        });
      }
    }

    // Live terminal — only append events newer than what we've already shown
    if (attacks.length > 0) {
      const newest = attacks[0].id;
      if (newest > lastAttackId) {
        attacks.filter(a => a.id > lastAttackId).reverse().forEach(terminalLog);
        lastAttackId = newest;
        setText('term-count', attacks.length + ' events');
      }
    }

    // Ticker bar
    if (attacks.length > 0) {
      setText('ticker', attacks.slice(0, 8).map(a =>
        `[${a.timestamp.slice(11, 19)}] ${a.ip}:${a.port} | ${a.attack_type.toUpperCase()} | ${a.country}`
      ).join('   ◆   '));
    }

    setText('stat-total-sub', 'System status active');

  } catch (err) {
    // Only reaches here on a genuine network error, not an auth/HTTP error
    console.error('[AegisGrid] Fetch error:', err);
    setText('last-updated', 'SYNC ERROR');
  }
}

function applyFilter() { currentDataHash = ''; fetchData(); }
function exportLogs()  { window.location.href = '/api/export'; }

fetchData();
setInterval(fetchData, 5000);
