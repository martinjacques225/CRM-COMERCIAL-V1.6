// modules/modals/modal-wa.js — Modal de envío de WhatsApp con plantillas y variables
import { appointments } from '../../services/appointment.service.js';
import { leads } from '../../services/lead.service.js';
import { templates } from '../../services/template.service.js';
import { config } from '../../services/config.service.js';
import { escHtml, formatDate } from '../../js/utils.js';
import { openModal, closeModal } from './modal-core.js';

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
