
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { v4 as uuidv4 } from 'uuid';
import { ExtractedData, Debito, Desconto, RateioItem, Deposito } from './types.ts';
import { extractDataFromImage } from './services/geminiService.ts';
import { WelcomePlaceholder } from './components/WelcomePlaceholder.tsx';
import { EditableField } from './components/EditableField.tsx';
import { EditableListItem } from './components/EditableListItem.tsx';
import { RateioModal } from './components/RateioModal.tsx';
import { formatCurrency } from './utils/currency.ts';
import { toTitleCase } from './utils/text.ts';
import { Login } from './components/Login.tsx';

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
        offsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
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
        const handleDragMouseUp = () => setIsDragging(false);
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
            <div onMouseDown={handleDragMouseDown} className="cursor-move p-2 text-white hover:bg-white/20 rounded-md transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg></div>
            <div className="h-6 w-px bg-white/30 mx-1"></div>
            <button onClick={onZoomOut} className="p-2 text-white hover:bg-white/20 rounded-md transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg></button>
            <button onClick={onReset} className="p-2 text-white hover:bg-white/20 rounded-md transition-colors text-xs font-bold w-12 uppercase">100%</button>
            <button onClick={onZoomIn} className="p-2 text-white hover:bg-white/20 rounded-md transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg></button>
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
                const processedDescontos = data.descontosReclamante.map(d => {
                    const upperDesc = d.descricao.toUpperCase();
                    let newDesc = d.descricao;
                    if (upperDesc.includes('CONTRIBUIÇÃO SOCIAL') || upperDesc.includes('INSS')) newDesc = 'Contribuição Social - Segurado';
                    else newDesc = toTitleCase(d.descricao);
                    return { ...d, descricao: newDesc, id: uuidv4() };
                });
                const honorarios: Debito[] = [];
                const outrosDebitos: Debito[] = [];
                data.reclamadaDebitos.forEach(debito => {
                    const desc = debito.descricao.toUpperCase();
                    const isLawyerFee = desc.includes('HONORÁRIOS') && !desc.includes('PERICIAIS') && !desc.includes('PERICIAL') && !desc.includes('PERITO');
                    if (isLawyerFee) honorarios.push(debito); else outrosDebitos.push(debito);
                });
                const honorariosAgrupados: { [key: string]: number } = {};
                const beneficiaryRegex = /(?:para|devidos para)\s(.*?)(?:\(|\d+%|$)/i;
                honorarios.forEach(h => {
                    const match = h.descricao.match(beneficiaryRegex);
                    const key = match ? toTitleCase(match[1].trim()) : 'Advogado';
                    if (honorariosAgrupados[key]) honorariosAgrupados[key] += h.valor; else honorariosAgrupados[key] = h.valor;
                });
                const honorariosConsolidados: Debito[] = Object.entries(honorariosAgrupados).map(([nome, valor]) => ({
                    id: uuidv4(), descricao: `Honorários de Sucumbência - ${nome}`, valor: valor,
                }));
                const reclamadaDebitosProcessados = [...outrosDebitos.map(d => ({ ...d, descricao: toTitleCase(d.descricao), id: uuidv4() })), ...honorariosConsolidados];
                const dataWithIds: ExtractedData = { ...data, descontosReclamante: processedDescontos, reclamadaDebitos: reclamadaDebitosProcessados };
                setExtractedData(dataWithIds);
            } catch (e) { setError(e instanceof Error ? e.message : "Ocorreu um erro desconhecido."); } finally { setIsLoading(false); }
        };
        reader.onerror = () => { setError("Falha ao ler o arquivo de imagem."); setIsLoading(false); };
        reader.readAsDataURL(file);
    }, []);
    
    useEffect(() => {
        const handlePaste = (event: ClipboardEvent) => {
            const items = event.clipboardData?.items;
            if (items) {
                for (let i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf("image") !== -1) {
                        const file = items[i].getAsFile();
                        if (file) handleImageFile(file);
                        break; 
                    }
                }
            }
        };
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [handleImageFile]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) handleImageFile(acceptedFiles[0]);
    }, [handleImageFile]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': ['.jpeg', '.png', '.jpg', '.webp'] },
        noClick: true,
        multiple: false
    });

    const updateData = (updater: (prev: ExtractedData) => ExtractedData) => setExtractedData(prev => prev ? updater(prev) : null);
    const handleValorBrutoChange = (newValue: number) => updateData(d => ({ ...d, valorBrutoReclamante: newValue }));
    const handleDescontoChange = (id: string, field: 'descricao' | 'valor', value: string | number) => updateData(d => ({ ...d, descontosReclamante: d.descontosReclamante.map(item => item.id === id ? { ...item, [field]: value } : item) }));
    const handleDeleteDesconto = (id: string) => updateData(d => ({ ...d, descontosReclamante: d.descontosReclamante.filter(item => item.id !== id) }));
    const handleAddDesconto = () => updateData(d => ({ ...d, descontosReclamante: [...d.descontosReclamante, { id: uuidv4(), descricao: '', valor: 0 }] }));
    const handleDebitoChange = (id: string, field: 'descricao' | 'valor', value: string | number) => updateData(d => ({ ...d, reclamadaDebitos: d.reclamadaDebitos.map(item => item.id === id ? { ...item, [field]: value } : item) }));
    const handleDeleteDebito = (id: string) => updateData(d => ({ ...d, reclamadaDebitos: d.reclamadaDebitos.filter(item => item.id !== id) }));
    const handleAddDebito = () => updateData(d => ({ ...d, reclamadaDebitos: [...d.reclamadaDebitos, { id: uuidv4(), descricao: '', valor: 0 }] }));

    const totalDescontos = useMemo(() => extractedData?.descontosReclamante.reduce((sum, item) => sum + item.valor, 0) ?? 0, [extractedData?.descontosReclamante]);
    const valorLiquidoReclamante = useMemo(() => extractedData ? extractedData.valorBrutoReclamante - totalDescontos : 0, [extractedData, totalDescontos]);

    const rateioItems = useMemo((): RateioItem[] => {
        if (!extractedData) return [];
        let rDebitos = [...extractedData.reclamadaDebitos];
        const extras: RateioItem[] = [];
        const csSegurado = extractedData.descontosReclamante.find(d => d.descricao.toUpperCase().includes('CONTRIBUIÇÃO SOCIAL - SEGURADO'));
        if (extractedData.contribuicaoSocialTotal && extractedData.contribuicaoSocialTotal > 0 && csSegurado) {
            const csTotal = rDebitos.find(d => (d.descricao.toUpperCase().includes('CONTRIBUIÇÃO SOCIAL') || d.descricao.toUpperCase().includes('INSS')));
            if (csTotal) {
                rDebitos = rDebitos.filter(d => d.id !== csTotal.id);
                const valorEmpresa = csTotal.valor - csSegurado.valor;
                if (valorEmpresa > 0) extras.push({ id: 'reclamada_cs_empresa', descricao: 'Contribuição Social - Empresa', valorOriginal: valorEmpresa, selecionado: true, origem: 'reclamada' });
            }
        } else {
            rDebitos = rDebitos.map(d => (d.descricao.toUpperCase().includes('CONTRIBUIÇÃO SOCIAL') || d.descricao.toUpperCase().includes('INSS')) ? { ...d, descricao: 'Contribuição Social - Empresa' } : d);
        }
        return [...rDebitos.map(d => ({ id: d.id, descricao: d.descricao, valorOriginal: d.valor, selecionado: true, origem: 'reclamada' as const })), ...extras, ...extractedData.descontosReclamante.map(d => ({ id: d.id, descricao: d.descricao, valorOriginal: d.valor, selecionado: true, origem: 'reclamante' as const })), { id: 'principal', descricao: 'Crédito Líquido do Reclamante', valorOriginal: valorLiquidoReclamante, selecionado: true, origem: 'principal' as const }];
    }, [extractedData, valorLiquidoReclamante]);

    if (!isAuthenticated) return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800">
            <header className="bg-white shadow-md">
                <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 uppercase">Extrator - Simulador - RATEIO</h1>
                        <p className="text-sm text-gray-500 font-bold">Extraia dados de planilhas com IA e simule o rateio de depósitos.</p>
                    </div>
                </div>
            </header>
            <main className="container mx-auto p-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div {...getRootProps({ className: `p-0 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-center transition-colors h-full min-h-[600px] relative overflow-hidden bg-white ${isDragActive ? 'border-blue-600' : 'border-gray-300 hover:border-blue-500'}` })}>
                        <input {...getInputProps()} />
                        {imageSrc ? (
                            <div className="w-full h-full relative" onClick={e => e.stopPropagation()}>
                                <div className="w-full h-full overflow-auto flex justify-center items-center">
                                    <img src={imageSrc} alt="Planilha" className="max-w-none max-h-none transition-transform duration-150 ease-linear" style={{ transform: `scale(${zoomLevel})` }} />
                                </div>
                                <DraggableZoomControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onReset={handleResetZoom} />
                                <button onClick={resetState} className="absolute top-2 right-2 bg-white rounded-full p-2 shadow-lg hover:bg-red-500 hover:text-white transition z-10"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                            </div>
                        ) : (
                             <div className="w-full h-full flex flex-col items-center justify-center bg-white cursor-default p-8">
                                <div className="bg-blue-600 px-10 py-5 rounded-lg shadow-xl pointer-events-none transform transition">
                                    <p className="text-3xl font-black text-white uppercase tracking-tighter shadow-sm text-center">
                                        COLAR A IMAGEM (CTRL + V)
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="bg-white rounded-lg shadow-md border border-gray-200 flex flex-col h-full min-h-[600px] overflow-hidden">
                        {isLoading ? <Spinner /> : error ? <div className="m-6 text-red-600 bg-red-100 p-4 rounded-md font-bold">{error}</div> : !extractedData ? <WelcomePlaceholder /> : (
                            <div className="overflow-y-auto p-6 space-y-6">
                                <div><h3 className="text-lg font-bold border-b pb-2 mb-3 text-gray-700 uppercase tracking-wide">Crédito do Reclamante</h3><EditableField label="Valor Bruto" value={extractedData.valorBrutoReclamante} onChange={handleValorBrutoChange} /></div>
                                <div><h3 className="text-lg font-bold border-b pb-2 mb-3 text-gray-700 uppercase tracking-wide">Descontos do Reclamante</h3><div className="space-y-2">{extractedData.descontosReclamante.map(item => (<EditableListItem key={item.id} item={item} onDescriptionChange={v => handleDescontoChange(item.id, 'descricao', v)} onValueChange={v => handleDescontoChange(item.id, 'valor', v)} onDelete={() => handleDeleteDesconto(item.id)} />))}</div><button onClick={handleAddDesconto} className="mt-3 text-sm text-blue-700 font-bold hover:text-blue-900 uppercase">+ Adicionar Desconto</button></div>
                                <div><h3 className="text-lg font-bold border-b pb-2 mb-3 text-gray-700 uppercase tracking-wide">Débitos da Reclamada</h3><div className="space-y-2"><div className="flex justify-between items-baseline p-2 bg-blue-50 rounded-md border border-blue-200"><span className="font-bold text-blue-800 uppercase text-xs">Crédito Líquido do Reclamante</span><span className="font-mono text-lg font-bold text-blue-800">{formatCurrency(valorLiquidoReclamante)}</span></div>{extractedData.reclamadaDebitos.map(item => (<EditableListItem key={item.id} item={item} onDescriptionChange={v => handleDebitoChange(item.id, 'descricao', v)} onValueChange={v => handleDebitoChange(item.id, 'valor', v)} onDelete={() => handleDeleteDebito(item.id)} />))}</div><button onClick={handleAddDebito} className="mt-3 text-sm text-blue-700 font-bold hover:text-blue-900 uppercase">+ Adicionar Débito</button></div>
                                <div className="border-t pt-4 space-y-2 font-bold uppercase text-sm text-gray-600"><div className="flex justify-between"><span>Total Descontos:</span><span className="text-red-600">- {formatCurrency(totalDescontos)}</span></div><div className="flex justify-between text-base text-green-700"><span>Crédito Líquido Reclamante:</span><span>{formatCurrency(valorLiquidoReclamante)}</span></div><div className="flex justify-between"><span>Total Outros Débitos (Reclamada):</span><span>{formatCurrency(rateioItems.filter(i => i.origem === 'reclamada').reduce((s, i) => s + i.valorOriginal, 0))}</span></div></div>
                                <button onClick={() => setIsModalOpen(true)} className="w-full mt-4 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition shadow-lg uppercase tracking-widest">Simular Rateio com Depósitos</button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
            {isModalOpen && extractedData && <RateioModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} initialRateioItems={rateioItems} depositos={depositos} onDepositosChange={setDepositos} valorBrutoReclamante={extractedData.valorBrutoReclamante} descontosReclamante={extractedData.descontosReclamante} />}
        </div>
    );
}

export default App;
