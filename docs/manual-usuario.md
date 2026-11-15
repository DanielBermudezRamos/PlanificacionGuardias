# Manual de usuario — PERMED

Guía práctica para publicar guardias, gestionar pacientes y trabajadores, registrar la asistencia y liquidar la nómina.

- **Última actualización:** noviembre de 2026.
- **Dirigido a:** administradores, coordinadores y prestadores.
- **Disponible en la aplicación:** menú **Manual**.
- **Manual técnico:** menú **Manual técnico** (visible solo para administradores).

---

## 1. Qué es PERMED

PERMED organiza la atención domiciliaria de pacientes y permite:

- planificar qué prestador cubre cada guardia y en qué horario,
- publicar guardias con sus características para que los prestadores las vean,
- mantener actualizados los datos de pacientes y trabajadores,
- registrar la hora real de inicio y de fin de cada guardia,
- calcular las horas trabajadas y compararlas con lo planificado,
- liquidar la nómina mensual de cada prestador.

### 1.1 Roles

| Rol | Para qué sirve |
|---|---|
| Administrador | Acceso completo al sistema. Puede ver y gestionar todo, incluido el manual técnico. |
| Coordinador | Planifica las guardias, publica guardias para los prestadores, gestiona pacientes, clínicas y trabajadores, corrige registros de asistencia y gestiona la nómina. |
| Prestador | Cumple las guardias asignadas, registra su jornada y consulta su propia información. |

### 1.2 Permisos por acción

| Acción | Administrador | Coordinador | Prestador |
|---|:---:|:---:|:---:|
| Ver guardias | Todas | Todas | Solo las propias |
| Crear y mover guardias | Sí | Sí | No |
| Publicar guardias y elegir destinatarios | Sí | Sí | No |
| Ver publicaciones | Todas | Todas | Solo las dirigidas a él o a todos |
| Ver y editar pacientes | Sí | Sí | No |
| Ver y editar clínicas | Sí | Sí | No |
| Ver y editar trabajadores | Sí | Sí | No |
| Iniciar y finalizar guardias desde Inicio | No | No | Sí |
| Corregir asistencia | Sí | Sí | No |
| Generar y pagar la nómina | Sí | Sí | No |
| Ver la nómina | Todas | Todas | Solo la propia |
| Ver el manual técnico | Sí | No | No |

---

## 2. Cómo ingresar

### 2.1 Ingreso

1. Abrir el navegador en la dirección que te indicó el administrador. En la instalación de prueba es `http://localhost:5173`.
2. Escribir el **email** de la cuenta y la **contraseña**.
3. Presionar **Ingresar**.
4. La aplicación abre en la pantalla **Inicio**.

La sesión se mantiene aunque recargues la página. Por seguridad vence pasado un tiempo; si eso ocurre, la aplicación vuelve al login y hay que ingresar de nuevo.

**Ejemplo**

- Email: coordinador@permed.local
- Contraseña: Coord123!
- Resultado esperado: ingreso a **Inicio** con el nombre “Coordinador Demo” y el rol coordinador.

### 2.2 Cerrar sesión

En la barra superior, presionar **Salir**. La sesión se cierra y volvés al login.

### 2.3 Si no podés ingresar

| Mensaje | Qué hacer |
|---|---|
| Credenciales inválidas | Revisá el email y la contraseña. Si el problema continúa, pedile al administrador que restablezca la clave. |
| Usuario inactivo | La cuenta está deshabilitada. Consultá con el administrador. |
| Email y contraseña son obligatorios | Completá los dos campos antes de ingresar. |

---

## 3. Pantalla Inicio

Es la pantalla que aparece al ingresar. El prestador ve acá la guardia que puede iniciar o finalizar en ese momento.

### 3.1 Qué muestra la tarjeta de guardia

| Elemento | Significado |
|---|---|
| Paciente | Persona a la que corresponde la guardia |
| Estado | Pendiente, En curso o Finalizada |
| Inicio y fin programados | Horario planificado por el coordinador |
| Duración estimada | Horas previstas para esa guardia |
| Inicio y fin reales | Se completan cuando registrás la entrada y la salida |
| Ubicación GPS | Indica si el paciente tiene una ubicación cargada para verificar el inicio |
| Botón Iniciar guardia | Aparece cuando la guardia se puede iniciar |
| Botón Finalizar guardia | Aparece mientras la guardia está en curso |
| Próxima guardia | Se muestra cuando todavía no hay una guardia para iniciar |

### 3.2 Cuándo se puede iniciar una guardia

Una guardia se puede iniciar desde **2 horas antes** de su hora de inicio hasta **12 horas después** de su hora de fin.

Fuera de ese período, la tarjeta muestra el texto “Podés iniciar esta guardia desde …” con la fecha y hora habilitadas.

**Ejemplo**

- Guardia programada: lunes 16/11/2026 de 08:00 a 16:00.
- Se puede iniciar desde las 06:00 del 16/11 hasta las 04:00 del 17/11.
- Si el prestador entra a las 07:30, ve el botón **Iniciar guardia**.
- Si entra a las 04:30 del 15/11, ve el aviso con la fecha habilitada y no puede iniciar.

### 3.3 Iniciar una guardia

1. Ingresar con el usuario prestador.
2. En **Inicio**, ubicar la tarjeta de la guardia pendiente.
3. Revisar el aviso de ubicación que muestra la tarjeta.
4. Presionar **Iniciar guardia**.
5. Si el navegador pide permiso para usar la ubicación, elegir **Permitir**.
6. Esperar el mensaje **Verificando ubicación...**.
7. El estado pasa a **En curso** y el botón cambia a **Finalizar guardia**.
8. La hora real de entrada queda registrada junto con la ubicación.

**Si el paciente tiene ubicación GPS cargada**

- El sistema compara tu ubicación con la del paciente.
- Si estás a **50 metros o menos**, la guardia se inicia y se muestra la distancia verificada.
- Si estás a más de 50 metros, aparece un aviso con la distancia y la guardia **no se inicia**. Acercate al domicilio e intentá de nuevo.
- Si el paciente está internado y no tiene GPS propio, se usa la ubicación de la clínica.

**Si el paciente no tiene ubicación GPS**

- La tarjeta muestra el aviso “Este paciente no tiene ubicación GPS cargada”.
- Podés iniciar la guardia igualmente.
- El inicio queda registrado **sin verificación** y el sistema lo informa al finalizar la acción.

**Importante**

- La ubicación se pide solamente al iniciar la guardia, no al finalizarla.
- Si rechazás el permiso de ubicación, el sistema no permite iniciar una guardia que requiere verificación.
- Si el aviso de ubicación no aparece o el navegador no puede obtenerla, consultá con administración.

**Ejemplo**

- El paciente tiene GPS en su domicilio.
- El prestador llega y presiona **Iniciar guardia** a 30 metros del domicilio.
- Resultado: la guardia se inicia y el mensaje indica que la ubicación fue verificada a 30 metros.
- Si el prestador estuviera a 80 metros, vería el aviso de fuera de radio y la guardia seguiría pendiente.

### 3.4 Finalizar una guardia

1. Con la guardia **En curso**, presionar **Finalizar guardia**.
2. Se registra la hora real de salida.
3. La guardia deja de estar disponible como acción y se calculan las horas reales.

**Ejemplo completo**

- Guardia: 16/11/2026 de 08:00 a 16:00 (8 horas estimadas).
- El prestador inicia a las 08:05 y finaliza a las 15:55.
- Resultado: horas reales 7.83 y una diferencia de −0.17 horas respecto de lo planificado.
- En **Guardias** la fila queda como **Finalizada**.

### 3.5 Vista de administrador y coordinador

Muestra el saludo, el rol de la sesión y accesos directos a **Guardias**, **Publicaciones**, **Calendario**, **Pacientes**, **Clínicas** y **Trabajadores**. Los usuarios de gestión no inician guardias desde esta pantalla.

---

## 4. Pantalla Guardias

Lista las guardias y su estado de asistencia.

### 4.1 Filtrar guardias

La barra de filtros permite acotar la lista sin modificar ningún dato.

| Filtro | Qué hace |
|---|---|
| Desde / Hasta | Muestra las guardias cuyo inicio programado cae en ese rango. Si elegís solo la fecha "Hasta", se incluye ese día completo. |
| Paciente | Muestra solo las guardias del paciente elegido. |
| Prestador | Muestra solo las guardias del prestador elegido. No aparece para el rol prestador, que ya ve únicamente las propias. |
| Estado | Pendiente, En curso o Finalizada. |
| Limpiar filtros | Vuelve a mostrar todas las guardias. |

Debajo de los filtros aparece un resumen de lo que se está viendo: cantidad de guardias, cuántas están finalizadas, horas trabajadas, horas extras y horas faltantes.

**Ejemplo**

- Rango: 01/12/2026 a 31/12/2026.
- Estado: Finalizada.
- Resultado: solo las guardias de diciembre que ya tienen entrada y salida registradas, con la suma de sus horas en el resumen.

### 4.2 Cómo leer la tabla

| Columna | Qué indica |
|---|---|
| Paciente | Paciente asignado a la guardia |
| Prestador | Trabajador que la cubre |
| Entrada programada | Inicio planificado |
| Salida programada | Fin planificado |
| Entrada real | Hora en que el prestador inició (o — si no inició) |
| Salida real | Hora en que el prestador finalizó (o — si no finalizó) |
| Horas | Horas reales trabajadas |
| Estado | Pendiente, En curso o Finalizada |
| Acciones | Solo administrador y coordinador: botón **Editar horario** y botón **Corregir** |

El prestador ve únicamente sus propias guardias. El administrador y el coordinador ven todas.

### 4.3 Estados

| Estado | Significado |
|---|---|
| Pendiente | Todavía no se registró la entrada |
| En curso | Hay entrada registrada y todavía no hay salida |
| Finalizada | Hay entrada y salida registradas |

### 4.4 Corregir una asistencia

Sirve para ajustar la entrada o la salida real de una guardia ya cerrada, dejando constancia de quién hizo el cambio y por qué.

**Condiciones**

- La guardia debe tener entrada y salida reales registradas. Si falta alguna, el botón **Corregir** aparece deshabilitado.
- Hay que escribir un motivo de al menos 5 caracteres.
- La salida corregida debe ser posterior a la entrada.

**Pasos**

1. Ingresar como administrador o coordinador.
2. Ir a **Guardias**.
3. En la fila de una guardia finalizada, presionar **Corregir**.
4. Ajustar la **Entrada real** y/o la **Salida real**.
5. Escribir el **Motivo de la corrección**.
6. Presionar **Guardar corrección**.

**Resultado**

- La fila se actualiza con las nuevas horas.
- El modal muestra el **Historial de correcciones** con la fecha, el usuario, el motivo, los valores anteriores y nuevos, y la diferencia resultante.
- Las horas y la diferencia se recalculan automáticamente.

**Ejemplo**

- Guardia: 16/11/2026 de 08:00 a 16:00.
- Registro original: entrada 08:20, salida 15:40 (7.33 horas).
- Corrección: entrada 08:05, salida 15:55.
- Motivo: “El prestador registró tarde la entrada”.
- Resultado: 7.83 horas reales; el historial muestra 08:20 → 08:05 y 15:40 → 15:55.

### 4.5 Editar el inicio y el fin de una guardia

Sirve para cambiar el horario **programado** de una guardia que todavía no fue iniciada: se puede adelantar, retrasar, acortar o alargar.

**Condiciones**

- Solo administrador y coordinador.
- La guardia no debe tener entrada real registrada. Si ya fue iniciada, el botón **Editar horario** aparece deshabilitado.
- El fin debe ser posterior al inicio.
- No puede quedar superpuesta con otra guardia del mismo prestador.

**Pasos**

1. Ingresar como administrador o coordinador.
2. Ir a **Guardias**.
3. En la fila de una guardia **Pendiente**, presionar **Editar horario**.
4. Ajustar el **Inicio programado** y/o el **Fin programado**.
5. Presionar **Guardar cambios**.

**Resultado**

- La fila muestra el nuevo horario y la duración estimada se recalcula sola.
- Si el nuevo horario se superpone con otra guardia del prestador, el sistema no guarda y explica el motivo.
- Si la guardia ya había sido iniciada por otra persona mientras editabas, tampoco se guarda.

**Ejemplo**

- Guardia: 14/11/2026 de 00:00 a 15/11/2026 00:00.
- Cambio: inicio 14/11/2026 08:00 y fin 14/11/2026 20:00.
- Resultado: la guardia queda con 12 horas estimadas y sigue **Pendiente**.

El mismo cambio de horario se puede hacer desde el **Calendario**, arrastrando el bloque de la guardia (ver 8.4).

---

## 5. Pantalla Publicaciones

Permite publicar las características de una guardia para que los prestadores las vean. Es una vidriera de guardias: no crea ni modifica la guardia planificada en el calendario.

### 5.1 Qué muestra una publicación

| Dato | Contenido |
|---|---|
| Paciente | Persona a la que corresponde la guardia |
| Dirección | Domicilio donde se realiza |
| Patología | Diagnóstico o cuidados requeridos |
| Horario | Inicio y fin de la guardia |
| Precio | Monto ofrecido por cubrirla |
| Alcance | Todos los prestadores o solo los seleccionados (solo lo ven administración y coordinación) |

### 5.2 Crear una publicación

1. Ingresar como administrador o coordinador.
2. Ir a **Publicaciones**.
3. Presionar **Nueva publicación**.
4. Elegir el **paciente**. La dirección y la patología se completan con los datos del paciente y se pueden ajustar.
5. Completar el **Inicio** y el **Fin**. El fin debe ser posterior al inicio.
6. Escribir el **Precio de la guardia**.
7. En **¿Quiénes pueden verla?**, elegir **Todos los prestadores** o **Solo los prestadores seleccionados** y marcar a quiénes.
8. Presionar **Publicar guardia**.

**Resultado**

- La publicación aparece en la lista con la etiqueta **Activa**.
- Los prestadores elegidos la ven en su propia pantalla **Publicaciones**.
- Si elegiste **Todos**, la ven todos los prestadores.

**Ejemplo**

- Paciente: Paciente Demo.
- Dirección: Av. Siempre Viva 742.
- Patología: Control post operatorio.
- Horario: 20/12/2026 de 06:00 a 18:00.
- Precio: 30.000,00.
- Alcance: Prestador Demo.
- Resultado: el prestador ve la publicación con todos esos datos en **Publicaciones**.

### 5.3 Editar, cerrar y reabrir

| Acción | Qué hace |
|---|---|
| Editar | Permite cambiar el paciente, la dirección, la patología, el horario, el precio o los destinatarios |
| Cerrar | La oculta de la vista de los prestadores; la publicación queda como **Cerrada** para administración |
| Reabrir | Vuelve a mostrarla a los prestadores elegidos |

Una publicación cerrada no se borra: sigue visible para administración y coordinación con la etiqueta **Cerrada**.

### 5.4 Vista del prestador

- Ve solo las publicaciones activas dirigidas a él o a todos los prestadores.
- No ve la lista de otros prestadores destinatarios.
- No puede crear, editar, cerrar ni reabrir publicaciones.
- Cada tarjeta muestra el paciente, el precio, el horario, la dirección y la patología.

---

## 6. Pantalla Pacientes

Permite consultar y actualizar los datos de los pacientes. Solo la ven el administrador y el coordinador.

### 6.1 Filtrar pacientes

| Filtro | Para qué sirve |
|---|---|
| Buscar | Nombre, edad, dirección, localidad, teléfono, familiar responsable, patología, servicio, modalidad, días, clínica, motivo de baja o código de padrón |
| Estado | Muestra solo activos, solo inactivos o todos |
| Clínica | Muestra solo los pacientes de una clínica o residencia |

El contador indica cuántos pacientes se ven sobre el total.

### 6.2 Editar un paciente

1. Presionar **Editar** en la fila del paciente.
2. Cambiar los datos necesarios.
3. Presionar **Guardar cambios**.

El formulario está dividido en secciones:

| Sección | Datos |
|---|---|
| Datos del paciente | Nombre, edad, teléfono de contacto, familiar responsable, patología y código de padrón |
| Domicilio | Dirección y localidad |
| Prestación | Tipo de servicio, modalidad, días, horario, horas y fecha de inicio |
| Internación | Clínica o residencia donde está internado, o **Sin clínica** si es en domicilio |
| Estado | Paciente activo, fecha de baja y motivo de baja |
| Ubicación GPS | Mapa y coordenadas del domicilio o de la clínica |

**Validaciones**

- El nombre es obligatorio.
- La edad debe ser un número entre 0 y 120.
- La fecha de baja no puede ser anterior a la fecha de inicio.
- Si elegís una clínica, podés usar su dirección y su ubicación GPS como punto de partida.
- Los pacientes no se borran: se marcan como inactivos con fecha y motivo.

**Resultado**

- Los datos actualizados se usan en las próximas guardias y publicaciones.
- Las publicaciones ya creadas conservan la dirección y la patología que tenían al publicarse.

### 6.3 Crear un paciente

1. Presionar **Nuevo paciente**.
2. Completar al menos el **Nombre**.
3. Completar los datos de contacto, domicilio y prestación si los tenés.
4. Elegir una **Clínica** si el paciente está internado.
5. Cargar la **Ubicación GPS** si querés verificar el inicio de las guardias.
6. Presionar **Crear paciente**.

### 6.4 Cargar la ubicación GPS

1. Abrir el alta o la edición de un paciente.
2. Ir a la sección **Ubicación GPS**.
3. Mover el mapa y hacer clic en el domicilio, o presionar **Usar ubicación actual**.
4. Revisar las coordenadas que aparecen debajo del mapa.
5. Presionar **Guardar cambios** o **Crear paciente**.

| Acción | Qué hace |
|---|---|
| Clic en el mapa | Marca el punto exacto del domicilio |
| Usar ubicación actual | Toma la ubicación del dispositivo y pide permiso al navegador |
| Quitar ubicación | Deja al paciente sin GPS |
| Ver en el mapa | Abre el punto en OpenStreetMap |

- La ubicación se usa para verificar que el prestador inicie la guardia a menos de **50 metros**.
- Si el paciente está internado y no tiene GPS propio, se usa la ubicación de la clínica.
- Si el paciente no tiene ninguna ubicación, la guardia se puede iniciar igual, pero queda registrada sin verificación.

---

## 7. Pantalla Clínicas

Permite registrar las clínicas y residencias donde están internados los pacientes. Solo la ven el administrador y el coordinador.

### 7.1 Filtrar clínicas

| Filtro | Para qué sirve |
|---|---|
| Buscar | Nombre, dirección, localidad, teléfono, contacto o servicios |
| Estado | Muestra solo activas, solo inactivas o todas |

El contador indica cuántas clínicas se ven sobre el total.

### 7.2 Crear una clínica

1. Ir a **Clínicas**.
2. Presionar **Nueva clínica**.
3. Completar el **Nombre**, que es obligatorio.
4. Completar dirección, localidad, teléfono y contacto si los tenés.
5. Escribir los **Servicios** como un resumen de texto.
6. Cargar la **Ubicación GPS** de la clínica.
7. Dejar marcada **Clínica activa** si va a recibir pacientes.
8. Presionar **Crear clínica**.

### 7.3 Editar una clínica

1. Presionar **Editar** en la fila de la clínica.
2. Cambiar los datos necesarios.
3. Presionar **Guardar cambios**.

El nombre no se puede repetir: si ya pertenece a otra clínica, el sistema muestra un aviso.

### 7.4 Servicios y ubicación GPS

- **Servicios** es un resumen libre de las prestaciones de la clínica, por ejemplo “ENFERMERIA LUNES A LUNES (8 HORAS); COCINA”.
- La **Ubicación GPS** se usa cuando un paciente internado no tiene GPS propio.
- La ubicación se puede marcar con un clic en el mapa o con **Usar ubicación actual**.

### 7.5 Clínicas activas e inactivas

- **Activa**: se ofrece al asignar un paciente a una clínica.
- **Inactiva**: conserva sus datos y su historial, pero no se ofrece para nuevos pacientes.
- Las clínicas no se borran: se marcan como inactivas.

---

## 8. Pantalla Trabajadores

Permite consultar y actualizar los datos del personal. Solo la ven el administrador y el coordinador.

### 8.1 Filtrar trabajadores

| Filtro | Para qué sirve |
|---|---|
| Buscar | Nombre, DNI, CUIT/CUIL, CBU/CVU o teléfono |
| Cargo | Muestra solo un cargo |
| Estado | Todos, activos o inactivos |

El contador indica cuántos trabajadores se ven sobre el total.

### 8.2 Editar un trabajador

1. Presionar **Editar** en la fila del trabajador.
2. Cambiar **Nombre**, **DNI**, **CUIT/CUIL**, **CBU/CVU**, **Cargo**, **Teléfono**, **Teléfono alternativo** o el estado **Trabajador activo**.
3. Presionar **Guardar cambios**.

El DNI y el CUIT/CUIL no se pueden repetir: si ya pertenecen a otro trabajador, el sistema muestra un aviso.

La pantalla muestra el DNI con puntos, el CUIT con guiones, el CBU separado en grupos y los teléfonos con espacios. Internamente se guardan solo los dígitos (o el alias del CBU), sin espacios ni caracteres especiales.

### 8.3 Crear un trabajador

1. Presionar **Nuevo trabajador**.
2. Completar **Nombre** y **Cargo**, que son obligatorios.
3. Completar **DNI** o **CUIT/CUIL**; se recomienda al menos uno para identificar al prestador.
4. Completar **CBU/CVU** y los teléfonos si corresponde.
5. Dejar marcado **Trabajador activo** si va a recibir publicaciones.
6. Presionar **Crear trabajador**.

### 8.4 Trabajadores activos e inactivos

- **Activo**: aparece en las listas que buscan prestadores activos, como el alta de publicaciones.
- **Inactivo**: conserva su historial y sus guardias, pero no se ofrece para nuevas publicaciones.
- Los trabajadores no se borran: se marcan como inactivos.

### 8.5 Carga inicial desde la nómina

La nómina mensual se puede cargar desde el archivo Excel que envía la administración. Esa carga la ejecuta el equipo técnico y deja en el sistema:

- los prestadores con su nombre, DNI o CUIT/CUIL y CBU/CVU;
- los pacientes que todavía no existían;
- la asociación de cada prestador con sus pacientes, con el valor de la hora normal y la hora feriado de la nómina.

Después de una carga:

1. Revisar en **Trabajadores** que los datos de cada prestador estén completos.
2. Revisar en **Pacientes** que los pacientes nuevos tengan su información.
3. Abrir **Calendario**, elegir uno de esos pacientes y comprobar que sus prestadores aparecen bajo **Asignados al paciente**.

Si la nómina trae un CUIT o un CBU incompleto o repetido, el sistema lo informa en el resumen de la carga para que se pueda corregir en la ficha del trabajador. Volver a cargar el mismo archivo no duplica datos: actualiza las asignaciones existentes.

---

## 9. Pantalla Calendario

Muestra las guardias de la semana en una grilla por día y horario.

### 9.1 Navegación

| Elemento | Para qué sirve |
|---|---|
| Vista semanal | Grilla con los días y las horas de la semana |
| Colores | Cada paciente se muestra con un color propio |
| Hoy / anterior / siguiente | Moverse entre semanas |
| Selector de vista | Cambiar entre mes, semana y día |
| Guardias | Se muestran como bloques en el horario asignado |

El administrador y el coordinador pueden crear y mover guardias. El prestador solo visualiza el calendario.

### 9.2 Crear una guardia

1. Ingresar como administrador o coordinador.
2. Ir a **Calendario**.
3. Arrastrar el mouse sobre el rango de horas deseado.
4. En la ventana **Nueva Guardia**, revisar el **Inicio** y el **Fin** propuestos. Se pueden ajustar antes de guardar; el fin debe ser posterior al inicio.
5. Elegir el **paciente**.
6. Elegir el **prestador**. La lista muestra primero los asignados al paciente y luego otros prestadores disponibles.
7. Verificar que no aparezca la advertencia de conflicto.
8. Presionar **Guardar**.

**Ejemplo**

- Rango: lunes 16/11/2026 de 08:00 a 16:00.
- Paciente: Paciente Demo.
- Prestador: Prestador Demo.
- Resultado: la guardia aparece en el calendario y en **Guardias** con estado **Pendiente**.

### 9.3 Conflictos de horario

Si el prestador elegido ya tiene otra guardia en ese horario:

- aparece la advertencia “Este prestador ya tiene una guardia en ese horario”,
- el botón **Guardar** queda deshabilitado,
- hay que elegir otro prestador u otro horario.

### 9.4 Mover una guardia

1. Arrastrar el bloque de la guardia a otro horario o día.
2. El sistema verifica que no haya conflictos.
3. Si el cambio es válido, se muestra “Guardia actualizada”.
4. Si no es válido, la guardia vuelve a su lugar y se muestra el motivo.

Una guardia que ya fue iniciada no se puede mover.

---

## 10. Pantalla Nómina

Permite generar y consultar la liquidación mensual por trabajador y paciente.

### 10.1 Elegir el período

1. Ir a **Nómina**.
2. Elegir el **Mes** y el **Año**.
3. La tabla se actualiza automáticamente con las nóminas de ese período.

### 10.2 Generar la nómina

1. Elegir el período.
2. Presionar **Generar nómina**.
3. El sistema toma las guardias ya finalizadas del período y agrupa las horas por trabajador y paciente.
4. Se muestra un resumen con las nóminas generadas, los detalles y las que se omitieron por estar ya pagadas.

**Ejemplo**

- Período: noviembre de 2026.
- Guardia finalizada: 7.83 horas normales.
- Valor de la hora normal: 25.00.
- Resultado: total a pagar 195.75.
- Si la guardia cae en un feriado, se usa el valor de la hora feriado.

**Observaciones**

- Solo se incluyen guardias con horas reales calculadas.
- Una nómina ya pagada no se recalcula: se informa como omitida.
- Volver a generar un período pendiente actualiza sus horas y su detalle.

### 10.3 Ver el detalle

1. En la fila de la nómina, presionar **Ver detalle**.
2. Se abre una tabla con la fecha de cada guardia, la entrada y salida programadas, las horas normales, las horas feriado y si el día era feriado.

### 10.4 Marcar como pagada

1. Presionar **Marcar pagada** en una nómina pendiente.
2. Confirmar el aviso.
3. El estado cambia a **Pagada** y se registra la fecha de pago.

### 10.5 Vista del prestador

- Ve solo sus propias nóminas.
- Puede consultar el detalle de cada una.
- No puede generar la nómina ni marcarla como pagada.

---

## 11. Pantalla Manual

Este mismo manual está disponible en el menú **Manual** en cualquier momento.

- El botón **Imprimir / Guardar PDF** genera una versión imprimible, sin la barra de navegación.
- El índice del comienzo permite ir directo a cada sección.
- El **Manual técnico**, pensado para programadores, está en un ítem aparte y solo lo ven los administradores.

---

## 12. Mensajes frecuentes

| Mensaje | Qué significa | Qué hacer |
|---|---|---|
| La guardia no está asignada a tu usuario | Estás intentando operar una guardia de otro prestador | Volvé a **Inicio** y usá la guardia que te corresponde |
| Todavía no está habilitado el inicio de esta guardia | Estás fuera de la ventana de inicio | Esperá la fecha y hora que indica la tarjeta |
| La guardia ya fue iniciada | Ya existe una entrada registrada | No hace falta iniciarla otra vez; solo finalizarla |
| La guardia ya fue finalizada | Ya existe una salida registrada | La guardia está cerrada; si hay un error, pedí una corrección |
| Todavía no iniciaste esta guardia | Se intentó finalizar sin haber iniciado | Iniciá primero la guardia |
| El prestador ya tiene una guardia en ese horario | Hay dos guardias superpuestas para la misma persona | Elegí otro prestador u otro horario |
| No se puede modificar una guardia que ya fue iniciada | La guardia ya tiene asistencia registrada | Solo se puede editar el horario de guardias pendientes |
| El fin debe ser posterior al inicio | El horario ingresado está invertido | Revisá el inicio y el fin antes de guardar |
| Elegí al menos un prestador o la opción Todos los prestadores | La publicación no tiene destinatarios | Marcá al menos un prestador o elegí **Todos los prestadores** |
| La fecha y hora de inicio y de fin son obligatorias | Falta completar el horario de la publicación | Completá el **Inicio** y el **Fin** |
| El precio debe ser un número mayor o igual a 0 | El precio ingresado no es válido | Corregí el monto de la guardia |
| El paciente indicado no existe | El paciente elegido ya no está disponible | Actualizá la pantalla y elegí otro paciente |
| Publicación no encontrada | Se intentó editar o cerrar una publicación que ya no existe | Actualizá la pantalla y volvé a buscar |
| El nombre es obligatorio | Falta el nombre del paciente o del trabajador | Completá el campo **Nombre** |
| Ya existe un trabajador con ese DNI o CUIT | Otro trabajador ya usa ese DNI o CUIT | Revisá el documento o editá el trabajador existente |
| El CUIT/CUIL debe tener 11 dígitos | El CUIT/CUIL ingresado está incompleto | Revisá el número; si tiene 10 dígitos, el sistema completa el último |
| El CBU/CVU no puede superar los 50 caracteres | El CBU, CVU o alias es demasiado largo | Revisá el dato bancario |
| El cargo indicado no existe | El cargo elegido ya no está disponible | Actualizá la pantalla y elegí otro cargo |
| Paciente no encontrado | Se intentó editar un paciente que ya no existe | Actualizá la pantalla y volvé a buscar |
| Necesitamos tu ubicación para iniciar la guardia | El navegador no entregó la ubicación | Habilitá el permiso de ubicación y volvé a intentar |
| Estás fuera del radio permitido para iniciar la guardia | Estás a más de 50 metros de la ubicación del paciente | Acercate al domicilio o a la clínica e intentá de nuevo |
| El paciente no tiene una ubicación GPS cargada | El inicio se registró sin verificación | No es un error; si querés verificarlo, cargá el GPS del paciente o de la clínica |
| Ya existe una clínica con ese nombre | Otra clínica ya usa ese nombre | Revisá el nombre o editá la clínica existente |
| La clínica indicada no existe | La clínica elegida ya no está disponible | Actualizá la pantalla y elegí otra clínica |
| Clínica no encontrada | Se intentó editar una clínica que ya no existe | Actualizá la pantalla y volvé a buscar |
| La fecha de baja no puede ser anterior a la fecha de inicio | Las fechas del paciente están invertidas | Revisá la fecha de inicio y la de baja |
| Trabajador no encontrado | Se intentó editar un trabajador que ya no existe | Actualizá la pantalla y volvé a buscar |
| Solo se pueden corregir registros con entrada y salida cerradas | La guardia está pendiente o en curso | Esperá a que el prestador finalice y volvé a intentar |
| La salida debe ser posterior a la entrada | Las fechas de la corrección están invertidas | Revisá los horarios antes de guardar |
| El motivo es obligatorio (mínimo 5 caracteres) | Falta explicar la corrección | Escribí un motivo claro |
| No tenés permisos para esta acción | Tu rol no permite esa operación | Pedí la acción a un administrador o coordinador |
| La nómina ya está marcada como pagada | Se intentó pagar dos veces | No hace falta volver a pagarla |
| Nómina no encontrada | La nómina ya no existe o el período cambió | Actualizá la pantalla y volvé a buscar |
| Tu sesión venció | Pasó el tiempo de validez del ingreso | Volvé a ingresar con tu email y contraseña |

---

## 13. Recomendaciones de uso

- Iniciar la guardia al llegar al domicilio y finalizarla al terminar, sin dejarla abierta.
- Si te equivocaste con un horario, pedile a un coordinador que lo corrija en lugar de iniciar o finalizar dos veces.
- Al corregir una asistencia, escribir un motivo concreto: queda guardado en el historial.
- Revisar la nómina antes de marcarla como pagada; una vez pagada no se recalcula.
- Cerrar las publicaciones que ya no estén disponibles: dejan de mostrarse a los prestadores.
- Revisar la dirección y la patología antes de publicar: se completan con los datos del paciente y se pueden ajustar.
- Mantener actualizados la dirección, el teléfono y la patología de cada paciente: se usan como base para las guardias y las publicaciones.
- Cargar la ubicación GPS de los pacientes y de las clínicas: permite verificar que el prestador inicie la guardia en el lugar correcto.
- Revisar la ubicación GPS antes de guardar: un punto mal marcado puede impedir que el prestador inicie la guardia.
- Usar el campo **Clínica** para pacientes internados y dejar **Sin clínica** para los domicilios.
- En lugar de borrar un trabajador que ya no trabaja, marcarlo como inactivo para conservar su historial.
- No compartir el usuario ni la contraseña con otras personas.

---

## 14. Cuentas de prueba

Las siguientes cuentas sirven para capacitación y pruebas en la instalación de demostración.

| Rol | Email | Contraseña |
|---|---|---|
| Administrador | master@permed.local | Rb170614 |
| Coordinador | coordinador@permed.local | Coord123! |
| Prestador | prestador@permed.local | Prest123! |

Estas claves son solo para el entorno de prueba. En un entorno real, cada usuario debe tener su propia cuenta y su propia contraseña.
