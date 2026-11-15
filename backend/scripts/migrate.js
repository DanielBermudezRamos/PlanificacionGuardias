require("dotenv").config();

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const MIGRATIONS_DIR = path.join(__dirname, "..", "db", "migrations");

const connectionOptions = {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "sistema_permed",
    // Los archivos de migracion son locales y de confianza.
    // multipleStatements permite ejecutar el archivo completo en una sola
    // conexion, de modo que las variables de sesion (@drop_sql, etc.) sigan vivas.
    multipleStatements: true
};

async function main() {
    const connection = await mysql.createConnection(connectionOptions);

    try {
        console.log(`Base de datos: ${connectionOptions.database}@${connectionOptions.host}`);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                nombre VARCHAR(255) NOT NULL,
                aplicada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (nombre)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);

        const files = fs
            .readdirSync(MIGRATIONS_DIR)
            .filter((file) => file.toLowerCase().endsWith(".sql"))
            .sort();

        if (files.length === 0) {
            console.log("No hay migraciones para aplicar.");
            return;
        }

        const [appliedRows] = await connection.query(
            "SELECT nombre FROM schema_migrations"
        );
        const applied = new Set(appliedRows.map((row) => row.nombre));

        let executed = 0;

        for (const file of files) {
            if (applied.has(file)) {
                console.log(`= ${file} (ya aplicada)`);
                continue;
            }

            const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");

            console.log(`> Aplicando ${file}...`);

            await connection.query(sql);
            await connection.query(
                "INSERT INTO schema_migrations (nombre) VALUES (?)",
                [file]
            );

            executed += 1;
            console.log(`  OK`);
        }

        console.log(
            executed === 0
                ? "Todo al dia: no se aplicaron migraciones nuevas."
                : `Migraciones aplicadas: ${executed}.`
        );
    } finally {
        await connection.end();
    }
}

main().catch((error) => {
    console.error("Error al migrar:", error.code || "", error.message);
    process.exitCode = 1;
});
