const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const nominaController = require("../controllers/nomina.controller");

router.post("/generar", nominaController.generarNomina);
router.get("/", auth, nominaController.getNomina);

module.exports = router;