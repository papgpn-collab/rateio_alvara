import React, { useState, useEffect } from 'react';
import { formatCurrency, parseCurrency } from '../utils/currency';

interface EditableFieldProps {
    label: string;
    value: number;
    onChange: (newValue: number) => void;
    labelClassName?: string;
    valueClassName?: string;
}

export const EditableField: React.FC<EditableFieldProps> = ({ label, value, onChange, labelClassName = "font-semibold text-gray-600", valueClassName = "font-mono text-lg font-semibold text-gray-800" }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [displayValue, setDisplayValue] = useState(formatCurrency(value));

    useEffect(() => {
        // Update display value if the underlying numeric value changes from parent
        if (!isEditing) {
            setDisplayValue(formatCurrency(value));
        }
    }, [value, isEditing]);

    const handleBlur = () => {
        setIsEditing(false);
        onChange(parseCurrency(displayValue));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.currentTarget.blur();
        }
    };
    
    if (isEditing) {
        return (
            <div className="flex justify-between items-baseline mb-2">
                <label className={labelClassName}>{label}:</label>
                <input
                    type="text"
                    value={displayValue}
                    onChange={(e) => setDisplayValue(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    className="w-36 text-right px-2 py-1 border border-blue-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-lg bg-blue-50"
                    autoFocus
                    onFocus={(e) => e.target.select()}
                />
            </div>
        );
    }

    return (
        <div className="flex justify-between items-baseline mb-2" onClick={() => setIsEditing(true)} title="Clique para editar">
            <span className={labelClassName}>{label}:</span>
            <span className={`${valueClassName} cursor-pointer p-1 rounded-md hover:bg-gray-100`}>{formatCurrency(value)}</span>
        </div>
    );
};