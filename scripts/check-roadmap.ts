import { readFileSync, existsSync } from 'node:fs';
import { calculatePortfolioRoadmap } from '../src/utils/roadmap.js';
import { buildProductsFromRoadmapAcquisitions, stripRoadmapLabel } from '../src/utils/roadmapMaterialization.js';
import { Expense, InvestmentProduct, PlatformSettings, ProductTemplate } from '../src/types/investment.js';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

console.log('🧪 Iniciando auditoria automatizada do sistema e do Roadmap...');

const mockSettings: PlatformSettings = {
  withdrawalFeePercentage: 5,
  fixedWithdrawalFee: 0,
  minWithdrawalAmount: 20,
  minDepositAmount: 50,
  dailyGoalAmount: 100,
  reinvestmentBufferPercentage: 20,
  dynamicBufferEnabled: true,
  protectionProfile: 'balanced',
};

const mockTemplates: ProductTemplate[] = [
  {
    id: 'tpl-1',
    name: 'Cota Turbo 3%',
    investedAmount: 50,
    dailyPercentage: 3.0,
    durationDays: 30,
    returnCapitalAtEnd: true,
    category: 'Cripto',
  },
  {
    id: 'tpl-2',
    name: 'Cota Premium 2%',
    investedAmount: 100,
    dailyPercentage: 2.0,
    durationDays: 45,
    returnCapitalAtEnd: true,
    category: 'Renda Fixa',
  },
];

const mockInitialProducts: InvestmentProduct[] = [
  {
    id: 'prod-init-1',
    name: 'Investimento Inicial A',
    investedAmount: 500,
    dailyPercentage: 2.0, // R$ 10/dia
    durationDays: 60,
    startDate: '2026-09-01',
    returnCapitalAtEnd: true,
    category: 'Inicial',
    status: 'active',
  },
];

// Teste 1: Execução básica do Roadmap
const result = calculatePortfolioRoadmap({
  products: mockInitialProducts,
  expenses: [],
  settings: mockSettings,
  horizonDays: 365,
  templates: mockTemplates,
  includeExpenses: true,
  today: '2026-09-21',
});

assert(result !== null, 'Roadmap calculado com sucesso');
assert(Number.isFinite(result.currentDailyYield), 'Rendimento atual é um número finito');
assert(Number.isFinite(result.percentOfGoalReached), 'Percentual de meta é finito');

assert(result.projectedAcquisitions.length > 0, `Foram geradas ${result.projectedAcquisitions.length} novas aquisições projetadas`);

// Teste 2: Isolamento estrito de aquisições por dia
// Verifica todos os dias do horizonte
for (let d = 0; d <= 30; d++) {
  const dayDetails = result.getDayDetails(d);
  if (!dayDetails) continue;

  // Apenas aquisições iniciadas exatamente no dia d podem estar em acquisitionsToday
  for (const acq of dayDetails.acquisitionsToday) {
    assert(
      acq.startDay === d,
      `Aquisição ${acq.name} no Dia ${d} tem startDay=${acq.startDay}, esperado startDay===${d}`
    );
    assert(
      !acq.isInitialPortfolio,
      `Aquisição ${acq.name} no Dia ${d} não pode ser marcada como carteira inicial`
    );
  }

  // Em activeContracts, produtos adquiridos em dias anteriores NÃO podem ter isAcquiredToday=true
  for (const contract of dayDetails.activeContracts) {
    if (contract.startDay !== d) {
      assert(
        !contract.isAcquiredToday,
        `Contrato ${contract.name} ativo no Dia ${d} com startDay=${contract.startDay} não pode ter isAcquiredToday=true`
      );
    }
  }
}

// Teste 3: Dia 0 (Carteira Inicial não é uma "nova aquisição")
const day0Details = result.getDayDetails(0);
if (day0Details) {
  for (const acq of day0Details.acquisitionsToday) {
    assert(
      !acq.isInitialPortfolio,
      `Contrato da carteira inicial ${acq.name} não pode estar em acquisitionsToday do Dia 0`
    );
  }
}

// Teste 4: Projected Acquisitions contém apenas os novos produtos necessários
assert(Array.isArray(result.projectedAcquisitions), 'projectedAcquisitions é um array');
assert(Array.isArray(result.projectedAcquisitionsGrouped), 'projectedAcquisitionsGrouped é um array');

for (const group of result.projectedAcquisitionsGrouped) {
  assert(group.totalUnits > 0, `Grupo ${group.name} tem totalUnits > 0`);
  assert(group.totalSpent > 0, `Grupo ${group.name} tem totalSpent > 0`);
  assert(group.scheduledDays.length > 0, `Grupo ${group.name} tem dias programados`);
}

// Teste 5: Casos de borda (Meta diária zero ou já atingida)
const zeroGoalSettings = { ...mockSettings, dailyGoalAmount: 0 };
const zeroResult = calculatePortfolioRoadmap({
  products: mockInitialProducts,
  expenses: [],
  settings: zeroGoalSettings,
  horizonDays: 60,
  templates: mockTemplates,
  includeExpenses: true,
  today: '2026-09-21',
});

assert(Number.isFinite(zeroResult.percentOfGoalReached), 'Percentual de meta com goal=0 é finito e seguro');


// Teste 6: Ações de dias não concluídos não podem ser efetivadas como realizadas.
const actionInitialProduct: InvestmentProduct = {
  ...mockInitialProducts[0],
  id: 'prod-action-1',
  investedAmount: 1000,
  dailyPercentage: 20, // R$ 200/dia; libera caixa suficiente para uma nova cota no dia seguinte
  startDate: '2026-09-21',
};

const pendingDaySettings: PlatformSettings = {
  ...mockSettings,
  goalCycleStartDate: '2026-09-21',
  dailyGoalAmount: 1000,
  completedRoadmapDays: [],
};
const pendingDayResult = calculatePortfolioRoadmap({
  products: [actionInitialProduct],
  expenses: [],
  settings: pendingDaySettings,
  horizonDays: 3,
  templates: mockTemplates,
  includeExpenses: true,
  today: '2026-09-22',
});

const pendingDay1 = pendingDayResult.getDayDetails(1);
assert(
  (pendingDay1?.acquisitionsToday.length ?? 0) > 0,
  'Dia atual não concluído mantém a ação como pendência visível para confirmação'
);
assert(
  (pendingDay1?.activeContracts.some((c) => c.startDay === 1 && !c.isInitialPortfolio) ?? false) === false,
  'Dia atual não concluído não efetiva a aquisição como contrato/rendimento'
);
assert(
  pendingDayResult.projectedAcquisitions.some((a) => a.date === '2026-09-22'),
  'A aquisição planejada permanece visível como projeção pendente do dia atual'
);

const completedDayResult = calculatePortfolioRoadmap({
  products: [actionInitialProduct],
  expenses: [],
  settings: { ...pendingDaySettings, completedRoadmapDays: ['2026-09-22'] },
  horizonDays: 3,
  templates: mockTemplates,
  includeExpenses: true,
  today: '2026-09-22',
});
assert(
  (completedDayResult.getDayDetails(1)?.acquisitionsToday.length ?? 0) > 0,
  'Dia concluído efetiva a aquisição planejada para aquele dia'
);

const pendingExpense: Expense = {
  id: 'exp-roadmap-1',
  title: 'Conta do dia',
  amount: 50,
  dueDate: '2026-09-22',
  hasDueDate: true,
  category: 'Serviços',
  isPaid: false,
  deductFromRoadmap: true,
};

const missedExpenseResult = calculatePortfolioRoadmap({
  products: [actionInitialProduct],
  expenses: [pendingExpense],
  settings: pendingDaySettings,
  horizonDays: 2,
  templates: mockTemplates,
  includeExpenses: true,
  today: '2026-09-22',
});
assert(
  (missedExpenseResult.getDayDetails(1)?.expensesDeductedToday ?? 0) === 0,
  'Dívida de um dia não concluído não é considerada paga no roadmap'
);
assert(
  (missedExpenseResult.getDayDetails(1)?.expensesTodayList.some((e) => e.id === pendingExpense.id) ?? false),
  'Dívida do dia atual aparece como ação pendente na própria data recomendada'
);
assert(
  (missedExpenseResult.getDayDetails(2)?.expensesTodayList.some((e) => e.id === pendingExpense.id) ?? false) === false,
  'Dívida pendente do dia atual não se repete no dia seguinte dentro da mesma simulação'
);

const overdueExpense: Expense = {
  ...pendingExpense,
  id: 'exp-roadmap-overdue-1',
  dueDate: '2026-09-21',
};
const overdueExpenseResult = calculatePortfolioRoadmap({
  products: [actionInitialProduct],
  expenses: [overdueExpense],
  settings: pendingDaySettings,
  horizonDays: 2,
  templates: mockTemplates,
  includeExpenses: true,
  today: '2026-09-22',
});
assert(
  (overdueExpenseResult.getDayDetails(0)?.expensesTodayList.some((e) => e.id === overdueExpense.id) ?? false),
  'Vencimento perdido aparece no detalhe do próprio dia original'
);
assert(
  (overdueExpenseResult.getDayDetails(1)?.expensesTodayList.some((e) => e.id === overdueExpense.id) ?? false),
  'Dívida vencida reaparece no detalhe da nova data recomendada'
);
assert(
  (overdueExpenseResult.getDayDetails(2)?.expensesTodayList.some((e) => e.id === overdueExpense.id) ?? false) === false,
  'Dívida vencida não é duplicada em um terceiro dia'
);

const completedExpenseResult = calculatePortfolioRoadmap({
  products: [actionInitialProduct],
  expenses: [pendingExpense],
  settings: { ...pendingDaySettings, completedRoadmapDays: ['2026-09-22'] },
  horizonDays: 2,
  templates: mockTemplates,
  includeExpenses: true,
  today: '2026-09-22',
});
assert(
  (completedExpenseResult.getDayDetails(1)?.expensesDeductedToday ?? 0) >= 50,
  'Dívida é considerada paga quando o dia é concluído'
);
// Teste 7: Prévia de compra do dia atual não pode duplicar a mesma verba.
// Cenário: renda atual R$105/dia, meta R$125/dia e R$108,31 livres no banco.
// A melhor aquisição é 1x R$100 (20/dia); o fallback não pode acrescentar
// outra compra de 4x R$25 usando o mesmo caixa.
const previewBugSettings: PlatformSettings = {
  ...mockSettings,
  dailyGoalAmount: 125,
  minDepositAmount: 25,
  goalCycleStartDate: '2026-09-23',
  completedRoadmapDays: [],
  manualBankInjection: 108.31,
  manualBankInjectionDate: '2026-09-23',
};
const previewBugProduct: InvestmentProduct = {
  id: 'prod-preview-bug',
  name: 'Carteira Atual',
  investedAmount: 525,
  dailyPercentage: 20,
  durationDays: 30,
  startDate: '2026-09-01',
  returnCapitalAtEnd: false,
  status: 'active',
};
const previewBugTemplates: ProductTemplate[] = [
  {
    id: 'tpl-25',
    name: 'NW354',
    investedAmount: 25,
    dailyPercentage: 20,
    durationDays: 16,
    returnCapitalAtEnd: false,
  },
  {
    id: 'tpl-50',
    name: 'NW4050',
    investedAmount: 50,
    dailyPercentage: 20,
    durationDays: 16,
    returnCapitalAtEnd: false,
  },
  {
    id: 'tpl-100',
    name: 'Robô VIP 100',
    investedAmount: 100,
    dailyPercentage: 20,
    durationDays: 16,
    returnCapitalAtEnd: false,
  },
];
const previewBugResult = calculatePortfolioRoadmap({
  products: [previewBugProduct],
  expenses: [],
  settings: previewBugSettings,
  horizonDays: 0,
  templates: previewBugTemplates,
  includeExpenses: true,
  today: '2026-09-23',
});
const todayPreviewAcquisitions = previewBugResult.getDayDetails(0)?.acquisitionsToday ?? [];
assert(
  todayPreviewAcquisitions.length === 1,
  `Prévia do dia atual gera uma única aquisição, não ${todayPreviewAcquisitions.length}`
);
assert(
  todayPreviewAcquisitions[0]?.name === 'Robô VIP 100' &&
    todayPreviewAcquisitions[0]?.units === 1 &&
    todayPreviewAcquisitions[0]?.investedAmount === 100,
  'Com R$108,31 livres e déficit de R$20/dia, a sugestão é 1x R$100'
);
assert(
  previewBugResult.totalProjectedAcquisitionsAmount <= 108.31 + 0.005,
  `Aquisições projetadas (${previewBugResult.totalProjectedAcquisitionsAmount}) não excedem o caixa livre de R$108,31`
);

// ---------------------------------------------------------------------------
// Regressão: concluir o dia NÃO pode duplicar as aquisições sugeridas.
// Reproduz o fluxo real do App (handleCompleteRoadmapDay): materializa as
// aquisições como produtos com roadmapAcquisitionDate E marca o dia como
// concluído. O teste anterior só marcava o dia, sem materializar o produto.
// ---------------------------------------------------------------------------
{
  const addDaysStr = (d: string, n: number) => {
    const x = new Date(`${d}T12:00:00Z`);
    x.setUTCDate(x.getUTCDate() + n);
    return x.toISOString().slice(0, 10);
  };
  const cycleStart = '2026-09-22';
  const dupSettings: PlatformSettings = {
    ...mockSettings,
    minDepositAmount: 25,
    dailyGoalAmount: 1000,
    goalCycleStartDate: cycleStart,
  };
  const dupTemplates: ProductTemplate[] = [
    { id: 'tpl-nw354', name: 'NW354', investedAmount: 25, dailyPercentage: 20, durationDays: 16, returnCapitalAtEnd: false, category: 'Robô / Arbitragem' },
    { id: 'tpl-nw900e', name: 'NW900E', investedAmount: 100, dailyPercentage: 20, durationDays: 16, returnCapitalAtEnd: false, category: 'Robô / Arbitragem' },
  ];
  let dupProducts: InvestmentProduct[] = [
    { id: 'dup-init', name: 'NW900E', investedAmount: 300, dailyPercentage: 20, durationDays: 16, startDate: cycleStart, returnCapitalAtEnd: false, category: 'Robô / Arbitragem', status: 'active' },
  ];
  let dupCompleted: string[] = [];
  let dupDaysFound = 0;
  const totalOf = (list: { investedAmount: number }[]) => list.reduce((sum, a) => sum + a.investedAmount, 0);

  for (let i = 1; i <= 10; i++) {
    const date = addDaysStr(cycleStart, i);
    const run = () =>
      calculatePortfolioRoadmap({
        products: dupProducts,
        expenses: [],
        settings: { ...dupSettings, completedRoadmapDays: dupCompleted },
        horizonDays: 30,
        templates: dupTemplates,
        includeExpenses: true,
        today: date,
      });

    const preview = run().getDayDetails(i)!;
    let seq = 0;
    const materialized = buildProductsFromRoadmapAcquisitions(preview, dupProducts, () => `dup-m${i}-${seq++}`);
    dupProducts = [...materialized, ...dupProducts];
    dupCompleted = [...dupCompleted, date];

    const after = run().getDayDetails(i)!;
    // Compara COTAS e VALOR (não a quantidade de itens da lista): ao concluir,
    // "3x R$25" vira 3 produtos de "1x R$25" por design (1 cota = 1 produto).
    const cotasOf = (list: { units: number }[]) => list.reduce((sum, a) => sum + a.units, 0);
    const duplicated =
      cotasOf(after.acquisitionsToday) > cotasOf(preview.acquisitionsToday) ||
      totalOf(after.acquisitionsToday) > totalOf(preview.acquisitionsToday) + 0.01;
    if (duplicated) dupDaysFound++;
  }

  assert(dupDaysFound === 0, 'Concluir o dia não duplica as aquisições sugeridas (10 dias consecutivos, fluxo real do App)');

  // Caixa: o valor gasto ao concluir não pode continuar aparecendo como livre.
  const lastDate = addDaysStr(cycleStart, 10);
  const lastDay = calculatePortfolioRoadmap({
    products: dupProducts,
    expenses: [],
    settings: { ...dupSettings, completedRoadmapDays: dupCompleted },
    horizonDays: 30,
    templates: dupTemplates,
    includeExpenses: true,
    today: lastDate,
  }).getDayDetails(10)!;
  assert(
    !lastDay.acquisitionsToday.some((a) => a.name.toLowerCase().startsWith('reinvestimento')),
    'Dia concluído não gera "Reinvestimento (...)" simulado por cima do produto real já criado'
  );
}

// ===========================================================================
// Regressões 2 — compra por cotas maiores, 1 cota = 1 produto, dias futuros
// ===========================================================================
{
  // Catálogo real do usuário (13 modelos, todos a 20%/dia, 16 dias), se disponível.
  const catalogPath = new URL('./fixtures/catalogo_produtos.json', import.meta.url);
  assert(existsSync(catalogPath), 'Fixture do catálogo real encontrada (scripts/fixtures/catalogo_produtos.json)');
  const catalog: ProductTemplate[] = JSON.parse(readFileSync(catalogPath, 'utf8')).templates;
  const catalogPrices = new Set(catalog.map((t) => t.investedAmount));
  const catalogNames = new Set(catalog.map((t) => t.name));

  const mkProd = (id: string, name: string, amt: number, start: string): InvestmentProduct => ({
    id, name, investedAmount: amt, dailyPercentage: 20, durationDays: 16, startDate: start,
    returnCapitalAtEnd: false, category: 'Robô / Arbitragem', status: 'active',
  });
  const catSettings: PlatformSettings = {
    ...mockSettings,
    minDepositAmount: 25,
    dailyGoalAmount: 1000,
    goalCycleStartDate: '2026-09-22',
  };
  const cycleDone = ['2026-09-22','2026-09-23','2026-09-24','2026-09-25','2026-09-26','2026-09-27','2026-09-28','2026-09-29','2026-09-30'];
  const units = (d: { activeContracts: { units: number }[] }) => d.activeContracts.reduce((sum, c) => sum + c.units, 0);

  // ---- PONTO 1: prefere as cotas MAIORES (menos produtos para o mesmo capital) ----
  {
    const todayP1 = '2026-09-26';
    const r = calculatePortfolioRoadmap({
      products: [mkProd('p1-x', 'NW354', 1000, '2026-09-22')],
      expenses: [], settings: { ...catSettings, completedRoadmapDays: ['2026-09-22','2026-09-23','2026-09-24','2026-09-25'] },
      horizonDays: 20, templates: catalog, includeExpenses: true, today: todayP1,
    });
    const d = r.getDayDetails(4)!;
    const totalUnits = d.acquisitionsToday.reduce((sum, a) => sum + a.units, 0);
    const totalSpent = d.acquisitionsToday.reduce((sum, a) => sum + a.investedAmount, 0);
    const biggest = Math.max(...d.acquisitionsToday.map((a) => a.unitPrice));
    assert(totalSpent === 175, `Ponto 1: mesmo capital sugerido de antes (R$175; veio R$${totalSpent})`);
    assert(totalUnits <= 3, `Ponto 1: R$175 viram no máximo 3 produtos, não 7x R$25 (veio ${totalUnits})`);
    assert(biggest === 100, `Ponto 1: a maior cota que cabe (R$100) é a principal (veio R$${biggest})`);
    assert(d.acquisitionsToday.every((a) => catalogPrices.has(a.unitPrice)), 'Ponto 1: toda cota sugerida existe no catálogo');
  }

  // ---- PONTO 1b: a prioridade por EFICIÊNCIA (% ao dia) continua valendo ----
  {
    // O cenário misto do topo do arquivo (3% x 2%): trocar uma cota de 3% por uma
    // de 2% só porque é mais cara atrasaria a meta (era 177 dias).
    assert(
      result.daysToGoal !== null && result.daysToGoal <= 177,
      `Ponto 1: a escolha por cota maior não atrasa a meta (${result.daysToGoal} dias; limite 177)`
    );
  }

  // ---- PONTO 2: 1 cota = 1 produto, com o nome do catálogo ----
  {
    // (a) Exemplo exato do relato: "26x cotas (R$ 25,00)" = R$650, rotulado como simulação.
    const synthetic = {
      day: 10, date: '2026-10-01', dateFormatted: '01/10/2026',
      acquisitionsToday: [{
        id: 'reinv_d10_x', name: 'Reinvestimento (NW354)', investedAmount: 650, unitPrice: 25, units: 26,
        dailyPercentage: 20, dailyYield: 130, durationDays: 16, startDateFormatted: '01/10/2026', endDateFormatted: '17/10/2026',
        startDay: 10, endDay: 26, daysRemaining: 16, returnCapitalAtEnd: false, isReinvestment: true,
      }],
    } as unknown as Parameters<typeof buildProductsFromRoadmapAcquisitions>[0];
    let sid = 0;
    const out = buildProductsFromRoadmapAcquisitions(synthetic, [], () => `syn-${sid++}`);
    assert(out.length === 26, `Ponto 2: 26 cotas viram 26 produtos (veio ${out.length})`);
    assert(out.every((p) => p.investedAmount === 25), 'Ponto 2: cada produto vale R$25 (e não R$650)');
    assert(out.every((p) => p.name === 'NW354'), 'Ponto 2: nome do catálogo "NW354", sem o rótulo "Reinvestimento (...)"');
    assert(out.reduce((sum, p) => sum + p.investedAmount, 0) === 650, 'Ponto 2: o total investido continua R$650');
    assert(new Set(out.map((p) => p.id)).size === 26, 'Ponto 2: ids únicos');
    assert(out.every((p) => p.roadmapAcquisitionDate === '2026-10-01' && p.startDate === '2026-10-01' && p.status === 'active'), 'Ponto 2: produtos ativos, datados e marcados como do Roadmap');
    assert(stripRoadmapLabel('Otimização da carteira (NW900E)') === 'NW900E' && stripRoadmapLabel('NW900E') === 'NW900E', 'Ponto 2: remoção do rótulo só atua nos rótulos da simulação');

    // (b) Nunca recria produtos que já existem na carteira.
    const already = buildProductsFromRoadmapAcquisitions(synthetic, [mkProd('reinv_d10_x', 'NW354', 650, '2026-10-01')], () => 'z');
    assert(already.length === 0, 'Ponto 2: contrato que já é produto real não é recriado');

    // (c) Integração com o motor: uma aquisição com várias cotas.
    const bigDone = ['2026-09-22','2026-09-23','2026-09-24','2026-09-25'];
    const bigProducts = [mkProd('big', 'NWRT23K', 100000, '2026-09-22')];
    const runBig = (prods: InvestmentProduct[], done: string[]) =>
      calculatePortfolioRoadmap({
        products: prods, expenses: [], settings: { ...catSettings, dailyGoalAmount: 300000, completedRoadmapDays: done },
        horizonDays: 20, templates: catalog, includeExpenses: true, today: '2026-09-26',
      });
    const before = runBig(bigProducts, bigDone).getDayDetails(4)!;
    const multi = before.acquisitionsToday.find((a) => a.units >= 2);
    assert(Boolean(multi), 'Ponto 2: cenário de integração contém uma aquisição com 2+ cotas');
    let bid = 0;
    const created = buildProductsFromRoadmapAcquisitions(before, bigProducts, () => `big-${bid++}`);
    const expectedUnits = before.acquisitionsToday.reduce((sum, a) => sum + a.units, 0);
    assert(created.length === expectedUnits, `Ponto 2: ${expectedUnits} cotas sugeridas = ${created.length} produtos criados`);
    assert(created.every((p) => catalogPrices.has(p.investedAmount) && catalogNames.has(p.name)), 'Ponto 2: todo produto criado tem nome e valor do catálogo');
    assert(
      Math.abs(created.reduce((sum, p) => sum + p.investedAmount, 0) - before.acquisitionsToday.reduce((sum, a) => sum + a.investedAmount, 0)) < 0.01,
      'Ponto 2: capital criado = capital sugerido'
    );
    const afterBig = runBig([...created, ...bigProducts], [...bigDone, before.date]).getDayDetails(4)!;
    assert(units(afterBig) - units(before) === expectedUnits, `Ponto 2: produtos ativos sobem exatamente ${expectedUnits} (era ${units(before)}, agora ${units(afterBig)})`);
    assert(
      afterBig.acquisitionsToday.reduce((sum, a) => sum + a.investedAmount, 0) <= before.acquisitionsToday.reduce((sum, a) => sum + a.investedAmount, 0) + 0.01,
      'Ponto 2: concluir não aumenta o valor investido no dia (sem duplicação)'
    );
  }

  // ---- Dados legados: produto agregado criado pelo bug antigo (R$650 = 26x R$25) ----
  {
    const legacy: InvestmentProduct = {
      ...mkProd('legacy-650', 'NW354', 650, '2026-10-01'),
      category: 'Reinvestimento do Roadmap',
      roadmapAcquisitionDate: '2026-10-01',
      roadmapAcquisitionDay: 9,
    };
    const rl = calculatePortfolioRoadmap({
      products: [mkProd('l-a', 'NW765H', 250, '2026-09-22'), legacy],
      expenses: [], settings: { ...catSettings, dailyGoalAmount: 3000, completedRoadmapDays: cycleDone },
      horizonDays: 40, templates: catalog, includeExpenses: true, today: '2026-10-01',
    });
    assert(
      !rl.projectedAcquisitions.some((a) => a.unitPrice === 650),
      'Legado: um produto agregado de R$650 não vira "modelo de compra" falso (o catálogo manda)'
    );
  }

  // ---- PONTO 3: concluir um DIA FUTURO transforma as sugestões em produtos ativos ----
  {
    const todayP3 = '2026-10-01';
    const p3Products = [
      mkProd('a', 'NW765H', 250, '2026-09-22'), mkProd('b', 'NW354', 25, '2026-09-23'), mkProd('c', 'NW4050', 50, '2026-09-24'),
      mkProd('d', 'NW354', 25, '2026-09-25'), mkProd('e', 'NW354', 25, '2026-09-26'), mkProd('f', 'NW354', 25, '2026-09-28'), mkProd('g', 'NW354', 25, '2026-09-30'),
    ];
    const runP3 = (prods: InvestmentProduct[], done: string[]) =>
      calculatePortfolioRoadmap({ products: prods, expenses: [], settings: { ...catSettings, completedRoadmapDays: done }, horizonDays: 30, templates: catalog, includeExpenses: true, today: todayP3 });

    const base0 = runP3(p3Products, cycleDone);
    let idSeq = 0;
    const mismatches: string[] = [];

    for (const futureDay of [10, 12, 15]) {
      const planned = base0.getDayDetails(futureDay)!;
      const plannedCotas = planned.acquisitionsToday.reduce((sum, a) => sum + a.units, 0);
      const created = buildProductsFromRoadmapAcquisitions(planned, p3Products, () => `fut-${futureDay}-${idSeq++}`);

      assert(plannedCotas > 0, `Ponto 3 (dia ${futureDay}): há aquisições sugeridas para o dia futuro`);
      assert(created.length === plannedCotas, `Ponto 3 (dia ${futureDay}): ${plannedCotas} cotas sugeridas viram ${created.length} produtos ativos`);
      assert(created.every((p) => p.status === 'active' && p.startDate === planned.date), `Ponto 3 (dia ${futureDay}): produtos ativos e com a data do dia futuro`);
      assert(created.every((p) => catalogNames.has(p.name) && !p.name.toLowerCase().includes('reinvestimento')), `Ponto 3 (dia ${futureDay}): nomes do catálogo, sem rótulo da simulação`);

      const done1 = [...cycleDone, planned.date];
      const prods1 = [...created, ...p3Products];
      const after = runP3(prods1, done1);

      // A projeção inteira (todos os dias, inclusive os anteriores) não pode se mexer.
      for (let k = 0; k <= 30; k++) {
        const a = base0.getDayDetails(k)!, b = after.getDayDetails(k)!;
        if (Math.abs(a.dailyYield - b.dailyYield) > 0.01) mismatches.push(`dia ${futureDay}/k=${k} renda ${a.dailyYield}→${b.dailyYield}`);
        if (Math.abs((a.bankBalance ?? 0) - (b.bankBalance ?? 0)) > 0.01) mismatches.push(`dia ${futureDay}/k=${k} banco ${a.bankBalance ?? 0}→${b.bankBalance ?? 0}`);
        if (units(a) !== units(b)) mismatches.push(`dia ${futureDay}/k=${k} ativos ${units(a)}→${units(b)}`);
      }
      const spentAfter = after.getDayDetails(futureDay)!.acquisitionsToday.reduce((sum, a) => sum + a.investedAmount, 0);
      const spentBefore = planned.acquisitionsToday.reduce((sum, a) => sum + a.investedAmount, 0);
      assert(Math.abs(spentAfter - spentBefore) < 0.01, `Ponto 3 (dia ${futureDay}): valor adquirido no dia permanece R$${spentBefore.toFixed(2)} (sem duplicar)`);

      // Desfazer (mesma regra do App) restaura exatamente a projeção original.
      const prods2 = prods1.filter((p) => p.roadmapAcquisitionDate !== planned.date);
      const undone = runP3(prods2, done1.filter((x) => x !== planned.date));
      let undoDiff = 0;
      for (let k = 0; k <= 30; k++) {
        const a = base0.getDayDetails(k)!, b = undone.getDayDetails(k)!;
        undoDiff = Math.max(undoDiff, Math.abs(a.dailyYield - b.dailyYield), Math.abs((a.bankBalance ?? 0) - (b.bankBalance ?? 0)), Math.abs(units(a) - units(b)));
      }
      assert(undoDiff < 0.01, `Ponto 3 (dia ${futureDay}): desfazer remove todos os ${created.length} produtos e restaura a projeção`);
    }
    assert(mismatches.length === 0, `Ponto 3: concluir dia futuro não altera a projeção de nenhum dia${mismatches.length ? ' — ' + mismatches.slice(0, 3).join('; ') : ''}`);
  }
}

console.log('\n🎉 Todos os testes de lógica e auditoria do Roadmap passaram com 100% de sucesso!');
