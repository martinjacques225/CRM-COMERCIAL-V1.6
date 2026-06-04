// js/state.js — Estado global de la aplicación (singleton)
// Importar siempre la misma referencia para garantizar consistencia entre módulos

export const S = {
  view:           'agenda',
  date:           new Date().toISOString().slice(0, 10),
  searchQ:        '',
  searchEstado:   '',
  editingId:      null,
  waTarget:       null,
  reagendarId:    null,
  notified:       new Set(),
  deferredInstall:null,
  pendingCallId:  null,
  leadsView:      'grid',
  showAgendados:  false,
  calcPlan:       'contado',
  calcQty:        1,
  calcBeca:       false
};
