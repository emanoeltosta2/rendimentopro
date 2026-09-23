export interface InvestmentProduct {
  id: string;
  name: string;
  investedAmount: number; // R$ Investido
  returnAmount?: number; // R$ de retorno (rendimento total ou di├írio configurado)
  returnType?: 'total' | 'daily'; // Modalidade informada do retorno
  dailyPercentage: number; // % ao dia (calculada ou direta)
  durationDays: number; // Dura├º├úo em dias (ex: 30)
  startDate: string; // YYYY-MM-DD
  returnCapitalAtEnd: boolean; // Se o capital inicial ├® devolvido no final al├®m dos rendimentos di├írios
  category?: string; // ex: Arbitragem, Cripto, Renda Fixa, Rob├┤, Aporte
  status: 'active' | 'completed' | 'paused';
  notes?: string;
  isReinvestment?: boolean;
  isNewInvestment?: boolean;
  /** Metadados internos: produto criado ao concluir uma a├º├úo do Roadmap. */
  roadmapAcquisitionDate?: string;
  roadmapAcquisitionDay?: number;
}

export interface ProductTemplate {
  id: string;
  name: string; // Ex: NW4050, NW354
  investedAmount: number; // R$ 50,00
  returnAmount?: number; // R$ 160,00
  returnType?: 'total' | 'daily'; // 'total' | 'daily'
  dailyPercentage: number; // % ao dia
  durationDays: number; // Dura├º├úo em dias (ex: 16)
  returnCapitalAtEnd: boolean; // false
  category?: string; // Rob├┤ / Arbitragem
  notes?: string;
  createdAt?: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number; // R$
  dueDate?: string; // YYYY-MM-DD (opcional se for gasto sem data fixa)
  hasDueDate?: boolean; // Se possui data de vencimento
  category: 'Moradia' | 'Cart├úo / Fatura' | 'Servi├ºos' | 'Alimenta├º├úo' | 'Reinvestimento' | 'Imprevisto' | 'Outros';
  isPaid: boolean;
  paidDate?: string;
  /** Indica que a quita├º├úo foi aplicada automaticamente ao concluir um dia do Roadmap. */
  roadmapPaidDate?: string;
  deductFromRoadmap?: boolean; // Se abater do saldo de reinvestimento do Roadmap (Padr├úo: true)
  notes?: string;
  installmentGroupId?: string; // ID do grupo de parcelas se for gasto parcelado
  installmentNumber?: number; // N├║mero da parcela atual (ex: 1)
  totalInstallments?: number; // Total de parcelas (ex: 12)
}

export interface PlatformSettings {
  withdrawalFeePercentage: number; // ex: 5 (para 5% de taxa por saque)
  fixedWithdrawalFee: number; // ex: 0 ou taxa fixa em R$
  minWithdrawalAmount: number; // ex: 50.00
  minDepositAmount?: number; // ex: 50.00 (Dep├│sito m├¡nimo para aportes/reinvestimentos)
  dailyGoalAmount: number; // R$ meta de rendimento di├írio desejada
  reinvestmentBufferPercentage: number; // Margem de seguran├ºa de rendimento para manter reinvestindo (ex: 20%)
  goalCycleStartDate?: string; // Data YYYY-MM-DD em que o ciclo de meta atual foi iniciado/resetado
  roadmapStartDate?: string; // Alias de compatibilidade para goalCycleStartDate
  dynamicBufferEnabled?: boolean; // Se o buffer de reinvestimento protegido din├ómico est├í ativado (Padr├úo: true)
  protectionProfile?: 'conservative' | 'balanced' | 'aggressive' | 'accelerated'; // Perfil de prote├º├úo contra risco de plataforma
  completedRoadmapDays?: string[]; // Lista de datas YYYY-MM-DD com a├º├Áes do dia j├í conclu├¡das
  /** Aporte externo livre que passa a existir a partir do dia atual do roadmap. */
  manualBankInjection?: number;
  manualBankInjectionDate?: string;
  /** Aporte externo destinado ├á reserva de blindagem a partir do dia atual. */
  manualProtectionInjection?: number;
  manualProtectionInjectionDate?: string;
  /** Lançamentos manuais de caixa, um por registro, com data própria. */
  manualCashMovements?: ManualCashMovement[];
  /**
   * Datas (YYYY-MM-DD) em que o usuário adiou as compras do dia.
   *
   * Numa data adiada o motor não efetiva nenhuma aquisição — o caixa fica
   * parado no banco e chega acumulado ao dia seguinte, onde a alocação é
   * recalculada com o valor a mais.
   */
  deferredAcquisitions?: string[];
}

/** Lançamento manual de caixa, registrado no detalhe de um dia do Roadmap. */
export interface ManualCashMovement {
  id: string;
  /** Data do lançamento, YYYY-MM-DD. */
  date: string;
  /** Delta no saldo livre em banco. Positivo = entrada, negativo = retirada. */
  bank: number;
  /** Delta na reserva de blindagem. Opcional. */
  protection?: number;
  /** Anotação livre do usuário. */
  note?: string;
}

export interface ProductCalculations {
  dailyYield: number; // Rendimento di├írio em R$
  totalDailyYieldSum: number; // Soma de rendimentos di├írios durante o per├¡odo
  grossReturnAmount: number; // Total bruto recebido (rendimento + capital devolvido se houver)
  grossReturnPercentage: number; // % de retorno bruto sobre o investimento
  netProfitAmount: number; // Lucro l├¡quido real (ap├│s taxa de saque e dedu├º├úo do capital investido)
  netProfitPercentage: number; // % de lucro l├¡quido real
  totalWithdrawalFee: number; // Valor retido em taxas de saque estimadas
  paybackDays: number; // Dias necess├írios para recuperar o capital investido
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
  accumulatedBalance: number; // Saldo l├¡quido acumulado at├® a data
}

export interface ExpensePaymentOptimization {
  expenseId: string;
  bestDate: string; // YYYY-MM-DD
  bestDateFormatted: string; // DD/MM/AAAA
  daysBeforeDue: number; // Quantos dias antes do vencimento
  accumulatedYieldAtDate: number; // Saldo l├¡quido dispon├¡vel no dia recomendado
  requiredAmountWithFee: number; // Valor da despesa + taxa de saque para liquidar
  withdrawalFee: number; // Taxa de saque aplicada
  remainingBufferForReinvestment: number; // Saldo que sobra para continuar investindo
  isFeasibleWithYieldOnly: boolean; // Se o rendimento acumulado cobre a despesa a tempo
  deficitAmount: number; // Se n├úo cobrir 100%, quanto falta
  reasoning: string; // Explica├º├úo detalhada amig├ível
  safetyLevel: 'safe' | 'tight' | 'insufficient'; // Status da recomenda├º├úo
  goalDelayDays: number; // Impacto na meta se pagar neste dia (em dias de atraso na meta)
  riskMitigationTip?: string; // Dica de prote├º├úo contra instabilidade/queda da plataforma
  earlyPaymentBenefit?: string; // Por que antecipar blinda contra preju├¡zos
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
    | 'expense_rescheduled'
    | 'new_investment'
    | 'capital_protection'
    | 'optimization_start'
    | 'optimization_completed';
  title: string;
  description: string;
  amount?: number; // Valor total do saque bruto ou reinvestimento
  expenseAmount?: number; // Valor l├¡quido da despesa (valor a ser pago)
  feeAmount?: number; // Valor da taxa de saque retida
  dailyYieldAfter: number;
  units?: number;
  protectionAmount?: number; // Quantia sugerida para guardar/blindar contra instabilidade da plataforma
  protectionReason?: string; // Motivo inteligente da prote├º├úo (ex: Payback, Dura├º├úo, Despesas)
  protectionPercent?: number; // % do capital inicial j├í protegido
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
  /** Pre├ºo de uma cota. */
  unitPrice: number;
  /** Quantidade de cotas id├¬nticas agregadas neste contrato. */
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
  /** Indica se o contrato ├® origin├írio da carteira existente no in├¡cio do ciclo */
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
  /** Saldo l├¡quido dispon├¡vel na conta banc├íria (fora do risco da plataforma). */
  bankBalance?: number;
  /** Saldo bruto retido na plataforma (aguardando atingir valor m├¡nimo de saque). */
  platformBalance?: number;
  reservedForExpenses?: number;
  reservedForReinvestment?: number;
  dynamicBufferPercentage?: number; // % de buffer din├ómico calculado para o dia
  suggestedProtectionToday?: number; // R$ sugerido para guardar/resguardar hoje
  totalProtectedAccumulated?: number; // R$ total acumulado resguardado fora de risco
  riskExposureLevel?: 'low' | 'moderate' | 'high'; // N├¡vel de risco da carteira
  protectionTip?: string; // Recomenda├º├úo contextual do algoritmo
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
  /** Indica se esta data ├® o marco/ponto de in├¡cio da proje├º├úo do roadmap. */
  isStartDate?: boolean;
  /** Indica se esta data corresponde ao dia civil atual. */
  isToday?: boolean;
  /** Indica se este dia est├í dentro do per├¡odo de otimiza├º├úo de produtos p├│s-meta */
  isOptimizationPhase?: boolean;
  /** Indica se neste dia a carteira j├í alcan├ºou o n├║mero m├¡nimo de contratos otimizados */
  isOptimizedState?: boolean;
}

export interface PortfolioRoadmapPoint {
  day: number;
  date: string;
  dateFormatted: string;
  dailyYield: number; // R$/dia bruto
  dailyYieldNet: number; // R$/dia l├¡quido (p├│s taxa)
  accumulatedYield: number; // R$ acumulado at├® esta data
  capitalReturnedToday: number;
  expensesDeductedToday: number;
  reinvestedToday: number;
  newInvestmentsToday?: number;
  activeContractsCount: number;
  activeInvestedAmount: number;
  targetYield: number; // Meta di├íria configurada
  dynamicBufferPercentage?: number;
  suggestedProtectionToday?: number;
  totalProtectedAccumulated?: number;
  isProtectionPoint?: boolean;
  isGoalReached?: boolean;
  /** Indica se este dia est├í dentro do per├¡odo de otimiza├º├úo p├│s-meta */
  isOptimizationPhase?: boolean;
  /** Indica se neste dia a carteira j├í alcan├ºou o n├║mero m├¡nimo de produtos */
  isOptimizedState?: boolean;
  /** Indica se este ponto representa o Ponto de In├¡cio da proje├º├úo. */
  isStartDate?: boolean;
  /** Indica o dia civil atual, para separar o presente da proje├º├úo futura. */
  isToday?: boolean;
  /** Caixa l├¡quido seguro na conta banc├íria ao fim do dia. */
  bankBalance?: number;
  /** Saldo bruto retido na plataforma ao fim do dia (aguardando saque m├¡nimo). */
  platformBalance?: number;
  /** Caixa livre ao fim do dia (espelho de bankBalance). */
  cashBalance?: number;
}

/** Despesa que a proje├º├úo de caixa n├úo consegue cobrir dentro do prazo. */
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
  /** Se o per├¡odo de otimiza├º├úo foi ativado / iniciado ap├│s a meta */
  isOptimizationActive: boolean;
  /** Se a carteira j├í atingiu o estado m├¡nimo otimizado */
  isOptimized: boolean;
  /** Dia da simula├º├úo em que a meta foi batida e a otimiza├º├úo come├ºou */
  startDay: number | null;
  startDateFormatted: string | null;
  /** Dia da simula├º├úo em que a carteira atingiu o n├║mero m├¡nimo de produtos */
  completionDay: number | null;
  completionDateFormatted: string | null;
  /** Quantidade de produtos/contratos ativos no momento em que a meta foi atingida */
  initialContractsAtGoal: number;
  /** Quantidade m├¡nima necess├íria de produtos para sustentar a meta */
  minPossibleContracts: number;
  /** Quantidade final de produtos ap├│s a consolida├º├úo */
  optimizedContractsCount: number;
  /** Quantidade de produtos reduzidos/eliminados */
  contractsReduced: number;
  /** Percentual de redu├º├úo na quantidade de produtos ativos */
  reductionPercentage: number;
  /** Dura├º├úo em dias do per├¡odo de consolida├º├úo/otimiza├º├úo */
  durationDays: number;
  /** Descri├º├úo amig├ível do status da otimiza├º├úo */
  statusDescription: string;
}

export interface PortfolioRoadmapSummary {
  currentDailyYield: number;
  targetDailyYield: number;
  percentOfGoalReached: number;
  /** True somente se a meta j├í foi atingida em data igual ou anterior a hoje. */
  isGoalReached: boolean;
  /** Data em que a meta foi batida, quando j├í ocorreu. */
  goalReachedOn: string | null;
  /** Dias de hoje at├® a meta. 0 quando j├í foi atingida. */
  daysToGoal: number | null;
  /** Dia da simula├º├úo (a partir do in├¡cio do ciclo) em que a meta ├® batida. */
  daysToGoalFromCycleStart: number | null;
  estimatedGoalDate: string | null;
  estimatedGoalDateFormatted: string | null;
  totalReinvested: number;
  totalNewInvestments: number;
  totalExpensesDeducted: number;
  /** Soma dos rendimentos brutos. N├âO inclui devolu├º├úo de principal. */
  totalProjectedGrossYield: number;
  /** Rendimento bruto menos as taxas de saque efetivamente pagas. */
  totalProjectedNetProfit: number;
  /** Principal devolvido no vencimento dos contratos. */
  totalCapitalReturned: number;
  /** Taxas de saque pagas ao longo da proje├º├úo. */
  totalWithdrawalFeesPaid: number;
  totalCapitalToReturn: number;
  activeProductsCount: number;
  maxDailyYield: number;
  /** Saldo l├¡quido final em banco na conclus├úo do horizonte simulado. */
  finalBankBalance?: number;
  /** Saldo bruto final na plataforma na conclus├úo do horizonte simulado. */
  finalPlatformBalance?: number;
  totalProtectedAmountSuggested?: number; // Total sugerido para manter guardado/sacado em seguran├ºa
  protectionCheckpointsCount?: number; // Quantidade de pontos de prote├º├úo identificados
  dynamicBufferAvg?: number; // M├®dia ponderada do buffer din├ómico durante a proje├º├úo
  initialCapitalSecuredPercent?: number; // % do capital inicial que ├® blindado ao longo da simula├º├úo
  protectionSummaryTip?: string; // Dica resumo da estrat├®gia de mitiga├º├úo de risco
  /** Resumo completo do per├¡odo de otimiza├º├úo e consolida├º├úo de produtos p├│s-meta */
  optimizationSummary?: PortfolioOptimizationSummary;
  /** Despesas que a proje├º├úo n├úo consegue cobrir. Lista vazia ├® o caso normal. */
  unfundableExpenses: UnfundableExpense[];
  /** Data base (Dia 0) a partir da qual o roadmap simula o crescimento. */
  baseStartDate?: string;
  /** True se o usu├írio fixou um ponto de in├¡cio customizado para o ciclo. */
  isCustomStartPoint?: boolean;
  reinvestmentUnitUsed: {
    name: string;
    price: number;
    dailyPercentage: number;
    durationDays: number;
    returnCapitalAtEnd: boolean;
  };
  /** Novos produtos/cotas projetados para aquisi├º├úo ao longo do ciclo at├® atingir a meta */
  projectedAcquisitions: ProjectedAcquisitionItem[];
  /** Novos produtos agrupados por modelo com total de cotas e dias previstos */
  projectedAcquisitionsGrouped: ProjectedAcquisitionGroup[];
  /** Quantidade total de cotas que ser├úo necess├írias adquirir ao longo do ciclo */
  totalProjectedAcquisitionsCount: number;
  /** Valor total em R$ necess├írio para adquirir todas as cotas projetadas */
  totalProjectedAcquisitionsAmount: number;
  chartData: PortfolioRoadmapPoint[];
  milestones: PortfolioMilestone[];
  /**
   * Reconstr├│i os detalhes de um dia sob demanda. Mantido fora de `chartData`
   * para n├úo reter o hist├│rico inteiro em cada ponto do gr├ífico.
   */
  getDayDetails: (day: number) => RoadmapPointDetails | null;
}

export interface ReinvestmentOption {
  id: string;
  name: string;
  price: number; // Valor do aporte (ex: 50.00)
  dailyPercentage: number; // % ao dia (ex: 2.5)
  durationDays: number; // Dias de dura├º├úo (ex: 30)
  returnCapitalAtEnd: boolean;
}

export interface RoadmapMilestone {
  dayNumber: number; // 1, 2, 3...
  date: string; // YYYY-MM-DD
  dateFormatted: string; // DD/MM/AAAA
  accumulatedBalanceBefore: number;
  dailyYieldGenerated: number;
  dailyYieldNetAfterFee: number; // Rendimento di├írio ap├│s dedu├º├úo da taxa de saque da plataforma
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
