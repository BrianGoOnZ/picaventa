ALTER TABLE "corte_caja" ADD COLUMN "total_vendido" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "corte_caja" ADD COLUMN "total_esperado" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "corte_caja" ADD COLUMN "diferencia" numeric(12, 2);--> statement-breakpoint
-- Corrige cortes existentes de antes de que estas columnas existieran: no se
-- puede recuperar el desglose real (no se guardaba), así que se aproxima
-- asumiendo que todo lo vendido fue efectivo y que no hubo diferencia.
UPDATE "corte_caja" SET
  "total_vendido" = "total_contado_sistema" - "fondo_inicial",
  "total_esperado" = "total_contado_sistema",
  "diferencia" = 0
WHERE "total_vendido" IS NULL;--> statement-breakpoint
ALTER TABLE "corte_caja" ALTER COLUMN "total_vendido" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "corte_caja" ALTER COLUMN "total_esperado" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "corte_caja" ALTER COLUMN "diferencia" SET NOT NULL;