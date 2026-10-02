import type { InvestmentProduct, RoadmapContractSnapshot, RoadmapPointDetails } from '../types/investment';

/**
 * Rótulos que a simulação do Roadmap coloca no `name` dos contratos simulados,
 * por exemplo "Reinvestimento (NW354)". Eles servem só para exibição; o produto
 * real precisa ser gravado com o nome do modelo do catálogo ("NW354").
 */
const SIMULATION_LABEL = /^(?:Reinvestimento|Novo investimento|Otimização da carteira) \((.+)\)$/;

export function stripRoadmapLabel(name: string): string {
  const match = SIMULATION_LABEL.exec((name ?? '').trim());
  return match ? match[1] : name;
}

const roundMoney = (value: number): number => Number(value.toFixed(2));

/**
 * Transforma as aquisições de um dia do Roadmap em produtos reais da carteira.
 *
 * Regras:
 *  - UMA COTA = UM PRODUTO. Uma aquisição de "26x R$25,00" gera 26 produtos de
 *    R$25,00 (e não um produto único de R$650,00). Assim a carteira reflete
 *    exatamente o que foi comprado e a quantidade de produtos ativos sobe de
 *    acordo com o número de cotas.
 *  - O nome gravado é o do modelo do catálogo, sem o rótulo da simulação.
 *  - Contratos que já são produtos reais (carteira inicial, produtos manuais ou
 *    aquisições de um dia já concluído) nunca são recriados.
 *  - Funciona igual para o dia atual e para dias futuros.
 */
export function buildProductsFromRoadmapAcquisitions(
  details: RoadmapPointDetails,
  existingProducts: readonly InvestmentProduct[],
  createId: () => string
): InvestmentProduct[] {
  const acquisitions: RoadmapContractSnapshot[] =
    details.acquisitionsToday ?? details.newPurchasesToday ?? [];
  const existingIds = new Set(existingProducts.map((p) => p.id));
  const created: InvestmentProduct[] = [];

  for (const acq of acquisitions) {
    if (acq.isInitialPortfolio || existingIds.has(acq.id)) continue;

    const units = Math.max(1, Math.round(acq.units || 1));
    // Preço de uma cota; se o snapshot vier inconsistente, deriva do total.
    let unitPrice = acq.unitPrice > 0 ? acq.unitPrice : acq.investedAmount / units;
    if (Math.abs(unitPrice * units - acq.investedAmount) > 0.01 * units) {
      unitPrice = acq.investedAmount / units;
    }
    unitPrice = roundMoney(unitPrice);

    const name = acq.baseName ?? stripRoadmapLabel(acq.name);

    for (let i = 0; i < units; i++) {
      created.push({
        id: createId(),
        name,
        investedAmount: unitPrice,
        dailyPercentage: acq.dailyPercentage,
        durationDays: acq.durationDays,
        startDate: details.date,
        status: 'active',
        returnCapitalAtEnd: acq.returnCapitalAtEnd ?? false,
        category: 'Reinvestimento do Roadmap',
        notes: `Adquirido via conclusão do Roadmap no Dia ${details.day} (${details.dateFormatted})`,
        roadmapAcquisitionDate: details.date,
        roadmapAcquisitionDay: details.day,
      });
    }
  }

  return created;
}
