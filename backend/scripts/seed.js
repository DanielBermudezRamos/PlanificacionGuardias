const bcrypt = require("bcryptjs");
const db = require("../config/db");

const SEED = {
    trabajador: {
        nombre: "Prestador Demo",
        dni: "30000001",
        telefono: "3884000001",
        cargo: "Enfermero"
    },
    paciente: {
        nombre: "Paciente Demo",
        direccion: "Calle Falsa 123",
        telefono_propio: "3884000002"
    },
    usuarios: [
        {
            email: "coordinador@permed.local",
            password: "Coord123!",
            nombre: "Coordinador Demo",
            rol: "coordinador"
        },
        {
            email: "prestador@permed.local",
            password: "Prest123!",
            nombre: "Prestador Demo",
            rol: "prestador"
        }
    ]
};

async function ensureCargo(nombre, descripcion) {
    const [rows] = await db.query(
        "SELECT id FROM cargos WHERE nombre = ?",
        [nombre]
    );

    if (rows.length > 0) {
        return rows[0].id;
    }

    const [result] = await db.query(
        "INSERT INTO cargos (nombre, descripcion) VALUES (?, ?)",
        [nombre, descripcion]
    );

    return result.insertId;
}

async function ensureTrabajador(cargoId) {
    const [rows] = await db.query(
        "SELECT id FROM trabajadores WHERE dni = ?",
        [SEED.trabajador.dni]
    );

    if (rows.length > 0) {
        const id = rows[0].id;

        await db.query(
            `UPDATE trabajadores
             SET nombre = ?, telefono = ?, cargo_id = ?, activo = 1
             WHERE id = ?`,
            [SEED.trabajador.nombre, SEED.trabajador.telefono, cargoId, id]
        );

        return id;
    }

    const [result] = await db.query(
        `INSERT INTO trabajadores (nombre, dni, telefono, cargo_id, activo)
         VALUES (?, ?, ?, ?, 1)`,
        [
            SEED.trabajador.nombre,
            SEED.trabajador.dni,
            SEED.trabajador.telefono,
            cargoId
        ]
    );

    return result.insertId;
}

async function ensurePaciente() {
    const [rows] = await db.query(
        "SELECT id FROM pacientes WHERE nombre = ? ORDER BY id LIMIT 1",
        [SEED.paciente.nombre]
    );

    if (rows.length > 0) {
        const id = rows[0].id;

        await db.query(
            "UPDATE pacientes SET direccion = ?, telefono_propio = ? WHERE id = ?",
            [SEED.paciente.direccion, SEED.paciente.telefono_propio, id]
        );

        return id;
    }

    const [result] = await db.query(
        `INSERT INTO pacientes (nombre, direccion, telefono_propio)
         VALUES (?, ?, ?)`,
        [
            SEED.paciente.nombre,
            SEED.paciente.direccion,
            SEED.paciente.telefono_propio
        ]
    );

    return result.insertId;
}

async function ensureAsignacion(trabajadorId, pacienteId) {
    // unique_asignacion_activa (trabajador_id, paciente_id, activo)
    // LAST_INSERT_ID(id) devuelve el id existente cuando cae en el duplicado.
    const [result] = await db.query(
        `INSERT INTO asignaciones
            (trabajador_id, paciente_id, precio_hora_normal, precio_hora_feriado, activo, fecha_inicio)
         VALUES (?, ?, NULL, NULL, 1, CURDATE())
         ON DUPLICATE KEY UPDATE
            id = LAST_INSERT_ID(id),
            precio_hora_normal = NULL,
            precio_hora_feriado = NULL,
            fecha_fin = NULL`,
        [trabajadorId, pacienteId]
    );

    return result.insertId;
}

async function ensureGuardiaDemo(asignacionId) {
    const [rows] = await db.query(
        `SELECT id
         FROM horarios_programados
         WHERE asignacion_id = ?
           AND DATE(fecha_hora_entrada) = CURDATE()
         ORDER BY id DESC
         LIMIT 1`,
        [asignacionId]
    );

    if (rows.length > 0) {
        const id = rows[0].id;

        // Deja la guardia demo en una ventana utilizable ahora mismo
        // y reinicia su asistencia para poder probar el boton desde cero.
        await db.query(
            `UPDATE horarios_programados
             SET fecha_hora_entrada = DATE_SUB(NOW(), INTERVAL 1 HOUR),
                 fecha_hora_salida = DATE_ADD(NOW(), INTERVAL 7 HOUR)
             WHERE id = ?`,
            [id]
        );

        await db.query(
            "DELETE FROM registros_asistencia WHERE horario_programado_id = ?",
            [id]
        );

        return id;
    }

    const [result] = await db.query(
        `INSERT INTO horarios_programados
            (asignacion_id, fecha_hora_entrada, fecha_hora_salida)
         VALUES (?, DATE_SUB(NOW(), INTERVAL 1 HOUR), DATE_ADD(NOW(), INTERVAL 7 HOUR))`,
        [asignacionId]
    );

    return result.insertId;
}

async function ensureUsuario(usuario, trabajadorId) {
    const passwordHash = await bcrypt.hash(usuario.password, 10);

    await db.query(
        `INSERT INTO usuarios
            (email, password_hash, nombre, rol, trabajador_id, activo)
         VALUES (?, ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE
            password_hash = VALUES(password_hash),
            nombre = VALUES(nombre),
            rol = VALUES(rol),
            trabajador_id = VALUES(trabajador_id),
            activo = 1`,
        [
            usuario.email,
            passwordHash,
            usuario.nombre,
            usuario.rol,
            usuario.rol === "prestador" ? trabajadorId : null
        ]
    );
}

async function main() {
    const [tablas] = await db.query("SHOW TABLES LIKE 'usuarios'");

    if (tablas.length === 0) {
        throw new Error(
            "Falta la tabla usuarios. Ejecuta primero: npm run migrate"
        );
    }

    const cargoId = await ensureCargo(
        SEED.trabajador.cargo,
        "Personal de enfermeria con conocimientos medicos"
    );
    const trabajadorId = await ensureTrabajador(cargoId);
    const pacienteId = await ensurePaciente();
    const asignacionId = await ensureAsignacion(trabajadorId, pacienteId);
    const horarioId = await ensureGuardiaDemo(asignacionId);

    for (const usuario of SEED.usuarios) {
        await ensureUsuario(usuario, trabajadorId);
    }

    const [horario] = await db.query(
        `SELECT id, fecha_hora_entrada, fecha_hora_salida
         FROM horarios_programados
         WHERE id = ?`,
        [horarioId]
    );

    console.log("Seed de desarrollo aplicado.");
    console.log("");
    console.log("Usuarios:");
    for (const usuario of SEED.usuarios) {
        console.log(`  ${usuario.rol.padEnd(11)} ${usuario.email} / ${usuario.password}`);
    }
    console.log("");
    console.log(`Trabajador demo: id=${trabajadorId} (${SEED.trabajador.nombre})`);
    console.log(`Paciente demo:   id=${pacienteId} (${SEED.paciente.nombre})`);
    console.log(`Asignacion demo: id=${asignacionId}`);
    console.log(
        `Guardia demo:    id=${horarioId} (${horario[0].fecha_hora_entrada} -> ${horario[0].fecha_hora_salida})`
    );
    console.log("");
    console.log("IMPORTANTE: credenciales solo para desarrollo local.");
}

main()
    .catch((error) => {
        console.error("Error en el seed:", error.code || "", error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await db.end();
    });
