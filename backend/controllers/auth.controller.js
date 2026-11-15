const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { jwtSecret, jwtExpiresIn } = require("../config/auth");

function usuarioPublico(usuario) {
    return {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol,
        trabajador_id: usuario.trabajador_id,
        trabajador_nombre: usuario.trabajador_nombre || usuario.nombre
    };
}

function firmarToken(usuario) {
    return jwt.sign(
        {
            sub: usuario.id,
            rol: usuario.rol,
            trabajador_id: usuario.trabajador_id
        },
        jwtSecret,
        { expiresIn: jwtExpiresIn }
    );
}

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body || {};

        if (!email || !password) {
            return res.status(400).json({
                error: "Email y contraseña son obligatorios"
            });
        }

        const [rows] = await db.query(
            `SELECT u.id, u.email, u.password_hash, u.nombre, u.rol,
                    u.trabajador_id, u.activo,
                    t.nombre AS trabajador_nombre
             FROM usuarios u
             LEFT JOIN trabajadores t ON t.id = u.trabajador_id
             WHERE u.email = ?
             LIMIT 1`,
            [email.trim().toLowerCase()]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                error: "Credenciales inválidas"
            });
        }

        const usuario = rows[0];

        if (!usuario.activo) {
            return res.status(403).json({
                error: "Usuario inactivo"
            });
        }

        const passwordValida = await bcrypt.compare(
            password,
            usuario.password_hash
        );

        if (!passwordValida) {
            return res.status(401).json({
                error: "Credenciales inválidas"
            });
        }

        const token = firmarToken(usuario);

        res.json({
            token,
            usuario: usuarioPublico(usuario)
        });
    } catch (error) {
        console.error("login:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};

exports.me = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT u.id, u.email, u.nombre, u.rol,
                    u.trabajador_id, u.activo,
                    t.nombre AS trabajador_nombre
             FROM usuarios u
             LEFT JOIN trabajadores t ON t.id = u.trabajador_id
             WHERE u.id = ?
             LIMIT 1`,
            [req.usuario.id]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                error: "Usuario no encontrado"
            });
        }

        const usuario = rows[0];

        if (!usuario.activo) {
            return res.status(403).json({
                error: "Usuario inactivo"
            });
        }

        res.json({
            usuario: usuarioPublico(usuario)
        });
    } catch (error) {
        console.error("me:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};
