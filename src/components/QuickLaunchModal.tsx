import React, { useState } from 'react';
import { X, Rocket } from 'lucide-react';
import { InvestmentProduct, PlatformSettings, ProductTemplate } from '../types/investment';
import { 
  formatCurrency, 
  formatDateBR, 
  calculateProductMetrics, 
  getTodayString 
} from '../utils/calculations';

interface QuickLaunchModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: ProductTemplate | null;
  settings: PlatformSettings;
  onLaunch: (product: InvestmentProduct) => void;
  initialDate?: string;
}

export const QuickLaunchModal: React.FC<QuickLaunchModalProps> = ({
  isOpen,
  onClose,
  template,
  settings,
  onLaunch,
  initialDate,
}) => {
  const [startDate, setStartDate] = useState<string>(initialDate || getTodayString());
  const [status, setStatus] = useState<'active' | 'paused'>('active');
  const [customName, setCustomName] = useState<string>('');

  React.useEffect(() => {
    if (template) {
      setCustomName(template.name);
      setStartDate(initialDate || getTodayString());
      setStatus('active');
    }
  }, [template, isOpen, initialDate]);

  if (!isOpen || !template) return null;

  // Monta objeto temporário para cálculo das métricas
  const tempProduct: InvestmentProduct = {
    id: 'temp',
    name: customName || template.name,
    investedAmount: template.investedAmount,
    returnAmount: template.returnAmount,
    returnType: template.returnType || 'total',
    dailyPercentage: template.dailyPercentage,
    durationDays: template.durationDays,
    startDate,
    returnCapitalAtEnd: template.returnCapitalAtEnd,
    category: template.category || 'Robô / Arbitragem',
    status,
    notes: template.notes,
  };

  const metrics = calculateProductMetrics(tempProduct, settings);

  const handleConfirmLaunch = (e: React.FormEvent) => {
    e.preventDefault();
    const newProduct: InvestmentProduct = {
      id: `prod-${Date.now()}`,
      name: (customName.trim() || template.name),
      investedAmount: template.investedAmount,
      returnAmount: template.returnAmount,
      returnType: template.returnType || 'total',
      dailyPercentage: template.dailyPercentage,
      durationDays: template.durationDays,
      startDate,
      returnCapitalAtEnd: template.returnCapitalAtEnd,
      category: template.category || 'Robô / Arbitragem',
      status,
      notes: template.notes,
    };

    onLaunch(newProduct);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
              <Rocket className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-display">
                Ativar contrato do modelo
              </h2>
              <p className="text-xs text-slate-500">
                Lançamento rápido: selecione apenas a data de aquisição
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Resumo do Modelo Pré-Carregado */}
        <div className="bg-gradient-to-br from-slate-50 to-emerald-50/40 rounded-xl p-4 border border-emerald-100/80 mb-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-slate-900 font-display">
                {template.name}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
                {template.category || 'Robô / Arbitragem'}
              </span>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
              {template.dailyPercentage}% / dia
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-100/60 text-center">
            <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-2xs">
              <span className="text-[10px] text-slate-400 block font-medium">Aporte</span>
              <strong className="text-xs font-bold text-slate-900 block">
                {formatCurrency(template.investedAmount)}
              </strong>
            </div>
            <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-2xs">
              <span className="text-[10px] text-slate-400 block font-medium">Rendimento</span>
              <strong className="text-xs font-bold text-emerald-600 block">
                +{formatCurrency(metrics.dailyYield)}/dia
              </strong>
            </div>
            <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-2xs">
              <span className="text-[10px] text-slate-400 block font-medium">Duração</span>
              <strong className="text-xs font-bold text-slate-900 block">
                {template.durationDays} dias
              </strong>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <span>Retorno bruto: <strong className="text-blue-700">{formatCurrency(metrics.grossReturnAmount)}</strong></span>
            <span>Lucro Líquido: <strong className="text-teal-700">+{formatCurrency(metrics.netProfitAmount)}</strong></span>
          </div>
        </div>

        <form onSubmit={handleConfirmLaunch} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 tracking-normal mb-1">
              Data de aquisição / início do contrato *
            </label>
            <div className="relative">
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-semibold"
                autoFocus
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Vencimento previsto: <strong>{formatDateBR(metrics.endDate)}</strong> ({template.durationDays} dias)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 tracking-normal mb-1">
                Identificação / nome
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder={template.name}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 tracking-normal mb-1">
                Status inicial
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-white font-medium"
              >
                <option value="active">Ativo (rendendo)</option>
                <option value="paused">Pausado</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <Rocket className="h-4 w-4" />
              <span>Ativar Contrato Agora</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
