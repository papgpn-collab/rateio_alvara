import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { RateioItem, Deposito, ResultadoRateio, Desconto } from '../types';
import { formatCurrency, parseCurrency } from '../utils/currency';

interface RateioModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialRateioItems: RateioItem[];
    depositos: Deposito[];
    onDepositosChange: (depositos: Deposito[]) => void;
    valorBrutoReclamante: number;
    descontosReclamante: Desconto[];
}

const EditableLabel: React.FC<{
    value: string;
    onChange: (newValue: string) => void;
    inputClassName?: string;
    spanClassName?: string;
}> = ({ value, onChange, inputClassName, spanClassName }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [currentValue, setCurrentValue] = useState(value);
    const inputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        setCurrentValue(value);
    }, [value]);

    useEffect(() => {
        if (isEditing) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isEditing]);
    
    const handleSave = () => {
        setIsEditing(false);
        onChange(currentValue);
    };

    if (isEditing) {
        return (
            <input
                ref={inputRef}
                type="text"
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setIsEditing(false); }}
                className={inputClassName || "w-full bg-yellow-100 focus:outline-none rounded px-1 text-inherit"}
                onMouseDown={e => e.stopPropagation()}
            />
        );
    }

    return (
        <span onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className={`cursor-pointer hover:bg-gray-200 rounded px-1 ${spanClassName || ''}`}>
            {value}
        </span>
    );
};

const EditableCurrencyCell: React.FC<{
    value: number;
    onChange: (newValue: number) => void;
    className?: string;
}> = ({ value, onChange, className }) => {
    const [displayValue, setDisplayValue] = useState(formatCurrency(value));
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (!isEditing) {
            setDisplayValue(formatCurrency(value));
        }
    }, [value, isEditing]);

    const handleBlur = () => {
        setIsEditing(false);
        onChange(parseCurrency(displayValue));
    };

    return (
        <input
            type="text"
            value={displayValue}
            onChange={(e) => setDisplayValue(e.target.value)}
            onFocus={() => setIsEditing(true)}
            onBlur={handleBlur}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            className={`w-full bg-transparent text-right font-mono font-bold text-green-700 focus:outline-none focus:bg-yellow-100 rounded px-1 ${className}`}
        />
    );
};

const DepositInput: React.FC<{
    value: number;
    onChange: (newValue: number) => void;
}> = ({ value, onChange }) => {
    const [displayValue, setDisplayValue] = useState(formatCurrency(value));
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (!isEditing) {
            setDisplayValue(formatCurrency(value));
        }
    }, [value, isEditing]);

    const handleBlur = () => {
        setIsEditing(false);
        onChange(parseCurrency(displayValue));
    };

    return (
        <input
            type="text"
            value={displayValue}
            onChange={(e) => setDisplayValue(e.target.value)}
            onFocus={() => setIsEditing(true)}
            onBlur={handleBlur}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            className="w-32 px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm text-right font-mono focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="R$ 0,00"
        />
    );
};

export const RateioModal: React.FC<RateioModalProps> = ({
    isOpen,
    onClose,
    initialRateioItems,
    depositos,
    onDepositosChange,
    valorBrutoReclamante,
    descontosReclamante
}) => {
    const [activeTab, setActiveTab] = useState<'config' | 'resultado'>('config');
    const [calcularHonorarios, setCalcularHonorarios] = useState(false);
    const [percentualHonorarios, setPercentualHonorarios] = useState(30);
    const [descontosBaseCalculoIds, setDescontosBaseCalculoIds] = useState<string[]>([]);
    const [rateioItems, setRateioItems] = useState<RateioItem[]>([]);
    const [resultadoRateio, setResultadoRateio] = useState<ResultadoRateio>({});
    
    const [descricaoLabel, setDescricaoLabel] = useState('Descrição');
    const [valorPagoLabel, setValorPagoLabel] = useState('Valor Pago');
    const [valorRestanteLabel, setValorRestanteLabel] = useState('Valor Restante');
    
    const [numeroAdvogados, setNumeroAdvogados] = useState(1);
    const [labelDivisaoHonorarios, setLabelDivisaoHonorarios] = useState('Total de Hon. Adv.');
    const [honorariosSelecionadosIds, setHonorariosSelecionadosIds] = useState<string[]>([]);
    const [hideZeroPaid, setHideZeroPaid] = useState(true);
    const [descricaoWidth, setDescricaoWidth] = useState<number | null>(null);
    const [valorPagoWidth, setValorPagoWidth] = useState<number | null>(null);
    
    const thDescricaoRef = useRef<HTMLTableCellElement>(null);
    const thValorPagoRef = useRef<HTMLTableCellElement>(null);

    const modalRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [size, setSize] = useState({ width: Math.min(1152, window.innerWidth * 0.9), height: Math.min(800, window.innerHeight * 0.9) });
    const [isResizingRight, setIsResizingRight] = useState(false);
    const [isResizingBottom, setIsResizingBottom] = useState(false);
    const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });


    useEffect(() => {
        if (isOpen) {
            setPosition({
                top: Math.max(0, (window.innerHeight - size.height) / 2),
                left: Math.max(0, (window.innerWidth - size.width) / 2),
            });
        }
    }, [isOpen, size.height, size.width]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !modalRef.current) return;
            e.preventDefault();
            
            const newTop = e.clientY - offset.y;
            const newLeft = e.clientX - offset.x;

            setPosition({
                top: newTop,
                left: newLeft,
            });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, offset]);

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (modalRef.current) {
            setIsDragging(true);
            setOffset({
                x: e.clientX - modalRef.current.offsetLeft,
                y: e.clientY - modalRef.current.offsetTop,
            });
        }
    };
    
    const handleMouseDownResizeRight = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        resizeStartRef.current = { x: e.clientX, y: 0, width: size.width, height: 0 };
        setIsResizingRight(true);
    }, [size.width]);

    const handleMouseDownResizeBottom = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        resizeStartRef.current = { x: 0, y: e.clientY, width: 0, height: size.height };
        setIsResizingBottom(true);
    }, [size.height]);

    // Effect for handling right resize
    useEffect(() => {
        if (!isResizingRight) return;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const { x: startX, width: startWidth } = resizeStartRef.current;
            const newWidth = startWidth + (moveEvent.clientX - startX);
            const minWidth = 800;
            setSize(prev => ({
                ...prev,
                width: Math.max(minWidth, newWidth),
            }));
        };

        const handleMouseUp = () => {
            setIsResizingRight(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizingRight]);

    // Effect for handling bottom resize
    useEffect(() => {
        if (!isResizingBottom) return;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const { y: startY, height: startHeight } = resizeStartRef.current;
            const newHeight = startHeight + (moveEvent.clientY - startY);
            const minHeight = 600;
            setSize(prev => ({
                ...prev,
                height: Math.max(minHeight, newHeight),
            }));
        };

        const handleMouseUp = () => {
            setIsResizingBottom(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizingBottom]);


    useEffect(() => {
        if(isOpen) {
            // By default, all discounts are selected for deduction
            setDescontosBaseCalculoIds(descontosReclamante.map(d => d.id));
        }
    }, [isOpen, descontosReclamante]);

    const dynamicRateioItems = useMemo((): RateioItem[] => {
        let items: RateioItem[] = JSON.parse(JSON.stringify(initialRateioItems));

        if (calcularHonorarios) {
            const descontosADeduzir = descontosReclamante
                .filter(d => descontosBaseCalculoIds.includes(d.id))
                .reduce((sum, d) => sum + d.valor, 0);

            const baseDeCalculo = Math.max(0, valorBrutoReclamante - descontosADeduzir);
            const valorHonorarios = baseDeCalculo * (percentualHonorarios / 100);

            const principalItem = items.find(item => item.id === 'principal');
            if (principalItem) {
                principalItem.valorOriginal = Math.max(0, principalItem.valorOriginal - valorHonorarios);
            }

            // Remove existing honorarios if recalculating
            items = items.filter(item => item.id !== 'honorarios_contratuais');
            
            if (valorHonorarios > 0) {
                 items.push({
                    id: 'honorarios_contratuais',
                    descricao: 'Honorários Contratuais',
                    valorOriginal: valorHonorarios,
                    selecionado: true,
                    origem: 'reclamada'
                });
            }
        }
        
        items.sort((a, b) => {
            if (a.id === 'principal') return -1;
            if (b.id === 'principal') return 1;
            return b.valorOriginal - a.valorOriginal;
        });

        return items;

    }, [initialRateioItems, calcularHonorarios, percentualHonorarios, descontosBaseCalculoIds, valorBrutoReclamante, descontosReclamante]);
    
    useEffect(() => {
         const selectionMap = new Map(rateioItems.map(item => [item.id, item.selecionado]));
         setRateioItems(dynamicRateioItems.map(newItem => ({
             ...newItem,
             selecionado: selectionMap.has(newItem.id) ? selectionMap.get(newItem.id)! : true,
         })));
    }, [dynamicRateioItems, rateioItems]);
    
    useEffect(() => {
        const idsDeHonorarios = rateioItems
            .filter(item => item.descricao.toLowerCase().includes('honorário'))
            .map(item => item.id);
        setHonorariosSelecionadosIds(idsDeHonorarios);
    }, [rateioItems]);

    const totalDepositos = useMemo(() => depositos.reduce((sum, d) => sum + (d.valor || 0), 0), [depositos]);

    useEffect(() => {
        const calcularRateio = () => {
            const itensSelecionados = rateioItems.filter(item => item.selecionado && item.valorOriginal > 0);
            const totalARatear = itensSelecionados.reduce((sum, item) => sum + item.valorOriginal, 0);
            const saldoDepositos = totalDepositos;
            const resultado: ResultadoRateio = {};

            rateioItems.forEach(item => {
                resultado[item.id] = { pago: 0, restante: item.valorOriginal };
            });

            if (totalARatear <= 0 || saldoDepositos <= 0) {
                setResultadoRateio(resultado);
                return;
            }

            const fatorProporcional = saldoDepositos >= totalARatear ? 1 : saldoDepositos / totalARatear;

            itensSelecionados.forEach(item => {
                const valorAPagar = item.valorOriginal * fatorProporcional;
                resultado[item.id] = {
                    pago: valorAPagar,
                    restante: item.valorOriginal - valorAPagar,
                };
            });
            
            setResultadoRateio(resultado);
        };

        if (isOpen) {
            calcularRateio();
        }
    }, [rateioItems, totalDepositos, isOpen]);

    const handleItemToggle = (itemId: string) => {
        setRateioItems(prevItems =>
            prevItems.map(item =>
                item.id === itemId ? { ...item, selecionado: !item.selecionado } : item
            )
        );
    };
    
    const handleToggleDescontoBase = (descontoId: string) => {
        setDescontosBaseCalculoIds(prev =>
            prev.includes(descontoId) ? prev.filter(id => id !== descontoId) : [...prev, descontoId]
        );
    };

    const handleAddDeposito = () => onDepositosChange([...depositos, { id: uuidv4(), valor: 0 }]);
    const handleDepositoChange = (id: string, newValue: number) => onDepositosChange(depositos.map(d => (d.id === id ? { ...d, valor: newValue } : d)));
    const handleDeleteDeposito = (id: string) => onDepositosChange(depositos.length > 1 ? depositos.filter(d => d.id !== id) : [{ id: depositos[0].id, valor: 0 }]);

    const handlePagoChange = (itemId: string, newPagoValue: number) => {
        const itemOriginal = rateioItems.find(item => item.id === itemId);
        if (!itemOriginal) return;

        const valorPago = Math.max(0, Math.min(newPagoValue, itemOriginal.valorOriginal));

        setResultadoRateio(prevResultado => ({
            ...prevResultado,
            [itemId]: {
                pago: valorPago,
                restante: itemOriginal.valorOriginal - valorPago,
            }
        }));
    };

    const handleItemDescriptionChange = (itemId: string, newDescription: string) => {
        setRateioItems(prevItems =>
            prevItems.map(item =>
                item.id === itemId ? { ...item, descricao: newDescription } : item
            )
        );
    };
    
    const handleToggleHonorarioSelecao = (itemId: string) => {
        setHonorariosSelecionadosIds(prev =>
            prev.includes(itemId)
                ? prev.filter(id => id !== itemId)
                : [...prev, itemId]
        );
    };
    
    const handleMouseDownColumnResize = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (!thDescricaoRef.current) return;

        const startX = e.clientX;
        const startWidth = thDescricaoRef.current.offsetWidth;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const newWidth = startWidth + (moveEvent.clientX - startX);
            if (newWidth > 150) { 
                setDescricaoWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, []);
    
    const handleMouseDownValorPagoResize = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (!thValorPagoRef.current) return;

        const startX = e.clientX;
        const startWidth = thValorPagoRef.current.offsetWidth;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const newWidth = startWidth + (moveEvent.clientX - startX);
            if (newWidth > 100) {
                setValorPagoWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, []);


    if (!isOpen) return null;

    const totalARatear = rateioItems.filter(i => i.selecionado).reduce((sum, i) => sum + i.valorOriginal, 0);
    // FIX: Explicitly type the accumulator `sum` to prevent it from being inferred as `unknown`.
    const totalPago = Object.values(resultadoRateio).reduce((sum: number, res: {pago: number, restante: number}) => sum + res.pago, 0);
    const totalDaDivida = useMemo(() => rateioItems.reduce((sum, item) => sum + item.valorOriginal, 0), [rateioItems]);
    const totalRestante = totalDaDivida - totalPago;
    const saldoFinal = totalDepositos - totalPago;
    
    const totalHonorarios = useMemo(() => {
        return honorariosSelecionadosIds.reduce((sum, id) => {
            // FIX: Use a more explicit type in the assertion to ensure correct type inference.
            const itemResult = resultadoRateio[id] as { pago: number; restante: number; } | undefined;
            const paidAmount = itemResult?.pago ?? 0;
            return sum + paidAmount;
        }, 0);
    }, [honorariosSelecionadosIds, resultadoRateio]);

    const valorPorAdvogado = useMemo(() => {
        return numeroAdvogados > 0 ? totalHonorarios / numeroAdvogados : 0;
    }, [totalHonorarios, numeroAdvogados]);

    const itemsToDisplay = useMemo(() => {
        if (!hideZeroPaid) {
            return rateioItems;
        }
        return rateioItems.filter(item => {
            // FIX: Use a more explicit type in the assertion to ensure correct type inference.
            const itemResult = resultadoRateio[item.id] as { pago: number; restante: number; } | undefined;
            return (itemResult?.pago ?? 0) > 0.005;
        });
    }, [hideZeroPaid, rateioItems, resultadoRateio]);


    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50">
            <div
                ref={modalRef}
                className="bg-white rounded-lg shadow-2xl p-6 flex flex-col fixed"
                style={{
                    top: `${position.top}px`,
                    left: `${position.left}px`,
                    width: `${size.width}px`,
                    height: `${size.height}px`,
                    userSelect: isDragging ? 'none' : 'auto',
                }}
                onClick={e => e.stopPropagation()}
            >
                <div 
                    className="flex justify-between items-center border-b pb-3 cursor-move flex-shrink-0"
                    onMouseDown={handleMouseDown}
                >
                    <h2 className="text-2xl font-bold text-gray-800">Simulação de Rateio</h2>
                    <button 
                        onMouseDown={e => e.stopPropagation()}
                        onClick={onClose} 
                        className="text-gray-500 hover:text-gray-800 p-1 rounded-full hover:bg-gray-100"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                {/* TABS */}
                <div className="border-b border-gray-200 mt-2 flex-shrink-0">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        <button
                            onClick={() => setActiveTab('config')}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-base transition-colors ${
                                activeTab === 'config'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Configuração
                        </button>
                        <button
                            onClick={() => setActiveTab('resultado')}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-base transition-colors ${
                                activeTab === 'resultado'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Resultado
                        </button>
                    </nav>
                </div>

                <div className="flex-grow overflow-y-auto pt-6 pr-2 -mr-2 min-h-0">
                    {/* CONFIGURATION TAB */}
                    <div className={activeTab === 'config' ? 'block' : 'hidden'}>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-6">
                               <div>
                                    <h3 className="text-lg font-bold text-gray-700 mb-3">1. Depósitos Judiciais</h3>
                                    <div className="space-y-2 p-4 bg-gray-50 rounded-md border">
                                        {depositos.map((dep, index) => (
                                            <div key={dep.id} className="flex items-center gap-2">
                                                <label className="flex-grow text-sm font-medium text-gray-700">{`Depósito ${index + 1}`}</label>
                                                <DepositInput value={dep.valor} onChange={(v) => handleDepositoChange(dep.id, v)} />
                                                <button onClick={() => handleDeleteDeposito(dep.id)} className="text-gray-400 hover:text-red-600 p-1 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg></button>
                                            </div>
                                        ))}
                                        <button onClick={handleAddDeposito} className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-semibold">+ Adicionar Depósito</button>
                                    </div>
                                    <div className="mt-3 text-right font-bold text-lg border-t pt-2">
                                        <span>Total Depositado: </span><span className="font-mono">{formatCurrency(totalDepositos)}</span>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-700 mb-3">2. Honorários Contratuais</h3>
                                    <div className="space-y-3 p-4 bg-gray-50 rounded-md border">
                                        <div className="flex items-center"><input type="checkbox" id="calc-honorarios" checked={calcularHonorarios} onChange={(e) => setCalcularHonorarios(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3 cursor-pointer" /><label htmlFor="calc-honorarios" className="font-semibold text-gray-800 cursor-pointer">Calcular Honorários Contratuais</label></div>
                                        {calcularHonorarios && (<div className="pl-7 space-y-3 border-l-2 border-blue-200 ml-2">
                                            <div className="flex items-center gap-2"><input type="number" value={percentualHonorarios} onChange={(e) => setPercentualHonorarios(Number(e.target.value) || 0)} className="w-20 px-2 py-1 border border-gray-300 rounded-md shadow-sm text-sm text-center font-mono" /><span className="font-semibold">%</span></div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-600 mb-2">Deduzir do Valor Bruto (Recte):</p>
                                                <div className="space-y-1 max-h-24 overflow-y-auto pr-2">
                                                    {descontosReclamante.map(d => (<div key={d.id} className="flex items-center"><input type="checkbox" id={`desc-base-${d.id}`} checked={descontosBaseCalculoIds.includes(d.id)} onChange={() => handleToggleDescontoBase(d.id)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3 cursor-pointer" /><label htmlFor={`desc-base-${d.id}`} className="text-sm flex justify-between w-full cursor-pointer"><span>{d.descricao}</span><span className="font-mono">{formatCurrency(d.valor)}</span></label></div>))}
                                                    {descontosReclamante.length === 0 && <p className="text-xs text-gray-500 italic">Nenhum desconto para deduzir.</p>}
                                                </div>
                                            </div>
                                        </div>)}
                                    </div>
                                </div>
                            </div>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 flex flex-col justify-center text-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-blue-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 13.5V3.75m0 9.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 4.5V17.25m9.75-9.75V3.75m0 9.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 4.5V17.25M12 8.25V3.75m0 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 4.5V17.25" />
                                </svg>
                                <h4 className="text-lg font-bold text-blue-800">Configure a Simulação</h4>
                                <p className="text-blue-700 mt-2">
                                    Informe os valores dos depósitos judiciais e defina as regras para o cálculo dos honorários contratuais.
                                </p>
                                <p className="text-blue-600 text-sm mt-4">
                                    Após configurar, clique na aba "Resultado" para ver a simulação do rateio.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* RESULTS TAB */}
                    <div className={activeTab === 'resultado' ? 'block' : 'hidden'}>
                         <div className="bg-gray-50 p-4 rounded-lg border h-full flex flex-col">
                            <div className="space-y-2 text-sm border-b pb-2 mb-2">
                                <div className="flex justify-between items-center font-semibold text-gray-600">
                                    <span>Total da Dívida Selecionada:</span>
                                    <span className="font-mono text-base">{formatCurrency(totalARatear)}</span>
                                </div>
                                <div className="flex justify-between items-center font-bold text-blue-800">
                                    <span>Valor a Ser Rateado (Depósitos):</span>
                                    <span className="font-mono text-base">{formatCurrency(totalDepositos)}</span>
                                </div>
                            </div>
                            <div className="flex-grow overflow-y-auto">
                                <table className="w-full text-sm table-fixed">
                                    <thead>
                                        <tr className="border-b">
                                            <th 
                                                ref={thDescricaoRef}
                                                className="text-left font-semibold pb-2 px-1 relative"
                                                style={{ width: descricaoWidth ? `${descricaoWidth}px` : '50%' }}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <EditableLabel value={descricaoLabel} onChange={setDescricaoLabel} />
                                                    <label htmlFor="hide-zero" className="flex items-center cursor-pointer text-gray-600 font-normal whitespace-nowrap pl-4">
                                                        <input 
                                                            type="checkbox" 
                                                            id="hide-zero" 
                                                            checked={hideZeroPaid} 
                                                            onChange={(e) => setHideZeroPaid(e.target.checked)}
                                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                                                        />
                                                        Ocultar itens não pagos
                                                    </label>
                                                </div>
                                                <div
                                                    onMouseDown={handleMouseDownColumnResize}
                                                    className="absolute top-0 right-0 h-full w-2 cursor-col-resize group"
                                                    title="Arraste para redimensionar"
                                                >
                                                  <div className="w-0.5 h-full bg-gray-200 group-hover:bg-blue-300 mx-auto"></div>
                                                </div>
                                            </th>
                                            <th
                                                ref={thValorPagoRef}
                                                className="text-right font-semibold pb-2 px-1 relative"
                                                style={{ width: valorPagoWidth ? `${valorPagoWidth}px` : 'auto' }}
                                            >
                                                <EditableLabel value={valorPagoLabel} onChange={setValorPagoLabel} />
                                                <div
                                                    onMouseDown={handleMouseDownValorPagoResize}
                                                    className="absolute top-0 right-0 h-full w-2 cursor-col-resize group"
                                                    title="Arraste para redimensionar"
                                                >
                                                  <div className="w-0.5 h-full bg-gray-200 group-hover:bg-blue-300 mx-auto"></div>
                                                </div>
                                            </th>
                                            <th className="text-right font-semibold pb-2 px-1">
                                                <EditableLabel value={valorRestanteLabel} onChange={setValorRestanteLabel} />
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {itemsToDisplay.map(item => {
                                            // FIX: Use a more explicit type in the assertion to ensure correct type inference.
                                            const itemResult = resultadoRateio[item.id] as { pago: number; restante: number; } | undefined;
                                            const isHonorario = item.descricao.toLowerCase().includes('honorário');
                                            return (
                                                <tr key={item.id} className={`border-b border-gray-200 ${!item.selecionado ? 'text-gray-400 italic' : ''} ${itemResult?.pago > 0 ? 'bg-green-50' : ''}`}>
                                                    <td className="py-2 px-1 flex items-center gap-3">
                                                        <input type="checkbox" checked={item.selecionado} onChange={() => handleItemToggle(item.id)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer flex-shrink-0" aria-label="Selecionar para rateio"/>
                                                        <div className="w-4 h-4 flex-shrink-0">
                                                            {isHonorario && (
                                                                <input
                                                                    type="checkbox"
                                                                    checked={honorariosSelecionadosIds.includes(item.id)}
                                                                    onChange={() => handleToggleHonorarioSelecao(item.id)}
                                                                    className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                                                                    title="Incluir na divisão de honorários"
                                                                />
                                                            )}
                                                        </div>
                                                        <div className="flex-grow flex items-baseline gap-2 min-w-0">
                                                            <input 
                                                                type="text"
                                                                value={item.descricao}
                                                                onChange={(e) => handleItemDescriptionChange(item.id, e.target.value)}
                                                                className="w-full bg-transparent focus:outline-none focus:bg-yellow-100 rounded px-1 truncate"
                                                                title={item.descricao}
                                                            />
                                                            {item.id === 'honorarios_contratuais' && calcularHonorarios && (
                                                                <span className="text-blue-600 font-mono text-xs whitespace-nowrap font-semibold">
                                                                    ({percentualHonorarios}%)
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="text-right font-mono px-1">
                                                        <EditableCurrencyCell 
                                                            value={itemResult?.pago ?? 0}
                                                            onChange={(newValue) => handlePagoChange(item.id, newValue)}
                                                        />
                                                    </td>
                                                    {/* FIX: Add type assertion to ensure the argument is a number, resolving the 'unknown' type error. */}
                                                    <td className="text-right font-mono px-1 text-red-600">{formatCurrency((itemResult?.restante ?? item.valorOriginal) as number)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t-2 border-gray-300 font-bold bg-gray-100">
                                            <td className="py-2 px-1 text-right font-semibold">
                                                Total
                                            </td>
                                            <td className="py-2 px-1 text-right font-mono text-base">
                                                {formatCurrency(totalPago)}
                                            </td>
                                            <td className="py-2 px-1 text-right font-mono text-base text-red-600">
                                                {formatCurrency(totalRestante)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                            <div className="border-t-2 border-gray-300 mt-2 pt-2 space-y-2">
                                <div className="flex items-center justify-between gap-4 text-base p-3 rounded-lg border bg-gray-100 shadow-sm">
                                    <EditableLabel 
                                        value={labelDivisaoHonorarios}
                                        onChange={setLabelDivisaoHonorarios}
                                        spanClassName="font-bold text-gray-800"
                                        inputClassName="font-bold text-gray-800 bg-yellow-100"
                                    />
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="number"
                                            value={numeroAdvogados}
                                            onChange={(e) => setNumeroAdvogados(Math.max(1, parseInt(e.target.value) || 1))}
                                            className="w-20 px-2 py-1.5 border border-gray-300 rounded-md shadow-sm text-center font-mono text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            min="1"
                                            aria-label="Número de advogados"
                                        />
                                        <div className="flex flex-col items-end w-40 text-right">
                                            <span className="font-mono text-lg font-bold text-gray-900" title="Total de Honorários Pagos">
                                                {formatCurrency(totalHonorarios)}
                                            </span>
                                            <span className="font-mono text-base font-semibold text-blue-700 pt-1 mt-1 border-t border-gray-300 w-full" title="Valor por Advogado">
                                                {formatCurrency(valorPorAdvogado)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className={`flex justify-between font-bold text-xl mt-2 ${saldoFinal >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                                    <span className="px-1">Saldo Final dos Depósitos</span>
                                    <span className="font-mono px-1">{formatCurrency(saldoFinal)}</span>
                                </div>
                             </div>
                         </div>
                    </div>
                </div>
                <div
                    onMouseDown={handleMouseDownResizeRight}
                    className="absolute top-0 -right-1 w-3 h-full cursor-col-resize z-20"
                    title="Redimensionar Largura"
                />
                <div
                    onMouseDown={handleMouseDownResizeBottom}
                    className="absolute bottom-0 -left-1 h-3 w-full cursor-row-resize z-20"
                    title="Redimensionar Altura"
                />
            </div>
        </div>
    );
};
