const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const publicacionesController = require("../controllers/publicaciones.controller");

const soloGestion = auth.requireRole("admin", "coordinador");

router.get("/", auth, publicacionesController.getPublicaciones);
router.post("/", auth, soloGestion, publicacionesController.createPublicacion);
router.put("/:id", auth, soloGestion, publicacionesController.updatePublicacion);
router.patch(
    "/:id/estado",
    auth,
    soloGestion,
    publicacionesController.cambiarEstadoPublicacion
);

module.exports = router;
