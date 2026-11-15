-- 001_usuarios.sql
-- Crea la tabla de cuentas de acceso.
-- El esquema original de sistema_permed no tenia tabla de usuarios:
-- el login no podia funcionar contra la base.

CREATE TABLE IF NOT EXISTS usuarios (
    id INT(11) NOT NULL AUTO_INCREMENT,
    email VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    rol ENUM('admin', 'coordinador', 'prestador') NOT NULL,
    trabajador_id INT(11) DEFAULT NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_usuarios_email (email),
    KEY idx_usuarios_trabajador (trabajador_id),
    CONSTRAINT fk_usuarios_trabajador
        FOREIGN KEY (trabajador_id) REFERENCES trabajadores (id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_general_ci;
