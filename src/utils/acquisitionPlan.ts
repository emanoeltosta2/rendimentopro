import { InvestmentProduct } from '../types/investment';
import { RoadmapContractSnapshot } from '../types/investment';
import { normalizeProductName } from './roadmap';

/**
 * =====================================================================
 * Plano de aquisições do dia — fonte ÚNICA de verdade
 * =====================================================================
 *
 * O problema que este módulo resolve:
 *
 * O motor do Roadmap (`calculatePortfolioRoadmap`) agrega N cotas idênticas
 * compradas no mesmo dia em UM único contrato (`units`). O aplicativo, porém,
 * cria UM produto por cota comprada. Essa conversão estava espalhada: o motor
 * a fazia de um jeito (expandindo `units` em N snapshots), a tela de conclusão
 * de outro (criando um produto por item da lista), e a deduplicação de um
 * terceiro (comparando nome + valor + data). Cada um com uma regra diferente.
 *
 * Resultado prático: reexecutar a conclusão de um dia voltava a materializar
 * cotas que já existiam, porque a "chave" da compra era a semelhança entre
 * dois produtos (mesmo nome, mesmo valor, mesma data) e não a IDENTIDADE da
 * operação que a criou.
 *
 * A regra agora é explícita:
 *
 *   1. Toda compra executada tem uma IDENTIDADE estável e determinística,
 *      derivada do dia e da posição da cota no plano (`acquisitionId`).
 *   2. Essa identidade é gravada no produto (`acquisitionId` +
 *      `acquisitionSequence`) e é ELA que impede duplicação — nunca a
 *      semelhança de nome/valor/data.
 *   3. Compras legítimas do mesmo produto no mesmo dia continuam possíveis:
 *      duas cotas de R$ 25 são duas operações distintas, com ids distintos.
 *   4. O produto criado usa o NOME CRU do item planejado. O rótulo de origem
 *      ("Reinvestimento (X)", "Otimização da carteira (X)") é metadado de
 *      exibição e não deve virar parte do nome, sob pena de a mesma cota
 *      existir com dois nomes diferentes.
 */

/** Uma cota individual (1 unidade) a ser comprada no dia. */
export interface PlannedAcquisitionUnit {
  /** Identidade estável da operação. Único campo que prova "esta cota já foi comprada". */
  acquisitionId: string;
  /** Nome do produto como o usuário o conhece (`NW765H`), sem rótulo de origem. */
  name: string;
  /** Preço unitário (1 cota). */
  unitPrice: number;
  /** Valor efetivamente debitado por esta cota (hoje igual a `unitPrice`). */
  investedAmount: number;
  dailyPercentage: number;
  durationDays: number;
  returnCapitalAtEnd: boolean;
  /** Posição da cota dentro do plano do dia (0-based). */
  sequence: number;
}

/** Um item do plano pode representar N cotas idênticas. */
export interface PlannedAcquisitionItem {
  id: string;
  name: string;
  unitPrice: number;
  units: number;
  totalSpent: number;
  dailyYieldAdded: number;
  dailyPercentage: number;
  durationDays: number;
  returnCapitalAtEnd: boolean;
}

/** Formato aceito na entrada: contrato do motor ou item de plano já achatado. */
export interface PlannedAcquisitionLike {
  id?: string;
  name: string;
  unitPrice?: number;
  units?: number;
  investedAmount?: number;
  totalSpent?: number;
  dailyPercentage: number;
  durationDays: number;
  returnCapitalAtEnd?: boolean;
}

/**
 * Identidade determinística de uma cota do plano.
 *
 * Precisa ser estável entre renderizações e entre recálculos do motor: se o
 * mesmo plano é montado duas vezes, os ids são iguais e a segunda passada
 * reconhece tudo como já comprado. Por isso NÃO usa `Date.now()` nem
 * `Math.random()`.
 */
export function buildAcquisitionId(date: string, sequence: number): string {
  return `acq_${date}_${String(sequence).padStart(3, '0')}`;
}

/**
 * Converte o plano do dia (contratos agregados) na lista de produtos
 * individuais que o aplicativo deve criar.
 *
 * Determinístico: a mesma entrada produz exatamente a mesma saída, na mesma
 * ordem, com os mesmos ids. É isso que torna a conclusão idempotente.
 */
export function buildAcquisitionPlan(
  date: string,
  items: PlannedAcquisitionLike[]
): PlannedAcquisitionUnit[] {
  const plan: PlannedAcquisitionUnit[] = [];
  let sequence = 0;

  for (const item of items) {
    const units = Math.max(1, Math.round(item.units ?? 1));
    const totalSpent = Number(
      (item.totalSpent ?? item.investedAmount ?? (item.unitPrice ?? 0) * units).toFixed(2)
    );
    const unitPrice = Number(
      (item.unitPrice ?? (units > 0 ? totalSpent / units : totalSpent)).toFixed(2)
    );

    for (let i = 0; i < units; i++) {
      plan.push({
        acquisitionId: buildAcquisitionId(date, sequence),
        name: item.name,
        unitPrice,
        investedAmount: unitPrice,
        dailyPercentage: item.dailyPercentage,
        durationDays: item.durationDays,
        returnCapitalAtEnd: item.returnCapitalAtEnd ?? false,
        sequence,
      });
      sequence += 1;
    }
  }

  return plan;
}

/** Lê a identidade de aquisição de um produto, tolerando registros antigos. */
export function getTrackedAcquisitionIds(products: InvestmentProduct[]): Set<string> {
  const ids = new Set<string>();
  for (const product of products) {
    const id = product.acquisitionId;
    if (typeof id === 'string' && id.trim()) ids.add(id.trim());
  }
  return ids;
}

/**
 * Filtra do plano apenas o que ainda NÃO foi comprado.
 *
 * A decisão usa exclusivamente `acquisitionId`. Um produto cadastrado à mão
 * (sem id de aquisição) não ocupa a chave, mas também não é apagado nem
 * sobrescrito — a compra manual continua sendo um registro independente.
 */
export function pendingAcquisitionUnits(
  plan: PlannedAcquisitionUnit[],
  products: InvestmentProduct[],
  date: string
): { pending: PlannedAcquisitionUnit[]; alreadyApplied: PlannedAcquisitionUnit[] } {
  const tracked = getTrackedAcquisitionIds(products);
  const pending: PlannedAcquisitionUnit[] = [];
  const alreadyApplied: PlannedAcquisitionUnit[] = [];

  for (const unit of plan) {
    if (tracked.has(unit.acquisitionId)) alreadyApplied.push(unit);
    else pending.push(unit);
  }

  return { pending, alreadyApplied };
}

/**
 * Despesas cuja quitação foi feita por este dia do Roadmap.
 *
 * O marcador `roadmapPaidDate` é persistido, então a regra sobrevive a um
 * snapshot da nuvem substituir o estado local. Nunca desfaz uma quitação
 * manual: exige que `paidDate` seja o próprio dia do Roadmap.
 */
export function expensesPaidByRoadmapDay<T extends { isPaid?: boolean; paidDate?: string; roadmapPaidDate?: string }>(
  expenses: T[],
  date: string
): T[] {
  return expenses.filter((e) => e.roadmapPaidDate === date && e.paidDate === date);
}

/**
 * Produtos criados por um dia do Roadmap, identificados pela identidade da
 * operação. É o que a reversão do dia deve remover — nem mais, nem menos.
 */
export function productsCreatedByRoadmapDay(
  products: InvestmentProduct[],
  date: string
): InvestmentProduct[] {
  return products.filter((p) => {
    const id = typeof p.acquisitionId === 'string' ? p.acquisitionId.trim() : '';
    return id.startsWith(`acq_${date}_`);
  });
}

/**
 * Validação de orçamento antes de qualquer gravação.
 *
 * A conclusão do dia nunca deve gravar parte das compras e abortar no meio:
 * ou o plano inteiro cabe no caixa livre, ou nada é executado.
 */
export function validateAcquisitionBudget(
  pending: PlannedAcquisitionUnit[],
  freeCash: number
): { ok: boolean; required: number; available: number; deficit: number } {
  const required = Number(pending.reduce((sum, u) => sum + u.investedAmount, 0).toFixed(2));
  const available = Number(Math.max(0, freeCash).toFixed(2));
  const deficit = Number(Math.max(0, required - available).toFixed(2));
  return { ok: required <= available + 0.01, required, available, deficit };
}

/**
 * Chave canônica de um contrato/sugestão, usada apenas para exibição e
 * agrupamento visual (nunca para decidir duplicação).
 */
export function acquisitionDisplayKey(name: string, unitPrice: number): string {
  return `${normalizeProductName(name)}|${Number(unitPrice).toFixed(2)}`;
}

/** Resumo textual do plano, para notas e mensagens ao usuário. */
export function describePlan(plan: PlannedAcquisitionUnit[]): string {
  if (plan.length === 0) return 'Nenhuma cota a comprar';
  const total = plan.reduce((sum, u) => sum + u.investedAmount, 0);
  return `${plan.length} cota(s) — total de R$ ${total.toFixed(2).replace('.', ',')}`;
}

/** Tipo auxiliar para o snapshot recebido do motor. */
export type RoadmapAcquisitionSnapshot = RoadmapContractSnapshot;
