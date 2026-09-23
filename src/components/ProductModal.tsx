import React, { useState, useEffect, useMemo } from 'react';
import { X, Sparkles, Layers, BookmarkPlus, Check } from 'lucide-react';
import { InvestmentProduct, PlatformSettings, ProductTemplate } from '../types/investment';
import { 
  formatCurrency, 
  formatPercent, 
  calculateProductMetrics, 
  getTodayString 
} from '../utils/calculations';
import { createId } from '../utils/id';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: InvestmentProduct) => void;
  productToEdit?: InvestmentProduct | null;
  settings: PlatformSettings;
  initialDate?: string;
  templates?: ProductTemplate[];
  onSaveTemplate?: (template: ProductTemplate) => void;
  onOpenTemplatesManager?: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  onSave,
  productToEdit,
  settings,
  initialDate,
  templates = [],
  onSaveTemplate,
  onOpenTemplatesManager,
}) => {
  const [name, setName] = useState('');
  const [investedAmount, setInvestedAmount] = useState<number>(50);
  const [returnAmount, setReturnAmount] = useState<number>(160);
  const [returnType, setReturnType] = useState<'total' | 'daily'>('total');
  const [durationDays, setDurationDays] = useState<number>(16);
  const [startDate, setStartDate] = useState<string>(getTodayString());
  const [returnCapitalAtEnd, setReturnCapitalAtEnd] = useState<boolean>(false);
  const [category, setCategory] = useState<string>('Robô / Arbitragem');
  const [status, setStatus] = useState<'active' | 'completed' | 'paused'>('active');
  const [notes, setNotes] = useState('');
  const [saveAsTemplate, setSaveAsTemplate] = useState<boolean>(false);
  const [selectedTemplateName, setSelectedTemplateName] = useState<string | null>(null);

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      setInvestedAmount(productToEdit.investedAmount);
      setDurationDays(productToEdit.durationDays);
      setStartDate(productToEdit.startDate);
      setReturnCapitalAtEnd(productToEdit.returnCapitalAtEnd);
      setCategory(productToEdit.category || 'Geral');
      setStatus(productToEdit.status);
      setNotes(productToEdit.notes || '');
      setSelectedTemplateName(null);
      setSaveAsTemplate(false);

      const type = productToEdit.returnType || 'total';
      setReturnType(type);

      if (productToEdit.returnAmount !== undefined && productToEdit.returnAmount > 0) {
        setReturnAmount(productToEdit.returnAmount);
      } else {
        // Estima o retorno a partir da taxa diária e dias existentes
        const daily = productToEdit.investedAmount * (productToEdit.dailyPercentage / 100);
        const total = daily * productToEdit.durationDays;
        setReturnAmount(type === 'daily' ? Number(daily.toFixed(2)) : Number(total.toFixed(2)));
      }
    } else {
      // Se tiver templates cadastrados, pode usar o primeiro como padrão ou default limpo
      if (templates.length > 0) {
        const first = templates[0];
        setName(first.name);
        setInvestedAmount(first.investedAmount);
        setReturnType(first.returnType || 'total');
        setReturnAmount(first.returnAmount || 160);
        setDurationDays(first.durationDays);
        setStartDate(initialDate || getTodayString());
        setReturnCapitalAtEnd(first.returnCapitalAtEnd ?? false);
        setCategory(first.category || 'Robô / Arbitragem');
        setStatus('active');
        setNotes(first.notes || '');
        setSelectedTemplateName(first.name);
      } else {
        setName('NW4050');
        setInvestedAmount(50);
        setReturnType('total');
        setReturnAmount(160);
        setDurationDays(16);
        setStartDate(initialDate || getTodayString());
        setReturnCapitalAtEnd(false);
        setCategory('Robô / Arbitragem');
        setStatus('active');
        setNotes('');
        setSelectedTemplateName(null);
      }
      setSaveAsTemplate(false);
    }
  }, [productToEdit, isOpen, initialDate]);

  // Função para aplicar um modelo de template instantaneamente
  const handleApplyTemplate = (tpl: ProductTemplate) => {
    setName(tpl.name);
    setInvestedAmount(tpl.investedAmount);
    setDurationDays(tpl.durationDays);
    setReturnCapitalAtEnd(tpl.returnCapitalAtEnd ?? false);
    setCategory(tpl.category || 'Robô / Arbitragem');
    setNotes(tpl.notes || '');
    setSelectedTemplateName(tpl.name);

    const type = tpl.returnType || 'total';
    setReturnType(type);

    if (tpl.returnAmount !== undefined && tpl.returnAmount > 0) {
      setReturnAmount(tpl.returnAmount);
    } else {
      const daily = tpl.investedAmount * (tpl.dailyPercentage / 100);
      const total = daily * tpl.durationDays;
      setReturnAmount(type === 'daily' ? Number(daily.toFixed(2)) : Number(total.toFixed(2)));
    }
  };

  // Cálculos automáticos do rendimento a partir dos valores em R$
  const calculatedDailyYield = useMemo(() => {
    const duration = Math.max(1, Number(durationDays) || 1);
    const ret = Math.max(0, Number(returnAmount) || 0);
    if (returnType === 'daily') {
      return ret;
    }
    return ret / duration;
  }, [returnAmount, durationDays, returnType]);

  const calculatedTotalReturn = useMemo(() => {
    const duration = Math.max(1, Number(durationDays) || 1);
    const ret = Math.max(0, Number(returnAmount) || 0);
    if (returnType === 'daily') {
      return ret * duration;
    }
    return ret;
  }, [returnAmount, durationDays, returnType]);

  const calculatedDailyPercentage = useMemo(() => {
    const inv = Math.max(0.01, Number(investedAmount) || 1);
    return (calculatedDailyYield / inv) * 100;
  }, [calculatedDailyYield, investedAmount]);

  if (!isOpen) return null;

  // Objeto temporário para cálculo em tempo real
  const tempProduct: InvestmentProduct = {
    id: productToEdit?.id || 'temp',
    name: name || 'Novo produto',
    investedAmount: Number(investedAmount) || 0,
    returnAmount: Number(returnAmount) || 0,
    returnType,
    dailyPercentage: calculatedDailyPercentage,
    durationDays: Number(durationDays) || 1,
    startDate: startDate || getTodayString(),
    returnCapitalAtEnd,
    category,
    status,
    notes,
  };

  const previewMetrics = calculateProductMetrics(tempProduct, settings);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const product: InvestmentProduct = {
      id: productToEdit?.id || createId('prod'),
      name: name.trim(),
      investedAmount: Math.max(0.01, Number(investedAmount)),
      returnAmount: Math.max(0.01, Number(returnAmount)),
      returnType,
      dailyPercentage: Math.max(0.0001, calculatedDailyPercentage),
      durationDays: Math.max(1, Math.round(Number(durationDays))),
      startDate,
      returnCapitalAtEnd,
      category,
      status,
      notes: notes.trim(),
    };

    onSave(product);

    // Se o usuário marcou para salvar como novo template no catálogo
    if (saveAsTemplate && onSaveTemplate) {
      const newTemplate: ProductTemplate = {
        id: createId('tpl'),
        name: name.trim(),
        investedAmount: Math.max(0.01, Number(investedAmount)),
        returnAmount: Math.max(0.01, Number(returnAmount)),
        returnType,
        dailyPercentage: Math.max(0.0001, calculatedDailyPercentage),
        durationDays: Math.max(1, Math.round(Number(durationDays))),
        returnCapitalAtEnd,
        category,
        notes: notes.trim(),
      };
      onSaveTemplate(newTemplate);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 relative my-8 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-xl border border-emerald-100 dark:border-emerald-900/60">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-display">
                {productToEdit ? 'Editar Produto de Investimento' : 'Novo Produto de Investimento'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Selecione um modelo pré-salvo ou preencha os dados do contrato
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* SELETOR RÁPIDO DE MODELOS DO CATÁLOGO */}
        {!productToEdit && templates && templates.length > 0 && (
          <div className="mb-4 p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                <BookmarkPlus className="h-4 w-4 text-indigo-700 dark:text-indigo-400" />
                Preencher rápido a partir do catálogo:
              </span>
              {onOpenTemplatesManager && (
                <button
                  type="button"
                  onClick={onOpenTemplatesManager}
                  className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-200 hover:underline cursor-pointer"
                >
                  Gerenciar Catálogo ({templates.length})
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {templates.map((tpl) => {
                const isSelected = selectedTemplateName === tpl.name;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleApplyTemplate(tpl)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs scale-102 ring-2 ring-indigo-300 dark:ring-indigo-500'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-indigo-200/80 dark:border-slate-700 hover:bg-indigo-100/60 dark:hover:bg-slate-700 hover:text-indigo-900 dark:hover:text-white'
                    }`}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5" />}
                    <span>{tpl.name}</span>
                    <span className={`text-[10px] font-medium ${isSelected ? 'text-indigo-200' : 'text-slate-500 dark:text-slate-400'}`}>
                      ({formatCurrency(tpl.investedAmount)} • {tpl.durationDays}d)
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedTemplateName && (
              <p className="text-[11px] text-indigo-800 dark:text-indigo-300 pt-0.5">
                Modelo <strong>{selectedTemplateName}</strong> selecionado! Você só precisa conferir a <strong>Data de Início</strong> abaixo.
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome e Categoria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 tracking-normal mb-1">
                Nome do produto *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: NW4050, Robô VIP 1..."
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setSelectedTemplateName(null);
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 tracking-normal mb-1">
                Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
              >
                <option value="Robô / Arbitragem">Robô / Arbitragem</option>
                <option value="Cripto Ativos">Cripto Ativos</option>
                <option value="Renda Fixa / Seguro">Renda Fixa / Seguro</option>
                <option value="Fundo de Liquidez">Fundo de Liquidez</option>
                <option value="Aporte Especial">Aporte Especial</option>
                <option value="Outros">Outros</option>
              </select>
            </div>
          </div>

          {/* Valor Investido, Valor de Retorno e Duração */}
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <div className="flex items-center h-6 mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 tracking-normal">
                    Valor investido (R$) *
                  </label>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400 dark:text-slate-500">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0,00"
                    value={investedAmount === 0 ? '' : investedAmount}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = e.target.value;
                      setInvestedAmount(val === '' ? 0 : parseFloat(val));
                    }}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-bold"
                  />
                </div>
                {settings.minDepositAmount !== undefined && settings.minDepositAmount > 0 && investedAmount < settings.minDepositAmount && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 block">
                    Mínimo sugerido na plataforma: {formatCurrency(settings.minDepositAmount)}
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between h-6 mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 tracking-normal">
                    Retorno ({returnType === 'total' ? 'Total' : 'Diário'}) *
                  </label>
                  <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md text-[10px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => {
                        if (returnType !== 'total') {
                          setReturnType('total');
                          setReturnAmount(Number(calculatedTotalReturn.toFixed(2)));
                        }
                      }}
                      className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                        returnType === 'total' ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 font-bold shadow-2xs' : 'hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title="Valor total contratado"
                    >
                      Total
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (returnType !== 'daily') {
                          setReturnType('daily');
                          setReturnAmount(Number(calculatedDailyYield.toFixed(2)));
                        }
                      }}
                      className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                        returnType === 'daily' ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 font-bold shadow-2xs' : 'hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title="Valor pago a cada dia"
                    >
                      /Dia
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400 dark:text-slate-500">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder={returnType === 'total' ? 'Ex: 160.00' : 'Ex: 10.00'}
                    value={returnAmount === 0 ? '' : returnAmount}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = e.target.value;
                      setReturnAmount(val === '' ? 0 : parseFloat(val));
                    }}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-bold"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center h-6 mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 tracking-normal">
                    Duração (Dias) *
                  </label>
                </div>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="16"
                  value={durationDays === 0 ? '' : durationDays}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDurationDays(val === '' ? 0 : parseInt(val) || 1);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-bold"
                />
              </div>
            </div>

            {/* Faixa de equivalência perfeitamente alinhada */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 rounded-lg text-xs">
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Rendimento calculado:</span>
                <strong className="text-emerald-700 dark:text-emerald-400 font-bold">+{formatCurrency(calculatedDailyYield)}/dia</strong>
                <span className="text-slate-400 dark:text-slate-500 font-semibold">({calculatedDailyPercentage.toFixed(2).replace('.', ',')}% a.d.)</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Retorno do contrato: <strong className="text-slate-800 dark:text-slate-200 font-bold">{formatCurrency(calculatedTotalReturn)}</strong> em {durationDays} dias
              </div>
            </div>
          </div>

          {/* Data de Início e Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 tracking-normal mb-1">
                Data de aquisição / início *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-emerald-50/20 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 tracking-normal mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
              >
                <option value="active">Ativo (rendendo agora)</option>
                <option value="paused">Pausado</option>
                <option value="completed">Concluído / encerrado</option>
              </select>
            </div>
          </div>

          {/* Switch: Devolução de Capital no Fim */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between gap-3">
            <div className="pr-2">
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>Devolução do Capital no Fim do Prazo?</span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${returnCapitalAtEnd ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                  {returnCapitalAtEnd ? 'Sim (+ Capital Inicial)' : 'Não (Incluso no retorno)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {returnCapitalAtEnd 
                  ? `A plataforma devolverá os ${formatCurrency(investedAmount || 0)} investidos além dos rendimentos. Total a receber: ${formatCurrency(previewMetrics.grossReturnAmount)}.`
                  : `O valor de retorno (${formatCurrency(calculatedTotalReturn)}) já é o montante total final a receber ao término dos ${durationDays} dias.`
                }
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={returnCapitalAtEnd}
                onChange={(e) => setReturnCapitalAtEnd(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 dark:bg-slate-600 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* REAL-TIME SIMULATION BOX */}
          <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-slate-50 dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-slate-900 border border-emerald-200 dark:border-emerald-900/60 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-900 dark:text-emerald-300">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Cálculo em tempo real da plataforma
              </span>
              <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                Taxa de saque: {settings.withdrawalFeePercentage}%
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
              <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-emerald-100 dark:border-slate-700 shadow-2xs">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Rendimento diário</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 block">
                  +{formatCurrency(previewMetrics.dailyYield)}
                </span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 block font-medium mt-0.5">
                  ({calculatedDailyPercentage.toFixed(2).replace('.', ',')}% a.d.)
                </span>
              </div>

              <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-blue-100 dark:border-slate-700 shadow-2xs">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Retorno bruto</span>
                <span className="text-sm font-bold text-blue-700 dark:text-blue-400 block">
                  {formatCurrency(previewMetrics.grossReturnAmount)}
                </span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 block font-medium mt-0.5">
                  {previewMetrics.grossReturnPercentage.toFixed(1).replace('.', ',')}% do aporte
                </span>
              </div>

              <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-teal-100 dark:border-slate-700 shadow-2xs">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Lucro líquido real</span>
                <span className="text-sm font-bold text-teal-700 dark:text-teal-400 block">
                  {previewMetrics.netProfitAmount >= 0 ? '+' : ''}{formatCurrency(previewMetrics.netProfitAmount)}
                </span>
                <span className="text-[9px] text-teal-600 dark:text-teal-400 block font-semibold mt-0.5">
                  {formatPercent(previewMetrics.netProfitPercentage, 1)}
                </span>
              </div>

              <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Payback (Retorno)</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block">
                  {previewMetrics.paybackDays} dias
                </span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 block font-medium mt-0.5">
                  para cobrir aporte
                </span>
              </div>
            </div>
          </div>

          {/* Opção para Salvar como Modelo no Catálogo */}
          {!productToEdit && onSaveTemplate && (
            <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200 block flex items-center gap-1.5">
                  <BookmarkPlus className="h-4 w-4 text-indigo-700 dark:text-indigo-400" />
                  Salvar também como Modelo no Catálogo?
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Ficará salvo para ativar novos ciclos com 1 clique alterando só a data
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveAsTemplate}
                  onChange={(e) => setSaveAsTemplate(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-300 dark:bg-slate-600 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          )}

          {/* Observações */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 tracking-normal mb-1">
              Notas ou condições especiais
            </label>
            <input
              type="text"
              placeholder="Ex: Saque liberado a cada 15 dias, bônus de indicação..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="h-4 w-4" />
              <span>{productToEdit ? 'Salvar Alterações' : 'Adicionar e Ativar Produto'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
