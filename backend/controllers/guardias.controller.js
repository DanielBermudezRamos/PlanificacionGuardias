const db = require("../config/db");

exports.getGuardias = async (req, res) => {

    try {
        let query = `SELECT h.id,
            p.nombre paciente,
            pr.nombre prestador,
            h.fecha_hora_entrada,
            h.fecha_hora_salida,
            h.coordinador_id
            FROM horarios_programados h
            JOIN asignaciones a ON h.asignacion_id = a.id
            JOIN pacientes p ON a.paciente_id = p.id
            JOIN prestadores pr ON a.prestador_id = pr.id`;

        let params = [];

        if(req.usuario.rol === "coordinador") {
            query += " WHERE h.coordinador_id = ?";
            params.push(req.usuario.coordinador_id);
        }

        if(req.usuario.rol === "prestador") {
            query += " WHERE a.prestador_id = ?";
            params.push(req.usuario.prestador_id);
        }

        const [rows] = await db.query(query,params);
        res.json(rows);

    } catch(error) {
        res.status(500).json({error:error.message});
    }

};

exports.verificarConflicto = async (req,res)=>{

    try {
        const {
            prestador_id,
            fecha_hora_entrada,
            fecha_hora_salida
        } = req.query;

        const [rows] = await db.query(`SELECT h.id
            FROM horarios_programados h
            JOIN asignaciones a ON h.asignacion_id = a.id
            WHERE a.prestador_id = ?
                AND ((? < h.fecha_hora_salida)
                AND (? > h.fecha_hora_entrada))`,[
                prestador_id,
                fecha_hora_entrada,
                fecha_hora_salida
        ]);

        res.json({conflicto: rows.length > 0});

    }catch(error){
        res.status(500).json({error:error.message});
    }

};

exports.createGuardia = async (req, res) => {

    try {
        const {
            asignacion_id,
            coordinador_id,
            fecha_hora_entrada,
            fecha_hora_salida
        } = req.body;

        // obtener prestador de la asignación
        const [asignacion] = await db.query(
            "SELECT prestador_id FROM asignaciones WHERE id = ?",
            [asignacion_id]
        );

        const prestador_id = asignacion[0].prestador_id;

        // buscar conflictos
        const [conflictos] = await db.query(`SELECT h.id
        FROM horarios_programados h
        JOIN asignaciones a ON h.asignacion_id = a.id
        WHERE a.prestador_id = ?
            AND ((? < h.fecha_hora_salida)
            AND (? > h.fecha_hora_entrada))`,
        [prestador_id, fecha_hora_entrada, fecha_hora_salida]);

        if (conflictos.length > 0) {

            return res.status(400).json({
                error: "El prestador ya tiene una guardia en ese horario"
            });

        }

        // crear guardia
        await db.query(`INSERT INTO horarios_programados
        (asignacion_id, coordinador_id, fecha_hora_entrada, fecha_hora_salida)
        VALUES (?,?,?,?)`, [asignacion_id, coordinador_id, fecha_hora_entrada, fecha_hora_salida]);

        res.json({
            mensaje: "Guardia creada correctamente"
        });

    } catch (error) {

        res.status(500).json({
            error: error.message
        });

    }

};

exports.updateGuardia = async (req, res) => {

    try {
        const {id} = req.params;

        const {
            fecha_hora_entrada,
            fecha_hora_salida
        } = req.body;

        await db.query(`UPDATE horarios_programados SET
            fecha_hora_entrada = ?,
            fecha_hora_salida = ?
        WHERE id = ?`, [fecha_hora_entrada, fecha_hora_salida, id]);

        res.json({mensaje:"Guardia actualizada"});

    } catch(error) {
        res.status(500).json({error:error.message});
    }

};