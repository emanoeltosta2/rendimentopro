import React, { useState, useEffect } from 'react';
import { 
  X, 
  Settings, 
  Download, 
  Upload, 
  RotateCcw, 
  Cloud,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Sun,
  Moon,
  Laptop
} from 'lucide-react';
import { PlatformSettings } from '../types/investment';
import { exportDataAsJSON, importDataFromJSON } from '../utils/storage';
import { useAuth } from '../services/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { PWAInstallButton } from './PWAInstallButton';
import { useModal } from '../hooks/useModal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PlatformSettings;
  onSaveSettings: (settings: PlatformSettings) => void;
  onResetData: () => void;
  onDataImported: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onResetData,
  onDataImported,
}) => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [withdrawalFeePercentage, setWithdrawalFeePercentage] = useState<number>(settings.withdrawalFeePercentage);
  const [fixedWithdrawalFee, setFixedWithdrawalFee] = useState<number>(settings.fixedWithdrawalFee);
  const [dailyGoalAmount, setDailyGoalAmount] = useState<number>(settings.dailyGoalAmount);
  const [reinvestmentBufferPercentage, setReinvestmentBufferPercentage] = useState<number>(settings.reinvestmentBufferPercentage ?? 10);
  const [dynamicBufferEnabled, setDynamicBufferEnabled] = useState<boolean>(settings.dynamicBufferEnabled ?? true);
  const normalizeProfile = (p?: string): 'conservative' | 'balanced' | 'accelerated' | 'aggressive' => {
    if (p === 'conservative' || p === 'aggressive' || p === 'accelerated') return p;
    return 'balanced';
  };

  const [protectionProfile, setProtectionProfile] = useState<'conservative' | 'balanced' | 'accelerated' | 'aggressive'>(normalizeProfile(settings.protectionProfile));
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const dialogRef = useModal(isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      setWithdrawalFeePercentage(settings.withdrawalFeePercentage);
      setFixedWithdrawalFee(settings.fixedWithdrawalFee);
      setDailyGoalAmount(settings.dailyGoalAmount);
      setReinvestmentBufferPercentage(settings.reinvestmentBufferPercentage ?? 10);
      setDynamicBufferEnabled(settings.dynamicBufferEnabled ?? true);
      setProtectionProfile(normalizeProfile(settings.protectionProfile));
      setImportStatus(null);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      ...settings,
      withdrawalFeePercentage,
      fixedWithdrawalFee,
      dailyGoalAmount,
      reinvestmentBufferPercentage,
      dynamicBufferEnabled,
      protectionProfile,
      roadmapStartDate: settings.roadmapStartDate ?? settings.goalCycleStartDate,
      goalCycleStartDate: settings.goalCycleStartDate ?? settings.roadmapStartDate,
      completedRoadmapDays: settings.completedRoadmapDays,
    });
    onClose();
  };

  const handleExportJSON = () => {
    exportDataAsJSON();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const success = importDataFromJSON(text);
      if (success) {
        setImportStatus('Dados importados com sucesso! Atualizando tela...');
        setTimeout(() => {
          onDataImported();
          onClose();
        }, 1000);
      } else {
        setImportStatus('Erro ao importar: Formato de arquivo JSON inválido');
      }
    } catch {
      setImportStatus('Erro ao ler o arquivo de importação.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 overflow-hidden">
      <div 
        ref={dialogRef}
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full max-h-[92vh] sm:max-h-[90vh] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
      >
        
        {/* Header Fixo */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h2 id="settings-modal-title" className="text-base font-bold text-slate-900 dark:text-slate-100 font-display">
                Configurações & Preferências
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ajuste taxas, perfis de proteção, tema e aplicativo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Fechar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Formulário com Scroll Interno */}
        <form 
          id="settings-form"
          onSubmit={handleSubmit} 
          className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 text-slate-900 dark:text-slate-100"
        >
          {/* Instalação do Aplicativo (PWA) */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 tracking-normal block">
              Aplicativo Web Progressivo (PWA)
            </span>
            <PWAInstallButton variant="settings" />
          </div>

          {/* Seletor de Tema Visual */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 tracking-normal mb-2">
              Aparência e Tema Visual
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                  theme === 'light'
                    ? 'bg-white dark:bg-slate-700 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-xs'
                    : 'bg-slate-100/80 dark:bg-slate-800 border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-700'
                }`}
              >
                <Sun className="h-4 w-4 text-amber-500" />
                <span>Claro</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                  theme === 'dark'
                    ? 'bg-white dark:bg-slate-700 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-xs'
                    : 'bg-slate-100/80 dark:bg-slate-800 border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-700'
                }`}
              >
                <Moon className="h-4 w-4 text-indigo-400" />
                <span>Escuro</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('system')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                  theme === 'system'
                    ? 'bg-white dark:bg-slate-700 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-xs'
                    : 'bg-slate-100/80 dark:bg-slate-800 border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-700'
                }`}
              >
                <Laptop className="h-4 w-4 text-slate-400" />
                <span>Sistema</span>
              </button>
            </div>
          </div>

          {/* Taxa por Saque */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 tracking-normal mb-1">
                Taxa de saque (%) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  required
                  placeholder="0"
                  value={withdrawalFeePercentage === 0 ? '' : withdrawalFeePercentage}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const val = e.target.value;
                    setWithdrawalFeePercentage(val === '' ? 0 : parseFloat(val));
                  }}
                  className="w-full pl-3 pr-8 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-semibold focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                />
                <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">%</span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                Cobrada pela plataforma ao retirar rendimentos
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 tracking-normal mb-1">
                Taxa fixa por saque (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={fixedWithdrawalFee === 0 ? '' : fixedWithdrawalFee}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFixedWithdrawalFee(val === '' ? 0 : parseFloat(val));
                  }}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-semibold focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                />
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                Custo fixo por transação de saque (se houver)
              </span>
            </div>
          </div>

          {/* Meta Diária Pretendida */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 tracking-normal mb-1">
              Meta diária pretendida (R$) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">R$</span>
              <input
                type="number"
                step="1"
                min="1"
                required
                placeholder="150"
                value={dailyGoalAmount === 0 ? '' : dailyGoalAmount}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const val = e.target.value;
                  setDailyGoalAmount(val === '' ? 0 : parseFloat(val));
                }}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-bold text-emerald-700 dark:text-emerald-400 focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              />
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
              Usada para calcular o progresso da sua independência financeira no topo do app.
            </span>
          </div>

          {/* Buffer de Segurança e Reinvestimento */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 rounded-lg">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 tracking-normal block">
                    Proteção de Capital no Reinvestimento
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    Define como o saldo disponível é protegido contra volatilidade ou retenção em novos contratos
                  </span>
                </div>
              </div>
            </div>

            {/* Alternador Dinâmico vs Fixo */}
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                  Buffer Dinâmico Inteligente
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                  Ajusta automaticamente a reserva de segurança com base na proximidade das despesas
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={dynamicBufferEnabled}
                  onChange={(e) => setDynamicBufferEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Perfil de Proteção Dinâmica */}
            {dynamicBufferEnabled ? (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Perfil de Alocação e Risco
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setProtectionProfile('conservative')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      protectionProfile === 'conservative'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-200 shadow-xs'
                        : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <span className="text-xs font-bold block">Conservador</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      Reserva ~15% a 25% para máxima liquidez.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setProtectionProfile('balanced')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      protectionProfile === 'balanced'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-200 shadow-xs'
                        : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold">Equilibrado</span>
                      <Sparkles className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      Reserva ~5% a 15% conforme vencimentos.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setProtectionProfile('accelerated')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      protectionProfile === 'accelerated'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-200 shadow-xs'
                        : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <span className="text-xs font-bold block">Acelerado</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      Reinvestimento máximo (~0% a 5% retido).
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Buffer Fixo de Retenção
                  </label>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    {reinvestmentBufferPercentage}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  step="5"
                  value={reinvestmentBufferPercentage}
                  onChange={(e) => setReinvestmentBufferPercentage(parseInt(e.target.value) || 0)}
                  className="w-full accent-slate-600 dark:accent-emerald-500 cursor-pointer"
                />
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                  Percentual fixo retido todos os dias sem ajustes dinâmicos automáticos.
                </span>
              </div>
            )}
          </div>

          {/* Nuvem e Sincronização */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 tracking-normal block mb-2">
              Sincronização na nuvem (Firebase)
            </span>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Cloud className={`h-5 w-5 ${user ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                <div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {user ? 'Conectado à Nuvem' : 'Armazenamento Apenas Local'}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {user
                      ? `Sincronizando com a conta: ${user.email}`
                      : 'Faça login na barra superior para sincronizar entre celular e PC.'}
                  </div>
                </div>
              </div>
              {user && (
                <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Ativo
                </span>
              )}
            </div>
          </div>

          {/* Backup e Gestão de Dados */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 tracking-normal block">
              Backup manual em arquivo
            </span>

            {importStatus && (
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-medium">
                {importStatus}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleExportJSON}
                className="py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Exportar Backup (JSON)</span>
              </button>

              <label className="py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center">
                <Upload className="h-3.5 w-3.5" />
                <span>Importar Backup</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={onResetData}
              className="w-full py-2 text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Restaurar Dados Padrão de Exemplo</span>
            </button>
          </div>
        </form>

        {/* Footer Fixo Sempre Visível */}
        <div className="flex items-center justify-end gap-3 px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-900/95 shrink-0 backdrop-blur-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-200/70 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="settings-form"
            className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            Salvar configurações
          </button>
        </div>

      </div>
    </div>
  );
};
