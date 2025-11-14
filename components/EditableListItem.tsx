import React, { useState, useEffect } from 'react';
import { formatCurrency, parseCurrency } from '../utils/currency';

interface EditableListItemProps {
    item: { descricao: string; valor: number };
    onDescriptionChange: (value: string) => void;
    onValueChange: (value: number) => void;
    onDelete: () => void;
    valueClassName?: string;
}

export const EditableListItem: React.FC<EditableListItemProps> = ({ item, onDescriptionChange, onValueChange, onDelete, valueClassName }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [displayValue, setDisplayValue] = useState(formatCurrency(item.valor));

    useEffect(() => {
        if (!isEditing) {
            setDisplayValue(formatCurrency(item.valor));
        }
    }, [item.valor, isEditing]);

    const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDisplayValue(e.target.value);
    };
    
    const handleValueBlur = () => {
        setIsEditing(false);
        onValueChange(parseCurrency(displayValue));
    };


    return (
        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md border border-gray-200">
            <input
                type="text"
                value={item.descricao}
                onChange={(e) => onDescriptionChange(e.target.value)}
                className="flex-grow px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Descrição"
            />
            <input
                type="text"
                value={displayValue}
                onChange={handleValueChange}
                onBlur={handleValueBlur}
                onFocus={() => setIsEditing(true)}
                className={`w-32 px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm text-right font-mono focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${valueClassName ?? ''}`}
                placeholder="R$ 0,00"
            />
            <button
                onClick={onDelete}
                className="text-gray-400 hover:text-red-600 p-1 rounded-full transition-colors flex-shrink-0"
                aria-label="Remover item"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
            </button>
        </div>
    );
};