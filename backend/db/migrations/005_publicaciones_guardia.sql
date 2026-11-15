CREATE TABLE IF NOT EXISTS publicaciones_guardia (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id INT NOT NULL,
    direccion VARCHAR(200) NULL,
    patologia TEXT NULL,
    fecha_hora_entrada DATETIME NOT NULL,
    fecha_hora_salida DATETIME NOT NULL,
    precio DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    para_todos TINYINT(1) NOT NULL DEFAULT 0,
    activa TINYINT(1) NOT NULL DEFAULT 1,
    creado_por INT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_publicacion_paciente
        FOREIGN KEY (paciente_id) REFERENCES pacientes(id),
    CONSTRAINT fk_publicacion_usuario
        FOREIGN KEY (creado_por) REFERENCES usuarios(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS publicaciones_destinatarios (
    publicacion_id INT NOT NULL,
    trabajador_id INT NOT NULL,
    PRIMARY KEY (publicacion_id, trabajador_id),
    CONSTRAINT fk_publicacion_destino
        FOREIGN KEY (publicacion_id) REFERENCES publicaciones_guardia(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_publicacion_trabajador
        FOREIGN KEY (trabajador_id) REFERENCES trabajadores(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
