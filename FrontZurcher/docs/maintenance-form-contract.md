# Contrato del Formulario de Mantenimiento (español)

Este documento define el contrato y la estructura del formulario web de mantenimiento que completarán los workers cuando se les asigne una tarea. Incluye campos prellenados desde el `work/permit`, estructura de envío (multipart/form-data), validaciones y ejemplos.

## Objetivo
Permitir a un worker completar una inspección/mantenimiento desde la web, adjuntar imágenes y videos por observación, y enviar los datos al backend en un endpoint seguro.

## Prefill / datos iniciales
El formulario recibirá datos prellenados desde el `work` de mantenimientos. Datos mínimos requeridos para prefill:
- `maintenanceId` (UUID) — id del mantenimiento
- `workId` (UUID) — id del work relacionado (opcional)
- `permit` object con:
  - `permitId` (string/UUID)
  - `propertyAddress` (string)
  - `applicant` (string)
  - `systemType` (string) // e.g. "ATU", "ATU PBTS", "PBTS", "Lift Station"
  - `optionalDocs` (Array of {name, url}) // documentos adjuntos del permit
- `scheduledDate` (ISO 8601)
- `inspector` (object {id, name})

Prefill strategy:
- Opción A (recomendada): la app móvil abre la URL: `https://frontzurcher/.../maintenance-form?maintenanceId=<id>&token=<short>` y la página hace `GET /maintenance/:id` para obtener datos completos del servidor.
- Opción B: pasar todos los datos via query params (solo para campos pequeños), no recomendado por seguridad.

## Endpoint sugerido (backend)
- GET /maintenance/:id — devuelve el objeto de mantenimiento con permit y attachments
- POST /maintenance/:id/complete — recibe `multipart/form-data` con campos y archivos
  - Autenticación: Authorization: Bearer <token> o short-lived token query/header
  - Respuestas:
    - 201 Created — inspección guardada
    - 400 Bad Request — validación falló
    - 401 Unauthorized — token inválido
    - 413 Payload Too Large — límite de archivos excedido

## Archivos permitidos
- Imágenes: `image/jpeg`, `image/png` (max 10 MB por archivo)
- Videos: `video/mp4`, `video/webm` (max 50 MB por archivo)
- Documentos: `application/pdf` (max 15 MB)
- Límite por request: máximo 10 archivos combinados (ajustable)
- Nombres en FormData: `images[]`, `videos[]`, `docs[]` y campos individuales pueden usar `images_fieldname[]` si se asocian a una observación concreta.

## Estructura del formulario en UI (secciones)

1) Encabezado / Información del Permit (prefill, solo lectura)
- Dirección propiedad (`propertyAddress`)
- Applicant (`applicant`)
- Tipo de sistema (`systemType`) — mostrar como badge
- Permit id (`permitId`)
- Lista de `optionalDocs` con enlaces y thumbnails

2) Info de la inspección
- Fecha programada (`scheduledDate`) — mostrar y permitir override si el worker lo reprograma (opcional)
- Inspector (`inspector.name`) — select si hay varios

3) Inspección General (siempre presente)
- `level_inlet` (number) — Nivel entrada tanque (cm o %)
- `level_outlet` (number) — Nivel salida
- `strong_odors` (boolean) — ¿Olores fuertes? yes/no
- `strong_odors_notes` (text)
- `water_level_ok` (boolean) — ¿Nivel de agua correcto? yes/no
- `water_level_notes` (text)
- `visible_leaks` (boolean) — ¿Fugas visibles? yes/no
- `visible_leaks_notes` (text)
- `area_around_dry` (boolean) — Área alrededor seca? yes/no
- `area_around_notes` (text)
- `cap_green_inspected` (boolean) — ¿Tapa inspección cap verde? yes/no
- `cap_green_notes` (text)
- `needs_pumping` (boolean) — ¿Necesita bombeo? yes/no
- Para cada campo booleano con observación, permitir adjuntar `images` y/o `video` asociados.

4) Sección por tipo de sistema (condicional según `systemType`)

- ATU / ATU PBTS:
  - `blower_working` (boolean)
  - `blower_filter_clean` (boolean)
  - `diffusers_bubbling` (boolean)
  - `discharge_pump_ok` (boolean)
  - `clarified_water_outlet` (boolean)
  - Para cada campo: `*_notes` y `*_media[]` (images/videos)

- Lift Station:
  - `alarm_panel_working` (boolean)
  - `pump_working` (boolean)
  - `float_switch_good` (boolean)
  - `liftstation_notes` (text)
  - Media: images/videos per observation

- PBTS:
  - `well_samples` (array) — ejemplo: [{well: 'Well 1', samplePresent: true, notes: '', media: []}, {well: 'Well 2', ...}]
  - UI: mostrar tres muestras por defecto (Muestra 1..3) con posibilidad de agregar más

5) Observaciones generales
- `general_notes` (text)
- `general_media[]` (images/videos)

6) Video general del sistema (opcional)
- `system_overview_video` (video)

7) Firma (opcional)
- `signature` (dataURL o file say png) — si se requiere firma manual

## Mapeo de keys para multipart/form-data (sugerencia)
- Campos scalar: añadir directamente como `formData.append('fieldName', value)`
- Arrays/objetos: JSON-stringify en un campo, por ejemplo:
  - `formData.append('well_samples', JSON.stringify(wellSamples))`
- Archivos:
  - `formData.append('images[]', file)` — para archivos generales
  - `formData.append('images_level_inlet[]', file)` — para asociarlos a campos específicos
  - `formData.append('system_overview_video', file)`

Ejemplo de keys relevantes:
- scalar fields: `level_inlet`, `level_outlet`, `strong_odors` (true/false), `strong_odors_notes`, `needs_pumping`, etc.
- arrays: `well_samples` (JSON)
- files: `images[]`, `videos[]`, `docs[]`, `images_strong_odors[]` (opcional)

## Ejemplos

### 1) Payload sin archivos (JSON) - alternativa si el backend acepta JSON
POST /maintenance/20e31.../complete
Headers: Authorization: Bearer <token>
Body (JSON):
{
  "maintenanceId": "20e31bdb-6ca0-4348-847e-7243d036be6f",
  "level_inlet": 45,
  "level_outlet": 10,
  "strong_odors": true,
  "strong_odors_notes": "Olor fuerte cerca del acceso N",
  "needs_pumping": false,
  "general_notes": "Inspección rutinaria, OK",
  "system_overview_video": null
}

### 2) Payload con archivos (multipart/form-data)
POST /maintenance/20e31.../complete
Headers: Authorization: Bearer <token>
FormData:
- maintenanceId: 20e31...
- level_inlet: 45
- strong_odors: true
- strong_odors_notes: Olor fuerte
- well_samples: [{"well":"Well 1","samplePresent":true}] (stringified JSON)
- images[]: file1.jpg
- images_strong_odors[]: odor1.jpg
- system_overview_video: video1.mp4

### 3) Ejemplo mínimo (solo required)
- maintenanceId
- needs_pumping
- inspectorId

## Validaciones recomendadas
- Campos required: `maintenanceId`, `inspectorId`, `scheduledDate` (si aplica), al menos un campo de inspección o `general_notes` o archivos.
- Para booleans, aceptar 'true'/'false' o 1/0
- Para arrays JSON: validar parseo y estructura
- Archivos: validar MIME y tamaño
- Límite de tiempo de token si se pasa via query: 5-15 minutos

## Errores comunes y respuestas
- 400 Bad Request: missing fields, invalid JSON, file type not allowed
  - body: { error: 'Campo X faltante' }
- 401 Unauthorized: token inválido
- 413 Payload Too Large
- 500 Internal Server Error: problemas de almacenamiento

## Mecanismo de asociación de archivos
- Guardar archivos en storage (S3, local uploads) y almacenar en DB `maintenance_media` con campos: id, maintenanceId, type (image/video/doc), field (optional — para qué campo), url, uploadedBy, createdAt

## Recomendaciones de UI
- Mostrar prefill claramente y permitir editar solo campos permitidos
- Para cada booleano con observación: mostrar checkbox -> si true, mostrar textarea + uploader
- Uploader: drag & drop (web), preview thumbnails, posibilidad de eliminar antes de enviar
- Indicar progresos de upload y permitir reintentos
- En mobile (desde WorkTrackerApp): abrir WebView para mantener auth/session; pasar token corto para evitar login en web

## Seguridad
- No pasar tokens largos en query params en producción. Mejor generar un short-lived token (JWT con 5-15 min exp) y pasarlo como query param o header desde la app mobile.
- Validar que el worker que abre el formulario está autorizado para ese `maintenanceId`.

## Flow recomendado (paso a paso)
1. App móvil consulta `GET /maintenance/assigned?workerId=...` y muestra lista.
2. Worker toca la tarea -> app solicita `POST /maintenance/:id/generate-token` (short-lived) o obtiene URL con token seguro.
3. App abre `https://front.../maintenance-form?maintenanceId=<id>&token=<short>` en WebView.
4. Web carga `GET /maintenance/:id` con token en header y prefill.
5. Worker completa formulario y sube archivos -> `POST /maintenance/:id/complete`.
6. Backend valida, asocia archivos, guarda registro y notifica a supervisor.

## Consideraciones offline (opcional)
- Si el worker no tiene conexión, permitir guardar localmente en la app y sincronizar luego. Para archivos, usar FileSystem + base64/blobs y cola de subida.

---

### Anexo: ejemplos de keys sugeridas (lista compacta)
- maintenanceId
- inspectorId
- scheduledDate
- level_inlet, level_outlet
- strong_odors, strong_odors_notes, images_strong_odors[]
- water_level_ok, water_level_notes
- visible_leaks, visible_leaks_notes, images_visible_leaks[]
- needs_pumping
- blower_working, blower_filter_clean, diffusers_bubbling, discharge_pump_ok, clarified_water_outlet
- alarm_panel_working, pump_working, float_switch_good
- well_samples (JSON string)
- general_notes
- general_media[]
- system_overview_video
- signature (optional file)


---

Si querés, ahora puedo:
- generar el componente web skeleton (`FrontZurcher/src/pages/MaintenanceForm.jsx`) con el layout y los inputs básicos (sin estilos complejos), y un `FileUploader` pequeño que haga preview y arme el FormData, o
- empezar a implementar el endpoint backend `POST /maintenance/:id/complete` con multer y validaciones.

Decime cuál prefieres que implemente primero y lo hago.