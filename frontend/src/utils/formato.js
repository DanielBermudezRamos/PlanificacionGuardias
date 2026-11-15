export function soloDigitos(valor) {
    if (valor === undefined || valor === null) {
        return "";
    }

    return String(valor).replace(/\D/g, "");
}

export function formatearDni(valor) {
    const digitos = soloDigitos(valor);

    if (digitos.length === 8) {
        return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5)}`;
    }

    if (digitos.length === 7) {
        return `${digitos.slice(0, 1)}.${digitos.slice(1, 4)}.${digitos.slice(4)}`;
    }

    return valor || "";
}

export function formatearCuit(valor) {
    const digitos = soloDigitos(valor);

    if (digitos.length === 11) {
        return `${digitos.slice(0, 2)}-${digitos.slice(2, 10)}-${digitos.slice(10)}`;
    }

    if (digitos.length === 10) {
        return `${digitos.slice(0, 2)}-${digitos.slice(2)}`;
    }

    return valor || "";
}

export function formatearTelefono(valor) {
    const digitos = soloDigitos(valor);

    if (digitos.length === 13 && digitos.startsWith("549")) {
        return `+54 9 ${digitos.slice(3, 5)} ${digitos.slice(5, 9)}-${digitos.slice(9)}`;
    }

    if (digitos.length === 12 && digitos.startsWith("54")) {
        return `+54 ${digitos.slice(2, 4)} ${digitos.slice(4, 8)}-${digitos.slice(8)}`;
    }

    if (digitos.length === 11 && digitos.startsWith("0")) {
        return `${digitos.slice(0, 3)} ${digitos.slice(3, 7)}-${digitos.slice(7)}`;
    }

    if (digitos.length === 10) {
        return `${digitos.slice(0, 2)} ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
    }

    if (digitos.length === 8) {
        return `${digitos.slice(0, 4)}-${digitos.slice(4)}`;
    }

    return valor || "";
}

export function formatearCbu(valor) {
    const texto = String(valor ?? "").trim();

    if (!texto) {
        return "";
    }

    if (/^\d{22}$/.test(texto)) {
        return texto.replace(/(\d{4})(?=\d)/g, "$1 ");
    }

    return texto;
}

export function normalizarCbu(valor) {
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
