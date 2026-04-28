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

// Natural Earth projection initialised once; reused on every update
let _mapProjection = null;
let _mapInited     = false;
let _prevPointKeys = new Set();

// Server reference point (London) for arc target — adjust to your EC2 region if desired
const SERVER_COORD = [0, 51.5];

function initMap() {
  const canvas  = document.getElementById('map-canvas');
  const svg     = document.getElementById('map-svg');
  const tooltip = document.getElementById('map-tooltip');
  if (!canvas || !svg || typeof d3 === 'undefined') return false;

  const W = canvas.offsetWidth  || 800;
  const H = canvas.offsetHeight || 320;
  canvas.width  = W;
  canvas.height = H;

  const projection = d3.geoNaturalEarth1()
    .scale(W / 6.0)
    .translate([W / 2, H / 2]);
  _mapProjection = projection;

  const ctx  = canvas.getContext('2d');
  const path = d3.geoPath(projection, ctx);

  // Atmospheric glow (edge gradient)
  const grd = ctx.createRadialGradient(W/2, H/2, H*0.1, W/2, H/2, H*0.75);
  grd.addColorStop(0, 'rgba(14,17,30,0)');
  grd.addColorStop(1, 'rgba(7,9,13,0.85)');

  // Fetch world topojson from CDN (lightweight 110m)
  fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
    .then(r => r.json())
    .then(world => {
      const land = topojson.feature(world, world.objects.land);

      ctx.clearRect(0, 0, W, H);

      // Ocean
      ctx.fillStyle = '#07090d';
      ctx.fillRect(0, 0, W, H);

      // Graticule grid
      const graticule = d3.geoGraticule()();
      ctx.beginPath();
      path(graticule);
      ctx.strokeStyle = 'rgba(39,39,47,0.35)';
      ctx.lineWidth = 0.4;
      ctx.stroke();

      // Land fill — gradient from deep to slightly lighter
      const landGrd = ctx.createLinearGradient(0, 0, 0, H);
      landGrd.addColorStop(0, '#1a1d28');
      landGrd.addColorStop(1, '#111420');
      ctx.beginPath();
      path(land);
      ctx.fillStyle = landGrd;
      ctx.fill();

      // Land border
      ctx.beginPath();
      path(land);
      ctx.strokeStyle = 'rgba(63,63,74,0.6)';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Vignette
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);

      _mapInited = true;
    })
    .catch(() => {
      // topojson unavailable — draw minimal fallback background
      ctx.fillStyle = '#07090d';
      ctx.fillRect(0, 0, W, H);
      _mapInited = true;
    });

  // Add arc gradient def to SVG
  const defs = svg.querySelector('defs');
  const arcGrad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
  arcGrad.setAttribute('id', 'arc-gradient');
  arcGrad.setAttribute('gradientUnits', 'userSpaceOnUse');
  arcGrad.innerHTML = `
    <stop offset="0%"   stop-color="#e11d48" stop-opacity="0.7"/>
    <stop offset="100%" stop-color="#e11d48" stop-opacity="0"/>`;
  defs.appendChild(arcGrad);

  // Sync SVG viewBox to canvas pixel size
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

  // Move tooltip on mousemove over the SVG dots layer
  svg.parentElement.addEventListener('mousemove', e => {
    const rect = svg.getBoundingClientRect();
    tooltip.style.left = (e.clientX - rect.left + 14) + 'px';
    tooltip.style.top  = (e.clientY - rect.top  - 10) + 'px';
  });

  return true;
}

function drawArc(x1, y1, x2, y2) {
  const arcLayer = document.getElementById('arc-layer');
  if (!arcLayer) return;
  // Cubic bezier control point arcs upward between source and target
  const mx = (x1 + x2) / 2;
  const my = Math.min(y1, y2) - Math.abs(x2 - x1) * 0.25;
  const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  pathEl.setAttribute('d', `M${x1},${y1} Q${mx},${my} ${x2},${y2}`);
  pathEl.className = 'map-arc';
  arcLayer.appendChild(pathEl);
  // Auto-remove after animation completes
  setTimeout(() => pathEl.remove(), 2000);
}

function updateMap(points) {
  if (!_mapInited) { if (!initMap()) return; }

  const dotsEl  = document.getElementById('attack-dots');
  const tooltip = document.getElementById('map-tooltip');
  if (!dotsEl || !_mapProjection) return;

  // Cap at 200 for performance
  const visible = points.filter(p => !(p.lat === 0 && p.lon === 0)).slice(0, 200);

  // Determine which points are new since last render
  const newKeys = new Set(visible.map(p => `${p.lat},${p.lon}`));
  const added   = visible.filter(p => !_prevPointKeys.has(`${p.lat},${p.lon}`));
  _prevPointKeys = newKeys;

  // Server screen coord for arc targets
  const [sx, sy] = _mapProjection(SERVER_COORD) || [0, 0];

  // Fade-in new arcs
  added.forEach(p => {
    const proj = _mapProjection([p.lon, p.lat]);
    if (!proj) return;
    drawArc(proj[0], proj[1], sx, sy);
  });

  // Rebuild dot layer
  dotsEl.innerHTML = '';
  visible.forEach(p => {
    const proj = _mapProjection([p.lon, p.lat]);
    if (!proj) return;
    const [cx, cy] = proj;

    // Pulse ring
    const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    ring.setAttribute('cx', cx.toFixed(1));
    ring.setAttribute('cy', cy.toFixed(1));
    ring.setAttribute('r', '4');
    ring.setAttribute('class', 'map-ring');
    ring.style.animationDelay = `${Math.random() * 2}s`;

    // Core dot
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', cx.toFixed(1));
    dot.setAttribute('cy', cy.toFixed(1));
    dot.setAttribute('r', '3.5');
    dot.setAttribute('class', 'map-dot');

    dotsEl.appendChild(ring);
    dotsEl.appendChild(dot);

    // Fade-in
    requestAnimationFrame(() => dot.classList.add('visible'));

    // Hover tooltip
    dot.addEventListener('mouseenter', () => {
      tooltip.innerHTML = `
        <div class="tt-ip">${escapeHTML(p.ip)}</div>
        <div><span class="tt-label">Country  </span>${escapeHTML(p.country)}</div>
        <div><span class="tt-label">Type     </span>${escapeHTML(p.attack_type)}</div>`;
      tooltip.classList.add('visible');
    });
    dot.addEventListener('mouseleave', () => tooltip.classList.remove('visible'));
  });

  setText('map-count-text', visible.length + ' geolocated');
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
