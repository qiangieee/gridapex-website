// Japan Data Center Map — Interactive Logic
// Requires: Leaflet.js, Chart.js, japandc_data.js

// ===== JAPAN BOUNDS =====
// Strict bounds covering all Japanese territory
const JAPAN_BOUNDS = L.latLngBounds(
  L.latLng(24.0, 122.5),   // SW corner (Okinawa south)
  L.latLng(45.7, 148.8)    // NE corner (Hokkaido north-east)
);

// ===== MAP INITIALIZATION =====
const map = L.map('japan-map', {
  center: [36.5, 137.5],
  zoom: 6,
  minZoom: 5,
  maxZoom: 16,
  maxBounds: JAPAN_BOUNDS,
  maxBoundsViscosity: 1.0,   // hard lock — cannot pan outside
  zoomControl: true,
  preferCanvas: true
});

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
  bounds: JAPAN_BOUNDS
}).addTo(map);

// ===== CUSTOM ICONS =====
function createOperationalIcon(aidc) {
  const isAI = aidc && (aidc.toLowerCase().includes('yes') || aidc.toLowerCase().includes('likely') ||
               aidc.toLowerCase().includes('adjacent') || aidc.toLowerCase().includes('sovereign') ||
               aidc.toLowerCase().includes('upgraded'));
  const mainColor = isAI ? '#a78bfa' : '#00e5ff';
  const innerColor = isAI ? '#7c3aed' : '#00a8cc';
  const uid = Math.random().toString(36).slice(2,8);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
    <defs>
      <filter id="gf${uid}" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="2" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <path d="M14 1C6.268 1 0 7.268 0 15c0 8.837 14 24 14 24S28 23.837 28 15C28 7.268 21.732 1 14 1z"
      fill="${mainColor}" opacity="0.92" filter="url(#gf${uid})"/>
    <circle cx="14" cy="15" r="7" fill="rgba(0,0,0,0.55)"/>
    <circle cx="14" cy="15" r="4.5" fill="${innerColor}"/>
    ${isAI ? '<text x="14" y="18" text-anchor="middle" font-size="5.5" fill="white" font-weight="800" font-family="sans-serif">AI</text>' : ''}
  </svg>`;
  return L.divIcon({ html: svg, className: '', iconSize: [28, 40], iconAnchor: [14, 40], popupAnchor: [0, -42] });
}

function createConstructionIcon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
    <defs>
      <filter id="guc" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="2" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <polygon points="15,2 28,27 2,27" fill="#fbbf24" opacity="0.95" filter="url(#guc)"/>
    <line x1="15" y1="10" x2="15" y2="20" stroke="#1a1a2e" stroke-width="2.8" stroke-linecap="round"/>
    <circle cx="15" cy="24" r="1.7" fill="#1a1a2e"/>
  </svg>`;
  return L.divIcon({ html: svg, className: '', iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -32] });
}

// ===== POPUP BUILDER =====
function buildPopup(dc, type) {
  const isOp = type === 'operational';
  const badgeCls = isOp ? 'op' : 'uc';
  const badgeTxt = isOp ? '&#9679; Operational' : '&#9670; Under Construction';
  const isAI = dc.aidc && (dc.aidc.toLowerCase().includes('yes') || dc.aidc.toLowerCase().includes('likely') ||
               dc.aidc.toLowerCase().includes('adjacent') || dc.aidc.toLowerCase().includes('sovereign') ||
               dc.aidc.toLowerCase().includes('upgraded'));
  const aiTag = isAI ? '<div class="popup-ai-badge">&#9889; AI-Ready</div>' : '';
  const pueRow = (dc.pue && dc.pue !== 'Not disclosed')
    ? `<div class="popup-field"><div class="popup-field-label">PUE</div><div class="popup-field-value">${dc.pue}</div></div>` : '';
  const costRow = (dc.cost && dc.cost !== 'Not disclosed' && dc.cost !== 'Not Applicable')
    ? `<div class="popup-field"><div class="popup-field-label">${isOp ? 'Cost / Price' : 'Build Cost'}</div><div class="popup-field-value">${dc.cost.length > 60 ? dc.cost.substring(0,60)+'...' : dc.cost}</div></div>` : '';
  return `<div class="popup-inner">
    <div class="popup-badge ${badgeCls}">${badgeTxt}</div>
    <div class="popup-name">${dc.name}</div>
    <div class="popup-location">&#128205; ${dc.location}</div>
    <div class="popup-grid">
      <div class="popup-field"><div class="popup-field-label">Owner</div><div class="popup-field-value">${dc.owner.length > 45 ? dc.owner.substring(0,45)+'...' : dc.owner}</div></div>
      <div class="popup-field"><div class="popup-field-label">Power Capacity</div><div class="popup-field-value highlight">${dc.power}</div></div>
      <div class="popup-field"><div class="popup-field-label">Campus Size</div><div class="popup-field-value">${dc.campus.length > 50 ? dc.campus.substring(0,50)+'...' : dc.campus}</div></div>
      <div class="popup-field"><div class="popup-field-label">${isOp ? 'Built / Opened' : 'Expected / Status'}</div><div class="popup-field-value">${dc.built}</div></div>
      ${pueRow}${costRow}
    </div>
    ${aiTag}
    <div class="popup-notes">&#128240; ${dc.notes}</div>
  </div>`;
}

// ===== LAYER GROUPS =====
const opLayerGroup = L.layerGroup().addTo(map);
const ucLayerGroup = L.layerGroup().addTo(map);
let opVisible = true;
let ucVisible = true;

function addMarkers(data, group, type) {
  data.forEach(dc => {
    const icon = type === 'operational' ? createOperationalIcon(dc.aidc) : createConstructionIcon();
    const m = L.marker([dc.lat, dc.lng], { icon })
      .bindPopup(buildPopup(dc, type), { maxWidth: 350 });
    m.dcData = dc;
    m.dcType = type;
    group.addLayer(m);
  });
}

addMarkers(operationalDCs, opLayerGroup, 'operational');
addMarkers(underConstructionDCs, ucLayerGroup, 'construction');

// ===== TOGGLE LAYERS =====
function toggleLayer(type) {
  if (type === 'operational') {
    opVisible = !opVisible;
    const btn = document.getElementById('btn-show-op');
    opVisible ? map.addLayer(opLayerGroup) : map.removeLayer(opLayerGroup);
    btn.classList.toggle('active-op', opVisible);
  } else {
    ucVisible = !ucVisible;
    const btn = document.getElementById('btn-show-uc');
    ucVisible ? map.addLayer(ucLayerGroup) : map.removeLayer(ucLayerGroup);
    btn.classList.toggle('active-uc', ucVisible);
  }
}

// ===== SEARCH =====
let searchTimeout = null;
document.getElementById('map-search').addEventListener('input', function() {
  clearTimeout(searchTimeout);
  const q = this.value.toLowerCase().trim();
  searchTimeout = setTimeout(() => {
    let firstMatch = null;
    [opLayerGroup, ucLayerGroup].forEach(group => {
      group.eachLayer(marker => {
        const dc = marker.dcData;
        const match = !q || dc.name.toLowerCase().includes(q) || dc.owner.toLowerCase().includes(q) || dc.location.toLowerCase().includes(q);
        marker.setOpacity(match ? 1 : 0.12);
        if (match && q && !firstMatch) firstMatch = marker;
      });
    });
    if (firstMatch && q) {
      map.setView([firstMatch.dcData.lat, firstMatch.dcData.lng], 10, { animate: true });
      firstMatch.openPopup();
    }
    if (!q) map.closePopup();
  }, 250);
});

// ===== STATS =====
const opCount = operationalDCs.length;
const ucCount = underConstructionDCs.length;
const aiCount = [...operationalDCs, ...underConstructionDCs].filter(d =>
  d.aidc && (d.aidc.toLowerCase().includes('yes') || d.aidc.toLowerCase().includes('likely') ||
  d.aidc.toLowerCase().includes('adjacent') || d.aidc.toLowerCase().includes('sovereign') ||
  d.aidc.toLowerCase().includes('upgraded'))
).length;

document.getElementById('stat-total').textContent = opCount + ucCount;
document.getElementById('stat-op').textContent = opCount;
document.getElementById('stat-uc').textContent = ucCount;
document.getElementById('stat-ai').textContent = aiCount + '+';
document.getElementById('total-op-count').textContent = opCount;
document.getElementById('total-uc-count').textContent = ucCount;

// ===== TABLE RENDERING =====
function renderTable(data, tbodyId, isOp) {
  const tbody = document.getElementById(tbodyId);
  tbody.innerHTML = data.map(dc => {
    const isAI = dc.aidc && (dc.aidc.toLowerCase().includes('yes') || dc.aidc.toLowerCase().includes('likely') ||
                 dc.aidc.toLowerCase().includes('adjacent') || dc.aidc.toLowerCase().includes('sovereign') ||
                 dc.aidc.toLowerCase().includes('upgraded'));
    const aiCell = isAI ? '<span class="ai-yes">&#10022; AI-Ready</span>' : `<span class="ai-no">${dc.aidc || '&mdash;'}</span>`;
    const lastCol = isOp
      ? `<td>${dc.pue || '&mdash;'}</td>`
      : `<td style="font-size:.78rem;max-width:180px;">${dc.cost || '&mdash;'}</td>`;
    return `<tr>
      <td>${dc.name}</td>
      <td>${dc.location}</td>
      <td>${dc.owner}</td>
      <td>${dc.power}</td>
      <td style="font-size:.78rem;max-width:200px;">${dc.campus}</td>
      <td>${dc.built}</td>
      <td>${aiCell}</td>
      ${lastCol}
    </tr>`;
  }).join('');
}
renderTable(operationalDCs, 'tbody-op', true);
renderTable(underConstructionDCs, 'tbody-uc', false);

// ===== TABS =====
function switchTab(tab) {
  document.getElementById('tab-op').classList.toggle('active', tab === 'op');
  document.getElementById('tab-uc').classList.toggle('active', tab === 'uc');
  document.getElementById('panel-op').classList.toggle('active', tab === 'op');
  document.getElementById('panel-uc').classList.toggle('active', tab === 'uc');
}

// ===== NAVBAR =====
const burger = document.getElementById('burger');
const navLinks = document.getElementById('navLinks');
if (burger) {
  burger.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    burger.classList.toggle('open');
  });
}
window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 60);
});

// ===================================================
// ============= STACKED BAR CHART ===================
// ===================================================

// --- OWNER SIMPLIFICATION ---
function simplifyOwner(raw) {
  const o = raw.toLowerCase();
  if (o.includes('ntt data') || o.includes('ntt global'))  return 'NTT';
  if (o.includes('ntt west') || o.includes('ntt communications')) return 'NTT';
  if (o.includes('ntt'))        return 'NTT';
  if (o.includes('equinix'))    return 'Equinix';
  if (o.includes('kddi') || o.includes('telehouse')) return 'KDDI / Telehouse';
  if (o.includes('idc frontier') || (o.includes('softbank') && o.includes('idc'))) return 'IDC Frontier / SoftBank';
  if (o.includes('softbank'))   return 'SoftBank';
  if (o.includes('mc digital') || o.includes('digital realty')) return 'MC Digital Realty';
  if (o.includes('colt'))       return 'Colt DCS';
  if (o.includes('sakura'))     return 'Sakura Internet';
  if (o.includes('iij'))        return 'IIJ';
  if (o.includes('stack'))      return 'STACK Infrastructure';
  if (o.includes('princeton'))  return 'Princeton Digital';
  if (o.includes('stt') || o.includes('st telemedia')) return 'STT GDC';
  if (o.includes('vantage'))    return 'Vantage DC';
  if (o.includes('microsoft') || o.includes('azure')) return 'Microsoft Azure';
  if (o.includes('google') || o.includes('alphabet') || o.includes('asa llc')) return 'Google';
  if (o.includes('aws') || o.includes('amazon'))    return 'AWS';
  if (o.includes('oracle'))     return 'Oracle / NTT';
  if (o.includes('fujitsu'))    return 'Fujitsu';
  if (o.includes('nec'))        return 'NEC';
  if (o.includes('hitachi'))    return 'Hitachi';
  if (o.includes('tis'))        return 'TIS';
  if (o.includes('aist'))       return 'AIST (Govt.)';
  if (o.includes('highreso'))   return 'Highreso';
  if (o.includes('freyr'))      return 'Freyr Technology';
  if (o.includes('sc zeus'))    return 'SC Zeus';
  if (o.includes('apl') || o.includes('gci')) return 'APL + GCI';
  if (o.includes('gds') || o.includes('dayone') || o.includes('gaw')) return 'DayOne / GDS';
  return raw.split(/[/,+\(]/)[0].trim().substring(0, 28);
}

// --- LOCATION NORMALIZATION ---
function normalizeLoc(raw) {
  const r = raw.toLowerCase();
  if (r.includes('tokyo') || r.includes('koto') || r.includes('shinagawa') ||
      r.includes('chiyoda') || r.includes('minato') || r.includes('shinjuku') ||
      r.includes('bunkyo') || r.includes('ota-ku') || r.includes('kita-ku, tokyo') ||
      r.includes('suido') || r.includes('ariake') || r.includes('otemachi') ||
      r.includes('edagawa') || r.includes('heiwajima') || r.includes('konan') ||
      r.includes('tennozu') || r.includes('gotenyama') || r.includes('tabata') ||
      r.includes('shinsuna') || r.includes('nihombashi')) return 'Tokyo (23 wards)';
  if (r.includes('inzai')) return 'Inzai, Chiba';
  if (r.includes('chiba') || r.includes('shiroi') || r.includes('kashiwa')) return 'Chiba (Other)';
  if (r.includes('saitama') || r.includes('musashino') || r.includes('fuchu') ||
      r.includes('tama') || r.includes('hamura') || r.includes('mitaka')) return 'Tokyo (Greater)';
  if (r.includes('kanagawa') || r.includes('yokohama') || r.includes('sagamihara') ||
      r.includes('kawasaki')) return 'Kanagawa';
  if (r.includes('osaka') || r.includes('sakai') || r.includes('suita') ||
      r.includes('minoh') || r.includes('ibaraki') || r.includes('suminoe') ||
      r.includes('nishi-shinsaibashi') || r.includes('keihanshin') || r.includes('kita-ku, osaka') ||
      r.includes('saitoaokita') || r.includes('kix') || r.includes('doujima')) return 'Osaka';
  if (r.includes('hokkaido') || r.includes('tomakomai') || r.includes('ishikari') ||
      r.includes('sapporo')) return 'Hokkaido';
  if (r.includes('fukuoka') || r.includes('kitakyushu')) return 'Fukuoka';
  if (r.includes('nara') || r.includes('ikoma')) return 'Nara';
  if (r.includes('hyogo') || r.includes('kobe')) return 'Hyogo';
  if (r.includes('hiroshima') || r.includes('mihara')) return 'Hiroshima';
  if (r.includes('shimane') || r.includes('matsue')) return 'Shimane';
  if (r.includes('fukushima') || r.includes('shirakawa')) return 'Fukushima';
  if (r.includes('gunma') || r.includes('tatebayashi')) return 'Gunma';
  if (r.includes('ishikawa') || r.includes('shika')) return 'Ishikawa';
  if (r.includes('saga') || r.includes('genkai')) return 'Saga';
  if (r.includes('oita')) return 'Oita';
  return raw.split(',').slice(-1)[0].trim().replace(/\s*(pref|prefecture|city|ward|ku)\s*$/i,'').trim() || 'Other';
}

// --- MW PARSER ---
function parseMW(powerStr) {
  if (!powerStr || powerStr === 'Not disclosed') return 0;
  // Match patterns like "50 MW", "~70 MW", "150 MW", "96-100 MW", "6.0-10.8 MW"
  // Also "50,000 kW" → 50
  const kwMatch = powerStr.match(/([\d,]+)\s*kW/i);
  if (kwMatch) return parseFloat(kwMatch[1].replace(/,/g,'')) / 1000;
  const mwMatch = powerStr.match(/~?([\d.]+)(?:\s*[-–]\s*[\d.]+)?\s*MW/i);
  if (mwMatch) return parseFloat(mwMatch[1]);
  return 0;
}

// --- OWNER COLOR PALETTE ---
const OWNER_COLORS = {
  'NTT':                  { bg: 'rgba(0,212,255,0.85)',   border: '#00d4ff' },
  'Equinix':              { bg: 'rgba(255,107,53,0.85)',   border: '#ff6b35' },
  'KDDI / Telehouse':     { bg: 'rgba(167,139,250,0.85)', border: '#a78bfa' },
  'IDC Frontier / SoftBank': { bg: 'rgba(251,191,36,0.85)', border: '#fbbf24' },
  'SoftBank':             { bg: 'rgba(234,179,8,0.85)',   border: '#eab308' },
  'MC Digital Realty':    { bg: 'rgba(52,211,153,0.85)',  border: '#34d399' },
  'Colt DCS':             { bg: 'rgba(99,102,241,0.85)',  border: '#6366f1' },
  'Sakura Internet':      { bg: 'rgba(236,72,153,0.85)',  border: '#ec4899' },
  'IIJ':                  { bg: 'rgba(20,184,166,0.85)',  border: '#14b8a6' },
  'STACK Infrastructure': { bg: 'rgba(245,158,11,0.85)',  border: '#f59e0b' },
  'Princeton Digital':    { bg: 'rgba(139,92,246,0.85)',  border: '#8b5cf6' },
  'STT GDC':              { bg: 'rgba(16,185,129,0.85)',  border: '#10b981' },
  'Vantage DC':           { bg: 'rgba(59,130,246,0.85)',  border: '#3b82f6' },
  'Microsoft Azure':      { bg: 'rgba(0,120,212,0.85)',   border: '#0078d4' },
  'Google':               { bg: 'rgba(234,67,53,0.85)',   border: '#ea4335' },
  'AWS':                  { bg: 'rgba(255,153,0,0.85)',   border: '#ff9900' },
  'Oracle / NTT':         { bg: 'rgba(220,38,38,0.85)',   border: '#dc2626' },
  'Fujitsu':              { bg: 'rgba(30,64,175,0.85)',   border: '#1e40af' },
  'NEC':                  { bg: 'rgba(5,150,105,0.85)',   border: '#059669' },
  'Hitachi':              { bg: 'rgba(147,51,234,0.85)',  border: '#9333ea' },
  'TIS':                  { bg: 'rgba(107,114,128,0.85)', border: '#6b7280' },
  'AIST (Govt.)':         { bg: 'rgba(209,213,219,0.85)', border: '#d1d5db' },
  'Highreso':             { bg: 'rgba(251,146,60,0.85)',  border: '#fb923c' },
  'Freyr Technology':     { bg: 'rgba(244,63,94,0.85)',   border: '#f43f5e' },
  'SC Zeus':              { bg: 'rgba(74,222,128,0.85)',  border: '#4ade80' },
  'APL + GCI':            { bg: 'rgba(217,119,6,0.85)',   border: '#d97706' },
  'DayOne / GDS':         { bg: 'rgba(124,58,237,0.85)', border: '#7c3aed' },
};
function getOwnerColor(owner) {
  return OWNER_COLORS[owner] || { bg: 'rgba(148,163,184,0.7)', border: '#94a3b8' };
}

// --- BUILD CHART DATA ---
function buildChartData(filter) {
  // filter: 'both' | 'operational' | 'construction'
  const allDCs = [];
  if (filter !== 'construction') allDCs.push(...operationalDCs.map(d => ({...d, _type:'operational'})));
  if (filter !== 'operational')  allDCs.push(...underConstructionDCs.map(d => ({...d, _type:'construction'})));

  // Only include DCs with parseable MW
  const withMW = allDCs.filter(d => parseMW(d.power) > 0);

  // Aggregate: { location → { owner → total_MW } }
  const agg = {};
  withMW.forEach(dc => {
    const loc = normalizeLoc(dc.location);
    const owner = simplifyOwner(dc.owner);
    const mw = parseMW(dc.power);
    if (!agg[loc]) agg[loc] = {};
    agg[loc][owner] = (agg[loc][owner] || 0) + mw;
  });

  // Sort locations by total MW descending
  const locations = Object.keys(agg).sort((a, b) => {
    const totalA = Object.values(agg[a]).reduce((s,v) => s+v, 0);
    const totalB = Object.values(agg[b]).reduce((s,v) => s+v, 0);
    return totalB - totalA;
  });

  // Collect all owners (sorted by their aggregate total)
  const ownerTotals = {};
  locations.forEach(loc => Object.entries(agg[loc]).forEach(([o, v]) => {
    ownerTotals[o] = (ownerTotals[o] || 0) + v;
  }));
  const owners = Object.keys(ownerTotals).sort((a,b) => ownerTotals[b] - ownerTotals[a]);

  // Build datasets
  const datasets = owners.map(owner => {
    const c = getOwnerColor(owner);
    return {
      label: owner,
      data: locations.map(loc => agg[loc][owner] || 0),
      backgroundColor: c.bg,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: 3,
      stack: 'total'
    };
  });

  return { locations, datasets };
}

// --- RENDER CHART ---
let capacityChart = null;
let currentFilter = 'both';

function renderCapacityChart(filter) {
  currentFilter = filter;
  const { locations, datasets } = buildChartData(filter);

  const canvas = document.getElementById('capacity-chart');

  if (capacityChart) capacityChart.destroy();

  capacityChart = new Chart(canvas, {
    type: 'bar',
    data: { labels: locations, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600, easing: 'easeInOutQuart' },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#94a3b8',
            font: { family: "'Inter', sans-serif", size: 11 },
            padding: 14,
            boxWidth: 13,
            boxHeight: 13,
            usePointStyle: true,
            pointStyle: 'rect',
            // Chart.js 4: filter receives LegendItem; find dataset by datasetIndex
            filter: (item, chartData) => {
              const ds = chartData.datasets[item.datasetIndex];
              return ds && ds.data && ds.data.reduce((a, b) => a + b, 0) > 0;
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(10,15,35,0.96)',
          borderColor: 'rgba(0,212,255,0.3)',
          borderWidth: 1,
          titleColor: '#e2e8f0',
          bodyColor: '#94a3b8',
          titleFont: { family: "'Space Grotesk', sans-serif", size: 13, weight: '700' },
          bodyFont: { family: "'Inter', sans-serif", size: 12 },
          padding: 12,
          callbacks: {
            label: ctx => {
              const val = ctx.parsed.y;
              return val > 0 ? ` ${ctx.dataset.label}: ${val.toFixed(0)} MW` : null;
            },
            footer: (items) => {
              const total = items.reduce((s, i) => s + i.parsed.y, 0);
              return `  Total: ${total.toFixed(0)} MW`;
            }
          }
        }
      },
      scales: {
        x: {
          stacked: true,
          ticks: {
            color: '#94a3b8',
            font: { family: "'Inter', sans-serif", size: 11 },
            maxRotation: 35,
            minRotation: 20
          },
          grid: { color: 'rgba(255,255,255,0.04)' },
          border: { color: 'rgba(255,255,255,0.1)' }
        },
        y: {
          stacked: true,
          title: {
            display: true,
            text: 'Power Capacity (MW)',
            color: '#64748b',
            font: { family: "'Inter', sans-serif", size: 12 }
          },
          ticks: {
            color: '#64748b',
            font: { family: "'Inter', sans-serif", size: 11 },
            callback: val => val + ' MW'
          },
          grid: { color: 'rgba(255,255,255,0.06)' },
          border: { color: 'rgba(255,255,255,0.1)' }
        }
      }
    }
  });
}

// --- CHART TOGGLE ---
function filterChart(mode) {
  ['both','op','uc'].forEach(k => {
    const btn = document.getElementById('ctog-' + k);
    if (btn) btn.classList.remove('active');
  });
  document.getElementById('ctog-' + mode).classList.add('active');
  const filterMap = { both:'both', op:'operational', uc:'construction' };
  renderCapacityChart(filterMap[mode]);
}

// Defer initial render so DOM layout is complete and canvas has dimensions
requestAnimationFrame(() => renderCapacityChart('both'));

