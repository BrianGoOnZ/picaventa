ALTER TABLE "compra" ALTER COLUMN "fecha_compra" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "compra" ALTER COLUMN "fecha_compra" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "compra" ADD COLUMN "id_usuario" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "merma" ADD COLUMN "fecha_merma" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "promocion" ADD COLUMN "valor_descuento" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "promocion" ADD COLUMN "activa" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "compra" ADD CONSTRAINT "compra_id_usuario_usuarios_id_usuario_fk" FOREIGN KEY ("id_usuario") REFERENCES "public"."usuarios"("id_usuario") ON DELETE no action ON UPDATE no action;