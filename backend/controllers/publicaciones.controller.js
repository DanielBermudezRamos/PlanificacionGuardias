const db = require("../config/db");
const { aFechaSql } = require("../utils/fechas");

function listaTrabajadores(valor) {
    if (!Array.isArray(valor)) {
        return [];
    }

    const ids = valor
        .map((item) => Number(item))
        .filter((id) => Number.isInteger(id) && id > 0);

    return [...new Set(ids)];
}

function esVerdadero(valor) {
    return valor === true || valor === 1 || valor === "1" || valor === "true";
}

function textoOpcional(valor) {
    if (valor === undefined || valor === null) {
        return null;
    }

    const limpio = String(valor).trim();

    return limpio === "" ? null : limpio;
}

async function validarPublicacion(body, conn) {
    const pacienteId = Number(body.paciente_id);

    if (!Number.isInteger(pacienteId) || pacienteId <= 0) {
        return { error: "El paciente es obligatorio" };
    }

    const [pacientes] = await conn.query(
        "SELECT id FROM pacientes WHERE id = ?",
        [pacienteId]
    );

    if (pacientes.length === 0) {
        return { error: "El paciente indicado no existe" };
    }

    const entrada = aFechaSql(body.fecha_hora_entrada);
    const salida = aFechaSql(body.fecha_hora_salida);

    if (!entrada || !salida) {
        return {
            error: "La fecha y hora de inicio y de fin son obligatorias"
        };
    }

    if (salida <= entrada) {
        return { error: "El fin debe ser posterior al inicio" };
    }

    const precio = Number(body.precio);

    if (!Number.isFinite(precio) || precio < 0) {
        return { error: "El precio debe ser un número mayor o igual a 0" };
    }

    if (precio > 99999999.99) {
        return { error: "El precio es demasiado alto" };
    }

    const direccion = textoOpcional(body.direccion);
    const patologia = textoOpcional(body.patologia);

    if (direccion && direccion.length > 200) {
        return { error: "La dirección no puede superar los 200 caracteres" };
    }

    if (patologia && patologia.length > 5000) {
        return { error: "La patología no puede superar los 5000 caracteres" };
    }

    const paraTodos = esVerdadero(body.para_todos);
    const trabajadores = paraTodos ? [] : listaTrabajadores(body.trabajadores);

    if (!paraTodos && trabajadores.length === 0) {
        return {
            error: "Elegí al menos un prestador o la opción Todos los prestadores"
        };
    }

    if (trabajadores.length > 0) {
        const [existentes] = await conn.query(
            "SELECT id FROM trabajadores WHERE id IN (?)",
            [trabajadores]
        );

        if (existentes.length !== trabajadores.length) {
            return {
                error: "Alguno de los prestadores seleccionados no existe"
            };
        }
    }

    return {
        datos: {
            pacienteId,
            direccion,
            patologia,
            entrada,
            salida,
            precio: Math.round(precio * 100) / 100,
            paraTodos: paraTodos ? 1 : 0
        },
        trabajadores
    };
}

async function guardarDestinatarios(conn, publicacionId, trabajadores) {
    if (trabajadores.length === 0) {
        return;
    }

    const pares = trabajadores.map((trabajadorId) => [
        publicacionId,
        trabajadorId
    ]);

    await conn.query(
        `INSERT INTO publicaciones_destinatarios
            (publicacion_id, trabajador_id)
         VALUES ?`,
        [pares]
    );
}

exports.getPublicaciones = async (req, res) => {
    try {
        const esPrestador = req.usuario.rol === "prestador";
        const condiciones = [];
        const params = [];

        if (esPrestador) {
            if (!req.usuario.trabajador_id) {
                return res.status(403).json({
                    error: "Tu usuario no está vinculado a un trabajador"
                });
            }

            condiciones.push(
                "p.activa = 1",
                `(p.para_todos = 1 OR EXISTS (
                    SELECT 1
                    FROM publicaciones_destinatarios d
                    WHERE d.publicacion_id = p.id
                      AND d.trabajador_id = ?
                ))`
            );
            params.push(req.usuario.trabajador_id);
        } else {
            condiciones.push("1 = 1");
        }

        const [publicaciones] = await db.query(
            `SELECT p.id,
                    p.paciente_id,
                    pa.nombre AS paciente,
                    p.direccion,
                    p.patologia,
                    p.fecha_hora_entrada,
                    p.fecha_hora_salida,
                    p.precio,
                    p.para_todos,
                    p.activa,
                    p.creado_por,
                    p.created_at,
                    p.updated_at,
                    COALESCE(u.nombre, u.email) AS creador
             FROM publicaciones_guardia p
             JOIN pacientes pa ON pa.id = p.paciente_id
             LEFT JOIN usuarios u ON u.id = p.creado_por
             WHERE ${condiciones.join(" AND ")}
             ORDER BY p.activa DESC,
                      p.fecha_hora_entrada ASC,
                      p.id DESC`,
            params
        );

        if (esPrestador || publicaciones.length === 0) {
            return res.json(
                publicaciones.map((publicacion) => ({
                    ...publicacion,
                    destinatarios: []
                }))
            );
        }

        const ids = publicaciones.map((publicacion) => publicacion.id);
        const [destinatarios] = await db.query(
            `SELECT d.publicacion_id,
                    t.id,
                    t.nombre
             FROM publicaciones_destinatarios d
             JOIN trabajadores t ON t.id = d.trabajador_id
             WHERE d.publicacion_id IN (?)
             ORDER BY t.nombre`,
            [ids]
        );

        const porPublicacion = new Map(
            ids.map((id) => [id, []])
        );

        for (const destinatario of destinatarios) {
            porPublicacion.get(destinatario.publicacion_id)?.push({
                id: destinatario.id,
                nombre: destinatario.nombre
            });
        }

        res.json(
            publicaciones.map((publicacion) => ({
                ...publicacion,
                destinatarios: porPublicacion.get(publicacion.id) || []
            }))
        );
    } catch (error) {
        console.error("getPublicaciones:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};

exports.createPublicacion = async (req, res) => {
    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        const validacion = await validarPublicacion(req.body || {}, conn);

        if (validacion.error) {
            await conn.rollback();
            return res.status(400).json({ error: validacion.error });
        }

        const { datos, trabajadores } = validacion;

        const [result] = await conn.query(
            `INSERT INTO publicaciones_guardia
                (paciente_id, direccion, patologia, fecha_hora_entrada,
                 fecha_hora_salida, precio, para_todos, activa, creado_por)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
            [
                datos.pacienteId,
                datos.direccion,
                datos.patologia,
                datos.entrada,
                datos.salida,
                datos.precio,
                datos.paraTodos,
                req.usuario.id
            ]
        );

        await guardarDestinatarios(conn, result.insertId, trabajadores);

        await conn.commit();

        res.status(201).json({
            mensaje: "Publicación creada",
            id: result.insertId
        });
    } catch (error) {
        await conn.rollback();
        console.error("createPublicacion:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    } finally {
        conn.release();
    }
};

exports.updatePublicacion = async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: "Publicación inválida" });
    }

    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        const [existentes] = await conn.query(
            "SELECT id FROM publicaciones_guardia WHERE id = ? FOR UPDATE",
            [id]
        );

        if (existentes.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: "Publicación no encontrada" });
        }

        const validacion = await validarPublicacion(req.body || {}, conn);

        if (validacion.error) {
            await conn.rollback();
            return res.status(400).json({ error: validacion.error });
        }

        const { datos, trabajadores } = validacion;

        await conn.query(
            `UPDATE publicaciones_guardia
             SET paciente_id = ?,
                 direccion = ?,
                 patologia = ?,
                 fecha_hora_entrada = ?,
                 fecha_hora_salida = ?,
                 precio = ?,
                 para_todos = ?
             WHERE id = ?`,
            [
                datos.pacienteId,
                datos.direccion,
                datos.patologia,
                datos.entrada,
                datos.salida,
                datos.precio,
                datos.paraTodos,
                id
            ]
        );

        await conn.query(
            "DELETE FROM publicaciones_destinatarios WHERE publicacion_id = ?",
            [id]
        );
        await guardarDestinatarios(conn, id, trabajadores);

        await conn.commit();

        res.json({ mensaje: "Publicación actualizada" });
    } catch (error) {
        await conn.rollback();
        console.error("updatePublicacion:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    } finally {
        conn.release();
    }
};

exports.cambiarEstadoPublicacion = async (req, res) => {
    const id = Number(req.params.id);
    const { activa } = req.body || {};

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: "Publicación inválida" });
    }

    if (typeof activa !== "boolean") {
        return res.status(400).json({
            error: "El campo activa es obligatorio y debe ser verdadero o falso"
        });
    }

    try {
        const [result] = await db.query(
            "UPDATE publicaciones_guardia SET activa = ? WHERE id = ?",
            [activa ? 1 : 0, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Publicación no encontrada" });
        }

        res.json({
            mensaje: activa
                ? "Publicación reabierta"
                : "Publicación cerrada"
        });
    } catch (error) {
        console.error("cambiarEstadoPublicacion:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};
