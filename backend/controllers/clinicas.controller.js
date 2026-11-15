const db = require("../config/db");
const { aNumero, coordenadaValida } = require("../utils/geo");

function textoOpcional(valor) {
    if (valor === undefined || valor === null) {
        return null;
    }

    const limpio = String(valor).trim();

    return limpio === "" ? null : limpio;
}

function esActivo(valor, porDefecto) {
    if (valor === undefined || valor === null || valor === "") {
        return porDefecto;
    }

    return valor === true || valor === 1 || valor === "1" || valor === "true";
}

function validarClinica(body) {
    const nombre = textoOpcional(body.nombre);

    if (!nombre) {
        return { error: "El nombre de la clínica es obligatorio" };
    }

    if (nombre.length > 150) {
        return {
            error: "El nombre no puede superar los 150 caracteres"
        };
    }

    const direccion = textoOpcional(body.direccion);
    const localidad = textoOpcional(body.localidad);
    const telefono = textoOpcional(body.telefono);
    const contacto = textoOpcional(body.contacto);
    const servicios = textoOpcional(body.servicios);

    if (direccion && direccion.length > 200) {
        return { error: "La dirección no puede superar los 200 caracteres" };
    }

    if (localidad && localidad.length > 100) {
        return { error: "La localidad no puede superar los 100 caracteres" };
    }

    if (telefono && telefono.length > 30) {
        return { error: "El teléfono no puede superar los 30 caracteres" };
    }

    if (contacto && contacto.length > 150) {
        return { error: "El contacto no puede superar los 150 caracteres" };
    }

    if (servicios && servicios.length > 5000) {
        return {
            error: "Los servicios no pueden superar los 5000 caracteres"
        };
    }

    const latitud = aNumero(body.latitud);
    const longitud = aNumero(body.longitud);

    if ((latitud === null) !== (longitud === null)) {
        return {
            error: "La latitud y la longitud deben cargarse juntas"
        };
    }

    if (latitud !== null && !coordenadaValida(latitud, longitud)) {
        return { error: "Las coordenadas no son válidas" };
    }

    return {
        datos: {
            nombre,
            direccion,
            localidad,
            telefono,
            contacto,
            servicios,
            latitud,
            longitud,
            activa: body.activa === undefined ||
                body.activa === null ||
                body.activa === ""
                ? null
                : esActivo(body.activa, 1) ? 1 : 0
        }
    };
}

exports.getClinicas = async (req, res) => {
    try {
        const condiciones = [];
        const params = [];

        if (req.query.activas === "1" || req.query.activas === "true") {
            condiciones.push("activa = 1");
        }

        const where = condiciones.length > 0
            ? " WHERE " + condiciones.join(" AND ")
            : "";

        const [rows] = await db.query(
            `SELECT id,
                    nombre,
                    direccion,
                    localidad,
                    telefono,
                    contacto,
                    servicios,
                    activa,
                    latitud,
                    longitud
             FROM clinicas${where}
             ORDER BY nombre`,
            params
        );

        res.json(rows);
    } catch (error) {
        console.error("getClinicas:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};

exports.createClinica = async (req, res) => {
    try {
        const validacion = validarClinica(req.body || {});

        if (validacion.error) {
            return res.status(400).json({ error: validacion.error });
        }

        const {
            nombre,
            direccion,
            localidad,
            telefono,
            contacto,
            servicios,
            latitud,
            longitud,
            activa
        } = validacion.datos;

        const [result] = await db.query(
            `INSERT INTO clinicas
                (nombre, direccion, localidad, telefono, contacto, servicios,
                 activa, latitud, longitud)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                nombre,
                direccion,
                localidad,
                telefono,
                contacto,
                servicios,
                activa ?? 1,
                latitud,
                longitud
            ]
        );

        res.status(201).json({
            mensaje: "Clínica creada",
            id: result.insertId
        });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                error: "Ya existe una clínica con ese nombre"
            });
        }

        console.error("createClinica:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};

exports.updateClinica = async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: "Clínica inválida" });
    }

    try {
        const validacion = validarClinica(req.body || {});

        if (validacion.error) {
            return res.status(400).json({ error: validacion.error });
        }

        const {
            nombre,
            direccion,
            localidad,
            telefono,
            contacto,
            servicios,
            latitud,
            longitud,
            activa
        } = validacion.datos;

        const [result] = await db.query(
            `UPDATE clinicas
             SET nombre = ?,
                 direccion = ?,
                 localidad = ?,
                 telefono = ?,
                 contacto = ?,
                 servicios = ?,
                 activa = COALESCE(?, activa),
                 latitud = ?,
                 longitud = ?
             WHERE id = ?`,
            [
                nombre,
                direccion,
                localidad,
                telefono,
                contacto,
                servicios,
                activa,
                latitud,
                longitud,
                id
            ]
        );

        if (result.affectedRows === 0) {
            const [existentes] = await db.query(
                "SELECT id FROM clinicas WHERE id = ?",
                [id]
            );

            if (existentes.length === 0) {
                return res.status(404).json({
                    error: "Clínica no encontrada"
                });
            }
        }

        res.json({ mensaje: "Clínica actualizada" });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                error: "Ya existe una clínica con ese nombre"
            });
        }

        console.error("updateClinica:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};
