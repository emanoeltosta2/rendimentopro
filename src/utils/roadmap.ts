import {
  InvestmentProduct,
  Expense,
  PlatformSettings,
  PortfolioRoadmapSummary,
  PortfolioRoadmapPoint,
  PortfolioMilestone,
  RoadmapContractSnapshot,
  RoadmapPointDetails,
  ProductTemplate,
  UnfundableExpense,
  ProjectedAcquisitionItem,
  ProjectedAcquisitionGroup,
  PortfolioOptimizationSummary,
} from '../types/investment';
import {
  getTodayString,
  formatPercentBR,
  plural,
  addDays,
  formatDateBR,
  diffInDays,
  formatCurrency,
  calculateAllExpensesOptimizations,
  normalizeSettings,
} from './calculations';
import { DEFAULT_PRODUCT_TEMPLATES } from './storage';

/** Um contrato interno pode representar N cotas idênticas compradas no mesmo dia. */
interface InternalContract {
  id: string;
  name: string;
  unitPrice: number;
  units: number;
  investedAmount: number; // unitPrice * units
  dailyPercentage: number;
  durationDays: number;
  startDay: number;
  endDay: number;
  returnCapitalAtEnd: boolean;
  isReinvestment: boolean;
  isNewInvestment: boolean;
  isInitialPortfolio?: boolean;
}

/** Registro escalar por dia. Os detalhes pesados são reconstruídos sob demanda. */
interface DayRecord {
  day: number;
  date: string;
  dateFormatted: string;
  dailyGross: number;
  dailyNetIfWithdrawn: number;
  accumulatedGrossYield: number;
  cashBalance: number;
  bankBalance: number;
  platformBalance: number;
  reservedForExpenses: number;
  reservedForReinvestment: number;
  dynamicBufferPercentage: number;
  protectedToday: number;
  totalProtectedAccumulated: number;
  riskExposureLevel: 'low' | 'moderate' | 'high';
  protectionTip: string;
  avgRemainingDays: number;
  maxRemainingDays: number;
  capitalInLongContracts: number;
  contractsExpiringSoonCount: number;
  capitalReturnedToday: number;
  expensesDeductedToday: number;
  expensesPaidFromBlindagemToday: number;
  expensesPaidFromFreeBankToday: number;
  totalExpensesDeductedUpToDay: number;
  reinvestedToday: number;
  totalReinvestedUpToDay: number;
  newInvestmentsTodayAmount: number;
  activeContractsCount: number;
  activeInvestedAmount: number;
  isProtectionPoint: boolean;
  expenseIdsToday: string[];
  isOptimizationPhase?: boolean;
  isOptimizedState?: boolean;
}

export interface PortfolioRoadmapOptions {
  products: InvestmentProduct[];
  settings: PlatformSettings;
  expenses?: Expense[];
  /** Horizonte fixo em dias. `undefined` = simular até atingir a meta. */
  horizonDays?: number;
  includeExpenses?: boolean;
  templates?: ProductTemplate[];
  /** Data de referência. Injetável para testes determinísticos. */
  today?: string;
}

const EMPTY_EXPENSES: Expense[] = [];
const EMPTY_TEMPLATES: ProductTemplate[] = [];
const MAX_MILESTONES = 150;
/** Dias que uma despesa pode aguardar caixa antes de ser declarada inviável. */
const MAX_EXPENSE_WAIT_DAYS = 45;

/**
 * Encontra a combinação ótima de templates para atingir e manter a meta diária
 * com a menor quantidade possível de produtos ativos simultâneos na carteira.
 */
export function findOptimalGoalPortfolio(
  targetDailyYield: number,
  templates: ProductTemplate[]
): ProductTemplate[] {
  if (targetDailyYield <= 0 || templates.length === 0) return [];

  const tplDailyYield = (t: ProductTemplate) => t.investedAmount * (t.dailyPercentage / 100);

  // Filtra templates que não ultrapassam excessivamente a meta diária (teto de 105% da meta)
  const validCandidates = templates.filter((t) => tplDailyYield(t) <= targetDailyYield * 1.05);
  const pool = (validCandidates.length > 0 ? validCandidates : templates).filter(
    (t) => t.investedAmount > 0 && t.dailyPercentage > 0
  );

  if (pool.length === 0) return [];

  // 1. Testa se 1 único produto atinge a meta
  const singleMatches = pool
    .filter((t) => tplDailyYield(t) >= targetDailyYield * 0.99)
    .sort((a, b) => {
      const diffA = Math.abs(tplDailyYield(a) - targetDailyYield);
      const diffB = Math.abs(tplDailyYield(b) - targetDailyYield);
      if (Math.abs(diffA - diffB) > 0.01) return diffA - diffB;
      return a.investedAmount - b.investedAmount;
    });

  if (singleMatches.length > 0) {
    return [singleMatches[0]];
  }

  // Ordena por rendimento diário decrescente para agilizar a busca
  pool.sort((a, b) => tplDailyYield(b) - tplDailyYield(a));

  // 2. Testa combinações de K = 2 até K = 6 produtos
  for (let k = 2; k <= Math.min(6, pool.length * 2); k++) {
    let bestCombo: ProductTemplate[] | null = null;
    let bestComboScore = Infinity;

    const search = (startIdx: number, currentCombo: ProductTemplate[], currentYield: number) => {
      if (currentCombo.length === k) {
        if (currentYield >= targetDailyYield * 0.99) {
          const overshoot = Math.max(0, currentYield - targetDailyYield);
          if (overshoot <= Math.max(50, targetDailyYield * 0.25)) {
            const totalCost = currentCombo.reduce((s, t) => s + t.investedAmount, 0);
            const score = overshoot * 10 + totalCost;
            if (score < bestComboScore) {
              bestComboScore = score;
              bestCombo = [...currentCombo];
            }
          }
        }
        return;
      }

      const maxRemainingYield = (k - currentCombo.length) * tplDailyYield(pool[0]);
      if (currentYield + maxRemainingYield < targetDailyYield * 0.99) {
        return;
      }

      for (let i = startIdx; i < pool.length; i++) {
        const t = pool[i];
        const y = tplDailyYield(t);
        currentCombo.push(t);
        search(i, currentCombo, currentYield + y);
        currentCombo.pop();
      }
    };

    search(0, [], 0);

    if (bestCombo) {
      return bestCombo;
    }
  }

  // Fallback: produtos de maior rendimento até cobrir a meta
  const fallback: ProductTemplate[] = [];
  let ySum = 0;
  for (const t of pool) {
    while (ySum < targetDailyYield * 0.99) {
      fallback.push(t);
      ySum += tplDailyYield(t);
      if (fallback.length >= 10) break;
    }
    if (ySum >= targetDailyYield * 0.99) break;
  }
  return fallback;
}

/**
 * Calcula o Roadmap de evolução da renda diária através do reinvestimento dos
 * rendimentos e devoluções dos produtos cadastrados até atingir a Meta Diária.
 *
 * Modelo financeiro:
 * - O rendimento diário é creditado BRUTO no caixa (dinheiro que permanece na
 *   plataforma não paga taxa de saque).
 * - A taxa de saque incide UMA ÚNICA VEZ, no momento em que o dinheiro sai:
 *   pagamento de despesa ou blindagem de capital.
 * - Capital devolvido no vencimento é principal, não rendimento, e vai para
 *   um acumulador próprio.
 */
export function calculatePortfolioRoadmap(options: PortfolioRoadmapOptions): PortfolioRoadmapSummary {
  const {
    products,
    horizonDays,
    includeExpenses = true,
    templates = EMPTY_TEMPLATES,
  } = options;

  const expenses = options.expenses ?? EMPTY_EXPENSES;
  const settings = normalizeSettings(options.settings);
  const today = options.today ?? getTodayString();

  // Um dia passado/atual só pode alterar o estado real da carteira se o usuário
  // tiver confirmado aquele dia. Dias futuros continuam sendo projeções.
  // Isso evita que um aporte ou uma quitação planejados para ontem continuem
  // gerando rendimento/caixa no roadmap depois que o dia foi perdido.
  const completedRoadmapDays = new Set(settings.completedRoadmapDays ?? []);
  const canRealizeRoadmapAction = (date: string): boolean =>
    date > today || completedRoadmapDays.has(date);

  const feeRate = settings.withdrawalFeePercentage / 100;
  const fixedFee = settings.fixedWithdrawalFee;
  const minWithdrawal = settings.minWithdrawalAmount;
  const targetDailyYield = Math.max(1, settings.dailyGoalAmount);

  /** Saque bruto necessário para receber `net` na mão. */
  const grossForNet = (net: number): number => (net + fixedFee) / (1 - feeRate);
  /** Valor líquido recebido ao sacar `gross` da plataforma. */
  const netFromGross = (gross: number): number => Math.max(0, gross * (1 - feeRate) - fixedFee);

  const safeProducts = Array.isArray(products) ? products.filter((p): p is InvestmentProduct => Boolean(p)) : [];
  const activeProducts = safeProducts.filter((p) => (p.status ?? 'active') === 'active');
  const minDeposit = Math.max(0, settings.minDepositAmount ?? 0);

  // ---------------------------------------------------------------------
  // Cota de reinvestimento de referência
  // ---------------------------------------------------------------------
  let reinvestmentUnit = {
    name: 'Cota de Reinvestimento',
    price: minDeposit > 0 ? minDeposit : 50,
    dailyPercentage: 2.5,
    durationDays: 30,
    returnCapitalAtEnd: true,
  };

  if (activeProducts.length > 0) {
    const minProductPrice = Math.min(...activeProducts.map((p) => p.investedAmount));
    const representativeProd =
      activeProducts.find((p) => p.investedAmount === minProductPrice) ?? activeProducts[0];

    const totalInvested = activeProducts.reduce((sum, p) => sum + p.investedAmount, 0);
    const weightedDailyPercent =
      totalInvested > 0
        ? activeProducts.reduce((sum, p) => sum + p.investedAmount * p.dailyPercentage, 0) / totalInvested
        : representativeProd.dailyPercentage;

    const avgDuration = Math.round(
      activeProducts.reduce((sum, p) => sum + p.durationDays, 0) / activeProducts.length
    );

    reinvestmentUnit = {
      name: representativeProd.name,
      price: minDeposit > 0 ? Math.max(minDeposit, minProductPrice) : Math.max(10, minProductPrice),
      dailyPercentage: Number(weightedDailyPercent.toFixed(2)),
      durationDays: Math.max(1, avgDuration),
      returnCapitalAtEnd: activeProducts.some((p) => p.returnCapitalAtEnd),
    };
  }

  // ---------------------------------------------------------------------
  // Data base do ciclo
  // ---------------------------------------------------------------------
  let baseStartDate = today;
  if (settings.goalCycleStartDate && settings.goalCycleStartDate.trim().length > 0) {
    baseStartDate = settings.goalCycleStartDate.trim().split('T')[0];
  } else if (activeProducts.length > 0) {
    const validDates = activeProducts
      .map((p) => p.startDate)
      .filter((d): d is string => typeof d === 'string' && d.trim().length > 0)
      .sort();
    if (validDates.length > 0) baseStartDate = validDates[0];
  }

  const todayOffset = diffInDays(baseStartDate, today);

  const getProductNormalizedKey = (name: string): string =>
    name
      .toLowerCase()
      .replace(/^novo investimento\s*\(/i, '')
      .replace(/^reinvestimento\s*\(/i, '')
      .replace(/^manutenção da meta\s*\(/i, '')
      .replace(/\)$/i, '')
      .trim();

  const seenProductKeys = new Set<string>();

  // ---------------------------------------------------------------------
  // Contratos cadastrados
  //
  // CORREÇÃO (A5): o fim do contrato vem da data real de término, e não de
  // `startOffset + durationDays`. Um contrato iniciado antes do ciclo mantém
  // apenas os dias que de fato lhe restam.
  // ---------------------------------------------------------------------
  const contracts: InternalContract[] = [];
  let totalNewInvestments = 0;

  activeProducts.forEach((p) => {
    const startOffset = diffInDays(baseStartDate, p.startDate);
    const endOffset = diffInDays(baseStartDate, addDays(p.startDate, p.durationDays));

    // Contrato já encerrado antes do início do ciclo: fora da simulação.
    if (endOffset <= 0) return;

    const normName = getProductNormalizedKey(p.name);
    const isExplicitReinvestment =
      p.isReinvestment === true || p.name.toLowerCase().includes('reinvestimento');
    const isFirstAppearance = !seenProductKeys.has(normName);
    const isNewInvestment =
      !isExplicitReinvestment &&
      (p.category === 'Aporte' ||
        p.category === 'Novo investimento' ||
        p.isNewInvestment === true ||
        (startOffset > 0 && isFirstAppearance));

    if (startOffset <= 0) seenProductKeys.add(normName);
    if (isNewInvestment) totalNewInvestments += p.investedAmount;

    contracts.push({
      id: p.id,
      name: p.name,
      unitPrice: p.investedAmount,
      units: 1,
      investedAmount: p.investedAmount,
      dailyPercentage: p.dailyPercentage,
      durationDays: p.durationDays,
      startDay: startOffset,
      endDay: endOffset,
      returnCapitalAtEnd: p.returnCapitalAtEnd,
      isReinvestment: isExplicitReinvestment,
      isNewInvestment,
      isInitialPortfolio: startOffset <= 0,
    });
  });

  // CORREÇÃO (A9): a renda diária atual conta apenas contratos que rendem HOJE.
  // Quando um ponto de início específico é definido pelo usuário, a renda de partida
  // considerada para o ciclo é a renda no próprio ponto de início (dia 0).
  const isCustomStartPoint = Boolean(
    settings.goalCycleStartDate && settings.goalCycleStartDate.trim().length > 0
  );
  const evaluationOffset = isCustomStartPoint ? 0 : todayOffset;
  const currentDailyYield = contracts
    .filter((c) => evaluationOffset > c.startDay && evaluationOffset <= c.endDay)
    .reduce((sum, c) => sum + c.investedAmount * (c.dailyPercentage / 100), 0);

  // ---------------------------------------------------------------------
  // Estado da simulação
  // ---------------------------------------------------------------------
  let platformBalance = 0; // Saldo bruto retido na plataforma (aguardando saque mínimo)
  let bankBalance = 0;     // Saldo líquido no banco (fora do risco da plataforma)
  let accumulatedGrossYield = 0;
  let accumulatedCapitalReturned = 0;
  let accumulatedFeesPaid = 0;
  let totalReinvested = 0;
  let totalExpensesDeducted = 0;
  let maxDailyYield = 0;
  let daysToGoal: number | null = null;
  let estimatedGoalDate: string | null = null;
  let contractSeq = 0;

  const initialPortfolioCapital = contracts.reduce((sum, c) => sum + c.investedAmount, 0);
  let totalProtectedCashAccumulated = 0;
  const dynamicBufferPercentages: number[] = [];
  const triggeredProtectionMilestones = new Set<string>();

  const rawMilestones: PortfolioMilestone[] = [];
  const dayRecords: DayRecord[] = [];
  const unfundableExpenses: UnfundableExpense[] = [];
  const projectedAcquisitions: ProjectedAcquisitionItem[] = [];

  const expenseById = new Map<string, Expense>();
  expenses.forEach((e) => expenseById.set(e.id, e));

  // ---------------------------------------------------------------------
  // Agendamento de despesas pendentes
  // ---------------------------------------------------------------------
  interface ScheduledRoadmapExpense {
    expense: Expense;
    scheduledDate: string;
    deducted: boolean;
    daysWaiting: number;
    unfundable: boolean;
  }

  const pendingExpensesOptimizations = includeExpenses
    ? calculateAllExpensesOptimizations(expenses, products, settings, today)
    : new Map();

  const scheduledPendingExpenses: ScheduledRoadmapExpense[] = [];
  if (includeExpenses && expenses.length > 0) {
    expenses.forEach((e) => {
      if (e.deductFromRoadmap === false || e.isPaid || e.paidDate) return;

      // Quando o usuário define um Ponto de Início customizado, descarta despesas
      // com vencimento fixo anterior ao marco inicial, eliminando qualquer impacto
      // de despesas passadas sobre o alcance da meta a partir de então.
      if (isCustomStartPoint && e.dueDate && e.dueDate.trim().split('T')[0] < baseStartDate) {
        return;
      }

      const opt = pendingExpensesOptimizations.get(e.id);
      let scheduledDate = opt ? opt.bestDate : e.dueDate || today;

      // Conta com vencimento fixo nunca é agendada para depois do vencimento.
      if (e.dueDate && scheduledDate > e.dueDate) scheduledDate = e.dueDate;

      // CORREÇÃO (A4): conta vencida antes do início do ciclo é ancorada no
      // dia 0, e não em uma data passada que a simulação jamais alcança.
      if (scheduledDate < baseStartDate) scheduledDate = baseStartDate;

      // Se a recomendação ficou para trás porque o usuário não concluiu o dia,
      // a pendência volta para o mapa a partir de hoje. Assim ela não fica
      // presa em uma data histórica invisível: reaparece como ação pendente
      // no presente e volta a disputar caixa/reinvestimento normalmente.
      if (scheduledDate < today) scheduledDate = today;

      scheduledPendingExpenses.push({
        expense: e,
        scheduledDate,
        deducted: false,
        daysWaiting: 0,
        unfundable: false,
      });
    });

    scheduledPendingExpenses.sort((a, b) => {
      const cmp = a.scheduledDate.localeCompare(b.scheduledDate);
      if (cmp !== 0) return cmp;
      if (a.expense.amount !== b.expense.amount) return a.expense.amount - b.expense.amount;
      return a.expense.id.localeCompare(b.expense.id);
    });

    // Registra visualmente o vencimento que ficou para trás quando uma conta
    // pendente precisou ser deslocada para hoje. Esse evento é apenas histórico
    // informativo: ele NÃO debita caixa nem finge que a conta foi paga.
    for (const item of scheduledPendingExpenses) {
      const dueDate = item.expense.dueDate?.trim().split('T')[0];
      if (!dueDate || dueDate >= today || item.scheduledDate === dueDate) continue;

      const dueDay = diffInDays(baseStartDate, dueDate);
      if (dueDay < 0 || dueDay > 10000) continue;

      rawMilestones.push({
        date: dueDate,
        dateFormatted: formatDateBR(dueDate),
        dayNumber: dueDay,
        type: 'expense_rescheduled',
        title: `Vencida: ${item.expense.title}`,
        description: `Vencimento em ${formatDateBR(dueDate)} não concluído. A dívida permanece aberta e foi realocada para ${formatDateBR(item.scheduledDate)}.`,
        amount: 0,
        expenseAmount: item.expense.amount,
        dailyYieldAfter: 0,
      });
    }

    // Se a melhor data de pagamento caiu em hoje, mostra a ação no próprio
    // dia atual mesmo sem marcar o dia como concluído. É uma previsão/pendência
    // visual, não uma baixa financeira. Se hoje não for concluído, no próximo
    // recálculo a data poderá avançar novamente.
    for (const item of scheduledPendingExpenses) {
      if (item.scheduledDate !== today || item.deducted || item.unfundable || completedRoadmapDays.has(today)) continue;

      const todayDay = diffInDays(baseStartDate, today);
      rawMilestones.push({
        date: today,
        dateFormatted: formatDateBR(today),
        dayNumber: todayDay,
        type: 'expense_rescheduled',
        title: `Pagamento previsto: ${item.expense.title}`,
        description: `Pagamento recomendado para hoje (${formatDateBR(today)}) no valor de ${formatCurrency(item.expense.amount)}. A baixa só acontece quando este dia for marcado como concluído.`,
        amount: 0,
        expenseAmount: item.expense.amount,
        dailyYieldAfter: 0,
      });
    }
  }

  // CORREÇÃO (Prioridade Meta — revisada): a versão anterior desta correção
  // adiava o PAGAMENTO de qualquer despesa sem vencimento até a meta ser
  // batida. Isso resolvia o atraso artificial, mas exagerava para o outro
  // lado: uma conta pequena e totalmente pagável (ex.: R$60, R$100) ficava
  // represada por semanas só por não ter data — mesmo quando pagá-la teria
  // impacto mínimo (frações de dia) no cronograma.
  //
  // O ajuste certo não é "nunca pagar antes da meta", e sim "nunca fingir que
  // ela é urgente antes de precisar ser paga": uma despesa sem vencimento
  // continua sendo paga assim que o caixa livre naturalmente permite (Tier 3
  // — a menor prioridade da fila, atrás de qualquer conta com vencimento
  // real; ver `getExpenseUrgencyTier`), então o único custo é o genuíno —
  // proporcional ao valor e ao quão cedo ela é paga — sem amplificação
  // artificial. O que ELA NUNCA deve fazer é disparar proteção antecipada
  // para algo que não tem prazo: nem reservar caixa de antemão (Passo 5),
  // nem acelerar a blindagem dinâmica por "enxergá-la" como conta próxima
  // (Passo 3) — isso sim inflava o atraso muito além do custo real, inclusive
  // para despesas pequenas.
  const hasFixedDueDate = (item: ScheduledRoadmapExpense): boolean =>
    Boolean(item.expense.dueDate && item.expense.dueDate.trim());

  // ---------------------------------------------------------------------
  // Catálogo de cotas disponíveis para compra
  // ---------------------------------------------------------------------
  const baseTemplateList = templates.length > 0 ? templates : DEFAULT_PRODUCT_TEMPLATES;
  const candidateTemplates: ProductTemplate[] = [...baseTemplateList];
  activeProducts.forEach((p) => {
    if (!candidateTemplates.some((t) => t.investedAmount === p.investedAmount)) {
      candidateTemplates.push({
        id: `derived_${p.id}`,
        name: p.name,
        investedAmount: p.investedAmount,
        dailyPercentage: p.dailyPercentage,
        durationDays: p.durationDays,
        returnCapitalAtEnd: p.returnCapitalAtEnd,
        category: p.category,
      });
    }
  });

  // CORREÇÃO (A11): ordena por eficiência (% ao dia), não por preço. Desempate
  // pela menor cota, para não imobilizar capital além do necessário.
  candidateTemplates.sort(
    (a, b) => b.dailyPercentage - a.dailyPercentage || a.investedAmount - b.investedAmount
  );
  const purchasableTemplates = candidateTemplates.filter((t) => t.investedAmount >= 10);
  const minCandidatePrice =
    purchasableTemplates.length > 0
      ? Math.min(...purchasableTemplates.map((t) => t.investedAmount))
      : reinvestmentUnit.price;

  const tplDailyYield = (t: ProductTemplate) => t.investedAmount * (t.dailyPercentage / 100);

  // Cálculo do menor número viável de produtos simultâneos necessários para manter a meta.
  // Encontra a combinação ótima de templates no catálogo para atingir a meta com a menor quantidade de produtos.
  const optimalGoalTemplates = findOptimalGoalPortfolio(targetDailyYield, purchasableTemplates);
  let minPossibleContracts =
    optimalGoalTemplates.length > 0
      ? optimalGoalTemplates.length
      : targetDailyYield > 0
        ? 1
        : 0;

  // Estado de controle do Período de Otimização pós-meta
  let startOptimizationDay: number | null = null;
  let initialContractsAtGoal = 0;
  let isOptimized = false;
  let completionOptimizationDay: number | null = null;
  let lowestContractsPostGoal = Infinity;
  let optimizationStartMilestoneAdded = false;
  let optimizationCompletedMilestoneAdded = false;

  // CORREÇÃO (C1): o laço não vai além do horizonte que será exibido.
  const maxSimulationDays = horizonDays !== undefined ? Math.max(horizonDays, 1) : 365;
  const autoHorizonCap = 90;

  // =====================================================================
  // LAÇO PRINCIPAL
  // =====================================================================
  for (let day = 0; day <= maxSimulationDays; day++) {
    const dateOnDay = addDays(baseStartDate, day);
    const dateFormatted = formatDateBR(dateOnDay);
    const roadmapActionRealized = canRealizeRoadmapAction(dateOnDay);

    // Aportes externos são eventos persistentes, com uma única data de entrada.
    // Isso evita reinjetar o mesmo dinheiro a cada novo dia do roadmap: se um
    // aporte de R$ 100 foi usado parcialmente ontem, amanhã a simulação reencena
    // o aporte original e também a saída de ontem, preservando o saldo real.
    const bankInjectionDate = settings.manualBankInjectionDate;
    const protectionInjectionDate = settings.manualProtectionInjectionDate;
    const shouldApplyBankInjection =
      Boolean(settings.manualBankInjection && settings.manualBankInjection > 0) &&
      ((bankInjectionDate && dateOnDay === bankInjectionDate) ||
        (!bankInjectionDate && dateOnDay === today) ||
        (day === 0 && !!bankInjectionDate && bankInjectionDate < baseStartDate));
    const shouldApplyProtectionInjection =
      Boolean(settings.manualProtectionInjection && settings.manualProtectionInjection > 0) &&
      ((protectionInjectionDate && dateOnDay === protectionInjectionDate) ||
        (!protectionInjectionDate && dateOnDay === today) ||
        (day === 0 && !!protectionInjectionDate && protectionInjectionDate < baseStartDate));

    if (shouldApplyBankInjection) {
      bankBalance = Number((bankBalance + (settings.manualBankInjection ?? 0)).toFixed(2));
    }
    if (shouldApplyProtectionInjection) {
      totalProtectedCashAccumulated = Number(
        (totalProtectedCashAccumulated + (settings.manualProtectionInjection ?? 0)).toFixed(2)
      );
    }

    // --- 1. Rendimento e devolução de capital -------------------------
    // Regra de 24h: o dia da compra não rende; a primeira renda vem 24h depois.
    let dailyGross = 0;
    let capitalReturnedToday = 0;
    let activeCount = 0;
    let activeInvestedAmount = 0;

    for (const c of contracts) {
      if (day > c.startDay && day <= c.endDay) {
        dailyGross += c.investedAmount * (c.dailyPercentage / 100);
      }
      if (day >= c.startDay && day < c.endDay) {
        activeCount += 1;
        activeInvestedAmount += c.investedAmount;
      }
      if (day === c.endDay && c.returnCapitalAtEnd) {
        capitalReturnedToday += c.investedAmount;
      }
    }

    // Inflow bruto na plataforma
    platformBalance += dailyGross + capitalReturnedToday;
    accumulatedGrossYield += dailyGross;
    accumulatedCapitalReturned += capitalReturnedToday;

    const dailyNetIfWithdrawn = netFromGross(dailyGross);
    if (dailyGross > maxDailyYield) maxDailyYield = dailyGross;

    // --- 2. Saque da plataforma para o banco (Segurança anti-colapso) ---
    // Regra do investidor: Não deixar dinheiro acumulado na plataforma para evitar
    // perdas caso a plataforma caia ou bloqueie saques.
    // Assim que o saldo na plataforma atinge o saque mínimo (ou no último dia),
    // é sacado integralmente para a conta bancária.
    const isLastSimulatedDay = day === maxSimulationDays;
    let grossWithdrawnToBankToday = 0;
    let netWithdrawnToBankToday = 0;

    if (
      platformBalance > 0 &&
      (platformBalance >= minWithdrawal || isLastSimulatedDay || minWithdrawal === 0)
    ) {
      grossWithdrawnToBankToday = platformBalance;
      netWithdrawnToBankToday = netFromGross(grossWithdrawnToBankToday);
      const fee = grossWithdrawnToBankToday - netWithdrawnToBankToday;
      platformBalance = 0;
      accumulatedFeesPaid += Math.max(0, fee);
      bankBalance += netWithdrawnToBankToday;
    }

    // --- 3. Blindagem dinâmica diária (alimenta o cofre seguro no banco) ---
    const activeContractsOnDay = contracts.filter((c) => day >= c.startDay && day < c.endDay);
    const totalLockedCapitalOnDay = activeContractsOnDay.reduce((sum, c) => sum + c.investedAmount, 0);

    let avgRemainingDurationOnDay = 0;
    let maxRemainingDurationOnDay = 0;
    let capitalInLongContractsOnDay = 0;
    let contractsExpiringSoonCountOnDay = 0;

    if (activeContractsOnDay.length > 0) {
      const remainingList = activeContractsOnDay.map((c) => Math.max(0, c.endDay - day));
      avgRemainingDurationOnDay = remainingList.reduce((s, d) => s + d, 0) / remainingList.length;
      maxRemainingDurationOnDay = Math.max(...remainingList);
      capitalInLongContractsOnDay = activeContractsOnDay
        .filter((c) => c.endDay - day > 20)
        .reduce((sum, c) => sum + c.investedAmount, 0);
      contractsExpiringSoonCountOnDay = activeContractsOnDay.filter((c) => c.endDay - day <= 5).length;
    }

    let effectiveDynamicBufferPct: number;

    if (settings.dynamicBufferEnabled !== false) {
      let profileBase = 25;
      if (settings.protectionProfile === 'conservative') profileBase = 38;
      else if (settings.protectionProfile === 'aggressive') profileBase = 8;

      let durationAdj = 0;
      if (
        avgRemainingDurationOnDay > 25 ||
        capitalInLongContractsOnDay > 0.5 * Math.max(1, totalLockedCapitalOnDay)
      ) {
        durationAdj = 15;
      } else if (avgRemainingDurationOnDay > 15) {
        durationAdj = 8;
      } else if (avgRemainingDurationOnDay <= 5 && contractsExpiringSoonCountOnDay > 0) {
        durationAdj = -12;
      }

      // CORREÇÃO (Prioridade Meta): uma despesa sem vencimento fixo não deve
      // acelerar a blindagem (retendo mais caixa do que o necessário) só
      // porque sua data técnica de financiamento caiu nos próximos 20 dias —
      // ela não tem prazo real a cumprir, então não é uma "conta próxima".
      // Isso não impede o pagamento dela (Passo 4 continua pagando assim que
      // o caixa livre permitir); só evita que o motor retenha caixa extra
      // de forma antecipada e desproporcional por causa dela.
      const upcomingExpenses20d = scheduledPendingExpenses
        .filter((item) => !item.deducted && !item.unfundable && hasFixedDueDate(item))
        .filter((item) => {
          const d = diffInDays(dateOnDay, item.scheduledDate);
          return d >= 0 && d <= 20;
        })
        .reduce((sum, item) => sum + item.expense.amount, 0);

      // Se há contas nos próximos 20 dias e a blindagem atual ainda não as cobre, acelera a blindagem
      const expenseAdj =
        upcomingExpenses20d > 0 && totalProtectedCashAccumulated < upcomingExpenses20d ? 20 : 0;

      let recoveryAdj = 0;
      const recoveryRatio =
        initialPortfolioCapital > 0 ? totalProtectedCashAccumulated / initialPortfolioCapital : 1;
      if (recoveryRatio < 0.25) {
        recoveryAdj = settings.protectionProfile === 'conservative' ? 14 : 8;
      } else if (recoveryRatio < 0.5) {
        recoveryAdj = settings.protectionProfile === 'conservative' ? 8 : 4;
      } else if (recoveryRatio >= 1.0) {
        recoveryAdj = -15;
      }

      const capitalReturnAdj =
        capitalReturnedToday > 0 ? (settings.protectionProfile === 'conservative' ? 25 : 15) : 0;

      let goalProximityAdj = 0;
      const goalRatio = dailyGross / targetDailyYield;
      if (goalRatio >= 0.88 && goalRatio < 1.0) goalProximityAdj = -35;
      else if (goalRatio >= 1.0) goalProximityAdj = 55;

      effectiveDynamicBufferPct = Math.max(
        0,
        Math.min(
          100,
          Math.round(
            profileBase + durationAdj + expenseAdj + recoveryAdj + capitalReturnAdj + goalProximityAdj
          )
        )
      );
    } else {
      effectiveDynamicBufferPct = Math.max(0, Math.min(100, settings.reinvestmentBufferPercentage));
    }

    dynamicBufferPercentages.push(effectiveDynamicBufferPct);

    // --- 4. Quitação de despesas do dia (prioridade: blindagem acumulada prévia -> saldo líquido em banco) ---
    let expensesDeductedToday = 0;
    let expensesPaidFromBlindagemToday = 0;
    let expensesPaidFromFreeBankToday = 0;
    const expenseIdsToday: string[] = [];

    const payExpense = (exp: Expense) => {
      // Prioridade 1: Utiliza a reserva já acumulada na blindagem.
      // Prioridade 2: Se a dívida for maior que a blindagem acumulada, complementa com o saldo líquido no banco.
      const paidFromBlindagem = Math.min(totalProtectedCashAccumulated, exp.amount);
      const paidFromFreeBank = Number((exp.amount - paidFromBlindagem).toFixed(2));

      totalProtectedCashAccumulated = Number(
        Math.max(0, totalProtectedCashAccumulated - paidFromBlindagem).toFixed(2)
      );
      bankBalance = Math.max(0, Number((bankBalance - exp.amount).toFixed(2)));
      expensesDeductedToday += exp.amount;
      expensesPaidFromBlindagemToday += paidFromBlindagem;
      expensesPaidFromFreeBankToday += paidFromFreeBank;
      totalExpensesDeducted += exp.amount;
      expenseIdsToday.push(exp.id);

      // Saque bruto necessário na plataforma para cobrir a despesa líquida pós-taxa
      const reqGross = Number(grossForNet(exp.amount).toFixed(2));
      const feeAmount = Number(Math.max(0, reqGross - exp.amount).toFixed(2));
      const feePctText =
        settings.withdrawalFeePercentage > 0 ? `${settings.withdrawalFeePercentage}%` : '';
      const feeDesc =
        feeAmount > 0
          ? feePctText
            ? `taxa de saque de ${feePctText} (${formatCurrency(feeAmount)})`
            : `taxa de saque de ${formatCurrency(feeAmount)}`
          : '';

      if (rawMilestones.length < MAX_MILESTONES) {
        let sourceDesc = '';
        if (paidFromBlindagem >= exp.amount) {
          sourceDesc =
            feeAmount > 0
              ? `quitado com a reserva da blindagem acumulada. Saque bruto necessário de ${formatCurrency(reqGross)} na plataforma (${feeDesc} retida para cobrir o custo líquido de ${formatCurrency(exp.amount)})`
              : `quitado utilizando a reserva da blindagem acumulada (${formatCurrency(paidFromBlindagem)})`;
        } else if (paidFromBlindagem > 0) {
          sourceDesc =
            feeAmount > 0
              ? `quitado com ${formatCurrency(paidFromBlindagem)} da blindagem e complementado com ${formatCurrency(paidFromFreeBank)} do saldo líquido no banco. Saque bruto necessário de ${formatCurrency(reqGross)} na plataforma (${feeDesc} retida para cobrir o custo líquido de ${formatCurrency(exp.amount)})`
              : `quitado com ${formatCurrency(paidFromBlindagem)} da blindagem e complementado com ${formatCurrency(paidFromFreeBank)} do saldo líquido no banco`;
        } else {
          sourceDesc =
            feeAmount > 0
              ? `quitado integralmente pelo saldo líquido no banco. Saque bruto necessário de ${formatCurrency(reqGross)} na plataforma (${feeDesc} retida para cobrir o custo líquido de ${formatCurrency(exp.amount)})`
              : `quitado integralmente pelo saldo líquido no banco (${formatCurrency(paidFromFreeBank)})`;
        }

        rawMilestones.push({
          date: dateOnDay,
          dateFormatted,
          dayNumber: day,
          type: 'expense_withdrawal',
          title: `Pagar ${exp.title}: ${formatCurrency(exp.amount)}`,
          description: `Pagamento de ${formatCurrency(exp.amount)} para ${exp.title} (${exp.category}) ${sourceDesc}.`,
          amount: reqGross,
          expenseAmount: exp.amount,
          feeAmount,
          dailyYieldAfter: dailyGross,
        });
      }
    };

    if (includeExpenses && expenses.length > 0) {
      // 4a. Despesas já quitadas nesta data (histórico).
      for (const exp of expenses) {
        if (exp.deductFromRoadmap === false) continue;
        if (exp.paidDate !== dateOnDay) continue;
        if (bankBalance >= exp.amount) {
          payExpense(exp);
        }
      }

      // 4b. Despesas pendentes.
      // A data agendada é uma ação única. Se ela cair em HOJE, o roadmap
      // mostra a pendência, mas não pode projetar a mesma dívida para amanhã
      // dentro da mesma simulação. Ela só será executada quando HOJE for
      // efetivamente concluído. No próximo recálculo, o próprio `today` muda
      // e a pendência é reagendada para a nova data.
      if (roadmapActionRealized) for (const item of scheduledPendingExpenses) {
        if (item.deducted || item.unfundable) continue;

        const exp = item.expense;
        const scheduleReached = dateOnDay >= item.scheduledDate;

        // O dia atual é uma prévia, não uma execução. Não deixe a dívida
        // "escapar" para o primeiro dia futuro da simulação.
        if (item.scheduledDate === today && !completedRoadmapDays.has(today)) continue;

        if (!scheduleReached) continue;

        item.daysWaiting += 1;

        // Quitação pelo saldo disponível em banco. Despesas sem vencimento
        // (Tier 3 — a menor prioridade de `getExpenseUrgencyTier`) já entram
        // por último na fila natural de caixa livre, então pagá-las assim
        // que o saldo permite tem custo proporcional e mínimo — não é mais
        // adiado até a meta ser batida (ver nota da Prioridade Meta acima).
        if (bankBalance + 0.005 >= exp.amount) {
          payExpense(exp);
          item.deducted = true;
          continue;
        }

        // Despesa que nunca consegue caixa deixa de travar o reinvestimento indefinidamente
        if (item.daysWaiting > MAX_EXPENSE_WAIT_DAYS) {
          item.unfundable = true;
          unfundableExpenses.push({
            expenseId: exp.id,
            title: exp.title,
            amount: exp.amount,
            requiredGrossWithdrawal: Number(grossForNet(exp.amount).toFixed(2)),
            dueDate: exp.dueDate,
            daysWaited: item.daysWaiting,
            reason:
              'O saldo em banco projetado não alcança o valor necessário dentro do prazo. A reserva foi liberada para não travar o reinvestimento.',
          });

          if (rawMilestones.length < MAX_MILESTONES) {
            rawMilestones.push({
              date: dateOnDay,
              dateFormatted,
              dayNumber: day,
              type: 'expense_unfundable',
              title: `${exp.title} sem cobertura: ${formatCurrency(exp.amount)}`,
              description: `Após ${plural(item.daysWaiting, 'dia', 'dias')}, os rendimentos sacados para o banco não acumularam os ${formatCurrency(exp.amount)} necessários. A despesa segue em aberto e precisa de aporte externo.`,
              amount: 0,
              expenseAmount: exp.amount,
              dailyYieldAfter: dailyGross,
            });
          }
        }
      }
    }

    // --- 4c. Blindagem Retida no Dia (sobre o excedente do fluxo líquido não consumido por contas) ---
    let protectedToday = 0;
    let isProtectionPointToday = false;

    // Se o fluxo novo líquido do dia foi direcionado para pagar dívidas excedentes à blindagem prévia,
    // não retém blindagem sobre o valor que já foi pago. Retém apenas sobre o saldo líquido que sobrou hoje.
    const netEligibleForProtection = Math.max(0, netWithdrawnToBankToday - expensesPaidFromFreeBankToday);

    if (netEligibleForProtection > 0 && effectiveDynamicBufferPct > 0) {
      const desiredNet = netEligibleForProtection * (effectiveDynamicBufferPct / 100);
      protectedToday = Number(desiredNet.toFixed(2));
      totalProtectedCashAccumulated = Number(
        (totalProtectedCashAccumulated + protectedToday).toFixed(2)
      );
    }

    if (
      capitalReturnedToday > 0 &&
      protectedToday > 0 &&
      !triggeredProtectionMilestones.has(`cap_ret_${day}`)
    ) {
      triggeredProtectionMilestones.add(`cap_ret_${day}`);
      isProtectionPointToday = true;
      if (rawMilestones.length < MAX_MILESTONES) {
        rawMilestones.push({
          date: dateOnDay,
          dateFormatted,
          dayNumber: day,
          type: 'capital_protection',
          title: `Blindagem na devolução de capital (${formatCurrency(protectedToday)})`,
          description: `Capital devolvido de ${formatCurrency(capitalReturnedToday)}. O algoritmo retirou ${formatCurrency(protectedToday)} líquidos para o saldo seguro em banco (blindagem de ${formatPercentBR(effectiveDynamicBufferPct, 0)}).`,
          amount: protectedToday,
          protectionAmount: protectedToday,
          protectionReason: 'Blindagem de devolução de capital contra novos ciclos longos',
          protectionPercent:
            initialPortfolioCapital > 0
              ? Math.min(100, Math.round((totalProtectedCashAccumulated / initialPortfolioCapital) * 100))
              : 100,
          riskExposureLevel: 'moderate',
          dailyYieldAfter: dailyGross,
        });
      }
    }

    // --- 5. Reserva de caixa para contas próximas (apenas excedente não coberto pela blindagem) ---
    let newInvestmentsTodayAmount = 0;
    contracts
      .filter((c) => c.startDay === day && c.isNewInvestment)
      .forEach((c) => {
        newInvestmentsTodayAmount += c.investedAmount;
        seenProductKeys.add(getProductNormalizedKey(c.name));
      });

    let reservedCashForPending = 0;
    // CORREÇÃO (Prioridade Meta): uma despesa sem vencimento fixo não tem
    // prazo real, então não deve reservar caixa "de antemão" como se fosse
    // uma conta próxima — isso reteria caixa do reinvestimento sem motivo
    // (o pagamento em si continua acontecendo normalmente no Passo 4, assim
    // que o caixa livre permitir).
    const remainingPending = scheduledPendingExpenses.filter(
      (i) => !i.deducted && !i.unfundable && hasFixedDueDate(i)
    );
    const urgentPendingList = remainingPending.filter(
      (item) => diffInDays(dateOnDay, item.scheduledDate) <= 15
    );
    const totalUrgentPendingExpenses = urgentPendingList.reduce(
      (sum, item) => sum + item.expense.amount,
      0
    );

    if (urgentPendingList.length > 0) {
      const nextDate = urgentPendingList.reduce(
        (min, item) => (item.scheduledDate < min ? item.scheduledDate : min),
        urgentPendingList[0].scheduledDate
      );
      const nextBatchAmount = urgentPendingList
        .filter((item) => item.scheduledDate <= nextDate || item.scheduledDate <= dateOnDay)
        .reduce((sum, item) => sum + item.expense.amount, 0);

      // Como a blindagem acumulada é o fundo de reserva para pagar contas,
      // se a blindagem já cobre o próximo lote, nenhuma trava é colocada no reinvestimento!
      // Somente se a despesa exceder a blindagem acumulada é que a diferença fica reservada.
      reservedCashForPending = Math.max(
        0,
        Number((nextBatchAmount - totalProtectedCashAccumulated).toFixed(2))
      );
    }

    // O valor correto para reinvestimento é sempre o saldo líquido livre em banco
    const rawBankFreeCash = Math.max(
      0,
      bankBalance - reservedCashForPending - totalProtectedCashAccumulated
    );
    let currentFreeCash = rawBankFreeCash;

    // --- 5. Checkpoints de payback ------------------------------------
    const recoveryPercent =
      initialPortfolioCapital > 0
        ? Math.min(100, Math.round((totalProtectedCashAccumulated / initialPortfolioCapital) * 100))
        : 100;

    let riskExposureLevel: 'low' | 'moderate' | 'high' = 'moderate';
    if (
      recoveryPercent >= 100 ||
      (avgRemainingDurationOnDay <= 7 && totalLockedCapitalOnDay < totalProtectedCashAccumulated)
    ) {
      riskExposureLevel = 'low';
    } else if (
      recoveryPercent < 40 &&
      (avgRemainingDurationOnDay > 18 ||
        capitalInLongContractsOnDay > 0.5 * Math.max(1, totalLockedCapitalOnDay))
    ) {
      riskExposureLevel = 'high';
    }

    if (initialPortfolioCapital > 0) {
      const checkpoints = [
        {
          pct: 10,
          key: 'payback_10',
          title: 'Ponto de proteção: 10% resgatado',
          description: 'Primeiro marco de segurança. Uma parte do capital inicial já está fora da plataforma.',
        },
        {
          pct: 25,
          key: 'payback_25',
          title: 'Ponto de proteção: 25% resgatado',
          description: 'Um quarto do investimento original já foi retirado e está imune a instabilidade da plataforma.',
        },
        {
          pct: 50,
          key: 'payback_50',
          title: 'Ponto de proteção: 50% resgatado',
          description: 'Metade do capital inicial recuperada, mantendo o ritmo de juros compostos rumo à meta.',
        },
        {
          pct: 75,
          key: 'payback_75',
          title: 'Ponto de proteção: 75% resgatado',
          description: 'Três quartos do capital inicial já resguardados. Risco residual mínimo.',
        },
        {
          pct: 100,
          key: 'payback_100',
          title: 'Risco zero: 100% do capital resgatado',
          description: 'Todo o capital inicial foi retirado da plataforma. Daqui em diante, o rendimento é lucro puro.',
        },
      ];

      // CORREÇÃO: dispara todos os marcos alcançados no mesmo dia, em vez de um
      // por dia — o que deslocava as datas dos checkpoints.
      for (const cp of checkpoints) {
        if (recoveryPercent < cp.pct || triggeredProtectionMilestones.has(cp.key)) continue;
        triggeredProtectionMilestones.add(cp.key);
        isProtectionPointToday = true;
        if (rawMilestones.length < MAX_MILESTONES) {
          rawMilestones.push({
            date: dateOnDay,
            dateFormatted,
            dayNumber: day,
            type: 'capital_protection',
            title: `${cp.title} (${formatCurrency(totalProtectedCashAccumulated)})`,
            description: cp.description,
            amount: totalProtectedCashAccumulated,
            protectionAmount: totalProtectedCashAccumulated,
            protectionReason: `${cp.pct}% do capital inicial fora de risco`,
            protectionPercent: cp.pct,
            riskExposureLevel: cp.pct >= 75 ? 'low' : riskExposureLevel,
            dailyYieldAfter: dailyGross,
          });
        }
      }
    }

    if (dailyGross >= targetDailyYield && !triggeredProtectionMilestones.has('profit_lock')) {
      triggeredProtectionMilestones.add('profit_lock');
      isProtectionPointToday = true;
      if (rawMilestones.length < MAX_MILESTONES) {
        rawMilestones.push({
          date: dateOnDay,
          dateFormatted,
          dayNumber: day,
          type: 'capital_protection',
          title: `Trava de lucros ativada (${formatCurrency(dailyGross)}/dia)`,
          description:
            'Meta alcançada. O algoritmo passa a blindar os lucros para saque seguro, reinvestindo apenas o necessário para repor cotas que vencem.',
          amount: protectedToday,
          protectionAmount: protectedToday,
          protectionReason: 'Meta conquistada: trava de lucros diários ativada',
          protectionPercent: effectiveDynamicBufferPct,
          riskExposureLevel: 'low',
          dailyYieldAfter: dailyGross,
        });
      }
    }

    // Reta final: não bloqueia a última cota por causa do buffer.
    const goalRatioCurrent = dailyGross / targetDailyYield;
    if (
      goalRatioCurrent >= 0.88 &&
      goalRatioCurrent < 1.0 &&
      currentFreeCash < minCandidatePrice &&
      bankBalance - reservedCashForPending >= minCandidatePrice
    ) {
      currentFreeCash = bankBalance - reservedCashForPending;
    }

    let protectionTip: string;
    if (dailyGross >= targetDailyYield) {
      protectionTip = `Meta de ${formatCurrency(targetDailyYield)}/dia conquistada. Trava de lucros em ${formatPercentBR(effectiveDynamicBufferPct, 0)}: rendimentos liberados para saque seguro no banco.`;
    } else if (recoveryPercent >= 100) {
      protectionTip = `Risco zero atingido. Os ${formatCurrency(initialPortfolioCapital)} de capital inicial já foram resgatados para o banco; os reinvestimentos operam em lucro puro.`;
    } else if (platformBalance > 0 && platformBalance < minWithdrawal) {
      protectionTip = `Saldo na plataforma de ${formatCurrency(platformBalance)} aguardando atingir o saque mínimo de ${formatCurrency(minWithdrawal)} para transferência ao banco.`;
    } else if (capitalReturnedToday > 0) {
      protectionTip = `Capital devolvido de ${formatCurrency(capitalReturnedToday)}. Retenção de ${formatPercentBR(effectiveDynamicBufferPct, 0)} (${formatCurrency(protectedToday)}) resguardada no banco.`;
    } else if (avgRemainingDurationOnDay > 20) {
      protectionTip = `Contratos com ${plural(Math.round(avgRemainingDurationOnDay), 'dia', 'dias')} em média até o vencimento. Blindagem em ${formatPercentBR(effectiveDynamicBufferPct, 0)} para não travar todo o saldo em prazos longos.`;
    } else if (reservedCashForPending > 0) {
      protectionTip = `Reserva complementar de ${formatCurrency(reservedCashForPending)} separada no banco para contas próximas (além da blindagem). Liquidez garantida sem quebrar contratos.`;
    } else if (totalUrgentPendingExpenses > 0 && totalProtectedCashAccumulated >= totalUrgentPendingExpenses) {
      protectionTip = `Contas próximas de ${formatCurrency(totalUrgentPendingExpenses)} totalmente garantidas pela reserva de blindagem (${formatCurrency(totalProtectedCashAccumulated)}). Saldo livre desimpedido para reinvestir.`;
    } else {
      protectionTip = `Blindagem dinâmica em ${formatPercentBR(effectiveDynamicBufferPct, 0)}: ${protectedToday > 0 ? `${formatCurrency(protectedToday)} resguardados no banco hoje` : 'reinvestimento com saldo líquido do banco'}, equilibrando proteção e velocidade.`;
    }

    // --- 6. Reinvestimento --------------------------------------------
    let reinvestedToday = 0;

    const nextDayExistingGrossYield = contracts
      .filter((c) => day + 1 > c.startDay && day + 1 <= c.endDay)
      .reduce((sum, c) => sum + c.investedAmount * (c.dailyPercentage / 100), 0);

    let deficitRemaining = Math.max(0, targetDailyYield - nextDayExistingGrossYield);
    const isGoalMaintenance = daysToGoal !== null || dailyGross >= targetDailyYield;

    // Identifica quais templates da carteira consolidada ótima ainda faltam para o dia seguinte
    const missingOptimalTemplates: ProductTemplate[] = [];
    if (isGoalMaintenance && optimalGoalTemplates.length > 0) {
      const activeTomorrow = contracts.filter(
        (c) => day + 1 > c.startDay && day + 1 <= c.endDay
      );
      const needed = [...optimalGoalTemplates];
      for (const c of activeTomorrow) {
        const cYield = c.investedAmount * (c.dailyPercentage / 100);
        const matchIdx = needed.findIndex(
          (t) => Math.abs(tplDailyYield(t) - cYield) <= Math.max(0.1, tplDailyYield(t) * 0.05)
        );
        if (matchIdx !== -1) {
          needed.splice(matchIdx, 1);
        }
      }
      needed.sort((a, b) => b.investedAmount - a.investedAmount);
      missingOptimalTemplates.push(...needed);
    }

    const buy = (
      name: string,
      unitPrice: number,
      units: number,
      dailyPercentage: number,
      durationDays: number,
      returnCapitalAtEnd: boolean,
      templateId: string
    ) => {
      const spent = unitPrice * units;
      const addedDaily = spent * (dailyPercentage / 100);

      // Prévia do dia atual: registra a ação planejada, mas não altera o estado
      // financeiro. A confirmação do usuário recalcula o roadmap e materializa
      // o produto de verdade no App.
      if (!roadmapActionRealized) {
        projectedAcquisitions.push({
          id: `planned_d${day}_${templateId}`,
          name,
          day,
          date: dateOnDay,
          dateFormatted,
          unitPrice,
          units,
          totalSpent: spent,
          dailyYieldAdded: addedDaily,
          dailyPercentage,
          durationDays,
          returnCapitalAtEnd,
        });
        return;
      }

      currentFreeCash -= spent;
      bankBalance = Math.max(0, bankBalance - spent);
      deficitRemaining = Math.max(0, deficitRemaining - addedDaily);

      const normKey = getProductNormalizedKey(name);
      const isNewInv = !seenProductKeys.has(normKey) && !isGoalMaintenance;

      if (isNewInv) {
        newInvestmentsTodayAmount += spent;
        totalNewInvestments += spent;
        seenProductKeys.add(normKey);
      } else {
        reinvestedToday += spent;
        totalReinvested += spent;
      }

      // Registra cada aquisição futura planejada pelo algoritmo para alcançar a meta
      projectedAcquisitions.push({
        id: `acq_d${day}_${templateId}_${contractSeq}`,
        name,
        day,
        date: dateOnDay,
        dateFormatted,
        unitPrice,
        units,
        totalSpent: spent,
        dailyYieldAdded: addedDaily,
        dailyPercentage,
        durationDays,
        returnCapitalAtEnd,
      });

      const label = isNewInv
        ? `Novo investimento (${name})`
        : isGoalMaintenance
          ? `Otimização da carteira (${name})`
          : `Reinvestimento (${name})`;

      // CORREÇÃO (A13, C1): um contrato agrega N cotas idênticas, em vez de um
      // objeto por cota, e o id é determinístico (sem Math.random).
      contracts.push({
        id: `${isNewInv ? 'newinv' : 'reinv'}_d${day}_${templateId}_${contractSeq++}`,
        name: label,
        unitPrice,
        units,
        investedAmount: spent,
        dailyPercentage,
        durationDays,
        startDay: day,
        endDay: day + durationDays,
        returnCapitalAtEnd,
        isReinvestment: !isNewInv,
        isNewInvestment: isNewInv,
        isInitialPortfolio: false,
      });

      if (rawMilestones.length < MAX_MILESTONES) {
        rawMilestones.push({
          date: dateOnDay,
          dateFormatted,
          dayNumber: day,
          type: isNewInv ? 'new_investment' : isGoalMaintenance ? 'goal_maintenance' : 'reinvestment',
          title: `${isNewInv ? 'Novo investimento' : isGoalMaintenance ? 'Otimização / Consolidação' : 'Reinvestimento'} (${name}) +${formatCurrency(addedDaily)}/dia`,
          description: `${plural(units, 'cota', 'cotas')} de ${name} a ${formatCurrency(unitPrice)}, total de ${formatCurrency(spent)}.`,
          amount: spent,
          units,
          dailyYieldAfter: dailyGross + addedDaily,
        });
      }
    };

    const hasMissingOptimalToBuy = () =>
      isGoalMaintenance &&
      activeCount > minPossibleContracts &&
      missingOptimalTemplates.some((t) => t.investedAmount <= currentFreeCash);

    // Ações de aporte/reinvestimento em dias já vencidos só entram na carteira
    // quando aquele dia foi efetivamente concluído. No dia de hoje, porém,
    // ainda precisamos exibir a ação planejada para que o botão "Marcar Concluído"
    // consiga executá-la; ela é apenas uma prévia e não altera contratos, caixa
    // nem rendimento até a confirmação.
    const previewTodayAction = !roadmapActionRealized && dateOnDay === today;
    if ((roadmapActionRealized || previewTodayAction) && currentFreeCash >= minCandidatePrice && (deficitRemaining > 0 || hasMissingOptimalToBuy())) {
      for (let pass = 0; pass < 40; pass++) {
        const canConsolidateNow = hasMissingOptimalToBuy();
        if (deficitRemaining <= 0.001 && !canConsolidateNow) break;

        const affordable = purchasableTemplates.filter((t) => t.investedAmount <= currentFreeCash);
        if (affordable.length === 0) break;

        let chosen: ProductTemplate;
        let unitsToBuy = 1;

        if (isGoalMaintenance) {
          // 1. Se estamos em consolidação e temos cotas ótimas pendentes que cabem no caixa:
          const affordableMissing = missingOptimalTemplates.filter(
            (t) => t.investedAmount <= currentFreeCash
          );

          if (affordableMissing.length > 0) {
            chosen = affordableMissing[0];
            const optIdx = missingOptimalTemplates.indexOf(chosen);
            if (optIdx !== -1) missingOptimalTemplates.splice(optIdx, 1);
            unitsToBuy = 1;
          } else {
            // Se não há cotas ótimas ausentes acessíveis, só compra se houver déficit real de renda diária
            if (deficitRemaining <= 0.001) break;

            const validCandidates = affordable.filter(
              (t) => tplDailyYield(t) <= targetDailyYield * 1.05
            );
            const pool = validCandidates.length > 0 ? validCandidates : affordable;

            const sorted = [...pool].sort((a, b) => {
              const yieldA = tplDailyYield(a);
              const yieldB = tplDailyYield(b);

              const overshootA = Math.max(0, yieldA - deficitRemaining);
              const overshootB = Math.max(0, yieldB - deficitRemaining);

              const excessiveA = overshootA > Math.max(10, deficitRemaining * 0.25);
              const excessiveB = overshootB > Math.max(10, deficitRemaining * 0.25);

              if (excessiveA !== excessiveB) {
                return excessiveA ? 1 : -1;
              }

              if (Math.abs(yieldB - yieldA) > 0.01) {
                return yieldB - yieldA;
              }

              return b.dailyPercentage - a.dailyPercentage || a.investedAmount - b.investedAmount;
            });

            chosen = sorted[0];
            const yieldPerUnit = Math.max(0.01, tplDailyYield(chosen));
            unitsToBuy = Math.min(
              Math.ceil(deficitRemaining / yieldPerUnit),
              Math.floor(currentFreeCash / chosen.investedAmount)
            );
          }
        } else {
          // Fase de ramp-up até a meta
          const covering = affordable
            .filter((t) => tplDailyYield(t) >= deficitRemaining)
            .sort((a, b) => a.investedAmount - b.investedAmount);
          chosen = covering[0] ?? affordable[0];
          const yieldPerUnit = Math.max(0.01, tplDailyYield(chosen));
          unitsToBuy = Math.min(
            Math.ceil(deficitRemaining / yieldPerUnit),
            Math.floor(currentFreeCash / chosen.investedAmount)
          );
        }

        if (unitsToBuy <= 0) break;

        buy(
          chosen.name,
          chosen.investedAmount,
          unitsToBuy,
          chosen.dailyPercentage,
          chosen.durationDays,
          chosen.returnCapitalAtEnd ?? false,
          chosen.id
        );

        // Uma prévia representa uma única ação pendente do dia atual.
        if (previewTodayAction) break;
      }

      // Cota base como último recurso.
      if (deficitRemaining > 0.001 && currentFreeCash >= reinvestmentUnit.price) {
        const baseYield = Math.max(
          0.01,
          reinvestmentUnit.price * (reinvestmentUnit.dailyPercentage / 100)
        );
        const unitsToBuy = Math.min(
          Math.ceil(deficitRemaining / baseYield),
          Math.floor(currentFreeCash / reinvestmentUnit.price)
        );
        if (unitsToBuy > 0) {
          buy(
            reinvestmentUnit.name,
            reinvestmentUnit.price,
            unitsToBuy,
            reinvestmentUnit.dailyPercentage,
            reinvestmentUnit.durationDays,
            reinvestmentUnit.returnCapitalAtEnd,
            'base_unit'
          );
        }
      }
    }

    // --- 7. Marco da meta e Período de Otimização pós-meta -------------
    if (dailyGross >= targetDailyYield && daysToGoal === null) {
      daysToGoal = day;
      estimatedGoalDate = dateOnDay;
      rawMilestones.push({
        date: dateOnDay,
        dateFormatted,
        dayNumber: day,
        type: 'goal_reached',
        title: 'Meta diária conquistada',
        description: `A renda diária atingiu ${formatCurrency(dailyGross)}/dia (meta de ${formatCurrency(targetDailyYield)}/dia).`,
        dailyYieldAfter: dailyGross,
      });
    }

    // Início do período de otimização de produtos (reduzir ao mínimo necessário de produtos)
    if (dailyGross >= targetDailyYield && startOptimizationDay === null) {
      startOptimizationDay = day;
      initialContractsAtGoal = activeCount;
      lowestContractsPostGoal = activeCount;
      if (initialContractsAtGoal > minPossibleContracts && !optimizationStartMilestoneAdded) {
        optimizationStartMilestoneAdded = true;
        if (rawMilestones.length < MAX_MILESTONES) {
          rawMilestones.push({
            date: dateOnDay,
            dateFormatted,
            dayNumber: day,
            type: 'optimization_start',
            title: `Início do Período de Otimização (${initialContractsAtGoal} produtos)`,
            description: `Meta alcançada! O algoritmo inicia a consolidação dos contratos ativos para reduzir a quantidade de produtos de ${initialContractsAtGoal} para o mínimo viável (${minPossibleContracts} ${plural(minPossibleContracts, 'produto', 'produtos')}) sem perda de renda diária.`,
            dailyYieldAfter: dailyGross,
          });
        }
      }
    }

    // Acompanhamento do progresso da otimização pós-meta
    if (startOptimizationDay !== null && day >= startOptimizationDay) {
      if (activeCount < lowestContractsPostGoal && dailyGross >= targetDailyYield && activeCount >= minPossibleContracts) {
        lowestContractsPostGoal = activeCount;
      }
      if (
        activeCount > 0 &&
        activeCount <= minPossibleContracts &&
        dailyGross >= targetDailyYield &&
        initialContractsAtGoal > minPossibleContracts &&
        !optimizationCompletedMilestoneAdded &&
        day > startOptimizationDay
      ) {
        isOptimized = true;
        completionOptimizationDay = day;
        optimizationCompletedMilestoneAdded = true;
        const reduced = Math.max(0, initialContractsAtGoal - activeCount);
        const redPct = initialContractsAtGoal > 0 ? Math.round((reduced / initialContractsAtGoal) * 100) : 0;
        if (rawMilestones.length < MAX_MILESTONES) {
          rawMilestones.push({
            date: dateOnDay,
            dateFormatted,
            dayNumber: day,
            type: 'optimization_completed',
            title: `Otimização Concluída: Carteira Mínima (${activeCount} ${plural(activeCount, 'produto', 'produtos')})`,
            description: `Carteira otimizada com sucesso! Quantidade de produtos reduzida de ${initialContractsAtGoal} para ${activeCount} ativos (${redPct}% de redução), mantendo a meta de ${formatCurrency(targetDailyYield)}/dia com máxima simplicidade de gestão.`,
            dailyYieldAfter: dailyGross,
          });
        }
      }
    }

    // --- 8. Registro escalar do dia ------------------------------------
    const reservedForExpensesCalc = Number(Math.min(bankBalance, reservedCashForPending).toFixed(2));
    const reservedForReinvestmentCalc = Number(
      Math.max(0, bankBalance - reservedForExpensesCalc - totalProtectedCashAccumulated).toFixed(2)
    );

    dayRecords.push({
      day,
      date: dateOnDay,
      dateFormatted,
      dailyGross: Number(dailyGross.toFixed(2)),
      dailyNetIfWithdrawn: Number(dailyNetIfWithdrawn.toFixed(2)),
      accumulatedGrossYield: Number(accumulatedGrossYield.toFixed(2)),
      cashBalance: Number(bankBalance.toFixed(2)),
      bankBalance: Number(bankBalance.toFixed(2)),
      platformBalance: Number(platformBalance.toFixed(2)),
      reservedForExpenses: reservedForExpensesCalc,
      reservedForReinvestment: reservedForReinvestmentCalc,
      dynamicBufferPercentage: effectiveDynamicBufferPct,
      protectedToday: Number(protectedToday.toFixed(2)),
      totalProtectedAccumulated: Number(totalProtectedCashAccumulated.toFixed(2)),
      riskExposureLevel,
      protectionTip,
      avgRemainingDays: Number(avgRemainingDurationOnDay.toFixed(1)),
      maxRemainingDays: maxRemainingDurationOnDay,
      capitalInLongContracts: Number(capitalInLongContractsOnDay.toFixed(2)),
      contractsExpiringSoonCount: contractsExpiringSoonCountOnDay,
      capitalReturnedToday: Number(capitalReturnedToday.toFixed(2)),
      expensesDeductedToday: Number(expensesDeductedToday.toFixed(2)),
      expensesPaidFromBlindagemToday: Number(expensesPaidFromBlindagemToday.toFixed(2)),
      expensesPaidFromFreeBankToday: Number(expensesPaidFromFreeBankToday.toFixed(2)),
      totalExpensesDeductedUpToDay: Number(totalExpensesDeducted.toFixed(2)),
      reinvestedToday: Number(reinvestedToday.toFixed(2)),
      totalReinvestedUpToDay: Number(totalReinvested.toFixed(2)),
      newInvestmentsTodayAmount: Number(newInvestmentsTodayAmount.toFixed(2)),
      activeContractsCount: activeCount,
      activeInvestedAmount: Number(activeInvestedAmount.toFixed(2)),
      isProtectionPoint: isProtectionPointToday,
      expenseIdsToday,
      isOptimizationPhase: startOptimizationDay !== null && day >= startOptimizationDay,
      isOptimizedState: isOptimized && completionOptimizationDay !== null && day >= completionOptimizationDay,
    });

    // Encerra assim que o horizonte útil é alcançado.
    if (horizonDays === undefined) {
      if (daysToGoal !== null) {
        // Se a meta foi batida, permite que o período de consolidação/otimização execute
        const maxDurationOfContracts = Math.max(
          ...contracts.map((c) => c.durationDays),
          30
        );
        const optimizationHorizon = (startOptimizationDay ?? daysToGoal) + maxDurationOfContracts + 2;
        const reachedOptimum =
          isOptimized || (activeCount <= minPossibleContracts && day > (startOptimizationDay ?? daysToGoal));

        if (
          (reachedOptimum && day >= (startOptimizationDay ?? daysToGoal) + 5) ||
          day >= optimizationHorizon ||
          day >= autoHorizonCap
        ) {
          break;
        }
      } else if (day >= autoHorizonCap) {
        break;
      }
    }
  }

  // =====================================================================
  // Horizonte exibido
  // =====================================================================
  let displayHorizon = dayRecords.length - 1;
  if (horizonDays !== undefined) {
    displayHorizon = Math.min(horizonDays, dayRecords.length - 1);
  }

  const visibleRecords = dayRecords.slice(0, displayHorizon + 1);

  const toSnapshot = (c: InternalContract, day: number): RoadmapContractSnapshot => ({
    id: c.id,
    name: c.name,
    investedAmount: c.investedAmount,
    unitPrice: c.unitPrice,
    units: c.units,
    dailyPercentage: c.dailyPercentage,
    dailyYield: Number((c.investedAmount * (c.dailyPercentage / 100)).toFixed(2)),
    durationDays: c.durationDays,
    startDateFormatted: formatDateBR(addDays(baseStartDate, c.startDay)),
    endDateFormatted: formatDateBR(addDays(baseStartDate, c.endDay)),
    startDay: c.startDay,
    endDay: c.endDay,
    daysRemaining: Math.max(0, c.endDay - day),
    returnCapitalAtEnd: c.returnCapitalAtEnd,
    isReinvestment: c.isReinvestment,
    isNewInvestment: c.isNewInvestment,
    isInitialPortfolio: Boolean(c.isInitialPortfolio),
    isAcquiredToday: c.startDay === day && !c.isInitialPortfolio,
    acquisitionDay: c.startDay,
  });

  /**
   * CORREÇÃO (C1): os detalhes de um dia são reconstruídos sob demanda a partir
   * do array final de contratos. Antes, cada um dos 365 pontos carregava cópias
   * do histórico inteiro — centenas de MB retidos em memória.
   */
  const getDayDetails = (day: number): RoadmapPointDetails | null => {
    const rec = dayRecords.find((r) => r.day === day);
    if (!rec) return null;

    const pendingAcquisitionsToday: RoadmapContractSnapshot[] = projectedAcquisitions
      .filter((acq) => acq.day === day && !canRealizeRoadmapAction(acq.date))
      .map((acq) => ({
        id: acq.id,
        name: acq.name,
        investedAmount: acq.totalSpent,
        unitPrice: acq.unitPrice,
        units: acq.units,
        dailyPercentage: acq.dailyPercentage,
        dailyYield: acq.dailyYieldAdded,
        durationDays: acq.durationDays,
        startDateFormatted: acq.dateFormatted,
        endDateFormatted: formatDateBR(addDays(acq.date, acq.durationDays)),
        startDay: acq.day,
        endDay: acq.day + acq.durationDays,
        daysRemaining: acq.durationDays,
        returnCapitalAtEnd: acq.returnCapitalAtEnd,
        isReinvestment: true,
        isNewInvestment: true,
        isInitialPortfolio: false,
        isAcquiredToday: false,
        acquisitionDay: acq.day,
      }));

    const acquisitionsToday = [
      ...contracts
        .filter((c) => c.startDay === day && !c.isInitialPortfolio)
        .map((c) => toSnapshot(c, day)),
      ...pendingAcquisitionsToday,
    ];

    return {
      day: rec.day,
      date: rec.date,
      dateFormatted: rec.dateFormatted,
      isStartDate: isCustomStartPoint ? rec.date === baseStartDate : rec.day === 0,
      isToday: rec.date === today,
      isOptimizationPhase: rec.isOptimizationPhase,
      isOptimizedState: rec.isOptimizedState,
      dailyYield: rec.dailyGross,
      dailyYieldNet: rec.dailyNetIfWithdrawn,
      accumulatedYield: rec.accumulatedGrossYield,
      cashBalance: rec.cashBalance,
      bankBalance: rec.bankBalance,
      platformBalance: rec.platformBalance,
      reservedForExpenses: rec.reservedForExpenses,
      reservedForReinvestment: rec.reservedForReinvestment,
      dynamicBufferPercentage: rec.dynamicBufferPercentage,
      suggestedProtectionToday: rec.protectedToday,
      totalProtectedAccumulated: rec.totalProtectedAccumulated,
      riskExposureLevel: rec.riskExposureLevel,
      protectionTip: rec.protectionTip,
      contractDurationRisk: {
        avgRemainingDays: rec.avgRemainingDays,
        maxRemainingDays: rec.maxRemainingDays,
        capitalInLongContracts: rec.capitalInLongContracts,
        contractsExpiringSoonCount: rec.contractsExpiringSoonCount,
      },
      capitalReturnedToday: rec.capitalReturnedToday,
      expensesDeductedToday: rec.expensesDeductedToday,
      expensesPaidFromBlindagemToday: rec.expensesPaidFromBlindagemToday,
      expensesPaidFromFreeBankToday: rec.expensesPaidFromFreeBankToday,
      totalExpensesDeductedUpToDay: rec.totalExpensesDeductedUpToDay,
      reinvestedToday: rec.reinvestedToday,
      totalReinvestedUpToDay: rec.totalReinvestedUpToDay,
      activeContractsCount: rec.activeContractsCount,
      activeInvestedAmount: rec.activeInvestedAmount,
      targetYield: targetDailyYield,
      progressPercent: targetDailyYield > 0
        ? Number(Math.min(100, (rec.dailyGross / targetDailyYield) * 100).toFixed(1))
        : 100,
      isGoalReached: rec.dailyGross >= targetDailyYield,
      activeContracts: contracts
        .filter((c) => day >= c.startDay && day < c.endDay)
        .map((c) => toSnapshot(c, day)),
      acquisitionsToday,
      newPurchasesToday: acquisitionsToday,
      newInvestmentsToday: acquisitionsToday,
      newInvestmentsUpToDay: contracts
        .filter((c) => c.startDay <= day && (c.isNewInvestment || !c.isInitialPortfolio))
        .map((c) => toSnapshot(c, day)),
      allReinvestmentsUpToDay: contracts
        .filter((c) => c.startDay <= day && !c.isInitialPortfolio)
        .map((c) => toSnapshot(c, day)),
      expiredContractsUpToDay: contracts
        .filter((c) => c.endDay <= day)
        .map((c) => toSnapshot(c, day)),
      expiredTodayContracts: contracts
        .filter((c) => c.endDay === day)
        .map((c) => toSnapshot(c, day)),
      expensesTodayList: (() => {
        const paidOrDeducted = rec.expenseIdsToday
          .map((id) => expenseById.get(id))
          .filter((e): e is Expense => Boolean(e));
        // `scheduledPendingExpenses` é mutável durante a simulação e pode
        // terminar com `deducted=true` porque a despesa foi paga alguns dias
        // depois. Os detalhes de um dia histórico, porém, precisam continuar
        // mostrando a ação que estava planejada naquela data. Por isso, aqui
        // usamos a data programada como fonte histórica e deixamos o Map por ID
        // eliminar a duplicação quando o pagamento também ocorreu no mesmo dia.
        const pendingForThisDate = scheduledPendingExpenses
          .filter((item) => !item.unfundable && item.scheduledDate === rec.date)
          .map((item) => item.expense);

        // O vencimento original também faz parte do histórico do roadmap.
        // Assim, se uma conta venceu em 21/09 e foi reagendada para 22/09,
        // o detalhe de 21/09 continua mostrando a dívida como vencida, sem
        // duplicá-la em 23/09. A execução continua vinculada somente à data
        // agendada/concluída.
        const overdueOnOriginalDueDate = scheduledPendingExpenses
          .filter((item) => {
            if (item.unfundable) return false;
            const dueDate = item.expense.dueDate?.trim().split('T')[0];
            return Boolean(
              dueDate &&
              dueDate === rec.date &&
              dueDate < today &&
              item.scheduledDate > dueDate
            );
          })
          .map((item) => item.expense);

        const byId = new Map<string, Expense>();
        [...paidOrDeducted, ...overdueOnOriginalDueDate, ...pendingForThisDate].forEach((expense) => byId.set(expense.id, expense));
        return Array.from(byId.values());
      })(),
    };
  };

  const chartData: PortfolioRoadmapPoint[] = visibleRecords.map((rec) => ({
    day: rec.day,
    date: rec.date,
    dateFormatted: rec.dateFormatted,
    dailyYield: rec.dailyGross,
    dailyYieldNet: rec.dailyNetIfWithdrawn,
    accumulatedYield: rec.accumulatedGrossYield,
    capitalReturnedToday: rec.capitalReturnedToday,
    expensesDeductedToday: rec.expensesDeductedToday,
    reinvestedToday: rec.reinvestedToday,
    newInvestmentsToday: rec.newInvestmentsTodayAmount,
    activeContractsCount: rec.activeContractsCount,
    activeInvestedAmount: rec.activeInvestedAmount,
    targetYield: targetDailyYield,
    dynamicBufferPercentage: rec.dynamicBufferPercentage,
    suggestedProtectionToday: rec.protectedToday,
    totalProtectedAccumulated: rec.totalProtectedAccumulated,
    isProtectionPoint: rec.isProtectionPoint,
    isGoalReached: rec.dailyGross >= targetDailyYield,
    isOptimizationPhase: rec.isOptimizationPhase,
    isOptimizedState: rec.isOptimizedState,
    isStartDate: isCustomStartPoint ? rec.date === baseStartDate : rec.day === 0,
    isToday: rec.date === today,
    bankBalance: rec.bankBalance,
    platformBalance: rec.platformBalance,
    cashBalance: rec.cashBalance,
  }));

  const milestones = rawMilestones
    .filter((m) => m.dayNumber <= displayHorizon)
    .sort((a, b) => a.dayNumber - b.dayNumber);

  // CORREÇÃO (A6): a média usa apenas os dias efetivamente exibidos, o que
  // antes produzia percentuais acima de 100%.
  const visibleBuffers = dynamicBufferPercentages.slice(0, visibleRecords.length);
  const dynamicBufferAvg =
    visibleBuffers.length > 0
      ? Number((visibleBuffers.reduce((s, v) => s + v, 0) / visibleBuffers.length).toFixed(1))
      : 0;

  const lastRecord = visibleRecords[visibleRecords.length - 1];
  const finalProtected = lastRecord ? lastRecord.totalProtectedAccumulated : 0;

  // Meta e contagem regressiva:
  // Se a meta foi batida em data menor ou igual a hoje ou ao marco inicial, ela já foi alcançada.
  const goalAlreadyReached =
    estimatedGoalDate !== null && (estimatedGoalDate <= today || estimatedGoalDate <= baseStartDate);

  const daysToGoalCalculated =
    estimatedGoalDate === null
      ? null
      : goalAlreadyReached
        ? 0
        : isCustomStartPoint && baseStartDate > today
          ? Math.max(0, diffInDays(baseStartDate, estimatedGoalDate))
          : Math.max(0, diffInDays(today, estimatedGoalDate));

  const protectionEvents = milestones.filter(
    (m) => m.type === 'capital_protection' && (m.protectionAmount ?? m.amount ?? 0) > 0
  );

  // Agrupamento dos novos produtos projetados para aquisição durante o ciclo
  const groupMap = new Map<string, ProjectedAcquisitionGroup>();
  for (const acq of projectedAcquisitions) {
    const existing = groupMap.get(acq.name);
    if (existing) {
      existing.totalUnits += acq.units;
      existing.totalSpent += acq.totalSpent;
      existing.totalDailyYieldAdded += acq.dailyYieldAdded;
      if (!existing.scheduledDays.includes(acq.day)) {
        existing.scheduledDays.push(acq.day);
      }
    } else {
      const group: ProjectedAcquisitionGroup = {
        name: acq.name,
        unitPrice: acq.unitPrice,
        totalUnits: acq.units,
        totalSpent: acq.totalSpent,
        totalDailyYieldAdded: acq.dailyYieldAdded,
        dailyPercentage: acq.dailyPercentage,
        durationDays: acq.durationDays,
        scheduledDays: [acq.day],
      };
      groupMap.set(acq.name, group);
    }
  }

  const projectedAcquisitionsGrouped = Array.from(groupMap.values());
  const totalProjectedAcquisitionsCount = projectedAcquisitions.reduce(
    (sum, a) => sum + a.units,
    0
  );
  const totalProjectedAcquisitionsAmount = projectedAcquisitions.reduce(
    (sum, a) => sum + a.totalSpent,
    0
  );

  // ---------------------------------------------------------------------
  // Resumo do Período de Otimização e Consolidação Pós-Meta
  // ---------------------------------------------------------------------
  const finalOptimizedCount =
    lowestContractsPostGoal !== Infinity && lowestContractsPostGoal > 0
      ? Math.max(minPossibleContracts, lowestContractsPostGoal)
      : activeProducts.length;
  const contractsReduced = Math.max(0, initialContractsAtGoal - finalOptimizedCount);
  const reductionPercentage =
    initialContractsAtGoal > 0 ? Math.round((contractsReduced / initialContractsAtGoal) * 100) : 0;

  const optimizationSummary: PortfolioOptimizationSummary = {
    isOptimizationActive: startOptimizationDay !== null,
    isOptimized: isOptimized || (startOptimizationDay !== null && finalOptimizedCount <= minPossibleContracts),
    startDay: startOptimizationDay,
    startDateFormatted: startOptimizationDay !== null ? formatDateBR(addDays(baseStartDate, startOptimizationDay)) : null,
    completionDay: completionOptimizationDay,
    completionDateFormatted: completionOptimizationDay !== null ? formatDateBR(addDays(baseStartDate, completionOptimizationDay)) : null,
    initialContractsAtGoal,
    minPossibleContracts,
    optimizedContractsCount: finalOptimizedCount,
    contractsReduced,
    reductionPercentage,
    durationDays:
      completionOptimizationDay !== null && startOptimizationDay !== null
        ? Math.max(0, completionOptimizationDay - startOptimizationDay)
        : 0,
    statusDescription:
      isOptimized || (startOptimizationDay !== null && finalOptimizedCount <= minPossibleContracts)
        ? `Carteira consolidada para ${plural(finalOptimizedCount, 'produto ativo', 'produtos ativos')} (${reductionPercentage}% de redução)`
        : startOptimizationDay !== null
          ? `Consolidando ${initialContractsAtGoal} produtos rumo ao mínimo de ${minPossibleContracts}`
          : `Atingir a meta para iniciar a consolidação de produtos`,
  };

  return {
    currentDailyYield: Number(currentDailyYield.toFixed(2)),
    targetDailyYield,
    percentOfGoalReached: targetDailyYield > 0
      ? Number(Math.min(100, (currentDailyYield / targetDailyYield) * 100).toFixed(1))
      : 100,
    isGoalReached: goalAlreadyReached,
    goalReachedOn: goalAlreadyReached ? estimatedGoalDate : null,
    daysToGoal: daysToGoalCalculated,
    daysToGoalFromCycleStart: daysToGoal,
    estimatedGoalDate,
    estimatedGoalDateFormatted: estimatedGoalDate ? formatDateBR(estimatedGoalDate) : null,
    baseStartDate,
    isCustomStartPoint,

    // Acumuladores separados: rendimento, principal e taxas nunca se misturam.
    totalProjectedGrossYield: Number(accumulatedGrossYield.toFixed(2)),
    totalProjectedNetProfit: Number((accumulatedGrossYield - accumulatedFeesPaid).toFixed(2)),
    totalCapitalReturned: Number(accumulatedCapitalReturned.toFixed(2)),
    totalWithdrawalFeesPaid: Number(accumulatedFeesPaid.toFixed(2)),

    totalReinvested: Number(totalReinvested.toFixed(2)),
    totalNewInvestments: Number(totalNewInvestments.toFixed(2)),
    totalExpensesDeducted: Number(totalExpensesDeducted.toFixed(2)),
    totalCapitalToReturn: Number(
      contracts
        .filter((c) => c.returnCapitalAtEnd && c.endDay > todayOffset)
        .reduce((sum, c) => sum + c.investedAmount, 0)
        .toFixed(2)
    ),
    activeProductsCount: activeProducts.length,
    maxDailyYield: Number(maxDailyYield.toFixed(2)),
    finalBankBalance: lastRecord ? lastRecord.bankBalance : 0,
    finalPlatformBalance: lastRecord ? lastRecord.platformBalance : 0,

    totalProtectedAmountSuggested: Number(finalProtected.toFixed(2)),
    protectionCheckpointsCount: protectionEvents.length,
    dynamicBufferAvg,
    initialCapitalSecuredPercent:
      initialPortfolioCapital > 0
        ? Math.min(100, Math.round((finalProtected / initialPortfolioCapital) * 100))
        : 100,
    protectionSummaryTip:
      finalProtected > 0
        ? `Blindagem dinâmica em ${formatPercentBR(dynamicBufferAvg)} médio ao dia${protectionEvents.length > 0 ? `, com ${plural(protectionEvents.length, 'marco de segurança', 'marcos de segurança')}` : ''}. Total de ${formatCurrency(finalProtected)} já retirado da plataforma, líquido de taxas.`
        : `Blindagem dinâmica em ${formatPercentBR(dynamicBufferAvg)} médio, equilibrando proteção e velocidade rumo à meta.`,

    optimizationSummary,
    unfundableExpenses,
    reinvestmentUnitUsed: reinvestmentUnit,
    projectedAcquisitions,
    projectedAcquisitionsGrouped,
    totalProjectedAcquisitionsCount,
    totalProjectedAcquisitionsAmount,
    chartData,
    milestones,
    getDayDetails,
  };
}
