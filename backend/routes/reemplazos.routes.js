const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const reemplazosController = require("../controllers/reemplazos.controller");

router.get(
    "/sugerir/:horario_id",
    auth,
    auth.requireRole("admin", "coordinador"),
    reemplazosController.sugerirReemplazos
);

module.exports = router;
