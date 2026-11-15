const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const guardiasController = require("../controllers/guardias.controller");

const soloGestion = auth.requireRole("admin", "coordinador");

router.get("/", auth, guardiasController.getGuardias);
router.get(
    "/verificar-conflicto",
    auth,
    soloGestion,
    guardiasController.verificarConflicto
);
router.post("/", auth, soloGestion, guardiasController.createGuardia);
router.put("/:id", auth, soloGestion, guardiasController.updateGuardia);

module.exports = router;
