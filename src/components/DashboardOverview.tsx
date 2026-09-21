import React, { useMemo } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Percent, 
  Calendar, 
  ShieldCheck, 
  ArrowRight, 
  Receipt,
  Layers,
  Sparkles
} from 'lucide-react';
import { InvestmentProduct, Expense, PlatformSettings, ProductTemplate, RoadmapPointDetails } from '../types/investment';
import { 
  formatCurrency, 
  formatPercent, 
  calculateProductMetrics, 
  calculateBestPaymentDay,
  calculateAllExpensesOptimizations,
  sortExpensesBySmartPriority,
  formatDateBR,
  getTodayString,
  isProductActiveOnDate,
  formatPercentBR,
} from '../utils/calculations';
import { PortfolioRoadmapCard } from './PortfolioRoadmapCard';

interface DashboardOverviewProps {
  products: InvestmentProduct[];
  expenses: Expense[];
  settings: PlatformSettings;
  templates?: ProductTemplate[];
  onNavigateTab: (tab: 'dashboard' | 'calendar' | 'products' | 'expenses' | 'simulator') => void;
  onSelectExpense: (expense: Expense) => void;
  onOpenNewProduct: () => void;
  onOpenNewExpense: () => void;
  onResetGoalCycle?: (newGoalAmount: number, newStartDate: string) => void;
  onSetRoadmapStartDate?: (startDate: string | undefined) => void;
  onCompleteRoadmapDay?: (details: RoadmapPointDetails) => void;
  onUndoCompleteRoadmapDay?: (date: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  products,
  expenses,
  settings,
  templates = [],
  onNavigateTab,
  onSelectExpense,
  onOpenNewProduct,
  onResetGoalCycle,
  onSetRoadmapStartDate,
  onCompleteRoadmapDay,
  onUndoCompleteRoadmapDay,
}) => {
  const today = getTodayString();
  const activeProducts = products.filter((p) => isProductActiveOnDate(p, today));
  const pendingExpenses = expenses.filter((e) => !e.isPaid);

  // Totais calculados
  const totalInvestedActive = activeProducts.reduce((sum, p) => sum + p.investedAmount, 0);
  const totalDailyYield = activeProducts.reduce(
    (sum, p) => sum + p.investedAmount * (p.dailyPercentage / 100),
    0
  );

  // Métricas agregadas de todos os produtos ativos
  let totalGrossReturnSum = 0;
  let totalNetProfitSum = 0;
  let totalFeesEstimated = 0;

  activeProducts.forEach((p) => {
    const metrics = calculateProductMetrics(p, settings);
    totalGrossReturnSum += metrics.grossReturnAmount;
    totalNetProfitSum += metrics.netProfitAmount;
    totalFeesEstimated += metrics.totalWithdrawalFee;
  });

  const grossReturnPercentage = totalInvestedActive > 0 
    ? (totalGrossReturnSum / totalInvestedActive) * 100 
    : 0;

  // Total de despesas pendentes
  const totalPendingExpensesAmount = pendingExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Rendimento diário líquido atual
  const feeRate = settings.withdrawalFeePercentage / 100;
  const currentDailyNet = totalDailyYield * (1 - feeRate);

  // Próxima despesa prioritária usando ordenação inteligente
  const sortedPendingExpenses = sortExpensesBySmartPriority(pendingExpenses, today, currentDailyNet);
  // CORREÇÃO: cálculo pesado memoizado; rodava a cada re-render do dashboard.
  const allOptimizations = useMemo(
    () => calculateAllExpensesOptimizations(expenses, products, settings, today),
    [expenses, products, settings, today]
  );
  const nextUrgentExpense = sortedPendingExpenses[0] || null;
  const nextExpenseOptimization = nextUrgentExpense 
    ? allOptimizations.get(nextUrgentExpense.id) || calculateBestPaymentDay(nextUrgentExpense, products, settings, today, expenses) 
    : null;

  return (
    <div className="space-y-6">
      {/* 4 Main Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Investido */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold tracking-normal">Total investido ativo</span>
            <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-display text-slate-900 dark:text-slate-100">
            {formatCurrency(totalInvestedActive)}
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>{activeProducts.length} produtos ativo(s)</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">Contratos vigentes</span>
          </div>
        </div>

        {/* 2. Rendimento Diário */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-emerald-100 dark:border-emerald-900/50 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 mb-2">
            <span className="text-xs font-semibold tracking-normal">Rendimento diário</span>
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-lg">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-display text-emerald-600 dark:text-emerald-400">
            +{formatCurrency(totalDailyYield)}
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">/dia</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Projeção mensal:</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(totalDailyYield * 30)}</span>
          </div>
        </div>

        {/* 3. Retorno Bruto Acumulado */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold tracking-normal">Retorno bruto médio</span>
            <div className="p-2 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-lg">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-display text-blue-700 dark:text-blue-400">
            {formatPercent(grossReturnPercentage, 1)}
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Total bruto projetado:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(totalGrossReturnSum)}</span>
          </div>
        </div>

        {/* 4. Lucro Líquido Real (Pós Taxa de Saque) */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold tracking-normal">Lucro líquido real</span>
            <div className="p-2 bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 rounded-lg">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-display text-teal-700 dark:text-teal-400">
            {formatCurrency(totalNetProfitSum)}
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Taxas de saque retidas:</span>
            <span className="text-amber-700 dark:text-amber-400 font-semibold">-{formatCurrency(totalFeesEstimated)}</span>
          </div>
        </div>
      </div>

      {/* Gráfico do Roadmap e Curva de Rendimentos dos Produtos Cadastrados Integrado */}
      <PortfolioRoadmapCard
        products={products}
        expenses={expenses}
        settings={settings}
        templates={templates}
        onOpenNewProduct={onOpenNewProduct}
        onNavigateToProducts={() => onNavigateTab('products')}
        onResetGoalCycle={onResetGoalCycle}
        onSetRoadmapStartDate={onSetRoadmapStartDate}
        onCompleteRoadmapDay={onCompleteRoadmapDay}
        onUndoCompleteRoadmapDay={onUndoCompleteRoadmapDay}
      />

      {/* Spotlight: Smart Expense Optimization Recommendation */}
      {nextUrgentExpense && nextExpenseOptimization && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-white dark:to-slate-900 rounded-2xl p-5 sm:p-6 border border-amber-200/80 dark:border-amber-800/60 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-sm shrink-0 mt-0.5">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold tracking-normal text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded-md">
                    Recomendação inteligente de pagamento
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Despesa: <strong className="text-slate-800 dark:text-slate-200">{nextUrgentExpense.title}</strong> ({formatCurrency(nextUrgentExpense.amount)})
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                  Melhor dia para quitar: <span className="text-amber-800 dark:text-amber-400 underline decoration-amber-400">{nextExpenseOptimization.bestDateFormatted}</span>
                  {nextExpenseOptimization.daysBeforeDue > 0 && nextUrgentExpense.dueDate && (
                    <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-2">
                      ({nextExpenseOptimization.daysBeforeDue} dias antes do vencimento em {formatDateBR(nextUrgentExpense.dueDate)})
                    </span>
                  )}
                </h3>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5 max-w-3xl leading-relaxed">
                  {nextExpenseOptimization.reasoning}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
              <button
                onClick={() => onNavigateTab('expenses')}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Ver Todas Despesas</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid: Active Products Snapshot + Upcoming Days Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Products List (Col span 2) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-slate-700 dark:text-slate-300" />
              <h2 className="font-bold text-base text-slate-900 dark:text-slate-100">Produtos em Execução</h2>
              <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full font-semibold">
                {activeProducts.length}
              </span>
            </div>
            <button
              onClick={() => onNavigateTab('products')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
            >
              <span>Gerenciar Produtos</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {activeProducts.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Nenhum produto de investimento ativo no momento.</p>
              <button
                onClick={onOpenNewProduct}
                className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 cursor-pointer"
              >
                Adicionar primeiro produto
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {activeProducts.slice(0, 4).map((product) => {
                const metrics = calculateProductMetrics(product, settings);
                return (
                  <div
                    key={product.id}
                    className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                          {product.name}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-md font-medium border border-emerald-200/50 dark:border-emerald-800/50">
                          {product.dailyPercentage}% / dia
                        </span>
                        {product.returnCapitalAtEnd && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-md font-medium">
                            Capital devolvido
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <span>Investido: <strong className="text-slate-700 dark:text-slate-300">{formatCurrency(product.investedAmount)}</strong></span>
                        <span>•</span>
                        <span>Rendimento: <strong className="text-emerald-600 dark:text-emerald-400">+{formatCurrency(metrics.dailyYield)}/dia</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 sm:text-right">
                      <div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Lucro Líquido Previsto</div>
                        <div className="text-sm font-bold text-teal-700 dark:text-teal-400">
                          +{formatCurrency(metrics.netProfitAmount)} ({formatPercentBR(metrics.netProfitPercentage)})
                        </div>
                      </div>
                      <div className="w-20">
                        <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mb-1">
                          <span>{metrics.daysRemaining}d rest.</span>
                          <span>{formatPercentBR(metrics.progressPercentage, 0)}</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${metrics.progressPercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Expenses & Next Cash Flow Snapshot (Col span 1) */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                <h2 className="font-bold text-base text-slate-900 dark:text-slate-100">Despesas Pendentes</h2>
              </div>
              <button
                onClick={() => onNavigateTab('expenses')}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
              >
                <span>Ver Todas</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800 mb-4">
              <span className="text-xs text-slate-500 dark:text-slate-400">Total a Pagar Pendente</span>
              <div className="text-xl font-bold font-display text-slate-900 dark:text-slate-100 mt-0.5">
                {formatCurrency(totalPendingExpensesAmount)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {pendingExpenses.length} conta(s) cadastradas no sistema
              </div>
            </div>

            {pendingExpenses.length === 0 ? (
              <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-xs">
                Nenhuma despesa pendente registrada.
              </div>
            ) : (
              <div className="space-y-2.5">
                {sortedPendingExpenses.slice(0, 3).map((exp) => {
                  const opt = allOptimizations.get(exp.id) || calculateBestPaymentDay(exp, products, settings, today, expenses);
                  return (
                    <div
                      key={exp.id}
                      onClick={() => onSelectExpense(exp)}
                      className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40 hover:bg-slate-50/50 dark:hover:bg-slate-800 cursor-pointer transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[130px]">
                          {exp.title}
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(exp.amount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <span>{exp.dueDate ? `Vence: ${formatDateBR(exp.dueDate)}` : 'Sem data fixa'}</span>
                        <span className="text-amber-700 dark:text-amber-400 font-medium">
                          Pagar: {opt.bestDateFormatted}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => onNavigateTab('calendar')}
              className="w-full py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Abrir Calendário Financeiro</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
