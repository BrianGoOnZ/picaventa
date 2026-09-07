ALTER TABLE "abono" ALTER COLUMN "fecha_abono" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "abono" ALTER COLUMN "fecha_abono" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "configuracion_negocio" ALTER COLUMN "fecha_actualizacion" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "configuracion_negocio" ALTER COLUMN "fecha_actualizacion" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "corte_caja" ALTER COLUMN "fecha_corte" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "corte_caja" ALTER COLUMN "fecha_corte" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "devolucion" ALTER COLUMN "fecha_devolucion" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "devolucion" ALTER COLUMN "fecha_devolucion" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "historico_precio" ALTER COLUMN "fecha_cambio" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "historico_precio" ALTER COLUMN "fecha_cambio" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "movimiento_caja" ALTER COLUMN "fecha_movimiento" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "movimiento_caja" ALTER COLUMN "fecha_movimiento" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "venta" ALTER COLUMN "fecha_venta" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "venta" ALTER COLUMN "fecha_venta" SET DEFAULT now();