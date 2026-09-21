import React, { useState } from 'react';
import { Download, Share, PlusSquare, X, CheckCircle, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'banner' | 'settings';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'header', className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showGenericGuide, setShowGenericGuide] = useState(false);

  // Se já estiver rodando como app instalado no dispositivo, oculta
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      setShowGenericGuide(true);
    }
  };

  const renderButton = () => {
    if (variant === 'settings') {
      return (
        <button
          type="button"
          onClick={handleInstallClick}
          id="btn-install-pwa-settings"
          className="w-full flex items-center justify-between p-3.5 rounded-xl border border-emerald-300/80 dark:border-emerald-800/80 bg-emerald-50/60 dark:bg-emerald-950/40 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/50 transition-all text-left group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-600 text-white shadow-xs group-hover:scale-105 transition-transform">
              <Download className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 block">
                Instalar Aplicativo no Celular / PC
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                Acesse em tela cheia com ícone na tela inicial e resposta ultra-rápida
              </span>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800/70">
            Instalar
          </span>
        </button>
      );
    }

    if (variant === 'banner') {
      return (
        <div className={`p-3 sm:p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm ${className}`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-white">Instalar RendimentoPro como App</span>
                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded">PWA</span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Adicione à tela de início do seu celular para usar como aplicativo nativo.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              id="btn-install-pwa-banner"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Instalar App</span>
            </button>
          </div>
        </div>
      );
    }

    // Default: header compact pill
    return (
      <button
        type="button"
        onClick={handleInstallClick}
        id="btn-install-pwa-header"
        title="Instalar RendimentoPro no seu celular ou computador"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-200 bg-emerald-100/90 dark:bg-emerald-950/90 hover:bg-emerald-200 dark:hover:bg-emerald-900 border border-emerald-300/80 dark:border-emerald-700/80 rounded-lg shadow-2xs transition-all cursor-pointer ${className}`}
      >
        <Download className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-300 animate-bounce" />
        <span className="hidden sm:inline">Instalar App</span>
        <span className="sm:hidden">App</span>
      </button>
    );
  };

  return (
    <>
      {renderButton()}

      {/* Guia interativo para iOS (Safari no iPhone / iPad) */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 text-slate-100 p-5 shadow-2xl border border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Instalar no iPhone / iPad</h3>
                  <p className="text-xs text-slate-400">Via Safari</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-300">
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <div className="p-1.5 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800/80 shrink-0">
                  <Share className="h-4 w-4" />
                </div>
                <div>
                  <strong className="text-slate-100 block mb-0.5">1. Toque em Compartilhar</strong>
                  No Safari, toque no ícone de compartilhamento na barra inferior do navegador.
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <div className="p-1.5 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800/80 shrink-0">
                  <PlusSquare className="h-4 w-4" />
                </div>
                <div>
                  <strong className="text-slate-100 block mb-0.5">2. Adicionar à Tela de Início</strong>
                  Role as opções para baixo e selecione <em>"Adicionar à Tela de Início"</em>.
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <div className="p-1.5 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800/80 shrink-0">
                  <CheckCircle className="h-4 w-4" />
                </div>
                <div>
                  <strong className="text-slate-100 block mb-0.5">3. Concluir</strong>
                  Toque em <strong>Adicionar</strong> no canto superior direito para criar o ícone do aplicativo.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="mt-4 w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-xs font-bold text-white transition-colors cursor-pointer"
            >
              Entendi
            </button>
          </div>
        </div>
      )}

      {/* Guia genérico para navegadores sem evento automático antes do clique */}
      {showGenericGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 text-slate-100 p-5 shadow-2xl border border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800">
                  <Download className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Como Instalar o App</h3>
                  <p className="text-xs text-slate-400">Instalação direta no navegador</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGenericGuide(false)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5 text-xs text-slate-300">
              <p className="leading-relaxed">
                Para instalar o <strong>RendimentoPro</strong> na tela inicial do seu celular ou no seu computador:
              </p>
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-1.5">
                <p>• <strong>No Android (Chrome):</strong> Toque nos 3 pontinhos do menu (⋮) e selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</p>
                <p>• <strong>No Computador (Chrome/Edge):</strong> Clique no ícone de instalar aplicativo na barra de endereços (ao lado da estrela de favoritos).</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGenericGuide(false)}
              className="mt-4 w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-xs font-bold text-white transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
};
