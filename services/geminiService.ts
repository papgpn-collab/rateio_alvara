import { GoogleGenAI, Type } from "@google/genai";
import type { ExtractedData } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        valorBrutoReclamante: {
            type: Type.NUMBER,
            description: "O valor total bruto devido ao reclamante (autor/exequente), geralmente chamado 'Crédito do(a) Exequente', 'Principal + Juros', ou similar. Extraia apenas o número."
        },
        descontosReclamante: {
            type: Type.ARRAY,
            description: "Uma lista de todos os descontos aplicados ao valor do reclamante, como 'INSS', 'IRPF', 'Contribuição Social'. Cada item deve ser um objeto com descrição e valor.",
            items: {
                type: Type.OBJECT,
                properties: {
                    descricao: { type: Type.STRING, description: "A descrição do desconto (e.g., 'IRPF S/ RRA')." },
                    valor: { type: Type.NUMBER, description: "O valor numérico do desconto." }
                },
                 required: ['descricao', 'valor']
            }
        },
        reclamadaDebitos: {
            type: Type.ARRAY,
            description: "Uma lista de todos os débitos da reclamada (ré/executada), que são valores que ela deve pagar a terceiros. Inclua itens como 'Custas', 'Honorários', 'INSS - Cota Empresa'. Cada item deve ser um objeto com descrição e valor.",
            items: {
                type: Type.OBJECT,
                properties: {
                    descricao: { type: Type.STRING, description: "A descrição do débito (e.g., 'Custas Processuais')." },
                    valor: { type: Type.NUMBER, description: "O valor numérico do débito." }
                },
                required: ['descricao', 'valor']
            }
        },
        contribuicaoSocialTotal: {
            type: Type.NUMBER,
            description: "Analise o débito de Contribuição Social (INSS) da Reclamada. Se a planilha for de 'Resumo do Cálculo' (inicial), este valor geralmente é a SOMA da parte do empregado e da empresa. Neste caso, extraia o valor TOTAL aqui. Se for uma planilha de 'Atualização' (com coluna 'Diferença'), este valor geralmente já é a parte da EMPRESA separada. Neste caso, coloque 0 neste campo."
        }
    },
    required: ['valorBrutoReclamante', 'descontosReclamante', 'reclamadaDebitos']
};


export const extractDataFromImage = async (base64ImageData: string): Promise<ExtractedData> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: 'image/jpeg',
                            data: base64ImageData,
                        },
                    },
                    {
                        text: "Analise esta imagem de uma planilha de cálculo judicial trabalhista brasileira. Siga esta regra estritamente: 1. Verifique se a planilha contém colunas como 'Devido', 'Pago' e 'Diferença'. 2. Se a coluna 'Diferença' existir, TODOS os valores monetários para extração DEVEM ser obtidos EXCLUSIVAMENTE desta coluna, pois ela representa o saldo remanescente. 3. Se a coluna 'Diferença' não existir, extraia os valores das colunas principais ('Valor', 'Total', etc.). Extraia as informações financeiras e retorne-as no formato JSON, seguindo o schema fornecido. Certifique-se de que todos os valores monetários sejam números positivos.",
                    },
                ],
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });
        
        const jsonText = response.text.trim();
        const data = JSON.parse(jsonText);

        // Data validation
        if (!data || typeof data.valorBrutoReclamante !== 'number' || !Array.isArray(data.descontosReclamante) || !Array.isArray(data.reclamadaDebitos)) {
             throw new Error("A resposta da IA não corresponde ao formato esperado.");
        }

        return data as ExtractedData;

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error("Falha ao se comunicar com a IA. Verifique a imagem ou tente novamente.");
    }
};