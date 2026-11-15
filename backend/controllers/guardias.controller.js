const db = require("../config/db");
const dayjs = require("dayjs");
const { aFechaSql } = require("../utils/fechas");

function alcancePrestador(req) {
    if (req.usuario.rol !== "prestador") {
        return { condicion: null, params: [] };
    }

    if (!req.usuario.trabajador_id) {
        return { error: "Tu usuario no está vinculado a un trabajador" };
    }

    return {
        condicion: "trabajador_id = ?",
        params: [req.usuario.trabajador_id]
    };
}

exports.getGuardias = async (req, res) => {
    try {
        const condiciones = [];
        const params = [];

        const alcance = alcancePrestador(req);

        if (alcance.error) {
            return res.status(403).json({ error: alcance.error });
        }

        if (alcance.condicion) {
            condiciones.push(alcance.condicion);
            params.push(...alcance.params);
        }

        const desde = aFechaSql(req.query.desde);

        let hasta = aFechaSql(req.query.hasta);
        const hastaTexto = String(req.query.hasta || "").trim();

        // Una fecha sin hora (YYYY-MM-DD) se interpreta como el día completo.
        if (hasta && /^\d{4}-\d{2}-\d{2}$/.test(hastaTexto)) {
            hasta = dayjs(hasta).add(1, "day").format("YYYY-MM-DD HH:mm:ss");
        }

        if (desde) {
            condiciones.push("fecha_hora_entrada >= ?");
            params.push(desde);
        }

        if (hasta) {
            condiciones.push("fecha_hora_entrada < ?");
            params.push(hasta);
        }

        const pacienteId = Number(req.query.paciente_id);

        if (Number.isInteger(pacienteId) && pacienteId > 0) {
            condiciones.push("paciente_id = ?");
            params.push(pacienteId);
        }

        // El prestador ya está limitado a sus propias guardias.
        if (req.usuario.rol !== "prestador") {
            const trabajadorId = Number(req.query.trabajador_id);

            if (Number.isInteger(trabajadorId) && trabajadorId > 0) {
                condiciones.push("trabajador_id = ?");
                params.push(trabajadorId);
            }
        }

        const estadosValidos = ["pendiente", "en_curso", "finalizada"];
        const estado = String(req.query.estado || "").trim();

        if (estado && !estadosValidos.includes(estado)) {
            return res.status(400).json({ error: "estado inválido" });
        }

        if (estado === "pendiente") {
            condiciones.push("fecha_hora_entrada_real IS NULL");
        }

        if (estado === "en_curso") {
            condiciones.push(
                "fecha_hora_entrada_real IS NOT NULL AND fecha_hora_salida_real IS NULL"
            );
        }

        if (estado === "finalizada") {
            condiciones.push("fecha_hora_salida_real IS NOT NULL");
        }

        const where = condiciones.length > 0
            ? " WHERE " + condiciones.join(" AND ")
            : "";

        const [rows] = await db.query(
            `SELECT id,
                    trabajador_id,
                    trabajador_nombre AS prestador,
                    paciente_id,
                    paciente_nombre AS paciente,
                    fecha_hora_entrada,
                    fecha_hora_salida,
                    horas_estimadas,
                    fecha_hora_entrada_real,
                    fecha_hora_salida_real,
                    horas_reales,
                    diferencia_horas,
                    estado_cumplimiento,
                    CASE
                        WHEN fecha_hora_entrada_real IS NULL THEN 'pendiente'
                        WHEN fecha_hora_salida_real IS NULL THEN 'en_curso'
                        ELSE 'finalizada'
                    END AS estado
             FROM vista_horarios_completa${where}
             ORDER BY fecha_hora_entrada DESC`,
            params
        );

        res.json(rows);
    } catch (error) {
        console.error("getGuardias:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};

exports.verificarConflicto = async (req, res) => {
    try {
        const {
            trabajador_id,
            fecha_hora_entrada,
            fecha_hora_salida,
            excluir_id
        } = req.query;

        const entrada = aFechaSql(fecha_hora_entrada);
        const salida = aFechaSql(fecha_hora_salida);

        if (!trabajador_id || !entrada || !salida) {
            return res.status(400).json({
                error: "trabajador_id, fecha_hora_entrada y fecha_hora_salida son obligatorios"
            });
        }

        if (salida <= entrada) {
            return res.status(400).json({
                error: "La salida debe ser posterior a la entrada"
            });
        }

        const params = [trabajador_id, entrada, salida];

        let sql = `SELECT h.id,
                          h.fecha_hora_entrada,
                          h.fecha_hora_salida
                   FROM horarios_programados h
                   JOIN asignaciones a ON a.id = h.asignacion_id
                   WHERE a.trabajador_id = ?
                     AND h.fecha_hora_salida > ?
                     AND h.fecha_hora_entrada < ?`;

        if (excluir_id) {
            sql += " AND h.id <> ?";
            params.push(excluir_id);
        }

        const [rows] = await db.query(sql, params);

        res.json({
            conflicto: rows.length > 0,
            guardias: rows
        });
    } catch (error) {
        console.error("verificarConflicto:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};

exports.createGuardia = async (req, res) => {
    const {
        asignacion_id,
        fecha_hora_entrada,
        fecha_hora_salida
    } = req.body || {};

    const entrada = aFechaSql(fecha_hora_entrada);
    const salida = aFechaSql(fecha_hora_salida);

    if (!asignacion_id || !entrada || !salida) {
        return res.status(400).json({
            error: "asignacion_id, fecha_hora_entrada y fecha_hora_salida son obligatorios"
        });
    }

    if (salida <= entrada) {
        return res.status(400).json({
            error: "La salida debe ser posterior a la entrada"
        });
    }

    const dia = entrada.slice(0, 10);
    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        const [asignaciones] = await conn.query(
            `SELECT a.id, a.trabajador_id
             FROM asignaciones a
             WHERE a.id = ?
               AND a.activo = 1
               AND ? >= a.fecha_inicio
               AND (a.fecha_fin IS NULL OR ? <= a.fecha_fin)
             FOR UPDATE`,
            [asignacion_id, dia, dia]
        );

        if (asignaciones.length === 0) {
            await conn.rollback();

            return res.status(400).json({
                error: "La asignación no existe, está inactiva o la fecha está fuera de su vigencia"
            });
        }

        const { trabajador_id } = asignaciones[0];

        const [conflictos] = await conn.query(
            `SELECT h.id
             FROM horarios_programados h
             JOIN asignaciones a ON a.id = h.asignacion_id
             WHERE a.trabajador_id = ?
               AND h.fecha_hora_salida > ?
               AND h.fecha_hora_entrada < ?
             LIMIT 1`,
            [trabajador_id, entrada, salida]
        );

        if (conflictos.length > 0) {
            await conn.rollback();

            return res.status(409).json({
                error: "El prestador ya tiene una guardia en ese horario"
            });
        }

        const [result] = await conn.query(
            `INSERT INTO horarios_programados
                (asignacion_id, fecha_hora_entrada, fecha_hora_salida)
             VALUES (?, ?, ?)`,
            [asignacion_id, entrada, salida]
        );

        await conn.commit();

        res.status(201).json({
            mensaje: "Guardia creada correctamente",
            id: result.insertId
        });
    } catch (error) {
        await conn.rollback();
        console.error("createGuardia:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    } finally {
        conn.release();
    }
};

exports.updateGuardia = async (req, res) => {
    const { id } = req.params;
    const {
        fecha_hora_entrada,
        fecha_hora_salida
    } = req.body || {};

    const entrada = aFechaSql(fecha_hora_entrada);
    const salida = aFechaSql(fecha_hora_salida);

    if (!entrada || !salida) {
        return res.status(400).json({
            error: "fecha_hora_entrada y fecha_hora_salida son obligatorias"
        });
    }

    if (salida <= entrada) {
        return res.status(400).json({
            error: "La salida debe ser posterior a la entrada"
        });
    }

    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        const [guardias] = await conn.query(
            `SELECT h.id,
                    a.trabajador_id,
                    (SELECT COUNT(*)
                     FROM registros_asistencia ra
                     WHERE ra.horario_programado_id = h.id
                       AND ra.fecha_hora_entrada_real IS NOT NULL) AS iniciada
             FROM horarios_programados h
             JOIN asignaciones a ON a.id = h.asignacion_id
             WHERE h.id = ?
             FOR UPDATE`,
            [id]
        );

        if (guardias.length === 0) {
            await conn.rollback();

            return res.status(404).json({ error: "Guardia no encontrada" });
        }

        const guardia = guardias[0];

        if (Number(guardia.iniciada) > 0) {
            await conn.rollback();

            return res.status(409).json({
                error: "No se puede modificar una guardia que ya fue iniciada"
            });
        }

        const [conflictos] = await conn.query(
            `SELECT h.id
             FROM horarios_programados h
             JOIN asignaciones a ON a.id = h.asignacion_id
             WHERE a.trabajador_id = ?
               AND h.id <> ?
               AND h.fecha_hora_salida > ?
               AND h.fecha_hora_entrada < ?
             LIMIT 1`,
            [guardia.trabajador_id, id, entrada, salida]
        );

        if (conflictos.length > 0) {
            await conn.rollback();

            return res.status(409).json({
                error: "El prestador ya tiene otra guardia en ese horario"
            });
        }

        await conn.query(
            `UPDATE horarios_programados
             SET fecha_hora_entrada = ?,
                 fecha_hora_salida = ?
             WHERE id = ?`,
            [entrada, salida, id]
        );

        await conn.commit();

        res.json({ mensaje: "Guardia actualizada" });
    } catch (error) {
        await conn.rollback();
        console.error("updateGuardia:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    } finally {
        conn.release();
    }
};
