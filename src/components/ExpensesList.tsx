import React, { useState, useMemo } from 'react';
import { 
  Receipt, 
  PlusCircle, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Check, 
  Edit3, 
  Trash2, 
  Layers
} from 'lucide-react';
import { Expense, InvestmentProduct, PlatformSettings } from '../types/investment';
import { 
  formatCurrency, 
  formatDateBR, 
  calculateBestPaymentDay, 
  calculateAllExpensesOptimizations,
  sortExpensesBySmartPriority,
  isProductActiveOnDate,
  diffInDays, 
  getTodayString ,
  formatNumberBR,
} from '../utils/calculations';

interface ExpensesListProps {
  expenses: Expense[];
  products: InvestmentProduct[];
  settings: PlatformSettings;
  onOpenNewExpense: () => void;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => void;
  onDeleteExpenseGroup?: (groupId: string) => void;
  onTogglePaid: (expenseId: string) => void;
}

export const ExpensesList: React.FC<ExpensesListProps> = ({
  expenses,
  products,
  settings,
  onOpenNewExpense,
  onEditExpense,
  onDeleteExpense,
  onDeleteExpenseGroup,
  onTogglePaid,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('pending');
  const [deleteConfirmExpense, setDeleteConfirmExpense] = useState<Expense | null>(null);
  const todayStr = getTodayString();
  const feeRate = settings.withdrawalFeePercentage / 100;
  const currentDailyGross = products
    .filter((p) => isProductActiveOnDate(p, todayStr))
    .reduce((sum, p) => sum + p.investedAmount * (p.dailyPercentage / 100), 0);
  const currentDailyNet = currentDailyGross * (1 - feeRate);

  const filteredExpenses = sortExpensesBySmartPriority(
    expenses.filter((e) => {
      if (filter === 'pending') return !e.isPaid;
      if (filter === 'paid') return e.isPaid;
      return true;
    }),
    todayStr,
    currentDailyNet
  );

  const totalPendingAmount = expenses
    .filter((e) => !e.isPaid)
    .reduce((sum, e) => sum + e.amount, 0);

  const totalPaidAmount = expenses
    .filter((e) => e.isPaid)
    .reduce((sum, e) => sum + e.amount, 0);

  /**
   * CORREÇÃO: `calculateAllExpensesOptimizations` é O(365 x produtos) e estava
   * sendo executada no corpo do render, a cada re-render. Pior: o fallback
   * `|| calculateBestPaymentDay(...)` dispara para toda despesa já paga (o mapa
   * só contém pendentes) e recalcula a projeção inteira — 30 despesas pagas
   * equivaliam a 30 projeções completas por render.
   */
  const optimizationsMap = useMemo(
    () => calculateAllExpensesOptimizations(expenses, products, settings, todayStr),
    [expenses, products, settings, todayStr]
  );

  const getOptimization = (expense: Expense) => {
    const cached = optimizationsMap.get(expense.id);
    if (cached) return cached;
    // Despesa já quitada: não há melhor dia a calcular.
    if (expense.isPaid) {
      return calculateBestPaymentDay(expense, [], settings, todayStr);
    }
    return calculateBestPaymentDay(expense, products, settings, todayStr, expenses);
  };

  return (
    <div className="space-y-6">
      {/* Header & KPI Overview */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Receipt className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold font-display text-slate-900 dark:text-slate-100">
              Despesas e melhor dia para pagamento
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Nosso algoritmo calcula a data ideal para pagar cada conta usando os rendimentos diários, preservando seu capital investido e mantendo sua meta de crescimento ativa.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Filter toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs border border-slate-200/60 dark:border-slate-700">
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                filter === 'pending' 
                  ? 'bg-white dark:bg-slate-900 text-amber-800 dark:text-amber-300 shadow-2xs font-bold' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Pendentes ({expenses.filter(e => !e.isPaid).length})
            </button>
            <button
              onClick={() => setFilter('paid')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                filter === 'paid' 
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs font-bold' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Pagas ({expenses.filter(e => e.isPaid).length})
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                filter === 'all' 
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs font-semibold' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Todas
            </button>
          </div>

          <button
            onClick={onOpenNewExpense}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Nova despesa</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold tracking-normal block">
            Total a pagar (Pendente)
          </span>
          <div className="text-xl font-bold font-display text-slate-900 dark:text-slate-100 mt-1">
            {formatCurrency(totalPendingAmount)}
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 block">
            {expenses.filter(e => !e.isPaid).length} despesa(s) aguardando
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold tracking-normal block">
            Total já quitado
          </span>
          <div className="text-xl font-bold font-display text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(totalPaidAmount)}
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 block">
            Pagas sem retirar do capital investido
          </span>
        </div>

        <div className="p-4 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/80 dark:border-emerald-900/50 shadow-2xs">
          <span className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold tracking-normal block">
            Estratégia de otimização de ganhos
          </span>
          <div className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
            Contas com vencimento a <strong>mais de 15 dias</strong> não são antecipadas precocemente para permitir o <strong>reinvestimento e juros compostos</strong>, encurtando o tempo até sua meta.
          </div>
        </div>
      </div>

      {/* Expenses Cards */}
      {filteredExpenses.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center">
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-3">
            <Receipt className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Nenhuma despesa nesta lista</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            Adicione suas despesas recorrentes ou faturas para ver o cálculo do melhor dia de pagamento.
          </p>
          <button
            onClick={onOpenNewExpense}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
          >
            Cadastrar nova despesa
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {(() => {
            return filteredExpenses.map((expense) => {
              const opt = getOptimization(expense);
              const hasDueDate = Boolean(expense.dueDate && expense.dueDate.trim());
              const daysLeft = hasDueDate ? diffInDays(todayStr, expense.dueDate!) : 0;

            return (
              <div
                key={expense.id}
                className={`bg-white dark:bg-slate-900 rounded-xl border transition-all shadow-xs overflow-hidden ${
                  expense.isPaid
                    ? 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 opacity-75'
                    : opt.safetyLevel === 'safe'
                    ? 'border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700'
                    : opt.safetyLevel === 'tight'
                    ? 'border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-700'
                    : 'border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/20'
                }`}
              >
                <div className="p-5">
                  {/* Top Bar of Expense */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => onTogglePaid(expense.id)}
                        title={expense.isPaid ? 'Marcar como não paga' : 'Marcar como paga'}
                        className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                          expense.isPaid
                            ? 'bg-emerald-600 text-white'
                            : 'border-2 border-slate-300 dark:border-slate-700 text-transparent hover:border-emerald-500 hover:text-emerald-500'
                        }`}
                      >
                        <Check className="h-4 w-4 stroke-[3]" />
                      </button>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className={`font-bold text-base ${expense.isPaid ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}>
                            {expense.title}
                          </h3>
                          {expense.installmentNumber && expense.totalInstallments && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-md flex items-center gap-1">
                              <Layers className="h-3 w-3" />
                              Parcela {expense.installmentNumber}/{expense.totalInstallments}
                            </span>
                          )}
                          <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md">
                            {expense.category}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
                          {hasDueDate ? (
                            <>
                              <span>Vencimento: <strong className="text-slate-800 dark:text-slate-200">{formatDateBR(expense.dueDate!)}</strong></span>
                              <span>•</span>
                              <span>
                                {daysLeft > 0 ? (
                                  <span className="text-slate-600 dark:text-slate-400">{daysLeft} dias restantes</span>
                                ) : daysLeft === 0 ? (
                                  <span className="text-amber-700 dark:text-amber-400 font-bold">Vence hoje!</span>
                                ) : (
                                  <span className="text-rose-600 dark:text-rose-400 font-bold">Venceu há {Math.abs(daysLeft)} dias</span>
                                )}
                              </span>
                            </>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200/70 dark:border-amber-800 px-2 py-0.5 rounded-md text-[11px]">
                              <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                              Sem data de vencimento fixa
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block">
                          Valor da despesa
                        </span>
                        <div className="text-xl font-bold font-display text-slate-900 dark:text-slate-100">
                          {formatCurrency(expense.amount)}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 border-l border-slate-100 dark:border-slate-800 pl-3">
                        <button
                          onClick={() => onEditExpense(expense)}
                          className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (expense.installmentGroupId && onDeleteExpenseGroup) {
                              setDeleteConfirmExpense(expense);
                            } else {
                              onDeleteExpense(expense.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-md hover:bg-rose-50 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Recommendation Card */}
                  {!expense.isPaid ? (
                    <div className={`p-4 rounded-xl border space-y-3 ${
                      opt.safetyLevel === 'safe'
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60'
                        : opt.safetyLevel === 'tight'
                        ? 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60'
                        : 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
                    }`}>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <Sparkles className={`h-4 w-4 ${
                              opt.safetyLevel === 'safe' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                            }`} />
                            <span className="text-xs font-bold tracking-normal text-slate-800 dark:text-slate-200">
                              Melhor dia recomendado para pagamento:
                            </span>
                            <span className={`text-sm font-extrabold px-2.5 py-0.5 rounded-lg font-display ${
                              opt.safetyLevel === 'safe'
                                ? 'bg-emerald-600 text-white'
                                : opt.safetyLevel === 'tight'
                                ? 'bg-amber-600 text-white'
                                : 'bg-rose-600 text-white'
                            }`}>
                              {opt.bestDateFormatted}
                            </span>
                            {hasDueDate && daysLeft > 15 ? (
                              <span className="text-[11px] font-semibold text-indigo-800 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800 px-2 py-0.5 rounded-md">
                                Janela ideal (&le; 15d) • Mantendo Rendimentos
                              </span>
                            ) : opt.daysBeforeDue > 0 ? (
                              <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md">
                                Antecipa {opt.daysBeforeDue} dias
                              </span>
                            ) : null}
                          </div>

                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed mt-2">
                            {opt.reasoning}
                          </p>
                        </div>

                        {/* Breakdown Metrics */}
                        <div className="flex items-center gap-3 bg-white/80 dark:bg-slate-900/90 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800 shrink-0 text-center text-xs">
                          <div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Saque c/ taxa</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {formatCurrency(opt.requiredAmountWithFee)}
                            </span>
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 block">taxa: {formatCurrency(opt.withdrawalFee)}</span>
                          </div>
                          <div className="w-[1px] h-7 bg-slate-200 dark:bg-slate-800" />
                          <div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Atraso na meta</span>
                            <span className="font-bold text-amber-700 dark:text-amber-400">
                              ~{formatNumberBR(opt.goalDelayDays, 1)} d
                            </span>
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 block">impacto mínimo</span>
                          </div>
                          <div className="w-[1px] h-7 bg-slate-200 dark:bg-slate-800" />
                          <div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Sobra p/ reinvestir</span>
                            <span className="font-bold text-emerald-700 dark:text-emerald-400">
                              +{formatCurrency(opt.remainingBufferForReinvestment)}
                            </span>
                            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 block">protegido</span>
                          </div>
                        </div>
                      </div>

                      {/* Blindagem contra instabilidade da plataforma */}
                      {(opt.earlyPaymentBenefit || opt.riskMitigationTip) && (
                        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px]">
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">Proteção anti-prejuízo:</span>
                            <span>{opt.earlyPaymentBenefit || opt.riskMitigationTip}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 shrink-0">
                            Prioridade de liquidação
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 rounded-lg flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Despesa quitada com sucesso! Sem impacto no capital principal investido.</span>
                    </div>
                  )}

                  {expense.notes && (
                    <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 italic">
                      Nota: {expense.notes}
                    </div>
                  )}
                </div>
              </div>
            );
          });
        })()}
        </div>
      )}

      {/* Modal de Confirmação de Exclusão de Parcela vs Grupo */}
      {deleteConfirmExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-xl">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Excluir Despesa Parcelada</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {deleteConfirmExpense.title}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Esta despesa é a parcela <strong>{deleteConfirmExpense.installmentNumber}/{deleteConfirmExpense.totalInstallments}</strong> deste parcelamento. Como deseja proceder?
            </p>
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  onDeleteExpense(deleteConfirmExpense.id);
                  setDeleteConfirmExpense(null);
                }}
                className="w-full py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg transition-colors text-left flex items-center justify-between cursor-pointer"
              >
                <span>Excluir APENAS esta parcela ({deleteConfirmExpense.installmentNumber}/{deleteConfirmExpense.totalInstallments})</span>
              </button>
              {deleteConfirmExpense.installmentGroupId && onDeleteExpenseGroup && (
                <button
                  type="button"
                  onClick={() => {
                    onDeleteExpenseGroup(deleteConfirmExpense.installmentGroupId!);
                    setDeleteConfirmExpense(null);
                  }}
                  className="w-full py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors text-left flex items-center justify-between shadow-xs cursor-pointer"
                >
                  <span>Excluir TODAS as {deleteConfirmExpense.totalInstallments} parcelas do grupo</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setDeleteConfirmExpense(null)}
                className="w-full py-2 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
