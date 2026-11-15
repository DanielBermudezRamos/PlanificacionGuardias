const dayjs = require("dayjs");
const db = require("../config/db");
const { aFechaSql } = require("../utils/fechas");

exports.getCalendario = async (req, res) => {
    try {
        const hoy = dayjs();

        const desde = aFechaSql(req.query.desde) ||
            hoy.startOf("month").format("YYYY-MM-DD HH:mm:ss");
        const hasta = aFechaSql(req.query.hasta) ||
            hoy.add(1, "month").startOf("month").format("YYYY-MM-DD HH:mm:ss");

        const condiciones = [
            "fecha_hora_entrada >= ?",
            "fecha_hora_entrada < ?"
        ];
        const params = [desde, hasta];

        if (req.usuario.rol === "prestador") {
            if (!req.usuario.trabajador_id) {
                return res.status(403).json({
                    error: "Tu usuario no está vinculado a un trabajador"
                });
            }

            condiciones.push("trabajador_id = ?");
            params.push(req.usuario.trabajador_id);
        }

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
                    estado_cumplimiento
             FROM vista_horarios_completa
             WHERE ${condiciones.join(" AND ")}
             ORDER BY fecha_hora_entrada`,
            params
        );

        res.json(rows);
    } catch (error) {
        console.error("getCalendario:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};
