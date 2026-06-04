// modules/modals/modals.js — Todos los modales de la aplicación
import { appointments, leads, sales, templates, config } from '../../js/db.js';
import { PLANES, LEAD_ESTADOS } from '../../js/constants.js';
import { S } from '../../js/state.js';
import {
  escHtml, formatDate, fmtMoney, toast, vibrate, showFileError,
  avatarHtml, statusDotColor, renderTimePicker, initTimePicker, todayStr
} from '../../js/utils.js';

// Icono alert (local hasta que ui.js lo centralice en Etapa 4)
const _alert = `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>`;

// ── Helpers base ──
export function openModal(saveLabel = 'Guardar') {
  document.getElementById('modalSave').textContent = saveLabel;
  document.getElementById('modalOverlay').classList.add('open');
}
export function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  S.editingId = null; S.reagendarId = null; S.waTarget = null;
}

// ── Cita ──
export async function openFormModal(id = null) {
  S.editingId = id;
  let appt = null; if (id) appt = await appointments.get(id);
  const isEdit = !!appt;
  document.getElementById('modalTitle').textContent = isEdit ? 'Editar cita' : 'Nueva cita';
  document.getElementById('modalBody').innerHTML = `
    <div class="form-row">
      <div class="form-field"><label class="form-label">Nombre <span class="req">*</span></label><input class="form-input" id="fNombre" value="${escHtml(appt?.nombre||'')}"><span class="form-error" id="eNombre"></span></div>
      <div class="form-field"><label class="form-label">Teléfono <span class="req">*</span></label><input class="form-input" id="fTelefono" value="${escHtml(appt?.telefono||'')}" placeholder="+56 9 ..."><span class="form-error" id="eTelefono"></span></div>
    </div>
    <div class="form-row">
      <div class="form-field"><label class="form-label">Fecha <span class="req">*</span></label><input class="form-input" id="fFecha" type="date" value="${appt?.fecha||S.date}"></div>
      <div class="form-field"><label class="form-label">Hora <span class="req">*</span></label>${renderTimePicker('fHora', appt?.hora||'09:00')}</div>
    </div>
    <div class="form-row">
      <div class="form-field"><label class="form-label">Interés</label><input class="form-input" id="fInteres" value="${escHtml(appt?.interes||'')}"></div>
      <div class="form-field"><label class="form-label">Origen lead</label>
        <select class="form-select" id="fOrigenLead"><option value="">Sin especificar</option>${['Facebook','Instagram','LinkedIn','Referido','Web','Cold Call','Otro'].map(v=>`<option${appt?.origenLead===v?' selected':''}>${v}</option>`).join('')}</select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-field"><label class="form-label">Área laboral</label><input class="form-input" id="fAreaLaboral" value="${escHtml(appt?.areaLaboral||'')}"></div>
      <div class="form-field"><label class="form-label">Duración (min)</label><input class="form-input" id="fDuracion" type="number" value="${appt?.duracion||30}" min="15" max="240" step="15"></div>
    </div>
    <div class="form-row full"><div class="form-field"><label class="form-label">Link Zoom</label><input class="form-input" id="fZoomLink" value="${escHtml(appt?.zoomLink||'')}" placeholder="https://zoom.us/j/..."></div></div>
    ${isEdit?`<div class="form-row full"><div class="form-field"><label class="form-label">Estado</label>
      <div class="status-select-wrap"><div class="status-dot" id="statusDot"></div>
        <select class="form-select" id="fEstado">${['Pendiente','Asistió','No asistió','Contrató','No interesado','Reagendada'].map(v=>`<option${appt?.estado===v?' selected':''}>${v}</option>`).join('')}</select>
      </div></div></div>`:''}
    <div class="form-row full"><div class="form-field"><label class="form-label">Observaciones</label><textarea class="form-textarea" id="fObs">${escHtml(appt?.observaciones||'')}</textarea></div></div>
    <div id="conflictBox"></div>`;
  initTimePicker('fHora');
  if (isEdit) {
    const dot = document.getElementById('statusDot'), sel = document.getElementById('fEstado');
    const upd = () => { dot.style.background = statusDotColor(sel.value); }; upd();
    sel.addEventListener('change', upd);
  }
  const chk = async () => {
    const f = document.getElementById('fFecha').value, h = document.getElementById('fHora').value;
    if (!f || !h) return;
    const c = await appointments.checkConflict(f, h, id);
    document.getElementById('conflictBox').innerHTML = c ? `<div class="conflict-box">${_alert} Conflicto con ${escHtml(c.nombre)} a las ${c.hora}</div>` : '';
  };
  document.getElementById('fFecha').addEventListener('change', chk);
  document.getElementById('fHora').addEventListener('change', chk);
  openModal();
  document.getElementById('modalSave').onclick = async () => {
    const nombre = document.getElementById('fNombre').value.trim();
    const telefono = document.getElementById('fTelefono').value.trim();
    const fecha = document.getElementById('fFecha').value, hora = document.getElementById('fHora').value;
    let ok = true;
    ['eNombre','eTelefono'].forEach(x => document.getElementById(x).textContent = '');
    document.querySelectorAll('.form-input.error').forEach(el => el.classList.remove('error'));
    if (!nombre)   { document.getElementById('eNombre').textContent   = 'Requerido'; document.getElementById('fNombre').classList.add('error');   ok = false; }
    if (!telefono) { document.getElementById('eTelefono').textContent = 'Requerido'; document.getElementById('fTelefono').classList.add('error'); ok = false; }
    if (!fecha || !hora) ok = false;
    if (!ok) return;
    if (await appointments.checkConflict(fecha, hora, id)) { toast('Conflicto de horario','error'); return; }
    const data = { nombre, telefono, fecha, hora,
      interes:       document.getElementById('fInteres').value.trim(),
      areaLaboral:   document.getElementById('fAreaLaboral').value.trim(),
      origenLead:    document.getElementById('fOrigenLead').value,
      duracion:      parseInt(document.getElementById('fDuracion').value) || 30,
      zoomLink:      document.getElementById('fZoomLink').value.trim(),
      estado:        isEdit ? document.getElementById('fEstado').value : 'Pendiente',
      observaciones: document.getElementById('fObs').value.trim()
    };
    if (isEdit) { data.id = id; await appointments.update(data); toast('Cita actualizada','success'); }
    else        { await appointments.add(data); toast('Cita creada','success'); S.date = fecha; }
    closeModal(); window._app?.refreshView?.();
  };
  document.getElementById('modalCancel').onclick = closeModal;
}

// ── Cita desde lead ──
export async function openFormModalFromLead(leadId) {
  const lead = await leads.get(leadId); if (!lead) return;
  S.editingId = null;
  document.getElementById('modalTitle').textContent = `Agendar cita — ${lead.nombre} ${lead.apellido||''}`.trim();
  document.getElementById('modalBody').innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--primary-light);border-radius:var(--radius-sm);margin-bottom:14px">
      ${avatarHtml(lead.nombre, lead.apellido, lead.avatar, 32)}
      <div>
        <div style="font-size:.88rem;font-weight:700;color:var(--text)">${escHtml(lead.nombre)} ${escHtml(lead.apellido||'')}</div>
        <div style="font-size:.74rem;color:var(--text2)">${escHtml(lead.telefono||'')}${lead.empresa?' · '+escHtml(lead.empresa):''}</div>
      </div>
    </div>
    <div class="form-row">
      <div class="form-field"><label class="form-label">Fecha <span class="req">*</span></label><input class="form-input" id="fFecha" type="date" value="${S.date}"><span class="form-error" id="eFecha"></span></div>
      <div class="form-field"><label class="form-label">Hora <span class="req">*</span></label>${renderTimePicker('fHora','09:00')}</div>
    </div>
    <div class="form-row">
      <div class="form-field"><label class="form-label">Interés / producto</label><input class="form-input" id="fInteres" value="${escHtml(lead.interes||'')}"></div>
      <div class="form-field"><label class="form-label">Duración (min)</label><input class="form-input" id="fDuracion" type="number" value="30" min="15" max="240" step="15"></div>
    </div>
    <div class="form-row full"><div class="form-field"><label class="form-label">Link Zoom</label><input class="form-input" id="fZoomLink" placeholder="https://zoom.us/j/..."></div></div>
    <div class="form-row full"><div class="form-field"><label class="form-label">Observaciones</label><textarea class="form-textarea" id="fObs">${escHtml(lead.observaciones||'')}</textarea></div></div>
    <div id="conflictBox"></div>`;
  initTimePicker('fHora');
  const chk = async () => {
    const f = document.getElementById('fFecha').value, h = document.getElementById('fHora').value;
    if (!f || !h) return;
    const c = await appointments.checkConflict(f, h, null);
    document.getElementById('conflictBox').innerHTML = c ? `<div class="conflict-box">${_alert} Conflicto con ${escHtml(c.nombre)} a las ${c.hora}</div>` : '';
  };
  document.getElementById('fFecha').addEventListener('change', chk);
  document.getElementById('fHora').addEventListener('change', chk);
  openModal('Agendar cita');
  document.getElementById('modalSave').onclick = async () => {
    const fecha = document.getElementById('fFecha').value, hora = document.getElementById('fHora').value;
    if (!fecha) { document.getElementById('eFecha').textContent = 'Requerido'; return; }
    if (!hora) return;
    if (await appointments.checkConflict(fecha, hora, null)) { toast('Conflicto de horario','error'); return; }
    await appointments.add({
      nombre:       (lead.nombre+' '+(lead.apellido||'')).trim(),
      telefono:     lead.telefono||'',
      fecha, hora,
      interes:      document.getElementById('fInteres').value.trim(),
      origenLead:   lead.origen||'',
      duracion:     parseInt(document.getElementById('fDuracion').value)||30,
      zoomLink:     document.getElementById('fZoomLink').value.trim(),
      estado:       'Pendiente',
      observaciones:document.getElementById('fObs').value.trim(),
      leadId:       lead.id
    });
    lead.estado = 'Cita agendada'; lead.agendado = true;
    await leads.update(lead);
    await leads.addHistorial(lead.id, { tipo: 'cita_agendada', desc: `Cita agendada para el ${formatDate(fecha)} a las ${hora}` });
    toast(`Cita agendada para ${lead.nombre} ✅`, 'success');
    window._app?.showMascotMessage?.(null, 'cita_agendada');
    S.date = fecha; closeModal(); window._app?.navigate?.('agenda');
  };
  document.getElementById('modalCancel').onclick = closeModal;
}

// ── Lead ──
export async function openLeadModal(id = null) {
  let lead = null; if (id) lead = await leads.get(id);
  const isEdit = !!lead;
  document.getElementById('modalTitle').textContent = isEdit ? 'Editar lead' : 'Nuevo lead';
  document.getElementById('modalBody').innerHTML = `
    <div class="form-row">
      <div class="form-field"><label class="form-label">Nombre <span class="req">*</span></label><input class="form-input" id="lNombre" value="${escHtml(lead?.nombre||'')}"><span class="form-error" id="eLN"></span></div>
      <div class="form-field"><label class="form-label">Apellido</label><input class="form-input" id="lApellido" value="${escHtml(lead?.apellido||'')}"></div>
    </div>
    <div class="form-row">
      <div class="form-field"><label class="form-label">Teléfono</label><input class="form-input" id="lTel" value="${escHtml(lead?.telefono||'')}" placeholder="+56 9 ..."></div>
      <div class="form-field"><label class="form-label">Email</label><input class="form-input" id="lEmail" type="email" value="${escHtml(lead?.email||'')}"></div>
    </div>
    <div class="form-row">
      <div class="form-field"><label class="form-label">Empresa</label><input class="form-input" id="lEmpresa" value="${escHtml(lead?.empresa||'')}"></div>
      <div class="form-field"><label class="form-label">Cargo</label><input class="form-input" id="lCargo" value="${escHtml(lead?.cargo||'')}"></div>
    </div>
    <div class="form-row">
      <div class="form-field"><label class="form-label">Interés</label><input class="form-input" id="lInteres" value="${escHtml(lead?.interes||'')}"></div>
      <div class="form-field"><label class="form-label">Origen</label>
        <select class="form-select" id="lOrigen"><option value="">Sin especificar</option>${['Facebook','Instagram','LinkedIn','Referido','Web','Cold Call','Otro'].map(v=>`<option${lead?.origen===v?' selected':''}>${v}</option>`).join('')}</select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-field"><label class="form-label">Estado</label>
        <select class="form-select" id="lEstado">${LEAD_ESTADOS.map(e=>`<option${lead?.estado===e?' selected':''}>${e}</option>`).join('')}</select>
      </div>
      <div class="form-field"><label class="form-label">Nivel de interés</label>
        <select class="form-select" id="lNivel">${['','Alto','Medio','Bajo'].map(v=>`<option${lead?.nivelInteres===v?' selected':''}>${v}</option>`).join('')}</select>
      </div>
    </div>
    <div class="form-row full"><div class="form-field"><label class="form-label">Observaciones</label><textarea class="form-textarea" id="lObs">${escHtml(lead?.observaciones||'')}</textarea></div></div>`;
  openModal();
  document.getElementById('modalSave').onclick = async () => {
    const nombre = document.getElementById('lNombre').value.trim();
    if (!nombre) { document.getElementById('eLN').textContent = 'Requerido'; return; }
    const nuevoEstado = document.getElementById('lEstado').value;
    const data = { nombre,
      apellido:     document.getElementById('lApellido').value.trim(),
      telefono:     document.getElementById('lTel').value.trim(),
      email:        document.getElementById('lEmail').value.trim(),
      empresa:      document.getElementById('lEmpresa').value.trim(),
      cargo:        document.getElementById('lCargo').value.trim(),
      interes:      document.getElementById('lInteres').value.trim(),
      origen:       document.getElementById('lOrigen').value,
      estado:       nuevoEstado,
      nivelInteres: document.getElementById('lNivel').value,
      observaciones:document.getElementById('lObs').value.trim()
    };
    if (isEdit) {
      data.id = id;
      if (nuevoEstado !== 'Cita agendada' && nuevoEstado !== 'Confirmado') data.agendado = false;
      await leads.update(data); toast('Lead actualizado','success');
    } else {
      await leads.add(data); toast('Lead creado','success');
      window._app?.showMascotMessage?.(null, 'lead_cargado');
    }
    closeModal(); if (S.view === 'leads') window._app?.refreshView?.();
  };
  document.getElementById('modalCancel').onclick = closeModal;
}

// ── Reagendar ──
export async function openReagendarModal(id) {
  const appt = await appointments.get(id); if (!appt) return;
  document.getElementById('modalTitle').textContent = 'Reagendar cita';
  document.getElementById('modalBody').innerHTML = `
    <div class="reagendar-info">
      <div class="reagendar-info-name">${escHtml(appt.nombre)}</div>
      <div class="reagendar-info-detail">${appt.interes||''} - ${appt.telefono||''}</div>
    </div>
    <div class="form-row">
      <div class="form-field"><label class="form-label">Nueva fecha <span class="req">*</span></label><input class="form-input" id="rFecha" type="date" value="${appt.fecha}"><span class="form-error" id="eRF"></span></div>
      <div class="form-field"><label class="form-label">Nueva hora <span class="req">*</span></label>${renderTimePicker('rHora', appt.hora)}</div>
    </div>
    <div id="rConflictBox"></div>`;
  initTimePicker('rHora');
  const chk = async () => {
    const f = document.getElementById('rFecha').value, h = document.getElementById('rHora').value;
    if (!f || !h) return;
    const c = await appointments.checkConflict(f, h, id);
    document.getElementById('rConflictBox').innerHTML = c ? `<div class="conflict-box">${_alert} Conflicto con ${escHtml(c.nombre)} a las ${c.hora}</div>` : '';
  };
  document.getElementById('rFecha').addEventListener('change', chk);
  document.getElementById('rHora').addEventListener('change', chk);
  openModal();
  document.getElementById('modalSave').onclick = async () => {
    const fecha = document.getElementById('rFecha').value, hora = document.getElementById('rHora').value;
    if (!fecha) { document.getElementById('eRF').textContent = 'Requerido'; return; }
    if (!hora) return;
    if (await appointments.checkConflict(fecha, hora, id)) { toast('Conflicto de horario','error'); return; }
    appt.fecha = fecha; appt.hora = hora; appt.estado = 'Reagendada';
    await appointments.update(appt); toast('Cita reagendada','success');
    closeModal(); window._app?.refreshView?.();
  };
  document.getElementById('modalCancel').onclick = closeModal;
}

// ── WhatsApp ──
export async function openWAModal(id, type = 'appt') {
  const target = type === 'appt' ? await appointments.get(id) : await leads.get(id);
  if (!target) return;
  const tmpls    = await templates.getAll();
  const userName = await config.get('userName') || 'Asesor';
  document.getElementById('modalTitle').textContent = 'Enviar WhatsApp';
  document.getElementById('modalBody').innerHTML = `
    <p style="font-size:.78rem;color:var(--text2);margin-bottom:10px">Para: <strong>${escHtml(target.nombre)}</strong> - ${escHtml(target.telefono||'')}</p>
    <div class="form-field" style="margin-bottom:10px"><label class="form-label">Plantilla</label>
      <select class="form-select" id="waTmpl">${tmpls.map(t=>`<option value="${t.id}">${escHtml(t.nombre)}</option>`).join('')}</select>
    </div>
    <div class="wa-preview"><div class="wa-bubble" id="waBubble"></div></div>`;
  const upd = () => {
    const t = tmpls.find(x => x.id === document.getElementById('waTmpl').value);
    if (t) document.getElementById('waBubble').textContent = _buildWAMsg(t.contenido, target, userName);
  };
  document.getElementById('waTmpl').addEventListener('change', upd); upd();
  openModal('Abrir WhatsApp');
  document.getElementById('modalSave').onclick = () => {
    const t = tmpls.find(x => x.id === document.getElementById('waTmpl').value); if (!t) return;
    const tel = (target.telefono||'').replace(/\D/g,'');
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(_buildWAMsg(t.contenido, target, userName))}`, '_blank');
    closeModal();
  };
  document.getElementById('modalCancel').onclick = closeModal;
}

function _buildWAMsg(tmpl, target, ej) {
  return tmpl
    .replace(/\{\{nombre\}\}/g,   target.nombre   || '')
    .replace(/\{\{telefono\}\}/g, target.telefono || '')
    .replace(/\{\{fecha\}\}/g,    formatDate(target.fecha))
    .replace(/\{\{hora\}\}/g,     target.hora     || '')
    .replace(/\{\{zoom\}\}/g,     target.zoomLink || 'sin link')
    .replace(/\{\{producto\}\}/g, target.interes  || '')
    .replace(/\{\{ejecutivo\}\}/g, ej             || '');
}

// ── Venta ──
export async function openSaleModal() {
  document.getElementById('modalTitle').textContent = 'Registrar venta';
  document.getElementById('modalBody').innerHTML = `
    <div class="form-row full"><div class="form-field"><label class="form-label">Nombre del cliente <span class="req">*</span></label><input class="form-input" id="sNombre" placeholder="Nombre completo"><span class="form-error" id="eSN"></span></div></div>
    <div class="form-row">
      <div class="form-field"><label class="form-label">Plan vendido <span class="req">*</span></label>
        <select class="form-select" id="sPlan">${PLANES.map(p=>`<option value="${p.id}">${p.nombre}${p.comision!=null?' — '+fmtMoney(p.comision):' — Por confirmar'}${p.esContado?' ★':''}</option>`).join('')}</select>
      </div>
      <div class="form-field"><label class="form-label">Fecha</label><input class="form-input" id="sFecha" type="date" value="${todayStr()}"></div>
    </div>
    <div class="form-row full" id="becaRow"></div>
    <div class="form-row full"><div class="form-field"><label class="form-label">Observaciones</label><textarea class="form-textarea" id="sObs" placeholder="Notas..."></textarea></div></div>`;
  const updateBecaRow = () => {
    const p = PLANES.find(x => x.id === document.getElementById('sPlan').value);
    document.getElementById('becaRow').innerHTML = p?.beca ? `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;background:#FEF9C3;border:1px solid #FDE68A;border-radius:var(--radius-sm);width:100%">
        <span style="font-size:1.2rem">🎓</span>
        <div style="flex:1"><div style="font-size:.82rem;font-weight:700;color:#92400E">Incluir Beca Familiar</div><div style="font-size:.7rem;color:#A16207">Gancho de cierre gratuito</div></div>
        <button class="toggle" id="saleBecaToggle"></button>
      </div>` : '';
    document.getElementById('saleBecaToggle')?.addEventListener('click', function () { this.classList.toggle('on'); });
  };
  document.getElementById('sPlan').addEventListener('change', updateBecaRow);
  updateBecaRow(); openModal();
  document.getElementById('modalSave').onclick = async () => {
    const nombre = document.getElementById('sNombre').value.trim();
    if (!nombre) { document.getElementById('eSN').textContent = 'Requerido'; return; }
    const becaOn = document.getElementById('saleBecaToggle')?.classList.contains('on') || false;
    await sales.add({ nombre, plan: document.getElementById('sPlan').value, fecha: document.getElementById('sFecha').value, becaFamiliar: becaOn, observaciones: document.getElementById('sObs').value.trim() });
    toast('Venta registrada! 🎉','success'); vibrate([50,30,50]);
    closeModal();
    window._app?.navigate?.('mis_ventas');
    window._app?.showMascotMessage?.(null, 'venta');
  };
  document.getElementById('modalCancel').onclick = closeModal;
}

// ── Eliminar ──
export async function deleteSale(id) {
  if (!confirm('¿Eliminar esta venta?')) return;
  await sales.delete(id); toast('Venta eliminada');
  window._app?.navigate?.('mis_ventas');
}
export async function deleteLead(id) {
  if (!confirm('¿Eliminar este lead?')) return;
  await leads.delete(id); toast('Lead eliminado');
  if (S.view === 'leads') window._app?.refreshView?.();
}
