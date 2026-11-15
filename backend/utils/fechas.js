const dayjs = require("dayjs");

function aFechaSql(valor) {
    if (valor === undefined || valor === null || valor === "") {
        return null;
    }

    const fecha = dayjs(valor);

    return fecha.isValid() ? fecha.format("YYYY-MM-DD HH:mm:ss") : null;
}

module.exports = { aFechaSql };
