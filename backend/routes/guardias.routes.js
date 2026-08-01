const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const guardiasController = require("../controllers/guardias.controller");

router.get("/", auth, guardiasController.getGuardias); // router.get("/", guardiasController.getGuardias);
router.get("/verificar-conflicto", guardiasController.verificarConflicto);
router.post("/", guardiasController.createGuardia);
router.put("/:id", guardiasController.updateGuardia);

module.exports = router;

