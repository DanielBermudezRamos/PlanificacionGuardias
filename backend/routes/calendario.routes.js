const express = require("express");
const router = express.Router();

const calendarioController = require("../controllers/calendario.controller");

router.get("/", calendarioController.getCalendario);

module.exports = router;