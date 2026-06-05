// js/estados.js — Estados del ciclo de lead y cargos comerciales (catálogo de negocio)
// NOTA: en la futura migración multiusuario pasan a tablas `lead_estados` y `roles`.

export const LEAD_ESTADOS = [
  'Nuevo', 'Intento de contacto', 'Contactado', 'Cita agendada',
  'Confirmado', 'Asistió', 'No asistió', 'Seguimiento',
  'Propuesta enviada', 'Venta cerrada', 'Perdido'
];

export const CARGOS = [
  'Asesor Training', 'Full Executive', 'Jefe de Grupo',
  'Gerente', 'Sales Manager', 'Director', 'CEO'
];
