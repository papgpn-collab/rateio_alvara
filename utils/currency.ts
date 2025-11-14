
export const formatCurrency = (value: number | string): string => {
    if (typeof value === 'number') {
        return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly === '') return '0,00';
    const numberValue = parseInt(digitsOnly, 10) / 100;
    return numberValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const parseCurrency = (value: string): number => {
    if (!value) return 0;
    const numberString = value.replace(/\./g, '').replace(',', '.');
    return parseFloat(numberString) || 0;
};
