
import React, { useState, useEffect } from 'react';

// Declaração de tipo para o evento, pois não é padrão em todas as bibliotecas
interface BeforeInstallPromptEvent extends Event {
    readonly platforms: Array<string>;
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed',
        platform: string
    }>;
    prompt(): Promise<void>;
}

export const InstallPWAButton: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isHidden, setIsHidden] = useState(true);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setIsHidden(false);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Ouve o evento de app instalado para esconder o botão
        window.addEventListener('appinstalled', () => {
             setIsHidden(true);
             setDeferredPrompt(null);
             console.log('Aplicativo instalado com sucesso!');
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) {
            return;
        }
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            console.log('O usuário aceitou instalar o PWA');
        } else {
            console.log('O usuário recusou instalar o PWA');
        }
        setDeferredPrompt(null);
        setIsHidden(true);
    };
    
    if (isHidden) {
        return null;
    }

    return (
        <button
            onClick={handleInstallClick}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-md transform hover:scale-105"
            title="Instalar o aplicativo na sua área de trabalho"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Instalar App</span>
        </button>
    );
};
