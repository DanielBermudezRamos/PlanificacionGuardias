const db = require("../config/db");

exports.sugerirReemplazos = async (req, res) => {
    try {
        const { horario_id } = req.params;

        const [guardias] = await db.query(
            `SELECT h.fecha_hora_entrada,
                    h.fecha_hora_salida,
                    a.trabajador_id,
                    t.cargo_id
             FROM horarios_programados h
             JOIN asignaciones a ON a.id = h.asignacion_id
             JOIN trabajadores t ON t.id = a.trabajador_id
             WHERE h.id = ?`,
            [horario_id]
        );

        if (guardias.length === 0) {
            return res.status(404).json({ error: "Guardia no encontrada" });
        }

        const {
            fecha_hora_entrada,
            fecha_hora_salida,
            trabajador_id,
            cargo_id
        } = guardias[0];

        const [sugerencias] = await db.query(
            `SELECT t.id, t.nombre, c.nombre AS cargo
             FROM trabajadores t
             JOIN cargos c ON c.id = t.cargo_id
             WHERE t.cargo_id = ?
               AND t.activo = 1
               AND t.id <> ?
               AND t.id NOT IN (
                    SELECT a2.trabajador_id
                    FROM horarios_programados h2
                    JOIN asignaciones a2 ON a2.id = h2.asignacion_id
                    WHERE h2.fecha_hora_salida > ?
                      AND h2.fecha_hora_entrada < ?
               )
             ORDER BY t.nombre`,
            [cargo_id, trabajador_id, fecha_hora_entrada, fecha_hora_salida]
        );

        res.json({
            guardia: horario_id,
            sugerencias
        });
    } catch (error) {
        console.error("sugerirReemplazos:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};
