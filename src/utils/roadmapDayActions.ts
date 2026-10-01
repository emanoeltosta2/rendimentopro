import { InvestmentProduct, PlatformSettings, RoadmapPointDetails } from '../types/investment';
import {
  PlannedAcquisitionUnit,
  buildAcquisitionPlan,
  pendingAcquisitionUnits,
  productsCreatedByRoadmapDay,
  expensesPaidByRoadmapDay,
  validateAcquisitionBudget,
} from './acquisitionPlan';

/**
 * =====================================================================
 * Conclusão e reversão de um dia do Roadmap
 * =====================================================================
 *
 * Antes, esta lógica vivia dentro do componente `App`, misturando várias
 * responsabilidades: pagava despesas, decidia quais compras materializar,
 * escrevia no Firestore DENTRO dos atualizadores de estado e marcava o dia
 * como concluído. Como o React reexecuta atualizadores de estado — e o
 * `<StrictMode>` faz isso de propósito — cada efeito colateral rodava mais de
 * uma vez.
 *
 * Aqui a operação vira DADOS antes de ser aplicada:
 *
 *   1. `planRoadmapDayCompletion` descreve o que vai acontecer: despesas a
 *      quitar, cotas a criar e cotas que já existem.
 *   2. `applyRoadmapDayCompletion` converte esse plano em operações sobre o
 *      estado, sem executá-las.
 *   3. `applyRoadmapDayReversal` desfaz somente o que a conclusão criou.
 *
 * A idempotência não compara nomes: cada cota tem uma identidade
 * (`acquisitionId`) derivada do dia e da posição no plano. Concluir o mesmo
 * dia duas vezes encontra os mesmos ids e não cria nada na segunda vez.
 */

export interface RoadmapDayExpense {
  id: string;
  title: string;
  amount: number;
  isPaid: boolean;
  paidDate?: string;
  roadmapPaidDate?: string;
}

export interface RoadmapDayCompletionPlan {
  date: string;
  expensesToPay: Array<{ id: string; title: string; amount: number }>;
  unitsToCreate: PlannedAcquisitionUnit[];
  unitsAlreadyApplied: PlannedAcquisitionUnit[];
  budget: { ok: boolean; required: number; available: number; deficit: number };
  blockedReason?: 'duplicate-day' | 'deferred' | 'insufficient-cash' | 'nothing-to-do';
  alreadyCompleted: boolean;
}

export interface RoadmapDayCompletionInput {
  details: RoadmapPointDetails;
  products: InvestmentProduct[];
  expenses: RoadmapDayExpense[];
  settings: PlatformSettings;
  /**
   * Saldo livre em banco do dia. O `App` deve passar o mesmo valor que a
   * interface exibe como saldo livre para reinvestir, vindo do motor.
   */
  freeCash?: number;
}

export interface RoadmapDayState {
  products: InvestmentProduct[];
  expenses: RoadmapDayExpense[];
  settings: PlatformSettings;
}

export interface RoadmapDayOperations {
  productsToCreate: InvestmentProduct[];
  productIdsToRemove: string[];
  expensesToMarkPaid: Array<{ id: string; paidDate: string; roadmapPaidDate: string }>;
  expensesToRestore: Array<{ id: string; isPaid: false; paidDate: undefined; roadmapPaidDate: undefined }>;
  completedDays: string[];
  deferredDays: string[];
  blockedReason?: RoadmapDayCompletionPlan['blockedReason'];
}

const round2 = (value: number): number => Number(value.toFixed(2));

/**
 * Monta o plano de execução do dia. FUNÇÃO PURA: não altera estado nem
 * escreve em lugar nenhum — é o que garante que a sugestão exibida ao usuário
 * e a execução do clique usem a MESMA lista de compras.
 */
export function planRoadmapDayCompletion(input: RoadmapDayCompletionInput): RoadmapDayCompletionPlan {
  const { details, products, expenses, settings } = input;
  const date = details.date;

  const alreadyCompleted = (settings.completedRoadmapDays ?? []).includes(date);
  const isDeferred = (settings.deferredAcquisitions ?? []).includes(date);

  const expensesToPay = (expenses ?? [])
    .filter((e) => !e.isPaid)
    .map((e) => ({ id: e.id, title: e.title, amount: e.amount }));

  const dayItems =
    details.acquisitionsToday && details.acquisitionsToday.length > 0
      ? details.acquisitionsToday
      : details.newPurchasesToday && details.newPurchasesToday.length > 0
        ? details.newPurchasesToday
        : details.newInvestmentsToday ?? [];

  const fullPlan = buildAcquisitionPlan(date, dayItems);
  const { pending, alreadyApplied } = pendingAcquisitionUnits(fullPlan, products, date);

  const available = round2(
    input.freeCash ??
      Math.max(
        0,
        (details.bankBalance ?? 0) -
          (details.reservedForExpenses ?? 0) -
          (details.totalProtectedAccumulated ?? 0)
      )
  );
  const budget = validateAcquisitionBudget(pending, available);

  let blockedReason: RoadmapDayCompletionPlan['blockedReason'];
  if (isDeferred) {
    blockedReason = 'deferred';
  } else if (pending.length === 0) {
    blockedReason = alreadyCompleted ? 'duplicate-day' : 'nothing-to-do';
  } else if (!budget.ok) {
    blockedReason = 'insufficient-cash';
  }

  const blocked =
    blockedReason === 'duplicate-day' ||
    blockedReason === 'deferred' ||
    blockedReason === 'insufficient-cash';

  return {
    date,
    expensesToPay,
    unitsToCreate: blocked ? [] : pending,
    unitsAlreadyApplied: alreadyApplied,
    budget,
    blockedReason,
    alreadyCompleted,
  };
}

/**
 * Converte o plano em operações, sem aplicar nada.
 *
 * Separar "decidir" de "aplicar" é o que permite executar tudo em um único
 * passo, fora dos atualizadores de estado, e escrever na nuvem uma vez só.
 */
export function applyRoadmapDayCompletion(
  plan: RoadmapDayCompletionPlan,
  state: RoadmapDayState,
  makeId: (prefix: string) => string = defaultMakeId
): RoadmapDayOperations {
  const completed = new Set(state.settings.completedRoadmapDays ?? []);
  completed.add(plan.date);

  const productsToCreate: InvestmentProduct[] = plan.unitsToCreate.map((unit) => ({
    id: makeId('prod'),
    name: unit.name,
    investedAmount: unit.investedAmount,
    dailyPercentage: unit.dailyPercentage,
    durationDays: unit.durationDays,
    startDate: plan.date,
    status: 'active' as const,
    returnCapitalAtEnd: unit.returnCapitalAtEnd,
    category: 'Reinvestimento do Roadmap',
    notes: `Adquirido via conclusão do Roadmap em ${plan.date}`,
    roadmapAcquisitionDate: plan.date,
    acquisitionId: unit.acquisitionId,
    acquisitionSequence: unit.sequence,
  }));

  const existingExpenseIds = new Set(state.expenses.map((e) => e.id));

  return {
    productsToCreate,
    productIdsToRemove: [],
    expensesToMarkPaid: plan.expensesToPay
      .filter((e) => existingExpenseIds.has(e.id))
      .map((e) => ({ id: e.id, paidDate: plan.date, roadmapPaidDate: plan.date })),
    expensesToRestore: [],
    completedDays: Array.from(completed),
    deferredDays: (state.settings.deferredAcquisitions ?? []).filter((d) => d !== plan.date),
    blockedReason: plan.blockedReason,
  };
}

/** Desfaz um dia: remove exatamente os produtos que aquele dia criou. */
export function applyRoadmapDayReversal(date: string, state: RoadmapDayState): RoadmapDayOperations {
  const productsToRemove = productsCreatedByRoadmapDay(state.products, date);
  const expensesToRestore = expensesPaidByRoadmapDay(state.expenses, date).map((e) => ({
    id: e.id,
    isPaid: false as const,
    paidDate: undefined,
    roadmapPaidDate: undefined,
  }));

  return {
    productsToCreate: [],
    productIdsToRemove: productsToRemove.map((p) => p.id),
    expensesToMarkPaid: [],
    expensesToRestore,
    completedDays: (state.settings.completedRoadmapDays ?? []).filter((d) => d !== date),
    deferredDays: (state.settings.deferredAcquisitions ?? []).filter((d) => d !== date),
    blockedReason: undefined,
  };
}

/**
 * Gera id único sem colidir em conclusões rápidas.
 *
 * `Date.now()` sozinho colide quando vários produtos nascem no mesmo
 * milissegundo — exatamente o caso de uma conclusão com várias cotas. O
 * contador incremental elimina a colisão dentro da sessão.
 */
let idCounter = 0;
export function defaultMakeId(prefix: string): string {
  idCounter += 1;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}-${rand}`;
}

/** Resumo do plano para mensagens e logs. */
export function summarizeCompletion(plan: RoadmapDayCompletionPlan): string {
  if (plan.unitsToCreate.length === 0) {
    if (plan.blockedReason === 'duplicate-day') return 'Dia já concluído: nenhuma cota nova foi criada.';
    if (plan.blockedReason === 'insufficient-cash') {
      return `Saldo insuficiente: faltam R$ ${plan.budget.deficit.toFixed(2).replace('.', ',')} para executar o plano.`;
    }
    if (plan.blockedReason === 'deferred') return 'Compras adiadas neste dia.';
    return 'Nada a executar neste dia.';
  }
  const total = plan.unitsToCreate.reduce((sum, u) => sum + u.investedAmount, 0);
  return `${plan.unitsToCreate.length} cota(s), total de R$ ${total.toFixed(2).replace('.', ',')}.`;
}
