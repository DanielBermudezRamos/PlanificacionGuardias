const express = require("express");
const router = express.Router();
const reemplazosController = require("../controllers/reemplazos.controller");

router.get("/sugerir/:horario_id", reemplazosController.sugerirReemplazos);

module.exports = router;