const db = require("../config/db");
const dayjs = require("dayjs");

exports.registrarEntrada = async (req, res) => {

    try {

        const { horario_programado_id, fecha_hora } = req.body;

        const horaEntrada = fecha_hora 
            ? dayjs(fecha_hora).format("YYYY-MM-DD HH:mm:ss")
            : dayjs().format("YYYY-MM-DD HH:mm:ss");

        await db.query(`INSERT INTO registros_asistencia
        (horario_programado_id, fecha_hora_entrada_real)
        VALUES (?,?)`, [horario_programado_id, horaEntrada]);

        res.json({
            mensaje: "Entrada registrada",
            hora: horaEntrada
        });

    } catch (error) {

        res.status(500).json({ error: error.message });

    }

};

exports.registrarSalida = async (req, res) => {

    try {

        const { horario_programado_id, fecha_hora } = req.body;

        const horaSalida = fecha_hora
            ? dayjs(fecha_hora).format("YYYY-MM-DD HH:mm:ss")
            : dayjs().format("YYYY-MM-DD HH:mm:ss");

        const [registro] = await db.query(`
        SELECT fecha_hora_entrada_real
        FROM registros_asistencia
        WHERE horario_programado_id = ?
        `,
        [horario_programado_id]);

        if (registro.length === 0) {

            return res.status(400).json({
                error: "No existe registro de entrada"
            });

        }

        const entrada = dayjs(registro[0].fecha_hora_entrada_real);

        const horas = dayjs(horaSalida).diff(entrada,"minute") / 60;

        await db.query(`UPDATE registros_asistencia SET
        fecha_hora_salida_real = ?,
        horas_reales = ?
        WHERE horario_programado_id = ?`, [horaSalida, horas, horario_programado_id]);

        res.json({
            mensaje: "Salida registrada",
            horas_trabajadas: horas
        });

    } catch (error) {

        res.status(500).json({ error: error.message });

    }

};