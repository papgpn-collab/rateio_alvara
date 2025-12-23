
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

console.log("Iniciando aplicação...");

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("Elemento root não encontrado!");
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log("Renderização inicial disparada.");
} catch (error) {
  console.error("Erro ao montar o aplicativo React:", error);
}
