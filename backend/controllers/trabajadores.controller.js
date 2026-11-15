const db = require("../config/db");
const {
    soloDigitos,
    normalizarCuit,
    normalizarTelefono,
    normalizarCbu
} = require("../utils/documentos");

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

async function validarTrabajador(body) {
    const nombre = textoOpcional(body.nombre);
    const dni = soloDigitos(body.dni) || null;
    const cuit = normalizarCuit(body.cuit);
    const cbu = normalizarCbu(body.cbu);
    const telefono = normalizarTelefono(body.telefono);
    const telefonoAlternativo = normalizarTelefono(body.telefono_alternativo);
    const cargoId = Number(body.cargo_id);

    if (!nombre || !body.cargo_id) {
        return { error: "nombre y cargo_id son obligatorios" };
    }

    if (nombre.length > 100) {
        return { error: "El nombre no puede superar los 100 caracteres" };
    }

    if (dni && dni.length > 20) {
        return { error: "El DNI no puede superar los 20 caracteres" };
    }

    if (cuit && cuit.length !== 11) {
        return { error: "El CUIT/CUIL debe tener 11 dígitos" };
    }

    if (cbu && cbu.length > 50) {
        return { error: "El CBU/CVU no puede superar los 50 caracteres" };
    }

    if (!Number.isInteger(cargoId) || cargoId <= 0) {
        return { error: "El cargo indicado no existe" };
    }

    if (telefono && telefono.length > 20) {
        return { error: "El teléfono no puede superar los 20 caracteres" };
    }

    if (telefonoAlternativo && telefonoAlternativo.length > 20) {
        return {
            error: "El teléfono alternativo no puede superar los 20 caracteres"
        };
    }

    const [cargos] = await db.query(
        "SELECT id FROM cargos WHERE id = ?",
        [cargoId]
    );

    if (cargos.length === 0) {
        return { error: "El cargo indicado no existe" };
    }

    return {
        datos: {
            nombre,
            dni,
            cuit,
            cbu,
            telefono,
            telefonoAlternativo,
            cargoId,
            activo: body.activo === undefined ||
                body.activo === null ||
                body.activo === ""
                ? null
                : esActivo(body.activo, 1) ? 1 : 0
        }
    };
}

exports.getTrabajadores = async (req, res) => {
    try {
        const condiciones = [];
        const params = [];

        if (req.query.activo !== undefined) {
            condiciones.push("t.activo = ?");
            params.push(Number(req.query.activo) ? 1 : 0);
        }

        if (req.query.cargo_id) {
            condiciones.push("t.cargo_id = ?");
            params.push(req.query.cargo_id);
        }

        if (req.query.solo_prestadores === "1" ||
            req.query.solo_prestadores === "true") {
            condiciones.push("c.nombre NOT IN ('Coordinador', 'Programador')");
        }

        const where = condiciones.length > 0
            ? " WHERE " + condiciones.join(" AND ")
            : "";

        const puedeVerDatosBancarios = req.usuario &&
            ["admin", "coordinador"].includes(req.usuario.rol);
        const camposDatos = puedeVerDatosBancarios
            ? "t.cuit, t.cbu"
            : "NULL AS cuit, NULL AS cbu";

        const [rows] = await db.query(
            `SELECT t.id,
                    t.nombre,
                    t.dni,
                    ${camposDatos},
                    t.telefono,
                    t.telefono_alternativo,
                    t.cargo_id,
                    c.nombre AS cargo,
                    t.activo
             FROM trabajadores t
             JOIN cargos c ON c.id = t.cargo_id${where}
             ORDER BY t.nombre`,
            params
        );

        res.json(rows);
    } catch (error) {
        console.error("getTrabajadores:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};

exports.createTrabajador = async (req, res) => {
    try {
        const validacion = await validarTrabajador(req.body || {});

        if (validacion.error) {
            return res.status(400).json({ error: validacion.error });
        }

        const {
            nombre,
            dni,
            cuit,
            cbu,
            telefono,
            telefonoAlternativo,
            cargoId,
            activo
        } = validacion.datos;

        const [result] = await db.query(
            `INSERT INTO trabajadores
                (nombre, dni, cuit, cbu, telefono, telefono_alternativo,
                 cargo_id, activo)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                nombre,
                dni,
                cuit,
                cbu,
                telefono,
                telefonoAlternativo,
                cargoId,
                activo ?? 1
            ]
        );

        res.status(201).json({
            mensaje: "Trabajador creado",
            id: result.insertId
        });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                error: "Ya existe un trabajador con ese DNI o CUIT"
            });
        }

        console.error("createTrabajador:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};

exports.updateTrabajador = async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: "Trabajador inválido" });
    }

    try {
        const validacion = await validarTrabajador(req.body || {});

        if (validacion.error) {
            return res.status(400).json({ error: validacion.error });
        }

        const {
            nombre,
            dni,
            cuit,
            cbu,
            telefono,
            telefonoAlternativo,
            cargoId,
            activo
        } = validacion.datos;

        const [result] = await db.query(
            `UPDATE trabajadores
             SET nombre = ?,
                 dni = ?,
                 cuit = ?,
                 cbu = ?,
                 telefono = ?,
                 telefono_alternativo = ?,
                 cargo_id = ?,
                 activo = COALESCE(?, activo)
             WHERE id = ?`,
            [
                nombre,
                dni,
                cuit,
                cbu,
                telefono,
                telefonoAlternativo,
                cargoId,
                activo,
                id
            ]
        );

        if (result.affectedRows === 0) {
            const [existentes] = await db.query(
                "SELECT id FROM trabajadores WHERE id = ?",
                [id]
            );

            if (existentes.length === 0) {
                return res.status(404).json({
                    error: "Trabajador no encontrado"
                });
            }
        }

        res.json({ mensaje: "Trabajador actualizado" });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                error: "Ya existe un trabajador con ese DNI o CUIT"
            });
        }

        console.error("updateTrabajador:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};
