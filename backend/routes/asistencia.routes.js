const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const asistenciaController = require("../controllers/asistencia.controller");

const puedeRegistrar = auth.requireRole("prestador", "admin");
const puedeConsultar = auth.requireRole("prestador", "admin");
const soloGestion = auth.requireRole("admin", "coordinador");

router.get(
    "/actual",
    auth,
    puedeConsultar,
    asistenciaController.getGuardiaActual
);

router.post(
    "/iniciar",
    auth,
    puedeRegistrar,
    asistenciaController.iniciarGuardia
);
router.post(
    "/finalizar",
    auth,
    puedeRegistrar,
    asistenciaController.finalizarGuardia
);

// Alias de compatibilidad.
router.post(
    "/entrada",
    auth,
    puedeRegistrar,
    asistenciaController.registrarEntrada
);
router.post(
    "/salida",
    auth,
    puedeRegistrar,
    asistenciaController.registrarSalida
);

// Corrección manual de asistencia (solo gestión).
router.put(
    "/:horarioId",
    auth,
    soloGestion,
    asistenciaController.editarAsistencia
);
router.get(
    "/:horarioId/auditoria",
    auth,
    soloGestion,
    asistenciaController.getAuditoriaAsistencia
);

module.exports = router;
