const db = require("../config/db");

exports.getCalendario = async (req, res) => {

    try {

        const { desde, hasta } = req.query;

        const [rows] = await db.query(`SELECT 
        h.id,
        h.fecha_hora_entrada,
        h.fecha_hora_salida,
        pr.nombre prestador,
        p.nombre paciente

        FROM horarios_programados h

        JOIN asignaciones a
        ON h.asignacion_id = a.id

        JOIN prestadores pr
        ON a.prestador_id = pr.id

        JOIN pacientes p
        ON a.paciente_id = p.id

        WHERE h.fecha_hora_entrada BETWEEN ? AND ?

        ORDER BY h.fecha_hora_entrada`, [desde, hasta]);

        res.json(rows);

    } catch (error) {

        res.status(500).json({ error: error.message });

    }

};