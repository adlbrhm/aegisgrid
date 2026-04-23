// script.js — Dashboard frontend logic
const CHART_DEFAULTS = {
  color: '#94a3b8',
  borderColor: 'rgba(39,39,47,0.8)',
  gridColor: 'rgba(39,39,47,0.4)',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 11
};

Chart.defaults.color = CHART_DEFAULTS.color;
Chart.defaults.font.family = CHART_DEFAULTS.fontFamily;
Chart.defaults.font.size = CHART_DEFAULTS.fontSize;

const escapeHTML = (str) => {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag] || tag));
};

const timelineCtx = document.getElementById('timelineChart').getContext('2d');
const timelineChart = new Chart(timelineCtx, {
  type: 'line',
  data: { labels: [], datasets: [{
    label: 'Attacks',
    data: [],
    borderColor: '#e11d48',
    backgroundColor: 'rgba(225,29,72,0.1)',
    borderWidth: 1.5,
    pointRadius: 3,
    pointBackgroundColor: '#e11d48',
    tension: 0.3,
    fill: true
  }]},
  options: {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: CHART_DEFAULTS.gridColor }, ticks: { maxTicksLimit: 8 } },
      y: { grid: { color: CHART_DEFAULTS.gridColor }, beginAtZero: true }
    }
  }
});

const typeCtx = document.getElementById('typeChart').getContext('2d');
const typeChart = new Chart(typeCtx, {
  type: 'doughnut',
  data: {
    labels: [],
    datasets: [{ data: [], backgroundColor: [
      '#e11d48','#f43f5e','#f59e0b','#10b981','#8b5cf6','#3b82f6'
    ], borderWidth: 0, hoverOffset: 4 }]
  },
  options: {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { padding: 10, boxWidth: 10, font: { size: 10 } }
      }
    }
  }
});

const countryCtx = document.getElementById('countryChart').getContext('2d');
const countryChart = new Chart(countryCtx, {
  type: 'bar',
  data: { labels: [], datasets: [{
    data: [],
    backgroundColor: 'rgba(245,158,11,0.2)',
    borderColor: '#f59e0b',
    borderWidth: 1
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
});

function getThreatLevel(stats) {
  const total = stats.total || 0;
  if (total > 500) return ['CRITICAL', '#f43f5e'];
  if (total > 100) return ['HIGH', '#f59e0b'];
  if (total > 20)  return ['MEDIUM', '#e11d48'];
  if (total > 0)   return ['ACTIVE', '#10b981'];
  return ['MONITORING', '#94a3b8'];
}

function buildTopList(containerId, items, maxVal) {
  const el = document.getElementById(containerId);
  if (!items || items.length === 0) {
    el.innerHTML = '<li><span style="color:var(--muted);font-family:var(--font-mono);font-size:12px;">No data</span></li>';
    return;
  }
  el.innerHTML = items.map((item, i) => `
    <li>
      <span class="top-rank">${i + 1}</span>
      <span style="flex:1;font-family:var(--font-mono);font-size:11px;color:var(--text)">${escapeHTML(item[0])}</span>
      <div class="top-bar-wrap">
        <div class="top-bar" style="width:${Math.round((item[1]/maxVal)*100)}%"></div>
      </div>
      <span class="top-count">${item[1]}</span>
    </li>
  `).join('');
}

function threatBadge(level) {
  const l = (level || 'unknown').toLowerCase();
  return `<span class="badge badge-${l}">${l}</span>`;
}

let currentDataHash = '';

async function fetchData() {
  try {
    const statsRes = await fetch('/api/stats');
    const stats = await statsRes.json();

    document.getElementById('stat-total').textContent = stats.total || 0;
    document.getElementById('stat-ips').textContent = stats.unique_ips || 0;

    const [lvl, col] = getThreatLevel(stats);
    const threatEl = document.getElementById('stat-threat');
    threatEl.textContent = lvl;
    threatEl.style.color = col;
    document.getElementById('stat-threat-sub').textContent =
      stats.total + ' total events';

    if (stats.timeline && stats.timeline.length > 0) {
      timelineChart.data.labels = stats.timeline.map(t => t[0]);
      timelineChart.data.datasets[0].data = stats.timeline.map(t => t[1]);
      timelineChart.update('none');
    }

    if (stats.attack_types && stats.attack_types.length > 0) {
      typeChart.data.labels = stats.attack_types.map(t => t[0]);
      typeChart.data.datasets[0].data = stats.attack_types.map(t => t[1]);
      typeChart.update('none');
    }

    const maxIp = stats.top_ips && stats.top_ips.length > 0 ? stats.top_ips[0][1] : 1;
    buildTopList('ip-list', stats.top_ips, maxIp);

    const maxPort = stats.top_ports && stats.top_ports.length > 0 ? stats.top_ports[0][1] : 1;
    buildTopList('port-list', stats.top_ports, maxPort);

    if (stats.top_countries && stats.top_countries.length > 0) {
      countryChart.data.labels = stats.top_countries.map(c => c[0]);
      countryChart.data.datasets[0].data = stats.top_countries.map(c => c[1]);
      countryChart.update('none');
    }

    const search = document.getElementById('search-input').value;
    const type   = document.getElementById('type-filter').value;
    const url    = `/api/attacks?limit=100&search=${encodeURIComponent(search)}&type=${encodeURIComponent(type)}`;
    const atkRes = await fetch(url);
    const attacks = await atkRes.json();

    const hash = `${search}|${type}|${attacks.length ? attacks[0].id : 0}|${stats.total}`;
    if (hash === currentDataHash) {
      document.getElementById('last-updated').textContent = 'LAST SYNC: ' + new Date().toLocaleTimeString();
      return;
    }
    currentDataHash = hash;

    document.getElementById('log-count').textContent = attacks.length + ' entries';

    if (attacks.length === 0) {
      document.getElementById('log-tbody').innerHTML =
        '<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:30px;font-family:var(--font-mono);font-size:12px;">No data available</td></tr>';
    } else {
      const tbody = document.getElementById('log-tbody');
      tbody.innerHTML = ''; 
      
      attacks.forEach(a => {
        const tr = document.createElement('tr');
        
        const tdId = document.createElement('td');
        tdId.style.color = 'var(--muted)';
        tdId.textContent = a.id;
        tr.appendChild(tdId);
        
        const tdTime = document.createElement('td');
        tdTime.style.color = 'var(--muted)';
        tdTime.textContent = a.timestamp;
        tr.appendChild(tdTime);
        
        const tdIp = document.createElement('td');
        tdIp.style.color = 'var(--accent)';
        tdIp.textContent = a.ip;
        tr.appendChild(tdIp);
        
        const tdPort = document.createElement('td');
        tdPort.style.color = 'var(--accent3)';
        tdPort.textContent = a.port;
        tr.appendChild(tdPort);
        
        const tdType = document.createElement('td');
        tdType.className = 'atype';
        tdType.textContent = a.attack_type;
        tr.appendChild(tdType);
        
        const tdThreat = document.createElement('td');
        tdThreat.innerHTML = threatBadge(a.threat_level); 
        tr.appendChild(tdThreat);
        
        const tdCountry = document.createElement('td');
        tdCountry.textContent = a.country || '—';
        tr.appendChild(tdCountry);
        
        const tdIsp = document.createElement('td');
        tdIsp.style.color = 'var(--muted)';
        tdIsp.style.fontSize = '10px';
        tdIsp.textContent = (a.isp || '').slice(0, 30);
        tr.appendChild(tdIsp);
        
        const tdPayload = document.createElement('td');
        tdPayload.style.color = 'var(--muted)';
        tdPayload.style.fontSize = '10px';
        tdPayload.style.maxWidth = '200px';
        tdPayload.style.overflow = 'hidden';
        tdPayload.style.textOverflow = 'ellipsis';
        tdPayload.style.whiteSpace = 'nowrap';
        tdPayload.textContent = (a.payload || '').slice(0, 60) || '—';
        tr.appendChild(tdPayload);
        
        tbody.appendChild(tr);
      });
    }

    if (attacks.length > 0) {
      const recent = attacks.slice(0, 8);
      document.getElementById('ticker').textContent = recent.map(a =>
        `[${a.timestamp.slice(11,19)}] ${a.ip}:${a.port} | ${a.attack_type.toUpperCase()} | ${a.country}`
      ).join('   ◆   ');
    }

    document.getElementById('last-updated').textContent =
      'LAST SYNC: ' + new Date().toLocaleTimeString();

    document.getElementById('stat-total-sub').textContent =
      'System status active';

  } catch(err) {
    console.error('Fetch error:', err);
    document.getElementById('last-updated').textContent = 'SYNC ERROR';
  }
}

function applyFilter() { fetchData(); }
function exportLogs() { window.location.href = '/api/export'; }

fetchData();
setInterval(fetchData, 5000);

