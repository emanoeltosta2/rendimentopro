import { calculatePortfolioRoadmap } from '../src/utils/roadmap.js';
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
console.log('\n🎉 Todos os testes de lógica e auditoria do Roadmap passaram com 100% de sucesso!');
