export interface InvestmentProduct {
  id: string;
  name: string;
  investedAmount: number; // R$ Investido
  returnAmount?: number; // R$ de retorno (rendimento total ou diário configurado)
  returnType?: 'total' | 'daily'; // Modalidade informada do retorno
  dailyPercentage: number; // % ao dia (calculada ou direta)
  durationDays: number; // Duração em dias (ex: 30)
  startDate: string; // YYYY-MM-DD
  returnCapitalAtEnd: boolean; // Se o capital inicial é devolvido no final além dos rendimentos diários
  category?: string; // ex: Arbitragem, Cripto, Renda Fixa, Robô, Aporte
  status: 'active' | 'completed' | 'paused';
  notes?: string;
  isReinvestment?: boolean;
  isNewInvestment?: boolean;
}

export interface ProductTemplate {
  id: string;
  name: string; // Ex: NW4050, NW354
  investedAmount: number; // R$ 50,00
  returnAmount?: number; // R$ 160,00
  returnType?: 'total' | 'daily'; // 'total' | 'daily'
  dailyPercentage: number; // % ao dia
  durationDays: number; // Duração em dias (ex: 16)
  returnCapitalAtEnd: boolean; // false
  category?: string; // Robô / Arbitragem
  notes?: string;
  createdAt?: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number; // R$
  dueDate?: string; // YYYY-MM-DD (opcional se for gasto sem data fixa)
  hasDueDate?: boolean; // Se possui data de vencimento
  category: 'Moradia' | 'Cartão / Fatura' | 'Serviços' | 'Alimentação' | 'Reinvestimento' | 'Imprevisto' | 'Outros';
  isPaid: boolean;
  paidDate?: string;
  deductFromRoadmap?: boolean; // Se abater do saldo de reinvestimento do Roadmap (Padrão: true)
  notes?: string;
  installmentGroupId?: string; // ID do grupo de parcelas se for gasto parcelado
  installmentNumber?: number; // Número da parcela atual (ex: 1)
  totalInstallments?: number; // Total de parcelas (ex: 12)
}

export interface PlatformSettings {
  withdrawalFeePercentage: number; // ex: 5 (para 5% de taxa por saque)
  fixedWithdrawalFee: number; // ex: 0 ou taxa fixa em R$
  minWithdrawalAmount: number; // ex: 50.00
  minDepositAmount?: number; // ex: 50.00 (Depósito mínimo para aportes/reinvestimentos)
  dailyGoalAmount: number; // R$ meta de rendimento diário desejada
  reinvestmentBufferPercentage: number; // Margem de segurança de rendimento para manter reinvestindo (ex: 20%)
  goalCycleStartDate?: string; // Data YYYY-MM-DD em que o ciclo de meta atual foi iniciado/resetado
  roadmapStartDate?: string; // Alias de compatibilidade para goalCycleStartDate
  dynamicBufferEnabled?: boolean; // Se o buffer de reinvestimento protegido dinâmico está ativado (Padrão: true)
  protectionProfile?: 'conservative' | 'balanced' | 'aggressive' | 'accelerated'; // Perfil de proteção contra risco de plataforma
  completedRoadmapDays?: string[]; // Lista de datas YYYY-MM-DD com ações do dia já concluídas
}

export interface ProductCalculations {
  dailyYield: number; // Rendimento diário em R$
  totalDailyYieldSum: number; // Soma de rendimentos diários durante o período
  grossReturnAmount: number; // Total bruto recebido (rendimento + capital devolvido se houver)
  grossReturnPercentage: number; // % de retorno bruto sobre o investimento
  netProfitAmount: number; // Lucro líquido real (após taxa de saque e dedução do capital investido)
  netProfitPercentage: number; // % de lucro líquido real
  totalWithdrawalFee: number; // Valor retido em taxas de saque estimadas
  paybackDays: number; // Dias necessários para recuperar o capital investido
  endDate: string; // YYYY-MM-DD
  daysElapsed: number;
  daysRemaining: number;
  progressPercentage: number;
  isExpired: boolean;
}

export interface DayDetail {
  date: string; // YYYY-MM-DD
  dailyYield: number; // R$ gerado neste dia
  capitalReturned: number; // R$ capital devolvido neste dia
  totalGrossInflow: number; // dailyYield + capitalReturned
  activeProductsCount: number;
  products: {
    productId: string;
    productName: string;
    yield: number;
    isMaturityDay: boolean;
    capitalReturn: number;
  }[];
  expensesDue: Expense[];
  expensesRecommended: Expense[];
  accumulatedBalance: number; // Saldo líquido acumulado até a data
}

export interface ExpensePaymentOptimization {
  expenseId: string;
  bestDate: string; // YYYY-MM-DD
  bestDateFormatted: string; // DD/MM/AAAA
  daysBeforeDue: number; // Quantos dias antes do vencimento
  accumulatedYieldAtDate: number; // Saldo líquido disponível no dia recomendado
  requiredAmountWithFee: number; // Valor da despesa + taxa de saque para liquidar
  withdrawalFee: number; // Taxa de saque aplicada
  remainingBufferForReinvestment: number; // Saldo que sobra para continuar investindo
  isFeasibleWithYieldOnly: boolean; // Se o rendimento acumulado cobre a despesa a tempo
  deficitAmount: number; // Se não cobrir 100%, quanto falta
  reasoning: string; // Explicação detalhada amigável
  safetyLevel: 'safe' | 'tight' | 'insufficient'; // Status da recomendação
  goalDelayDays: number; // Impacto na meta se pagar neste dia (em dias de atraso na meta)
  riskMitigationTip?: string; // Dica de proteção contra instabilidade/queda da plataforma
  earlyPaymentBenefit?: string; // Por que antecipar blinda contra prejuízos
}

export interface PortfolioMilestone {
  date: string;
  dateFormatted: string;
  dayNumber: number;
  type:
    | 'contract_end'
    | 'capital_return'
    | 'goal_reached'
    | 'contract_start'
    | 'reinvestment'
    | 'goal_maintenance'
    | 'expense_withdrawal'
    | 'expense_unfundable'
    | 'new_investment'
    | 'capital_protection'
    | 'optimization_start'
    | 'optimization_completed';
  title: string;
  description: string;
  amount?: number; // Valor total do saque bruto ou reinvestimento
  expenseAmount?: number; // Valor líquido da despesa (valor a ser pago)
  feeAmount?: number; // Valor da taxa de saque retida
  dailyYieldAfter: number;
  units?: number;
  protectionAmount?: number; // Quantia sugerida para guardar/blindar contra instabilidade da plataforma
  protectionReason?: string; // Motivo inteligente da proteção (ex: Payback, Duração, Despesas)
  protectionPercent?: number; // % do capital inicial já protegido
  riskExposureLevel?: 'low' | 'moderate' | 'high'; // Risco estimado da carteira no momento
}

export interface ProjectedAcquisitionItem {
  id: string;
  name: string;
  day: number;
  date: string;
  dateFormatted: string;
  unitPrice: number;
  units: number;
  totalSpent: number;
  dailyYieldAdded: number;
  dailyPercentage: number;
  durationDays: number;
  returnCapitalAtEnd: boolean;
}

export interface ProjectedAcquisitionGroup {
  name: string;
  unitPrice: number;
  totalUnits: number;
  totalSpent: number;
  totalDailyYieldAdded: number;
  dailyPercentage: number;
  durationDays: number;
  scheduledDays: number[];
}

export interface RoadmapContractSnapshot {
  id: string;
  name: string;
  /** Total investido no contrato (unitPrice * units). */
  investedAmount: number;
  /** Preço de uma cota. */
  unitPrice: number;
  /** Quantidade de cotas idênticas agregadas neste contrato. */
  units: number;
  dailyPercentage: number;
  dailyYield: number;
  durationDays: number;
  startDateFormatted: string;
  endDateFormatted: string;
  startDay: number;
  endDay: number;
  daysRemaining: number;
  returnCapitalAtEnd: boolean;
  isReinvestment: boolean;
  isNewInvestment?: boolean;
  /** Indica se o contrato é originário da carteira existente no início do ciclo */
  isInitialPortfolio?: boolean;
  /** Indica se o contrato foi adquirido exatamente no dia inspecionado */
  isAcquiredToday?: boolean;
  /** Dia do ciclo em que foi adquirido */
  acquisitionDay?: number;
}

export interface RoadmapPointDetails {
  day: number;
  date: string;
  dateFormatted: string;
  dailyYield: number;
  dailyYieldNet: number;
  accumulatedYield: number;
  cashBalance: number;
  /** Saldo líquido disponível na conta bancária (fora do risco da plataforma). */
  bankBalance?: number;
  /** Saldo bruto retido na plataforma (aguardando atingir valor mínimo de saque). */
  platformBalance?: number;
  reservedForExpenses?: number;
  reservedForReinvestment?: number;
  dynamicBufferPercentage?: number; // % de buffer dinâmico calculado para o dia
  suggestedProtectionToday?: number; // R$ sugerido para guardar/resguardar hoje
  totalProtectedAccumulated?: number; // R$ total acumulado resguardado fora de risco
  riskExposureLevel?: 'low' | 'moderate' | 'high'; // Nível de risco da carteira
  protectionTip?: string; // Recomendação contextual do algoritmo
  contractDurationRisk?: {
    avgRemainingDays: number;
    maxRemainingDays: number;
    capitalInLongContracts: number;
    contractsExpiringSoonCount: number;
  };
  capitalReturnedToday: number;
  expensesDeductedToday: number;
  expensesPaidFromBlindagemToday?: number;
  expensesPaidFromFreeBankToday?: number;
  totalExpensesDeductedUpToDay: number;
  reinvestedToday: number;
  totalReinvestedUpToDay: number;
  activeContractsCount: number;
  activeInvestedAmount: number;
  targetYield: number;
  progressPercent: number;
  isGoalReached: boolean;
  activeContracts: RoadmapContractSnapshot[];
  /** Todos os produtos/cotas adquiridos exatamente no dia inspecionado (startDay === day) */
  acquisitionsToday: RoadmapContractSnapshot[];
  newPurchasesToday: RoadmapContractSnapshot[];
  newInvestmentsToday: RoadmapContractSnapshot[];
  newInvestmentsUpToDay: RoadmapContractSnapshot[];
  allReinvestmentsUpToDay: RoadmapContractSnapshot[];
  expiredContractsUpToDay: RoadmapContractSnapshot[];
  expiredTodayContracts: RoadmapContractSnapshot[];
  expensesTodayList: Expense[];
  /** Indica se esta data é o marco/ponto de início da projeção do roadmap. */
  isStartDate?: boolean;
  /** Indica se este dia está dentro do período de otimização de produtos pós-meta */
  isOptimizationPhase?: boolean;
  /** Indica se neste dia a carteira já alcançou o número mínimo de contratos otimizados */
  isOptimizedState?: boolean;
}

export interface PortfolioRoadmapPoint {
  day: number;
  date: string;
  dateFormatted: string;
  dailyYield: number; // R$/dia bruto
  dailyYieldNet: number; // R$/dia líquido (pós taxa)
  accumulatedYield: number; // R$ acumulado até esta data
  capitalReturnedToday: number;
  expensesDeductedToday: number;
  reinvestedToday: number;
  newInvestmentsToday?: number;
  activeContractsCount: number;
  activeInvestedAmount: number;
  targetYield: number; // Meta diária configurada
  dynamicBufferPercentage?: number;
  suggestedProtectionToday?: number;
  totalProtectedAccumulated?: number;
  isProtectionPoint?: boolean;
  isGoalReached?: boolean;
  /** Indica se este dia está dentro do período de otimização pós-meta */
  isOptimizationPhase?: boolean;
  /** Indica se neste dia a carteira já alcançou o número mínimo de produtos */
  isOptimizedState?: boolean;
  /** Indica se este ponto representa o Ponto de Início da projeção. */
  isStartDate?: boolean;
  /** Caixa líquido seguro na conta bancária ao fim do dia. */
  bankBalance?: number;
  /** Saldo bruto retido na plataforma ao fim do dia (aguardando saque mínimo). */
  platformBalance?: number;
  /** Caixa livre ao fim do dia (espelho de bankBalance). */
  cashBalance?: number;
}

/** Despesa que a projeção de caixa não consegue cobrir dentro do prazo. */
export interface UnfundableExpense {
  expenseId: string;
  title: string;
  amount: number;
  requiredGrossWithdrawal: number;
  dueDate?: string;
  daysWaited: number;
  reason: string;
}

export interface PortfolioOptimizationSummary {
  /** Se o período de otimização foi ativado / iniciado após a meta */
  isOptimizationActive: boolean;
  /** Se a carteira já atingiu o estado mínimo otimizado */
  isOptimized: boolean;
  /** Dia da simulação em que a meta foi batida e a otimização começou */
  startDay: number | null;
  startDateFormatted: string | null;
  /** Dia da simulação em que a carteira atingiu o número mínimo de produtos */
  completionDay: number | null;
  completionDateFormatted: string | null;
  /** Quantidade de produtos/contratos ativos no momento em que a meta foi atingida */
  initialContractsAtGoal: number;
  /** Quantidade mínima necessária de produtos para sustentar a meta */
  minPossibleContracts: number;
  /** Quantidade final de produtos após a consolidação */
  optimizedContractsCount: number;
  /** Quantidade de produtos reduzidos/eliminados */
  contractsReduced: number;
  /** Percentual de redução na quantidade de produtos ativos */
  reductionPercentage: number;
  /** Duração em dias do período de consolidação/otimização */
  durationDays: number;
  /** Descrição amigável do status da otimização */
  statusDescription: string;
}

export interface PortfolioRoadmapSummary {
  currentDailyYield: number;
  targetDailyYield: number;
  percentOfGoalReached: number;
  /** True somente se a meta já foi atingida em data igual ou anterior a hoje. */
  isGoalReached: boolean;
  /** Data em que a meta foi batida, quando já ocorreu. */
  goalReachedOn: string | null;
  /** Dias de hoje até a meta. 0 quando já foi atingida. */
  daysToGoal: number | null;
  /** Dia da simulação (a partir do início do ciclo) em que a meta é batida. */
  daysToGoalFromCycleStart: number | null;
  estimatedGoalDate: string | null;
  estimatedGoalDateFormatted: string | null;
  totalReinvested: number;
  totalNewInvestments: number;
  totalExpensesDeducted: number;
  /** Soma dos rendimentos brutos. NÃO inclui devolução de principal. */
  totalProjectedGrossYield: number;
  /** Rendimento bruto menos as taxas de saque efetivamente pagas. */
  totalProjectedNetProfit: number;
  /** Principal devolvido no vencimento dos contratos. */
  totalCapitalReturned: number;
  /** Taxas de saque pagas ao longo da projeção. */
  totalWithdrawalFeesPaid: number;
  totalCapitalToReturn: number;
  activeProductsCount: number;
  maxDailyYield: number;
  /** Saldo líquido final em banco na conclusão do horizonte simulado. */
  finalBankBalance?: number;
  /** Saldo bruto final na plataforma na conclusão do horizonte simulado. */
  finalPlatformBalance?: number;
  totalProtectedAmountSuggested?: number; // Total sugerido para manter guardado/sacado em segurança
  protectionCheckpointsCount?: number; // Quantidade de pontos de proteção identificados
  dynamicBufferAvg?: number; // Média ponderada do buffer dinâmico durante a projeção
  initialCapitalSecuredPercent?: number; // % do capital inicial que é blindado ao longo da simulação
  protectionSummaryTip?: string; // Dica resumo da estratégia de mitigação de risco
  /** Resumo completo do período de otimização e consolidação de produtos pós-meta */
  optimizationSummary?: PortfolioOptimizationSummary;
  /** Despesas que a projeção não consegue cobrir. Lista vazia é o caso normal. */
  unfundableExpenses: UnfundableExpense[];
  /** Data base (Dia 0) a partir da qual o roadmap simula o crescimento. */
  baseStartDate?: string;
  /** True se o usuário fixou um ponto de início customizado para o ciclo. */
  isCustomStartPoint?: boolean;
  reinvestmentUnitUsed: {
    name: string;
    price: number;
    dailyPercentage: number;
    durationDays: number;
    returnCapitalAtEnd: boolean;
  };
  /** Novos produtos/cotas projetados para aquisição ao longo do ciclo até atingir a meta */
  projectedAcquisitions: ProjectedAcquisitionItem[];
  /** Novos produtos agrupados por modelo com total de cotas e dias previstos */
  projectedAcquisitionsGrouped: ProjectedAcquisitionGroup[];
  /** Quantidade total de cotas que serão necessárias adquirir ao longo do ciclo */
  totalProjectedAcquisitionsCount: number;
  /** Valor total em R$ necessário para adquirir todas as cotas projetadas */
  totalProjectedAcquisitionsAmount: number;
  chartData: PortfolioRoadmapPoint[];
  milestones: PortfolioMilestone[];
  /**
   * Reconstrói os detalhes de um dia sob demanda. Mantido fora de `chartData`
   * para não reter o histórico inteiro em cada ponto do gráfico.
   */
  getDayDetails: (day: number) => RoadmapPointDetails | null;
}

export interface ReinvestmentOption {
  id: string;
  name: string;
  price: number; // Valor do aporte (ex: 50.00)
  dailyPercentage: number; // % ao dia (ex: 2.5)
  durationDays: number; // Dias de duração (ex: 30)
  returnCapitalAtEnd: boolean;
}

export interface RoadmapMilestone {
  dayNumber: number; // 1, 2, 3...
  date: string; // YYYY-MM-DD
  dateFormatted: string; // DD/MM/AAAA
  accumulatedBalanceBefore: number;
  dailyYieldGenerated: number;
  dailyYieldNetAfterFee: number; // Rendimento diário após dedução da taxa de saque da plataforma
  withdrawalFeeDeducted: number; // Taxa de saque aplicada no resgate para reinvestir
  capitalReturned: number;
  totalAvailable: number;
  productBoughtName: string;
  unitsBought: number;
  unitPrice: number;
  totalSpent: number;
  newDailyYieldNextDay: number;
  dailyYieldAdded: number;
  remainingCashBalance: number;
  progressPercentage: number;
  isGoalReached: boolean;
  totalInvestedSoFar: number;
}

export interface RoadmapProjection {
  currentDailyYield: number;
  targetDailyYield: number;
  daysToGoal: number;
  estimatedGoalDate: string;
  estimatedGoalDateFormatted: string;
  totalReinvested: number;
  totalWithdrawalFeesPaid: number; // Total acumulado de taxas de saque pagas para reinvestir
  totalUnitsBought: number;
  milestones: RoadmapMilestone[];
  chartData: {
    day: number;
    dateFormatted: string;
    dailyYield: number;
    targetYield: number;
    accumulatedCash: number;
    totalInvested: number;
  }[];
  monthlyIncomeAtGoal: number;
  annualIncomeAtGoal: number;
}
