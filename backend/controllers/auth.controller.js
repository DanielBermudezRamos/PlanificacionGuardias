const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.login = async (req, res) => {

    try {

        const { email, password } = req.body;

        const [rows] = await db.query(
            "SELECT * FROM usuarios WHERE email = ?",
            [email]
        );

        if (rows.length === 0) {

            return res.status(401).json({
                error: "Usuario no encontrado"
            });

        }

        const user = rows[0];

        const passwordValida = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordValida) {

            return res.status(401).json({
                error: "Contraseña incorrecta"
            });

        }

        const token = jwt.sign(
            {
                id: user.id,
                rol: user.rol,
                prestador_id: user.prestador_id
            },
            "CLAVE_SECRETA_PERMED",
            { expiresIn: "8h" }
        );

        res.json({
            token,
            usuario: {
                nombre: user.nombre,
                rol: user.rol
            }
        });

    } catch (error) {

        res.status(500).json({ error: error.message });

    }

};