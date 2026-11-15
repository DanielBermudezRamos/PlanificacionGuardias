const db = require("../config/db");
const dayjs = require("dayjs");
const { aNumero, coordenadaValida } = require("../utils/geo");

function textoOpcional(valor) {
    if (valor === undefined || valor === null) {
        return null;
    }

    const limpio = String(valor).trim();

    return limpio === "" ? null : limpio;
}

function enteroOpcional(valor, minimo, maximo) {
    if (valor === undefined || valor === null || valor === "") {
        return { valor: null };
    }

    const numero = Number(valor);

    if (!Number.isInteger(numero) || numero < minimo || numero > maximo) {
        return { error: true };
    }

    return { valor: numero };
}

function fechaOpcional(valor) {
    if (valor === undefined || valor === null || valor === "") {
        return { valor: null };
    }

    const fecha = dayjs(String(valor).trim());

    if (!fecha.isValid()) {
        return { error: true };
    }

    return { valor: fecha.format("YYYY-MM-DD") };
}

function esActivo(valor, porDefecto) {
    if (valor === undefined || valor === null || valor === "") {
        return porDefecto;
    }

    return valor === true || valor === 1 || valor === "1" || valor === "true";
}

async function validarPaciente(body) {
    const nombre = textoOpcional(body.nombre);

    if (!nombre) {
        return { error: "El nombre es obligatorio" };
    }

    if (nombre.length > 100) {
        return { error: "El nombre no puede superar los 100 caracteres" };
    }

    const patologia = textoOpcional(body.patologia);
    const direccion = textoOpcional(body.direccion);
    const telefono = textoOpcional(body.telefono_propio);
    const familiar = textoOpcional(body.familiar_responsable);
    const localidad = textoOpcional(body.localidad);
    const tipoServicio = textoOpcional(body.tipo_servicio);
    const modalidad = textoOpcional(body.modalidad);
    const dias = textoOpcional(body.dias_prestacion);
    const horario = textoOpcional(body.horario_prestacion);
    const horas = textoOpcional(body.horas_prestacion);
    const motivoBaja = textoOpcional(body.motivo_baja);
    const codigoPadron = textoOpcional(body.codigo_padron);

    if (direccion && direccion.length > 200) {
        return { error: "La dirección no puede superar los 200 caracteres" };
    }

    if (telefono && telefono.length > 20) {
        return { error: "El teléfono no puede superar los 20 caracteres" };
    }

    if (patologia && patologia.length > 5000) {
        return { error: "La patología no puede superar los 5000 caracteres" };
    }

    if (familiar && familiar.length > 150) {
        return {
            error: "El familiar responsable no puede superar los 150 caracteres"
        };
    }

    if (localidad && localidad.length > 100) {
        return { error: "La localidad no puede superar los 100 caracteres" };
    }

    if (tipoServicio && tipoServicio.length > 50) {
        return {
            error: "El tipo de servicio no puede superar los 50 caracteres"
        };
    }

    if (modalidad && modalidad.length > 100) {
        return { error: "La modalidad no puede superar los 100 caracteres" };
    }

    if (dias && dias.length > 100) {
        return { error: "Los días no pueden superar los 100 caracteres" };
    }

    if (horario && horario.length > 150) {
        return { error: "El horario no puede superar los 150 caracteres" };
    }

    if (horas && horas.length > 30) {
        return { error: "Las horas no pueden superar los 30 caracteres" };
    }

    if (motivoBaja && motivoBaja.length > 255) {
        return {
            error: "El motivo de baja no puede superar los 255 caracteres"
        };
    }

    if (codigoPadron && codigoPadron.length > 10) {
        return {
            error: "El código de padrón no puede superar los 10 caracteres"
        };
    }

    const edad = enteroOpcional(body.edad, 0, 120);

    if (edad.error) {
        return { error: "La edad debe ser un número entre 0 y 120" };
    }

    const fechaInicio = fechaOpcional(body.fecha_inicio);

    if (fechaInicio.error) {
        return { error: "La fecha de inicio no es válida" };
    }

    const fechaBaja = fechaOpcional(body.fecha_baja);

    if (fechaBaja.error) {
        return { error: "La fecha de baja no es válida" };
    }

    if (
        fechaInicio.valor &&
        fechaBaja.valor &&
        fechaBaja.valor < fechaInicio.valor
    ) {
        return {
            error: "La fecha de baja no puede ser anterior a la fecha de inicio"
        };
    }

    let clinicaId = null;

    if (body.clinica_id !== undefined &&
        body.clinica_id !== null &&
        body.clinica_id !== "") {
        clinicaId = Number(body.clinica_id);

        if (!Number.isInteger(clinicaId) || clinicaId <= 0) {
            return { error: "La clínica indicada no existe" };
        }

        const [clinicas] = await db.query(
            "SELECT id FROM clinicas WHERE id = ?",
            [clinicaId]
        );

        if (clinicas.length === 0) {
            return { error: "La clínica indicada no existe" };
        }
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
            edad: edad.valor,
            patologia,
            direccion,
            telefono,
            familiar,
            localidad,
            tipoServicio,
            modalidad,
            dias,
            horario,
            horas,
            fechaInicio: fechaInicio.valor,
            fechaBaja: fechaBaja.valor,
            motivoBaja,
            codigoPadron,
            clinicaId,
            latitud,
            longitud,
            activo: body.activo === undefined ||
                body.activo === null ||
                body.activo === ""
                ? null
                : esActivo(body.activo, 1) ? 1 : 0
        }
    };
}

exports.getPacientes = async (req, res) => {
    try {
        const condiciones = [];
        const params = [];

        if (req.query.incluir_inactivos !== "1" &&
            req.query.incluir_inactivos !== "true") {
            condiciones.push("p.activo = 1");
        }

        if (req.query.clinica_id) {
            condiciones.push("p.clinica_id = ?");
            params.push(req.query.clinica_id);
        }

        const where = condiciones.length > 0
            ? " WHERE " + condiciones.join(" AND ")
            : "";

        const [rows] = await db.query(
            `SELECT p.id,
                    p.nombre,
                    p.edad,
                    p.patologia,
                    p.direccion,
                    p.telefono_propio,
                    p.familiar_responsable,
                    p.localidad,
                    p.tipo_servicio,
                    p.modalidad,
                    p.dias_prestacion,
                    p.horario_prestacion,
                    p.horas_prestacion,
                    p.fecha_inicio,
                    p.fecha_baja,
                    p.motivo_baja,
                    p.activo,
                    p.clinica_id,
                    p.codigo_padron,
                    p.latitud,
                    p.longitud,
                    c.nombre AS clinica_nombre,
                    c.activa AS clinica_activa,
                    (p.latitud IS NOT NULL AND p.longitud IS NOT NULL)
                        AS tiene_ubicacion
             FROM pacientes p
             LEFT JOIN clinicas c ON c.id = p.clinica_id${where}
             ORDER BY p.nombre`,
            params
        );

        res.json(rows);
    } catch (error) {
        console.error("getPacientes:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};

exports.createPaciente = async (req, res) => {
    try {
        const validacion = await validarPaciente(req.body || {});

        if (validacion.error) {
            return res.status(400).json({ error: validacion.error });
        }

        const {
            nombre,
            edad,
            patologia,
            direccion,
            telefono,
            familiar,
            localidad,
            tipoServicio,
            modalidad,
            dias,
            horario,
            horas,
            fechaInicio,
            fechaBaja,
            motivoBaja,
            codigoPadron,
            clinicaId,
            latitud,
            longitud,
            activo
        } = validacion.datos;

        const [result] = await db.query(
            `INSERT INTO pacientes
                (nombre, edad, patologia, direccion, telefono_propio,
                 familiar_responsable, localidad, tipo_servicio, modalidad,
                 dias_prestacion, horario_prestacion, horas_prestacion,
                 fecha_inicio, fecha_baja, motivo_baja, codigo_padron,
                 clinica_id, latitud, longitud, activo)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                nombre,
                edad,
                patologia,
                direccion,
                telefono,
                familiar,
                localidad,
                tipoServicio,
                modalidad,
                dias,
                horario,
                horas,
                fechaInicio,
                fechaBaja,
                motivoBaja,
                codigoPadron,
                clinicaId,
                latitud,
                longitud,
                activo ?? 1
            ]
        );

        res.status(201).json({
            mensaje: "Paciente creado",
            id: result.insertId
        });
    } catch (error) {
        console.error("createPaciente:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};

exports.updatePaciente = async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: "Paciente inválido" });
    }

    try {
        const validacion = await validarPaciente(req.body || {});

        if (validacion.error) {
            return res.status(400).json({ error: validacion.error });
        }

        const {
            nombre,
            edad,
            patologia,
            direccion,
            telefono,
            familiar,
            localidad,
            tipoServicio,
            modalidad,
            dias,
            horario,
            horas,
            fechaInicio,
            fechaBaja,
            motivoBaja,
            codigoPadron,
            clinicaId,
            latitud,
            longitud,
            activo
        } = validacion.datos;

        const [result] = await db.query(
            `UPDATE pacientes
             SET nombre = ?,
                 edad = ?,
                 patologia = ?,
                 direccion = ?,
                 telefono_propio = ?,
                 familiar_responsable = ?,
                 localidad = ?,
                 tipo_servicio = ?,
                 modalidad = ?,
                 dias_prestacion = ?,
                 horario_prestacion = ?,
                 horas_prestacion = ?,
                 fecha_inicio = ?,
                 fecha_baja = ?,
                 motivo_baja = ?,
                 codigo_padron = ?,
                 clinica_id = ?,
                 latitud = ?,
                 longitud = ?,
                 activo = COALESCE(?, activo)
             WHERE id = ?`,
            [
                nombre,
                edad,
                patologia,
                direccion,
                telefono,
                familiar,
                localidad,
                tipoServicio,
                modalidad,
                dias,
                horario,
                horas,
                fechaInicio,
                fechaBaja,
                motivoBaja,
                codigoPadron,
                clinicaId,
                latitud,
                longitud,
                activo,
                id
            ]
        );

        if (result.affectedRows === 0) {
            const [existentes] = await db.query(
                "SELECT id FROM pacientes WHERE id = ?",
                [id]
            );

            if (existentes.length === 0) {
                return res.status(404).json({
                    error: "Paciente no encontrado"
                });
            }
        }

        res.json({ mensaje: "Paciente actualizado" });
    } catch (error) {
        console.error("updatePaciente:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
};
