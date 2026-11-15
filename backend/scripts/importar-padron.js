/**
 * Importa el padron de prestaciones desde un Excel.
 *
 * Uso:
 *   node scripts/importar-padron.js "<ruta.xlsx>"
 *   node scripts/importar-padron.js "<ruta.xlsx>" --apply
 *
 * Sin --apply solo simula y no guarda cambios.
 * El archivo no se copia al repositorio: se lee desde la ruta indicada.
 */

const path = require("path");
const XLSX = require("xlsx");
const mysql = require("mysql2/promise");

require("dotenv").config({
    path: path.join(__dirname, "..", ".env")
});

const args = process.argv.slice(2);
const rutaExcel = args.find((arg) => !arg.startsWith("--"));
const aplicar = args.includes("--apply");

if (!rutaExcel) {
    console.error(
        'Uso: node scripts/importar-padron.js "<ruta.xlsx>" [--apply]'
    );
    process.exit(1);
}

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

function fechaLocal(fecha) {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
}

function parseFecha(valor) {
    if (valor === undefined || valor === null || valor === "") {
        return null;
    }

    if (valor instanceof Date) {
        return Number.isNaN(valor.getTime()) ? null : fechaLocal(valor);
    }

    if (typeof valor === "number") {
        if (valor < 20000 || valor > 80000) {
            return null;
        }

        const milisegundos = Math.round((valor - 25569) * 86400 * 1000);
        const fecha = new Date(milisegundos);

        return Number.isNaN(fecha.getTime())
            ? null
            : fecha.toISOString().slice(0, 10);
    }

    const limpio = String(valor).trim();

    const iso = limpio.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

    if (iso) {
        const [, anio, mes, dia] = iso;
        const mesNumero = Number(mes);
        const diaNumero = Number(dia);

        if (mesNumero < 1 || mesNumero > 12 ||
            diaNumero < 1 || diaNumero > 31) {
            return null;
        }

        return `${anio}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
    }

    const dmy = limpio.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);

    if (dmy) {
        const [, dia, mes, anioCorto] = dmy;
        const diaNumero = Number(dia);
        const mesNumero = Number(mes);

        if (mesNumero < 1 || mesNumero > 12 ||
            diaNumero < 1 || diaNumero > 31) {
            return null;
        }

        const anio = anioCorto.length === 2
            ? Number(anioCorto) < 50
                ? 2000 + Number(anioCorto)
                : 1900 + Number(anioCorto)
            : Number(anioCorto);

        return `${anio}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
    }

    return null;
}

function parseEdad(valor) {
    if (valor === undefined || valor === null || valor === "") {
        return null;
    }

    const coincidencia = String(valor).match(/\d+/);

    if (!coincidencia) {
        return null;
    }

    const edad = Number(coincidencia[0]);

    return Number.isInteger(edad) && edad >= 0 && edad <= 120
        ? edad
        : null;
}

function normalizarServicio(valor) {
    const limpio = texto(valor);

    if (!limpio) {
        return null;
    }

    return normalizar(limpio)
        .replace(/\bASISTENRTE\b/g, "ASISTENTE");
}

const TOKENS_DIAS = [
    "LUNES",
    "MARTES",
    "MIERCOLES",
    "JUEVES",
    "VIERNES",
    "SABADO",
    "DOMINGO",
    "FIN DE SEMANA",
    "DIA POR MEDIO",
    "DIAS"
];

function separarModalidadYDias(valor) {
    const limpio = texto(valor);

    if (!limpio) {
        return { modalidad: null, dias: null };
    }

    const clave = normalizar(limpio);

    if (TOKENS_DIAS.some((token) => clave.includes(token))) {
        return { modalidad: null, dias: limpio };
    }

    return { modalidad: limpio, dias: null };
}

function buscarHoja(libro, nombre) {
    return libro.SheetNames.find(
        (hoja) => normalizar(hoja) === normalizar(nombre)
    );
}

function filasDeHoja(libro, nombre) {
    const hoja = buscarHoja(libro, nombre);

    if (!hoja) {
        throw new Error(`No se encontró la hoja "${nombre}"`);
    }

    return XLSX.utils.sheet_to_json(libro.Sheets[hoja], {
        header: 1,
        defval: null,
        raw: true
    });
}

function indiceEncabezado(filas) {
    return filas.findIndex((fila) =>
        fila.some((celda) => normalizar(celda) === "NOMBRE DEL PACIENTE")
    );
}

function mapaColumnas(encabezado) {
    const mapa = {};

    encabezado.forEach((celda, indice) => {
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

function esBaja(fila) {
    return fila.some((celda) => normalizar(celda) === "BAJA");
}

function parseFechaBaja(valorFecha, motivoSeparado) {
    const fecha = parseFecha(valorFecha);
    const textoFecha = fecha ? null : texto(valorFecha);
    const motivo = texto(motivoSeparado) || textoFecha;

    return { fecha, motivo };
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
        clinicasInsertadas: 0,
        clinicasExistentes: 0,
        activosInsertados: 0,
        activosExistentes: 0,
        inactivosInsertados: 0,
        inactivosExistentes: 0,
        advertencias: []
    };

    try {
        await conexion.beginTransaction();

        // ---------- Clinicas ----------
        const filasClinicas = filasDeHoja(libro, "CLINICAS");
        const indiceClinicas = indiceEncabezado(filasClinicas);

        if (indiceClinicas === -1) {
            throw new Error("La hoja CLINICAS no tiene encabezado");
        }

        const mapaClinicas = mapaColumnas(filasClinicas[indiceClinicas]);
        const clinicas = [];
        let actual = null;

        for (let i = indiceClinicas + 1; i < filasClinicas.length; i += 1) {
            const fila = filasClinicas[i];

            if (!fila.some((celda) => texto(celda))) {
                continue;
            }

            const nombre = texto(valor(fila, mapaClinicas, "NOMBRE DEL PACIENTE"));

            if (nombre) {
                actual = {
                    nombre,
                    direccion: texto(valor(fila, mapaClinicas, "DIRECCION")),
                    localidad: texto(valor(fila, mapaClinicas, "LOCALIDAD")),
                    telefono: texto(valor(fila, mapaClinicas, "TELEFONO")),
                    contacto: texto(
                        valor(fila, mapaClinicas, "FAMILIAR RESPONSABLE")
                    ),
                    activa: 1,
                    servicios: []
                };

                clinicas.push(actual);
            }

            if (!actual) {
                continue;
            }

            if (esBaja(fila)) {
                actual.activa = 0;
            }

            const servicio = normalizarServicio(
                valor(fila, mapaClinicas, "TIPO DE SERVICIO")
            );
            const dias = texto(valor(fila, mapaClinicas, "DIAS"));
            const horarios = texto(valor(fila, mapaClinicas, "HORARIOS"));
            const horas = texto(valor(fila, mapaClinicas, "HORAS"));

            const detalle = [
                servicio,
                dias,
                horarios,
                horas ? `(${horas})` : null
            ].filter(Boolean).join(" ");

            if (detalle) {
                actual.servicios.push(detalle);
            }
        }

        const [clinicasBase] = await conexion.query(
            "SELECT nombre FROM clinicas"
        );
        const nombresClinicas = new Set(
            clinicasBase.map((clinica) => normalizar(clinica.nombre))
        );

        for (const clinica of clinicas) {
            const clave = normalizar(clinica.nombre);

            if (nombresClinicas.has(clave)) {
                resumen.clinicasExistentes += 1;
                continue;
            }

            await conexion.query(
                `INSERT INTO clinicas
                    (nombre, direccion, localidad, telefono, contacto,
                     servicios, activa)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    clinica.nombre,
                    clinica.direccion,
                    clinica.localidad,
                    clinica.telefono,
                    clinica.contacto,
                    clinica.servicios.length > 0
                        ? clinica.servicios.join("; ")
                        : null,
                    clinica.activa
                ]
            );

            nombresClinicas.add(clave);
            resumen.clinicasInsertadas += 1;
        }

        // ---------- Pacientes ----------
        const [pacientesBase] = await conexion.query(
            "SELECT nombre FROM pacientes"
        );
        const nombresPacientes = new Set(
            pacientesBase.map((paciente) => normalizar(paciente.nombre))
        );

        async function importarPacientes(nombreHoja, activo) {
            const filas = filasDeHoja(libro, nombreHoja);
            const indice = indiceEncabezado(filas);

            if (indice === -1) {
                throw new Error(
                    `La hoja ${nombreHoja} no tiene encabezado`
                );
            }

            const mapa = mapaColumnas(filas[indice]);
            const vistos = new Set();
            let insertados = 0;
            let existentes = 0;

            for (let i = indice + 1; i < filas.length; i += 1) {
                const fila = filas[i];
                const nombre = texto(
                    valor(fila, mapa, "NOMBRE DEL PACIENTE")
                );

                if (!nombre) {
                    continue;
                }

                const clave = normalizar(nombre);

                if (vistos.has(clave)) {
                    resumen.advertencias.push(
                        `${nombre}: repetido en la hoja ${nombreHoja}, se omite`
                    );
                    continue;
                }

                vistos.add(clave);

                if (nombresPacientes.has(clave)) {
                    existentes += 1;
                    resumen.advertencias.push(
                        `${nombre}: ya existe en la base, se omite`
                    );
                    continue;
                }

                const edad = parseEdad(valor(fila, mapa, "EDAD"));
                const patologia = texto(valor(fila, mapa, "PATOLOGIA"));
                const direccion = texto(valor(fila, mapa, "DIRECCION"));
                const familiar = texto(
                    valor(fila, mapa, "FAMILIAR RESPONSABLE")
                );
                const telefono = texto(valor(fila, mapa, "TELEFONO"));
                const localidad = texto(valor(fila, mapa, "LOCALIDAD"));
                const tipoServicio = normalizarServicio(
                    valor(fila, mapa, "TIPO DE SERVICIO")
                );
                const modalidadTexto = valor(fila, mapa, "MODALIDAD");
                const { modalidad, dias: diasModalidad } =
                    separarModalidadYDias(modalidadTexto);
                const dias = activo
                    ? diasModalidad
                    : texto(valor(fila, mapa, "DIAS"));
                const horario = texto(valor(fila, mapa, "HORARIOS"));
                const horas = texto(valor(fila, mapa, "HORAS"));
                const fechaInicio = parseFecha(
                    valor(fila, mapa, "FECHA DE INICIO")
                );
                const fechaBaja = parseFechaBaja(
                    valor(fila, mapa, "FECHA DE BAJA"),
                    valor(fila, mapa, "MOTIVO DE BAJA")
                );
                const codigo = texto(fila[0]);

                if (activo && !direccion && !telefono && !patologia) {
                    resumen.advertencias.push(
                        `${nombre}: solo tiene el nombre, faltan datos de contacto`
                    );
                }

                if (!activo && !fechaBaja.fecha && !fechaBaja.motivo) {
                    resumen.advertencias.push(
                        `${nombre}: sin fecha ni motivo de baja`
                    );
                }

                await conexion.query(
                    `INSERT INTO pacientes
                        (nombre, edad, patologia, direccion, telefono_propio,
                         familiar_responsable, localidad, tipo_servicio,
                         modalidad, dias_prestacion, horario_prestacion,
                         horas_prestacion, fecha_inicio, fecha_baja,
                         motivo_baja, codigo_padron, activo)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
                        fechaBaja.fecha,
                        fechaBaja.motivo,
                        codigo,
                        activo
                    ]
                );

                nombresPacientes.add(clave);
                insertados += 1;
            }

            return { insertados, existentes };
        }

        const activos = await importarPacientes("DOMICILIOS", 1);
        const inactivos = await importarPacientes(
            "DOMICILIOS DADOS DE BAJA",
            0
        );

        resumen.activosInsertados = activos.insertados;
        resumen.activosExistentes = activos.existentes;
        resumen.inactivosInsertados = inactivos.insertados;
        resumen.inactivosExistentes = inactivos.existentes;

        if (aplicar) {
            await conexion.commit();
        } else {
            await conexion.rollback();
        }

        console.log("");
        console.log(`Archivo: ${rutaExcel}`);
        console.log(
            `Clínicas: ${resumen.clinicasInsertadas} insertadas, ` +
            `${resumen.clinicasExistentes} ya existentes`
        );
        console.log(
            `Pacientes activos: ${resumen.activosInsertados} insertados, ` +
            `${resumen.activosExistentes} ya existentes`
        );
        console.log(
            `Pacientes inactivos: ${resumen.inactivosInsertados} insertados, ` +
            `${resumen.inactivosExistentes} ya existentes`
        );

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
    console.error("Error al importar:", error.message);
    process.exit(1);
});
