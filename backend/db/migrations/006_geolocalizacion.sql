-- 006_geolocalizacion.sql
-- Guarda la ubicacion GPS del paciente y deja evidencia del inicio de guardia.
-- La validacion del radio de 50 metros se hace en el servidor.

ALTER TABLE pacientes
    ADD COLUMN IF NOT EXISTS latitud DECIMAL(10,7) DEFAULT NULL AFTER telefono_propio,
    ADD COLUMN IF NOT EXISTS longitud DECIMAL(10,7) DEFAULT NULL AFTER latitud;

ALTER TABLE registros_asistencia
    ADD COLUMN IF NOT EXISTS latitud_entrada DECIMAL(10,7) DEFAULT NULL AFTER observaciones,
    ADD COLUMN IF NOT EXISTS longitud_entrada DECIMAL(10,7) DEFAULT NULL AFTER latitud_entrada,
    ADD COLUMN IF NOT EXISTS precision_entrada DECIMAL(8,2) DEFAULT NULL AFTER longitud_entrada,
    ADD COLUMN IF NOT EXISTS distancia_entrada DECIMAL(8,2) DEFAULT NULL AFTER precision_entrada;
