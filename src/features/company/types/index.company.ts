export interface Empresa {
    id_empresa: number;
    ruc: string;
    nombre: string;
    es_predeterminada: boolean;
}

export interface RUCSelectorMenuProps {
    onSelect?: (ruc: string) => void;
    redirectTo?: string;
}