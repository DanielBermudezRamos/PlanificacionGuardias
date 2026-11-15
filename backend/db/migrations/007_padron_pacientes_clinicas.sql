-- 007_padron_pacientes_clinicas.sql
-- Agrega la tabla de clinicas y los datos del padron de prestaciones.

CREATE TABLE IF NOT EXISTS clinicas (
    id INT(11) NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(150) NOT NULL,
    direccion VARCHAR(200) DEFAULT NULL,
    localidad VARCHAR(100) DEFAULT NULL,
    telefono VARCHAR(30) DEFAULT NULL,
    contacto VARCHAR(150) DEFAULT NULL,
    servicios TEXT DEFAULT NULL,
    activa TINYINT(1) NOT NULL DEFAULT 1,
    latitud DECIMAL(10,7) DEFAULT NULL,
    longitud DECIMAL(10,7) DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_clinicas_nombre (nombre)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_general_ci;

ALTER TABLE pacientes
    ADD COLUMN IF NOT EXISTS edad INT(11) DEFAULT NULL AFTER nombre,
    ADD COLUMN IF NOT EXISTS familiar_responsable VARCHAR(150) DEFAULT NULL AFTER telefono_propio,
    ADD COLUMN IF NOT EXISTS localidad VARCHAR(100) DEFAULT NULL AFTER familiar_responsable,
    ADD COLUMN IF NOT EXISTS tipo_servicio VARCHAR(50) DEFAULT NULL AFTER localidad,
    ADD COLUMN IF NOT EXISTS modalidad VARCHAR(100) DEFAULT NULL AFTER tipo_servicio,
    ADD COLUMN IF NOT EXISTS dias_prestacion VARCHAR(100) DEFAULT NULL AFTER modalidad,
    ADD COLUMN IF NOT EXISTS horario_prestacion VARCHAR(150) DEFAULT NULL AFTER dias_prestacion,
    ADD COLUMN IF NOT EXISTS horas_prestacion VARCHAR(30) DEFAULT NULL AFTER horario_prestacion,
    ADD COLUMN IF NOT EXISTS fecha_inicio DATE DEFAULT NULL AFTER horas_prestacion,
    ADD COLUMN IF NOT EXISTS fecha_baja DATE DEFAULT NULL AFTER fecha_inicio,
    ADD COLUMN IF NOT EXISTS motivo_baja VARCHAR(255) DEFAULT NULL AFTER fecha_baja,
    ADD COLUMN IF NOT EXISTS activo TINYINT(1) NOT NULL DEFAULT 1 AFTER motivo_baja,
    ADD COLUMN IF NOT EXISTS clinica_id INT(11) DEFAULT NULL AFTER activo,
    ADD COLUMN IF NOT EXISTS codigo_padron VARCHAR(10) DEFAULT NULL AFTER clinica_id;

ALTER TABLE pacientes
    ADD KEY idx_pacientes_activo (activo),
    ADD KEY idx_pacientes_clinica (clinica_id);

ALTER TABLE pacientes
    ADD CONSTRAINT fk_pacientes_clinica
        FOREIGN KEY (clinica_id) REFERENCES clinicas (id)
        ON DELETE SET NULL
        ON UPDATE CASCADE;
