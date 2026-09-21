import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Sparkles, 
  Plus, 
  AlertCircle,
  Clock,
  Flag,
} from 'lucide-react';
import { InvestmentProduct, Expense, PlatformSettings, DayDetail } from '../types/investment';
import { 
  formatCurrency, 
  formatDateBR, 
  generateDayProjections, 
  calculateAllExpensesOptimizations,
  diffInDays,
  getTodayString
} from '../utils/calculations';

interface CalendarViewProps {
  products: InvestmentProduct[];
  expenses: Expense[];
  settings: PlatformSettings;
  onOpenNewExpense: (initialDate?: string) => void;
  onOpenNewProduct: (initialDate?: string) => void;
  onSelectExpense: (expense: Expense) => void;
  onSetRoadmapStartDate?: (startDate: string | undefined) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  products,
  expenses,
  settings,
  onOpenNewExpense,
  onOpenNewProduct,
  onSelectExpense,
  onSetRoadmapStartDate,
}) => {
  const todayStr = getTodayString();
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth()); // 0-11
  const [selectedDayStr, setSelectedDayStr] = useState<string | null>(todayStr);

  // Mês e Ano formatados em PT-BR
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  const handleGoToToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setSelectedDayStr(todayStr);
  };

  // Gerar dias do mês exibido
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const totalDaysInMonth = lastDayOfMonth.getDate();
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Domingo

  // Datas em formato string
  const firstMonthDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;

  /**
   * CORREÇÃO: as duas projeções abaixo rodavam no corpo do render. Trocar de
   * dia selecionado recalculava 365 dias x produtos, duas vezes.
   *
   * A projeção também passou a partir de HOJE (ou do início do mês exibido, o
   * que vier antes) em vez de reiniciar o saldo em zero todo dia 1 — o mesmo
   * dia mostrava saldos diferentes conforme o mês em que se entrava na tela.
   */
  const projectionStart = firstMonthDateStr < todayStr ? firstMonthDateStr : todayStr;
  const projectionSpan = Math.max(40, diffInDays(projectionStart, firstMonthDateStr) + 40);

  const projections = useMemo(
    () => generateDayProjections(products, expenses, settings, projectionStart, projectionSpan),
    [products, expenses, settings, projectionStart, projectionSpan]
  );

  const allOptimizations = useMemo(
    () => calculateAllExpensesOptimizations(expenses, products, settings, todayStr),
    [expenses, products, settings, todayStr]
  );

  const bestPaymentDaysMap: Record<string, Expense[]> = {};
  expenses.filter(e => !e.isPaid).forEach(exp => {
    const opt = allOptimizations.get(exp.id);
    if (!opt) return;
    if (!bestPaymentDaysMap[opt.bestDate]) {
      bestPaymentDaysMap[opt.bestDate] = [];
    }
    bestPaymentDaysMap[opt.bestDate].push(exp);
  });

  // Métricas do Mês Exibido
  let monthTotalYield = 0;
  let monthCapitalReturned = 0;

  for (let d = 1; d <= totalDaysInMonth; d++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const p = projections[dateStr];
    if (p) {
      monthTotalYield += p.dailyYield;
      monthCapitalReturned += p.capitalReturned;
    }
  }

  // Cálculo preciso de Despesas no Mês exibido no calendário
  const currentMonthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

  const monthExpensesList = expenses.filter((e) => {
    // 1. Se possui data de vencimento fixa
    if (e.hasDueDate !== false && e.dueDate && e.dueDate.trim()) {
      const cleanDueDate = e.dueDate.trim().split('T')[0];
      return cleanDueDate.startsWith(currentMonthPrefix);
    }
    // 2. Se já foi paga nesta data
    if (e.paidDate && e.paidDate.trim()) {
      const cleanPaidDate = e.paidDate.trim().split('T')[0];
      return cleanPaidDate.startsWith(currentMonthPrefix);
    }
    // 3. Se é uma despesa sem vencimento pendente e o mês visualizado é o mês atual
    if (e.hasDueDate === false || !e.dueDate) {
      const now = new Date();
      return now.getFullYear() === currentYear && now.getMonth() === currentMonth;
    }
    return false;
  });

  const monthTotalExpenses = monthExpensesList.reduce((sum, e) => sum + e.amount, 0);

  // Detalhe do dia selecionado
  const selectedDayDetail: DayDetail | null = selectedDayStr ? (projections[selectedDayStr] || {
    date: selectedDayStr,
    dailyYield: 0,
    capitalReturned: 0,
    totalGrossInflow: 0,
    activeProductsCount: 0,
    products: [],
    expensesDue: expenses.filter(e => e.dueDate && e.dueDate.trim().split('T')[0] === selectedDayStr),
    expensesRecommended: bestPaymentDaysMap[selectedDayStr] || [],
    accumulatedBalance: 0,
  }) : null;

  return (
    <div className="space-y-6">
      {/* Month Navigator & Summary Header */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-xl border border-emerald-100 dark:border-emerald-900/60">
              <CalendarIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-display text-slate-900 dark:text-slate-100 capitalize">
                {monthNames[currentMonth]} {currentYear}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Visualize os rendimentos programados dia a dia e datas ideais de saque
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGoToToday}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              Hoje
            </button>
            <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <button
                onClick={handlePrevMonth}
                className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Mês anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-700" />
              <button
                onClick={handleNextMonth}
                className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Próximo mês"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Month Summary KPI Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
          <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-lg border border-emerald-100 dark:border-emerald-900/50">
            <span className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300 tracking-normal">
              Rendimentos no mês
            </span>
            <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400 font-display mt-0.5">
              +{formatCurrency(monthTotalYield)}
            </div>
          </div>

          <div className="p-3 bg-blue-50/50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900/50">
            <span className="text-[11px] font-medium text-blue-800 dark:text-blue-300 tracking-normal">
              Devolução de capital
            </span>
            <div className="text-lg font-bold text-blue-700 dark:text-blue-400 font-display mt-0.5">
              {formatCurrency(monthCapitalReturned)}
            </div>
          </div>

          <div className="p-3 bg-amber-50/50 dark:bg-amber-950/30 rounded-lg border border-amber-100 dark:border-amber-900/50">
            <span className="text-[11px] font-medium text-amber-800 dark:text-amber-300 tracking-normal">
              Despesas no mês
            </span>
            <div className="text-lg font-bold text-amber-800 dark:text-amber-400 font-display mt-0.5">
              {formatCurrency(monthTotalExpenses)}
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 tracking-normal">
              Saldo líquido previsto
            </span>
            <div className={`text-lg font-bold font-display mt-0.5 ${
              monthTotalYield - monthTotalExpenses >= 0 ? 'text-teal-700 dark:text-teal-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {formatCurrency(monthTotalYield - monthTotalExpenses)}
            </div>
          </div>
        </div>
      </div>

      {/* Main Calendar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid (2 Cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 text-center font-semibold text-xs text-slate-500 dark:text-slate-400 mb-2">
            <div className="text-rose-600 dark:text-rose-400">Dom</div>
            <div>Seg</div>
            <div>Ter</div>
            <div>Qua</div>
            <div>Qui</div>
            <div>Sex</div>
            <div className="text-slate-600 dark:text-slate-400">Sáb</div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {/* Empty slots before month start */}
            {Array.from({ length: startDayOfWeek }).map((_, idx) => (
              <div
                key={`empty-${idx}`}
                className="h-20 sm:h-24 bg-slate-50/40 dark:bg-slate-950/40 rounded-lg border border-transparent"
              />
            ))}

            {/* Days of Month */}
            {Array.from({ length: totalDaysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dayProj = projections[dateStr];
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDayStr;

              const dayYield = dayProj ? dayProj.dailyYield : 0;
              const hasCapital = dayProj && dayProj.capitalReturned > 0;
              const dueExpenses = expenses.filter(e => {
                if (e.isPaid) return false;
                if (!e.dueDate) return false;
                return e.dueDate.trim().split('T')[0] === dateStr;
              });
              const recommendedExpenses = bestPaymentDaysMap[dateStr] || [];

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelectedDayStr(dateStr)}
                  className={`h-20 sm:h-24 p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between relative group ${
                    isSelected
                      ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20 shadow-xs'
                      : isToday
                      ? 'border-emerald-400 dark:border-emerald-600 bg-white dark:bg-slate-900 shadow-xs'
                      : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-850'
                  }`}
                >
                  {/* Top: Day Number & Today indicator */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold rounded-md px-1.5 py-0.5 ${
                        isToday
                          ? 'bg-emerald-600 text-white'
                          : isSelected
                          ? 'text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {dayNum}
                    </span>

                    {/* Status badges count */}
                    <div className="flex items-center gap-1">
                      {/* Ponto de Início do Roadmap */}
                      {settings.goalCycleStartDate && dateStr === settings.goalCycleStartDate && (
                        <span
                          className="text-emerald-700 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-950/90 p-0.5 rounded"
                          title="Ponto de Início do Roadmap"
                          aria-label="Ponto de Início do Roadmap"
                        >
                          <Flag className="h-3 w-3 fill-emerald-600 dark:fill-emerald-400 text-emerald-700 dark:text-emerald-300" />
                        </span>
                      )}
                      {recommendedExpenses.length > 0 && (
                        <span
                          className="text-amber-600 dark:text-amber-400"
                          aria-label={`Melhor dia para pagar: ${recommendedExpenses.map(e => e.title).join(', ')}`}
                        >
                          <Sparkles className="h-3 w-3" aria-hidden="true" />
                        </span>
                      )}
                      {dueExpenses.length > 0 && (
                        <span
                          className="text-rose-600 dark:text-rose-400"
                          aria-label={`Vence hoje: ${dueExpenses.map(e => e.title).join(', ')}`}
                        >
                          <AlertCircle className="h-3 w-3" aria-hidden="true" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle / Bottom: Daily Yield & Event Badges */}
                  <div className="space-y-1">
                    {dayYield > 0 && (
                      <div className="text-[10px] sm:text-xs font-bold text-emerald-700 dark:text-emerald-400 truncate">
                        +{formatCurrency(dayYield)}
                      </div>
                    )}

                    {hasCapital && (
                      <div className="text-[9px] bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-semibold px-1 rounded-sm truncate">
                        +Cap. {formatCurrency(dayProj.capitalReturned)}
                      </div>
                    )}

                    {recommendedExpenses.length > 0 && (
                      <div className="text-[9px] bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 font-semibold px-1 rounded-sm truncate hidden sm:block">
                        Pagar conta
                      </div>
                    )}

                    {dueExpenses.length > 0 && (
                      <div className={`text-[9px] font-semibold px-1 rounded-sm truncate hidden sm:block ${
                        dueExpenses.some(e => e.category === 'Imprevisto' || e.deductFromRoadmap)
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800'
                          : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                      }`}>
                        {dueExpenses.some(e => e.category === 'Imprevisto') ? 'Imprevisto: ' : 'Venc: '}
                        {formatCurrency(dueExpenses.reduce((s, e) => s + e.amount, 0))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            {settings.goalCycleStartDate && (
              <div className="flex items-center gap-1.5">
                <Flag className="h-3 w-3 fill-emerald-600 dark:fill-emerald-400 text-emerald-700 dark:text-emerald-300" />
                <span className="font-semibold text-emerald-800 dark:text-emerald-300">Ponto de Início ({formatDateBR(settings.goalCycleStartDate)})</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
              <span>Rendimento diário</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-blue-400" />
              <span>Devolução de capital</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 dark:bg-amber-400" />
              <span>Melhor Dia para Pagar Despesa</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 dark:bg-rose-400" />
              <span>Vencimento / Gasto Imprevisto</span>
            </div>
          </div>
        </div>

        {/* Selected Day Details Panel (1 Col) */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div>
            {/* Header of Drawer */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <div>
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 tracking-normal">
                  Extrato do dia
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {selectedDayStr ? formatDateBR(selectedDayStr) : 'Selecione uma data'}
                </h3>
              </div>
              {selectedDayStr === todayStr && (
                <span className="text-xs bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                  Hoje
                </span>
              )}
            </div>

            {/* Controle de Ponto de Início do Roadmap para este Dia */}
            {selectedDayStr && (
              <div className="mb-4">
                {selectedDayStr === settings.goalCycleStartDate ? (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-300 dark:border-emerald-800 flex items-center justify-between gap-2 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-emerald-600 dark:bg-emerald-500 text-white rounded-lg shrink-0">
                        <Flag className="h-4 w-4 fill-white" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 block">Ponto de Início do Roadmap</span>
                        <span className="text-[11px] text-emerald-700 dark:text-emerald-400 leading-tight block">
                          O roadmap projeta a meta a partir deste dia, descartando o histórico anterior.
                        </span>
                      </div>
                    </div>
                    {onSetRoadmapStartDate && (
                      <button
                        type="button"
                        onClick={() => onSetRoadmapStartDate(undefined)}
                        className="text-xs px-2.5 py-1 text-slate-600 dark:text-slate-300 hover:text-rose-700 dark:hover:text-rose-400 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-slate-200 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-800 rounded-lg transition-colors font-medium shrink-0 cursor-pointer"
                        title="Restaurar ponto de início automático"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                ) : onSetRoadmapStartDate ? (
                  <button
                    type="button"
                    onClick={() => onSetRoadmapStartDate(selectedDayStr)}
                    className="w-full py-2 px-3 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-950/80 active:bg-emerald-200 text-emerald-900 dark:text-emerald-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 border border-emerald-200/90 dark:border-emerald-800 transition-colors shadow-2xs cursor-pointer"
                    title="Definir este dia como ponto de início para o cálculo da meta no roadmap"
                  >
                    <Flag className="h-3.5 w-3.5 fill-emerald-600 dark:fill-emerald-400 text-emerald-700 dark:text-emerald-300" />
                    <span>Marcar este dia como Ponto de Início</span>
                  </button>
                ) : null}
              </div>
            )}

            {selectedDayDetail ? (
              <div className="space-y-4">
                {/* Total Day Inflow */}
                <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/60 rounded-xl">
                  <span className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">Entrada Bruta no Dia</span>
                  <div className="text-2xl font-bold font-display text-emerald-700 dark:text-emerald-400 mt-0.5">
                    +{formatCurrency(selectedDayDetail.totalGrossInflow)}
                  </div>
                  {settings.withdrawalFeePercentage > 0 && selectedDayDetail.totalGrossInflow > 0 && (
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                      Líquido estimado (após {settings.withdrawalFeePercentage}% taxa):{' '}
                      <strong>
                        {formatCurrency(
                          selectedDayDetail.totalGrossInflow * (1 - settings.withdrawalFeePercentage / 100)
                        )}
                      </strong>
                    </div>
                  )}
                </div>

                {/* Smart Recommendation for this day */}
                {(bestPaymentDaysMap[selectedDayStr || ''] || []).length > 0 && (
                  <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-300">
                      <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <span>Recomendado Pagar Hoje</span>
                    </div>
                    {bestPaymentDaysMap[selectedDayStr || ''].map(exp => {
                      const opt = allOptimizations.get(exp.id);
                      if (!opt) return null;
                      return (
                        <div key={exp.id} className="text-xs text-amber-950 dark:text-amber-200 bg-white/80 dark:bg-slate-900/90 p-2.5 rounded-lg border border-amber-200/60 dark:border-amber-900/60 space-y-1.5">
                          <div className="flex justify-between font-bold">
                            <span>{exp.title}</span>
                            <span className="text-rose-600 dark:text-rose-400">Saque: -{formatCurrency(opt.requiredAmountWithFee)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap">
                            <span>Despesa: {formatCurrency(exp.amount)}</span>
                            {opt.withdrawalFee > 0 && <span>• Taxa: +{formatCurrency(opt.withdrawalFee)}</span>}
                            <span>•</span>
                            <span>{exp.dueDate ? `Vence em: ${formatDateBR(exp.dueDate)}` : 'Sem data fixa'}</span>
                            <span>•</span>
                            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                              {opt.daysBeforeDue > 0 ? `Antecipa ${opt.daysBeforeDue}d` : 'No vencimento'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                            {opt.reasoning}
                          </p>
                          {opt.earlyPaymentBenefit && (
                            <div className="text-[10px] text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 p-1.5 rounded border border-emerald-100 dark:border-emerald-900/60">
                              <strong>Anti-Prejuízo:</strong> {opt.earlyPaymentBenefit}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Products Active on Day */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 tracking-normal mb-2">
                    Rendimentos Ativos ({selectedDayDetail.products.length})
                  </h4>

                  {selectedDayDetail.products.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                      Nenhum produto com rendimento programado para esta data.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {selectedDayDetail.products.map((item, idx) => (
                        <div
                          key={`${item.productId}-${idx}`}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 text-xs"
                        >
                          <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[170px]">
                            {item.productName}
                          </span>
                          <span className="font-bold text-emerald-700 dark:text-emerald-400">
                            {item.isMaturityDay
                              ? `+${formatCurrency(item.capitalReturn)} (Devolvido)`
                              : `+${formatCurrency(item.yield)}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Expenses Due on Day */}
                {selectedDayDetail.expensesDue.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400 tracking-normal mb-2">
                      Gastos e vencimentos ({selectedDayDetail.expensesDue.length})
                    </h4>
                    <div className="space-y-2">
                      {selectedDayDetail.expensesDue.map(exp => (
                        <div
                          key={exp.id}
                          onClick={() => onSelectExpense(exp)}
                          className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                            exp.category === 'Imprevisto'
                              ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 hover:bg-amber-100/70 dark:hover:bg-amber-950/70'
                              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-100 dark:border-rose-900/60 hover:bg-rose-100/60 dark:hover:bg-rose-950/70'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-900 dark:text-slate-100">{exp.title}</span>
                              {exp.category === 'Imprevisto' && (
                                <span className="text-[9px] bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 font-bold px-1.5 py-0.2 rounded">
                                  Imprevisto
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                              {exp.deductFromRoadmap !== false ? 'Abate no roadmap' : 'Apenas controle'}
                            </span>
                          </div>
                          <span className="font-bold text-rose-700 dark:text-rose-400 text-right">
                            -{formatCurrency(exp.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gastos sem data fixa pendentes */}
                {expenses.filter(e => !e.isPaid && (!e.dueDate || !e.dueDate.trim())).length > 0 && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                    <h4 className="text-[11px] font-bold text-amber-800 dark:text-amber-300 tracking-normal mb-2 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      Gastos sem prazo fixo ({expenses.filter(e => !e.isPaid && (!e.dueDate || !e.dueDate.trim())).length})
                    </h4>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                      {expenses.filter(e => !e.isPaid && (!e.dueDate || !e.dueDate.trim())).map(exp => {
                        const opt = allOptimizations.get(exp.id);
                        return (
                          <div
                            key={exp.id}
                            onClick={() => onSelectExpense(exp)}
                            className="flex items-center justify-between p-2 rounded-lg bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 text-xs cursor-pointer hover:bg-amber-100/70 dark:hover:bg-amber-950/60 transition-all"
                          >
                            <div className="min-w-0 pr-2">
                              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">{exp.title}</span>
                              <span className="text-[10px] text-amber-700 dark:text-amber-400 block">
                                {opt ? `Pagar: ${opt.bestDateFormatted}` : 'A qualquer momento'}
                              </span>
                            </div>
                            <span className="font-bold text-amber-900 dark:text-amber-300 shrink-0">{formatCurrency(exp.amount)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Quick Add buttons for this date */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 mt-4">
            <button
              onClick={() => onOpenNewExpense(selectedDayStr || undefined)}
              className="flex-1 py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Despesa</span>
            </button>
            <button
              onClick={() => onOpenNewProduct(selectedDayStr || undefined)}
              className="flex-1 py-2 px-3 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-emerald-200 dark:border-emerald-800 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Produto</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
