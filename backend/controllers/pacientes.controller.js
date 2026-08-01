const db = require("../config/db");

exports.getPacientes = async (req, res) => {

    try {

        const [rows] = await db.query("SELECT * FROM pacientes");

        res.json(rows);

    } catch (error) {

        res.status(500).json({ error: error.message });

    }

};

exports.createPaciente = async (req, res) => {

    try {

        const { nombre, direccion, localidad, telefono_propio } = req.body;

        await db.query(
            "INSERT INTO pacientes (nombre,direccion,localidad,telefono_propio) VALUES (?,?,?,?)",
            [nombre, direccion, localidad, telefono_propio]
        );

        res.json({ mensaje: "Paciente creado" });

    } catch (error) {

        res.status(500).json({ error: error.message });

    }

};