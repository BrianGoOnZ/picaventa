ALTER TYPE "public"."tipo_resolucion" ADD VALUE 'reposicion';--> statement-breakpoint
ALTER TABLE "devolucion" ADD COLUMN "monto_reembolsado" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "devolucion" ADD COLUMN "id_venta_cambio" integer;--> statement-breakpoint
ALTER TABLE "devolucion" ADD CONSTRAINT "devolucion_id_venta_cambio_venta_id_venta_fk" FOREIGN KEY ("id_venta_cambio") REFERENCES "public"."venta"("id_venta") ON DELETE no action ON UPDATE no action;