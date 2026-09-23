import React, { useEffect, useState } from 'react';
import { X, Wallet, ShieldCheck, Info, RotateCcw } from 'lucide-react';
import { PlatformSettings } from '../types/investment';
import { formatCurrency } from '../utils/calculations';
import { useModal } from '../hooks/useModal';

interface BalanceAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PlatformSettings;
  onSave: (settings: PlatformSettings) => void;
  today: string;
}

export const BalanceAdjustmentModal: React.FC<BalanceAdjustmentModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  today,
}) => {
  const [bankInjection, setBankInjection] = useState(0);
  const [protectionInjection, setProtectionInjection] = useState(0);
  const dialogRef = useModal(isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      setBankInjection(Number(settings.manualBankInjection ?? 0));
      setProtectionInjection(Number(settings.manualProtectionInjection ?? 0));
    }
  }, [isOpen, settings.manualBankInjection, settings.manualProtectionInjection]);

  if (!isOpen) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextBank = Math.max(0, Number(bankInjection) || 0);
    const nextProtection = Math.max(0, Number(protectionInjection) || 0);
    onSave({
      ...settings,
      manualBankInjection: nextBank,
      manualBankInjectionDate: nextBank > 0 ? today : undefined,
      manualProtectionInjection: nextProtection,
      manualProtectionInjectionDate: nextProtection > 0 ? today : undefined,
    });
    onClose();
  };

  const clearAdjustments = () => {
    setBankInjection(0);
    setProtectionInjection(0);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-3 sm:p-4 overflow-hidden">
      <div
        ref={dialogRef}
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="balance-adjustment-title"
      >
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h2 id="balance-adjustment-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
                Ajustar saldos do Roadmap
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Injete dinheiro externo para recalcular a projeção a partir de hoje.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/70 text-xs text-blue-800 dark:text-blue-200 flex items-start gap-2 leading-relaxed">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Estes valores representam dinheiro que você colocou por fora do fluxo de rendimentos.
              O ajuste passa a valer <strong>a partir do dia atual</strong> e continua presente nos próximos dias do Roadmap.
              Ele não é tratado como rendimento nem como aquisição automática.
            </span>
          </div>

          <label className="block">
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
              <Wallet className="h-4 w-4 text-emerald-500" />
              Saldo adicional disponível para investimento
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 block mt-1 mb-2">
              Dinheiro livre que poderá ser usado pelo Roadmap para novas aquisições ou despesas.
            </span>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">R$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={bankInjection}
                onChange={(e) => setBankInjection(Math.max(0, Number(e.target.value) || 0))}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-10 pr-3 py-2.5 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </label>

          <label className="block">
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
              <ShieldCheck className="h-4 w-4 text-blue-500" />
              Saldo adicional de blindagem
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 block mt-1 mb-2">
              Reserva já existente fora da plataforma, destinada à proteção e ao pagamento de despesas.
            </span>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">R$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={protectionInjection}
                onChange={(e) => setProtectionInjection(Math.max(0, Number(e.target.value) || 0))}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-10 pr-3 py-2.5 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </label>

          {(bankInjection > 0 || protectionInjection > 0) && (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/70 bg-emerald-50/70 dark:bg-emerald-950/30 p-3 text-xs text-emerald-800 dark:text-emerald-200">
              Ajuste atual: <strong>{formatCurrency(bankInjection)}</strong> livres + <strong>{formatCurrency(protectionInjection)}</strong> de blindagem.
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={clearAdjustments}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Zerar ajustes
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm cursor-pointer"
              >
                Aplicar e recalcular
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
