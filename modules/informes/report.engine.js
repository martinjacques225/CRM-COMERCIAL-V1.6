// modules/informes/report.engine.js
// MOTOR DE INFORMES. Orquesta: periodo → datos → plantillas → PDF (html2pdf) con pie de página.
// Separado de la analítica/plantillas/gráficos para escalar a Supabase sin reescritura.
import { resolvePeriod, collectData } from './data.engine.js';
import * as T from './templates.js';
import { MASCOTAS } from '../../js/mascotas.js';
import { todayStr } from '../../js/utils.js';

const HTML2PDF_URL = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.2/html2pdf.bundle.min.js';

// Registro de informes. available=false → se mostrará como "Etapa 2" en la UI.
export const REPORTS = [
  { id: 'general',     label: 'Informe General Completo', title: 'Informe Comercial Ejecutivo', available: true },
  { id: 'leads',       label: 'Informe de Leads',         title: 'Informe de Leads',            available: true },
  { id: 'agenda',      label: 'Informe de Agenda',        title: 'Informe de Agenda',           available: true },
  { id: 'ventas',      label: 'Informe de Ventas',        title: 'Informe de Ventas',           available: true },
  { id: 'comisiones',  label: 'Informe de Comisiones',    title: 'Informe de Comisiones',       available: true },
  { id: 'medallas',    label: 'Informe de Medallas',      title: 'Informe de Medallas',         available: true },
  { id: 'dashboard',   label: 'Informe Dashboard Ejecutivo', title: 'Dashboard Ejecutivo',      available: true },
  { id: 'rendimiento', label: 'Informe de Rendimiento',   title: 'Informe de Rendimiento',      available: true },
  { id: 'personalizado', label: 'Informe Personalizado (todo)', title: 'Informe Personalizado', available: true }
];

const SECTION_BUILDERS = {
  leads: T.sectionLeads,
  agenda: T.sectionAgenda,
  ventas: T.sectionVentas,
  comisiones: T.sectionComisiones,
  medallas: T.sectionMedallas,
  dashboard: T.sectionDashboard
};

function ensureLib() {
  if (window.html2pdf) return Promise.resolve();
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = HTML2PDF_URL; s.async = true;
    s.onload = () => res();
    s.onerror = () => rej(new Error('No se pudo cargar el generador de PDF (revisa tu conexión la primera vez).'));
    document.head.appendChild(s);
  });
}

// Resuelve qué secciones renderizar a partir de los informes seleccionados.
function resolveSections(reports) {
  const set = [];
  const add = id => { if (!set.includes(id) && SECTION_BUILDERS[id]) set.push(id); };
  reports.forEach(r => {
    if (r === 'general') ['leads', 'ventas', 'dashboard'].forEach(add);
    else if (r === 'rendimiento') ['ventas', 'comisiones', 'medallas'].forEach(add);
    else if (r === 'personalizado') ['leads', 'agenda', 'ventas', 'comisiones', 'medallas', 'dashboard'].forEach(add);
    else add(r);
  });
  return set;
}

// Construye el HTML completo del documento.
function buildDocHtml(d, reports, includes) {
  const sections = resolveSections(reports);
  const combos = ['general', 'rendimiento', 'personalizado'];
  const withExec = reports.length > 1 || reports.some(r => combos.includes(r));
  const title = reports.length === 1
    ? (REPORTS.find(r => r.id === reports[0])?.title || 'Informe Comercial')
    : 'Informe Comercial Ejecutivo';

  let body = T.cover(d, title);
  sections.forEach(id => { body += SECTION_BUILDERS[id](d, includes); });
  if (withExec && sections.length) body += T.sectionExecutive(d, sections);

  return `<div class="rp-doc">${T.styleBlock()}${body}</div>`;
}

// Pie de página con número de página sobre el PDF ya construido.
function addFooters(pdf, leftText) {
  const total = pdf.internal.getNumberOfPages();
  const w = pdf.internal.pageSize.getWidth(), h = pdf.internal.pageSize.getHeight();
  const fecha = new Date().toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
  for (let i = 1; i <= total; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8); pdf.setTextColor(120);
    pdf.text(leftText, 10, h - 6);
    pdf.text(fecha, w / 2, h - 6, { align: 'center' });
    pdf.text(`Página ${i} / ${total}`, w - 10, h - 6, { align: 'right' });
  }
}

// API principal. opts = { reports:[], periodKind, customStart, customEnd, includes:{} }
export async function generate(opts) {
  const { reports = [], periodKind = 'mes', customStart, customEnd, includes = {} } = opts;
  const usable = reports.filter(r => REPORTS.find(x => x.id === r && x.available));
  if (!usable.length) throw new Error('Selecciona al menos un informe disponible.');

  const period = resolvePeriod(periodKind, customStart, customEnd);
  const d = await collectData(period);
  d.profile.mascotaObj = MASCOTAS.find(m => m.id === d.profile.mascota) || MASCOTAS[0];

  await ensureLib();

  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;background:#fff;z-index:-1';
  wrap.innerHTML = buildDocHtml(d, usable, includes);
  document.body.appendChild(wrap);

  const fname = `informe_${(usable.includes('general') || usable.length > 1) ? 'ejecutivo' : usable[0]}_${todayStr()}.pdf`;
  const footer = `CRM Comercial · ${d.profile.userName}`;

  const opt = {
    margin: [10, 10, 16, 10],
    filename: fname,
    image: { type: 'jpeg', quality: 0.97 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'] }
  };

  try {
    const worker = window.html2pdf().set(opt).from(wrap.firstElementChild).toPdf();
    const pdf = await worker.get('pdf');
    addFooters(pdf, footer);
    await worker.save();
  } finally {
    wrap.remove();
  }
  return fname;
}
