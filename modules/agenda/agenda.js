// modules/agenda/agenda.js
import { appointments } from '../../js/db.js';
import { S } from '../../js/state.js';
import { todayStr, nowTimeStr, formatDate, escHtml, statusBadgeClass } from '../../js/utils.js';

// Iconos locales (hasta Etapa 4)
const _ico = {
  calendar: `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"/></svg>`,
  chart:    `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/></svg>`,
  phone:    `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/></svg>`,
  list:     `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"/></svg>`,
  whatsapp: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`,
  zoom:     `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553 1.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/></svg>`,
  edit:     `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>`,
  reschedule:`<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/></svg>`,
  money:    `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clip-rule="evenodd"/></svg>`,
  plus:     `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>`
};

export async function render() {
  const center = document.getElementById('center');
  const appts  = await appointments.getByDate(S.date);
  appts.sort((a, b) => a.hora.localeCompare(b.hora));
  const byHour = {};
  appts.forEach(a => { const h = a.hora.split(':')[0]; if (!byHour[h]) byHour[h] = []; byHour[h].push(a); });
  const now = new Date(), isToday = S.date === todayStr();
  const hours = []; for (let h = 6; h <= 22; h++) hours.push(h);

  center.innerHTML = `<div class="time-grid view-animate">
    ${hours.map(h => {
      const hStr = h.toString().padStart(2, '0'), cards = byHour[hStr] || [];
      const showNow = isToday && h === now.getHours();
      return `<div class="time-slot">
        <div class="time-label">${hStr}:00</div>
        <div class="time-line">
          ${showNow ? `<div class="time-now-line" style="top:${Math.round(now.getMinutes()/60*100)}%"></div>` : ''}
          <div class="time-cards">${cards.map(a => _buildCard(a)).join('')}</div>
        </div>
      </div>`;
    }).join('')}
  </div>
  ${appts.length === 0
    ? `<div class="empty-day" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)">${_ico.calendar}<h3>Sin citas este día</h3><p>Haz clic en "Nueva cita" para agregar una.</p></div>`
    : ''}`;
  center.style.position = 'relative';
  window._app?.attachCardEvents?.();
}

function _buildCard(a) {
  return `<div class="apt-card" data-estado="${escHtml(a.estado)}" data-id="${a.id}">
    <div class="apt-card-header">
      <span class="apt-card-time">${a.hora}</span>
      <span class="apt-card-name">${escHtml(a.nombre)}</span>
      <span class="apt-card-status"><span class="${statusBadgeClass(a.estado)}">${escHtml(a.estado)}</span></span>
    </div>
    <div class="apt-card-meta">
      ${a.interes    ? `<span class="apt-meta-item">${_ico.chart}${escHtml(a.interes)}</span>`    : ''}
      ${a.telefono   ? `<span class="apt-meta-item">${_ico.phone}${escHtml(a.telefono)}</span>`   : ''}
      ${a.origenLead ? `<span class="apt-meta-item">${_ico.list}${escHtml(a.origenLead)}</span>`  : ''}
    </div>
    <div class="apt-card-actions">
      ${a.telefono ? `<button class="btn-action green" data-action="call"     data-id="${a.id}" data-tel="${escHtml(a.telefono)}" data-nombre="${escHtml(a.nombre)}">${_ico.phone}Llamar</button>` : ''}
      ${a.telefono ? `<button class="btn-action green" data-action="wa"       data-id="${a.id}" data-type="appt">${_ico.whatsapp}WhatsApp</button>` : ''}
      ${a.zoomLink ? `<button class="btn-action blue"  data-action="zoom"     data-id="${a.id}" data-zoom="${escHtml(a.zoomLink)}">${_ico.zoom}Zoom</button>` : ''}
      <button class="btn-action primary" data-action="edit"     data-id="${a.id}">${_ico.edit}Editar</button>
      <button class="btn-action"         data-action="reagendar" data-id="${a.id}">${_ico.reschedule}Reagendar</button>
    </div>
  </div>`;
}

export async function renderPanel() {
  const panel  = document.getElementById('panel');
  if (S.view !== 'agenda') { panel.innerHTML = ''; return; }
  const appts  = await appointments.getByDate(S.date);
  appts.sort((a, b) => a.hora.localeCompare(b.hora));
  const nowStr = nowTimeStr();
  const next   = appts.find(a => a.hora >= nowStr && a.estado === 'Pendiente');
  const total  = appts.length;
  const asistio  = appts.filter(a => a.estado === 'Asistió').length;
  const noAsis   = appts.filter(a => a.estado === 'No asistió').length;
  const contrato = appts.filter(a => a.estado === 'Contrató').length;
  const allA     = await appointments.getAll();
  const origenMap= {}; allA.forEach(a => { if (a.origenLead) origenMap[a.origenLead] = (origenMap[a.origenLead]||0)+1; });
  const maxO     = Math.max(...Object.values(origenMap), 1);

  panel.innerHTML = `
    ${next ? `<div class="panel-next">
      <div class="panel-card-title">Próxima cita</div>
      <div class="panel-next-name">${escHtml(next.nombre)}</div>
      <div class="panel-next-time">${next.hora}</div>
      <div class="panel-next-interest">${escHtml(next.interes||'-')}</div>
    </div>` : ''}
    <div class="panel-card">
      <div class="panel-card-title">Resumen del día</div>
      <div class="panel-stat"><span class="panel-stat-label">Total citas</span><span class="panel-stat-val">${total}</span></div>
      <div class="panel-stat"><span class="panel-stat-label">Asistieron</span><span class="panel-stat-val">${asistio}</span></div>
      <div class="panel-stat"><span class="panel-stat-label">No asistieron</span><span class="panel-stat-val">${noAsis}</span></div>
      <div class="panel-stat"><span class="panel-stat-label">Contrataron</span><span class="panel-stat-val">${contrato}</span></div>
      ${total>0?`<div class="panel-stat"><span class="panel-stat-label">Conversión</span><span class="panel-stat-val">${Math.round(contrato/total*100)}%</span></div>`:''}
    </div>
    ${Object.keys(origenMap).length?`<div class="panel-card">
      <div class="panel-card-title">Leads por origen</div>
      ${Object.entries(origenMap).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`
        <div class="origen-bar">
          <div class="origen-bar-label"><span>${escHtml(k)}</span><strong>${v}</strong></div>
          <div class="origen-bar-track"><div class="origen-bar-fill" style="width:${Math.round(v/maxO*100)}%"></div></div>
        </div>`).join('')}
    </div>`:''}
    <div class="panel-card">
      <div class="panel-card-title">Accesos rápidos</div>
      <button class="btn-secondary" style="width:100%;margin-bottom:6px" id="panelNewAppt">${_ico.plus} Nueva cita</button>
      <button class="btn-secondary" style="width:100%" id="panelCalc">${_ico.money} Calculadora</button>
    </div>`;

  document.getElementById('panelNewAppt')?.addEventListener('click', () => window._app?.openFormModal?.());
  document.getElementById('panelCalc')?.addEventListener('click',   () => window._app?.navigate?.('calculadora'));
}
