# Manual técnico — PERMED

Documentación para desarrolladores y administradores técnicos del sistema de planificación de guardias.

- **Última actualización:** noviembre de 2026.
- **Dirigido a:** programadores y soporte técnico.
- **Disponible en la aplicación:** menú **Manual técnico** (solo rol `admin`).
- **Manual de usuario:** `docs/manual-usuario.md`.

---

## 1. Arquitectura

| Capa | Tecnología |
|---|---|
| Frontend | React 19, Vite 7, React Router 7, FullCalendar 6, axios, dayjs |
| Backend | Node.js, Express 5, mysql2/promise, jsonwebtoken, bcryptjs |
| Base de datos | MariaDB 10.4, `utf8mb4`, zona horaria America/Buenos_Aires |
| Autenticación | JWT (Bearer) con roles `admin`, `coordinador`, `prestador` |

La API es REST y devuelve JSON bajo `/api`. El frontend es una SPA que consume esa API.

## 2. Estructura del repositorio

```text
PlanificacionGuardias/
├─ backend/
│  ├─ app.js                  arranque de Express y montaje de rutas
│  ├─ config/
│  │  ├─ db.js                pool de mysql2
│  │  └─ auth.js              secreto y expiración del JWT
│  ├─ controllers/            lógica de cada recurso
│  ├─ middleware/auth.js      validación de token y roles
│  ├─ routes/                 definición de endpoints
│  ├─ db/migrations/          SQL versionado (001 a 008)
│  ├─ scripts/                migrate.js, seed.js, importar-padron.js, importar-nomina.js
│  └─ utils/                  helpers (fechas, geo.js, documentos.js)
├─ frontend/
│  ├─ src/
│  │  ├─ components/          Layout, modales, ruta protegida, manual
│  │  ├─ context/             AuthContext
│  │  ├─ pages/               Login, Inicio, Guardias, Publicaciones, Pacientes, Clínicas, Trabajadores, Calendario, Nómina, Manuales
│  │  ├─ services/api.js      instancia de axios e interceptores
│  │  ├─ styles/              estilos compartidos
│  │  └─ utils/markdown.js    conversor Markdown → HTML del manual
│  ├─ vite.config.js          plugins y acceso a docs/
│  └─ .env.example
├─ docs/
│  ├─ manual-usuario.md
│  └─ manual-tecnico.md
```

## 3. Puesta en marcha

### 3.1 Requisitos

- Node.js 20.19 o superior (Vite 7).
- MariaDB 10.4 o superior con la base `sistema_permed`.
- npm.

### 3.2 Backend

```bash
cd backend
copy .env.example .env
npm install
npm run migrate
npm run seed
npm run dev
```

Variables de entorno:

| Variable | Uso | Valor por defecto |
|---|---|---|
| `PORT` | Puerto de la API | `3000` |
| `DB_HOST` | Host de MariaDB | `localhost` |
| `DB_PORT` | Puerto de MariaDB | `3306` |
| `DB_USER` | Usuario de la base | `root` |
| `DB_PASSWORD` | Contraseña de la base | vacío |
| `DB_NAME` | Nombre de la base | `sistema_permed` |
| `JWT_SECRET` | Firma de los tokens | `dev-permed-secret` |
| `JWT_EXPIRES_IN` | Vigencia del token | `8h` |

`JWT_SECRET` debe ser largo y aleatorio en producción.

### 3.3 Frontend

```bash
cd frontend
copy .env.example .env
npm install
npm run dev
```

`VITE_API_URL` define la URL base de la API. Si se omite, se usa `http://localhost:3000/api`.

### 3.4 Scripts

| Comando | Dónde | Qué hace |
|---|---|---|
| `npm run dev` | backend | Express con `node --watch` |
| `npm run migrate` | backend | Aplica migraciones pendientes |
| `npm run seed` | backend | Crea o reinicia los datos demo |
| `npm run db:setup` | backend | `migrate` + `seed` |
| `node scripts/importar-padron.js "<ruta.xlsx>"` | backend | Simula la importación del padrón de prestaciones |
| `node scripts/importar-padron.js "<ruta.xlsx>" --apply` | backend | Importa el padrón y confirma los cambios |
| `node scripts/importar-nomina.js "<ruta.xlsx>"` | backend | Simula la importación de la nómina mensual |
| `node scripts/importar-nomina.js "<ruta.xlsx>" --apply` | backend | Importa la nómina y confirma los cambios |
| `node scripts/importar-nomina.js "<ruta.xlsx>" --fecha-inicio=YYYY-MM-DD` | backend | Simula la nómina con otra fecha de inicio de asignaciones |
| `npm run dev` | frontend | Servidor Vite en 5173 |
| `npm run lint` | frontend | ESLint |
| `npm run build` | frontend | Build de producción en `dist/` |

### 3.5 Usuarios de prueba

| Rol | Email | Contraseña | Origen |
|---|---|---|---|
| `admin` | master@permed.local | Rb170614 | Creado manualmente en desarrollo (no lo genera el seed) |
| `coordinador` | coordinador@permed.local | Coord123! | `npm run seed` |
| `prestador` | prestador@permed.local | Prest123! | `npm run seed` |

El seed asocia el usuario prestador al trabajador demo (id 4).

## 4. Base de datos

### 4.1 Tablas

| Tabla | Función |
|---|---|
| `cargos` | Puestos de trabajo (Enfermero, Coordinador, Programador, etc.) |
| `trabajadores` | Personal, con DNI, CUIT/CUIL, CBU/CVU, `cargo_id` y `activo` |
| `pacientes` | Pacientes con datos del padrón, clínica de internación, estado y GPS |
| `clinicas` | Clínicas y residencias, con servicios como texto y GPS |
| `familiares` | Contactos familiares de cada paciente |
| `asignaciones` | Vínculo trabajador–paciente; precios opcionales y vigencia |
| `precios_base` | Tarifas por cargo con fecha de vigencia |
| `feriados` | Fechas consideradas feriado para la liquidación |
| `horarios_programados` | Guardias planificadas (`asignacion_id`, entrada, salida) |
| `registros_asistencia` | Entrada y salida reales de cada guardia, con evidencia GPS de la entrada |
| `nomina_mensual` | Cabecera de liquidación por trabajador, paciente y período |
| `detalle_horas_trabajadas` | Detalle de horas normales y feriado por guardia |
| `usuarios` | Cuentas de acceso y rol |
| `auditoria_asistencia` | Historial de correcciones manuales |
| `publicaciones_guardia` | Guardias publicadas a los prestadores (snapshot de paciente, dirección, patología, horario y precio) |
| `publicaciones_destinatarios` | Prestadores destinatarios de cada publicación |
| `schema_migrations` | Migraciones aplicadas |

`pacientes.clinica_id` referencia `clinicas.id` con `ON DELETE SET NULL`. Las columnas `latitud`/`longitud` de `pacientes` y `clinicas` son `DECIMAL(10,7)` y admiten NULL. En `registros_asistencia`, `latitud_entrada` y `longitud_entrada` son `DECIMAL(10,7)`, `precision_entrada` y `distancia_entrada` son `DECIMAL(8,2)`. En `trabajadores`, `dni` y `cuit` son únicos y admiten NULL; `cbu` es `VARCHAR(50)` para permitir CBU, CVU o alias.

### 4.2 Vistas

| Vista | Contenido |
|---|---|
| `vista_horarios_completa` | Guardia + trabajador + paciente + asistencia + `estado_cumplimiento` |
| `vista_calculo_nomina` | Horas normales y feriado por trabajador, paciente y mes, con precios aplicados |
| `vista_trabajadores_asignaciones` | Trabajadores con su paciente asignado y precios |
| `vista_pacientes_familiares` | Pacientes con sus familiares |

### 4.3 Columnas generadas

- `horarios_programados.horas_estimadas`: `TIMESTAMPDIFF(MINUTE, entrada, salida) / 60`.
- `registros_asistencia.horas_reales`: `TIMESTAMPDIFF(MINUTE, entrada_real, salida_real) / 60`.

No se escriben desde la aplicación: las calcula MariaDB.

### 4.4 Triggers

| Trigger | Momento | Efecto |
|---|---|---|
| `calcular_diferencia_horas_insert` | BEFORE INSERT en `registros_asistencia` | Calcula `diferencia_horas` si hay entrada y salida |
| `calcular_diferencia_horas_update` | BEFORE UPDATE en `registros_asistencia` | Recalcula `diferencia_horas` al cambiar entrada o salida (usa `<=>` para tolerar NULL) |
| `after_registro_asistencia_insert` | AFTER INSERT en `registros_asistencia` | Si existe la nómina del período, agrega o actualiza el detalle de horas |

### 4.5 Migraciones

| Archivo | Contenido |
|---|---|
| `001_usuarios.sql` | Crea `usuarios` (email único, rol, `trabajador_id`, activo) |
| `002_asistencia_check.sql` | Reemplaza el CHECK de asistencia para permitir registros abiertos |
| `003_trigger_diferencia_horas.sql` | Corrige el trigger de diferencia con comparación NULL-safe |
| `004_auditoria_asistencia.sql` | Crea `auditoria_asistencia` con FKs y snapshot de valores |
| `005_publicaciones_guardia.sql` | Crea `publicaciones_guardia` y `publicaciones_destinatarios` |
| `006_geolocalizacion.sql` | Agrega GPS a `pacientes` y evidencia de entrada a `registros_asistencia` |
| `007_padron_pacientes_clinicas.sql` | Crea `clinicas` y agrega los campos del padrón a `pacientes` |
| `008_trabajadores_cuit_cbu.sql` | Agrega `cuit` y `cbu` a `trabajadores` y permite DNI nulo |

`migrate.js` registra cada archivo aplicado en `schema_migrations` y no repite los ya ejecutados.

## 5. Autenticación y permisos

### 5.1 Flujo

1. `POST /api/auth/login` recibe `{ email, password }`, valida con bcrypt y devuelve `{ token, usuario }`.
2. El frontend guarda el token y lo envía como `Authorization: Bearer <token>`.
3. `middleware/auth.js` valida la firma y la expiración, y carga `req.usuario`.
4. `auth.requireRole(...roles)` restringe el endpoint.
5. Ante un 401, `services/api.js` elimina el token y redirige al login.

### 5.2 Roles

| Rol | Alcance |
|---|---|
| `admin` | Todo el sistema |
| `coordinador` | Planificación, pacientes, trabajadores, correcciones y nómina |
| `prestador` | Sus guardias, su asistencia y su nómina |

En el frontend, `ProtectedRoute` acepta `roles` y redirige a `/inicio` si el rol no corresponde.

## 6. Endpoints

### 6.1 Autenticación

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| POST | `/api/auth/login` | público | Login con email y contraseña |
| GET | `/api/auth/me` | autenticado | Datos de la sesión actual |

### 6.2 Guardias

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| GET | `/api/guardias` | autenticado | Listado con filtros opcionales; el prestador ve solo las propias |
| GET | `/api/guardias/verificar-conflicto` | admin, coordinador | Verifica solapamiento antes de guardar |
| POST | `/api/guardias` | admin, coordinador | Crea una guardia |
| PUT | `/api/guardias/:id` | admin, coordinador | Edita inicio y fin de una guardia no iniciada, con control de conflicto |

### 6.3 Asistencia

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| GET | `/api/asistencia/actual` | prestador, admin | Guardia accionable del prestador |
| POST | `/api/asistencia/iniciar` | prestador, admin | Registra la entrada real |
| POST | `/api/asistencia/finalizar` | prestador, admin | Registra la salida real |
| POST | `/api/asistencia/entrada` | prestador, admin | Alias de `iniciar` |
| POST | `/api/asistencia/salida` | prestador, admin | Alias de `finalizar` |
| PUT | `/api/asistencia/:horarioId` | admin, coordinador | Corrige entrada y salida con motivo |
| GET | `/api/asistencia/:horarioId/auditoria` | admin, coordinador | Historial de correcciones |

`POST /api/asistencia/iniciar` recibe `{ horario_programado_id, latitud?, longitud?, precision? }`.

- Para el rol `prestador`, si el paciente o su clínica tienen GPS, `latitud` y `longitud` son obligatorias y la distancia debe ser menor o igual a 50 metros. Si falta la ubicación responde 400; si está fuera del radio responde 409 con `distancia_metros` y `radio_metros`.
- Si no hay ubicación de referencia, el inicio se registra sin verificación y la respuesta incluye `advertencia`.
- El rol `admin` puede iniciar sin GPS; no se aplica la validación de distancia.
- La respuesta incluye `verificada`, `ubicacion_origen` (`paciente` o `clinica`), `distancia_metros`, `radio_metros` y `advertencia`.
- La verificación se ejecuta dentro de la transacción, después de bloquear la guardia con `FOR UPDATE`.

### 6.4 Nómina

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| POST | `/api/nomina/generar` | admin, coordinador | Genera o recalcula el período |
| GET | `/api/nomina` | autenticado | Listado por período; el prestador ve lo propio |
| GET | `/api/nomina/:id/detalle` | autenticado con control de propiedad | Detalle por guardia |
| PATCH | `/api/nomina/:id/pagar` | admin, coordinador | Marca como pagada |

### 6.5 Publicaciones

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| GET | `/api/publicaciones` | autenticado | Listado; el prestador ve solo las activas dirigidas a él o a todos |
| POST | `/api/publicaciones` | admin, coordinador | Crea una publicación |
| PUT | `/api/publicaciones/:id` | admin, coordinador | Edita datos y reemplaza los destinatarios |
| PATCH | `/api/publicaciones/:id/estado` | admin, coordinador | Cierra o reabre con `{ activa: boolean }` |

### 6.6 Catálogos y apoyo

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| GET | `/api/pacientes` | autenticado | Lista de pacientes; por defecto solo activos |
| POST | `/api/pacientes` | admin, coordinador | Alta de paciente con datos del padrón, clínica y GPS |
| PUT | `/api/pacientes/:id` | admin, coordinador | Edita los datos de un paciente |
| GET | `/api/clinicas` | autenticado | Lista de clínicas; `?activas=1` filtra activas |
| POST | `/api/clinicas` | admin, coordinador | Alta de clínica |
| PUT | `/api/clinicas/:id` | admin, coordinador | Edita datos, servicios, estado y GPS de una clínica |
| GET | `/api/trabajadores` | autenticado | Lista de trabajadores (alias `/api/prestadores`); `cuit`/`cbu` solo para admin y coordinador |
| POST | `/api/trabajadores` | admin, coordinador | Alta de trabajador |
| PUT | `/api/trabajadores/:id` | admin, coordinador | Edita datos, cargo y estado de un trabajador |
| GET | `/api/cargos` | autenticado | Cargos disponibles para el formulario de trabajadores |
| GET | `/api/asignaciones/buscar` | autenticado | Busca una asignación activa |
| GET | `/api/asignaciones/trabajadores` | autenticado | Asignados y disponibles para un paciente |
| POST | `/api/asignaciones/buscar-o-crear` | admin, coordinador | Crea la asignación si no existe |
| GET | `/api/calendario` | autenticado | Guardias para el rango visible |
| GET | `/api/reemplazos/sugerir/:horario_id` | admin, coordinador | Sugerencia de reemplazos |

`GET /api/pacientes` acepta `?incluir_inactivos=1` y `?clinica_id=<id>`. Cada fila devuelve `clinica_nombre`, `clinica_activa` y `tiene_ubicacion`, además de los campos del padrón.

`GET /api/clinicas` devuelve `servicios` como texto y `activa` como 0/1. El alta y la edición validan nombre obligatorio, límites de longitud, coordenadas dentro de rango y nombre único (409 si se repite).

### 6.7 Filtros del listado de guardias

`GET /api/guardias` acepta estos parámetros de consulta, todos opcionales y combinables:

| Parámetro | Tipo | Efecto |
|---|---|---|
| `desde` | fecha o fecha-hora | `fecha_hora_entrada >= desde` |
| `hasta` | fecha o fecha-hora | `fecha_hora_entrada < hasta`; si es solo fecha, se suma un día para incluir el día completo |
| `paciente_id` | entero | Filtra por paciente |
| `trabajador_id` | entero | Filtra por prestador; se ignora para el rol `prestador`, que ya está limitado a sus guardias |
| `estado` | `pendiente` / `en_curso` / `finalizada` | Filtra por estado derivado; un valor distinto responde 400 |

Los estados se traducen a condiciones sobre las columnas reales: sin entrada (`pendiente`), entrada sin salida (`en_curso`) y con salida (`finalizada`).

El frontend aplica los filtros contra la API y calcula el resumen (guardias, finalizadas, horas trabajadas, extras y faltantes) sobre la respuesta ya filtrada.

## 7. Reglas de negocio

### 7.1 Ventana de inicio

Definida en `controllers/asistencia.controller.js`:

- `HORAS_ANTES_INICIO = 2`
- `HORAS_DESPUES_FIN = 12`

Una guardia se puede iniciar entre 2 horas antes de su entrada programada y 12 horas después de su salida programada. Fuera de ese rango responde con error de ventana.

### 7.2 Estados de guardia

No se almacenan: se derivan de `registros_asistencia`.

| Condición | Estado |
|---|---|
| Sin entrada real | `pendiente` |
| Entrada real y sin salida | `en_curso` |
| Entrada y salida reales | `finalizada` |

### 7.3 Conflictos de horario

Se considera conflicto cuando el mismo trabajador tiene otra guardia que se superpone:

```sql
entrada_existente < nueva_salida AND salida_existente > nueva_entrada
```

En la edición se excluye la guardia actual. Además, una guardia con entrada registrada no se puede mover ni cambiar de horario.

`PUT /api/guardias/:id` recibe `{ fecha_hora_entrada, fecha_hora_salida }`, valida el orden y el conflicto del prestador, y responde 409 tanto por superposición como por guardia ya iniciada.

En el frontend, la creación usa `components/ModalGuardia.jsx` (Inicio y Fin editables con `datetime-local`) y la edición desde la lista usa `components/ModalHorario.jsx`, cuyo botón **Editar horario** se deshabilita cuando la guardia ya tiene `fecha_hora_entrada_real`.

### 7.4 Horas y diferencia

- `horas_reales` y `horas_estimadas` son columnas generadas.
- `diferencia_horas = horas_reales - horas_estimadas`, calculada por los triggers.
- `vista_horarios_completa.estado_cumplimiento` usa un umbral de ±0.0167 h (aproximadamente 1 minuto) para clasificar Horas extras, Horas faltantes o Cumplido.

### 7.5 Nómina

- `POST /api/nomina/generar` recibe `{ mes, anio }`.
- Toma las guardias finalizadas del período desde `vista_calculo_nomina`, que agrupa horas normales y feriado por trabajador y paciente.
- Precio aplicado: `asignaciones.precio_hora_normal` / `precio_hora_feriado` si están definidos; si son NULL, usa el `precios_base` vigente para el cargo del trabajador.
- Un día es feriado si la fecha de entrada coincide con `feriados.fecha`.
- Si la nómina del período no está pagada, se recalcula: se actualizan totales y se reemplaza el detalle.
- Si ya está pagada, se omite y se informa en el resumen.
- `PATCH /api/nomina/:id/pagar` registra `pagado = 1` y `fecha_pago`; una segunda llamada responde 409.

### 7.6 Auditoría de asistencia

- Solo se corrigen registros con entrada y salida reales.
- Se exige un motivo de al menos 5 caracteres.
- La salida debe ser posterior a la entrada.
- La actualización y la inserción en `auditoria_asistencia` ocurren en la misma transacción.
- Se guarda el email del usuario como snapshot, además del `usuario_id` y el `horario_programado_id`.

### 7.7 Publicaciones

- Una publicación es una vidriera independiente: no crea ni modifica `horarios_programados`.
- Guarda un snapshot editable de `direccion` y `patologia`; el frontend los precarga desde `pacientes` al elegir el paciente.
- `para_todos = 1` alcanza a todos los prestadores; si es 0 se exige al menos un registro en `publicaciones_destinatarios`.
- Validaciones: paciente existente, entrada y salida obligatorias con fin posterior al inicio, precio numérico entre 0 y 99999999.99, dirección de hasta 200 caracteres y patología de hasta 5000.
- `activa = 0` oculta la publicación a los prestadores sin borrarla.
- El prestador recibe solo publicaciones activas y visibles para él; la respuesta le devuelve `destinatarios: []` para no exponer el alcance.
- La creación, la edición y el reemplazo de destinatarios se ejecutan en una transacción.

### 7.8 Gestión de pacientes y clínicas

- `POST /api/pacientes` y `PUT /api/pacientes/:id` aceptan `nombre`, `edad`, `patologia`, `direccion`, `telefono_propio`, `familiar_responsable`, `localidad`, `tipo_servicio`, `modalidad`, `dias_prestacion`, `horario_prestacion`, `horas_prestacion`, `fecha_inicio`, `fecha_baja`, `motivo_baja`, `codigo_padron`, `clinica_id`, `latitud`, `longitud` y `activo`.
- El nombre es obligatorio (100 caracteres). Límites: dirección 200, teléfono 20, patología 5000, familiar 150, localidad 100, tipo de servicio 50, modalidad 100, días 100, horario 150, horas 30, motivo de baja 255 y código de padrón 10.
- La edad debe ser un entero entre 0 y 120. La fecha de baja no puede ser anterior a la fecha de inicio.
- `clinica_id` se valida contra `clinicas`; si no existe responde 400.
- `latitud` y `longitud` deben enviarse juntas y dentro de los rangos válidos.
- `activo` es opcional en la edición: si se omite se conserva el valor actual; en el alta vale 1 por defecto.
- Los pacientes no se eliminan desde la interfaz: se marcan inactivos con fecha y motivo de baja.
- Las clínicas se validan con nombre obligatorio y único; `servicios` es un resumen de texto de hasta 5000 caracteres.
- Si el `UPDATE` no cambia filas, se consulta la existencia del registro para distinguir una edición sin cambios de un 404 real.
- El frontend muestra Pacientes y Clínicas solo a `admin` y `coordinador`; `ProtectedRoute` redirige al prestador a `/inicio`.

**Trabajadores**

- `POST /api/trabajadores` y `PUT /api/trabajadores/:id` reciben `{ nombre, dni, cuit, cbu, cargo_id, telefono, telefono_alternativo, activo }`; nombre y cargo son obligatorios.
- El DNI y el CUIT/CUIL son opcionales, pero se recomienda completar al menos uno. El DNI puede quedar nulo para prestadores que solo tienen CUIT.
- `utils/documentos.js` centraliza la normalización: DNI y teléfonos se guardan solo con dígitos; el CUIT se guarda con 11 dígitos y, si llega con 10, se completa el dígito verificador; el CBU/CVU numérico se guarda solo con dígitos y los alias se conservan sin espacios ni el asterisco inicial.
- El frontend aplica formato de visualización (puntos en DNI, guiones en CUIT, espacios en CBU y teléfonos) pero envía los valores normalizados. El backend vuelve a normalizar antes de guardar.
- El DNI y el CUIT son únicos en `trabajadores`; un duplicado responde 409 con un mensaje que menciona ambos campos.
- El cargo se valida contra `cargos` antes de guardar.
- `GET /api/trabajadores` devuelve `cuit` y `cbu` solo cuando el usuario es `admin` o `coordinador`; para el resto de los roles esos campos llegan nulos.
- Los trabajadores no se eliminan desde la interfaz: se marcan inactivos y conservan su historial.

### 7.9 Geolocalización y radio de 50 metros

- `utils/geo.js` expone `RADIO_VERIFICACION_METROS = 50`, `aNumero`, `coordenadaValida` y `distanciaMetros` (Haversine con radio terrestre de 6.371.000 m).
- Al iniciar una guardia, el servidor busca primero el GPS del paciente; si no existe, usa el de su clínica. El campo `ubicacion_origen` indica cuál se usó.
- Si hay referencia y el usuario es `prestador`, se exige `latitud`/`longitud` y se rechaza con 409 cuando la distancia supera los 50 m.
- Si no hay referencia, el inicio se registra igual y se devuelve una `advertencia`; la guardia no queda verificada.
- El rol `admin` queda exento de la validación para permitir correcciones y pruebas.
- La evidencia se guarda en `registros_asistencia`: `latitud_entrada`, `longitud_entrada`, `precision_entrada` y `distancia_entrada`.
- La validación del servidor no es antifraude: las coordenadas las envía el cliente y podrían simularse. El objetivo es verificar la presencia operativa, no autenticar el dispositivo.

### 7.10 Importación del padrón de prestaciones

- `scripts/importar-padron.js` lee el Excel indicado por parámetro y no lo copia al repositorio.
- Sin `--apply` ejecuta todo dentro de una transacción y hace rollback: es una simulación con el mismo resumen que la importación real.
- Hojas usadas: `DOMICILIOS` como pacientes activos, `DOMICILIOS DADOS DE BAJA` como inactivos y `CLINICAS` solo para clínicas. No se crean pacientes institucionales desde `CLINICAS`.
- Los servicios de cada clínica se guardan como un resumen de texto separado por `; `.
- La importación es idempotente por nombre normalizado (mayúsculas, sin acentos y con espacios colapsados): si el paciente o la clínica ya existe, se omite y se informa.
- `RESIDENCIA SAN NICOLAS` se importa como clínica inactiva porque la hoja la marca como baja.
- Las fechas de Excel se convierten a `YYYY-MM-DD`; las horas con formato problemático se conservan como texto en `horas_prestacion`.
- Al finalizar informa clínicas y pacientes insertados, ya existentes y una lista de advertencias por datos faltantes o repetidos.

### 7.11 Importación de la nómina mensual

- `scripts/importar-nomina.js` lee el Excel indicado por parámetro y no lo copia al repositorio.
- Sin `--apply` ejecuta todo dentro de una transacción y hace rollback: es una simulación con el mismo resumen que la importación real.
- `--fecha-inicio=YYYY-MM-DD` define la fecha de inicio de las asignaciones; por defecto es `2026-10-01`.
- El libro tiene una hoja por paciente y una hoja de resumen (`ruth presilla`), que se omite. Cada hoja de detalle se asocia a un paciente por nombre normalizado; los alias conocidos están en `ALIAS_PACIENTES` dentro del script.
- Si una hoja no coincide con ningún paciente, se crea el paciente solo con el nombre y `activo = 1`. En la nómina de octubre se crearon `ANGEL NOVOA`, `ROSA DE PIANO` y `MONICA DIANA`.
- Los trabajadores se buscan primero por CUIT y, si no hay CUIT, por nombre normalizado. Los nuevos se crean con el cargo `Cuidador`, `activo = 1`, CUIT/CBU de la nómina y DNI derivado de los 8 dígitos centrales del CUIT cuando no hay conflicto con otro DNI.
- Los CUIT de 10 dígitos se completan con el dígito verificador. Los CUIT con verificador inválido se importan igual y se informan como advertencia.
- Los CBU/CVU se guardan sin `*`, espacios ni saltos de línea. Los alias se conservan tal cual. Los CBU numéricos que no tienen 22 dígitos se informan como advertencia.
- Las asignaciones guardan `precio_hora_normal` y `precio_hora_feriado` de la fila. Si el paciente está activo, la asignación queda activa y sin `fecha_fin`; si está inactivo, queda inactiva y con `fecha_fin` en el último día del mes de `--fecha-inicio`.
- La importación es idempotente: volver a ejecutarla no crea trabajadores, pacientes ni asignaciones duplicadas y solo actualiza las asignaciones cuyos precios o fechas cambiaron.
- Al finalizar informa hojas procesadas y omitidas, pacientes creados, trabajadores distintos/creados/actualizados, asignaciones activas e inactivas, alias usados y advertencias de calidad de datos (sin CUIT, sin CBU, CBU compartidos, CUIT inválidos).

## 8. Frontend

### 8.1 Rutas

| Ruta | Pantalla | Acceso |
|---|---|---|
| `/` | Login | Público |
| `/inicio` | Inicio | Autenticado |
| `/guardias` | Guardias | Autenticado |
| `/publicaciones` | Publicaciones | Autenticado; los prestadores solo ven las dirigidas a ellos o a todos |
| `/pacientes` | Pacientes | `admin`, `coordinador` |
| `/clinicas` | Clínicas | `admin`, `coordinador` |
| `/trabajadores` | Trabajadores | `admin`, `coordinador` |
| `/calendario` | Calendario | Autenticado |
| `/nomina` | Nómina | Autenticado |
| `/manual` | Manual de usuario | Autenticado |
| `/manual-tecnico` | Manual técnico | Solo `admin` |

### 8.2 Estilos

Cada pantalla y componente tiene su módulo CSS; los estilos compartidos están en `src/styles/common.module.css`.

| Archivo | Uso |
|---|---|
| `styles/common.module.css` | Página, tablas, errores, badges, botones y modales |
| `components/Layout.module.css` | Barra de navegación y contenedor |
| `pages/Login.module.css`, `Inicio.module.css`, `Guardias.module.css`, `Publicaciones.module.css`, `Pacientes.module.css`, `Clinicas.module.css`, `Trabajadores.module.css`, `Calendario.module.css`, `Nomina.module.css` | Estilos por pantalla |
| `styles/tablaDatos.module.css` | Tabla responsive compartida por Pacientes, Clínicas y Trabajadores |
| `components/ManualDocumento.module.css` | Tipografía y tablas del manual |
| `components/ModalAsistencia.module.css` | Tabla del historial de auditoría |
| `components/ModalPublicacion.module.css` | Alta y edición de publicaciones, selección de destinatarios |
| `components/ModalPaciente.module.css`, `ModalClinica.module.css`, `ModalTrabajador.module.css` | Grillas de campos de los formularios de alta y edición |
| `components/SelectorUbicacion.module.css` | Mapa Leaflet, acciones y mensajes de ubicación |

`components/ModalHorario.jsx` (edición de inicio y fin desde la lista) reutiliza los estilos de modal de `common.module.css`.

`utils/formato.js` centraliza el formato de DNI, CUIT/CUIL, CBU/CVU y teléfonos para la interfaz. Los formularios envían los valores normalizados y el backend los vuelve a normalizar antes de guardar.

`App.css` solo conserva el contenedor `#root` y las reglas de impresión.

El diseño es responsive: `#root` reduce su padding en pantallas chicas, la barra de navegación se apila por debajo de 720 px y la tabla de **Guardias** pasa a fichas con etiquetas por debajo de 980 px. Los filtros usan una grilla de dos columnas en móvil, los modales apilan sus botones por debajo de 600 px y las tablas anchas (Nómina, auditoría) se envuelven en contenedores con scroll horizontal. La grilla de **Publicaciones** pasa a una columna por debajo de 560 px. Las tablas de **Pacientes**, **Clínicas** y **Trabajadores** usan `styles/tablaDatos.module.css` y pasan a fichas con etiquetas por debajo de 980 px.

El mapa de `components/SelectorUbicacion.jsx` usa Leaflet con teselas de OpenStreetMap. Se dibuja un `circleMarker` en lugar de un `Marker` para evitar el problema de iconos de Leaflet con Vite. La geolocalización del navegador requiere HTTPS o `localhost`; en un celular que accede por IP local con HTTP el permiso puede quedar bloqueado.

### 8.3 Manuales dentro de la aplicación

- Los textos viven en `docs/manual-usuario.md` y `docs/manual-tecnico.md`.
- `pages/Manual.jsx` y `pages/ManualTecnico.jsx` los importan con `?raw`.
- `utils/markdown.js` convierte el Markdown a HTML: títulos con `id`, tablas, listas anidadas, código, citas y énfasis.
- `vite.config.js` habilita `server.fs.allow` con la raíz del repositorio para poder leer `docs/` en desarrollo.
- El botón **Imprimir / Guardar PDF** usa `window.print()`; las reglas `@media print` ocultan la navegación y adaptan el contenido a papel.

Para actualizar un manual basta con editar el `.md`: la aplicación lo refleja al recargar.

## 9. Verificación y mantenimiento

### 9.1 Controles rápidos

```bash
cd frontend
npm run lint
npm run build
```

El build puede mostrar una advertencia de chunk mayor a 500 kB; es esperada por el peso de FullCalendar.

### 9.2 Pruebas manuales sugeridas

1. Login con cada rol y verificar la navegación visible.
2. Crear una guardia para hoy y confirmar que aparece en **Guardias**.
3. Iniciar y finalizar con el prestador; revisar horas reales.
4. Corregir con coordinador y verificar el historial de auditoría.
5. Generar la nómina del período y marcar como pagada.
6. Crear una publicación para un prestador y verificar que solo ese prestador la ve.
7. Editar un paciente y un trabajador; comprobar que el DNI o el CUIT duplicado responde con un aviso y que los teléfonos, CUIT y CBU se guardan normalizados.
8. Abrir el manual de usuario y el manual técnico.
9. Crear y editar una clínica; verificar que el nombre duplicado responde 409 y que el GPS se guarda.
10. Iniciar una guardia con el prestador a 49 m, 50 m y 51 m de un paciente geolocalizado; los dos primeros deben iniciar y el tercero debe responder 409.
11. Iniciar una guardia de un paciente sin GPS: debe iniciar con advertencia y guardar la entrada sin coordenadas.
12. Iniciar una guardia de un paciente internado sin GPS propio: debe usar el GPS de la clínica como referencia.
13. Ejecutar `node scripts/importar-padron.js "<ruta.xlsx>"` y comprobar que la simulación no modifica la base.
14. Ejecutar `node scripts/importar-nomina.js "<ruta.xlsx>"` y comprobar que la simulación no modifica la base; repetir con `--apply` y verificar que una segunda ejecución no duplica trabajadores, pacientes ni asignaciones.
15. Abrir **Calendario**, elegir un paciente con asignaciones importadas y comprobar que sus prestadores aparecen bajo **Asignados al paciente**.

### 9.3 Limpieza de datos de prueba

El seed reinicia la guardia demo y su asistencia. Para datos de prueba creados a mano, eliminar primero `auditoria_asistencia`, luego `registros_asistencia`, después `horarios_programados` y por último `detalle_horas_trabajadas` / `nomina_mensual` si corresponde, respetando las claves foráneas. Si se probaron clínicas o pacientes temporales, eliminarlos después de sus asignaciones y guardias.

## 10. Próximos pasos

- Exportación de los listados filtrados (CSV o planilla).
- Posibles mejoras: gestión de usuarios y precios desde la interfaz, paginación de listados y pruebas automatizadas.
