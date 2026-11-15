-- 004_auditoria_asistencia.sql
-- Registra cada correccion manual de entrada/salida real de una guardia.
-- Guarda una foto de los valores anteriores y nuevos para poder auditar
-- quien corrigio, cuando y por que.

CREATE TABLE IF NOT EXISTS auditoria_asistencia (
    id INT(11) NOT NULL AUTO_INCREMENT,
    registro_id INT(11) DEFAULT NULL,
    horario_programado_id INT(11) NOT NULL,
    usuario_id INT(11) DEFAULT NULL,
    usuario_email VARCHAR(150) NOT NULL,
    motivo VARCHAR(255) NOT NULL,
    entrada_anterior DATETIME DEFAULT NULL,
    salida_anterior DATETIME DEFAULT NULL,
    entrada_nueva DATETIME DEFAULT NULL,
    salida_nueva DATETIME DEFAULT NULL,
    diferencia_anterior DECIMAL(7,2) DEFAULT NULL,
    diferencia_nueva DECIMAL(7,2) DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_auditoria_horario (horario_programado_id),
    KEY idx_auditoria_usuario (usuario_id),
    CONSTRAINT fk_auditoria_registro
        FOREIGN KEY (registro_id) REFERENCES registros_asistencia (id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    CONSTRAINT fk_auditoria_horario
        FOREIGN KEY (horario_programado_id) REFERENCES horarios_programados (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_auditoria_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_general_ci;
