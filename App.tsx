import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { v4 as uuidv4 } from 'uuid';
import { ExtractedData, Debito, Desconto, RateioItem, Deposito } from './types';
import { extractDataFromImage } from './services/geminiService';
import { WelcomePlaceholder } from './components/WelcomePlaceholder';
import { EditableField } from './components/EditableField';
import { EditableListItem } from './components/EditableListItem';
import { RateioModal } from './components/RateioModal';
import { formatCurrency } from './utils/currency';
import { toTitleCase } from './utils/text';
import { Login } from './components/Login';


// A simple spinner component
const Spinner: React.FC = () => (
    <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
    </div>
);

const DraggableZoomControls: React.FC<{ onZoomIn: () => void; onZoomOut: () => void; onReset: () => void; }> = ({ onZoomIn, onZoomOut, onReset }) => {
    const [position, setPosition] = useState<React.CSSProperties>({ bottom: 16, left: 16 });
    const [isDragging, setIsDragging] = useState(false);
    const offsetRef = useRef({ x: 0, y: 0 });
    const controlsRef = useRef<HTMLDivElement>(null);

    const handleDragMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!controlsRef.current) return;

        const rect = controlsRef.current.getBoundingClientRect();
        const parentRect = controlsRef.current.parentElement!.getBoundingClientRect();

        const initialTop = rect.top - parentRect.top;
        const initialLeft = rect.left - parentRect.left;
        
        setPosition({ top: initialTop, left: initialLeft });

        offsetRef.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
        setIsDragging(true);
        e.preventDefault();
    }, []);

    useEffect(() => {
        const handleDragMouseMove = (e: MouseEvent) => {
            if (!isDragging || !controlsRef.current) return;
            const parentRect = controlsRef.current.parentElement!.getBoundingClientRect();
            
            let newLeft = e.clientX - parentRect.left - offsetRef.current.x;
            let newTop = e.clientY - parentRect.top - offsetRef.current.y;
            
            const controlsWidth = controlsRef.current.offsetWidth;
            const controlsHeight = controlsRef.current.offsetHeight;
            
            newLeft = Math.max(0, Math.min(newLeft, parentRect.width - controlsWidth));
            newTop = Math.max(0, Math.min(newTop, parentRect.height - controlsHeight));

            setPosition({ top: newTop, left: newLeft });
        };

        const handleDragMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleDragMouseMove);
            document.addEventListener('mouseup', handleDragMouseUp);
            document.body.style.userSelect = 'none';
        }

        return () => {
            document.removeEventListener('mousemove', handleDragMouseMove);
            document.removeEventListener('mouseup', handleDragMouseUp);
            document.body.style.userSelect = '';
        };
    }, [isDragging]);

    return (
        <div
            ref={controlsRef}
            className="absolute bg-black bg-opacity-70 rounded-lg p-1 flex items-center shadow-lg z-10 select-none"
            style={position}
        >
            <div 
                onMouseDown={handleDragMouseDown}
                className="cursor-move p-2 text-white hover:bg-white/20 rounded-md transition-colors"
                title="Mover Controles"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </div>
            <div className="h-6 w-px bg-white/30 mx-1"></div>
            <button onClick={onZoomOut} className="p-2 text-white hover:bg-white/20 rounded-md transition-colors" title="Diminuir Zoom (-)">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
            </button>
            <button onClick={onReset} className="p-2 text-white hover:bg-white/20 rounded-md transition-colors text-xs font-semibold w-12" title="Resetar Zoom">
                100%
            </button>
            <button onClick={onZoomIn} className="p-2 text-white hover:bg-white/20 rounded-md transition-colors" title="Aumentar Zoom (+)">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>
            </button>
        </div>
    );
};


function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [depositos, setDepositos] = useState<Deposito[]>([{ id: uuidv4(), valor: 0 }]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1);

    const resetState = () => {
        setExtractedData(null);
        setIsLoading(false);
        setError(null);
        setImageSrc(null);
        setDepositos([{ id: uuidv4(), valor: 0 }]);
        setIsModalOpen(false);
        setZoomLevel(1);
    };
    
    const handleZoomIn = useCallback(() => setZoomLevel(prev => prev + 0.1), []);
    const handleZoomOut = useCallback(() => setZoomLevel(prev => Math.max(0.2, prev - 0.1)), []);
    const handleResetZoom = useCallback(() => setZoomLevel(1), []);

    const handleImageFile = useCallback(async (file: File) => {
        setIsLoading(true);
        setError(null);
        setExtractedData(null);
        setZoomLevel(1);

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64String = (reader.result as string).split(',')[1];
            setImageSrc(reader.result as string);
            try {
                const data = await extractDataFromImage(base64String);
                
                // Standardize discounts
                const processedDescontos = data.descontosReclamante.map(d => {
                    const upperDesc = d.descricao.toUpperCase();
                    let newDesc = d.descricao;
                    if (upperDesc.includes('CONTRIBUIÇÃO SOCIAL') || upperDesc.includes('INSS')) {
                        newDesc = 'Contribuição Social - Segurado';
                    } else {
                        newDesc = toTitleCase(d.descricao);
                    }
                    return { ...d, descricao: newDesc, id: uuidv4() };
                });

                // Consolidate lawyer fees
                const honorarios: Debito[] = [];
                const outrosDebitos: Debito[] = [];
                data.reclamadaDebitos.forEach(debito => {
                    if (debito.descricao.toUpperCase().includes('HONORÁRIOS')) {
                        honorarios.push(debito);
                    } else {
                        outrosDebitos.push(debito);
                    }
                });
                
                const honorariosAgrupados: { [key: string]: number } = {};
                const beneficiaryRegex = /(?:para|devidos para)\s(.*?)(?:\(|\d+%|$)/i;

                honorarios.forEach(h => {
                    const match = h.descricao.match(beneficiaryRegex);
                    const key = match ? toTitleCase(match[1].trim()) : 'Advogado';
                    
                    if (honorariosAgrupados[key]) {
                        honorariosAgrupados[key] += h.valor;
                    } else {
                        honorariosAgrupados[key] = h.valor;
                    }
                });

                const honorariosConsolidados: Debito[] = Object.entries(honorariosAgrupados).map(([nome, valor]) => ({
                    id: uuidv4(),
                    descricao: `Honorários de Sucumbência - ${nome}`,
                    valor: valor,
                }));
                
                const reclamadaDebitosProcessados = [
                    ...outrosDebitos.map(d => ({ ...d, descricao: toTitleCase(d.descricao), id: uuidv4() })),
                    ...honorariosConsolidados
                ];

                const dataWithIds: ExtractedData = {
                    ...data,
                    descontosReclamante: processedDescontos,
                    reclamadaDebitos: reclamadaDebitosProcessados,
                };

                setExtractedData(dataWithIds);
            } catch (e) {
                setError(e instanceof Error ? e.message : "Ocorreu um erro desconhecido.");
            } finally {
                setIsLoading(false);
            }
        };
        reader.onerror = () => {
            setError("Falha ao ler o arquivo de imagem.");
            setIsLoading(false);
        };
        reader.readAsDataURL(file);
    }, []);
    
    useEffect(() => {
        const handlePaste = (event: ClipboardEvent) => {
            const items = event.clipboardData?.items;
            if (items) {
                for (let i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf("image") !== -1) {
                        const file = items[i].getAsFile();
                        if (file) {
                             handleImageFile(file);
                        }
                        break; 
                    }
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => {
            window.removeEventListener('paste', handlePaste);
        };
    }, [handleImageFile]);


    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            handleImageFile(acceptedFiles[0]);
        }
    }, [handleImageFile]);

    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        onDrop,
        accept: { 'image/*': ['.jpeg', '.png', '.jpg', '.webp'] },
        noClick: true,
        noKeyboard: true,
        multiple: false
    });

    const updateData = (updater: (prev: ExtractedData) => ExtractedData) => {
        setExtractedData(prev => prev ? updater(prev) : null);
    };
    
    const handleValorBrutoChange = (newValue: number) => updateData(d => ({ ...d, valorBrutoReclamante: newValue }));

    const handleDescontoChange = (id: string, field: 'descricao' | 'valor', value: string | number) => {
        updateData(d => ({
            ...d,
            descontosReclamante: d.descontosReclamante.map(item => item.id === id ? { ...item, [field]: value } : item)
        }));
    };
    
    const handleDeleteDesconto = (id: string) => {
        updateData(d => ({
            ...d,
            descontosReclamante: d.descontosReclamante.filter(item => item.id !== id)
        }));
    };

    const handleAddDesconto = () => {
        const newDesconto: Desconto = { id: uuidv4(), descricao: '', valor: 0 };
        updateData(d => ({
            ...d,
            descontosReclamante: [...d.descontosReclamante, newDesconto]
        }));
    };
    
    const handleDebitoChange = (id: string, field: 'descricao' | 'valor', value: string | number) => {
        updateData(d => ({
            ...d,
            reclamadaDebitos: d.reclamadaDebitos.map(item => item.id === id ? { ...item, [field]: value } : item)
        }));
    };

    const handleDeleteDebito = (id: string) => {
        updateData(d => ({
            ...d,
            reclamadaDebitos: d.reclamadaDebitos.filter(item => item.id !== id)
        }));
    };

    const handleAddDebito = () => {
        const newDebito: Debito = { id: uuidv4(), descricao: '', valor: 0 };
        updateData(d => ({
            ...d,
            reclamadaDebitos: [...d.reclamadaDebitos, newDebito]
        }));
    };

    const totalDescontos = useMemo(() => {
        return extractedData?.descontosReclamante.reduce((sum, item) => sum + item.valor, 0) ?? 0;
    }, [extractedData?.descontosReclamante]);
    
    const valorLiquidoReclamante = useMemo(() => {
        if (!extractedData) return 0;
        return extractedData.valorBrutoReclamante - totalDescontos;
    }, [extractedData, totalDescontos]);

    const rateioItems = useMemo((): RateioItem[] => {
        if (!extractedData) return [];

        let reclamadaDebitosProcessados = [...extractedData.reclamadaDebitos];
        const itemsExtras: RateioItem[] = [];

        const contribuicaoSegurado = extractedData.descontosReclamante.find(d => 
            d.descricao.toUpperCase().includes('CONTRIBUIÇÃO SOCIAL - SEGURADO')
        );

        // Scenario 1: AI identified a "Total" social contribution value (common in initial calculation sheets).
        if (extractedData.contribuicaoSocialTotal && extractedData.contribuicaoSocialTotal > 0 && contribuicaoSegurado) {
            const contribuicaoTotalDebito = extractedData.reclamadaDebitos.find(d => 
                (d.descricao.toUpperCase().includes('CONTRIBUIÇÃO SOCIAL') || d.descricao.toUpperCase().includes('INSS'))
            );

            if (contribuicaoTotalDebito) {
                // Filter out the total debit to avoid duplication
                reclamadaDebitosProcessados = reclamadaDebitosProcessados.filter(d => d.id !== contribuicaoTotalDebito.id);
                
                // Calculate the employer's part by subtraction
                const valorEmpresa = contribuicaoTotalDebito.valor - contribuicaoSegurado.valor;
                if (valorEmpresa > 0) {
                    itemsExtras.push({
                        id: 'reclamada_cs_empresa',
                        descricao: 'Contribuição Social - Empresa',
                        valorOriginal: valorEmpresa,
                        selecionado: true,
                        origem: 'reclamada'
                    });
                }
            }
        // Scenario 2: Social contributions are already separate (common in update sheets).
        } else {
            // Find the item that is the employer's contribution and just rename it for clarity.
            reclamadaDebitosProcessados = reclamadaDebitosProcessados.map(d => {
                if (d.descricao.toUpperCase().includes('CONTRIBUIÇÃO SOCIAL') || d.descricao.toUpperCase().includes('INSS')) {
                    return { ...d, descricao: 'Contribuição Social - Empresa' };
                }
                return d;
            });
        }
        

        const debitosItems: RateioItem[] = reclamadaDebitosProcessados.map(d => ({
            id: d.id,
            descricao: d.descricao,
            valorOriginal: d.valor,
            selecionado: true,
            origem: 'reclamada'
        }));

        const descontosItems: RateioItem[] = extractedData.descontosReclamante.map(d => ({
            id: d.id,
            descricao: d.descricao,
            valorOriginal: d.valor,
            selecionado: true,
            origem: 'reclamante'
        }));
        
        const principalItem: RateioItem = {
            id: 'principal',
            descricao: 'Crédito Líquido do Reclamante',
            valorOriginal: valorLiquidoReclamante,
            selecionado: true,
            origem: 'principal'
        };
        
        return [...debitosItems, ...itemsExtras, ...descontosItems, principalItem];

    }, [extractedData, valorLiquidoReclamante]);
    
    const totalDebitosReclamada = useMemo(() => {
        return rateioItems
            .filter(item => item.origem === 'reclamada' && item.id !== 'principal')
            .reduce((sum, item) => sum + item.valorOriginal, 0);
    }, [rateioItems]);

    if (!isAuthenticated) {
        return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
    }

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800">
            <header className="bg-white shadow-md">
                <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Extrator - Simulador - RATEIO </h1>
                        <p className="text-sm text-gray-500">Extraia dados de planilhas com IA e simule o rateio de depósitos.</p>
                    </div>
                    
                </div>
            </header>

            <main className="container mx-auto p-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Left Column - Image Upload */}
                    <div {...getRootProps({ className: `p-4 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-center transition-colors h-full min-h-[400px] lg:min-h-[600px] ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:border-gray-400'}` })}>
                        <input {...getInputProps()} />
                        {imageSrc ? (
                            <div className="relative w-full h-full">
                                <div className="w-full h-full overflow-auto flex justify-center items-center">
                                    <img 
                                        src={imageSrc} 
                                        alt="Planilha de cálculo" 
                                        className="max-w-none max-h-none transition-transform duration-150 ease-linear"
                                        style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center' }}
                                    />
                                </div>
                                <DraggableZoomControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onReset={handleResetZoom} />
                                <button onClick={resetState} className="absolute top-2 right-2 bg-white rounded-full p-2 shadow-lg hover:bg-red-500 hover:text-white transition z-10">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        ) : (
                             <div className="cursor-pointer" onClick={open}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <p className="mt-4 text-lg font-semibold text-gray-700">Arraste e solte uma imagem aqui</p>
                                <p className="text-gray-500">ou</p>
                                <button type="button" className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 transition">Selecione o Arquivo</button>
                                <p className="mt-4 text-sm text-gray-500">Você também pode colar a imagem (Ctrl+V)</p>
                            </div>
                        )}
                    </div>

                    {/* Right Column - Data & Actions */}
                    <div className="bg-white rounded-lg shadow-md border border-gray-200 flex flex-col h-full min-h-[400px] lg:min-h-[600px]">
                        {isLoading && <div className="flex-grow flex items-center justify-center p-6"><Spinner /></div>}
                        {error && <div className="m-6 text-red-600 bg-red-100 p-4 rounded-md">{error}</div>}
                        {!isLoading && !error && !extractedData && <div className="flex-grow p-6"><WelcomePlaceholder /></div>}
                        
                        {extractedData && (
                            <div className="overflow-y-auto p-6">
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-lg font-bold border-b pb-2 mb-3 text-gray-700">Crédito do Reclamante</h3>
                                        <EditableField label="Valor Bruto" value={extractedData.valorBrutoReclamante} onChange={handleValorBrutoChange} />
                                    </div>
                                    
                                    <div>
                                        <h3 className="text-lg font-bold border-b pb-2 mb-3 text-gray-700">Descontos do Reclamante</h3>
                                        <div className="space-y-2">
                                            {extractedData.descontosReclamante.map((item) => (
                                                <EditableListItem
                                                    key={item.id}
                                                    item={item}
                                                    onDescriptionChange={(v) => handleDescontoChange(item.id, 'descricao', v)}
                                                    onValueChange={(v) => handleDescontoChange(item.id, 'valor', v)}
                                                    onDelete={() => handleDeleteDesconto(item.id)}
                                                />
                                            ))}
                                        </div>
                                        <button onClick={handleAddDesconto} className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-semibold">+ Adicionar Desconto</button>
                                    </div>
                                    
                                    <div>
                                        <h3 className="text-lg font-bold border-b pb-2 mb-3 text-gray-700">Débitos da Reclamada</h3>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-baseline p-2 bg-blue-50 rounded-md border border-blue-200">
                                                 <span className="font-semibold text-blue-800">Crédito Líquido do Reclamante</span>
                                                 <span className="font-mono text-lg font-bold text-blue-800">{formatCurrency(valorLiquidoReclamante)}</span>
                                            </div>
                                            {extractedData.reclamadaDebitos.map((item) => (
                                                <EditableListItem
                                                    key={item.id}
                                                    item={item}
                                                    onDescriptionChange={(v) => handleDebitoChange(item.id, 'descricao', v)}
                                                    onValueChange={(v) => handleDebitoChange(item.id, 'valor', v)}
                                                    onDelete={() => handleDeleteDebito(item.id)}
                                                />
                                            ))}
                                        </div>
                                        <button onClick={handleAddDebito} className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-semibold">+ Adicionar Débito</button>
                                    </div>

                                    <div className="border-t pt-4 mt-6 space-y-2">
                                        <div className="flex justify-between font-semibold text-gray-600">
                                            <span>Total Descontos:</span>
                                            <span className="text-red-600">- {formatCurrency(totalDescontos)}</span>
                                        </div>
                                         <div className="flex justify-between font-bold text-lg text-green-700">
                                            <span>Crédito Líquido Reclamante:</span>
                                            <span>{formatCurrency(valorLiquidoReclamante)}</span>
                                        </div>
                                        <div className="flex justify-between font-semibold text-gray-600">
                                            <span>Total Outros Débitos (Reclamada):</span>
                                            <span>{formatCurrency(totalDebitosReclamada)}</span>
                                        </div>
                                    </div>
                                    
                                    <button 
                                        onClick={() => setIsModalOpen(true)}
                                        className="w-full mt-4 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-transform transform hover:scale-105"
                                    >
                                        Simular Rateio com Depósitos
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
            {isModalOpen && extractedData && (
                 <RateioModal 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)}
                    initialRateioItems={rateioItems}
                    depositos={depositos}
                    onDepositosChange={setDepositos}
                    valorBrutoReclamante={extractedData.valorBrutoReclamante}
                    descontosReclamante={extractedData.descontosReclamante}
                />
            )}
        </div>
    );
}

export default App;