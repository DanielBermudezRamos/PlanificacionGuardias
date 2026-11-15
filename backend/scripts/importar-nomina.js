/**
 * Importa la nomina mensual desde un Excel con una hoja por paciente.
 *
 * Uso:
 *   node scripts/importar-nomina.js "<ruta.xlsx>"
 *   node scripts/importar-nomina.js "<ruta.xlsx>" --apply
 *   node scripts/importar-nomina.js "<ruta.xlsx>" --fecha-inicio=2026-10-01
 *
 * Sin --apply solo simula y no guarda cambios.
 * El archivo no se copia al repositorio: se lee desde la ruta indicada.
 *
 * Reglas:
 * - La hoja de resumen "ruth presilla" se omite.
 * - Cada hoja de detalle se asocia a un paciente por nombre normalizado.
 * - Si la hoja no coincide con ningun paciente, se crea solo con el nombre.
 * - Los trabajadores se buscan por CUIT y, si no hay CUIT, por nombre.
 * - Las asignaciones guardan los precios por hora de la nomina.
 * - Los pacientes inactivos conservan sus asignaciones como inactivas.
 */

const path = require("path");
const XLSX = require("xlsx");
const mysql = require("mysql2/promise");

const {
    normalizarCuit,
    normalizarCbu,
    cuitValido
} = require("../utils/documentos");

require("dotenv").config({
    path: path.join(__dirname, "..", ".env")
});

const args = process.argv.slice(2);
const rutaExcel = args.find((arg) => !arg.startsWith("--"));
const aplicar = args.includes("--apply");
const argumentoFecha = args.find((arg) =>
    arg.startsWith("--fecha-inicio=")
);
const FECHA_INICIO = argumentoFecha
    ? argumentoFecha.split("=")[1]
    : "2026-10-01";
const CARGO_POR_DEFECTO = "Cuidador";

if (!rutaExcel) {
    console.error(
        'Uso: node scripts/importar-nomina.js "<ruta.xlsx>" [--apply] ' +
        "[--fecha-inicio=YYYY-MM-DD]"
    );
    process.exit(1);
}

if (!/^\d{4}-\d{2}-\d{2}$/.test(FECHA_INICIO)) {
    console.error("La fecha de inicio debe tener el formato YYYY-MM-DD");
    process.exit(1);
}

const fechaInicioDate = new Date(`${FECHA_INICIO}T00:00:00Z`);

if (Number.isNaN(fechaInicioDate.getTime()) ||
    fechaInicioDate.toISOString().slice(0, 10) !== FECHA_INICIO) {
    console.error("La fecha de inicio no es válida");
    process.exit(1);
}

const ALIAS_PACIENTES = {
    "DOLORES": "DOLORES CALEDONIA",
    "MARIA LORETO MEDINA": "MARIA MEDINA",
    "MARIA IRMA 1": "MARIA IRMA TARASIUK",
    "CECILIA GOLDMA": "CECILIA GOLDMAN",
    "DELFOR TRISTAN Y EMILCE CANO": "EMILCE CANO",
    "LUIS CESARINI": "JOSEFINA CESARINI",
    "JORGE Y STELA": "JORGE FRIA Y STELA",
    "MIRIAM MABEL MARINO": "MIRIAM MARINO",
    "LISANDRO SALAME": "LISANDRO SALENME",
    "SUSANA GROSSO": "SUSANA GROSO",
    "FRANKLIN RAWSON": "FRANKLIN RAUWSON",
    "ABEL ECHAVARRIA": "ABEL ECHAVERRIA",
    "CARMEN MARIA PEREZ": "MARIA PEREZ",
    "HAYDE ACCINELLI": "HAYDEE ACCINELLI"
};

function normalizar(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();
}

function texto(valor) {
    if (valor === undefined || valor === null) {
        return null;
    }

    const limpio = String(valor).replace(/\s+/g, " ").trim();

    return limpio === "" ? null : limpio;
}

function claveNombre(valor) {
    return normalizar(texto(valor));
}

function numero(valor) {
    if (valor === undefined || valor === null || valor === "") {
        return null;
    }

    const limpio = String(valor).replace(",", ".").trim();

    if (limpio === "") {
        return null;
    }

    const convertido = Number(limpio);

    return Number.isFinite(convertido) && convertido >= 0
        ? convertido
        : null;
}

function finDeMes(fecha) {
    const [anio, mes] = fecha.split("-").map(Number);
    const ultimoDia = new Date(Date.UTC(anio, mes, 0)).getUTCDate();

    return `${anio}-${String(mes).padStart(2, "0")}-${String(ultimoDia)
        .padStart(2, "0")}`;
}

function fechaISO(valor) {
    if (!valor) {
        return null;
    }

    if (typeof valor === "string") {
        const coincidencia = valor.match(/^\d{4}-\d{2}-\d{2}/);

        if (coincidencia) {
            return coincidencia[0];
        }
    }

    const fecha = valor instanceof Date ? valor : new Date(valor);

    if (Number.isNaN(fecha.getTime())) {
        return null;
    }

    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
}

function mismoNumero(actual, esperado) {
    if (actual === null || actual === undefined) {
        return esperado === null;
    }

    return Number(actual) === esperado;
}

function derivarDni(cuit) {
    if (!cuit || cuit.length !== 11) {
        return null;
    }

    return cuit.slice(2, 10);
}

function mapaColumnas(encabezado) {
    const mapa = {};

    (encabezado || []).forEach((celda, indice) => {
        const clave = normalizar(celda);

        if (clave) {
            mapa[clave] = indice;
        }
    });

    return mapa;
}

function valor(fila, mapa, columna) {
    const indice = mapa[normalizar(columna)];

    return indice === undefined ? null : fila[indice] ?? null;
}

function filasDeHoja(libro, nombre) {
    return XLSX.utils.sheet_to_json(libro.Sheets[nombre], {
        header: 1,
        defval: null,
        raw: true
    });
}

async function main() {
    const libro = XLSX.readFile(rutaExcel, { cellDates: true });

    const conexion = await mysql.createConnection({
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "sistema_permed"
    });

    const resumen = {
        hojasDetalle: 0,
        hojasOmitidas: [],
        hojasConPacienteExistente: 0,
        pacientesInsertados: 0,
        pacientesCreados: [],
        aliasUsados: [],
        trabajadoresInsertados: 0,
        trabajadoresActualizados: 0,
        trabajadoresSinCambios: 0,
        trabajadoresDistintos: 0,
        trabajadoresSinCuit: 0,
        trabajadoresSinCbu: 0,
        asignacionesActivasInsertadas: 0,
        asignacionesActivasActualizadas: 0,
        asignacionesInactivasInsertadas: 0,
        asignacionesInactivasActualizadas: 0,
        asignacionesSinCambios: 0,
        advertencias: []
    };

    try {
        await conexion.beginTransaction();

        const [cargos] = await conexion.query(
            "SELECT id FROM cargos WHERE nombre = ? LIMIT 1",
            [CARGO_POR_DEFECTO]
        );

        if (cargos.length === 0) {
            throw new Error(
                `No existe el cargo "${CARGO_POR_DEFECTO}" en la base`
            );
        }

        const cargoId = cargos[0].id;

        const [pacientesBase] = await conexion.query(
            "SELECT id, nombre, activo FROM pacientes"
        );
        const pacientesPorNombre = new Map(
            pacientesBase.map((paciente) => [
                claveNombre(paciente.nombre),
                paciente
            ])
        );

        const [trabajadoresBase] = await conexion.query(
            `SELECT id, nombre, dni, cuit, cbu, cargo_id, activo
             FROM trabajadores`
        );
        const trabajadoresPorCuit = new Map();
        const trabajadoresPorNombre = new Map();
        const trabajadoresPorDni = new Map();

        for (const trabajador of trabajadoresBase) {
            if (trabajador.cuit) {
                trabajadoresPorCuit.set(trabajador.cuit, trabajador);
            }

            trabajadoresPorNombre.set(
                claveNombre(trabajador.nombre),
                trabajador
            );

            if (trabajador.dni) {
                trabajadoresPorDni.set(trabajador.dni, trabajador);
            }
        }

        const trabajadoresProcesados = new Map();
        const cuitInvalidos = new Set();
        const cbuPorTrabajador = new Map();

        const resolverPaciente = async (nombreHoja) => {
            const claveHoja = normalizar(nombreHoja);
            const nombreAlias = ALIAS_PACIENTES[claveHoja];
            const nombreBuscado = nombreAlias
                ? texto(nombreAlias)
                : texto(nombreHoja);
            const clave = claveNombre(nombreBuscado);
            let paciente = pacientesPorNombre.get(clave);

            if (paciente) {
                resumen.hojasConPacienteExistente += 1;

                if (nombreAlias) {
                    resumen.aliasUsados.push(
                        `${nombreHoja} -> ${paciente.nombre}`
                    );
                }

                return paciente;
            }

            const [resultado] = await conexion.query(
                "INSERT INTO pacientes (nombre, activo) VALUES (?, 1)",
                [nombreBuscado]
            );

            paciente = {
                id: resultado.insertId,
                nombre: nombreBuscado,
                activo: 1
            };

            pacientesPorNombre.set(clave, paciente);
            resumen.pacientesInsertados += 1;
            resumen.pacientesCreados.push(
                `${nombreBuscado} (hoja ${nombreHoja})`
            );

            return paciente;
        };

        const resolverTrabajador = async ({ nombre, cuit, cbu }) => {
            let trabajador = null;

            if (cuit) {
                trabajador = trabajadoresPorCuit.get(cuit);
            }

            if (!trabajador) {
                trabajador = trabajadoresPorNombre.get(claveNombre(nombre));
            }

            if (trabajador) {
                const cambios = [];

                if (!trabajador.cuit && cuit) {
                    cambios.push(["cuit", cuit]);
                }

                if (!trabajador.cbu && cbu) {
                    cambios.push(["cbu", cbu]);
                }

                if (!trabajador.dni) {
                    const dni = derivarDni(cuit || trabajador.cuit);

                    if (dni && !trabajadoresPorDni.has(dni)) {
                        cambios.push(["dni", dni]);
                    }
                }

                if (trabajador.cuit && cuit && trabajador.cuit !== cuit) {
                    resumen.advertencias.push(
                        `${nombre}: el trabajador existente tiene CUIT ` +
                        `${trabajador.cuit} y la nómina trae ${cuit}; se ` +
                        "conserva el existente"
                    );
                }

                if (trabajador.cbu && cbu && trabajador.cbu !== cbu) {
                    resumen.advertencias.push(
                        `${nombre}: el trabajador existente tiene CBU ` +
                        `${trabajador.cbu} y la nómina trae ${cbu}; se ` +
                        "conserva el existente"
                    );
                }

                if (cambios.length === 0) {
                    resumen.trabajadoresSinCambios += 1;
                } else {
                    const asignaciones = cambios.map(([campo]) =>
                        `${campo} = ?`
                    );
                    const valores = cambios.map(([, dato]) => dato);

                    await conexion.query(
                        `UPDATE trabajadores
                         SET ${asignaciones.join(", ")}
                         WHERE id = ?`,
                        [...valores, trabajador.id]
                    );

                    for (const [campo, dato] of cambios) {
                        trabajador[campo] = dato;
                    }

                    resumen.trabajadoresActualizados += 1;
                }

                return trabajador;
            }

            const dni = derivarDni(cuit);
            const dniFinal = dni && !trabajadoresPorDni.has(dni)
                ? dni
                : null;

            const [resultado] = await conexion.query(
                `INSERT INTO trabajadores
                    (nombre, dni, cuit, cbu, cargo_id, activo)
                 VALUES (?, ?, ?, ?, ?, 1)`,
                [nombre, dniFinal, cuit, cbu, cargoId]
            );

            trabajador = {
                id: resultado.insertId,
                nombre,
                dni: dniFinal,
                cuit,
                cbu,
                cargo_id: cargoId,
                activo: 1
            };

            if (cuit) {
                trabajadoresPorCuit.set(cuit, trabajador);
            }

            trabajadoresPorNombre.set(claveNombre(nombre), trabajador);

            if (dniFinal) {
                trabajadoresPorDni.set(dniFinal, trabajador);
            }

            resumen.trabajadoresInsertados += 1;

            return trabajador;
        };

        const guardarAsignacion = async (
            trabajador,
            paciente,
            precioNormal,
            precioFeriado
        ) => {
            const activo = paciente.activo ? 1 : 0;
            const fechaFin = activo ? null : finDeMes(FECHA_INICIO);

            const [existentes] = await conexion.query(
                `SELECT id, activo, fecha_inicio, fecha_fin,
                        precio_hora_normal, precio_hora_feriado
                 FROM asignaciones
                 WHERE trabajador_id = ?
                   AND paciente_id = ?
                 ORDER BY activo DESC, id DESC`,
                [trabajador.id, paciente.id]
            );

            const objetivo = existentes.find(
                (asignacion) => Number(asignacion.activo) === activo
            );

            if (objetivo) {
                const inicioActual = fechaISO(objetivo.fecha_inicio);
                const inicioFinal = inicioActual &&
                    inicioActual < FECHA_INICIO
                    ? inicioActual
                    : FECHA_INICIO;

                const sinCambios =
                    mismoNumero(
                        objetivo.precio_hora_normal,
                        precioNormal
                    ) &&
                    mismoNumero(
                        objetivo.precio_hora_feriado,
                        precioFeriado
                    ) &&
                    inicioActual === inicioFinal &&
                    fechaISO(objetivo.fecha_fin) === fechaFin;

                if (sinCambios) {
                    resumen.asignacionesSinCambios += 1;
                    return;
                }

                await conexion.query(
                    `UPDATE asignaciones
                     SET precio_hora_normal = ?,
                         precio_hora_feriado = ?,
                         fecha_inicio = LEAST(fecha_inicio, ?),
                         fecha_fin = ?
                     WHERE id = ?`,
                    [
                        precioNormal,
                        precioFeriado,
                        FECHA_INICIO,
                        fechaFin,
                        objetivo.id
                    ]
                );

                if (activo) {
                    resumen.asignacionesActivasActualizadas += 1;
                } else {
                    resumen.asignacionesInactivasActualizadas += 1;
                }

                return;
            }

            const opuesta = existentes[0];

            if (opuesta) {
                await conexion.query(
                    `UPDATE asignaciones
                     SET activo = ?,
                         precio_hora_normal = ?,
                         precio_hora_feriado = ?,
                         fecha_inicio = LEAST(fecha_inicio, ?),
                         fecha_fin = ?
                     WHERE id = ?`,
                    [
                        activo,
                        precioNormal,
                        precioFeriado,
                        FECHA_INICIO,
                        fechaFin,
                        opuesta.id
                    ]
                );

                if (activo) {
                    resumen.asignacionesActivasActualizadas += 1;
                } else {
                    resumen.asignacionesInactivasActualizadas += 1;
                }

                return;
            }

            await conexion.query(
                `INSERT INTO asignaciones
                    (trabajador_id, paciente_id, precio_hora_normal,
                     precio_hora_feriado, activo, fecha_inicio, fecha_fin)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    trabajador.id,
                    paciente.id,
                    precioNormal,
                    precioFeriado,
                    activo,
                    FECHA_INICIO,
                    fechaFin
                ]
            );

            if (activo) {
                resumen.asignacionesActivasInsertadas += 1;
            } else {
                resumen.asignacionesInactivasInsertadas += 1;
            }
        };

        for (const nombreHoja of libro.SheetNames) {
            if (normalizar(nombreHoja) === "RUTH PRESILLA") {
                resumen.hojasOmitidas.push(
                    `${nombreHoja} (hoja de resumen)`
                );
                continue;
            }

            const filas = filasDeHoja(libro, nombreHoja);

            if (filas.length === 0) {
                resumen.hojasOmitidas.push(`${nombreHoja} (vacía)`);
                continue;
            }

            const mapa = mapaColumnas(filas[0]);

            if (mapa[normalizar("NOMBRE Y APELLIDO")] === undefined) {
                resumen.hojasOmitidas.push(
                    `${nombreHoja} (sin encabezado de nómina)`
                );
                continue;
            }

            resumen.hojasDetalle += 1;

            const paciente = await resolverPaciente(nombreHoja);

            for (const fila of filas.slice(1)) {
                const nombreTrabajador = texto(
                    valor(fila, mapa, "NOMBRE Y APELLIDO")
                );

                if (!nombreTrabajador ||
                    /^TOTAL/i.test(nombreTrabajador)) {
                    continue;
                }

                let cuit = normalizarCuit(valor(fila, mapa, "CUIL"));
                const cuitOriginal = texto(valor(fila, mapa, "CUIL"));
                const cbu = normalizarCbu(valor(fila, mapa, "CBU/CVU"));
                const precioNormal = numero(
                    valor(fila, mapa, "VALOR HORA")
                );
                const precioFeriado = numero(
                    valor(fila, mapa, "VALOR HORA FERIADO")
                );

                if (cuit && cuit.length !== 11) {
                    resumen.advertencias.push(
                        `${nombreTrabajador} en ${nombreHoja}: CUIT/CUIL ` +
                        `"${cuitOriginal}" no tiene 11 dígitos, se omite`
                    );
                    cuit = null;
                }

                if (cuit && !cuitValido(cuit)) {
                    cuitInvalidos.add(`${nombreTrabajador} (${cuit})`);
                }

                if (cbu && /^\d+$/.test(cbu) && cbu.length !== 22) {
                    resumen.advertencias.push(
                        `${nombreTrabajador} en ${nombreHoja}: CBU/CVU ` +
                        `"${cbu}" tiene ${cbu.length} dígitos en lugar de 22`
                    );
                }

                if (precioNormal === null || precioFeriado === null) {
                    resumen.advertencias.push(
                        `${nombreTrabajador} en ${nombreHoja}: falta ` +
                        "VALOR HORA o VALOR HORA FERIADO"
                    );
                }

                const trabajador = await resolverTrabajador({
                    nombre: nombreTrabajador,
                    cuit,
                    cbu
                });

                trabajadoresProcesados.set(trabajador.id, trabajador);

                if (cbu) {
                    if (!cbuPorTrabajador.has(cbu)) {
                        cbuPorTrabajador.set(cbu, new Map());
                    }

                    cbuPorTrabajador.get(cbu).set(
                        trabajador.id,
                        trabajador.nombre
                    );
                }

                await guardarAsignacion(
                    trabajador,
                    paciente,
                    precioNormal,
                    precioFeriado
                );
            }
        }

        const trabajadoresUnicos = [...trabajadoresProcesados.values()];
        const sinCuit = trabajadoresUnicos
            .filter((trabajador) => !trabajador.cuit)
            .map((trabajador) => trabajador.nombre);
        const sinCbu = trabajadoresUnicos
            .filter((trabajador) => !trabajador.cbu)
            .map((trabajador) => trabajador.nombre);

        resumen.trabajadoresDistintos = trabajadoresUnicos.length;
        resumen.trabajadoresSinCuit = sinCuit.length;
        resumen.trabajadoresSinCbu = sinCbu.length;

        if (sinCuit.length > 0) {
            resumen.advertencias.push(
                `Sin CUIT/CUIL (${sinCuit.length}): ${sinCuit.join(", ")}`
            );
        }

        if (sinCbu.length > 0) {
            resumen.advertencias.push(
                `Sin CBU/CVU (${sinCbu.length}): ${sinCbu.join(", ")}`
            );
        }

        for (const [cbu, trabajadores] of cbuPorTrabajador) {
            if (trabajadores.size > 1) {
                resumen.advertencias.push(
                    `CBU/CVU ${cbu} compartido por: ` +
                    `${[...trabajadores.values()].join(", ")}`
                );
            }
        }

        for (const cuit of cuitInvalidos) {
            resumen.advertencias.push(
                `CUIT/CUIL con dígito verificador inválido: ${cuit}`
            );
        }

        if (aplicar) {
            await conexion.commit();
        } else {
            await conexion.rollback();
        }

        console.log("");
        console.log(`Archivo: ${rutaExcel}`);
        console.log(`Fecha de inicio de asignaciones: ${FECHA_INICIO}`);
        console.log(
            `Hojas de detalle: ${resumen.hojasDetalle}; omitidas: ` +
            `${resumen.hojasOmitidas.length}`
        );
        console.log(
            `Pacientes: ${resumen.hojasConPacienteExistente} hojas con ` +
            `paciente existente, ${resumen.pacientesInsertados} creados`
        );
        console.log(
            `Trabajadores: ${resumen.trabajadoresDistintos} distintos; ` +
            `${resumen.trabajadoresInsertados} nuevos, ` +
            `${resumen.trabajadoresActualizados} completados, ` +
            `${resumen.trabajadoresSinCambios} filas repetidas sin cambios`
        );
        console.log(
            `Asignaciones activas: ` +
            `${resumen.asignacionesActivasInsertadas} creadas, ` +
            `${resumen.asignacionesActivasActualizadas} actualizadas`
        );
        console.log(
            `Asignaciones inactivas: ` +
            `${resumen.asignacionesInactivasInsertadas} creadas, ` +
            `${resumen.asignacionesInactivasActualizadas} actualizadas`
        );
        console.log(
            `Asignaciones sin cambios: ${resumen.asignacionesSinCambios}`
        );

        if (resumen.pacientesCreados.length > 0) {
            console.log("");
            console.log("Pacientes creados:");
            resumen.pacientesCreados.forEach((paciente) => {
                console.log(`- ${paciente}`);
            });
        }

        if (resumen.aliasUsados.length > 0) {
            console.log("");
            console.log("Hojas asociadas por alias:");
            resumen.aliasUsados.forEach((alias) => {
                console.log(`- ${alias}`);
            });
        }

        if (resumen.hojasOmitidas.length > 0) {
            console.log("");
            console.log("Hojas omitidas:");
            resumen.hojasOmitidas.forEach((hoja) => {
                console.log(`- ${hoja}`);
            });
        }

        if (resumen.advertencias.length > 0) {
            console.log("");
            console.log(`Advertencias (${resumen.advertencias.length}):`);
            resumen.advertencias.forEach((aviso) => {
                console.log(`- ${aviso}`);
            });
        }

        console.log("");
        console.log(
            aplicar
                ? "Importación confirmada."
                : "SIMULACIÓN: no se guardaron cambios. Usá --apply para confirmar."
        );
    } catch (error) {
        await conexion.rollback();
        throw error;
    } finally {
        await conexion.end();
    }
}

main().catch((error) => {
    console.error("Error al importar la nómina:", error.message);
    process.exit(1);
});
