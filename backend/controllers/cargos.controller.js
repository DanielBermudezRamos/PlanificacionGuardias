const db = require("../config/db");

exports.getCargos = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT id, nombre, descripcion
             FROM cargos
             ORDER BY nombre`
        );

        res.json(rows);
    } catch (error) {
        console.error("getCargos:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};
