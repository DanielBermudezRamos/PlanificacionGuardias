const RADIO_VERIFICACION_METROS = 50;
const RADIO_TIERRA_METROS = 6371000;

function aNumero(valor) {
    if (valor === undefined || valor === null || valor === "") {
        return null;
    }

    const numero = Number(valor);

    return Number.isFinite(numero) ? numero : null;
}

function coordenadaValida(latitud, longitud) {
    return (
        Number.isFinite(latitud) &&
        Number.isFinite(longitud) &&
        latitud >= -90 &&
        latitud <= 90 &&
        longitud >= -180 &&
        longitud <= 180
    );
}

/**
 * Distancia en metros entre dos coordenadas (formula de Haversine).
 */
function distanciaMetros(latitudA, longitudA, latitudB, longitudB) {
    if (!coordenadaValida(latitudA, longitudA) ||
        !coordenadaValida(latitudB, longitudB)) {
        return null;
    }

    const aRadianes = (grados) => (grados * Math.PI) / 180;

    const deltaLatitud = aRadianes(latitudB - latitudA);
    const deltaLongitud = aRadianes(longitudB - longitudA);

    const haversine =
        Math.sin(deltaLatitud / 2) ** 2 +
        Math.cos(aRadianes(latitudA)) *
        Math.cos(aRadianes(latitudB)) *
        Math.sin(deltaLongitud / 2) ** 2;

    const angulo = 2 * Math.atan2(
        Math.sqrt(haversine),
        Math.sqrt(1 - haversine)
    );

    return RADIO_TIERRA_METROS * angulo;
}

module.exports = {
    RADIO_VERIFICACION_METROS,
    aNumero,
    coordenadaValida,
    distanciaMetros
};
