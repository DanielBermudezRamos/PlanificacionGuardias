const db = require("../config/db");

exports.getPrestadores = async (req, res) => {

    try {

        const [rows] = await db.query("SELECT * FROM prestadores");

        res.json(rows);

    } catch (error) {

        res.status(500).json({ error: error.message });

    }

};

exports.createPrestador = async (req, res) => {

    try {

        const { nombre, dni, telefono } = req.body;

        await db.query(
            "INSERT INTO prestadores (nombre,dni,telefono) VALUES (?,?,?)",
            [nombre, dni, telefono]
        );

        res.json({ mensaje: "Prestador creado" });

    } catch (error) {

        res.status(500).json({ error: error.message });

    }

};