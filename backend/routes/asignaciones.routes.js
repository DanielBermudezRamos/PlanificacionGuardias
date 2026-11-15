const express = require("express");
const router = express.Router();

const db = require("../config/db");
const auth = require("../middleware/auth");

router.get("/buscar", auth, async (req, res) => {
    try {
        const { paciente_id, trabajador_id } = req.query;

        if (!paciente_id || !trabajador_id) {
            return res.status(400).json({
                error: "paciente_id y trabajador_id son obligatorios"
            });
        }

        const [rows] = await db.query(
            `SELECT id
             FROM asignaciones
             WHERE paciente_id = ?
               AND trabajador_id = ?
               AND activo = 1
             LIMIT 1`,
            [paciente_id, trabajador_id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                error: "No existe una asignación activa"
            });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error("asignaciones/buscar:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

router.post(
    "/buscar-o-crear",
    auth,
    auth.requireRole("admin", "coordinador"),
    async (req, res) => {
        try {
            const { paciente_id, trabajador_id } = req.body || {};

            if (!paciente_id || !trabajador_id) {
                return res.status(400).json({
                    error: "paciente_id y trabajador_id son obligatorios"
                });
            }

            const [pacientes] = await db.query(
                "SELECT id FROM pacientes WHERE id = ?",
                [paciente_id]
            );

            if (pacientes.length === 0) {
                return res.status(404).json({
                    error: "Paciente no encontrado"
                });
            }

            const [trabajadores] = await db.query(
                "SELECT id FROM trabajadores WHERE id = ? AND activo = 1",
                [trabajador_id]
            );

            if (trabajadores.length === 0) {
                return res.status(400).json({
                    error: "Trabajador no encontrado o inactivo"
                });
            }

            const [result] = await db.query(
                `INSERT INTO asignaciones
                    (trabajador_id, paciente_id, activo, fecha_inicio)
                 VALUES (?, ?, 1, CURDATE())
                 ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
                [trabajador_id, paciente_id]
            );

            res.json({ id: result.insertId });
        } catch (error) {
            console.error("asignaciones/buscar-o-crear:", error);
            res.status(500).json({ error: "Error interno del servidor" });
        }
    }
);

router.get("/trabajadores", auth, async (req, res) => {
    try {
        const { paciente_id } = req.query;

        if (!paciente_id) {
            return res.status(400).json({
                error: "paciente_id es obligatorio"
            });
        }

        const [asignados] = await db.query(
            `SELECT t.id,
                    t.nombre,
                    c.nombre AS cargo,
                    'asignado' AS tipo
             FROM asignaciones a
             JOIN trabajadores t ON t.id = a.trabajador_id
             JOIN cargos c ON c.id = t.cargo_id
             WHERE a.paciente_id = ?
               AND a.activo = 1
             ORDER BY t.nombre`,
            [paciente_id]
        );

        const [disponibles] = await db.query(
            `SELECT t.id,
                    t.nombre,
                    c.nombre AS cargo,
                    'disponible' AS tipo
             FROM trabajadores t
             JOIN cargos c ON c.id = t.cargo_id
             WHERE t.activo = 1
               AND c.nombre NOT IN ('Coordinador', 'Programador')
               AND t.id NOT IN (
                    SELECT trabajador_id
                    FROM asignaciones
                    WHERE paciente_id = ?
                      AND activo = 1
               )
             ORDER BY t.nombre`,
            [paciente_id]
        );

        res.json([...asignados, ...disponibles]);
    } catch (error) {
        console.error("asignaciones/trabajadores:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

module.exports = router;
