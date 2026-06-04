// modules/dashboard/dashboard.js
import { appointments, leads, sales, calls, config } from '../../js/db.js';
import { PLANES } from '../../js/constants.js';
import { fmtMoney, formatDate, todayStr, addDays,
         getWeekStart, isContadoPlan, calcIncentiveSemanal,
         calcTotalMedallas, calcNivel, calcMonthComision, escHtml } from '../../js/utils.js';

export async function render() {
  const center = document.getElementById('center');
  const [allA, allL, allS, allC] = await Promise.all([
    appointments.getAll(), leads.getAll(), sales.getAll(), calls.getAll()
  ]);
  const now   = new Date(), today = todayStr();
  const year  = now.getFullYear(), month = now.getMonth() + 1;
  const debutActivo = await config.get('debutActivo') || false;
  const calc  = calcMonthComision(allS, year, month, debutActivo, PLANES);
  const wkStart = getWeekStart(today);
  const hoy   = allA.filter(a => a.fecha === today);
  const asistio  = allA.filter(a => a.estado === 'Asistió').length;
  const noAsis   = allA.filter(a => a.estado === 'No asistió').length;
  const contrato = allA.filter(a => a.estado === 'Contrató').length;
  const conv     = (asistio + noAsis) > 0 ? Math.round(contrato / (asistio + noAsis) * 100) : 0;
  const moPrefix = `${year}-${String(month).padStart(2, '0')}`;
  const llamadasHoy = allC.filter(c => c.fecha === today).length;
  const llamadasMes = allC.filter(c => c.fecha.startsWith(moPrefix)).length;
  const totalMedallas = calcTotalMedallas(allS);
  const nivel         = calcNivel(totalMedallas);
  const weekSales     = allS.filter(s => getWeekStart(s.fecha) === wkStart);
  const incSemana     = calcIncentiveSemanal(weekSales);
  const leadsByEstado = {}; allL.forEach(l => { leadsByEstado[l.estado] = (leadsByEstado[l.estado] || 0) + 1; });
  const origenMap     = {}; allA.forEach(a => { if (a.origenLead) origenMap[a.origenLead] = (origenMap[a.origenLead] || 0) + 1; });
  const maxO          = Math.max(...Object.values(origenMap), 1);
  const ventasDia     = {}; for (let i = 6; i >= 0; i--) { const d = addDays(today, -i); ventasDia[d] = allS.filter(s => s.fecha === d).length; }
  const maxVD         = Math.max(...Object.values(ventasDia), 1);

  center.innerHTML = `<div class="view-animate">
    <div class="dash-grid">
      <div class="dash-card highlight"><div class="dash-card-label">💰 Sueldo del mes</div><div class="dash-card-val" style="font-size:1.3rem">${fmtMoney(calc.total)}</div><div class="dash-card-sub">${calc.thisMo.length} ventas · ${now.toLocaleString('es',{month:'long'})}</div></div>
      <div class="dash-card success-card"><div class="dash-card-label">⚡ Incentivo esta semana</div><div class="dash-card-val" style="font-size:1.2rem">${fmtMoney(incSemana.bono)}</div><div class="dash-card-sub">${weekSales.length} ventas · ${weekSales.filter(s=>isContadoPlan(s.plan)).length} contados</div></div>
      <div class="dash-card"><div class="dash-card-label">Conversión total</div><div class="dash-card-val">${conv}%</div><div class="dash-card-sub">${contrato} contratos / ${asistio+noAsis} reuniones</div></div>
      <div class="dash-card"><div class="dash-card-label">Citas hoy</div><div class="dash-card-val">${hoy.length}</div><div class="dash-card-sub">${formatDate(today)}</div></div>
      <div class="dash-card"><div class="dash-card-label">Total leads</div><div class="dash-card-val">${allL.length}</div><div class="dash-card-sub">${allL.filter(l=>!l.agendado).length} activos</div></div>
      <div class="dash-card"><div class="dash-card-label">Llamadas hoy</div><div class="dash-card-val">${llamadasHoy}</div><div class="dash-card-sub">${llamadasMes} este mes</div></div>
      <div class="dash-card"><div class="dash-card-label">🏅 Medallas</div><div class="dash-card-val">${totalMedallas}</div><div class="dash-card-sub">Nivel ${nivel}</div></div>
      <div class="dash-card"><div class="dash-card-label">BPI mensual</div><div class="dash-card-val" style="font-size:1.1rem">${fmtMoney(calc.bpi)}</div><div class="dash-card-sub">${calc.thisMo.length} matrículas</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">
      <div>
        <div class="section-title">Ventas últimos 7 días</div>
        <div style="display:flex;gap:6px;align-items:flex-end;height:80px">
          ${Object.entries(ventasDia).map(([d,v])=>`
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px">
              <span style="font-size:.6rem;font-weight:700;color:var(--text2)">${v||''}</span>
              <div style="width:100%;background:${v>0?'var(--primary)':'var(--surface3)'};border-radius:4px 4px 0 0;height:${Math.max(4,Math.round(v/maxVD*60))}px"></div>
              <span style="font-size:.55rem;color:var(--text3)">${new Date(d+'T12:00:00').toLocaleDateString('es',{weekday:'short'})}</span>
            </div>`).join('')}
        </div>
      </div>
      <div>
        <div class="section-title">Desglose sueldo del mes</div>
        <div class="comision-breakdown-card" style="padding:10px">
          <div class="cb-row" style="font-size:.75rem"><span>Comisiones</span><span>${fmtMoney(calc.comisiones)}</span></div>
          <div class="cb-row" style="font-size:.75rem"><span>Incentivos sem.</span><span style="color:var(--success)">${fmtMoney(calc.incentivos)}</span></div>
          <div class="cb-row" style="font-size:.75rem"><span>BPI</span><span style="color:var(--purple)">${fmtMoney(calc.bpi)}</span></div>
          <div class="cb-row" style="font-size:.75rem"><span>Conectividad</span><span>${fmtMoney(calc.conectividad)}</span></div>
          <div class="cb-row cb-total" style="font-size:.8rem"><span>TOTAL</span><span>${fmtMoney(calc.total)}</span></div>
        </div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <div>
        <div class="section-title">Leads por estado</div>
        ${Object.entries(leadsByEstado).slice(0,6).map(([k,v])=>`
          <div class="dash-origin-row" style="margin-bottom:5px">
            <span class="dash-origin-name" style="font-size:.72rem;width:130px">${k}</span>
            <div class="dash-origin-bar-wrap"><div class="dash-origin-bar-fill" style="width:${Math.round(v/Math.max(...Object.values(leadsByEstado))*100)}%"></div></div>
            <span class="dash-origin-count">${v}</span>
          </div>`).join('')||'<p style="color:var(--text3);font-size:.78rem">Sin leads</p>'}
      </div>
      <div>
        <div class="section-title">Leads por origen</div>
        ${Object.keys(origenMap).length===0?'<p style="color:var(--text3);font-size:.78rem">Sin datos</p>'
          :Object.entries(origenMap).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`
            <div class="dash-origin-row">
              <span class="dash-origin-name">${escHtml(k)}</span>
              <div class="dash-origin-bar-wrap"><div class="dash-origin-bar-fill" style="width:${Math.round(v/maxO*100)}%"></div></div>
              <span class="dash-origin-count">${v}</span>
            </div>`).join('')}
      </div>
    </div>
  </div>`;
}
