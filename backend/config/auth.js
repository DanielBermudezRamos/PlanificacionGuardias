require("dotenv").config();

module.exports = {
    jwtSecret: process.env.JWT_SECRET || "dev-permed-secret",
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h"
};
