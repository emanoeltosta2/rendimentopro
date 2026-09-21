import React, { useState } from 'react';
import { Target, RefreshCw, X, Sparkles } from 'lucide-react';
import { formatCurrency, getTodayString, formatDateBR } from '../utils/calculations';

interface ResetGoalCycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGoalAmount: number;
  currentStartDate?: string;
  onConfirmReset: (newGoalAmount: number, newStartDate: string) => void;
}

export const ResetGoalCycleModal: React.FC<ResetGoalCycleModalProps> = ({
  isOpen,
  onClose,
  currentGoalAmount,
  currentStartDate,
  onConfirmReset,
}) => {
  const [goalAmount, setGoalAmount] = useState<number>(currentGoalAmount || 100);
  const [startDate, setStartDate] = useState<string>(getTodayString());

  if (!isOpen) return null;

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (goalAmount <= 0) return;
    onConfirmReset(goalAmount, startDate);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-all"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl">
            <Target className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 font-display">
              Estabelecer nova meta / resetar ciclo
            </h3>
            <p className="text-xs text-slate-500">
              Reinicie o ciclo de acompanhamento de novos investimentos
            </p>
          </div>
        </div>

        <form onSubmit={handleReset} className="space-y-4 text-xs">
          <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3 text-slate-700 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-900">
              <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Acompanhamento de Novos investimentos</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Ao reiniciar o ciclo, a data de início da jornada passará a ser <strong>{formatDateBR(startDate)}</strong>. 
              Produtos ativados após essa data serão contabilizados destacadamente como <strong>Novos investimentos</strong> do ciclo.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nova meta diária de rendimento (R$/dia)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-bold">R$</span>
              <input
                type="number"
                step="1"
                min="1"
                value={goalAmount}
                onChange={(e) => setGoalAmount(Number(e.target.value))}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
                required
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Meta atual: {formatCurrency(currentGoalAmount)}/dia
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Data de início do novo ciclo
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              required
            />
            {currentStartDate && (
              <p className="text-[11px] text-slate-400 mt-1">
                Ciclo anterior iniciado em: {formatDateBR(currentStartDate)}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Confirmar e Resetar Ciclo</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
