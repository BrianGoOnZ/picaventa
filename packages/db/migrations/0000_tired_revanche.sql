CREATE TYPE "public"."estado_venta" AS ENUM('activa', 'pausada', 'cancelada');--> statement-breakpoint
CREATE TYPE "public"."rol_usuario" AS ENUM('administrador', 'cajero');--> statement-breakpoint
CREATE TYPE "public"."tipo_merma" AS ENUM('merma', 'ajuste');--> statement-breakpoint
CREATE TYPE "public"."tipo_movimiento" AS ENUM('retiro', 'gasto');--> statement-breakpoint
CREATE TYPE "public"."tipo_resolucion" AS ENUM('reembolso', 'cambio');--> statement-breakpoint
CREATE TYPE "public"."unidad_medida" AS ENUM('pieza', 'kg');--> statement-breakpoint
CREATE TABLE "abono" (
	"id_abono" serial PRIMARY KEY NOT NULL,
	"monto_abono" numeric(12, 2) NOT NULL,
	"fecha_abono" timestamp DEFAULT now() NOT NULL,
	"id_cliente" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categoria" (
	"id_categoria" serial PRIMARY KEY NOT NULL,
	"nombre_categoria" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cliente" (
	"id_cliente" serial PRIMARY KEY NOT NULL,
	"nombre_cliente" text NOT NULL,
	"telefono_cliente" text,
	"limite_credito" numeric(12, 2) DEFAULT '0' NOT NULL,
	"saldo_actual" numeric(12, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compra" (
	"id_compra" serial PRIMARY KEY NOT NULL,
	"fecha_compra" date DEFAULT now() NOT NULL,
	"id_proveedor" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "configuracion_negocio" (
	"id_configuracion" serial PRIMARY KEY NOT NULL,
	"nombre_negocio" text NOT NULL,
	"direccion_negocio" text,
	"telefono_negocio" text,
	"logo_url" text,
	"fecha_actualizacion" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contiene" (
	"id_venta" integer NOT NULL,
	"id_producto" integer NOT NULL,
	"cantidad_vendida" numeric(12, 3) NOT NULL,
	"precio_unitario_venta" numeric(12, 2) NOT NULL,
	"descuento_aplicado" numeric(12, 2) DEFAULT '0' NOT NULL,
	CONSTRAINT "contiene_id_venta_id_producto_pk" PRIMARY KEY("id_venta","id_producto")
);
--> statement-breakpoint
CREATE TABLE "corte_caja" (
	"id_corte" serial PRIMARY KEY NOT NULL,
	"fecha_corte" timestamp DEFAULT now() NOT NULL,
	"fondo_inicial" numeric(12, 2) NOT NULL,
	"total_contado_sistema" numeric(12, 2) NOT NULL,
	"id_usuario" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "detalle_compra" (
	"id_compra" integer NOT NULL,
	"id_producto" integer NOT NULL,
	"cantidad_comprada" numeric(12, 3) NOT NULL,
	"costo_unitario" numeric(12, 2) NOT NULL,
	CONSTRAINT "detalle_compra_id_compra_id_producto_pk" PRIMARY KEY("id_compra","id_producto")
);
--> statement-breakpoint
CREATE TABLE "devolucion" (
	"id_devolucion" serial PRIMARY KEY NOT NULL,
	"id_venta" integer NOT NULL,
	"id_producto" integer NOT NULL,
	"cantidad_devuelta" numeric(12, 3) NOT NULL,
	"motivo_devolucion" text NOT NULL,
	"tipo_resolucion" "tipo_resolucion" NOT NULL,
	"id_usuario" integer NOT NULL,
	"fecha_devolucion" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "historico_precio" (
	"id_historico_precio" serial PRIMARY KEY NOT NULL,
	"id_producto" integer NOT NULL,
	"precio_anterior" numeric(12, 2) NOT NULL,
	"precio_nuevo" numeric(12, 2) NOT NULL,
	"fecha_cambio" timestamp DEFAULT now() NOT NULL,
	"id_usuario" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merma" (
	"id_merma" serial PRIMARY KEY NOT NULL,
	"motivo_merma" text NOT NULL,
	"tipo_merma" "tipo_merma" NOT NULL,
	"cantidad_merma" numeric(12, 3) NOT NULL,
	"id_producto" integer NOT NULL,
	"id_usuario" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "movimiento_caja" (
	"id_movimiento" serial PRIMARY KEY NOT NULL,
	"tipo_movimiento" "tipo_movimiento" NOT NULL,
	"monto_movimiento" numeric(12, 2) NOT NULL,
	"concepto_movimiento" text NOT NULL,
	"fecha_movimiento" timestamp DEFAULT now() NOT NULL,
	"id_usuario" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "producto" (
	"id_producto" serial PRIMARY KEY NOT NULL,
	"nombre_producto" text NOT NULL,
	"codigo_barras" text,
	"precio_compra" numeric(12, 2),
	"precio_venta" numeric(12, 2) NOT NULL,
	"unidad_medida" "unidad_medida" DEFAULT 'pieza' NOT NULL,
	"stock_actual" numeric(12, 3) DEFAULT '0' NOT NULL,
	"stock_minimo" numeric(12, 3) DEFAULT '0' NOT NULL,
	"id_categoria" integer,
	CONSTRAINT "producto_codigo_barras_unique" UNIQUE("codigo_barras")
);
--> statement-breakpoint
CREATE TABLE "producto_promocion" (
	"id_producto" integer NOT NULL,
	"id_promocion" integer NOT NULL,
	CONSTRAINT "producto_promocion_id_producto_id_promocion_pk" PRIMARY KEY("id_producto","id_promocion")
);
--> statement-breakpoint
CREATE TABLE "promocion" (
	"id_promocion" serial PRIMARY KEY NOT NULL,
	"nombre_promocion" text NOT NULL,
	"tipo_promocion" text NOT NULL,
	"descripcion_promocion" text,
	"fecha_inicio_promocion" date NOT NULL,
	"fecha_fin_promocion" date NOT NULL,
	"id_categoria" integer
);
--> statement-breakpoint
CREATE TABLE "proveedor" (
	"id_proveedor" serial PRIMARY KEY NOT NULL,
	"nombre_proveedor" text NOT NULL,
	"nombre_empresa" text,
	"telefono_proveedor" text,
	"correo_proveedor" text
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id_usuario" serial PRIMARY KEY NOT NULL,
	"nombre_usuario" text NOT NULL,
	"correo_usuario" text NOT NULL,
	"password_hash" text NOT NULL,
	"rol_usuario" "rol_usuario" NOT NULL,
	"fecha_ingreso" date DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_correo_usuario_unique" UNIQUE("correo_usuario")
);
--> statement-breakpoint
CREATE TABLE "venta" (
	"id_venta" serial PRIMARY KEY NOT NULL,
	"folio_venta" text NOT NULL,
	"fecha_venta" timestamp DEFAULT now() NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"metodo_pago" text NOT NULL,
	"estado_venta" "estado_venta" DEFAULT 'activa' NOT NULL,
	"id_cliente" integer,
	"id_usuario" integer NOT NULL,
	CONSTRAINT "venta_folio_venta_unique" UNIQUE("folio_venta")
);
--> statement-breakpoint
ALTER TABLE "abono" ADD CONSTRAINT "abono_id_cliente_cliente_id_cliente_fk" FOREIGN KEY ("id_cliente") REFERENCES "public"."cliente"("id_cliente") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compra" ADD CONSTRAINT "compra_id_proveedor_proveedor_id_proveedor_fk" FOREIGN KEY ("id_proveedor") REFERENCES "public"."proveedor"("id_proveedor") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contiene" ADD CONSTRAINT "contiene_id_venta_venta_id_venta_fk" FOREIGN KEY ("id_venta") REFERENCES "public"."venta"("id_venta") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contiene" ADD CONSTRAINT "contiene_id_producto_producto_id_producto_fk" FOREIGN KEY ("id_producto") REFERENCES "public"."producto"("id_producto") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corte_caja" ADD CONSTRAINT "corte_caja_id_usuario_usuarios_id_usuario_fk" FOREIGN KEY ("id_usuario") REFERENCES "public"."usuarios"("id_usuario") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "detalle_compra" ADD CONSTRAINT "detalle_compra_id_compra_compra_id_compra_fk" FOREIGN KEY ("id_compra") REFERENCES "public"."compra"("id_compra") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "detalle_compra" ADD CONSTRAINT "detalle_compra_id_producto_producto_id_producto_fk" FOREIGN KEY ("id_producto") REFERENCES "public"."producto"("id_producto") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devolucion" ADD CONSTRAINT "devolucion_id_venta_venta_id_venta_fk" FOREIGN KEY ("id_venta") REFERENCES "public"."venta"("id_venta") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devolucion" ADD CONSTRAINT "devolucion_id_producto_producto_id_producto_fk" FOREIGN KEY ("id_producto") REFERENCES "public"."producto"("id_producto") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devolucion" ADD CONSTRAINT "devolucion_id_usuario_usuarios_id_usuario_fk" FOREIGN KEY ("id_usuario") REFERENCES "public"."usuarios"("id_usuario") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historico_precio" ADD CONSTRAINT "historico_precio_id_producto_producto_id_producto_fk" FOREIGN KEY ("id_producto") REFERENCES "public"."producto"("id_producto") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historico_precio" ADD CONSTRAINT "historico_precio_id_usuario_usuarios_id_usuario_fk" FOREIGN KEY ("id_usuario") REFERENCES "public"."usuarios"("id_usuario") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merma" ADD CONSTRAINT "merma_id_producto_producto_id_producto_fk" FOREIGN KEY ("id_producto") REFERENCES "public"."producto"("id_producto") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merma" ADD CONSTRAINT "merma_id_usuario_usuarios_id_usuario_fk" FOREIGN KEY ("id_usuario") REFERENCES "public"."usuarios"("id_usuario") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimiento_caja" ADD CONSTRAINT "movimiento_caja_id_usuario_usuarios_id_usuario_fk" FOREIGN KEY ("id_usuario") REFERENCES "public"."usuarios"("id_usuario") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producto" ADD CONSTRAINT "producto_id_categoria_categoria_id_categoria_fk" FOREIGN KEY ("id_categoria") REFERENCES "public"."categoria"("id_categoria") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producto_promocion" ADD CONSTRAINT "producto_promocion_id_producto_producto_id_producto_fk" FOREIGN KEY ("id_producto") REFERENCES "public"."producto"("id_producto") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "producto_promocion" ADD CONSTRAINT "producto_promocion_id_promocion_promocion_id_promocion_fk" FOREIGN KEY ("id_promocion") REFERENCES "public"."promocion"("id_promocion") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promocion" ADD CONSTRAINT "promocion_id_categoria_categoria_id_categoria_fk" FOREIGN KEY ("id_categoria") REFERENCES "public"."categoria"("id_categoria") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venta" ADD CONSTRAINT "venta_id_cliente_cliente_id_cliente_fk" FOREIGN KEY ("id_cliente") REFERENCES "public"."cliente"("id_cliente") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venta" ADD CONSTRAINT "venta_id_usuario_usuarios_id_usuario_fk" FOREIGN KEY ("id_usuario") REFERENCES "public"."usuarios"("id_usuario") ON DELETE no action ON UPDATE no action;