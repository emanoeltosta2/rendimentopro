import React, { useState } from 'react';
import { Cloud, X, CloudOff, LogIn, LogOut, User, RefreshCw, UserPlus, AlertCircle, Copy, Check, ExternalLink } from 'lucide-react';
import { useAuth } from '../services/AuthContext';
import firebaseConfig from '../../firebase-applet-config.json';

interface CloudSyncBarProps {
  isSyncing?: boolean;
  lastSyncTime?: Date | null;
  /** Mensagem da última falha de gravação. `null` quando está tudo certo. */
  syncError?: string | null;
  onManualSync?: () => void;
  onDismissError?: () => void;
}

export const CloudSyncBar: React.FC<CloudSyncBarProps> = ({
  isSyncing = false,
  lastSyncTime,
  syncError = null,
  onManualSync,
  onDismissError,
}) => {
  const { user, isLoading, signInGoogle, signOut, authError, clearAuthError } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showDomainHelpModal, setShowDomainHelpModal] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isUnauthorizedDomain = authError?.includes('unauthorized-domain') || authError?.includes('não está autorizado');

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true);
      await signInGoogle();
    } catch (e: any) {
      if (e?.code === 'auth/unauthorized-domain' || e?.message?.includes('unauthorized-domain')) {
        setShowDomainHelpModal(true);
      } else {
        console.error('Erro de login:', e);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSwitchAccount = async () => {
    try {
      setIsLoggingIn(true);
      await signInGoogle();
    } catch (e: any) {
      if (e?.code === 'auth/unauthorized-domain' || e?.message?.includes('unauthorized-domain')) {
        setShowDomainHelpModal(true);
      } else {
        console.error('Erro de login:', e);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    if (confirm('Deseja desconectar sua conta da nuvem? Os dados continuarão acessíveis no seu navegador.')) {
      await signOut();
    }
  };

  const copyToClipboard = () => {
    if (currentHostname) {
      navigator.clipboard.writeText(currentHostname);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2500);
    }
  };

  const handleDismissError = () => {
    clearAuthError();
    setShowDomainHelpModal(false);
  };

  if (isLoading) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-1.5 px-4 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <RefreshCw className="h-3 w-3 animate-spin text-slate-400 dark:text-slate-500" />
          Verificando sincronização na nuvem...
        </span>
      </div>
    );
  }

  return (
    <>
      {/* CORREÇÃO: falhas de gravação só apareciam no console; a barra
          continuava exibindo "sincronizado" com tudo falhando. */}
      {syncError && (
        <div className="bg-rose-50 dark:bg-rose-950/60 border-b border-rose-200 dark:border-rose-900 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center gap-2 text-rose-900 dark:text-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span className="text-xs sm:text-sm flex-1">{syncError}</span>
            {onManualSync && (
              <button
                onClick={onManualSync}
                className="text-xs font-semibold px-2.5 py-1 rounded-md bg-rose-600 dark:bg-rose-700 text-white hover:bg-rose-700 dark:hover:bg-rose-600"
              >
                Tentar de novo
              </button>
            )}
            {onDismissError && (
              <button
                onClick={onDismissError}
                aria-label="Dispensar aviso de sincronização"
                className="text-xs font-medium px-2 py-1 rounded-md text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60"
              >
                Dispensar
              </button>
            )}
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white py-1.5 px-3 sm:px-6 lg:px-8 text-xs border-b border-slate-700/50 flex flex-wrap items-center justify-between gap-2 overflow-hidden">
        {/* Status da Sincronização */}
        <div className="flex items-center gap-2 max-w-full">
          {user ? (
            <div className="flex items-center gap-2 flex-wrap text-[11px] sm:text-xs">
              <span className="flex h-2 w-2 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1.5 shrink-0">
                <Cloud className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">Sincronização ativa na nuvem (Firebase)</span>
                <span className="sm:hidden">Nuvem ativa</span>
              </span>
              {lastSyncTime && (
                <span className="text-slate-400 text-[10px] sm:text-[11px] hidden xs:inline">
                  • {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs">
              <CloudOff className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span className="text-slate-300 truncate">
                Modo Offline Local
              </span>
            </div>
          )}
        </div>

        {/* Conta & Ações */}
        <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap ml-auto">
          {authError && (
            <div className="flex items-center gap-1.5 bg-amber-950/70 border border-amber-500/40 rounded px-2 py-0.5 text-[11px]">
              <button
                onClick={() => setShowDomainHelpModal(true)}
                className="text-amber-300 hover:text-amber-200 flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Clique para ver instruções de autorização do domínio"
              >
                <AlertCircle className="h-3 w-3 text-amber-400 shrink-0" />
                <span className="max-w-[120px] sm:max-w-xs truncate font-medium">
                  {isUnauthorizedDomain ? 'Liberar Domínio' : authError}
                </span>
              </button>
              <button
                onClick={handleDismissError}
                className="text-slate-400 hover:text-white p-1 ml-1 rounded hover:bg-slate-800"
                title="Fechar e continuar usando no modo local"
                aria-label="Fechar aviso"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {user ? (
            <div className="flex items-center gap-1.5 sm:gap-3">
              {/* Foto ou Avatar */}
              <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-800/80 border border-slate-700 rounded-full py-0.5 px-1.5 sm:px-2">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Usuário'}
                    className="w-4 h-4 rounded-full object-cover shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <User className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                )}
                <span className="text-slate-200 font-medium text-[10px] sm:text-[11px] max-w-[70px] sm:max-w-[120px] truncate">
                  {user.displayName?.split(' ')[0] || user.email?.split('@')[0]}
                </span>
              </div>

              {onManualSync && (
                <button
                  onClick={onManualSync}
                  disabled={isSyncing}
                  id="btn-force-sync"
                  title="Sincronizar dados agora com a nuvem (Firebase)"
                  className="flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-slate-200 hover:text-emerald-300 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 px-1.5 sm:px-2 py-0.5 rounded transition-all disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
                  <span className="hidden sm:inline">{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
                </button>
              )}

              <button
                onClick={handleSwitchAccount}
                disabled={isLoggingIn}
                title="Escolher ou alternar para outra conta Google"
                className="flex items-center gap-1 text-[10px] sm:text-[11px] text-slate-300 hover:text-emerald-300 transition-colors py-0.5 px-1 rounded hover:bg-slate-800"
              >
                <UserPlus className="h-3 w-3" />
                <span className="hidden sm:inline">Trocar</span>
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1 text-[10px] sm:text-[11px] text-slate-300 hover:text-rose-400 transition-colors py-0.5 px-1 rounded hover:bg-slate-800"
              >
                <LogOut className="h-3 w-3" />
                <span>Sair</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              id="btn-cloud-login"
              title="Abre o seletor para você escolher qualquer conta Google"
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold py-1 px-2.5 rounded-md transition-all shadow-xs text-[11px] sm:text-xs cursor-pointer"
            >
              {isLoggingIn ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <LogIn className="h-3.5 w-3.5" />
              )}
              <span>Conectar Google</span>
            </button>
          )}
        </div>
      </div>

      {/* Modal / Dialog de Instruções para Domínio Não Autorizado */}
      {showDomainHelpModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-6 text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-base">
                <AlertCircle className="h-5 w-5" />
                <span>Liberar Domínio no Firebase Authentication</span>
              </div>
              <button
                onClick={handleDismissError}
                className="text-slate-400 hover:text-white p-1.5 rounded hover:bg-slate-800"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <p>
                O Google Firebase bloqueia logins por padrão até que o endereço de pré-visualização seja adicionado à lista de <strong>Domínios Autorizados</strong> do seu projeto Firebase.
              </p>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
                <div className="text-[11px] font-semibold text-slate-400">Domínio da aplicação para adicionar:</div>
                <div className="flex items-center justify-between gap-2 bg-slate-900 px-3 py-2 rounded font-mono text-emerald-400 text-xs border border-slate-800">
                  <span className="truncate select-all">{currentHostname}</span>
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-1 text-[11px] text-slate-200 hover:text-emerald-300 bg-slate-800 px-2.5 py-1 rounded cursor-pointer transition-colors shrink-0"
                  >
                    {copiedDomain ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedDomain ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2 pt-1 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                <div className="font-semibold text-slate-200">Passo a passo rápido (1 minuto):</div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-[11px]">
                  <li>
                    Abra a página direta:{' '}
                    <a
                      href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:underline inline-flex items-center gap-1 font-semibold"
                    >
                      Configurações de Autenticação no Firebase <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                  <li>Na seção <strong>Authorized domains (Domínios autorizados)</strong>, clique no botão <strong>Add domain (Adicionar domínio)</strong>.</li>
                  <li>Cole o domínio copiado: <code className="text-amber-300 font-mono bg-slate-900 px-1.5 py-0.5 rounded">{currentHostname}</code></li>
                  <li>Clique em <strong>Add (Salvar)</strong>. Em seguida, basta clicar novamente em "Escolher / Conectar Conta Google"!</li>
                </ol>
              </div>

              <p className="text-[11px] text-slate-400 italic">
                *Nota: Enquanto isso, todas as funcionalidades do RendimentoPro (simulador, produtos, despesas, cálculos e exportação) continuam funcionando perfeitamente em modo local no seu navegador.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={handleDismissError}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-lg text-xs transition-colors cursor-pointer"
              >
                Continuar em modo local
              </button>

              <button
                onClick={handleDismissError}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer"
              >
                Entendi, vou adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
