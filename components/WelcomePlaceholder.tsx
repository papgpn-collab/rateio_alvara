
import React from 'react';

export const WelcomePlaceholder: React.FC = () => (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 h-full flex flex-col justify-center items-center text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-blue-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h2 className="text-xl font-bold text-gray-800">Bem-vindo!</h2>
        <p className="text-gray-600 mt-2 max-w-sm">Para começar, anexe ou cole uma imagem da sua planilha de cálculo judicial na área à esquerda.</p>
        <p className="text-gray-500 mt-4 text-sm">A IA irá extrair os valores, que você poderá editar antes de simular o rateio.</p>
    </div>
);
