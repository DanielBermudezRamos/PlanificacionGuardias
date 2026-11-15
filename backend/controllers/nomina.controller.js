const db = require("../config/db");

exports.generarNomina = async (req, res) => {
    const mes = Number(req.body?.mes);
    const anio = Number(req.body?.anio);

    if (
        !Number.isInteger(mes) || mes < 1 || mes > 12 ||
        !Number.isInteger(anio) || anio < 2000 || anio > 2100
    ) {
        return res.status(400).json({
            error: "mes (1-12) y anio son obligatorios"
        });
    }

    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        const [filas] = await conn.query(
            `SELECT trabajador_id,
                    paciente_id,
                    total_horas_normales,
                    total_horas_feriados,
                    precio_hora_normal_aplicado,
                    precio_hora_feriado_aplicado
             FROM vista_calculo_nomina
             WHERE mes = ? AND anio = ?`,
            [mes, anio]
        );

        let generados = 0;
        let omitidos = 0;
        let detalles = 0;

        for (const fila of filas) {
            const [existentes] = await conn.query(
                `SELECT id, pagado
                 FROM nomina_mensual
                 WHERE trabajador_id = ?
                   AND paciente_id = ?
                   AND mes = ?
                   AND anio = ?
                 FOR UPDATE`,
                [fila.trabajador_id, fila.paciente_id, mes, anio]
            );

            if (existentes.length > 0 && existentes[0].pagado) {
                omitidos += 1;
                continue;
            }

            const [upsert] = await conn.query(
                `INSERT INTO nomina_mensual
                    (trabajador_id, paciente_id, mes, anio,
                     total_horas_normales, total_horas_feriados,
                     precio_hora_normal, precio_hora_feriado)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    id = LAST_INSERT_ID(id),
                    total_horas_normales = VALUES(total_horas_normales),
                    total_horas_feriados = VALUES(total_horas_feriados),
                    precio_hora_normal = VALUES(precio_hora_normal),
                    precio_hora_feriado = VALUES(precio_hora_feriado)`,
                [
                    fila.trabajador_id,
                    fila.paciente_id,
                    mes,
                    anio,
                    fila.total_horas_normales ?? 0,
                    fila.total_horas_feriados ?? 0,
                    fila.precio_hora_normal_aplicado,
                    fila.precio_hora_feriado_aplicado
                ]
            );

            const nominaId = upsert.insertId;

            await conn.query(
                "DELETE FROM detalle_horas_trabajadas WHERE nomina_mensual_id = ?",
                [nominaId]
            );

            const [detalle] = await conn.query(
                `INSERT INTO detalle_horas_trabajadas
                    (nomina_mensual_id, horario_programado_id, fecha,
                     horas_normales, horas_feriado, es_feriado)
                 SELECT ?,
                        hp.id,
                        DATE(hp.fecha_hora_entrada),
                        CASE WHEN f.id IS NULL THEN ra.horas_reales ELSE 0 END,
                        CASE WHEN f.id IS NOT NULL THEN ra.horas_reales ELSE 0 END,
                        CASE WHEN f.id IS NULL THEN 0 ELSE 1 END
                 FROM horarios_programados hp
                 JOIN asignaciones a ON a.id = hp.asignacion_id
                 JOIN registros_asistencia ra
                    ON ra.horario_programado_id = hp.id
                 LEFT JOIN feriados f
                    ON f.fecha = DATE(hp.fecha_hora_entrada)
                 WHERE a.trabajador_id = ?
                   AND a.paciente_id = ?
                   AND ra.horas_reales IS NOT NULL
                   AND YEAR(hp.fecha_hora_entrada) = ?
                   AND MONTH(hp.fecha_hora_entrada) = ?`,
                [
                    nominaId,
                    fila.trabajador_id,
                    fila.paciente_id,
                    anio,
                    mes
                ]
            );

            detalles += detalle.affectedRows;
            generados += 1;
        }

        await conn.commit();

        res.json({
            mensaje: filas.length === 0
                ? "No hay horas cerradas para el período"
                : "Nómina generada",
            registros: generados,
            omitidos,
            detalles
        });
    } catch (error) {
        await conn.rollback();
        console.error("generarNomina:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    } finally {
        conn.release();
    }
};

exports.getNomina = async (req, res) => {
    try {
        const condiciones = [];
        const params = [];

        if (req.usuario.rol === "prestador") {
            if (!req.usuario.trabajador_id) {
                return res.status(403).json({
                    error: "Tu usuario no está vinculado a un trabajador"
                });
            }

            condiciones.push("n.trabajador_id = ?");
            params.push(req.usuario.trabajador_id);
        }

        const mes = Number(req.query.mes);
        const anio = Number(req.query.anio);

        if (Number.isInteger(mes) && mes >= 1 && mes <= 12) {
            condiciones.push("n.mes = ?");
            params.push(mes);
        }

        if (Number.isInteger(anio) && anio >= 2000) {
            condiciones.push("n.anio = ?");
            params.push(anio);
        }

        const where = condiciones.length > 0
            ? " WHERE " + condiciones.join(" AND ")
            : "";

        const [rows] = await db.query(
            `SELECT n.id,
                    n.trabajador_id,
                    t.nombre AS trabajador,
                    n.paciente_id,
                    p.nombre AS paciente,
                    n.mes,
                    n.anio,
                    n.total_horas_normales,
                    n.total_horas_feriados,
                    n.precio_hora_normal,
                    n.precio_hora_feriado,
                    n.subtotal_normales,
                    n.subtotal_feriados,
                    n.total_a_pagar,
                    n.pagado,
                    n.fecha_pago
             FROM nomina_mensual n
             JOIN trabajadores t ON t.id = n.trabajador_id
             JOIN pacientes p ON p.id = n.paciente_id${where}
             ORDER BY n.anio DESC, n.mes DESC, t.nombre`,
            params
        );

        res.json(rows);
    } catch (error) {
        console.error("getNomina:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};

exports.getDetalleNomina = async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: "id inválido" });
    }

    try {
        const [nominas] = await db.query(
            `SELECT id, trabajador_id, mes, anio
             FROM nomina_mensual
             WHERE id = ?`,
            [id]
        );

        if (nominas.length === 0) {
            return res.status(404).json({ error: "Nómina no encontrada" });
        }

        const nomina = nominas[0];

        if (
            req.usuario.rol === "prestador" &&
            nomina.trabajador_id !== req.usuario.trabajador_id
        ) {
            return res.status(403).json({
                error: "No tenés acceso a esta nómina"
            });
        }

        const [detalles] = await db.query(
            `SELECT d.id,
                    d.fecha,
                    d.horas_normales,
                    d.horas_feriado,
                    d.es_feriado,
                    d.horario_programado_id,
                    hp.fecha_hora_entrada,
                    hp.fecha_hora_salida
             FROM detalle_horas_trabajadas d
             JOIN horarios_programados hp
                ON hp.id = d.horario_programado_id
             WHERE d.nomina_mensual_id = ?
             ORDER BY d.fecha, hp.fecha_hora_entrada`,
            [id]
        );

        res.json({
            nomina_id: id,
            mes: nomina.mes,
            anio: nomina.anio,
            detalles
        });
    } catch (error) {
        console.error("getDetalleNomina:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};

exports.marcarPagada = async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: "id inválido" });
    }

    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        const [nominas] = await conn.query(
            `SELECT id, pagado
             FROM nomina_mensual
             WHERE id = ?
             FOR UPDATE`,
            [id]
        );

        if (nominas.length === 0) {
            await conn.rollback();

            return res.status(404).json({ error: "Nómina no encontrada" });
        }

        if (nominas[0].pagado) {
            await conn.rollback();

            return res.status(409).json({
                error: "La nómina ya está marcada como pagada"
            });
        }

        await conn.query(
            `UPDATE nomina_mensual
             SET pagado = 1,
                 fecha_pago = CURDATE()
             WHERE id = ?`,
            [id]
        );

        const [rows] = await conn.query(
            `SELECT id, pagado, fecha_pago
             FROM nomina_mensual
             WHERE id = ?`,
            [id]
        );

        await conn.commit();

        res.json({
            mensaje: "Nómina marcada como pagada",
            nomina: rows[0]
        });
    } catch (error) {
        await conn.rollback();
        console.error("marcarPagada:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    } finally {
        conn.release();
    }
};
