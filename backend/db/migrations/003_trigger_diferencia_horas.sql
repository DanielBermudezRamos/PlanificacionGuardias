-- 003_trigger_diferencia_horas.sql
-- Corrige el trigger BEFORE UPDATE de registros_asistencia.
--
-- El trigger original comparaba con != contra columnas que pueden ser NULL.
-- Al cerrar una guardia abierta, OLD.fecha_hora_salida_real es NULL y
-- NULL != valor devuelve NULL, por lo que el IF no se cumplia y
-- diferencia_horas quedaba NULL.
--
-- Se usa <=> (igualdad segura para NULL) para que el recalculo se dispare
-- tanto al iniciar como al finalizar una guardia.

DROP TRIGGER IF EXISTS calcular_diferencia_horas_update;

CREATE TRIGGER calcular_diferencia_horas_update
BEFORE UPDATE ON registros_asistencia
FOR EACH ROW
BEGIN
    DECLARE horas_est DECIMAL(5,2);

    IF NOT (NEW.fecha_hora_entrada_real <=> OLD.fecha_hora_entrada_real)
       OR NOT (NEW.fecha_hora_salida_real <=> OLD.fecha_hora_salida_real) THEN

        SELECT horas_estimadas INTO horas_est
        FROM horarios_programados
        WHERE id = NEW.horario_programado_id;

        IF NEW.fecha_hora_entrada_real IS NOT NULL
           AND NEW.fecha_hora_salida_real IS NOT NULL THEN
            SET NEW.diferencia_horas = (
                (TIMESTAMPDIFF(
                    MINUTE,
                    NEW.fecha_hora_entrada_real,
                    NEW.fecha_hora_salida_real
                ) / 60) - horas_est
            );
        ELSE
            SET NEW.diferencia_horas = NULL;
        END IF;
    END IF;
END;
