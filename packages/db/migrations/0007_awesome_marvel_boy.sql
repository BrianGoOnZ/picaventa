CREATE TABLE "entrada_inventario" (
	"id_entrada" serial PRIMARY KEY NOT NULL,
	"id_producto" integer NOT NULL,
	"id_usuario" integer NOT NULL,
	"cantidad" numeric(12, 3) NOT NULL,
	"stock_anterior" numeric(12, 3) NOT NULL,
	"stock_nuevo" numeric(12, 3) NOT NULL,
	"fecha_entrada" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "permisos" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "entrada_inventario" ADD CONSTRAINT "entrada_inventario_id_producto_producto_id_producto_fk" FOREIGN KEY ("id_producto") REFERENCES "public"."producto"("id_producto") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entrada_inventario" ADD CONSTRAINT "entrada_inventario_id_usuario_usuarios_id_usuario_fk" FOREIGN KEY ("id_usuario") REFERENCES "public"."usuarios"("id_usuario") ON DELETE no action ON UPDATE no action;