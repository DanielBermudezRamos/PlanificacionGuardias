-- 008_trabajadores_cuit_cbu.sql
-- Agrega CUIT/CUIL y CBU/CVU a trabajadores.
-- El DNI pasa a ser opcional para los prestadores que solo tienen CUIT.

ALTER TABLE trabajadores
    MODIFY COLUMN dni VARCHAR(20) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS cuit VARCHAR(20) DEFAULT NULL AFTER dni,
    ADD COLUMN IF NOT EXISTS cbu VARCHAR(50) DEFAULT NULL AFTER cuit;

ALTER TABLE trabajadores
    ADD UNIQUE KEY uq_trabajadores_cuit (cuit);
