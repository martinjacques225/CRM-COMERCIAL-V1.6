# CHANGELOG.md
> Historial de cambios documentados — registrar aquí cada modificación relevante

---

## [3.3] — Correcciones funcionales (Fase pulido pre-Supabase)

> Objetivo: corregir bugs funcionales y completar comportamientos comerciales sin tocar la capa de servicios ni la persistencia. Compatibilidad total con datos actuales. NO incluye Supabase, sincronización ni multiusuario.

### Corregido
- **Comisiones / Calculadora**: el campo numérico "¿Cuántas ventas?" se reiniciaba al escribir (no permitía varios dígitos). Causa raíz: el handler `input` re-renderizaba toda la vista en cada tecla, recreando el `<input>`. Ahora sólo se re-renderiza el bloque de resultado (`#calcResult`) sin tocar el input (`modules/calculadora/calculadora.js`).
- **Plantillas WhatsApp — variables automáticas**: el reemplazo sólo soportaba `{{producto}}`/`{{ejecutivo}}`; variables con nombre natural (`{{plan}}`, `{{asesor}}`, `{{cliente}}`, etc.) quedaban literales. Se centralizó el llenado en `buildMessage()` con alias en español y limpieza de tokens desconocidos.

### Añadido
- **`utils.buildMessage(tmpl, target, ctx)`** — motor único de reemplazo de variables de plantillas (WhatsApp y futuros canales). Soporta alias: `cliente=nombre`, `plan=producto=interes`, `asesor=ejecutivo`, más `email/empresa/ciudad/cargo/filial/zoom`. Tokens no reconocidos se vacían.
- **Mayúsculas automáticas** (`utils.initAutoUpper`) — convierte a MAYÚSCULAS los inputs de texto al perder el foco (no textareas). Excluye correos, URLs y campos técnicos. Configurable por el usuario (config `autoMayusculas`, por defecto activado) con toggle en Configuración. Feedback visual en vivo vía clase CSS `body.auto-upper`.
- **Agenda — eliminar y devolver a Leads**:
  - `deleteAppointment(id)`: elimina la cita; si provenía de un lead, lo libera (`agendado=false`, estado→Seguimiento) y registra historial.
  - `appointmentToLead(id)`: devuelve la cita a Leads. Si tenía lead asociado lo recupera; si no, crea un nuevo lead desde los datos de la cita. Registra historial y elimina la cita.
  - Botones "A Leads" y "Eliminar" en cada tarjeta de cita.
- **Planes del Anexo LGS al catálogo global** (`js/planes.js`): `una_persona` (Plan 1 Persona, $52.000, contado) y `plan_3x1` (Plan 3X1, $40.000, crédito). Valores de "Gestión por Participante". Aparecen en Calculadora, Ventas y Dashboard. Aditivo, sin romper datos.
- **Calculadora — Simulador mensual** (nueva sub-pestaña, se mantiene el "Cálculo rápido"): grilla de ventas proyectadas por plan × semana (5 semanas) → comisiones + bonos semanales + BPI (escala 6/10/13) + fijos (conectividad/debut) + sueldo total. Mini-gráfico comisión/bono por semana y desglose. Proyección "what-if": no toca datos reales; se persiste en `localStorage` (`crm_sim_grid_v1`).
- **`utils.calcProjection(weekGrid, PLANES, debutActivo)`** — motor de proyección mensual, expuesto vía `services/commission.service.js`. Reusa `calcIncentiveSemanal` y `calcBPI` (consistente con ventas reales).
- **`utils.isContadoPlan`** ahora es data-driven (bandera `esContado` del catálogo) en lugar de ids hardcodeados; mantiene compatibilidad con datos antiguos.

### Mejorado
- **Agenda — legibilidad y densidad**: la vista pasó de una cuadrícula fija de 06:00–22:00 (17 filas, ~900px aunque hubiera 2 citas) a una **lista compacta** que muestra solo las citas del día, con la **hora en grande y en color oscuro** (antes ~11px gris). Marcador "Ahora · HH:MM" intercalado.
- **Agenda — bloque superior**: se agregó arriba del centro una **próxima cita destacada** (hora grande + cuenta regresiva "en N min", visible también en móvil donde no hay panel) y una **franja de pendientes** (leads sin contactar, seguimientos, propuestas) que enlaza a Leads. Se eliminó la "próxima cita" duplicada del panel derecho.
- **Agenda — acciones compactas**: las tarjetas pasaron de 7 botones a 4 visibles (Llamar, WhatsApp, Zoom, Editar) + un menú **"⋯"** que agrupa los secundarios (Reagendar, A Leads, Eliminar). Menú con cierre al hacer clic fuera.

### Regla de negocio
- Al eliminar/devolver una cita ligada a un lead, el lead vuelve a estado **Seguimiento** y queda disponible para re-agendar. Toda acción queda en el historial del lead (`cita_eliminada`, `devuelto_a_leads`, `recuperado_de_agenda`).

### Mantenimiento / limpieza de repo
- Eliminadas copias anidadas accidentales del proyecto dentro del clon Git: `CRM V3.0/`, `CRM V3.0 (1)/` y `CRM VENTAS LGS/`.
- Eliminado `icon-192.png` (asset huérfano, 0 referencias en código; manifest y `sw.js` solo usan `icon-crm-192/512` e `icon-lgs`).
- `INSTRUCCIONES_PROYECTO_NUEVO.md` movido del raíz a `docs/`.
- `.gitignore`: añadidos patrones para evitar que reaparezcan las copias anidadas y el MD de instrucciones en el raíz.
- Verificación estática post-limpieza: sintaxis OK en 36 `.js`, 114 imports relativos resueltos (0 rotos), recursos de `index.html`/`manifest.json` existentes.

### Archivos modificados
- `js/utils.js`, `js/ui.js`, `app.js`, `js/planes.js`, `js/state.js`, `services/commission.service.js`
- `modules/calculadora/calculadora.js`, `modules/calculadora/calculadora.css`, `modules/modals/modal-wa.js`, `modules/modals/modal-cita.js`, `modules/modals/modals.js`
- `modules/plantillas-wa/whatsapp.js`, `modules/configuracion/configuracion.js`, `modules/agenda/agenda.js`, `modules/agenda/agenda.css`, `styles.css`, `docs/BUSINESS_RULES.md`

### Verificación
- Inspección de código y pruebas de lógica aisladas (`buildMessage`). **Pendiente: prueba funcional en navegador** (PC + móvil + PWA) antes de commit/push.

---

## [3.2] — Capa de Servicios y limpieza de deuda técnica (Fase Servicios)

> Objetivo: desacoplar la app del almacenamiento mediante una capa de servicios estable, preparada para Supabase, **sin alterar comportamiento visible**. Compatibilidad total con datos actuales.

### Añadido
- **Capa `services/`** — único punto de acceso a datos y lógica de negocio:
  - Datos: `lead`, `appointment`, `sales`, `call`, `template`, `config` + `persistence` (initDB).
  - Negocio: `commission`, `medal` (fachadas sobre `utils.js`).
  - Preparación futura: `user.service` (perfil local → futura tabla `perfiles`).
  - `services/index.js` (barrel) como punto de entrada recomendado.
- **Contratos públicos documentados** en `docs/SERVICES_CONTRACT.md` (incluye contrato de `window._app`).
- Separación de `js/constants.js` → `js/planes.js`, `js/estados.js`, `js/mascotas.js`.
- Separación de `modules/modals/modals.js` → `modal-core.js`, `modal-cita.js`, `modal-lead.js`, `modal-venta.js`, `modal-wa.js`.

### Cambiado
- Todos los módulos y `js/ui.js` y `app.js` ahora importan de `services/` (cero acceso directo a IndexedDB desde la UI).
- `js/constants.js` y `modules/modals/modals.js` pasan a ser **barrels de compatibilidad** (no rompen imports existentes).
- Ventas, Medallas, Dashboard y Calculadora consumen `commission.service` / `medal.service`.
- Service Worker: `CACHE` `crm-v7` → **`crm-v8`**; añadidos los nuevos archivos a `ASSETS`.

### Eliminado
- `db.js` (raíz, obsoleto) y `app.backup.js` (monolito anterior) — verificado sin referencias activas.
- `deleteLead` duplicado en `modules/leads/leads.js` y `deleteSale` duplicado en `modules/ventas/ventas.js` (queda una sola implementación, en los modales).
- Imports muertos en `app.js` (`leads`, `sales`, `templates`, `PLANES`, `MASCOTAS` no usados).

### Verificación (estática)
- `node --check`: sintaxis OK en `app.js`, `js/`, `services/`, `modules/` y `sw.js`.
- Validador de imports/exports propio: **186 imports nominales resueltos a un export real, 0 errores**.
- Pendiente: prueba funcional en navegador (Leads, Agenda, Ventas, Configuración).

### Sin cambios
- Reglas de negocio, motor de comisiones, BPI, medallas, esquema de IndexedDB y comportamiento visible: **idénticos**.

---

## [3.1] — Estado actual (extraído de código)

### Arquitectura
- Migración completa del monolito `app.backup.js` a arquitectura modular
- Creación de capa `js/` con: `db.js`, `state.js`, `constants.js`, `ui.js`, `utils.js`
- Cada módulo de vista separado en `modules/{nombre}/` con su propio `.js` y `.css`
- `app.js` reducido a orquestador puro de ~132 líneas

### Base de Datos
- IndexedDB `AgendaComercialDB` versión 2
- Stores: `appointments`, `leads`, `calls`, `sales`, `templates`, `config`
- Índices en `appointments.fecha`, `leads.estado`, `calls.leadId`, `sales.plan`

### Funcionalidades confirmadas en código
- 19 plantillas WhatsApp predefinidas con variables dinámicas
- 6 mascotas IA con personalidad y 20+ contextos de mensaje cada una
- Motor de comisiones: base + incentivos semanales + BPI + conectividad + debut
- Sistema de medallas: 1 medalla por 4 ventas/semana, 1 nivel por 5 medallas
- Vista Kanban y Grid para leads
- Exportación JSON (citas + leads + ventas) e importación JSON
- Exportación Excel (solo citas) e importación Excel (solo leads)
- PWA con Service Worker cache-first (`crm-v7`)
- Notificaciones nativas 10 min antes de cita
- Modo claro/oscuro
- Banner y avatar personalizables en perfil
- Detección de conflictos de horario en citas

### Deuda técnica identificada (pendiente de resolver)
- `deleteLead` y `deleteSale` exportadas desde 2 módulos distintos cada una
- Íconos SVG duplicados en 6+ archivos
- `db.js` obsoleto en raíz del proyecto
- `constants.js` mezcla 3 responsabilidades distintas (mascotas, planes, estados)
- `modals.js` con 345 líneas sin separación de responsabilidades
- Todos los módulos usan `getAll()` sin paginación

---

## [3.0] — Versión anterior (monolito)

- Toda la lógica en `app.backup.js` (~1500+ líneas)
- Sin separación de módulos
- Base de datos ya en IndexedDB con los mismos stores

---

## [2.x] — Historial no documentado en código

> No se encontró información en el código fuente sobre versiones anteriores a 3.0.

---

## Próximas entradas esperadas

Cuando se realicen cambios, agregar entrada con formato:

```markdown
## [3.2] — YYYY-MM-DD

### Cambios
- Descripción del cambio

### Archivos modificados
- `ruta/al/archivo.js` — qué se cambió

### Migración necesaria
- Si aplica: pasos para migrar datos existentes
```
