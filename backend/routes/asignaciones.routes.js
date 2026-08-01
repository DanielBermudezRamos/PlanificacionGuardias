const express = require("express");
const router = express.Router();
const db = require("../config/db");

router.get("/buscar", async(req,res) => {

    try{

        const {paciente_id,prestador_id} = req.query;

        // buscar si existe
        const [rows] = await db.query(`SELECT id
            FROM asignaciones
            WHERE paciente_id = ?
            AND prestador_id = ?
        LIMIT 1`,[paciente_id,prestador_id]);

        if(rows.length > 0) {
            return res.json(rows[0]);
        }

        // 🔹 SI NO EXISTE → crear asignación automáticamente
        const [result] = await db.query(`INSERT INTO asignaciones  
            (paciente_id,prestador_id,fecha_inicio,activo)
        VALUES (?,?,NOW(),1)`,[paciente_id,prestador_id]);

        res.json({id: result.insertId});

    }catch(error){
        res.status(500).json({error:error.message});
    }

});

router.get("/prestadores", async (req,res)=>{

    try {
        const {paciente_id} = req.query;

        // 🔹 prestadores asignados
        const [asignados] = await db.query(`
        SELECT pr.id, pr.nombre, 'asignado' as tipo
        FROM asignaciones a
        JOIN prestadores pr ON a.prestador_id = pr.id
        WHERE a.paciente_id = ?
        `,[paciente_id]);

        // 🔹 todos los prestadores activos
        const [todos] = await db.query(`
        SELECT id, nombre, 'disponible' as tipo
        FROM prestadores
        WHERE activo = 1
        `);

        // 🔹 eliminar duplicados
        const idsAsignados = asignados.map(p=>p.id);

        const disponibles = todos.filter(p=>!idsAsignados.includes(p.id));

        // 🔹 combinar resultados
        res.json([...asignados,...disponibles]);

    } catch(error) {
        res.status(500).json({error:error.message});
    }

});

module.exports = router;