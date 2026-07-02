export type TipoModulo = 'empresas' | 'personas' | 'usuarios' | 'personas-usuarios' | 'catering' | 'tienda' | 'ventas';

export interface TabConfig {
    id: TipoModulo;
    label: string;
    icon: string;
}