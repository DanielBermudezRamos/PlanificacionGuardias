const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const calendarioController = require("../controllers/calendario.controller");

router.get("/", auth, calendarioController.getCalendario);

module.exports = router;
