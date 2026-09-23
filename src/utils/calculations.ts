import {
  InvestmentProduct,
  Expense,
  PlatformSettings,
  ProductCalculations,
  DayDetail,
  ExpensePaymentOptimization,
} from '../types/investment';

// Formatação monetária em Reais (BRL)
export function formatCurrency(value: number): string {
  if (isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// Formatação de porcentagem
export function formatPercent(value: number, decimals: number = 2): string {
  if (isNaN(value)) return '0,00%';
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals).replace('.', ',')}%`;
}

/** Converte para número finito; devolve o padrão quando o valor é inválido. */
export function toFiniteNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Saneia as configurações na fronteira do app (localStorage, Firestore, forms).
 *
 * CORREÇÃO: sem isso, um campo ausente ou corrompido vira `NaN` e contamina
 * silenciosamente todo o motor de cálculo. O guarda de `isNaN` em
 * `formatCurrency` transformava a corrupção em "R$ 0,00" em toda a interface.
 */
export function normalizeSettings(raw: Partial<PlatformSettings> | null | undefined): PlatformSettings {
  const s = raw ?? {};
  return {
    // Taxa limitada a 99% para nunca produzir divisor zero ou líquido negativo.
    withdrawalFeePercentage: Math.min(99, Math.max(0, toFiniteNumber(s.withdrawalFeePercentage, 0))),
    fixedWithdrawalFee: Math.max(0, toFiniteNumber(s.fixedWithdrawalFee, 0)),
    minWithdrawalAmount: Math.max(0, toFiniteNumber(s.minWithdrawalAmount, 0)),
    minDepositAmount: Math.max(0, toFiniteNumber(s.minDepositAmount, 0)),
    dailyGoalAmount: Math.max(1, toFiniteNumber(s.dailyGoalAmount, 150)),
    reinvestmentBufferPercentage: Math.min(
      100,
      Math.max(0, toFiniteNumber(s.reinvestmentBufferPercentage, 20))
    ),
    goalCycleStartDate:
      typeof s.goalCycleStartDate === 'string' && s.goalCycleStartDate.trim()
        ? s.goalCycleStartDate.trim().split('T')[0]
        : undefined,
    dynamicBufferEnabled: s.dynamicBufferEnabled !== false,
    protectionProfile:
      s.protectionProfile === 'conservative' ||
      s.protectionProfile === 'aggressive' ||
      s.protectionProfile === 'accelerated'
        ? s.protectionProfile
        : 'balanced',
    manualBankInjection: Math.max(0, toFiniteNumber(s.manualBankInjection, 0)),
    manualBankInjectionDate:
      typeof s.manualBankInjectionDate === 'string' && s.manualBankInjectionDate.trim()
        ? s.manualBankInjectionDate.trim().split('T')[0]
        : undefined,
    manualProtectionInjection: Math.max(0, toFiniteNumber(s.manualProtectionInjection, 0)),
    manualProtectionInjectionDate:
      typeof s.manualProtectionInjectionDate === 'string' && s.manualProtectionInjectionDate.trim()
        ? s.manualProtectionInjectionDate.trim().split('T')[0]
        : undefined,
    completedRoadmapDays: Array.isArray(s.completedRoadmapDays)
      ? s.completedRoadmapDays.filter((d): d is string => typeof d === 'string' && Boolean(d.trim()))
      : [],
    // Lançamentos manuais: descarta entradas malformadas e normaliza as demais.
    // `bank` pode ser negativo de propósito — não usar Math.max(0, ...) aqui.
    manualCashMovements: Array.isArray(s.manualCashMovements)
      ? s.manualCashMovements
          .filter(
            (m): m is NonNullable<typeof m> =>
              Boolean(m) &&
              typeof m.date === 'string' &&
              Boolean(m.date.trim()) &&
              Number.isFinite(Number(m.bank))
          )
          .map((m) => ({
            id:
              typeof m.id === 'string' && m.id.trim()
                ? m.id
                : `mv-${m.date.trim().split('T')[0]}-${Math.random().toString(36).slice(2, 8)}`,
            date: m.date.trim().split('T')[0],
            bank: Number(m.bank) || 0,
            protection: Number.isFinite(Number(m.protection)) ? Number(m.protection) : 0,
            note: typeof m.note === 'string' ? m.note.slice(0, 200) : undefined,
          }))
      : [],
    // Datas (YYYY-MM-DD) em que o usuario adiou as compras do dia.
    deferredAcquisitions: Array.isArray(s.deferredAcquisitions)
      ? Array.from(
          new Set(
            s.deferredAcquisitions
              .filter((d): d is string => typeof d === 'string' && Boolean(d.trim()))
              .map((d) => d.trim().split('T')[0])
          )
        )
      : [],
  };
}

/** Número no padrão brasileiro: separador decimal vírgula e milhar ponto. */
export function formatNumberBR(value: number, decimals: number = 1): string {
  if (!Number.isFinite(value)) return '0';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** Percentual no padrão brasileiro, sem sinal forçado. Ex.: 51,1% */
export function formatPercentBR(value: number, decimals: number = 1): string {
  return `${formatNumberBR(value, decimals)}%`;
}

/**
 * Plural correto em vez de "dias" / "produto(s)".
 * Ex.: plural(1, 'dia', 'dias') -> "1 dia"
 */
export function plural(count: number, singular: string, pluralForm: string, decimals = 0): string {
  const label = Math.abs(count) === 1 ? singular : pluralForm;
  const num = decimals > 0 ? formatNumberBR(count, decimals) : String(Math.round(count));
  return `${num} ${label}`;
}

// Data local formatada (DD/MM/AAAA)
export function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const clean = dateStr.trim().split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

// Data atual no formato YYYY-MM-DD
export function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Adiciona dias a uma string YYYY-MM-DD
export function addDays(dateStr: string, days: number): string {
  const clean = dateStr.trim().split('T')[0];
  const d = new Date(clean + 'T00:00:00');
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Adiciona meses a uma string YYYY-MM-DD mantendo o dia o mais próximo possível
export function addMonths(dateStr: string, months: number): string {
  if (!dateStr) return '';
  const clean = dateStr.trim().split('T')[0];
  const parts = clean.split('-');
  if (parts.length !== 3) return dateStr;

  const origYear = parseInt(parts[0], 10);
  const origMonth = parseInt(parts[1], 10) - 1; // 0-indexed
  const origDay = parseInt(parts[2], 10);

  const targetDate = new Date(origYear, origMonth + months, 1);
  const daysInTargetMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
  const targetDay = Math.min(origDay, daysInTargetMonth);

  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDay).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Diferença de dias entre duas datas (date2 - date1)
export function diffInDays(date1Str?: string, date2Str?: string): number {
  if (!date1Str || !date2Str) return 0;
  const d1Str = date1Str.trim().split('T')[0];
  const d2Str = date2Str.trim().split('T')[0];
  const d1 = new Date(d1Str + 'T00:00:00');
  const d2 = new Date(d2Str + 'T00:00:00');
  const diffTime = d2.getTime() - d1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

// Calcula todas as métricas financeiras de um produto
export function calculateProductMetrics(
  product: InvestmentProduct,
  settings: PlatformSettings,
  currentDateStr: string = getTodayString()
): ProductCalculations {
  const safeSettings = normalizeSettings(settings);
  // CORREÇÃO: aporte zero produzia Infinity/NaN nos percentuais.
  const invested = Math.max(0, toFiniteNumber(product.investedAmount, 0));
  const dailyYield = invested * (toFiniteNumber(product.dailyPercentage, 0) / 100);
  const totalDailyYieldSum = dailyYield * Math.max(0, product.durationDays);

  // Retorno Bruto: Rendimentos diários + Capital se devolvido no fim
  const grossReturnAmount = product.returnCapitalAtEnd
    ? invested + totalDailyYieldSum
    : totalDailyYieldSum;

  const grossReturnPercentage = invested > 0 ? (grossReturnAmount / invested) * 100 : 0;

  // Taxa de saque da plataforma aplicada sobre os rendimentos ou saque total
  const feeRate = safeSettings.withdrawalFeePercentage / 100;
  const totalWithdrawalFee = grossReturnAmount * feeRate + safeSettings.fixedWithdrawalFee;

  // Total líquido recebido após desconto da taxa de saque da plataforma
  const netTotalReceived = Math.max(0, grossReturnAmount - totalWithdrawalFee);

  // Lucro líquido real (deduzindo o investimento inicial)
  const netProfitAmount = netTotalReceived - invested;
  const netProfitPercentage = invested > 0 ? (netProfitAmount / invested) * 100 : 0;

  // Dias para recuperar o investimento (Payback).
  // Com devolução de capital no fim, o payback é o próprio prazo do contrato.
  const paybackDays =
    dailyYield > 0
      ? product.returnCapitalAtEnd
        ? Math.min(product.durationDays, Math.ceil(invested / dailyYield))
        : Math.ceil(invested / dailyYield)
      : 0;

  // Datas e progresso
  const endDate = addDays(product.startDate, product.durationDays);
  const daysElapsed = Math.max(0, Math.min(product.durationDays, diffInDays(product.startDate, currentDateStr)));
  const daysRemaining = Math.max(0, product.durationDays - daysElapsed);
  const progressPercentage =
    product.durationDays > 0
      ? Math.min(100, Math.max(0, (daysElapsed / product.durationDays) * 100))
      : 0;
  // Produto está expirado se a data atual for igual ou posterior à data de término (endDate)
  const isExpired = diffInDays(product.startDate, currentDateStr) >= product.durationDays;

  return {
    dailyYield,
    totalDailyYieldSum,
    grossReturnAmount,
    grossReturnPercentage,
    netProfitAmount,
    netProfitPercentage,
    totalWithdrawalFee,
    paybackDays,
    endDate,
    daysElapsed,
    daysRemaining,
    progressPercentage,
    isExpired,
  };
}

// Verifica se um produto está efetivamente gerando rendimento em determinada data (após 24h da compra)
export function isProductYieldingOnDate(
  product: InvestmentProduct,
  dateStr: string = getTodayString()
): boolean {
  if (product.status === 'paused') return false;
  if (product.status === 'completed') return false;

  const daysFromStart = diffInDays(product.startDate, dateStr);
  // O rendimento ocorre após 24h (a partir do dia 1) até o dia final contratado (durationDays)
  return daysFromStart >= 1 && daysFromStart <= product.durationDays;
}

// Verifica se um produto está sob custódia/ativo em determinada data
export function isProductActiveOnDate(
  product: InvestmentProduct,
  dateStr: string = getTodayString()
): boolean {
  if (product.status === 'paused') return false;
  if (product.status === 'completed') return false;

  const daysFromStart = diffInDays(product.startDate, dateStr);
  // Ativo sob custódia desde o dia da compra (dia 0) até o vencimento (durationDays)
  return daysFromStart >= 0 && daysFromStart <= product.durationDays;
}

// Projeção diária para calendário e fluxo de caixa
export function generateDayProjections(
  products: InvestmentProduct[],
  expenses: Expense[],
  settings: PlatformSettings,
  startDateStr: string,
  totalDays: number = 60
): Record<string, DayDetail> {
  const result: Record<string, DayDetail> = {};
  let runningNetBalance = 0;

  // Mapeia otimizações das despesas para preencher expensesRecommended no calendário
  const optimizationsMap = calculateAllExpensesOptimizations(expenses, products, settings, startDateStr);

  for (let i = 0; i < totalDays; i++) {
    const dayStr = addDays(startDateStr, i);
    let dayYield = 0;
    let capitalReturned = 0;
    const dayProducts: DayDetail['products'] = [];

    // Produtos ativos no dia
    products.forEach((p) => {
      if (p.status === 'paused') return;

      const pStart = p.startDate;

      // Rendimento inicia 24h após a compra (dia 1 até durationDays)
      const daysFromStart = diffInDays(pStart, dayStr);
      const isYieldingToday = daysFromStart >= 1 && daysFromStart <= p.durationDays;
      const isMaturityDay = daysFromStart === p.durationDays;

      if (isYieldingToday) {
        const pDailyYield = p.investedAmount * (p.dailyPercentage / 100);
        dayYield += pDailyYield;
        dayProducts.push({
          productId: p.id,
          productName: p.name,
          yield: pDailyYield,
          isMaturityDay: false,
          capitalReturn: 0,
        });
      }

      if (isMaturityDay && p.returnCapitalAtEnd) {
        capitalReturned += p.investedAmount;
        dayProducts.push({
          productId: p.id,
          productName: `${p.name} (Devolução de Capital)`,
          yield: 0,
          isMaturityDay: true,
          capitalReturn: p.investedAmount,
        });
      }
    });

    // CORREÇÃO: o caixa na plataforma é BRUTO. A taxa de saque só é aplicada
    // no momento do saque, já embutida em `requiredAmountWithFee`. Antes, a
    // taxa era descontada aqui e novamente no pagamento.
    const dayGrossInflow = dayYield + capitalReturned;
    runningNetBalance += dayGrossInflow;

    // Despesas do dia
    const expensesDue = expenses.filter((e) => !e.isPaid && e.dueDate === dayStr);
    const expensesRecommended = expenses.filter((e) => {
      if (e.isPaid) return false;
      const opt = optimizationsMap.get(e.id);
      return opt ? opt.bestDate === dayStr : e.dueDate === dayStr;
    });

    // Abate de caixa no dia recomendado de saque
    expensesRecommended.forEach((e) => {
      const opt = optimizationsMap.get(e.id);
      const requiredNet = opt ? opt.requiredAmountWithFee : e.amount;
      runningNetBalance = Math.max(0, runningNetBalance - requiredNet);
    });

    result[dayStr] = {
      date: dayStr,
      dailyYield: dayYield,
      capitalReturned: capitalReturned,
      totalGrossInflow: dayGrossInflow,
      activeProductsCount: dayProducts.filter(p => !p.isMaturityDay).length,
      products: dayProducts,
      expensesDue: expensesDue,
      expensesRecommended: expensesRecommended,
      accumulatedBalance: runningNetBalance,
    };
  }

  return result;
}

// Classificação Inteligente de Urgência de Despesas
// Princípio de Otimização de Ganhos e Juros Compostos:
// Não sugerir nem antecipar saques de contas que faltem mais de 15 dias para o vencimento.
// O dinheiro deve continuar investido na plataforma gerando rendimentos diários para encurtar o prazo da meta!
// Tier 1: Vencimento Iminente / Atrasado (vence em até 15 dias ou com janela de acúmulo no limite)
// Tier 2: Faturas Futuras (> 15 dias, ex: empréstimos ou contas que vencem daqui a semanas ou meses)
//         Não bloqueiam nem sequestram o caixa atual; o pagamento é programado estritamente para a janela ideal (<= 15 dias antes)
// Tier 3: Despesas Sem Data Fixa (flexíveis, sem prazo legal a cumprir)
//         CORREÇÃO (Prioridade Meta): ficam por ÚLTIMO, depois até das faturas
//         futuras com data real — o Roadmap completo (roadmap.ts) só as quita
//         depois que a Meta Diária Principal é conquistada, então elas nunca
//         devem furar a fila de contas com vencimento de verdade nem reservar
//         caixa de curto prazo que pertenceria ao reinvestimento.
//         Dentro do Tier, prioriza menores valores primeiro (Snowball).
export function getExpenseUrgencyTier(
  expense: Expense,
  todayStr: string = getTodayString(),
  dailyNetYield: number = 0
): { tier: number; sortKey: number } {
  const hasDueDate = Boolean(expense.dueDate && expense.dueDate.trim());
  
  if (!hasDueDate) {
    return { tier: 3, sortKey: expense.amount };
  }

  const daysUntilDue = diffInDays(todayStr, expense.dueDate!);
  const daysToAccumulate = dailyNetYield > 0 ? Math.ceil(expense.amount / dailyNetYield) : 1;
  const bufferDays = daysUntilDue - daysToAccumulate;

  // Tier 1: Vencimento Iminente (<= 15 dias) ou Atrasado (< 0 dias), ou prazo de acúmulo no limite crítico (buffer <= 3 dias)
  if (daysUntilDue <= 15 || bufferDays <= 3) {
    return { tier: 1, sortKey: daysUntilDue };
  }

  // Tier 2: Faturas com vencimento a mais de 15 dias (> 15 dias)
  // Possuem folga confortável e seu pagamento não deve ser antecipado prematuramente para preservar juros compostos
  return { tier: 2, sortKey: daysUntilDue };
}

// Ordenação Inteligente de Despesas por Prioridade Financeira Real
export function sortExpensesBySmartPriority(
  expenses: Expense[],
  todayStr: string = getTodayString(),
  dailyNetYield: number = 0
): Expense[] {
  return [...expenses].sort((a, b) => {
    // 1. Contas não pagas vêm antes de contas já pagas
    if (a.isPaid !== b.isPaid) {
      return a.isPaid ? 1 : -1;
    }

    // 2. Classificação em Tiers de Urgência Inteligente
    const aUrgency = getExpenseUrgencyTier(a, todayStr, dailyNetYield);
    const bUrgency = getExpenseUrgencyTier(b, todayStr, dailyNetYield);

    if (aUrgency.tier !== bUrgency.tier) {
      return aUrgency.tier - bUrgency.tier;
    }

    // Dentro do mesmo Tier:
    if (aUrgency.tier === 1) {
      // No Tier 1 (Iminentes <= 15 dias): Quem vence mais cedo tem prioridade absoluta
      if (aUrgency.sortKey !== bUrgency.sortKey) {
        return aUrgency.sortKey - bUrgency.sortKey;
      }
      return a.amount - b.amount;
    }

    if (aUrgency.tier === 3) {
      // No Tier 3 (sem vencimento fixo / flexíveis): Menor valor primeiro (Snowball)
      if (Math.abs(a.amount - b.amount) > 0.01) {
        return a.amount - b.amount;
      }
      return a.title.localeCompare(b.title);
    }

    // No Tier 2 (Faturas > 15 dias): Quem vence mais cedo dentro do horizonte futuro
    if (aUrgency.sortKey !== bUrgency.sortKey) {
      return aUrgency.sortKey - bUrgency.sortKey;
    }
    return a.amount - b.amount;
  });
}

// Algoritmo Inteligente do "Melhor Dia para Pagamento de Despesa"
// Objetivo: Encontrar o dia exato para pagar cada despesa de modo que:
// 1. Respeite a PRIORIDADE INTELIGENTE:
//    - Contas iminentes (próximos 25 dias) são protegidas
//    - Gastos correntes imediatos, sem data fixa e menores valores são quitados com agilidade
//    - Faturas distantes (> 45 dias, ex: empréstimo para daqui a meses) não sequestram o caixa atual
// 2. O saldo acumulado dos rendimentos cobre a conta + taxa de saque, descontando o caixa já reservado por despesas anteriores
// 3. Explique de forma transparente o tempo de acúmulo de lucros diários necessário
export function calculateAllExpensesOptimizations(
  expenses: Expense[],
  products: InvestmentProduct[],
  settings: PlatformSettings,
  todayStr: string = getTodayString()
): Map<string, ExpensePaymentOptimization> {
  const resultMap = new Map<string, ExpensePaymentOptimization>();
  const safeSettings = normalizeSettings(settings);
  const feeRate = safeSettings.withdrawalFeePercentage / 100;

  // 1. Filtra despesas pendentes
  const pendingExpenses = expenses.filter((e) => !e.isPaid);
  if (pendingExpenses.length === 0) return resultMap;

  // Cálculo da renda diária líquida atual (para calibrar os tiers de urgência)
  const currentDailyGross = products
    .filter((p) => isProductActiveOnDate(p, todayStr))
    .reduce((sum, p) => sum + p.investedAmount * (p.dailyPercentage / 100), 0);
  const currentDailyNet = currentDailyGross * (1 - feeRate);
  void currentDailyNet;

  // Priorização Inteligente:
  // - Vencimento iminente primeiro
  // - Gastos sem data fixa e menores valores a seguir
  // - Vencimentos distantes (> 45 dias) posteriormente
  const sortedPending = sortExpensesBySmartPriority(pendingExpenses, todayStr, currentDailyNet);

  // 2. Projeção diária do fluxo de caixa líquido dos contratos existentes pelos próximos 365 dias
  const totalHorizonDays = 365;
  const dailyNetInflows: number[] = new Array(totalHorizonDays + 1).fill(0);

  for (let i = 0; i <= totalHorizonDays; i++) {
    const dayStr = addDays(todayStr, i);
    let dayGross = 0;

    products.forEach((p) => {
      if (p.status === 'paused' || p.status === 'completed') return;
      const daysFromStart = diffInDays(p.startDate, dayStr);
      const isYielding = daysFromStart >= 1 && daysFromStart <= p.durationDays;
      const isMaturity = daysFromStart === p.durationDays;

      if (isYielding) {
        dayGross += p.investedAmount * (p.dailyPercentage / 100);
      }
      if (isMaturity && p.returnCapitalAtEnd) {
        dayGross += p.investedAmount;
      }
    });

    // Caixa bruto disponível na plataforma; a taxa entra em requiredAmountWithFee.
    dailyNetInflows[i] = dayGross;
  }

  // Linha do tempo de caixa líquido disponível (que será consumida sequencialmente para cada despesa)
  const availableCashTimeline = [...dailyNetInflows];

  // 3. Alocação Waterfall Estrita por prioridade inteligente
  sortedPending.forEach((expense) => {
    const hasFixedDue = Boolean(expense.dueDate && expense.dueDate.trim());
    
    // Valor total necessário considerando a taxa de saque da plataforma
    const requiredGrossWithdrawal =
      (expense.amount + safeSettings.fixedWithdrawalFee) / (1 - feeRate);

    const withdrawalFee = requiredGrossWithdrawal - expense.amount;
    const requiredAmountWithFee = requiredGrossWithdrawal;

    // Busca o primeiro dia na linha do tempo onde o caixa livre acumulado atinge o valor necessário
    let accumulatedSum = 0;
    let fundingDayIndex = -1;

    for (let i = 0; i <= totalHorizonDays; i++) {
      accumulatedSum += availableCashTimeline[i];
      if (accumulatedSum >= requiredAmountWithFee - 0.001) {
        fundingDayIndex = i;
        break;
      }
    }

    const dailyYieldEquiv = currentDailyGross > 0 ? requiredAmountWithFee / currentDailyGross : 1;
    const goalDelayDays = Math.round(dailyYieldEquiv * 10) / 10;
    const daysToAccumulate = currentDailyNet > 0 
      ? Math.ceil(requiredAmountWithFee / currentDailyNet)
      : 1;

    let bestDate = expense.dueDate || todayStr;
    let reasoning = '';
    let safetyLevel: 'safe' | 'tight' | 'insufficient' = 'insufficient';
    let isFeasible = false;
    let deficit = 0;
    let earlyPaymentBenefit = '';
    let riskMitigationTip = '';

    if (fundingDayIndex !== -1) {
      const dateFunding = addDays(todayStr, fundingDayIndex);
      
      // Consome o caixa necessário da linha do tempo para que as próximas despesas NÃO re-utilizem esse saldo
      let neededToConsume = requiredAmountWithFee;
      for (let j = 0; j <= fundingDayIndex && neededToConsume > 0; j++) {
        const take = Math.min(availableCashTimeline[j], neededToConsume);
        availableCashTimeline[j] -= take;
        neededToConsume -= take;
      }

      if (hasFixedDue) {
        const daysUntilDue = diffInDays(todayStr, expense.dueDate!);

        if (daysUntilDue > 15) {
          // Faturas com vencimento a mais de 15 dias:
          // Não sugerir pagamento antes da janela ideal (máximo 15 dias de antecedência)
          // para não retirar capital prematuramente, garantindo o efeito dos juros compostos e acelerando a meta.
          const targetSafePaymentDate = addDays(expense.dueDate!, -3); // 3 dias antes do vencimento para margem de segurança

          if (dateFunding <= targetSafePaymentDate) {
            // O saldo acumulou com folga. Programa o pagamento para a janela ideal (3 dias antes do vencimento)
            bestDate = targetSafePaymentDate;
            isFeasible = true;
            safetyLevel = 'safe';
            const daysDiff = diffInDays(bestDate, expense.dueDate!);
            earlyPaymentBenefit = `Janela Ideal de Pagamento: agendado para 3 dias antes do vencimento (${formatDateBR(expense.dueDate!)}). Mantém os recursos rendendo juros compostos na plataforma até a janela recomendada (máximo 15 dias de antecedência), encurtando o prazo da meta.`;
            reasoning = `Melhor dia: ${formatDateBR(bestDate)} (${plural(daysDiff, 'dia', 'dias')} antes do vencimento). Como o vencimento está a ${plural(daysUntilDue, 'dia', 'dias')} de distância, evita-se o pagamento precoce para que o capital continue gerando rendimentos diários na plataforma. O valor integral de ${formatCurrency(expense.amount)} (+ taxa de saque de ${formatCurrency(withdrawalFee)}) estará disponível com total segurança.`;
            riskMitigationTip = `Rendimentos continuam trabalhando na plataforma gerando juros compostos até a janela ideal.`;
          } else if (dateFunding <= expense.dueDate!) {
            bestDate = dateFunding;
            isFeasible = true;
            safetyLevel = 'tight';
            const daysDiff = diffInDays(bestDate, expense.dueDate!);
            earlyPaymentBenefit = daysDiff > 0
              ? `Saldo em caixa atinge o valor total ${plural(daysDiff, 'dia', 'dias')} antes do vencimento (${formatDateBR(expense.dueDate!)}), dentro da janela de segurança.`
              : `Saldo em caixa fecha o valor exatamente no dia do vencimento (${formatDateBR(expense.dueDate!)}), sem folga.`;
            reasoning = `Melhor dia: ${formatDateBR(bestDate)}. O valor de ${formatCurrency(expense.amount)} (+ taxa de saque de ${formatCurrency(withdrawalFee)}) estará disponível ${plural(daysDiff, 'dia', 'dias')} antes do vencimento.`;
            riskMitigationTip = `A quitação consome ~${plural(daysToAccumulate, 'dia', 'dias')} de lucros líquidos.`;
          } else {
            // O dinheiro só acumula DEPOIS do vencimento fixo
            isFeasible = false;
            safetyLevel = 'insufficient';
            bestDate = expense.dueDate!;
            const daysToDue = Math.max(0, diffInDays(todayStr, expense.dueDate!));
            let accumUpToDue = 0;
            for (let k = 0; k <= Math.min(daysToDue, totalHorizonDays); k++) {
              accumUpToDue += dailyNetInflows[k];
            }
            deficit = Math.max(0, requiredAmountWithFee - accumUpToDue);
            riskMitigationTip = `Para quitar impreterivelmente na data de vencimento (${formatDateBR(expense.dueDate!)}), separe ${formatCurrency(deficit)} de outra fonte.`;
            reasoning = `Atenção: O saldo livre gerado até o vencimento (${formatDateBR(expense.dueDate!)}) ainda não é suficiente para cobrir ${formatCurrency(requiredAmountWithFee)} (déficit de ${formatCurrency(deficit)}). O montante completo só estará acumulado em caixa no dia ${formatDateBR(dateFunding)}.`;
          }
        } else if (daysUntilDue < 0) {
          // Conta vencida (em atraso)
          bestDate = todayStr;
          isFeasible = dateFunding <= todayStr;
          safetyLevel = isFeasible ? 'tight' : 'insufficient';
          earlyPaymentBenefit = `Conta em atraso! Recomendado quitar com urgência assim que o saldo estiver liberado.`;
          reasoning = `Conta vencida há ${plural(Math.abs(daysUntilDue), 'dia', 'dias')}. Quitação programada para a primeira data com saldo disponível: ${formatDateBR(bestDate)}.`;
          riskMitigationTip = `Liquidando esta pendência urgente para cessar possíveis juros externos.`;
        } else {
          // Vencimento iminente (<= 15 dias)
          const safeEarly = addDays(expense.dueDate!, -3);
          if (dateFunding <= safeEarly && safeEarly >= todayStr) {
            bestDate = safeEarly;
            isFeasible = true;
            safetyLevel = 'safe';
            const daysDiff = diffInDays(bestDate, expense.dueDate!);
            earlyPaymentBenefit = `Programado com ${plural(daysDiff, 'dia', 'dias')} de margem de segurança antes do vencimento (${formatDateBR(expense.dueDate!)}).`;
            reasoning = `Melhor dia: ${formatDateBR(bestDate)} (${plural(daysDiff, 'dia', 'dias')} antes do vencimento). Pagamento dentro da janela segura de 15 dias, mantendo os rendimentos ativos até a data recomendada.`;
            riskMitigationTip = `A quitação desta conta consome ${plural(daysToAccumulate, 'dia', 'dias')} de lucros líquidos.`;
          } else if (dateFunding <= expense.dueDate!) {
            bestDate = dateFunding > todayStr ? dateFunding : (expense.dueDate! < todayStr ? todayStr : expense.dueDate!);
            isFeasible = true;
            safetyLevel = diffInDays(bestDate, expense.dueDate!) >= 2 ? 'safe' : 'tight';
            const daysDiff = diffInDays(bestDate, expense.dueDate!);
            earlyPaymentBenefit = daysDiff > 0
              ? `Saldo em caixa atinge o valor total ${plural(daysDiff, 'dia', 'dias')} antes do vencimento.`
              : `Saldo em caixa fecha o valor exatamente no dia do vencimento, sem folga.`;
            reasoning = `Melhor dia: ${formatDateBR(bestDate)}. O valor de ${formatCurrency(expense.amount)} (+ taxa de saque de ${formatCurrency(withdrawalFee)}) estará 100% acumulado nesta data.`;
            riskMitigationTip = `A quitação consome ${plural(daysToAccumulate, 'dia', 'dias')} de lucros líquidos.`;
          } else {
            isFeasible = false;
            safetyLevel = 'insufficient';
            bestDate = expense.dueDate!;
            const daysToDue = Math.max(0, diffInDays(todayStr, expense.dueDate!));
            let accumUpToDue = 0;
            for (let k = 0; k <= Math.min(daysToDue, totalHorizonDays); k++) {
              accumUpToDue += dailyNetInflows[k];
            }
            deficit = Math.max(0, requiredAmountWithFee - accumUpToDue);
            riskMitigationTip = `Para quitar impreterivelmente na data de vencimento (${formatDateBR(expense.dueDate!)}), separe ${formatCurrency(deficit)} de outra fonte.`;
            reasoning = `Atenção: O saldo livre gerado até o vencimento (${formatDateBR(expense.dueDate!)}) ainda não é suficiente para cobrir ${formatCurrency(requiredAmountWithFee)} (déficit de ${formatCurrency(deficit)}). O montante completo só estará acumulado em caixa no dia ${formatDateBR(dateFunding)}.`;
          }
        }
      } else {
        // Despesa sem data de vencimento fixa (flexível / sem prazo legal)
        isFeasible = true;
        bestDate = dateFunding > todayStr ? dateFunding : todayStr;
        safetyLevel = 'safe';
        // CORREÇÃO (Prioridade Meta — revisada): uma despesa sem vencimento
        // não deve ficar represada até a meta ser batida (isso penalizava
        // até contas pequenas e totalmente pagáveis, com impacto real
        // mínimo). Ela também não deve furar a fila de contas com data real
        // nem acionar proteção antecipada (blindagem/reserva de caixa) só
        // por existir. O equilíbrio correto: prioridade mais baixa da fila
        // (Tier 3 em `getExpenseUrgencyTier`), paga assim que há caixa livre
        // — ou seja, exatamente na data abaixo — com um custo proporcional e
        // pequeno, estimado em `goalDelayDays`.
        earlyPaymentBenefit = `Sem vencimento fixo: o caixa fica disponível a partir de ${formatDateBR(bestDate)} — é o dia recomendado para liquidar, com o menor impacto possível no cronograma (ela não disputa espaço com contas que têm prazo real).`;
        riskMitigationTip = `Prioridade mais baixa da fila: por não ter vencimento, só usa o caixa que sobra depois das contas com data real. Impacto estimado na meta: ~${plural(goalDelayDays, 'dia', 'dias', 1)} de rendimento.`;
        reasoning = `Despesa de ${formatCurrency(expense.amount)} sem vencimento fixo (+ taxa de saque de ${formatCurrency(withdrawalFee)}). Como não há prazo a cumprir, entra com a menor prioridade da fila e é paga assim que há caixa livre em ${formatDateBR(bestDate)}, sem represar reinvestimento por antecipação nem furar a fila de contas reais.`;
      }
    } else {
      // Não acumula no horizonte de 365 dias com o rendimento ATUAL dos contratos já cadastrados
      safetyLevel = 'insufficient';
      isFeasible = false;
      deficit = requiredAmountWithFee;
      bestDate = expense.dueDate || addDays(todayStr, 30);

      // CORREÇÃO (Mensagem Heurística): esta projeção soma apenas o rendimento
      // FIXO dos contratos já cadastrados hoje — ela não simula o crescimento
      // composto do reinvestimento (isso só o motor completo do Roadmap faz).
      // Por isso, quando a própria meta diária configurada pelo usuário já
      // cobriria o valor num prazo razoável, a mensagem deixa essa capacidade
      // de médio prazo explícita em vez de afirmar, sem nuance, que "os
      // rendimentos não são suficientes".
      const targetDailyNet = safeSettings.dailyGoalAmount * (1 - feeRate);
      const daysAtGoalPace =
        targetDailyNet > 0 ? Math.ceil(requiredAmountWithFee / targetDailyNet) : Infinity;
      const goalPaceHasHeadroom =
        targetDailyNet > currentDailyNet && Number.isFinite(daysAtGoalPace) && daysAtGoalPace <= totalHorizonDays;

      if (goalPaceHasHeadroom) {
        reasoning = `Com o rendimento diário ATUAL de ${formatCurrency(currentDailyGross)}/dia (apenas contratos já cadastrados), este valor não acumula dentro de ${plural(totalHorizonDays, 'dia', 'dias')} — mas esta projeção não inclui o crescimento do reinvestimento. Ao atingir a meta diária de ${formatCurrency(safeSettings.dailyGoalAmount)}/dia configurada, o valor ficaria coberto em cerca de ${plural(daysAtGoalPace, 'dia', 'dias')} de rendimento; acompanhe o Roadmap para a data real, que tende a ser bem mais rápida graças aos juros compostos.`;
        riskMitigationTip = `Consulte o Roadmap de Reinvestimento: ele já projeta o crescimento composto e deve indicar um prazo mais curto do que esta estimativa linear.`;
      } else {
        reasoning = `Seus rendimentos diários atuais (considerando apenas contratos já cadastrados, sem novos aportes) não são suficientes para acumular ${formatCurrency(requiredAmountWithFee)} dentro do horizonte projetado de ${plural(totalHorizonDays, 'dia', 'dias')}.`;
        riskMitigationTip = `Adicione novos aportes ou complemente o valor externamente.`;
      }
    }

    const daysBeforeDue = hasFixedDue && expense.dueDate ? Math.max(0, diffInDays(bestDate, expense.dueDate)) : 0;

    resultMap.set(expense.id, {
      expenseId: expense.id,
      bestDate,
      bestDateFormatted: formatDateBR(bestDate),
      daysBeforeDue,
      accumulatedYieldAtDate: accumulatedSum,
      requiredAmountWithFee,
      withdrawalFee,
      remainingBufferForReinvestment: Math.max(0, accumulatedSum - requiredAmountWithFee),
      isFeasibleWithYieldOnly: isFeasible,
      deficitAmount: deficit,
      reasoning,
      safetyLevel,
      goalDelayDays,
      riskMitigationTip,
      earlyPaymentBenefit,
    });
  });

  return resultMap;
}

export function calculateBestPaymentDay(
  expense: Expense,
  products: InvestmentProduct[],
  settings: PlatformSettings,
  todayStr: string = getTodayString(),
  allExpenses?: Expense[]
): ExpensePaymentOptimization {
  const expensesList = allExpenses && allExpenses.length > 0 ? allExpenses : [expense];
  const resultMap = calculateAllExpensesOptimizations(expensesList, products, settings, todayStr);
  const result = resultMap.get(expense.id);
  if (result) return result;

  const safe = normalizeSettings(settings);
  const requiredGrossWithdrawal =
    (expense.amount + safe.fixedWithdrawalFee) / (1 - safe.withdrawalFeePercentage / 100);

  const fallbackDate = expense.dueDate || todayStr;

  return {
    expenseId: expense.id,
    bestDate: fallbackDate,
    bestDateFormatted: expense.dueDate ? formatDateBR(expense.dueDate) : 'Sem data fixa',
    daysBeforeDue: 0,
    accumulatedYieldAtDate: 0,
    requiredAmountWithFee: requiredGrossWithdrawal,
    withdrawalFee: requiredGrossWithdrawal - expense.amount,
    remainingBufferForReinvestment: 0,
    isFeasibleWithYieldOnly: false,
    deficitAmount: expense.amount,
    reasoning: expense.dueDate ? `Vencimento na data estipulada (${formatDateBR(expense.dueDate)}).` : 'Gasto sem vencimento fixado.',
    safetyLevel: 'insufficient',
    goalDelayDays: 1,
    riskMitigationTip: '',
    earlyPaymentBenefit: '',
  };
}
