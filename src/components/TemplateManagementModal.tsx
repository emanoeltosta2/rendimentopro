import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Edit3, 
  Rocket, 
  BookmarkPlus
} from 'lucide-react';
import { ProductTemplate, PlatformSettings, InvestmentProduct } from '../types/investment';
import { 
  formatCurrency, 
  calculateProductMetrics, 
  getTodayString ,
  formatPercentBR,
} from '../utils/calculations';
import { createId } from '../utils/id';

interface TemplateManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: ProductTemplate[];
  settings: PlatformSettings;
  onSaveTemplate: (template: ProductTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
  onQuickLaunchTemplate: (template: ProductTemplate) => void;
}

export const TemplateManagementModal: React.FC<TemplateManagementModalProps> = ({
  isOpen,
  onClose,
  templates,
  settings,
  onSaveTemplate,
  onDeleteTemplate,
  onQuickLaunchTemplate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form states for creating/editing a template
  const [name, setName] = useState('');
  const [investedAmount, setInvestedAmount] = useState<number>(50);
  const [returnAmount, setReturnAmount] = useState<number>(160);
  const [returnType, setReturnType] = useState<'total' | 'daily'>('total');
  const [durationDays, setDurationDays] = useState<number>(16);
  const [returnCapitalAtEnd, setReturnCapitalAtEnd] = useState<boolean>(false);
  const [category, setCategory] = useState<string>('Robô / Arbitragem');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleOpenNewForm = () => {
    setEditingTemplateId(null);
    setName('');
    setInvestedAmount(50);
    setReturnAmount(160);
    setReturnType('total');
    setDurationDays(16);
    setReturnCapitalAtEnd(false);
    setCategory('Robô / Arbitragem');
    setNotes('');
    setIsEditing(true);
  };

  const handleOpenEditForm = (tpl: ProductTemplate) => {
    setEditingTemplateId(tpl.id);
    setName(tpl.name);
    setInvestedAmount(tpl.investedAmount);
    setReturnAmount(tpl.returnAmount || (tpl.investedAmount * (tpl.dailyPercentage / 100) * tpl.durationDays));
    setReturnType(tpl.returnType || 'total');
    setDurationDays(tpl.durationDays);
    setReturnCapitalAtEnd(tpl.returnCapitalAtEnd ?? false);
    setCategory(tpl.category || 'Robô / Arbitragem');
    setNotes(tpl.notes || '');
    setIsEditing(true);
  };

  // Cálculo das taxas
  const calculatedDailyYield = returnType === 'daily'
    ? returnAmount
    : (returnAmount / Math.max(1, durationDays));

  const calculatedDailyPercentage = investedAmount > 0
    ? (calculatedDailyYield / investedAmount) * 100
    : 0;

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const tpl: ProductTemplate = {
      id: editingTemplateId || createId('tpl'),
      name: name.trim(),
      investedAmount: Math.max(0.01, Number(investedAmount)),
      returnAmount: Math.max(0.01, Number(returnAmount)),
      returnType,
      dailyPercentage: Math.max(0.001, calculatedDailyPercentage),
      durationDays: Math.max(1, Math.round(Number(durationDays))),
      returnCapitalAtEnd,
      category,
      notes: notes.trim(),
    };

    onSaveTemplate(tpl);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 relative my-8 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 rounded-xl">
              <BookmarkPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-display">
                Catálogo de modelos de produtos
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cadastre seus planos frequentes para ativar novos contratos com apenas 1 clique
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {!isEditing ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 tracking-normal">
                  Modelos Salvos ({templates.length})
                </span>
                <button
                  onClick={handleOpenNewForm}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Cadastrar novo modelo</span>
                </button>
              </div>

              {templates.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/60 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                    Você ainda não possui modelos salvos no catálogo.
                  </p>
                  <button
                    onClick={handleOpenNewForm}
                    className="px-3.5 py-2 bg-indigo-600 dark:bg-indigo-700 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600"
                  >
                    Criar primeiro modelo
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {templates.map((tpl) => {
                    const tempProduct: InvestmentProduct = {
                      id: tpl.id,
                      name: tpl.name,
                      investedAmount: tpl.investedAmount,
                      returnAmount: tpl.returnAmount,
                      returnType: tpl.returnType || 'total',
                      dailyPercentage: tpl.dailyPercentage,
                      durationDays: tpl.durationDays,
                      startDate: getTodayString(),
                      returnCapitalAtEnd: tpl.returnCapitalAtEnd,
                      category: tpl.category || 'Robô / Arbitragem',
                      status: 'active',
                    };
                    const metrics = calculateProductMetrics(tempProduct, settings);

                    return (
                      <div
                        key={tpl.id}
                        className="bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 rounded-xl p-4 transition-all shadow-2xs flex flex-col justify-between group"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-base text-slate-900 dark:text-slate-100 font-display">
                                  {tpl.name}
                                </h4>
                                <span className="text-[10px] font-semibold px-2 py-0.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-md border border-slate-200 dark:border-slate-700">
                                  {tpl.category || 'Geral'}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                                Duração de <strong>{tpl.durationDays} dias</strong>
                              </span>
                            </div>

                            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                              <button
                                onClick={() => {
                                  setConfirmDeleteId(null);
                                  handleOpenEditForm(tpl);
                                }}
                                title="Editar modelo"
                                className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-900 rounded transition-colors"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(confirmDeleteId === tpl.id ? null : tpl.id)}
                                title="Excluir modelo"
                                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {/* Faixa de confirmação de exclusão inline */}
                          {confirmDeleteId === tpl.id && (
                            <div className="mb-3 p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-lg animate-in fade-in duration-100">
                              <p className="text-xs text-rose-800 dark:text-rose-300 font-bold mb-2">
                                Excluir "{tpl.name}" do catálogo?
                              </p>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteTemplate(tpl.id);
                                    setConfirmDeleteId(null);
                                  }}
                                  className="px-3 py-1 bg-rose-600 hover:bg-rose-700 dark:bg-rose-700 dark:hover:bg-rose-600 text-white text-xs font-bold rounded-md shadow-2xs transition-colors"
                                >
                                  Sim, excluir
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 transition-colors"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2 my-2.5">
                            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-700">
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-semibold">
                                Aporte
                              </span>
                              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                {formatCurrency(tpl.investedAmount)}
                              </span>
                            </div>

                            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/50">
                              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block font-semibold">
                                Rendimento diário
                              </span>
                              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                +{formatCurrency(metrics.dailyYield)}
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal"> ({tpl.dailyPercentage}%)</span>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 px-1 py-1">
                            <span>Retorno: <strong className="text-blue-700 dark:text-blue-400">{formatCurrency(metrics.grossReturnAmount)}</strong></span>
                            <span>Lucro Real: <strong className="text-teal-700 dark:text-teal-400">+{formatCurrency(metrics.netProfitAmount)}</strong></span>
                          </div>
                        </div>

                        {/* Botão de Ativação Rápida */}
                        <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-700 flex items-center justify-end">
                          <button
                            onClick={() => {
                              onQuickLaunchTemplate(tpl);
                            }}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                          >
                            <Rocket className="h-3.5 w-3.5" />
                            <span>Ativar este contrato</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            /* Formulário de Criação/Edição de Modelo */
            <form onSubmit={handleSaveForm} className="space-y-4">
              <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl text-xs text-indigo-900 dark:text-indigo-300 flex items-center justify-between">
                <span>
                  <strong>{editingTemplateId ? 'Editar Modelo' : 'Novo Modelo de Produto'}</strong>: preencha os dados uma única vez para reutilizar quando quiser.
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="text-xs text-indigo-700 dark:text-indigo-400 font-bold hover:underline"
                >
                  Voltar para lista
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 tracking-normal mb-1">
                    Nome do produto / código *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: NW4050, NW354, Robô Trader..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-semibold"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 tracking-normal mb-1">
                    Categoria
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 tracking-normal mb-1">
                    Capital investido (R$) *
                  </label>
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
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 tracking-normal">
                      Retorno ({returnType === 'total' ? 'Total' : 'Diário'}) *
                    </label>
                    <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded text-[10px]">
                      <button
                        type="button"
                        onClick={() => setReturnType('total')}
                        className={`px-1.5 py-0.2 rounded font-semibold ${returnType === 'total' ? 'bg-white dark:bg-slate-950 shadow-2xs text-indigo-700 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}
                      >
                        Total
                      </button>
                      <button
                        type="button"
                        onClick={() => setReturnType('daily')}
                        className={`px-1.5 py-0.2 rounded font-semibold ${returnType === 'daily' ? 'bg-white dark:bg-slate-950 shadow-2xs text-indigo-700 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}
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
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 tracking-normal mb-1">
                    Duração (Dias) *
                  </label>
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
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-bold"
                  />
                </div>
              </div>

              {/* Faixa com resumo do cálculo */}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-lg flex items-center justify-between text-xs">
                <div className="text-emerald-950 dark:text-emerald-300">
                  Rendimento Diário Calculado: <strong>+{formatCurrency(calculatedDailyYield)}/dia</strong> ({formatPercentBR(calculatedDailyPercentage, 2)})
                </div>
                <div className="text-emerald-800 dark:text-emerald-400">
                  Total em {durationDays} dias: <strong>{formatCurrency(returnType === 'daily' ? returnAmount * durationDays : returnAmount)}</strong>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Devolve o capital investido no final?</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {returnCapitalAtEnd ? 'Devolverá o valor investido além dos rendimentos' : 'Capital já incluso no retorno acumulado'}
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={returnCapitalAtEnd}
                    onChange={(e) => setReturnCapitalAtEnd(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 tracking-normal mb-1">
                  Observações do modelo
                </label>
                <input
                  type="text"
                  placeholder="Ex: Robô de alta liquidez..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                {editingTemplateId ? (
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteTemplate(editingTemplateId);
                      setIsEditing(false);
                      setEditingTemplateId(null);
                    }}
                    className="px-3.5 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Excluir Este Modelo</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
                  >
                    Salvar modelo no catálogo
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0">
          <span>Você também pode salvar novos modelos direto da tela de cadastro de produto.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
