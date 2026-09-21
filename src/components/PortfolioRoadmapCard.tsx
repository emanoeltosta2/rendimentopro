import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
  Target, 
  CheckCircle2, 
  Layers, 
  ArrowUpRight, 
  PlusCircle, 
  ShieldCheck, 
  RefreshCw, 
  Clock, 
  Eye, 
  Receipt, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle, 
  Route, 
  Flag, 
  X, 
  ShoppingBag, 
  Sparkles,
  ZoomIn,
  ZoomOut,
  MoveHorizontal,
} from 'lucide-react';
import {
  InvestmentProduct,
  Expense,
  PlatformSettings,
  RoadmapPointDetails,
  ProductTemplate,
  PortfolioMilestone,
} from '../types/investment';

/**
 * CORREÇÃO: `expenses = []` e `templates = []` como default de prop criavam um
 * array novo a cada render e invalidavam silenciosamente o `useMemo` que roda
 * a simulação inteira. Constantes de módulo mantêm a identidade estável.
 */
const EMPTY_EXPENSES: Expense[] = [];
const EMPTY_TEMPLATES: ProductTemplate[] = [];
import { calculatePortfolioRoadmap } from '../utils/roadmap';
import { formatCurrency, formatNumberBR, formatPercentBR, formatDateBR } from '../utils/calculations';
import { RoadmapDayDetailsModal } from './RoadmapDayDetailsModal';
import { ResetGoalCycleModal } from './ResetGoalCycleModal';

interface PortfolioRoadmapCardProps {
  products: InvestmentProduct[];
  expenses?: Expense[];
  settings: PlatformSettings;
  templates?: ProductTemplate[];
  onOpenNewProduct: () => void;
  onNavigateToProducts: () => void;
  onResetGoalCycle?: (newGoalAmount: number, newStartDate: string) => void;
  onSetRoadmapStartDate?: (startDate: string | undefined) => void;
  onCompleteRoadmapDay?: (details: RoadmapPointDetails) => void;
  onUndoCompleteRoadmapDay?: (date: string) => void;
}

export const PortfolioRoadmapCard: React.FC<PortfolioRoadmapCardProps> = ({
  products,
  expenses = EMPTY_EXPENSES,
  settings,
  templates = EMPTY_TEMPLATES,
  onOpenNewProduct,
  onNavigateToProducts,
  onResetGoalCycle,
  onSetRoadmapStartDate,
  onCompleteRoadmapDay,
  onUndoCompleteRoadmapDay,
}) => {
  const [horizonOption, setHorizonOption] = useState<'goal' | '30' | '60' | '90' | '180'>('goal');
  const [includeExpenses, setIncludeExpenses] = useState<boolean>(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isExpandedScroll, setIsExpandedScroll] = useState<boolean>(true);
  const [selectedPointDetails, setSelectedPointDetails] = useState<RoadmapPointDetails | null>(null);
  const [isResetGoalModalOpen, setIsResetGoalModalOpen] = useState<boolean>(false);
  const [milestonesPage, setMilestonesPage] = useState<number>(0);
  const [groupByDay, setGroupByDay] = useState<boolean>(true);
  const [roadmapViewTab, setRoadmapViewTab] = useState<'timeline' | 'acquisitions'>('timeline');
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const forcedDays = horizonOption === 'goal' ? undefined : parseInt(horizonOption, 10);

  const roadmap = useMemo(
    () =>
      calculatePortfolioRoadmap({
        products,
        expenses,
        settings,
        horizonDays: forcedDays,
        includeExpenses,
        templates,
      }),
    [products, expenses, settings, forcedDays, includeExpenses, templates]
  );

  /** Abre os detalhes de um dia; reconstruídos sob demanda pelo motor. */
  const openDayDetails = useCallback(
    (day: number) => {
      const details = roadmap.getDayDetails(day);
      if (details) setSelectedPointDetails(details);
    },
    [roadmap]
  );

  // Mede a largura real do gráfico para compensar a escala do viewBox.
  const chartWrapRef = useRef<HTMLDivElement | null>(null);
  const [chartPixelWidth, setChartPixelWidth] = useState<number>(700);

  useEffect(() => {
    const el = chartWrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      if (w > 0) setChartPixelWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const hasActiveProducts = roadmap.activeProductsCount > 0;
  const isGoalReachedNow = roadmap.isGoalReached || (roadmap.currentDailyYield >= roadmap.targetDailyYield && roadmap.targetDailyYield > 0);
  const totalExpensesInRoadmap = roadmap.totalExpensesDeducted;

  // Agrupamento inteligente de marcos/eventos por dia
  const groupedMilestonesByDay = useMemo(() => {
    const map = new Map<string, {
      date: string;
      dateFormatted: string;
      dayNumber: number;
      events: typeof roadmap.milestones;
      primaryType: PortfolioMilestone['type'];
      title: string;
      totalReinvested: number;
      totalWithdrawals: number;
      totalExpensesToPay: number;
      totalWithdrawalFees: number;
      totalNewInvestments: number;
      totalProtectedAmount: number;
      finalDailyYield: number;
    }>();

    roadmap.milestones.forEach((m) => {
      const key = m.date;
      if (!map.has(key)) {
        map.set(key, {
          date: m.date,
          dateFormatted: m.dateFormatted,
          dayNumber: m.dayNumber,
          events: [],
          primaryType: m.type,
          title: '',
          totalReinvested: 0,
          totalWithdrawals: 0,
          totalExpensesToPay: 0,
          totalWithdrawalFees: 0,
          totalNewInvestments: 0,
          totalProtectedAmount: 0,
          finalDailyYield: m.dailyYieldAfter,
        });
      }

      const entry = map.get(key)!;
      entry.events.push(m);
      entry.finalDailyYield = Math.max(entry.finalDailyYield, m.dailyYieldAfter);

      if (m.type === 'expense_withdrawal') {
        entry.totalWithdrawals += m.amount || 0;
        entry.totalExpensesToPay += (m.expenseAmount ?? m.amount ?? 0);
        entry.totalWithdrawalFees += (m.feeAmount ?? 0);
      } else if (m.type === 'new_investment') {
        entry.totalNewInvestments += m.amount || 0;
      } else if (m.type === 'reinvestment' || m.type === 'goal_maintenance') {
        entry.totalReinvested += m.amount || 0;
      } else if (m.type === 'capital_protection') {
        entry.totalProtectedAmount += (m.protectionAmount ?? m.amount ?? 0);
      }

      // Prioridade visual do card agrupado
      if (m.type === 'goal_reached') {
        entry.primaryType = 'goal_reached';
      } else if (m.type === 'optimization_completed' && entry.primaryType !== 'goal_reached') {
        entry.primaryType = 'optimization_completed';
      } else if (m.type === 'optimization_start' && entry.primaryType !== 'goal_reached' && entry.primaryType !== 'optimization_completed') {
        entry.primaryType = 'optimization_start';
      } else if (m.type === 'capital_protection' && entry.primaryType !== 'goal_reached' && !entry.primaryType?.startsWith('optimization')) {
        entry.primaryType = 'capital_protection';
      } else if (m.type === 'new_investment' && entry.primaryType !== 'goal_reached' && !entry.primaryType?.startsWith('optimization') && entry.primaryType !== 'capital_protection') {
        entry.primaryType = 'new_investment';
      } else if (m.type === 'expense_withdrawal' && entry.primaryType !== 'goal_reached' && !entry.primaryType?.startsWith('optimization') && entry.primaryType !== 'capital_protection' && entry.primaryType !== 'new_investment') {
        entry.primaryType = 'expense_withdrawal';
      }
    });

    return Array.from(map.values()).map((entry) => {
      const hasGoal = entry.events.some((e) => e.type === 'goal_reached');
      const hasOptCompleted = entry.events.some((e) => e.type === 'optimization_completed');
      const hasOptStart = entry.events.some((e) => e.type === 'optimization_start');
      const reinvs = entry.events.filter((e) => e.type === 'reinvestment' || e.type === 'goal_maintenance');
      const withdrawals = entry.events.filter((e) => e.type === 'expense_withdrawal');
      const newInvs = entry.events.filter((e) => e.type === 'new_investment');
      const protections = entry.events.filter((e) => e.type === 'capital_protection');

      let title = '';
      if (hasGoal) {
        title = 'Meta diária conquistada';
      } else if (hasOptCompleted) {
        const ev = entry.events.find((e) => e.type === 'optimization_completed');
        title = ev ? ev.title : 'Otimização Concluída';
      } else if (hasOptStart) {
        const ev = entry.events.find((e) => e.type === 'optimization_start');
        title = ev ? ev.title : 'Início da Otimização';
      } else if (protections.length > 0 && reinvs.length === 0 && withdrawals.length === 0 && newInvs.length === 0) {
        title = protections[0].title;
      } else if (reinvs.length > 0 && withdrawals.length === 0 && newInvs.length === 0 && protections.length === 0) {
        if (reinvs.length === 1) {
          title = reinvs[0].title;
        } else {
          const names = reinvs.map((r) => {
            const match = r.title.match(/Reinvestimento \(([^)]+)\)/);
            return match ? match[1] : r.title;
          });
          title = `Reinvestimento (${names.join(' + ')})`;
        }
      } else if (withdrawals.length > 0 && reinvs.length === 0 && newInvs.length === 0 && protections.length === 0) {
        title = withdrawals.length === 1 ? withdrawals[0].title : `${withdrawals.length}x Despesas Agendadas`;
      } else if (newInvs.length > 0 && reinvs.length === 0 && withdrawals.length === 0 && protections.length === 0) {
        title = newInvs.length === 1 ? newInvs[0].title : `${newInvs.length}x Novos Aportes`;
      } else {
        const parts: string[] = [];
        if (protections.length > 0) parts.push(`${protections.length} proteção`);
        if (withdrawals.length > 0) parts.push(`${withdrawals.length} Despesa(s)`);
        if (reinvs.length > 0) parts.push(`${reinvs.length} Reinvest.`);
        if (newInvs.length > 0) parts.push(`${newInvs.length} Aporte(s)`);
        title = parts.join(' + ');
      }

      entry.title = title;
      return entry;
    });
  }, [roadmap.milestones]);

  // Paginação dos marcos / eventos (4 por página)
  const itemsPerPage = 4;
  const activeMilestonesList = groupByDay ? groupedMilestonesByDay : roadmap.milestones;
  const totalMilestones = activeMilestonesList.length;
  const totalMilestonesPages = Math.max(1, Math.ceil(totalMilestones / itemsPerPage));
  const currentMilestonesPage = Math.min(milestonesPage, totalMilestonesPages - 1);
  const milestoneStartIndex = currentMilestonesPage * itemsPerPage;
  const milestoneEndIndex = Math.min(milestoneStartIndex + itemsPerPage, totalMilestones);
  const visibleMilestones = activeMilestonesList.slice(milestoneStartIndex, milestoneStartIndex + itemsPerPage);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-6">
      {/* Header do Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 rounded-xl shadow-xs shrink-0">
            <Target className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 font-display">
                Caminho da meta diária (Roadmap de reinvestimento)
              </h2>
              <span className="text-xs font-bold tracking-normal bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/60 flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
                Juros compostos automáticos
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Projeção calculada reinvestindo automaticamente os rendimentos diários e ajustando saques/gastos imprevistos em tempo real
            </p>
          </div>
        </div>

        {/* Action Controls & Horizon Filter Tabs */}
        {hasActiveProducts && (
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {/* Ponto de Início Ativo */}
            {settings.goalCycleStartDate && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 shadow-2xs">
                <Flag className="h-3.5 w-3.5 fill-emerald-600 dark:fill-emerald-400 text-emerald-700 dark:text-emerald-400 shrink-0" />
                <span>Início: <strong>{formatDateBR(settings.goalCycleStartDate)}</strong></span>
                {onSetRoadmapStartDate && (
                  <button
                    type="button"
                    onClick={() => onSetRoadmapStartDate(undefined)}
                    className="p-0.5 hover:bg-emerald-200 dark:hover:bg-emerald-800 rounded text-emerald-800 dark:text-emerald-300 transition-colors ml-0.5 cursor-pointer"
                    title="Remover ponto de início customizado (restaurar automático)"
                    aria-label="Remover ponto de início customizado"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}

            {/* Botão de Reset de Meta e Novo Ciclo */}
            <button
              type="button"
              onClick={() => setIsResetGoalModalOpen(true)}
              className="text-xs px-2.5 py-1 rounded-xl font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Resetar o ciclo de acompanhamento de novos investimentos ou definir uma nova meta"
            >
              <Target className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Resetar ciclo / nova meta</span>
            </button>

            {/* Toggle de Gastos no Roadmap */}
            {expenses.length > 0 && (
              <button
                type="button"
                onClick={() => setIncludeExpenses(!includeExpenses)}
                className={`text-xs px-2.5 py-1 rounded-xl font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                  includeExpenses
                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="Ativar/desativar o abatimento de gastos imprevistos e despesas no saldo do roadmap"
              >
                <Receipt className="h-3.5 w-3.5" />
                <span>
                  {includeExpenses ? 'Gastos: Abatendo' : 'Gastos: Ignorados'}
                </span>
              </button>
            )}

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              {[
                { id: 'goal', label: 'Até a Meta' },
                { id: '30', label: '30 dias' },
                { id: '60', label: '60 dias' },
                { id: '90', label: '90 dias' },
                { id: '180', label: '180 dias' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setHorizonOption(tab.id as typeof horizonOption)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    horizonOption === tab.id
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {!hasActiveProducts ? (
        <div className="text-center py-10 px-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30">
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
            <Layers className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Nenhum produto ativo cadastrado</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-4">
            Cadastre seus produtos para o sistema projetar o caminho de crescimento da renda diária através do reinvestimento até alcançar sua meta de {formatCurrency(roadmap.targetDailyYield)}/dia.
          </p>
          <button
            onClick={onOpenNewProduct}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Cadastrar Primeiro Produto</span>
          </button>
        </div>
      ) : (
        <>
          {/* Goal Status Banner */}
          <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-4 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center justify-center shrink-0">
                {isGoalReachedNow ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                ) : (
                  <Clock className="h-5 w-5 text-emerald-300" />
                )}
              </div>
              <div>
                <span className="text-xs font-bold tracking-normal text-emerald-400 block">
                  {isGoalReachedNow ? 'Objetivo conquistado' : 'Projeção de conquista'}
                </span>
                <div className="text-sm sm:text-base font-bold text-white">
                  {isGoalReachedNow ? (
                    <span>Sua renda diária atual já atingiu a meta de {formatCurrency(roadmap.targetDailyYield)}/dia!</span>
                  ) : roadmap.daysToGoal !== null ? (
                    <span>
                      Meta de {formatCurrency(roadmap.targetDailyYield)}/dia alcançada em{' '}
                      <strong className="text-emerald-300 underline decoration-emerald-500">
                        {roadmap.daysToGoal} dias ({roadmap.estimatedGoalDateFormatted})
                      </strong>
                    </span>
                  ) : (
                    <span>Reinvestindo continuamente rumo à meta de {formatCurrency(roadmap.targetDailyYield)}/dia</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {totalExpensesInRoadmap > 0 && includeExpenses && (
                <div className="text-xs text-amber-200 bg-amber-950/60 px-3 py-1.5 rounded-lg border border-amber-500/40 flex items-center gap-1.5">
                  <Receipt className="h-3.5 w-3.5 text-amber-400" />
                  <span>Saques p/ despesas: <strong>-{formatCurrency(totalExpensesInRoadmap)}</strong></span>
                </div>
              )}

              {settings.dynamicBufferEnabled !== false ? (
                <div className="text-xs text-blue-200 bg-blue-950/70 px-3 py-1.5 rounded-lg border border-blue-400/40 flex items-center gap-1.5" title="Buffer Dinâmico Inteligente: modula a retenção com base na duração dos contratos, contas a pagar e segurança contra riscos da plataforma">
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
                  <span>Buffer dinâmico: <strong>{formatPercentBR(roadmap.dynamicBufferAvg ?? 0)} médio</strong> · blindagem de <strong>{formatPercentBR(roadmap.initialCapitalSecuredPercent ?? 0, 0)}</strong></span>
                </div>
              ) : (settings.reinvestmentBufferPercentage ?? 0) > 0 ? (
                <div className="text-xs text-teal-200 bg-teal-950/60 px-3 py-1.5 rounded-lg border border-teal-500/40 flex items-center gap-1.5" title={`Buffer de ${settings.reinvestmentBufferPercentage}% mantido em caixa livre; ${100 - (settings.reinvestmentBufferPercentage ?? 0)}% aplicado em novas cotas`}>
                  <ShieldCheck className="h-3.5 w-3.5 text-teal-400" />
                  <span>Buffer Ativo: <strong>{settings.reinvestmentBufferPercentage}% caixa</strong> ({100 - (settings.reinvestmentBufferPercentage ?? 0)}% reinvestido)</span>
                </div>
              ) : null}

              <div className="text-xs text-slate-300 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 shrink-0 self-start md:self-auto">
                <span>Reinvestimento em cotas de </span>
                <strong className="text-white font-semibold">{formatCurrency(roadmap.reinvestmentUnitUsed.price)}</strong>
                <span> ({roadmap.reinvestmentUnitUsed.dailyPercentage}%/dia)</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* 1. Rendimento Hoje */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3.5 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tracking-normal block">
                Renda diária atual
              </span>
              <div className="text-lg sm:text-xl font-bold font-display text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatCurrency(roadmap.currentDailyYield)}
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">/dia</span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                <span>{formatPercentBR(roadmap.percentOfGoalReached)} da meta diária</span>
              </div>
            </div>

            {/* 2. Meta Diária */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3.5 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tracking-normal block">
                Meta diária alvo
              </span>
              <div className="text-lg sm:text-xl font-bold font-display text-slate-900 dark:text-slate-100 mt-0.5">
                {formatCurrency(roadmap.targetDailyYield)}
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">/dia</span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                R$ {(roadmap.targetDailyYield * 30).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/mês projetado
              </div>
            </div>

            {/* 3. Prazo até a Meta */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3.5 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tracking-normal block">
                Prazo até a meta
              </span>
              <div className="text-lg sm:text-xl font-bold font-display text-teal-700 dark:text-teal-400 mt-0.5">
                {roadmap.daysToGoal !== null ? `${roadmap.daysToGoal} dias` : 'Em progresso'}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {roadmap.estimatedGoalDateFormatted ? `Previsão: ${roadmap.estimatedGoalDateFormatted}` : 'Acelere com novos aportes'}
              </div>
            </div>

            {/* 4. Total a Reinvestir ou Gastos */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3.5 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tracking-normal block">
                Reinvestimentos projetados
              </span>
              <div className="text-lg sm:text-xl font-bold font-display text-blue-700 dark:text-blue-400 mt-0.5">
                {formatCurrency(roadmap.totalReinvested)}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {totalExpensesInRoadmap > 0 && includeExpenses
                  ? `${formatCurrency(totalExpensesInRoadmap)} em saques p/ despesas`
                  : 'Sem tirar do bolso (com lucros)'}
              </div>
            </div>
          </div>

          {/* Dynamic Protection Summary Strip (Intelligent Buffer & Platform Instability Shield) */}
          {settings.dynamicBufferEnabled !== false && (
            <div className="bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-blue-950 dark:text-blue-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-lg shrink-0">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                      Blindagem de capital & mitigação de risco
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700">
                      Perfil {settings.protectionProfile === 'conservative' ? 'Conservador' : settings.protectionProfile === 'aggressive' ? 'Acelerado' : 'Equilibrado'}
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-800/90 dark:text-blue-300/90 mt-0.5 leading-snug">
                    {roadmap.protectionSummaryTip || 'O algoritmo equilibra o reinvestimento com pontos de segurança para você resgatar capital e não ficar 100% exposto.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-blue-200/60 dark:border-blue-800/60">
                <div className="text-right">
                  <span className="text-xs text-blue-700 dark:text-blue-300 font-semibold block">Reserva protegida sugerida</span>
                  <span className="text-sm sm:text-base font-bold text-blue-900 dark:text-blue-100 font-display block">
                    {formatCurrency(roadmap.totalProtectedAmountSuggested ?? 0)}
                  </span>
                  {(roadmap.protectionCheckpointsCount ?? 0) > 0 ? (
                    <span className="text-xs text-blue-600/90 dark:text-blue-400 font-medium block">
                      {roadmap.protectionCheckpointsCount} {roadmap.protectionCheckpointsCount === 1 ? 'marco' : 'marcos'} de segurança
                    </span>
                  ) : (roadmap.totalProtectedAmountSuggested ?? 0) > 0 ? (
                    <span className="text-xs text-blue-600/90 dark:text-blue-400 font-medium block">
                      Blindagem diária ativa
                    </span>
                  ) : null}
                </div>
                <div className="pl-3 border-l border-blue-200 dark:border-blue-800 text-right">
                  <span className="text-xs text-blue-700 dark:text-blue-300 font-semibold block">Payback salvo</span>
                  <span className="text-sm sm:text-base font-bold text-emerald-700 dark:text-emerald-400 font-display">
                    {formatPercentBR(roadmap.initialCapitalSecuredPercent ?? 0, 0)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Banner do Período de Otimização & Redução de Produtos Pós-Meta */}
          {roadmap.optimizationSummary?.isOptimizationActive && (
            <div className="bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/90 dark:border-indigo-900/60 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-indigo-950 dark:text-indigo-200 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-lg shrink-0 border border-indigo-200 dark:border-indigo-800">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                      Período de Otimização de Produtos
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                      roadmap.optimizationSummary.isOptimized
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                        : 'bg-indigo-100 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-200 border-indigo-300 dark:border-indigo-700'
                    }`}>
                      {roadmap.optimizationSummary.isOptimized ? 'Carteira Mínima Atingida' : 'Consolidação Ativa'}
                    </span>
                  </div>
                  <p className="text-[11px] text-indigo-900/90 dark:text-indigo-300/90 mt-0.5 leading-snug">
                    {roadmap.optimizationSummary.statusDescription} — mantendo a meta de {formatCurrency(roadmap.targetDailyYield)}/dia com máxima simplicidade de gestão.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-indigo-200/60 dark:border-indigo-800/60">
                <div className="text-right">
                  <span className="text-xs text-indigo-700 dark:text-indigo-300 font-semibold block">Carteira Projetada</span>
                  <span className="text-sm sm:text-base font-bold text-indigo-950 dark:text-indigo-100 font-display block">
                    {roadmap.optimizationSummary.optimizedContractsCount} {roadmap.optimizationSummary.optimizedContractsCount === 1 ? 'produto' : 'produtos'}
                  </span>
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium block">
                    pós-consolidação (mín: {roadmap.optimizationSummary.minPossibleContracts})
                  </span>
                </div>
                {roadmap.optimizationSummary.contractsReduced > 0 && (
                  <div className="pl-3 border-l border-indigo-200 dark:border-indigo-800 text-right">
                    <span className="text-xs text-indigo-700 dark:text-indigo-300 font-semibold block">Redução</span>
                    <span className="text-sm sm:text-base font-bold text-emerald-700 dark:text-emerald-400 font-display block">
                      -{roadmap.optimizationSummary.reductionPercentage}%
                    </span>
                    <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 block">
                      de {roadmap.optimizationSummary.initialContractsAtGoal} p/ {roadmap.optimizationSummary.optimizedContractsCount}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SVG Interactive Chart */}
          <div className="space-y-3">
            {/* Chart Header & Controls Toolbar */}
            <div className="flex flex-col gap-2.5 pb-1">
              {/* Top Action Row: Navigation & Zoom Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                {/* Left: View Mode Toggle & Day Stepper */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Zoom / Scroll Mode Toggle */}
                  <div className="inline-flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700 text-xs">
                    <button
                      type="button"
                      onClick={() => setIsExpandedScroll(true)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                        isExpandedScroll
                          ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                      title="Modo expandido com rolagem horizontal: pontos grandes e fáceis de tocar"
                    >
                      <ZoomIn className="h-3.5 w-3.5" />
                      <span>Detalhado (Rolagem)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsExpandedScroll(false)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                        !isExpandedScroll
                          ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                      title="Ajustar todo o gráfico à tela"
                    >
                      <ZoomOut className="h-3.5 w-3.5" />
                      <span>Ajustar à tela</span>
                    </button>
                  </div>

                  {/* Day Navigation Stepper */}
                  {roadmap.chartData && roadmap.chartData.length > 0 && (
                    <div className="inline-flex items-center gap-1 bg-slate-50 dark:bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setHoveredIndex((prev) => {
                            const cur = prev !== null ? prev : 0;
                            return Math.max(0, cur - 1);
                          });
                        }}
                        disabled={hoveredIndex === 0}
                        className="p-1 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 disabled:opacity-30 cursor-pointer"
                        title="Dia anterior"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 px-1 font-mono">
                        {hoveredIndex !== null ? `Dia ${roadmap.chartData[hoveredIndex]?.day}` : 'Navegar'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setHoveredIndex((prev) => {
                            const cur = prev !== null ? prev : -1;
                            return Math.min(roadmap.chartData.length - 1, cur + 1);
                          });
                        }}
                        disabled={hoveredIndex === roadmap.chartData.length - 1}
                        className="p-1 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 disabled:opacity-30 cursor-pointer"
                        title="Próximo dia"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Right: Roadmap Overview Modal Button */}
                <button
                  type="button"
                  onClick={() => {
                    const latestOrFirst = roadmap.chartData[roadmap.chartData.length - 1];
                    if (latestOrFirst) openDayDetails(latestOrFirst.day);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800/80 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Ver tabela do roadmap</span>
                </button>
              </div>

              {/* Legend Strip with Horizontal Scroll */}
              <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                  <span className="font-medium text-slate-700 dark:text-slate-300">Renda diária</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-3.5 h-0.5 bg-rose-400 border-t-2 border-dashed border-rose-400 inline-block" />
                  <span className="font-medium text-rose-600 dark:text-rose-400">Meta ({formatCurrency(roadmap.targetDailyYield)}/dia)</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 border-2 border-emerald-300 dark:border-emerald-500 inline-block shadow-xs" />
                  <span className="font-medium text-emerald-800 dark:text-emerald-300">Novo aporte</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-white dark:bg-slate-900 border-2 border-emerald-600 inline-block" />
                  <span className="font-medium text-emerald-700 dark:text-emerald-400">Reinvestimento</span>
                </div>
                {totalExpensesInRoadmap > 0 && includeExpenses && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-white dark:border-slate-800 inline-block" />
                    <span className="font-medium text-amber-700 dark:text-amber-400">Saque despesa</span>
                  </div>
                )}
                {(roadmap.protectionCheckpointsCount ?? 0) > 0 && (
                  <div className="flex items-center gap-1.5 shrink-0" title="Marcos estruturais de segurança: atingimento de 10%, 25%, 50%, 75% ou 100% de Payback e Devoluções de Capital">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 border border-white dark:border-slate-800 inline-block shadow-xs" />
                    <span className="font-medium text-blue-700 dark:text-blue-400">Marco de proteção</span>
                  </div>
                )}
                {(roadmap.totalProtectedAmountSuggested ?? 0) > 0 && (
                  <div className="flex items-center gap-1.5 shrink-0" title="Dias com retenção diária de fluxo para blindagem segura de capital fora da plataforma">
                    <span className="w-3 h-3 rounded-full border border-dashed border-blue-500 bg-blue-50 dark:bg-blue-950 inline-block" />
                    <span className="font-medium text-blue-600 dark:text-blue-400">Blindagem ativa</span>
                  </div>
                )}
              </div>
            </div>

            {/* Alerta de despesas sem cobertura */}
            {roadmap.unfundableExpenses.length > 0 && (
              <div className="mb-3 p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-rose-900 dark:text-rose-200">
                      {roadmap.unfundableExpenses.length === 1
                        ? 'Uma despesa não é coberta pelos rendimentos projetados'
                        : `${roadmap.unfundableExpenses.length} despesas não são cobertas pelos rendimentos projetados`}
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {roadmap.unfundableExpenses.map((item) => (
                        <li key={item.expenseId} className="text-xs text-rose-800 dark:text-rose-300 flex flex-wrap gap-x-2">
                          <span className="font-semibold">{item.title}</span>
                          <span>{formatCurrency(item.amount)}</span>
                          <span className="text-rose-700 dark:text-rose-400">
                            (saque necessário: {formatCurrency(item.requiredGrossWithdrawal)})
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-rose-700 dark:text-rose-400 mt-1.5">
                      Elas seguem em aberto na projeção e precisam de aporte externo. O caixa foi
                      liberado para o reinvestimento continuar.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Chart Viewport Wrapper */}
            <div
              ref={chartWrapRef}
              className="w-full relative bg-slate-50/50 dark:bg-slate-950/60 rounded-xl border border-slate-200/80 dark:border-slate-800 p-2 sm:p-4 overflow-hidden"
            >
              {(() => {
                const data = roadmap.chartData;
                if (!data || data.length === 0) return null;

                const maxY = Math.max(roadmap.targetDailyYield * 1.15, ...data.map((d) => d.dailyYield), 10);
                
                // Dimensões do SVG: no modo expandido, dá 30px de largura por dia para nunca encavalar pontos
                const isScrollMode = isExpandedScroll;
                const width = isScrollMode ? Math.max(760, data.length * 30) : 700;
                const height = 280;
                const padL = 68;
                const padR = 32;
                const padT = 24;
                const padB = 40;
                const graphW = width - padL - padR;
                const graphH = height - padT - padB;

                const points = data.map((d, i) => {
                  const x = padL + (i / Math.max(1, data.length - 1)) * graphW;
                  const y = padT + graphH - (d.dailyYield / maxY) * graphH;
                  return { x, y, d, i };
                });

                const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
                const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(padT + graphH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padT + graphH).toFixed(1)} Z`;
                const targetY = padT + graphH - (roadmap.targetDailyYield / maxY) * graphH;

                const activePoint = hoveredIndex !== null && points[hoveredIndex] 
                  ? points[hoveredIndex] 
                  : null;

                const sliceWidth = data.length > 1 ? graphW / (data.length - 1) : graphW;

                // Fator de escala da fonte SVG
                const svgScale = !isScrollMode && chartPixelWidth > 0 ? chartPixelWidth / width : 1;
                const fs = (base: number) => Math.round((Math.max(11, base) / Math.max(0.4, svgScale)) * 10) / 10;

                return (
                  <div className="flex flex-col space-y-2">
                    {/* Mobile Swipe Hint when in scroll mode */}
                    {isScrollMode && (
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1 pb-1">
                        <span className="flex items-center gap-1.5 font-medium">
                          <MoveHorizontal className="h-3.5 w-3.5 text-emerald-500" />
                          <span>Deslize para os lados para navegar pelos dias</span>
                        </span>
                        <span className="font-mono text-slate-400">
                          {data.length} dias projetados
                        </span>
                      </div>
                    )}

                    {/* Scrollable Container */}
                    <div
                      ref={scrollContainerRef}
                      className={`w-full ${
                        isScrollMode ? 'overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 touch-pan-x' : 'overflow-hidden'
                      }`}
                    >
                      <div
                        style={{
                          width: isScrollMode ? `${width}px` : '100%',
                          minWidth: isScrollMode ? `${width}px` : '100%',
                        }}
                        className="relative"
                        onMouseLeave={() => setHoveredIndex(null)}
                      >
                        <svg
                          viewBox={`0 0 ${width} ${height}`}
                          style={{ width: '100%', height: `${height}px` }}
                          className="overflow-visible select-none"
                        >
                          <defs>
                            <linearGradient id="compoundingRoadmapGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                              <stop offset="60%" stopColor="#10b981" stopOpacity="0.1" />
                              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          {/* Grid Lines */}
                          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                            const yVal = padT + graphH * (1 - ratio);
                            const labelVal = maxY * ratio;
                            return (
                              <g key={ratio}>
                                <line
                                  x1={padL}
                                  y1={yVal}
                                  x2={width - padR}
                                  y2={yVal}
                                  stroke="#e2e8f0"
                                  strokeWidth="1"
                                  strokeDasharray="2 2"
                                  className="dark:stroke-slate-800"
                                />
                                <text
                                  x={padL - 10}
                                  y={yVal + 4}
                                  textAnchor="end"
                                  fontSize={fs(10)}
                                  fill="#64748b"
                                  fontWeight="600"
                                  className="dark:fill-slate-400"
                                >
                                  R$ {formatNumberBR(labelVal, 0)}
                                </text>
                              </g>
                            );
                          })}

                          {/* Meta Target Reference Line */}
                          {targetY >= padT && targetY <= padT + graphH && (
                            <g>
                              <line
                                x1={padL}
                                y1={targetY}
                                x2={width - padR}
                                y2={targetY}
                                stroke="#f43f5e"
                                strokeWidth="2"
                                strokeDasharray="5 4"
                              />
                              <rect
                                x={padL + 8}
                                y={targetY - 18}
                                width={160}
                                height={18}
                                rx={4}
                                fill="#ffe4e6"
                                className="dark:fill-rose-950/80"
                              />
                              <text
                                x={padL + 14}
                                y={targetY - 5}
                                textAnchor="start"
                                fontSize={fs(10)}
                                fontWeight="bold"
                                fill="#e11d48"
                                className="dark:fill-rose-400"
                              >
                                Meta {formatCurrency(roadmap.targetDailyYield)}/dia
                              </text>
                            </g>
                          )}

                          {/* Area Fill */}
                          <path d={areaPath} fill="url(#compoundingRoadmapGrad)" />

                          {/* Curve Stroke */}
                          <path
                            d={linePath}
                            fill="none"
                            stroke="#059669"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="drop-shadow-xs"
                          />

                          {/* Vertical indicator line for active hovered point */}
                          {activePoint && (
                            <g pointerEvents="none">
                              <line
                                x1={activePoint.x}
                                y1={padT}
                                x2={activePoint.x}
                                y2={padT + graphH}
                                stroke="#10b981"
                                strokeWidth="2"
                                strokeDasharray="3 3"
                              />
                            </g>
                          )}

                          {/* Invisible Touch / Click Hit Targets with generous width */}
                          {points.map((p) => {
                            const hitWidth = Math.max(sliceWidth, 32);
                            return (
                              <rect
                                key={`hit-${p.i}`}
                                x={p.x - hitWidth / 2}
                                y={padT}
                                width={hitWidth}
                                height={graphH}
                                fill="transparent"
                                style={{ cursor: 'pointer' }}
                                onPointerEnter={() => setHoveredIndex(p.i)}
                                onPointerDown={() => setHoveredIndex(p.i)}
                                onClick={() => {
                                  setHoveredIndex(p.i);
                                  openDayDetails(p.d.day);
                                }}
                              />
                            );
                          })}

                          {/* Render Points on the Curve */}
                          {points.map((p) => {
                            const isHovered = hoveredIndex === p.i;
                            const isGoal = p.d.dailyYield >= roadmap.targetDailyYield && p.d.day === roadmap.daysToGoal;
                            const isStartPoint = p.d.isStartDate || (settings.goalCycleStartDate ? p.d.date === settings.goalCycleStartDate : p.d.day === 0);
                            const hasNewInvestment = (p.d.newInvestmentsToday ?? 0) > 0;
                            const isReinvestment = p.d.reinvestedToday > 0;
                            const hasExpense = (p.d.expensesDeductedToday ?? 0) > 0;
                            const hasProtection = p.d.isProtectionPoint;

                            // Tamanhos aumentados e destacados
                            const baseRadius = isScrollMode ? 6 : 4.5;

                            return (
                              <g
                                key={p.i}
                                className="cursor-pointer"
                                pointerEvents="none"
                              >
                                {/* Start Point Highlight Ring */}
                                {isStartPoint && (
                                  <circle
                                    cx={p.x}
                                    cy={p.y}
                                    r={baseRadius + 5}
                                    fill="none"
                                    stroke="#047857"
                                    strokeWidth="2.5"
                                    opacity="0.9"
                                  />
                                )}

                                {/* Goal Point Pulse Halo */}
                                {isGoal && (
                                  <circle
                                    cx={p.x}
                                    cy={p.y}
                                    r={baseRadius + 6}
                                    fill="#f43f5e"
                                    fillOpacity="0.25"
                                    stroke="#f43f5e"
                                    strokeWidth="2"
                                    strokeDasharray="3 2"
                                  />
                                )}

                                {/* Main Node Circle */}
                                <circle
                                  cx={p.x}
                                  cy={p.y}
                                  r={
                                    isHovered
                                      ? baseRadius + 4
                                      : isGoal
                                      ? baseRadius + 3
                                      : hasProtection
                                      ? baseRadius + 2
                                      : hasNewInvestment
                                      ? baseRadius + 2
                                      : hasExpense
                                      ? baseRadius + 1.5
                                      : isReinvestment
                                      ? baseRadius + 1
                                      : baseRadius
                                  }
                                  fill={
                                    isHovered
                                      ? '#10b981'
                                      : isGoal
                                      ? '#f43f5e'
                                      : hasProtection
                                      ? '#2563eb'
                                      : hasNewInvestment
                                      ? '#059669'
                                      : hasExpense
                                      ? '#f59e0b'
                                      : isReinvestment
                                      ? '#ffffff'
                                      : (p.d.suggestedProtectionToday ?? 0) > 0
                                      ? '#3b82f6'
                                      : '#10b981'
                                  }
                                  stroke={
                                    isHovered
                                      ? '#ffffff'
                                      : isGoal
                                      ? '#ffffff'
                                      : hasProtection
                                      ? '#bfdbfe'
                                      : hasNewInvestment
                                      ? '#a7f3d0'
                                      : hasExpense
                                      ? '#ffffff'
                                      : isReinvestment
                                      ? '#059669'
                                      : '#ffffff'
                                  }
                                  strokeWidth={isHovered ? '3' : isReinvestment ? '2.5' : '2'}
                                  className="transition-all duration-150 shadow-sm"
                                />

                                {/* Active Halo on hover */}
                                {isHovered && (
                                  <circle
                                    cx={p.x}
                                    cy={p.y}
                                    r={baseRadius + 7}
                                    fill="none"
                                    stroke="#10b981"
                                    strokeWidth="2"
                                    opacity="0.6"
                                  />
                                )}
                              </g>
                            );
                          })}

                          {/* Smart Non-Colliding X-Axis Labels */}
                          {(() => {
                            if (points.length === 0) return null;

                            // Decide quais pontos exibir no eixo X evitando sobreposição
                            const minSpacing = isScrollMode ? 70 : 85;
                            const visibleIndices: number[] = [];
                            let lastX = -999;

                            points.forEach((p, idx) => {
                              const isFirst = idx === 0;
                              const isLast = idx === points.length - 1;
                              const isGoal = p.d.dailyYield >= roadmap.targetDailyYield && p.d.day === roadmap.daysToGoal;

                              // Sempre incluir primeiro e último ponto
                              if (isFirst) {
                                visibleIndices.push(idx);
                                lastX = p.x;
                              } else if (isLast) {
                                // Se o último colidir com o anterior, remove o anterior se não for o primeiro
                                if (p.x - lastX < minSpacing && visibleIndices.length > 1) {
                                  visibleIndices.pop();
                                }
                                visibleIndices.push(idx);
                              } else if (isGoal && p.x - lastX >= minSpacing * 0.8) {
                                visibleIndices.push(idx);
                                lastX = p.x;
                              } else if (p.x - lastX >= minSpacing) {
                                visibleIndices.push(idx);
                                lastX = p.x;
                              }
                            });

                            return visibleIndices.map((idx) => {
                              const p = points[idx];
                              if (!p) return null;
                              const isFirst = idx === 0;
                              const isLast = idx === points.length - 1;
                              const textAnchor = isFirst ? 'start' : isLast ? 'end' : 'middle';

                              return (
                                <g key={`xlabel-${idx}`}>
                                  {/* Tick marker */}
                                  <line
                                    x1={p.x}
                                    y1={padT + graphH}
                                    x2={p.x}
                                    y2={padT + graphH + 5}
                                    stroke="#94a3b8"
                                    strokeWidth="1.5"
                                  />
                                  <text
                                    x={p.x}
                                    y={height - 18}
                                    textAnchor={textAnchor}
                                    fontSize={fs(10)}
                                    fill="#475569"
                                    fontWeight="600"
                                    className="dark:fill-slate-300 font-sans"
                                  >
                                    {p.d.dateFormatted}
                                  </text>
                                  <text
                                    x={p.x}
                                    y={height - 5}
                                    textAnchor={textAnchor}
                                    fontSize={fs(9)}
                                    fill="#64748b"
                                    fontWeight="bold"
                                    className="dark:fill-slate-400 font-mono"
                                  >
                                    Dia {p.d.day}
                                  </text>
                                </g>
                              );
                            });
                          })()}
                        </svg>
                      </div>
                    </div>

                    {/* Active Day Quick Inspector Card (Touch-Friendly & Clear on Mobile) */}
                    {(() => {
                      const displayedPoint = activePoint || points[0];
                      if (!displayedPoint) return null;
                      const d = displayedPoint.d;
                      const isGoal = d.dailyYield >= roadmap.targetDailyYield && d.day === roadmap.daysToGoal;
                      const isStartPoint = d.isStartDate || (settings.goalCycleStartDate ? d.date === settings.goalCycleStartDate : d.day === 0);

                      return (
                        <div className="mt-2 bg-slate-900 text-white p-3.5 sm:p-4 rounded-xl border border-slate-700/80 shadow-md">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-slate-400 font-mono">
                                Dia {d.day} ({d.dateFormatted})
                              </span>
                              {isStartPoint && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                  <Flag className="h-2.5 w-2.5 fill-emerald-400 text-emerald-400" />
                                  Ponto de Início
                                </span>
                              )}
                              {isGoal && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                  <Target className="h-2.5 w-2.5 text-rose-400" />
                                  Meta Atingida!
                                </span>
                              )}
                              {d.reinvestedToday > 0 && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                                  Reinvestimento: +{formatCurrency(d.reinvestedToday)}
                                </span>
                              )}
                              {(d.expensesDeductedToday ?? 0) > 0 && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800">
                                  Saque despesa: -{formatCurrency(d.expensesDeductedToday!)}
                                </span>
                              )}
                              {(d.suggestedProtectionToday ?? 0) > 0 && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800">
                                  Blindagem salva: +{formatCurrency(d.suggestedProtectionToday!)}
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => openDayDetails(d.day)}
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shrink-0"
                            >
                              <span>Ver detalhes completos deste dia</span>
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
                            <div>
                              <span className="text-[11px] text-slate-400 block">Renda diária</span>
                              <span className="text-base sm:text-lg font-bold text-emerald-400 font-display">
                                {formatCurrency(d.dailyYield)}
                                <span className="text-xs font-normal text-slate-400">/dia</span>
                              </span>
                            </div>
                            <div>
                              <span className="text-[11px] text-slate-400 block">Capital ativo</span>
                              <span className="text-sm sm:text-base font-bold text-slate-200 font-display">
                                {formatCurrency(d.activeInvestedAmount)}
                              </span>
                            </div>
                            <div>
                              <span className="text-[11px] text-slate-400 block">Saldo no banco</span>
                              <span className="text-sm sm:text-base font-bold text-emerald-300 font-display">
                                {formatCurrency(d.bankBalance ?? d.cashBalance ?? 0)}
                              </span>
                            </div>
                            <div>
                              <span className="text-[11px] text-slate-400 block">Contratos ativos</span>
                              <span className="text-sm sm:text-base font-bold text-slate-200 font-display">
                                {d.activeContractsCount ?? 0} cotas
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Milestones & Projected Acquisitions Tabbed Section */}
          {(roadmap.milestones.length > 0 || (roadmap.projectedAcquisitions && roadmap.projectedAcquisitions.length > 0)) && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
              {/* Header com Abas Alternáveis */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl w-fit flex-wrap">
                  <button
                    type="button"
                    onClick={() => setRoadmapViewTab('timeline')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      roadmapViewTab === 'timeline'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Route className="h-3.5 w-3.5" />
                    <span>Passo a passo</span>
                    {totalMilestones > 0 && (
                      <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 font-extrabold text-slate-700 dark:text-slate-300">
                        {totalMilestones}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setRoadmapViewTab('acquisitions')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      roadmapViewTab === 'acquisitions'
                        ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-300 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-300'
                    }`}
                  >
                    <ShoppingBag className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Produtos a adquirir no ciclo</span>
                    <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-extrabold">
                      {roadmap.totalProjectedAcquisitionsCount ?? 0} cotas
                    </span>
                  </button>
                </div>

                {roadmapViewTab === 'timeline' && (
                  <div className="flex items-center gap-2.5 self-end sm:self-auto flex-wrap">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                      {totalMilestones > 0 ? `${milestoneStartIndex + 1}–${milestoneEndIndex} de ${totalMilestones} ${groupByDay ? 'dias' : 'eventos'}` : '0'}
                    </span>

                    {/* Toggle para Agrupar por Dia */}
                    <button
                      type="button"
                      onClick={() => {
                        setGroupByDay(!groupByDay);
                        setMilestonesPage(0);
                      }}
                      className={`text-xs font-semibold px-2 py-0.5 rounded-md border transition-all flex items-center gap-1 cursor-pointer ${
                        groupByDay
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900'
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                      title={groupByDay ? 'Eventos do mesmo dia agrupados (clique para ver individualmente)' : 'Eventos individuais (clique para agrupar por dia)'}
                    >
                      <span>{groupByDay ? 'Agrupado por dia' : 'Eventos individuais'}</span>
                    </button>

                    {/* Navegação Voltar / Próximos 4 */}
                    {totalMilestones > itemsPerPage && (
                      <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => setMilestonesPage((p) => Math.max(0, p - 1))}
                          disabled={currentMilestonesPage === 0}
                          className={`px-2 py-1 rounded-md flex items-center gap-1 text-xs font-semibold transition-all ${
                            currentMilestonesPage === 0
                              ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                              : 'text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-slate-900 shadow-xs cursor-pointer'
                          }`}
                          title={`Ver 4 ${groupByDay ? 'dias' : 'eventos'} anteriores`}
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                          <span className="text-[11px]">Voltar</span>
                        </button>

                        <span className="text-xs text-slate-500 dark:text-slate-400 font-bold px-1.5 select-none">
                          {currentMilestonesPage + 1}/{totalMilestonesPages}
                        </span>

                        <button
                          type="button"
                          onClick={() => setMilestonesPage((p) => Math.min(totalMilestonesPages - 1, p + 1))}
                          disabled={milestoneStartIndex + itemsPerPage >= totalMilestones}
                          className={`px-2 py-1 rounded-md flex items-center gap-1 text-xs font-semibold transition-all ${
                            milestoneStartIndex + itemsPerPage >= totalMilestones
                              ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                              : 'text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-slate-900 shadow-xs cursor-pointer'
                          }`}
                          title={`Ver próximos 4 ${groupByDay ? 'dias' : 'eventos'}`}
                        >
                          <span className="text-[11px]">Próximos 4</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}

                    <button
                      onClick={onNavigateToProducts}
                      className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <span>Ver Todos os Produtos</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* ABA 1: PASSO A PASSO (TIMELINE) */}
              {roadmapViewTab === 'timeline' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {visibleMilestones.map((item, idx) => {
                    const m = item as any;
                    const isGrouped = 'events' in m;
                    const matchingPoint = roadmap.chartData.find((pt) => pt.day === m.dayNumber);
                    const isMultiEvent = isGrouped && m.events.length > 1;

                    return (
                      <div
                        key={`${m.date}-${milestoneStartIndex + idx}`}
                        onClick={() => {
                          if (matchingPoint) openDayDetails(matchingPoint.day);
                        }}
                        className={`p-3 rounded-xl border transition-all text-xs cursor-pointer hover:shadow-xs flex flex-col justify-between ${
                          (m.primaryType || m.type) === 'goal_reached'
                            ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-950 dark:text-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/60 hover:border-rose-300'
                            : (m.primaryType || m.type) === 'optimization_completed'
                              ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/50 hover:border-indigo-400'
                              : (m.primaryType || m.type) === 'optimization_start'
                                ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/60 text-indigo-900 dark:text-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 hover:border-indigo-300'
                                : (m.primaryType || m.type) === 'capital_protection'
                                  ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60 text-blue-950 dark:text-blue-200 hover:bg-blue-100/70 dark:hover:bg-blue-900/50 hover:border-blue-300'
                                  : (m.primaryType || m.type) === 'new_investment'
                                    ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/50 hover:border-emerald-400'
                                    : (m.primaryType || m.type) === 'goal_maintenance'
                                      ? 'bg-teal-50/70 dark:bg-teal-950/40 border-teal-200 dark:border-teal-900/60 text-teal-950 dark:text-teal-200 hover:bg-teal-50 dark:hover:bg-teal-950/60 hover:border-teal-300'
                                      : (m.primaryType || m.type) === 'expense_withdrawal'
                                        ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-950 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/60 hover:border-amber-300'
                                        : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:border-emerald-300 dark:hover:border-emerald-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1 gap-1">
                            <span className="font-semibold truncate max-w-[130px]" title={m.title}>
                              {m.title}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              {settings.completedRoadmapDays?.includes(m.date) && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-300 font-extrabold border border-emerald-300 dark:border-emerald-500/40 flex items-center gap-0.5">
                                  ✓ Concluído
                                </span>
                              )}
                              {isMultiEvent && (
                                <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-100/90 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200/60 dark:border-emerald-800/60">
                                  {m.events.length} ações
                                </span>
                              )}
                              <span className={`text-xs px-2 py-0.5 rounded-md font-medium shrink-0 ${
                                (m.primaryType || m.type) === 'goal_reached'
                                  ? 'bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200 font-bold'
                                  : (m.primaryType || m.type) === 'optimization_completed'
                                    ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-200 font-bold border border-indigo-200 dark:border-indigo-700'
                                    : (m.primaryType || m.type) === 'optimization_start'
                                      ? 'bg-indigo-100/70 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800'
                                      : (m.primaryType || m.type) === 'capital_protection'
                                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-200 font-bold border border-blue-200 dark:border-blue-700'
                                        : (m.primaryType || m.type) === 'new_investment'
                                          ? 'bg-emerald-200/80 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 font-bold border border-emerald-300 dark:border-emerald-700'
                                          : (m.primaryType || m.type) === 'goal_maintenance'
                                            ? 'bg-teal-100 dark:bg-teal-900 text-teal-900 dark:text-teal-200 font-bold'
                                            : (m.primaryType || m.type) === 'expense_withdrawal'
                                              ? 'bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-200 font-bold'
                                              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                              }`}>
                                {m.dateFormatted}
                              </span>
                            </div>
                          </div>

                          {/* Descrição ou lista detalhada quando agrupado */}
                          {isMultiEvent ? (
                            <div className="space-y-1 my-1.5 bg-white/75 dark:bg-slate-900/80 rounded-lg p-1.5 border border-slate-200/60 dark:border-slate-800/80">
                              {m.events.map((ev: any, evIdx: number) => {
                                const isExpense = ev.type === 'expense_withdrawal';
                                const isNew = ev.type === 'new_investment';
                                const isProt = ev.type === 'capital_protection';
                                const label = isExpense
                                  ? ev.title
                                  : isNew
                                    ? ev.title
                                    : isProt
                                      ? ev.title
                                      : ev.title.replace('Reinvestimento ', '');

                                return (
                                  <div key={evIdx} className="text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between gap-1">
                                    <span className="truncate max-w-[130px]">
                                      • {label}
                                    </span>
                                    {isExpense ? (
                                      <div className="text-right shrink-0">
                                        <span className="font-bold text-amber-900 dark:text-amber-300 block">
                                          Pagar: {formatCurrency(ev.expenseAmount ?? ev.amount)}
                                        </span>
                                        {ev.amount && (
                                          <span className="text-[11px] text-amber-700 dark:text-amber-400 block font-medium">
                                            {(ev.feeAmount ?? 0) > 0 ? 'Saque bruto' : 'Saque'}: -{formatCurrency(ev.amount)}
                                          </span>
                                        )}
                                      </div>
                                    ) : isProt ? (
                                      <span className="font-bold text-blue-700 dark:text-blue-300 shrink-0">
                                        Salvo: {formatCurrency(ev.protectionAmount ?? ev.amount)}
                                      </span>
                                    ) : ev.amount ? (
                                      <span className={`font-semibold shrink-0 ${isNew ? 'text-emerald-800 dark:text-emerald-300' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                        +{formatCurrency(ev.amount)}
                                      </span>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                              {isGrouped ? m.events[0]?.description : m.description}
                            </p>
                          )}
                        </div>

                        <div className="mt-2 pt-1 border-t border-slate-200/50 dark:border-slate-800/80 flex items-center justify-between">
                          <span className={`text-[11px] font-bold ${
                            (m.primaryType || m.type) === 'capital_protection'
                              ? 'text-blue-700 dark:text-blue-400'
                              : (m.primaryType || m.type) === 'expense_withdrawal' && (!isGrouped || m.totalReinvested === 0)
                                ? 'text-amber-800 dark:text-amber-400' 
                                : 'text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {isGrouped ? (
                              m.primaryType === 'capital_protection'
                                ? `Salvo: ${formatCurrency(m.totalProtectedAmount || m.events[0]?.protectionAmount || 0)}`
                                : m.totalReinvested > 0 && m.totalWithdrawals > 0
                                  ? `Reinv: ${formatCurrency(m.totalReinvested)} | Pagar: ${formatCurrency(m.totalExpensesToPay)}`
                                  : m.totalReinvested > 0
                                    ? `Reinvestido: ${formatCurrency(m.totalReinvested)}`
                                    : m.totalWithdrawals > 0
                                      ? `Pagar: ${formatCurrency(m.totalExpensesToPay)} (${(m.totalWithdrawalFees ?? 0) > 0 ? 'Saque bruto' : 'Saque'}: -${formatCurrency(m.totalWithdrawals)})`
                                      : m.totalNewInvestments > 0
                                        ? `Novo investimento: +${formatCurrency(m.totalNewInvestments)}`
                                        : `Renda: ${formatCurrency(m.finalDailyYield)}/dia`
                            ) : (
                              m.type === 'capital_protection'
                                ? `Salvo: ${formatCurrency(m.protectionAmount ?? m.amount)}`
                                : m.type === 'expense_withdrawal'
                                  ? `Pagar: ${formatCurrency(m.expenseAmount ?? m.amount)} (${(m.feeAmount ?? 0) > 0 ? 'Saque bruto' : 'Saque'}: -${formatCurrency(m.amount)})`
                                  : m.type === 'new_investment' && m.amount
                                    ? `Novo investimento: +${formatCurrency(m.amount)}`
                                    : `Renda: ${formatCurrency(m.dailyYieldAfter)}/dia`
                            )}
                          </span>
                          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium hover:text-emerald-600 dark:hover:text-emerald-400">
                            Ver dia
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ABA 2: PRODUTOS A ADQUIRIR AO LONGO DO PROCESSO */}
              {roadmapViewTab === 'acquisitions' && (
                <div className="space-y-3">
                  {/* Explanatory Banner */}
                  <div className="p-3.5 rounded-xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200">
                    <div className="flex items-start gap-2.5">
                      <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                            Produtos & Cotas a Adquirir para Alcançar a Meta
                          </h4>
                          <span className="text-xs font-bold bg-emerald-100 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 px-2.5 py-0.5 rounded-md">
                            {roadmap.totalProjectedAcquisitionsCount} {roadmap.totalProjectedAcquisitionsCount === 1 ? 'cota necessária' : 'cotas necessárias'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                          Estes são os produtos que você precisará adquirir com o reinvestimento automático dos seus lucros diários para elevar sua renda diária atual de <strong>{formatCurrency(roadmap.currentDailyYield)}/dia</strong> até a meta de <strong>{formatCurrency(roadmap.targetDailyYield)}/dia</strong>.
                        </p>
                      </div>
                    </div>
                  </div>

                  {(roadmap.projectedAcquisitionsGrouped?.length ?? 0) === 0 ? (
                    <div className="text-center py-8 px-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                      <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">Sua meta já está alcançada!</p>
                      <p className="text-xs mt-1">Sua carteira atual já gera a renda diária estipulada de {formatCurrency(roadmap.targetDailyYield)}/dia sem necessidade de novas cotas.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {roadmap.projectedAcquisitionsGrouped?.map((group) => (
                        <div
                          key={`${group.name}-${group.unitPrice}`}
                          className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/70 bg-white dark:bg-slate-850 shadow-2xs hover:border-emerald-300 dark:hover:border-emerald-700 transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="min-w-0">
                                <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm block truncate" title={group.name}>
                                  {group.name}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  {group.durationDays} dias de vigência por cota
                                </span>
                              </div>
                              <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 shrink-0">
                                {group.totalUnits}x {group.totalUnits === 1 ? 'cota' : 'cotas'}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 my-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs">
                              <div>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Preço unitário:</span>
                                <strong className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(group.unitPrice)}</strong>
                              </div>
                              <div>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Rentabilidade:</span>
                                <strong className="font-bold text-emerald-600 dark:text-emerald-400">{group.dailyPercentage}%/dia</strong>
                              </div>
                              <div>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Total a aplicar:</span>
                                <strong className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(group.totalSpent)}</strong>
                              </div>
                              <div>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Renda diária somada:</span>
                                <strong className="font-bold text-emerald-600 dark:text-emerald-400">+{formatCurrency(group.totalDailyYieldAdded)}/dia</strong>
                              </div>
                            </div>
                          </div>

                          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1.5">
                              Dias programados para compra (clique para abrir):
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {group.scheduledDays.slice(0, 10).map((d: number) => (
                                <button
                                  key={d}
                                  type="button"
                                  onClick={() => openDayDetails(d)}
                                  className="px-2 py-0.5 rounded-md text-xs font-extrabold bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 transition-colors cursor-pointer"
                                  title={`Ver detalhes do Dia ${d} no simulador`}
                                >
                                  Dia {d}
                                </button>
                              ))}
                              {group.scheduledDays.length > 10 && (
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium self-center">
                                  +{group.scheduledDays.length - 10} mais...
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal de Visão Geral Detalhada do Ponto Selecionado */}
      <RoadmapDayDetailsModal
        details={selectedPointDetails}
        onClose={() => setSelectedPointDetails(null)}
        targetDailyYield={roadmap.targetDailyYield}
        settings={settings}
        isStartDate={
          selectedPointDetails
            ? settings.goalCycleStartDate
              ? selectedPointDetails.date === settings.goalCycleStartDate
              : selectedPointDetails.day === 0
            : false
        }
        onSetAsStartDate={(date) => {
          onSetRoadmapStartDate?.(date);
        }}
        onClearStartDate={() => {
          onSetRoadmapStartDate?.(undefined);
        }}
        isDayCompleted={
          selectedPointDetails
            ? settings.completedRoadmapDays?.includes(selectedPointDetails.date) || false
            : false
        }
        onCompleteDay={onCompleteRoadmapDay}
        onUndoCompleteDay={onUndoCompleteRoadmapDay}
      />

      {/* Modal para Definir Nova Meta / Resetar Ciclo */}
      <ResetGoalCycleModal
        isOpen={isResetGoalModalOpen}
        onClose={() => setIsResetGoalModalOpen(false)}
        currentGoalAmount={settings.dailyGoalAmount}
        currentStartDate={settings.goalCycleStartDate}
        onConfirmReset={(newGoalAmount, newStartDate) => {
          if (onResetGoalCycle) {
            onResetGoalCycle(newGoalAmount, newStartDate);
          }
        }}
      />
    </div>
  );
};
