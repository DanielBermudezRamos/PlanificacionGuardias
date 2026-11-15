const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const authController = require("../controllers/auth.controller");

router.post("/login", authController.login);
router.get("/me", auth, authController.me);

module.exports = router;
