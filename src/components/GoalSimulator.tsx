import React, { useState } from 'react';
import { 
  Calculator, 
  Sparkles, 
  PlusCircle
} from 'lucide-react';
import { InvestmentProduct, PlatformSettings } from '../types/investment';
import { formatCurrency, formatPercent, normalizeSettings } from '../utils/calculations';

interface GoalSimulatorProps {
  currentDailyYield: number;
  settings: PlatformSettings;
  onApplyNewGoal: (goal: number) => void;
  onQuickCreateProduct: (product: Partial<InvestmentProduct>) => void;
}

export const GoalSimulator: React.FC<GoalSimulatorProps> = ({
  currentDailyYield,
  settings,
  onApplyNewGoal,
  onQuickCreateProduct,
}) => {
  const [targetDailyYield, setTargetDailyYield] = useState<number>(settings.dailyGoalAmount);
  const [simulationDailyRate, setSimulationDailyRate] = useState<number>(2.5); // % ao dia
  const [simulationDuration, setSimulationDuration] = useState<number>(30); // dias
  const [returnCapital, setReturnCapital] = useState<boolean>(true);

  // Cálculos do simulador
  // Rendimento Diário Desejado = Investimento * (Taxa / 100)
  // Investimento Necessário = Rendimento Diário Desejado / (Taxa / 100)
  const rateFraction = simulationDailyRate > 0 ? simulationDailyRate / 100 : 0.025;
  const totalCapitalNeededForTarget = targetDailyYield > 0 ? targetDailyYield / rateFraction : 0;

  // Quanto falta além do rendimento que o usuário já tem
  const additionalDailyYieldNeeded = Math.max(0, targetDailyYield - currentDailyYield);
  const additionalCapitalNeeded = additionalDailyYieldNeeded > 0 ? additionalDailyYieldNeeded / rateFraction : 0;

  // Projeção do ciclo simulado
  const totalGrossCycleYield = targetDailyYield * simulationDuration;
  const feeRate = normalizeSettings(settings).withdrawalFeePercentage / 100;

  // Simulação de Juros Compostos (se reinvestir o rendimento todo dia por 30 dias)
  // FV = P * (1 + r)^t
  const compoundYield30d = totalCapitalNeededForTarget * (Math.pow(1 + rateFraction, 30) - 1);
  const compoundDailyYieldAtDay30 = totalCapitalNeededForTarget * Math.pow(1 + rateFraction, 30) * rateFraction;

  const handleCreateSimulatedProduct = () => {
    onQuickCreateProduct({
      name: `Meta ${formatCurrency(targetDailyYield)}/dia (${simulationDailyRate}%)`,
      investedAmount: Math.round(additionalCapitalNeeded > 0 ? additionalCapitalNeeded : totalCapitalNeededForTarget),
      dailyPercentage: simulationDailyRate,
      durationDays: simulationDuration,
      returnCapitalAtEnd: returnCapital,
      category: 'Simulação de Meta',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-xl border border-emerald-100 dark:border-emerald-900/60">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-display text-slate-900 dark:text-slate-100">
              Simulador de meta & planejamento de aportes
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Calcule quanto capital você precisa alocar para atingir a meta diária pretendida na sua plataforma
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Column (1 Col) */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-5">
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3">
            Parâmetros da sua meta
          </h3>

          {/* Meta Diária Desejada */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 tracking-normal mb-1">
              Meta de rendimento diário (R$)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400 dark:text-slate-500">R$</span>
              <input
                type="number"
                step="1"
                min="1"
                placeholder="150"
                value={targetDailyYield === 0 ? '' : targetDailyYield}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const val = e.target.value;
                  setTargetDailyYield(val === '' ? 0 : parseFloat(val));
                }}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              />
            </div>
            <div className="flex items-center gap-2 mt-2">
              {[50, 100, 200, 500].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTargetDailyYield(preset)}
                  className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                    targetDailyYield === preset
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  R$ {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Taxa Diária Oferecida pela Plataforma */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 tracking-normal mb-1">
              Taxa de retorno diário da plataforma (%)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="50"
                placeholder="2.5"
                value={simulationDailyRate === 0 ? '' : simulationDailyRate}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const val = e.target.value;
                  setSimulationDailyRate(val === '' ? 0 : parseFloat(val));
                }}
                className="w-full pl-3 pr-8 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              />
              <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 dark:text-slate-500">%</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              {[1.5, 2.0, 2.5, 3.0, 3.5].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setSimulationDailyRate(rate)}
                  className={`text-xs px-2 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                    simulationDailyRate === rate
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {rate}%
                </button>
              ))}
            </div>
          </div>

          {/* Duração em Dias */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 tracking-normal mb-1">
              Duração do contrato (Dias)
            </label>
            <input
              type="number"
              min="1"
              max="365"
              placeholder="30"
              value={simulationDuration === 0 ? '' : simulationDuration}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const val = e.target.value;
                setSimulationDuration(val === '' ? 0 : parseInt(val) || 1);
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          {/* Devolução de Capital */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Devolução de Capital no Fim?
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={returnCapital}
                onChange={(e) => setReturnCapital(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-300 dark:bg-slate-600 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <button
            onClick={() => onApplyNewGoal(targetDailyYield)}
            className="w-full py-2.5 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            Definir como meta principal do app
          </button>
        </div>

        {/* Results & Calculations Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Main Result Card */}
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 dark:from-emerald-700 dark:to-teal-850 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
            <span className="text-xs font-bold tracking-normal text-emerald-200 block mb-1">
              Capital necessário para a meta
            </span>

            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 mb-4">
              <div>
                <div className="text-3xl sm:text-4xl font-extrabold font-display">
                  {formatCurrency(totalCapitalNeededForTarget)}
                </div>
                <p className="text-xs text-emerald-100 mt-1">
                  investidos a <strong>{simulationDailyRate}%/dia</strong> geram exatamente{' '}
                  <strong>{formatCurrency(targetDailyYield)}</strong> todos os dias.
                </p>
              </div>

              {/* Complementary Aporte if user already has active products */}
              {currentDailyYield > 0 && additionalDailyYieldNeeded > 0 && (
                <div className="bg-white/15 dark:bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/20 text-xs">
                  <span className="text-emerald-200 block font-medium">Aporte Adicional Faltante:</span>
                  <div className="text-lg font-bold text-white mt-0.5">
                    +{formatCurrency(additionalCapitalNeeded)}
                  </div>
                  <span className="text-[11px] text-emerald-100 block">
                    (Você já tem {formatCurrency(currentDailyYield)}/dia ativo)
                  </span>
                </div>
              )}
            </div>

            {/* Quick Action: Create Product */}
            <div className="pt-4 border-t border-emerald-500/40 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-emerald-100">
                Gostou dessa projeção? Crie o produto com estes valores diretamente.
              </span>
              <button
                onClick={handleCreateSimulatedProduct}
                className="px-4 py-2 bg-white text-emerald-800 hover:bg-emerald-50 font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Adicionar Este Investimento</span>
              </button>
            </div>
          </div>

          {/* Breakdown Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-normal block">
                Rendimento em 30 dias
              </span>
              <div className="text-xl font-bold font-display text-emerald-600 dark:text-emerald-400 mt-1">
                +{formatCurrency(targetDailyYield * 30)}
              </div>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                Líquido aprox: {formatCurrency(targetDailyYield * 30 * (1 - feeRate))}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-normal block">
                Retorno Total no Ciclo ({simulationDuration}d)
              </span>
              <div className="text-xl font-bold font-display text-blue-700 dark:text-blue-400 mt-1">
                {formatCurrency(totalGrossCycleYield)}
              </div>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                Taxa de saque deduzirá: {formatCurrency(totalGrossCycleYield * feeRate)}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-normal block">
                Payback (Retorno do aporte)
              </span>
              <div className="text-xl font-bold font-display text-slate-900 dark:text-slate-100 mt-1">
                {simulationDailyRate > 0 ? Math.ceil(100 / simulationDailyRate) : 0} dias
              </div>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                Tempo para reaver 100% do aporte
              </span>
            </div>
          </div>

          {/* Reinvestment / Compound Power Card */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500 dark:text-amber-400" />
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Poder do reinvestimento diário (Juros compostos)
              </h4>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Se em vez de sacar diariamente você reinvestir seus ganhos todo dia na mesma taxa de {simulationDailyRate}%:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded-lg border border-amber-100 dark:border-amber-900/50">
                <span className="text-xs text-amber-800 dark:text-amber-300 font-semibold block">
                  Em 30 dias de reinvestimento:
                </span>
                <div className="text-lg font-bold text-amber-900 dark:text-amber-200 font-display mt-0.5">
                  +{formatCurrency(compoundYield30d)} acumulados
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  vs. {formatCurrency(targetDailyYield * 30)} no saque simples
                </span>
              </div>

              <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-lg border border-emerald-100 dark:border-emerald-900/50">
                <span className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold block">
                  Rendimento diário no dia 30:
                </span>
                <div className="text-lg font-bold text-emerald-800 dark:text-emerald-300 font-display mt-0.5">
                  +{formatCurrency(compoundDailyYieldAtDay30)}/dia
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {targetDailyYield > 0
                    ? `${formatPercent(((compoundDailyYieldAtDay30 - targetDailyYield) / targetDailyYield) * 100)} de crescimento`
                    : 'Crescimento calculado'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
