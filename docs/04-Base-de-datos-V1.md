# Base de Datos V1

#### CATEGORIA

| Campo | Tipo | Notas |
| --- | --- | --- |
| id_categoria | int (PK) |  |
| nombre_categoria | string |  |

#### PRODUCTO

| Campo | Tipo | Notas |
| --- | --- | --- |
| id_producto | int (PK) |  |
| nombre_producto | string |  |
| codigo_barras | string | RF-01 |
| precio_compra | decimal |  |
| precio_venta | decimal |  |
| unidad_medida | string ("pieza" \| "kg") | RF-03, define si se vende a granel |
| stock_actual | decimal | permite decimales para productos a granel |
| stock_minimo | decimal | RF-12, RF-13 |
| id_categoria | int (FK → CATEGORIA) |  |

#### PROVEEDOR

| Campo | Tipo | Notas |
| --- | --- | --- |
| id_proveedor | int (PK) |  |
| nombre_proveedor | string |  |
| nombre_empresa | string |  |
| telefono_proveedor | string |  |
| correo_proveedor | string |  |

#### COMPRA

| Campo | Tipo | Notas |
| --- | --- | --- |
| id_compra | int (PK) |  |
| fecha_compra | date |  |
| id_proveedor | int (FK → PROVEEDOR) |  |

#### DETALLE_COMPRA

| Campo | Tipo | Notas |
| --- | --- | --- |
| id_compra | int (FK → COMPRA) | PK compuesta con id_producto |
| id_producto | int (FK → PRODUCTO) |  |
| cantidad_comprada | decimal |  |
| costo_unitario | decimal |  |

#### MERMA

| Campo | Tipo | Notas |
| --- | --- | --- |
| id_merma | int (PK) |  |
| motivo_merma | string |  |
| tipo_merma | string ("merma" \| "ajuste") | RF-10, RF-11 |
| cantidad_merma | decimal |  |
| id_producto | int (FK → PRODUCTO) |  |
| id_usuario | int (FK → USUARIOS) |  |

#### USUARIOS

| Campo | Tipo | Notas |
| --- | --- | --- |
| id_usuario | int (PK) |  |
| nombre_usuario | string |  |
| correo_usuario | string |  |
| password_hash | string | RNF-04 |
| rol_usuario | string | RF-15 |
| fecha_ingreso | date |  |

#### CLIENTE

| Campo | Tipo | Notas |
| --- | --- | --- |
| id_cliente | int (PK) |  |
| nombre_cliente | string |  |
| telefono_cliente | string |  |
| limite_credito | decimal | RF-20 |

#### ABONO

| Campo | Tipo | Notas |
| --- | --- | --- |
| id_abono | int (PK) |  |
| monto_abono | decimal |  |
| fecha_abono | timestamp |  |
| id_cliente | int (FK → CLIENTE) |  |

#### VENTA

| Campo | Tipo | Notas |
| --- | --- | --- |
| id_venta | int (PK) |  |
| folio_venta | string | RF-07 |
| fecha_venta | timestamp | RF-07 exige fecha y hora |
| metodo_pago | string | RF-16.2 |
| estado_venta | string ("activa" \| "pausada" \| "cancelada") | RF-05, RF-17.1 |
| id_cliente | int (FK → CLIENTE, opcional) |  |
| id_usuario | int (FK → USUARIOS) | cajero que realizó la venta |

#### CONTIENE (detalle de venta)

| Campo | Tipo | Notas |
| --- | --- | --- |
| id_venta | int (FK → VENTA) | PK compuesta con id_producto |
| id_producto | int (FK → PRODUCTO) |  |
| cantidad_vendida | decimal |  |
| precio_unitario_venta | decimal | precio histórico al momento de vender |
| descuento_aplicado | decimal | RF-06 |

#### DEVOLUCION

| Campo | Tipo | Notas |
| --- | --- | --- |
| id_devolucion | int (PK) |  |
| id_venta | int (FK → VENTA) |  |
| id_producto | int (FK → PRODUCTO) |  |
| cantidad_devuelta | decimal |  |
| motivo_devolucion | string |  |
| tipo_resolucion | string ("reembolso" \| "cambio") | RF-17.2 |
| id_usuario | int (FK → USUARIOS) | autoriza |
| fecha_devolucion | timestamp |  |

#### MOVIMIENTO_CAJA

| Campo | Tipo | Notas |
| --- | --- | --- |
| id_movimiento | int (PK) |  |
| tipo_movimiento | string ("retiro" \| "gasto") | RF-19 |
| monto_movimiento | decimal |  |
| concepto_movimiento | string |  |
| fecha_movimiento | timestamp |  |
| id_usuario | int (FK → USUARIOS) |  |

#### CORTE_CAJA

| Campo | Tipo | Notas |
| --- | --- | --- |
| id_corte | int (PK) |  |
| fecha_corte | timestamp |  |
| fondo_inicial | decimal | RF-16.3 |
| total_contado_sistema | decimal | dato capturado por el cajero al contar físicamente |
| id_usuario | int (FK → USUARIOS) |  |

#### PROMOCION

| Campo | Tipo | Notas |
| --- | --- | --- |
| id_promocion | int (PK) |  |
| nombre_promocion | string |  |
| tipo_promocion | string ("2x1" \| "mayoreo") | RF-21 |
| descripcion_promocion | string |  |
| fecha_inicio_promocion | date |  |
| fecha_fin_promocion | date |  |
| id_categoria | int (FK → CATEGORIA, opcional) | si aplica a toda la categoría |

#### PRODUCTO_PROMOCION

| Campo | Tipo | Notas |
| --- | --- | --- |
| id_producto | int (FK → PRODUCTO) | PK compuesta |
| id_promocion | int (FK → PROMOCION) | PK compuesta |

#### HISTORICO_PRECIO *(tabla nueva)*

| Campo | Tipo | Notas |
| --- | --- | --- |
| id_historico_precio | int (PK) |  |
| id_producto | int (FK → PRODUCTO) |  |
| precio_anterior | decimal |  |
| precio_nuevo | decimal |  |
| fecha_cambio | timestamp |  |
| id_usuario | int (FK → USUARIOS) | RNF-05, quién hizo el cambio |
