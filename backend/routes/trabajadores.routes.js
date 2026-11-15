const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const trabajadoresController = require("../controllers/trabajadores.controller");

router.get("/", auth, trabajadoresController.getTrabajadores);
router.post(
    "/",
    auth,
    auth.requireRole("admin", "coordinador"),
    trabajadoresController.createTrabajador
);
router.put(
    "/:id",
    auth,
    auth.requireRole("admin", "coordinador"),
    trabajadoresController.updateTrabajador
);

module.exports = router;
