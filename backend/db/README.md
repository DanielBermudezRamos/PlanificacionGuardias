# Base de datos

Las migraciones son incrementales sobre el esquema existente de `sistema_permed`
(MariaDB 10.4). No recrean la base completa.

## Comandos

Desde `backend/`:

```bash
npm run migrate   # aplica db/migrations/*.sql en orden
npm run seed      # carga datos demo (idempotente, solo desarrollo)
npm run db:setup  # migrate + seed
```

Las migraciones aplicadas se registran en la tabla `schema_migrations`, por lo
que se pueden volver a ejecutar sin repetir trabajo.

## Migraciones incluidas

| Archivo | Que hace |
|---|---|
| `001_usuarios.sql` | Crea `usuarios` (email, hash bcrypt, rol, `trabajador_id`). El login dependia de esta tabla y no existia. |
| `002_asistencia_check.sql` | Reemplaza el CHECK de `registros_asistencia` para permitir guardias abiertas (entrada sin salida). Necesario para iniciar/finalizar guardia. |
| `003_trigger_diferencia_horas.sql` | Corrige el trigger de diferencia de horas con comparacion NULL-safe. |
| `004_auditoria_asistencia.sql` | Crea la auditoria de correcciones de asistencia. |
| `005_publicaciones_guardia.sql` | Crea publicaciones y destinatarios. |
| `006_geolocalizacion.sql` | Agrega GPS a pacientes y evidencia de entrada a registros de asistencia. |
| `007_padron_pacientes_clinicas.sql` | Crea clinicas y agrega los campos del padron a pacientes. |
| `008_trabajadores_cuit_cbu.sql` | Agrega CUIT/CUIL y CBU/CVU a trabajadores y permite DNI nulo. |

## Seed de desarrollo

El seed crea o actualiza, de forma repetible:

- cargo `Enfermero`
- trabajador `Prestador Demo` (DNI `30000001`)
- paciente `Paciente Demo`
- asignacion activa entre ambos
- una guardia para hoy, desde 1 hora antes hasta 7 horas despues de ejecutar el seed
- usuarios de acceso:
  - `coordinador@permed.local` / `Coord123!`
  - `prestador@permed.local` / `Prest123!`

El seed **reinicia la asistencia de la guardia demo** (solo de esa guardia) para
poder probar el boton desde cero. No usar en produccion.

## Configuracion

Los scripts leen `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` y `DB_NAME`, con
los mismos valores por defecto que `backend/config/db.js`.

```bash
DB_HOST=localhost DB_USER=root DB_PASSWORD= DB_NAME=sistema_permed npm run db:setup
```
