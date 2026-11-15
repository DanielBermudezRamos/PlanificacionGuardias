const PESOS_CUIT = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

function soloDigitos(valor) {
    if (valor === undefined || valor === null) {
        return "";
    }

    return String(valor).replace(/\D/g, "");
}

function digitoVerificadorCuit(digitos) {
    const suma = digitos
        .slice(0, 10)
        .split("")
        .reduce((total, digito, indice) => (
            total + Number(digito) * PESOS_CUIT[indice]
        ), 0);

    let verificador = 11 - (suma % 11);

    if (verificador === 11) {
        verificador = 0;
    }

    if (verificador === 10) {
        verificador = 9;
    }

    return String(verificador);
}

/**
 * Normaliza un CUIT/CUIL a 11 digitos. Si llega con 10, completa el
 * digito verificador. No valida el verificador de los que ya traen 11.
 */
function normalizarCuit(valor) {
    const digitos = soloDigitos(valor);

    if (!digitos) {
        return null;
    }

    if (digitos.length === 10) {
        return digitos + digitoVerificadorCuit(digitos);
    }

    return digitos;
}

function cuitValido(valor) {
    const digitos = soloDigitos(valor);

    if (digitos.length !== 11) {
        return false;
    }

    return digitoVerificadorCuit(digitos) === digitos[10];
}

/**
 * Guarda telefonos solo con digitos. El formato se aplica en la interfaz.
 */
function normalizarTelefono(valor) {
    const digitos = soloDigitos(valor);

    return digitos || null;
}

/**
 * Guarda CBU/CVU numericos solo con digitos. Los alias se conservan tal
 * como vienen, sin espacios ni el asterisco inicial.
 */
function normalizarCbu(valor) {
    if (valor === undefined || valor === null) {
        return null;
    }

    const limpio = String(valor)
        .replace(/^\*/, "")
        .replace(/\s+/g, "")
        .trim();

    if (!limpio) {
        return null;
    }

    if (/^[\d.-]+$/.test(limpio)) {
        return limpio.replace(/\D/g, "") || null;
    }

    return limpio;
}

module.exports = {
    soloDigitos,
    normalizarCuit,
    cuitValido,
    normalizarTelefono,
    normalizarCbu
};
