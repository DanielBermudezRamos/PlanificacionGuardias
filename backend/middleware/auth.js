const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config/auth");

module.exports = function (req, res, next) {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({
            error: "Token requerido"
        });
    }

    try {
        const decoded = jwt.verify(token, jwtSecret);

        req.usuario = {
            id: decoded.sub,
            rol: decoded.rol,
            trabajador_id: decoded.trabajador_id ?? null
        };

        next();
    } catch (error) {
        return res.status(401).json({
            error: "Token inválido o expirado"
        });
    }
};

module.exports.requireRole = function (...roles) {
    return function (req, res, next) {
        if (!req.usuario || !roles.includes(req.usuario.rol)) {
            return res.status(403).json({
                error: "No tenés permisos para esta acción"
            });
        }

        next();
    };
};
