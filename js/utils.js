// js/utils.js — Utilidades puras, motor de comisiones y helpers de UI

// ── Fechas ──
export function todayStr()     { return new Date().toISOString().slice(0, 10); }
export function nowTimeStr()   { const n = new Date(); return n.getHours().toString().padStart(2, '0') + ':' + n.getMinutes().toString().padStart(2, '0'); }
export function formatDate(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  const mo = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${d} ${mo[parseInt(m) - 1]} ${y}`;
}
export function formatDateLong(str) {
  if (!str) return '';
  return new Date(str + 'T12:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
}
export function addDays(str, n) {
  const d = new Date(str + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// ── Moneda y formato ──
export function fmtMoney(n) {
  if (n == null) return '—';
  return '$' + Math.round(n).toLocaleString('es-CL');
}

// ── HTML ──
export function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
export function getInitials(a, b = '') {
  const n = (a || '').trim(), m = (b || '').trim();
  if (n && m) return (n[0] + m[0]).toUpperCase();
  return n ? n.slice(0, 2).toUpperCase() : '??';
}
export function avatarColor(s) {
  const c = ['#3B82F6','#8B5CF6','#EC4899','#F97316','#22C55E','#06B6D4','#EF4444','#F59E0B'];
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return c[h % c.length];
}
export function statusBadgeClass(e) {
  const m = {
    'Pendiente': 'pendiente', 'Asistió': 'asistio', 'No asistió': 'noasistio',
    'Contrató': 'contrato', 'No interesado': 'nointeresado', 'Reagendada': 'reagendada',
    'Nuevo': 'nuevo', 'Contactado': 'contactado', 'Seguimiento': 'seguimiento',
    'Venta cerrada': 'cerrado', 'Perdido': 'perdido', 'Cita agendada': 'pendiente',
    'Confirmado': 'contactado', 'Intento de contacto': 'nointeresado', 'Propuesta enviada': 'contactado'
  };
  return 'badge badge-' + (m[e] || 'nuevo');
}
export function statusDotColor(e) {
  const m = { 'Pendiente': '#F59E0B', 'Asistió': '#22C55E', 'No asistió': '#EF4444', 'Contrató': '#3B82F6', 'No interesado': '#94A3B8', 'Reagendada': '#8B5CF6' };
  return m[e] || '#94A3B8';
}
export function avatarHtml(nombre, apellido, foto, size = 36) {
  const bg = avatarColor((nombre || '') + (apellido || '')), init = getInitials(nombre, apellido);
  if (foto) return `<div class="lead-avatar" style="width:${size}px;height:${size}px"><img src="${foto}" alt=""></div>`;
  return `<div class="lead-avatar" style="width:${size}px;height:${size}px;background:${bg}">${init}</div>`;
}

// ── Feedback ──
export function toast(msg, type = '') {
  const c = document.getElementById('toast-container'), t = document.createElement('div');
  t.className = 'toast' + (type ? ' ' + type : '');
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}
export function vibrate(ms = 40) { if (navigator.vibrate) navigator.vibrate(ms); }
export function showFileError(msg, emoji = '😅') {
  document.getElementById('fileErrorEmoji').textContent = emoji;
  document.getElementById('fileErrorMsg').textContent = msg;
  document.getElementById('fileErrorOverlay').classList.remove('hidden');
}

// ── Motor de comisiones (semanas Lun-Dom) ──
export function getWeekStart(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();           // 0=Dom, 1=Lun...
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  return mon.toISOString().slice(0, 10);
}
export function isContadoPlan(planId) {
  return planId === 'contado' || planId === 'convenio_contado';
}
export function groupByWeek(salesArr) {
  const g = {};
  salesArr.forEach(s => {
    const k = getWeekStart(s.fecha);
    if (!g[k]) g[k] = [];
    g[k].push(s);
  });
  return g;
}
export function calcIncentiveSemanal(weekSales) {
  const contados = weekSales.filter(s => isContadoPlan(s.plan)).length;
  const total    = weekSales.length;
  let bC = 0;
  if (contados >= 5) bC = 325000; else if (contados >= 3) bC = 145000; else if (contados >= 2) bC = 90000;
  let bG = 0;
  if (total >= 5) bG = 125000; else if (total >= 3) bG = 60000; else if (total >= 2) bG = 30000;
  return { bC, bG, bono: Math.max(bC, bG), contados, total };
}
export function calcBPI(totalMat) {
  if (totalMat >= 13) return totalMat * 23000;
  if (totalMat >= 10) return totalMat * 21000;
  if (totalMat >= 6)  return totalMat * 20000;
  return 0;
}
export function calcMedallasSemanales(weekSales) { return Math.floor(weekSales.length / 4); }
export function calcTotalMedallas(allSales) {
  const g = groupByWeek(allSales);
  return Object.values(g).reduce((acc, ws) => acc + calcMedallasSemanales(ws), 0);
}
export function calcNivel(totalMedallas) { return Math.floor(totalMedallas / 5); }
export function calcMonthComision(allSales, year, month, debutActivo = false, PLANES = []) {
  const prefix  = `${year}-${String(month).padStart(2, '0')}`;
  const thisMo  = allSales.filter(s => s.fecha.startsWith(prefix));
  const comisiones = thisMo.reduce((a, s) => {
    const p = PLANES.find(x => x.id === s.plan);
    return a + (p?.comision || 0);
  }, 0);
  const weekGroups = groupByWeek(thisMo);
  let incentivos = 0;
  const weekDetails = [];
  Object.entries(weekGroups).sort().forEach(([wk, ws]) => {
    const inc = calcIncentiveSemanal(ws);
    incentivos += inc.bono;
    weekDetails.push({ wk, sales: ws, contados: inc.contados, total: inc.total, bC: inc.bC, bG: inc.bG, bono: inc.bono });
  });
  const bpi          = calcBPI(thisMo.length);
  const conectividad = 40000;
  const debut        = debutActivo ? 20000 : 0;
  const total        = comisiones + incentivos + bpi + conectividad + debut;
  return { comisiones, incentivos, bpi, conectividad, debut, total, thisMo, weekDetails };
}

// ── Time Picker (UI helper, sin dependencia de módulo) ──
export function timeSlots() {
  const s = [];
  for (let h = 6; h <= 22; h++) {
    for (let m = 0; m < 60; m += 30) {
      if (h === 22 && m > 0) break;
      s.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return s;
}
export function renderTimePicker(id, val = '09:00') {
  return `<div class="time-picker-wrap" id="twrap_${id}">
    <input class="form-input tp-input" id="${id}" value="${val}" readonly placeholder="HH:MM">
    <div class="tp-dropdown hidden" id="tdd_${id}">
      ${timeSlots().map(s => `<button type="button" class="tp-btn${s === val ? ' selected' : ''}" data-t="${s}">${s}</button>`).join('')}
    </div>
  </div>`;
}
export function initTimePicker(id) {
  const inp = document.getElementById(id);
  const dd  = document.getElementById('tdd_' + id);
  if (!inp || !dd) return;
  inp.addEventListener('click', e => {
    e.stopPropagation();
    dd.classList.toggle('hidden');
    const sel = dd.querySelector('.tp-btn.selected');
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  });
  dd.addEventListener('click', e => {
    const btn = e.target.closest('.tp-btn');
    if (!btn) return;
    inp.value = btn.dataset.t;
    dd.querySelectorAll('.tp-btn').forEach(b => b.classList.toggle('selected', b === btn));
    dd.classList.add('hidden');
    inp.dispatchEvent(new Event('change'));
  });
  document.addEventListener('click', e => {
    const wrap = document.getElementById('twrap_' + id);
    if (wrap && !wrap.contains(e.target)) dd.classList.add('hidden');
  });
}
