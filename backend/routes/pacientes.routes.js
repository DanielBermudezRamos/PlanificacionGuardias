const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const pacientesController = require("../controllers/pacientes.controller");

router.get("/", auth, pacientesController.getPacientes);
router.post(
    "/",
    auth,
    auth.requireRole("admin", "coordinador"),
    pacientesController.createPaciente
);
router.put(
    "/:id",
    auth,
    auth.requireRole("admin", "coordinador"),
    pacientesController.updatePaciente
);

module.exports = router;
