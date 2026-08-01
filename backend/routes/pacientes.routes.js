const express = require("express");
const router = express.Router();

const pacientesController = require("../controllers/pacientes.controller");

router.get("/", pacientesController.getPacientes);
router.post("/", pacientesController.createPaciente);

module.exports = router;