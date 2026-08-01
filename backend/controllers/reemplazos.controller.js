const db = require("../config/db");

exports.sugerirReemplazos = async (req, res) => {
    try {
        const { horario_id } = req.params;

        // 1) obtener datos de la guardia
        const [guardia] = await db.query(`SELECT 
            h.fecha_hora_entrada,
            h.fecha_hora_salida,
            a.prestador_id,
            p.cargo_id
        FROM horarios_programados h
        JOIN asignaciones a ON h.asignacion_id = a.id
        JOIN prestadores p ON a.prestador_id = p.id
        WHERE h.id = ?`, [horario_id]);

        if (guardia.length === 0) {
            return res.status(404).json({ error: "Guardia no encontrada" });
        }

        const { fecha_hora_entrada, fecha_hora_salida, prestador_id, cargo_id } = guardia[0];

        // 2) buscar prestadores candidatos
        const [prestadores] = await db.query(`SELECT pr.id, pr.nombre
        FROM prestadores pr
        WHERE pr.cargo_id = ?
            AND pr.activo = TRUE
            AND pr.id <> ?
            AND pr.id NOT IN (

                SELECT a2.prestador_id
                FROM horarios_programados h2
                JOIN asignaciones a2 ON h2.asignacion_id = a2.id
                WHERE (? < h2.fecha_hora_salida)
                    AND (? > h2.fecha_hora_entrada))`, [
            cargo_id,
            prestador_id,
            fecha_hora_entrada,
            fecha_hora_salida
        ]);

        res.json({
            guardia: horario_id,
            sugerencias: prestadores
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};