const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const clinicasController = require("../controllers/clinicas.controller");

router.get("/", auth, clinicasController.getClinicas);
router.post(
    "/",
    auth,
    auth.requireRole("admin", "coordinador"),
    clinicasController.createClinica
);
router.put(
    "/:id",
    auth,
    auth.requireRole("admin", "coordinador"),
    clinicasController.updateClinica
);

module.exports = router;
