// js/db.js — Capa de acceso a datos (IndexedDB)
// No modificar nombres de tablas ni estructuras — compatibilidad con datos existentes

const DB_NAME = 'AgendaComercialDB';
const DB_VERSION = 2;
let _db = null;

export function initDB() {
  return new Promise((resolve, reject) => {
    if (_db) return resolve(_db);
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('appointments')) {
        const s = db.createObjectStore('appointments', { keyPath: 'id', autoIncrement: true });
        s.createIndex('fecha', 'fecha', { unique: false });
        s.createIndex('estado', 'estado', { unique: false });
      }
      if (!db.objectStoreNames.contains('templates'))
        db.createObjectStore('templates', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('config'))
        db.createObjectStore('config', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('leads')) {
        const s = db.createObjectStore('leads', { keyPath: 'id', autoIncrement: true });
        s.createIndex('estado', 'estado', { unique: false });
        s.createIndex('fechaCreacion', 'fechaCreacion', { unique: false });
      }
      if (!db.objectStoreNames.contains('calls')) {
        const s = db.createObjectStore('calls', { keyPath: 'id', autoIncrement: true });
        s.createIndex('leadId', 'leadId', { unique: false });
        s.createIndex('apptId', 'apptId', { unique: false });
        s.createIndex('fecha', 'fecha', { unique: false });
      }
      if (!db.objectStoreNames.contains('sales')) {
        const s = db.createObjectStore('sales', { keyPath: 'id', autoIncrement: true });
        s.createIndex('fecha', 'fecha', { unique: false });
        s.createIndex('plan', 'plan', { unique: false });
      }
    };
    req.onsuccess = e => { _db = e.target.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

function tx(store, mode = 'readonly') {
  return _db.transaction(store, mode).objectStore(store);
}

function wrap(req) {
  return new Promise((res, rej) => {
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

function cursorAll(store) {
  return new Promise((res, rej) => {
    const items = [];
    const req = tx(store).openCursor();
    req.onsuccess = e => {
      const c = e.target.result;
      if (c) { items.push(c.value); c.continue(); } else res(items);
    };
    req.onerror = () => rej(req.error);
  });
}

export const appointments = {
  add(data) {
    const now = new Date().toISOString();
    return wrap(tx('appointments', 'readwrite').add({ ...data, estado: data.estado || 'Pendiente', fechaCreacion: now, fechaActualizacion: now }));
  },
  get(id)    { return wrap(tx('appointments').get(id)); },
  getAll()   { return cursorAll('appointments'); },
  getByDate(fecha) {
    return new Promise((res, rej) => {
      const items = [];
      const req = tx('appointments').index('fecha').openCursor(IDBKeyRange.only(fecha));
      req.onsuccess = e => { const c = e.target.result; if (c) { items.push(c.value); c.continue(); } else res(items); };
      req.onerror = () => rej(req.error);
    });
  },
  update(data) { data.fechaActualizacion = new Date().toISOString(); return wrap(tx('appointments', 'readwrite').put(data)); },
  delete(id)   { return wrap(tx('appointments', 'readwrite').delete(id)); },
  async checkConflict(fecha, hora, excludeId = null) {
    const all = await this.getByDate(fecha);
    return all.find(a => a.hora === hora && a.id !== excludeId && a.estado !== 'Reagendada');
  },
  async search(query) {
    const all = await this.getAll();
    if (!query) return all;
    const q = query.toLowerCase();
    return all.filter(a =>
      (a.nombre || '').toLowerCase().includes(q) ||
      (a.telefono || '').toLowerCase().includes(q) ||
      (a.interes || '').toLowerCase().includes(q) ||
      (a.estado || '').toLowerCase().includes(q) ||
      (a.origenLead || '').toLowerCase().includes(q)
    );
  }
};

export const leads = {
  add(data) {
    const now = new Date().toISOString();
    return wrap(tx('leads', 'readwrite').add({ ...data, estado: data.estado || 'Nuevo', historial: data.historial || [], fechaCreacion: now, fechaActualizacion: now }));
  },
  get(id)    { return wrap(tx('leads').get(id)); },
  getAll()   { return cursorAll('leads'); },
  update(data) { data.fechaActualizacion = new Date().toISOString(); return wrap(tx('leads', 'readwrite').put(data)); },
  delete(id)   { return wrap(tx('leads', 'readwrite').delete(id)); },
  async addHistorial(id, entry) {
    const lead = await this.get(id);
    if (!lead) return;
    if (!lead.historial) lead.historial = [];
    lead.historial.unshift({ ...entry, timestamp: new Date().toISOString() });
    return this.update(lead);
  },
  async search(query) {
    const all = await this.getAll();
    if (!query) return all;
    const q = query.toLowerCase();
    return all.filter(l =>
      (l.nombre || '').toLowerCase().includes(q) ||
      (l.apellido || '').toLowerCase().includes(q) ||
      (l.telefono || '').toLowerCase().includes(q) ||
      (l.email || '').toLowerCase().includes(q) ||
      (l.empresa || '').toLowerCase().includes(q)
    );
  }
};

export const calls = {
  add(data) {
    const now = new Date().toISOString();
    return wrap(tx('calls', 'readwrite').add({ ...data, fecha: data.fecha || now.slice(0, 10), hora: data.hora || now.slice(11, 16), resultado: data.resultado || 'Iniciada', timestamp: now }));
  },
  get(id)    { return wrap(tx('calls').get(id)); },
  getAll()   { return cursorAll('calls'); },
  update(data) { return wrap(tx('calls', 'readwrite').put(data)); },
  getByLead(leadId) {
    return new Promise((res, rej) => {
      const items = [];
      const req = tx('calls').index('leadId').openCursor(IDBKeyRange.only(leadId));
      req.onsuccess = e => { const c = e.target.result; if (c) { items.push(c.value); c.continue(); } else res(items); };
      req.onerror = () => rej(req.error);
    });
  },
  getByAppt(apptId) {
    return new Promise((res, rej) => {
      const items = [];
      const req = tx('calls').index('apptId').openCursor(IDBKeyRange.only(apptId));
      req.onsuccess = e => { const c = e.target.result; if (c) { items.push(c.value); c.continue(); } else res(items); };
      req.onerror = () => rej(req.error);
    });
  },
  async getByDateRange(start, end) {
    const all = await this.getAll();
    return all.filter(c => c.fecha >= start && c.fecha <= end);
  }
};

export const sales = {
  add(data) {
    const now = new Date().toISOString();
    return wrap(tx('sales', 'readwrite').add({ ...data, fecha: data.fecha || now.slice(0, 10), timestamp: now }));
  },
  get(id)    { return wrap(tx('sales').get(id)); },
  getAll()   { return cursorAll('sales'); },
  update(data) { return wrap(tx('sales', 'readwrite').put(data)); },
  delete(id)   { return wrap(tx('sales', 'readwrite').delete(id)); },
  async getByMonth(year, month) {
    const all = await this.getAll();
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    return all.filter(s => s.fecha.startsWith(prefix));
  }
};

const DEFAULT_TEMPLATES = [
  { id: 'primer_contacto', nombre: 'Primer contacto', contenido: 'Hola {{nombre}} 👋\n\nTe escribo de parte de *[Empresa]*, vi que podrías estar interesado/a en *{{producto}}*.\n\n¿Tienes unos minutos para conversar? 😊' },
  { id: 'confirmacion', nombre: 'Confirmación de cita', contenido: 'Hola {{nombre}} 👋\n\nTe confirmo tu cita para el *{{fecha}}* a las *{{hora}}*.\n\nTema: {{producto}}\nLink Zoom: {{zoom}}\n\n¡Te espero puntual! 😊' },
  { id: 'recordatorio', nombre: 'Recordatorio de cita', contenido: 'Hola {{nombre}}! 🔔\n\nTe recuerdo que tienes una reunión *HOY* a las *{{hora}}*.\n\nTema: {{producto}}\nZoom: {{zoom}}\n\n¿Confirmas asistencia?' },
  { id: 'reagendamiento', nombre: 'Reagendamiento', contenido: 'Hola {{nombre}} 😊\n\nHemos reagendado tu cita para el *{{fecha}}* a las *{{hora}}*.\n\nTema: {{producto}}\nZoom: {{zoom}}\n\n¡Nos vemos!' },
  { id: 'seguimiento', nombre: 'Seguimiento', contenido: 'Hola {{nombre}}! 😊\n\nQuería hacer un seguimiento sobre tu interés en *{{producto}}*.\n\n¿Pudiste pensar en nuestra propuesta?\n\nQuedo a tu disposición 🙌' },
  { id: 'post_reunion', nombre: 'Post reunión', contenido: 'Hola {{nombre}} 🙏\n\nFue un placer conversar contigo hoy.\n\nQuedo atento/a a cualquier consulta sobre *{{producto}}*.\n\n¡Hasta pronto!' },
  { id: 'cierre', nombre: 'Cierre de venta', contenido: 'Hola {{nombre}} 🎉\n\n¡Muchas gracias por tu confianza!\n\nQueda confirmada tu inscripción en *{{producto}}*.\n\nCualquier consulta, aquí estoy 💪' },
  { id: 'no_asistio', nombre: 'No asistió', contenido: 'Hola {{nombre}} 👋\n\nNotamos que no pudiste asistir a tu cita de hoy.\n\n¿Todo bien? Podemos reagendarla cuando gustes 😊\n\nQuedo pendiente.' },
  { id: 'recuperacion', nombre: 'Recuperación de prospecto', contenido: 'Hola {{nombre}}! 😊\n\nHace un tiempo conversamos sobre *{{producto}}*.\n\nQuería retomar el contacto, ¿sigues interesado/a?\n\nTenemos condiciones especiales este mes 🔥' }
];

export const templates = {
  async getAll() {
    const items = await cursorAll('templates');
    if (items.length === 0) {
      const s = tx('templates', 'readwrite');
      await Promise.all(DEFAULT_TEMPLATES.map(t => wrap(s.put(t))));
      return DEFAULT_TEMPLATES;
    }
    return items;
  },
  update(t) { return wrap(tx('templates', 'readwrite').put(t)); },
  add(t)    { return wrap(tx('templates', 'readwrite').put(t)); }
};

export const config = {
  get(key)         { return wrap(tx('config').get(key)).then(r => r ? r.value : null); },
  set(key, value)  { return wrap(tx('config', 'readwrite').put({ key, value })); }
};
