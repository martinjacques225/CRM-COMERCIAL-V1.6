// modules/calculadora/calculadora.js
import { PLANES } from '../../js/constants.js';
import { S } from '../../js/state.js';
import { fmtMoney, escHtml, calcIncentiveSemanal, todayStr } from '../../js/utils.js';

export function render() {
  const plan  = PLANES.find(p => p.id === S.calcPlan) || PLANES[0];
  const total = plan.comision != null ? plan.comision * S.calcQty : null;
  const simInc = calcIncentiveSemanal(Array(S.calcQty).fill({ plan: plan.id }));

  document.getElementById('center').innerHTML = `<div class="view-animate"><div class="calc-grid">
    <div>
      <div class="section-title">Selecciona el plan</div>
      <div class="plan-cards">${PLANES.map(p => `
        <div class="plan-card${S.calcPlan === p.id ? ' selected' : ''}${p.extraoficial ? ' extraoficial' : ''}" data-plan="${p.id}">
          <div class="plan-card-info">
            <div class="plan-card-name">${p.nombre}</div>
            <div class="plan-card-desc">${p.desc}</div>
            <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:4px">
              ${p.badge     ? `<span class="plan-card-badge${p.badgeType === 'gold' ? ' gold' : p.extraoficial ? ' extra' : ''}">${p.badge}</span>` : ''}
              ${p.beca      ? `<span class="plan-card-badge" style="background:#FEF3C7;color:#92400E">🎓 Beca Familiar</span>`  : ''}
              ${p.esContado ? `<span class="plan-card-badge" style="background:#DCFCE7;color:#166534">★ Contado</span>`         : ''}
            </div>
          </div>
          <div class="plan-comision${p.comision == null ? ' unknown' : ''}">${p.comision != null ? fmtMoney(p.comision) : 'Por confirmar'}</div>
        </div>`).join('')}
      </div>
    </div>
    <div class="calc-sidebar">
      <div class="calc-sidebar-title">Tu resultado</div>
      <div class="calc-input-row">
        <label class="calc-input-label">¿Cuántas ventas de este plan?</label>
        <input class="calc-number-input" id="calcQty" type="number" min="1" max="999" value="${S.calcQty}">
      </div>
      <div class="calc-result">
        <div class="calc-result-label">Comisión total</div>
        <div class="calc-result-amount">${total != null ? fmtMoney(total) : '—'}</div>
        <div class="calc-result-per">${plan.comision != null ? fmtMoney(plan.comision) + ' por venta' : plan.nombre}</div>
      </div>
      ${plan.beca ? `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#FEF9C3;border:1px solid #FDE68A;border-radius:var(--radius-sm);margin-bottom:12px">
        <div><div style="font-size:.8rem;font-weight:700;color:#92400E">🎓 Beca Familiar</div><div style="font-size:.7rem;color:#A16207">Gancho de cierre — sin costo</div></div>
        <button class="toggle${S.calcBeca ? ' on' : ''}" id="becaToggle" style="flex-shrink:0"></button>
      </div>` : ''}
      <div class="calc-breakdown">
        <div class="calc-breakdown-row"><span>Plan</span><span>${escHtml(plan.nombre)}</span></div>
        <div class="calc-breakdown-row"><span>Ventas</span><span>${S.calcQty}</span></div>
        ${plan.beca && S.calcBeca ? `<div class="calc-breakdown-row"><span>Beca Familiar</span><span style="color:#16A34A">✓ Incluida</span></div>` : ''}
        <div class="calc-breakdown-row"><span>Comisión c/u</span><span>${plan.comision != null ? fmtMoney(plan.comision) : '—'}</span></div>
        <div class="calc-breakdown-row"><span>TOTAL</span><span>${total != null ? fmtMoney(total) : 'Por confirmar'}</span></div>
      </div>
      <div style="margin-top:12px;padding:10px;background:var(--surface2);border-radius:var(--radius-sm)">
        <div style="font-size:.72rem;font-weight:700;color:var(--text2);margin-bottom:6px">INCENTIVO SEMANAL ESTIMADO</div>
        ${simInc.bono > 0
          ? `<div style="font-size:.85rem;color:var(--primary);font-weight:700">${fmtMoney(simInc.bono)}</div><div style="font-size:.68rem;color:var(--text3)">Si todas son en la misma semana</div>`
          : `<div style="font-size:.75rem;color:var(--text3)">Necesitas ≥2 ventas/semana para incentivo</div>`}
      </div>
      ${_getMensajeMeta(S.calcQty)}
    </div>
  </div></div>`;

  document.querySelectorAll('.plan-card[data-plan]').forEach(card => {
    card.addEventListener('click', () => { S.calcPlan = card.dataset.plan; S.calcBeca = false; render(); });
  });
  document.getElementById('calcQty').addEventListener('input', e => {
    S.calcQty = Math.max(1, parseInt(e.target.value) || 1); render();
  });
  document.getElementById('becaToggle')?.addEventListener('click', function () { S.calcBeca = !S.calcBeca; render(); });
}

function _getMensajeMeta(qty) {
  if (qty >= 20) return `<div class="meta-motivacional">🏆 ¡IMPARABLE! Con ${qty} ventas ya eres leyenda este mes.</div>`;
  if (qty >= 10) return `<div class="meta-motivacional">🔥 ¡Cazador! ${qty} ventas. Te faltan ${20 - qty} para ser Imparable 🚀</div>`;
  if (qty >= 5)  return `<div class="meta-motivacional">⚡ ¡Racha activa! Te faltan ${10 - qty} para el siguiente nivel 🔥</div>`;
  if (qty >= 1)  return `<div class="meta-motivacional">💪 ¡Vas bien! Te faltan ${5 - qty} ventas para tu primera racha ⚡</div>`;
  return '';
}
