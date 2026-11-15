const db = require("../config/db");
const dayjs = require("dayjs");
const { aFechaSql } = require("../utils/fechas");
const {
    RADIO_VERIFICACION_METROS,
    aNumero,
    coordenadaValida,
    distanciaMetros
} = require("../utils/geo");

// Ventana permitida para iniciar una guardia:
// desde 2 horas antes del inicio programado hasta 12 horas después del fin.
const HORAS_ANTES_INICIO = 2;
const HORAS_DESPUES_FIN = 12;
const MOTIVO_MINIMO = 5;

function horaSolicitada(req) {
    const { fecha_hora } = req.body || {};

    // Solo un administrador puede registrar una hora manual (correcciones).
    if (req.usuario.rol === "admin" && fecha_hora) {
        const fecha = dayjs(fecha_hora);

        if (fecha.isValid()) {
            return fecha.format("YYYY-MM-DD HH:mm:ss");
        }
    }

    return dayjs().format("YYYY-MM-DD HH:mm:ss");
}

function estadoRegistro(entradaReal, salidaReal) {
    if (!entradaReal) {
        return "pendiente";
    }

    if (!salidaReal) {
        return "en_curso";
    }

    return "finalizada";
}

function esAdmin(req) {
    return req.usuario.rol === "admin";
}

/**
 * Trabajador sobre el que opera el endpoint /actual:
 * - prestador: siempre el suyo (del token)
 * - admin: puede consultar cualquiera con ?trabajador_id=
 */
function trabajadorConsultado(req) {
    if (req.usuario.rol === "prestador") {
        return req.usuario.trabajador_id || null;
    }

    if (esAdmin(req)) {
        const id = Number(req.query.trabajador_id);

        return Number.isInteger(id) && id > 0 ? id : null;
    }

    return null;
}

function formatearGuardia(fila) {
    const estado = estadoRegistro(
        fila.fecha_hora_entrada_real,
        fila.fecha_hora_salida_real
    );
    const enVentana = Number(fila.en_ventana) === 1;
    const tieneUbicacionPaciente =
        Number(fila.paciente_tiene_ubicacion) === 1;
    const tieneUbicacionClinica =
        Number(fila.clinica_tiene_ubicacion) === 1;

    return {
        id: fila.id,
        trabajador_id: fila.trabajador_id,
        prestador: fila.trabajador_nombre,
        paciente_id: fila.paciente_id,
        paciente: fila.paciente_nombre,
        fecha_hora_entrada: fila.fecha_hora_entrada,
        fecha_hora_salida: fila.fecha_hora_salida,
        horas_estimadas: fila.horas_estimadas,
        fecha_hora_entrada_real: fila.fecha_hora_entrada_real,
        fecha_hora_salida_real: fila.fecha_hora_salida_real,
        horas_reales: fila.horas_reales,
        diferencia_horas: fila.diferencia_horas,
        estado,
        en_ventana: enVentana,
        ventana: {
            desde: fila.ventana_desde,
            hasta: fila.ventana_hasta
        },
        tiene_ubicacion: tieneUbicacionPaciente || tieneUbicacionClinica,
        ubicacion_origen: tieneUbicacionPaciente
            ? "paciente"
            : tieneUbicacionClinica
                ? "clinica"
                : null,
        puede_iniciar: estado === "pendiente" && enVentana,
        puede_finalizar: estado === "en_curso"
    };
}

exports.getGuardiaActual = async (req, res) => {
    try {
        const trabajadorId = trabajadorConsultado(req);

        if (!trabajadorId) {
            const mensaje = req.usuario.rol === "prestador"
                ? "Tu usuario no está vinculado a un trabajador"
                : "trabajador_id es obligatorio";

            return res.status(req.usuario.rol === "prestador" ? 403 : 400).json({
                error: mensaje
            });
        }

        const [filas] = await db.query(
            `SELECT v.id,
                    v.trabajador_id,
                    v.trabajador_nombre,
                    v.paciente_id,
                    v.paciente_nombre,
                    v.fecha_hora_entrada,
                    v.fecha_hora_salida,
                    v.horas_estimadas,
                    v.fecha_hora_entrada_real,
                    v.fecha_hora_salida_real,
                    v.horas_reales,
                    v.diferencia_horas,
                    DATE_FORMAT(
                        DATE_SUB(v.fecha_hora_entrada, INTERVAL ${HORAS_ANTES_INICIO} HOUR),
                        '%Y-%m-%d %H:%i:%s'
                    ) AS ventana_desde,
                    DATE_FORMAT(
                        DATE_ADD(v.fecha_hora_salida, INTERVAL ${HORAS_DESPUES_FIN} HOUR),
                        '%Y-%m-%d %H:%i:%s'
                    ) AS ventana_hasta,
                    (NOW() >= DATE_SUB(v.fecha_hora_entrada, INTERVAL ${HORAS_ANTES_INICIO} HOUR)
                     AND NOW() <= DATE_ADD(v.fecha_hora_salida, INTERVAL ${HORAS_DESPUES_FIN} HOUR))
                        AS en_ventana,
                    (p.latitud IS NOT NULL AND p.longitud IS NOT NULL)
                        AS paciente_tiene_ubicacion,
                    (c.latitud IS NOT NULL AND c.longitud IS NOT NULL)
                        AS clinica_tiene_ubicacion
             FROM vista_horarios_completa v
             JOIN pacientes p ON p.id = v.paciente_id
             LEFT JOIN clinicas c ON c.id = p.clinica_id
             WHERE v.trabajador_id = ?
               AND (
                    (v.fecha_hora_entrada_real IS NOT NULL
                     AND v.fecha_hora_salida_real IS NULL)
                    OR
                    (v.fecha_hora_entrada_real IS NULL
                     AND NOW() >= DATE_SUB(v.fecha_hora_entrada, INTERVAL ${HORAS_ANTES_INICIO} HOUR)
                     AND NOW() <= DATE_ADD(v.fecha_hora_salida, INTERVAL ${HORAS_DESPUES_FIN} HOUR))
               )
             ORDER BY v.fecha_hora_entrada`,
            [trabajadorId]
        );

        const [proximas] = await db.query(
            `SELECT id,
                    paciente_nombre,
                    fecha_hora_entrada,
                    fecha_hora_salida,
                    horas_estimadas,
                    DATE_FORMAT(
                        DATE_SUB(fecha_hora_entrada, INTERVAL ${HORAS_ANTES_INICIO} HOUR),
                        '%Y-%m-%d %H:%i:%s'
                    ) AS ventana_desde
             FROM vista_horarios_completa
             WHERE trabajador_id = ?
               AND fecha_hora_entrada_real IS NULL
               AND fecha_hora_entrada > NOW()
             ORDER BY fecha_hora_entrada
             LIMIT 1`,
            [trabajadorId]
        );

        res.json({
            trabajador_id: trabajadorId,
            guardias: filas.map(formatearGuardia),
            proxima: proximas[0] || null
        });
    } catch (error) {
        console.error("getGuardiaActual:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};

exports.iniciarGuardia = async (req, res) => {
    const { horario_programado_id } = req.body || {};

    if (!horario_programado_id) {
        return res.status(400).json({
            error: "horario_programado_id es obligatorio"
        });
    }

    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        const [filas] = await conn.query(
            `SELECT h.id,
                    h.fecha_hora_entrada,
                    h.fecha_hora_salida,
                    a.trabajador_id,
                    a.paciente_id,
                    ra.id AS registro_id,
                    ra.fecha_hora_entrada_real,
                    ra.fecha_hora_salida_real,
                    p.latitud AS paciente_latitud,
                    p.longitud AS paciente_longitud,
                    c.latitud AS clinica_latitud,
                    c.longitud AS clinica_longitud,
                    DATE_FORMAT(
                        DATE_SUB(h.fecha_hora_entrada, INTERVAL ${HORAS_ANTES_INICIO} HOUR),
                        '%Y-%m-%d %H:%i:%s'
                    ) AS ventana_desde,
                    (NOW() >= DATE_SUB(h.fecha_hora_entrada, INTERVAL ${HORAS_ANTES_INICIO} HOUR)
                     AND NOW() <= DATE_ADD(h.fecha_hora_salida, INTERVAL ${HORAS_DESPUES_FIN} HOUR))
                        AS en_ventana
             FROM horarios_programados h
             JOIN asignaciones a ON a.id = h.asignacion_id
             JOIN pacientes p ON p.id = a.paciente_id
             LEFT JOIN clinicas c ON c.id = p.clinica_id
             LEFT JOIN registros_asistencia ra
                ON ra.horario_programado_id = h.id
             WHERE h.id = ?
             FOR UPDATE`,
            [horario_programado_id]
        );

        if (filas.length === 0) {
            await conn.rollback();

            return res.status(404).json({ error: "Guardia no encontrada" });
        }

        const guardia = filas[0];

        if (!esAdmin(req) && guardia.trabajador_id !== req.usuario.trabajador_id) {
            await conn.rollback();

            return res.status(403).json({
                error: "La guardia no está asignada a tu usuario"
            });
        }

        if (guardia.registro_id) {
            await conn.rollback();

            const yaFinalizada = guardia.fecha_hora_salida_real !== null;

            return res.status(409).json({
                error: yaFinalizada
                    ? "La guardia ya fue finalizada"
                    : "La guardia ya fue iniciada"
            });
        }

        // El administrador puede registrar horas manuales sin ventana.
        if (!esAdmin(req) && Number(guardia.en_ventana) !== 1) {
            await conn.rollback();

            const formato = "DD/MM/YYYY HH:mm";

            return res.status(409).json({
                error: "Todavía no está habilitado el inicio de esta guardia",
                ventana_desde: guardia.ventana_desde,
                detalle: `Podés iniciarla desde el ${dayjs(guardia.ventana_desde).format(formato)}`
            });
        }

        const horaEntrada = horaSolicitada(req);

        let ubicacion = {
            latitud: null,
            longitud: null,
            precision: null,
            distancia: null,
            verificada: false,
            origen: null,
            advertencia: null
        };

        // La validacion de 50 metros se exige solo al prestador.
        // El administrador puede iniciar sin GPS (pruebas o correcciones).
        if (req.usuario.rol === "prestador") {
            const latPaciente = aNumero(guardia.paciente_latitud);
            const lngPaciente = aNumero(guardia.paciente_longitud);
            const latClinica = aNumero(guardia.clinica_latitud);
            const lngClinica = aNumero(guardia.clinica_longitud);

            let latReferencia = null;
            let lngReferencia = null;
            let origen = null;

            if (coordenadaValida(latPaciente, lngPaciente)) {
                latReferencia = latPaciente;
                lngReferencia = lngPaciente;
                origen = "paciente";
            } else if (coordenadaValida(latClinica, lngClinica)) {
                latReferencia = latClinica;
                lngReferencia = lngClinica;
                origen = "clinica";
            }

            if (latReferencia === null) {
                ubicacion.advertencia =
                    "El paciente no tiene una ubicación GPS cargada: " +
                    "el inicio quedó registrado sin verificación.";
            } else {
                const latitud = aNumero(req.body?.latitud);
                const longitud = aNumero(req.body?.longitud);
                const precision = aNumero(req.body?.precision);

                if (!coordenadaValida(latitud, longitud)) {
                    await conn.rollback();

                    return res.status(400).json({
                        error: "Necesitamos tu ubicación para iniciar la guardia",
                        detalle:
                            "Habilitá el permiso de ubicación del navegador " +
                            "e intentá de nuevo."
                    });
                }

                const distancia = distanciaMetros(
                    latReferencia,
                    lngReferencia,
                    latitud,
                    longitud
                );

                if (distancia === null) {
                    await conn.rollback();

                    return res.status(400).json({
                        error: "No pudimos calcular la distancia a la ubicación del paciente"
                    });
                }

                if (distancia > RADIO_VERIFICACION_METROS) {
                    await conn.rollback();

                    return res.status(409).json({
                        error: "Estás fuera del radio permitido para iniciar la guardia",
                        distancia_metros: Number(distancia.toFixed(2)),
                        radio_metros: RADIO_VERIFICACION_METROS,
                        detalle:
                            `Estás a ${Math.round(distancia)} metros de la ` +
                            `ubicación del paciente. Acercate a menos de ` +
                            `${RADIO_VERIFICACION_METROS} metros.`
                    });
                }

                ubicacion = {
                    latitud,
                    longitud,
                    precision: precision !== null &&
                        precision >= 0 &&
                        precision <= 100000
                        ? precision
                        : null,
                    distancia: Number(distancia.toFixed(2)),
                    verificada: true,
                    origen,
                    advertencia: null
                };
            }
        }

        const [result] = await conn.query(
            `INSERT INTO registros_asistencia
                (horario_programado_id, fecha_hora_entrada_real,
                 latitud_entrada, longitud_entrada, precision_entrada,
                 distancia_entrada)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                horario_programado_id,
                horaEntrada,
                ubicacion.latitud,
                ubicacion.longitud,
                ubicacion.precision,
                ubicacion.distancia
            ]
        );

        await conn.commit();

        res.status(201).json({
            mensaje: "Guardia iniciada",
            id: result.insertId,
            hora: horaEntrada,
            estado: "en_curso",
            verificada: ubicacion.verificada,
            ubicacion_origen: ubicacion.origen,
            distancia_metros: ubicacion.distancia,
            radio_metros: RADIO_VERIFICACION_METROS,
            advertencia: ubicacion.advertencia
        });
    } catch (error) {
        await conn.rollback();

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                error: "La guardia ya fue iniciada"
            });
        }

        console.error("iniciarGuardia:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    } finally {
        conn.release();
    }
};

exports.finalizarGuardia = async (req, res) => {
    const { horario_programado_id } = req.body || {};

    if (!horario_programado_id) {
        return res.status(400).json({
            error: "horario_programado_id es obligatorio"
        });
    }

    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        const [filas] = await conn.query(
            `SELECT h.id,
                    a.trabajador_id,
                    ra.id AS registro_id,
                    ra.fecha_hora_entrada_real,
                    ra.fecha_hora_salida_real
             FROM horarios_programados h
             JOIN asignaciones a ON a.id = h.asignacion_id
             LEFT JOIN registros_asistencia ra
                ON ra.horario_programado_id = h.id
             WHERE h.id = ?
             FOR UPDATE`,
            [horario_programado_id]
        );

        if (filas.length === 0) {
            await conn.rollback();

            return res.status(404).json({ error: "Guardia no encontrada" });
        }

        const guardia = filas[0];

        if (!esAdmin(req) && guardia.trabajador_id !== req.usuario.trabajador_id) {
            await conn.rollback();

            return res.status(403).json({
                error: "La guardia no está asignada a tu usuario"
            });
        }

        if (!guardia.registro_id || !guardia.fecha_hora_entrada_real) {
            await conn.rollback();

            return res.status(400).json({
                error: "Todavía no iniciaste esta guardia"
            });
        }

        if (guardia.fecha_hora_salida_real) {
            await conn.rollback();

            return res.status(409).json({
                error: "La guardia ya fue finalizada"
            });
        }

        const horaSalida = horaSolicitada(req);
        const horaEntrada = dayjs(
            guardia.fecha_hora_entrada_real
        ).format("YYYY-MM-DD HH:mm:ss");

        if (horaSalida <= horaEntrada) {
            await conn.rollback();

            return res.status(400).json({
                error: "La salida debe ser posterior a la entrada"
            });
        }

        await conn.query(
            `UPDATE registros_asistencia
             SET fecha_hora_salida_real = ?
             WHERE id = ?
               AND fecha_hora_salida_real IS NULL`,
            [horaSalida, guardia.registro_id]
        );

        const [resultado] = await conn.query(
            `SELECT fecha_hora_entrada_real,
                    fecha_hora_salida_real,
                    horas_reales,
                    diferencia_horas
             FROM registros_asistencia
             WHERE id = ?`,
            [guardia.registro_id]
        );

        await conn.commit();

        res.json({
            mensaje: "Guardia finalizada",
            estado: "finalizada",
            ...resultado[0]
        });
    } catch (error) {
        await conn.rollback();
        console.error("finalizarGuardia:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    } finally {
        conn.release();
    }
};

exports.editarAsistencia = async (req, res) => {
    const horarioId = Number(req.params.horarioId);

    if (!Number.isInteger(horarioId) || horarioId <= 0) {
        return res.status(400).json({ error: "horarioId inválido" });
    }

    const entrada = aFechaSql(req.body?.fecha_hora_entrada_real);
    const salida = aFechaSql(req.body?.fecha_hora_salida_real);
    const motivo = String(req.body?.motivo || "").trim();

    if (!entrada || !salida) {
        return res.status(400).json({
            error: "fecha_hora_entrada_real y fecha_hora_salida_real son obligatorias"
        });
    }

    if (salida <= entrada) {
        return res.status(400).json({
            error: "La salida debe ser posterior a la entrada"
        });
    }

    if (motivo.length < MOTIVO_MINIMO) {
        return res.status(400).json({
            error: `El motivo es obligatorio (mínimo ${MOTIVO_MINIMO} caracteres)`
        });
    }

    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        const [registros] = await conn.query(
            `SELECT id,
                    fecha_hora_entrada_real,
                    fecha_hora_salida_real,
                    diferencia_horas
             FROM registros_asistencia
             WHERE horario_programado_id = ?
             FOR UPDATE`,
            [horarioId]
        );

        if (registros.length === 0) {
            await conn.rollback();

            return res.status(404).json({
                error: "La guardia no tiene asistencia registrada"
            });
        }

        const anterior = registros[0];

        if (
            anterior.fecha_hora_entrada_real === null ||
            anterior.fecha_hora_salida_real === null
        ) {
            await conn.rollback();

            return res.status(409).json({
                error: "Solo se pueden corregir registros con entrada y salida cerradas"
            });
        }

        const [usuarios] = await conn.query(
            "SELECT email FROM usuarios WHERE id = ?",
            [req.usuario.id]
        );

        const usuarioEmail = usuarios[0]?.email ||
            `usuario#${req.usuario.id}`;

        await conn.query(
            `UPDATE registros_asistencia
             SET fecha_hora_entrada_real = ?,
                 fecha_hora_salida_real = ?
             WHERE id = ?`,
            [entrada, salida, anterior.id]
        );

        const [actualizados] = await conn.query(
            `SELECT fecha_hora_entrada_real,
                    fecha_hora_salida_real,
                    horas_reales,
                    diferencia_horas
             FROM registros_asistencia
             WHERE id = ?`,
            [anterior.id]
        );

        const nuevo = actualizados[0];

        const [auditoria] = await conn.query(
            `INSERT INTO auditoria_asistencia
                (registro_id, horario_programado_id, usuario_id, usuario_email,
                 motivo, entrada_anterior, salida_anterior, entrada_nueva,
                 salida_nueva, diferencia_anterior, diferencia_nueva)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                anterior.id,
                horarioId,
                req.usuario.id,
                usuarioEmail,
                motivo,
                anterior.fecha_hora_entrada_real,
                anterior.fecha_hora_salida_real,
                nuevo.fecha_hora_entrada_real,
                nuevo.fecha_hora_salida_real,
                anterior.diferencia_horas,
                nuevo.diferencia_horas
            ]
        );

        await conn.commit();

        res.json({
            mensaje: "Asistencia corregida",
            auditoria_id: auditoria.insertId,
            registro: nuevo
        });
    } catch (error) {
        await conn.rollback();
        console.error("editarAsistencia:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    } finally {
        conn.release();
    }
};

exports.getAuditoriaAsistencia = async (req, res) => {
    const horarioId = Number(req.params.horarioId);

    if (!Number.isInteger(horarioId) || horarioId <= 0) {
        return res.status(400).json({ error: "horarioId inválido" });
    }

    try {
        const [rows] = await db.query(
            `SELECT id,
                    usuario_email,
                    motivo,
                    entrada_anterior,
                    salida_anterior,
                    entrada_nueva,
                    salida_nueva,
                    diferencia_anterior,
                    diferencia_nueva,
                    created_at
             FROM auditoria_asistencia
             WHERE horario_programado_id = ?
             ORDER BY created_at DESC, id DESC`,
            [horarioId]
        );

        res.json(rows);
    } catch (error) {
        console.error("getAuditoriaAsistencia:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};

// Alias de compatibilidad con los endpoints previos.
exports.registrarEntrada = exports.iniciarGuardia;
exports.registrarSalida = exports.finalizarGuardia;
