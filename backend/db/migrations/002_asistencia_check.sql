-- 002_asistencia_check.sql
-- Permite registros de asistencia "abiertos" (entrada sin salida).
-- Sin esto, el boton "Iniciar guardia" no puede persistir el inicio:
-- el CHECK original exigia entrada y salida juntas.

-- 1) Quitar el CHECK original (CONSTRAINT_1) si todavia existe.
SET @drop_sql := (
    SELECT IF(
        COUNT(*) > 0,
        'ALTER TABLE registros_asistencia DROP CONSTRAINT CONSTRAINT_1',
        'SELECT 1'
    )
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'registros_asistencia'
      AND CONSTRAINT_NAME = 'CONSTRAINT_1'
      AND CONSTRAINT_TYPE = 'CHECK'
);

PREPARE stmt_drop FROM @drop_sql;
EXECUTE stmt_drop;
DEALLOCATE PREPARE stmt_drop;

-- 2) Agregar el CHECK corregido si no existe.
-- Estados validos:
--   - sin registro de entrada ni salida
--   - entrada cargada y salida pendiente (guardia en curso)
--   - entrada y salida cargadas, con salida posterior a la entrada
SET @add_sql := (
    SELECT IF(
        COUNT(*) = 0,
        'ALTER TABLE registros_asistencia ADD CONSTRAINT chk_registro_abierto CHECK ((fecha_hora_entrada_real IS NULL AND fecha_hora_salida_real IS NULL) OR (fecha_hora_entrada_real IS NOT NULL AND (fecha_hora_salida_real IS NULL OR fecha_hora_salida_real > fecha_hora_entrada_real)))',
        'SELECT 1'
    )
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'registros_asistencia'
      AND CONSTRAINT_NAME = 'chk_registro_abierto'
      AND CONSTRAINT_TYPE = 'CHECK'
);

PREPARE stmt_add FROM @add_sql;
EXECUTE stmt_add;
DEALLOCATE PREPARE stmt_add;
