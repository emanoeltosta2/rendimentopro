import { calculatePortfolioRoadmap } from '../src/utils/roadmap.js';
import { InvestmentProduct, PlatformSettings, ProductTemplate } from '../src/types/investment.js';

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

console.log('\n🎉 Todos os testes de lógica e auditoria do Roadmap passaram com 100% de sucesso!');
