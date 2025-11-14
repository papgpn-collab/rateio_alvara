
export interface Debito {
    id: string;
    descricao: string;
    valor: number;
}

export interface Desconto {
    id: string;
    descricao: string;
    valor: number;
}

export interface ExtractedData {
    valorBrutoReclamante: number;
    descontosReclamante: Desconto[];
    reclamadaDebitos: Debito[];
    contribuicaoSocialTotal?: number;
}

export interface RateioItem {
    id: string;
    descricao: string;
    valorOriginal: number;
    selecionado: boolean;
    origem: 'principal' | 'reclamante' | 'reclamada';
}

export interface Deposito {
    id: string;
    valor: number;
}

export interface ResultadoRateio {
    [itemId: string]: {
        pago: number;
        restante: number;
    };
}
