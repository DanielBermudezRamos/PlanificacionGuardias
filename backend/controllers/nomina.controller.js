const db = require("../config/db");

exports.generarNomina = async (req, res) => {

    try {

        const { mes, anio } = req.body;

        const [registros] = await db.query(`SELECT pr.id prestador_id,
                p.id paciente_id,
                SUM(r.horas_reales) horas
            FROM registros_asistencia r
            JOIN horarios_programados h ON r.horario_programado_id = h.id
            JOIN asignaciones a ON h.asignacion_id = a.id
            JOIN prestadores pr ON a.prestador_id = pr.id
            JOIN pacientes p ON a.paciente_id = p.id
            WHERE MONTH(h.fecha_hora_entrada) = ?
                AND YEAR(h.fecha_hora_entrada) = ?
            GROUP BY pr.id, p.id`, [mes, anio]);

        for (let row of registros) {

            const precioHora = 1500; // luego vendrá de la tabla precios

            const total = row.horas * precioHora;

            await db.query(`INSERT INTO nomina_mensual( prestador_id, paciente_id,
                    mes, anio, total_horas_normales, 
                    honorario_hora_normal, total_honorarios)
                VALUES (?,?,?,?,?,?,?)`,
            [
                row.prestador_id,
                row.paciente_id,
                mes,
                anio,
                row.horas,
                precioHora,
                total
            ]);

        }

        res.json({
            mensaje: "Nomina generada",
            registros: registros.length
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }

};

exports.getNomina = async (req, res) => {

    try {
        let query = `SELECT n.id,
                pr.nombre prestador,
                p.nombre paciente,
                n.total_horas_normales,
                n.total_honorarios
            FROM nomina_mensual n
            JOIN prestadores pr ON n.prestador_id = pr.id
            JOIN pacientes p ON n.paciente_id = p.id`;

        let params = [];

        if(req.usuario.rol === "prestador") {
            query += " WHERE n.prestador_id = ?";
            params.push(req.usuario.prestador_id);
        }

        const [rows] = await db.query(queryStr, params);
        res.json(rows);

    } catch (error) {

        res.status(500).json({ error: error.message });

    }

};