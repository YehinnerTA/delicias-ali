export type TipoModulo =
    | 'empresas'
    | 'personas'
    | 'usuarios'
    | 'personas-usuarios'
    | 'catering'
    | 'tienda'
    | 'ventas'
    | 'verificacion_almacen'
    | 'preparacion_cocina'
    | 'carga_transporte'
    | 'montaje_evento'
    | 'recojo_evento'
    | 'retorno_empresa'
    | 'cierre';

export interface TabConfig {
    id: TipoModulo;
    label: string;
    icon: string;
}