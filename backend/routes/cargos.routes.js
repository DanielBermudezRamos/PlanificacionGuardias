const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const cargosController = require("../controllers/cargos.controller");

router.get("/", auth, cargosController.getCargos);

module.exports = router;
