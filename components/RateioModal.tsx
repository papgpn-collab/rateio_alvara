
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { RateioItem, Deposito, ResultadoRateio, Desconto } from '../types.ts';
import { formatCurrency, parseCurrency } from '../utils/currency.ts';

interface RateioModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialRateioItems: RateioItem[];
    depositos: Deposito[];
    onDepositosChange: (depositos: Deposito[]) => void;
    valorBrutoReclamante: number;
    descontosReclamante: Desconto[];
}

const isHonorarioAdvocaticio = (descricao: string) => {
    const d = descricao.toLowerCase();
    if (d.includes('pericial') || d.includes('periciais') || d.includes('perito')) return false;
    const keywords = [
        'honorário', 'honorario',
        'sucumbência', 'sucumbencia',
        'advocatício', 'advocaticio',
        'contratual',
        'contratuais',
        'advogado'
    ];
    return keywords.some(key => d.includes(key));
};

const EditableLabel: React.FC<{
    value: string;
    onChange: (newValue: string) => void;
    inputClassName?: string;
    spanClassName?: string;
}> = ({ value, onChange, inputClassName, spanClassName }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [currentValue, setCurrentValue] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);

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
    
    const modalRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: 50, left: 50 });
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [size, setSize] = useState({ width: Math.min(1152, window.innerWidth * 0.9), height: Math.min(800, window.innerHeight * 0.9) });

    const [pagoWidth, setPagoWidth] = useState(150);
    const [restanteWidth, setRestanteWidth] = useState(150);

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
            if (!isDragging) return;
            setPosition({
                top: e.clientY - offset.y,
                left: e.clientX - offset.x,
            });
        };
        const handleMouseUp = () => setIsDragging(false);
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, offset]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (modalRef.current) {
            setIsDragging(true);
            setOffset({
                x: e.clientX - modalRef.current.offsetLeft,
                y: e.clientY - modalRef.current.offsetTop,
            });
        }
    };

    const handleVerticalResize = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        const startY = e.clientY;
        const startHeight = size.height;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const newHeight = startHeight + (moveEvent.clientY - startY);
            setSize(prev => ({ ...prev, height: Math.max(400, newHeight) }));
        };
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }, [size.height]);

    const handleColumnResize = useCallback((column: 'pago' | 'restante', e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = column === 'pago' ? pagoWidth : restanteWidth;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const newWidth = startWidth + (moveEvent.clientX - startX);
            if (column === 'pago') setPagoWidth(Math.max(80, newWidth));
            else setRestanteWidth(Math.max(80, newWidth));
        };
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }, [pagoWidth, restanteWidth]);

    useEffect(() => {
        if(isOpen) setDescontosBaseCalculoIds(descontosReclamante.map(d => d.id));
    }, [isOpen, descontosReclamante]);

    const dynamicRateioItems = useMemo((): RateioItem[] => {
        let items: RateioItem[] = JSON.parse(JSON.stringify(initialRateioItems));
        if (calcularHonorarios) {
            const descontosADeduzir = descontosReclamante.filter(d => descontosBaseCalculoIds.includes(d.id)).reduce((sum, d) => sum + d.valor, 0);
            const baseDeCalculo = Math.max(0, valorBrutoReclamante - descontosADeduzir);
            const valorHonorarios = baseDeCalculo * (percentualHonorarios / 100);
            const principalItem = items.find(item => item.id === 'principal');
            if (principalItem) principalItem.valorOriginal = Math.max(0, principalItem.valorOriginal - valorHonorarios);
            items = items.filter(item => item.id !== 'honorarios_contratuais');
            if (valorHonorarios > 0) {
                items.push({ id: 'honorarios_contratuais', descricao: 'Honorários Contratuais', valorOriginal: valorHonorarios, selecionado: true, origem: 'reclamada' });
            }
        }
        items.sort((a, b) => (a.id === 'principal' ? -1 : b.id === 'principal' ? 1 : b.valorOriginal - a.valorOriginal));
        return items;
    }, [initialRateioItems, calcularHonorarios, percentualHonorarios, descontosBaseCalculoIds, valorBrutoReclamante, descontosReclamante]);
    
    useEffect(() => {
        setRateioItems(prevItems => {
            const selectionMap = new Map(prevItems.map(item => [item.id, item.selecionado]));
            const descMap = new Map(prevItems.map(item => [item.id, item.descricao]));
            return dynamicRateioItems.map(newItem => ({
                ...newItem,
                selecionado: selectionMap.has(newItem.id) ? selectionMap.get(newItem.id)! : newItem.selecionado,
                descricao: descMap.has(newItem.id) ? descMap.get(newItem.id)! : newItem.descricao
            }));
        });
    }, [dynamicRateioItems]);
    
    useEffect(() => {
        if (isOpen) {
            const ids = rateioItems.filter(item => isHonorarioAdvocaticio(item.descricao)).map(item => item.id);
            setHonorariosSelecionadosIds(ids);
        }
    }, [isOpen, rateioItems.length]);

    const totalDepositos = useMemo(() => depositos.reduce((sum, d) => sum + (d.valor || 0), 0), [depositos]);

    useEffect(() => {
        if (!isOpen) return;
        const itensSelecionados = rateioItems.filter(item => item.selecionado && item.valorOriginal > 0);
        const totalARatear = itensSelecionados.reduce((sum, item) => sum + item.valorOriginal, 0);
        const resultado: ResultadoRateio = {};
        rateioItems.forEach(item => { resultado[item.id] = { pago: 0, restante: item.valorOriginal }; });
        if (totalARatear <= 0 || totalDepositos <= 0) {
            setResultadoRateio(resultado);
            return;
        }
        const fatorProporcional = totalDepositos >= totalARatear ? 1 : totalDepositos / totalARatear;
        itensSelecionados.forEach(item => {
            const valorAPagar = item.valorOriginal * fatorProporcional;
            resultado[item.id] = { pago: valorAPagar, restante: item.valorOriginal - valorAPagar };
        });
        setResultadoRateio(resultado);
    }, [rateioItems, totalDepositos, isOpen]);

    const handleItemToggle = (itemId: string) => setRateioItems(prev => prev.map(item => item.id === itemId ? { ...item, selecionado: !item.selecionado } : item));
    const handleToggleDescontoBase = (id: string) => setDescontosBaseCalculoIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    const handleAddDeposito = () => onDepositosChange([...depositos, { id: uuidv4(), valor: 0 }]);
    const handleDepositoChange = (id: string, v: number) => onDepositosChange(depositos.map(d => (d.id === id ? { ...d, valor: v } : d)));
    const handleDeleteDeposito = (id: string) => onDepositosChange(depositos.length > 1 ? depositos.filter(d => d.id !== id) : [{ id: depositos[0].id, valor: 0 }]);

    const handlePagoChange = (itemId: string, newPago: number) => {
        const itemOriginal = rateioItems.find(item => item.id === itemId);
        if (!itemOriginal) return;
        const valorPago = Math.max(0, Math.min(newPago, itemOriginal.valorOriginal));
        setResultadoRateio(prev => ({ ...prev, [itemId]: { pago: valorPago, restante: itemOriginal.valorOriginal - valorPago } }));
    };

    const handleItemDescriptionChange = (id: string, desc: string) => setRateioItems(prev => prev.map(item => item.id === id ? { ...item, descricao: desc } : item));
    const handleToggleHonorarioSelecao = (id: string) => setHonorariosSelecionadosIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

    if (!isOpen) return null;

    const totalARatear = rateioItems.filter(i => i.selecionado).reduce((sum, i) => sum + i.valorOriginal, 0);
    const totalPago = Object.values(resultadoRateio).reduce<number>((sum, res) => sum + (Number(res?.pago) || 0), 0);
    const totalDaDivida = rateioItems.reduce<number>((sum, item) => sum + (Number(item.valorOriginal) || 0), 0);
    const totalRestante = totalDaDivida - totalPago;
    const saldoFinal = totalDepositos - totalPago;
    const totalHonorarios = honorariosSelecionadosIds.reduce<number>((sum, id) => {
        const res = resultadoRateio[id];
        const valor = res ? Number(res.pago) : 0;
        return sum + valor;
    }, 0);
    const valorPorAdvogado = numeroAdvogados > 0 ? totalHonorarios / numeroAdvogados : 0;
    const itemsToDisplay = hideZeroPaid ? rateioItems.filter(item => ((resultadoRateio[item.id] as any)?.pago ?? 0) > 0.005) : rateioItems;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50">
            <div
                ref={modalRef}
                className="bg-white rounded-lg shadow-2xl flex flex-col fixed overflow-hidden"
                style={{ top: `${position.top}px`, left: `${position.left}px`, width: `${size.width}px`, height: `${size.height}px` }}
                onClick={e => e.stopPropagation()}
            >
                <div 
                    className="bg-gray-50/50 cursor-move border-b border-gray-200 select-none"
                    onMouseDown={handleMouseDown}
                >
                    <div className="flex justify-between items-center px-4 py-2">
                        <h2 className="text-xl font-bold text-gray-800">Simulação de Rateio</h2>
                        <button 
                            onMouseDown={e => e.stopPropagation()}
                            onClick={onClose} 
                            className="text-gray-500 hover:text-gray-800 p-1 rounded-full hover:bg-gray-200"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>

                    <div className="px-4 flex justify-between items-end">
                        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                            <button
                                onMouseDown={e => e.stopPropagation()}
                                onClick={() => setActiveTab('config')}
                                className={`whitespace-nowrap py-2 px-1 border-b-2 font-bold text-sm transition-colors ${activeTab === 'config' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                            >
                                Configuração
                            </button>
                            <button
                                onMouseDown={e => e.stopPropagation()}
                                onClick={() => setActiveTab('resultado')}
                                className={`whitespace-nowrap py-2 px-1 border-b-2 font-bold text-sm transition-colors ${activeTab === 'resultado' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                            >
                                Resultado
                            </button>
                        </nav>
                        {activeTab === 'resultado' && (
                            <div className="pb-2 text-xs font-bold text-blue-700">
                                <span className="mr-2 uppercase">Dívida Selecionada:</span> <span className="font-mono">{formatCurrency(totalARatear)}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto p-4 min-h-0">
                    <div className={activeTab === 'config' ? 'block' : 'hidden'}>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-base font-bold text-gray-700 mb-2">1. Depósitos Judiciais</h3>
                                    <div className="space-y-1 p-3 bg-gray-50 rounded-md border">
                                        {depositos.map((dep, index) => (
                                            <div key={dep.id} className="flex items-center gap-2">
                                                <label className="flex-grow text-xs font-medium text-gray-700">{`Depósito ${index + 1}`}</label>
                                                <DepositInput value={dep.valor} onChange={(v) => handleDepositoChange(dep.id, v)} />
                                                <button onClick={() => handleDeleteDeposito(dep.id)} className="text-gray-400 hover:text-red-600 p-1"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg></button>
                                            </div>
                                        ))}
                                        <button onClick={handleAddDeposito} className="text-xs text-blue-600 font-bold hover:text-blue-800 mt-1 uppercase">+ Adicionar</button>
                                    </div>
                                    <div className="mt-2 text-right font-bold border-t pt-1">Total: <span className="font-mono">{formatCurrency(totalDepositos)}</span></div>
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-gray-700 mb-2">2. Honorários Contratuais</h3>
                                    <div className="space-y-2 p-3 bg-gray-50 rounded-md border">
                                        <div className="flex items-center"><input type="checkbox" id="calc-honorarios" checked={calcularHonorarios} onChange={(e) => setCalcularHonorarios(e.target.checked)} className="h-4 w-4 mr-2 cursor-pointer" /><label htmlFor="calc-honorarios" className="text-sm font-bold cursor-pointer">Calcular</label></div>
                                        {calcularHonorarios && (
                                            <div className="pl-6 space-y-2 border-l-2 border-blue-200">
                                                <div className="flex items-center gap-2"><input type="number" value={percentualHonorarios} onChange={(e) => setPercentualHonorarios(Number(e.target.value) || 0)} className="w-16 px-1 py-0.5 border rounded text-center text-sm" /><span>%</span></div>
                                                <p className="text-xs font-bold text-gray-600">Deduzir do Bruto:</p>
                                                <div className="space-y-1 max-h-32 overflow-y-auto text-xs">
                                                    {descontosReclamante.map(d => (<div key={d.id} className="flex items-center"><input type="checkbox" id={`db-${d.id}`} checked={descontosBaseCalculoIds.includes(d.id)} onChange={() => handleToggleDescontoBase(d.id)} className="h-3 w-3 mr-2 cursor-pointer" /><label htmlFor={`db-${d.id}`} className="flex justify-between w-full cursor-pointer"><span>{d.descricao}</span><span>{formatCurrency(d.valor)}</span></label></div>))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex flex-col justify-center text-center">
                                <h4 className="font-bold text-blue-800 uppercase">Simulação Ativa</h4>
                                <p className="text-blue-700 font-bold text-sm mt-1">Configure os depósitos e honorários. O rateio é calculado proporcionalmente ao saldo disponível.</p>
                            </div>
                        </div>
                    </div>

                    <div className={activeTab === 'resultado' ? 'block' : 'hidden'}>
                         <div className="bg-gray-50 rounded-lg border h-full flex flex-col">
                            <div className="p-3 border-b flex justify-between items-center text-xs">
                                <div className="text-blue-700 uppercase font-bold tracking-wider">RATEIO / LIBERAÇÃO</div>
                                <div className="flex items-center" style={{ width: `${pagoWidth + restanteWidth}px` }}>
                                    <div className="text-blue-700 font-bold text-right pr-4" style={{ flex: `0 0 ${pagoWidth}px` }}>
                                        <span className="mr-2">Total a Ratear:</span>
                                        <span className="font-mono text-sm">{formatCurrency(totalDepositos)}</span>
                                    </div>
                                    <div style={{ flex: `0 0 ${restanteWidth}px` }}></div>
                                </div>
                            </div>
                            <div className="flex-grow overflow-y-auto">
                                <table className="w-full text-xs table-auto border-collapse">
                                    <thead className="sticky top-0 bg-white shadow-sm z-10">
                                        <tr className="border-b">
                                            <th className="text-left py-2 px-3 min-w-[300px]">
                                                <div className="flex items-center gap-4">
                                                    <EditableLabel value={descricaoLabel} onChange={setDescricaoLabel} />
                                                    <label className="flex items-center font-normal cursor-pointer text-gray-500 whitespace-nowrap">
                                                        <input type="checkbox" checked={hideZeroPaid} onChange={e => setHideZeroPaid(e.target.checked)} className="mr-1.5 h-3.5 w-3.5" />
                                                        Ocultar não pagos
                                                    </label>
                                                </div>
                                            </th>
                                            <th className="text-right py-2 px-3 relative group" style={{ width: `${pagoWidth}px` }}>
                                                <EditableLabel value={valorPagoLabel} onChange={setValorPagoLabel} />
                                                <div 
                                                    onMouseDown={(e) => handleColumnResize('pago', e)} 
                                                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize group-hover:bg-blue-300 transition-colors"
                                                />
                                            </th>
                                            <th className="text-right py-2 px-3 relative group" style={{ width: `${restanteWidth}px` }}>
                                                <EditableLabel value={valorRestanteLabel} onChange={setValorRestanteLabel} />
                                                <div 
                                                    onMouseDown={(e) => handleColumnResize('restante', e)} 
                                                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize group-hover:bg-blue-300 transition-colors"
                                                />
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {itemsToDisplay.map(item => {
                                            const res = resultadoRateio[item.id] || { pago: 0, restante: item.valorOriginal };
                                            const isAdv = isHonorarioAdvocaticio(item.descricao);
                                            return (
                                                <tr key={item.id} className={`border-b hover:bg-white transition-colors ${res.pago > 0 ? 'bg-green-50/50' : ''}`}>
                                                    <td className="py-2 px-3">
                                                        <div className="flex items-start gap-3">
                                                            <div className="flex items-center h-5">
                                                                <input type="checkbox" checked={item.selecionado} onChange={() => handleItemToggle(item.id)} className="h-4 w-4 cursor-pointer" />
                                                            </div>
                                                            <div className="w-6 h-5 flex-shrink-0 flex items-center justify-center">
                                                                {isAdv && (
                                                                    <input 
                                                                        type="checkbox" 
                                                                        checked={honorariosSelecionadosIds.includes(item.id)} 
                                                                        onChange={() => handleToggleHonorarioSelecao(item.id)} 
                                                                        className="h-4 w-4 accent-purple-700 cursor-pointer border-2 border-purple-300 rounded shadow-sm" 
                                                                        title="Somar ao Total de Hon. Adv." 
                                                                    />
                                                                )}
                                                            </div>
                                                            <div className="flex-grow">
                                                                <input 
                                                                    type="text" 
                                                                    value={item.descricao} 
                                                                    onChange={e => handleItemDescriptionChange(item.id, e.target.value)}
                                                                    className="w-full bg-transparent focus:bg-yellow-100 outline-none rounded font-medium"
                                                                />
                                                                {item.id === 'honorarios_contratuais' && <span className="text-blue-700 font-bold font-mono text-[10px] ml-1">({percentualHonorarios}%)</span>}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-2 px-3 text-right font-mono"><EditableCurrencyCell value={res.pago} onChange={v => handlePagoChange(item.id, v)} /></td>
                                                    <td className="py-2 px-3 text-right font-mono text-red-600">{formatCurrency(res.restante)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot className="sticky bottom-0 bg-gray-100 font-bold border-t-2 relative">
                                        <tr>
                                            <td className="py-2 px-3 text-right">Totais</td>
                                            <td className="py-2 px-3 text-right font-mono">{formatCurrency(totalPago)}</td>
                                            <td className="py-2 px-3 text-right font-mono text-red-600">{formatCurrency(totalRestante)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                                <div 
                                    onMouseDown={handleVerticalResize} 
                                    className="h-1.5 w-full bg-gray-200 hover:bg-blue-400 cursor-row-resize transition-colors sticky bottom-0 z-20"
                                    title="Arraste para ajustar altura da janela"
                                />
                            </div>
                            <div className="p-3 bg-white space-y-2 flex-shrink-0">
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between p-2 rounded bg-gray-100 border text-sm">
                                        <div className="flex-grow">
                                            <EditableLabel value={labelDivisaoHonorarios} onChange={setLabelDivisaoHonorarios} spanClassName="font-bold text-gray-700" />
                                        </div>
                                        <div className="flex items-center" style={{ width: `${pagoWidth + restanteWidth}px` }}>
                                            <div className="flex items-center justify-end gap-4 flex-grow" style={{ flex: `0 0 ${pagoWidth}px` }}>
                                                <input type="number" value={numeroAdvogados} onChange={e => setNumeroAdvogados(Math.max(1, parseInt(e.target.value) || 1))} className="w-12 py-0.5 border rounded text-center font-mono font-bold" min="1" />
                                                <div className="text-right">
                                                    <div className="font-mono font-bold text-gray-900">{formatCurrency(totalHonorarios)}</div>
                                                    <div className="font-mono text-xs text-blue-700 font-bold border-t mt-0.5 pt-0.5 uppercase">{formatCurrency(valorPorAdvogado)} / cada</div>
                                                </div>
                                            </div>
                                            <div style={{ flex: `0 0 ${restanteWidth}px` }}></div>
                                        </div>
                                    </div>
                                    <div 
                                        onMouseDown={handleVerticalResize} 
                                        className="h-1.5 w-full bg-gray-200 hover:bg-blue-400 cursor-row-resize transition-colors rounded-sm"
                                        title="Arraste para ajustar altura da janela"
                                    />
                                </div>
                                <div className={`flex justify-between font-bold text-base ${saldoFinal >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                                    <span>Saldo Final Depósitos</span>
                                    <span className="font-mono">{formatCurrency(saldoFinal)}</span>
                                </div>
                             </div>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
