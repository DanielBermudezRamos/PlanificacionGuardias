const mysql = require("mysql2/promise");

const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "sistema_permed",
    waitForConnections: true,
    connectionLimit: 10
});

module.exports = pool;