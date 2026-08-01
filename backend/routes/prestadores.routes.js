const express = require("express");
const router = express.Router();

const prestadoresController = require("../controllers/prestadores.controller");

router.get("/", prestadoresController.getPrestadores);
router.post("/", prestadoresController.createPrestador);

module.exports = router;