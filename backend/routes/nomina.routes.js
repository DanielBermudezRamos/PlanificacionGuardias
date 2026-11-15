const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const nominaController = require("../controllers/nomina.controller");

const soloGestion = auth.requireRole("admin", "coordinador");

router.post("/generar", auth, soloGestion, nominaController.generarNomina);
router.get("/", auth, nominaController.getNomina);
router.get("/:id/detalle", auth, nominaController.getDetalleNomina);
router.patch("/:id/pagar", auth, soloGestion, nominaController.marcarPagada);

module.exports = router;
