import React, { useState } from 'react';
import { Target, CheckCircle2, Edit3, Sparkles } from 'lucide-react';
import { PlatformSettings } from '../types/investment';
import { formatCurrency , formatPercentBR } from '../utils/calculations';

interface GoalBannerProps {
  currentDailyYield: number;
  settings: PlatformSettings;
  onUpdateGoal: (newGoal: number) => void;
  weightedAvgDailyRate: number; // Taxa média ponderada da carteira em %
}

export const GoalBanner: React.FC<GoalBannerProps> = ({
  currentDailyYield,
  settings,
  onUpdateGoal,
  weightedAvgDailyRate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempGoal, setTempGoal] = useState(settings.dailyGoalAmount.toString());

  const goal = settings.dailyGoalAmount;
  const progressPercent = goal > 0 ? Math.min(100, (currentDailyYield / goal) * 100) : 0;
  const gap = goal - currentDailyYield;
  const isGoalReached = currentDailyYield >= goal;

  // Capital estimado necessário para fechar o GAP de rendimento diário
  const effectiveRate = weightedAvgDailyRate > 0 ? weightedAvgDailyRate : 2.5;
  const estimatedCapitalNeededForGoal = gap > 0 ? gap / (effectiveRate / 100) : 0;

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(tempGoal);
    if (!isNaN(val) && val > 0) {
      onUpdateGoal(val);
      setIsEditing(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl p-5 sm:p-6 shadow-xl border border-slate-700/50 relative overflow-hidden mb-6">
      {/* Subtle background glow effect */}
      <div className="absolute -right-12 -top-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left Side: Goal Info & Current Status */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
              <Target className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold tracking-wider text-emerald-400">
              Meta de rendimento diário
            </span>

            {/* Quick Edit Goal Button */}
            {!isEditing && (
              <button
                onClick={() => {
                  setTempGoal(goal.toString());
                  setIsEditing(true);
                }}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors ml-2"
                title="Editar valor da meta"
              >
                <Edit3 className="h-3 w-3" />
                <span>Ajustar</span>
              </button>
            )}
          </div>

          {/* Value Display or Inline Edit Form */}
          {isEditing ? (
            <form onSubmit={handleSaveGoal} className="flex items-center gap-2 mt-2 mb-3">
              <span className="text-xl font-bold text-white">R$</span>
              <input
                type="number"
                step="0.01"
                min="1"
                placeholder="150"
                value={tempGoal}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setTempGoal(e.target.value)}
                className="w-36 px-3 py-1.5 rounded-lg bg-slate-800 text-white border border-emerald-500 focus:outline-hidden text-lg font-bold"
                autoFocus
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg"
              >
                Salvar
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-lg"
              >
                Cancelar
              </button>
            </form>
          ) : (
            <div className="flex flex-wrap items-baseline gap-3 mb-2">
              <span className="text-3xl sm:text-4xl font-extrabold tracking-tight font-display text-white">
                {formatCurrency(currentDailyYield)}
              </span>
              <span className="text-slate-400 text-sm font-medium">
                de <strong className="text-white">{formatCurrency(goal)}</strong> por dia
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                isGoalReached 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}>
                {formatPercentBR(progressPercent)} atingido
              </span>
            </div>
          )}

          {/* Progress Bar */}
          <div className="w-full bg-slate-700/60 rounded-full h-3 overflow-hidden p-0.5 border border-slate-600/40 mb-3">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                isGoalReached
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-md shadow-emerald-500/50'
                  : 'bg-gradient-to-r from-amber-500 to-emerald-400'
              }`}
              style={{ width: `${Math.max(4, Math.min(100, progressPercent))}%` }}
            />
          </div>

          {/* Smart Insights & Next Steps */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
            {isGoalReached ? (
              <div className="flex items-center gap-1.5 text-emerald-300 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                <span>Meta diária atingida! Rendimento projetado de <strong>{formatCurrency(currentDailyYield * 30)}/mês</strong>.</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-slate-300">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <span>
                  Faltam <strong>{formatCurrency(gap)}/dia</strong>. Aporte sugerido de ~<strong>{formatCurrency(estimatedCapitalNeededForGoal)}</strong> na taxa média de {formatPercentBR(effectiveRate, 2)} ao dia.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Monthly Projection Card */}
        <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/80 flex flex-col justify-center min-w-[200px] shrink-0">
          <span className="text-xs text-slate-400 font-medium">Projeção Mensal (30 dias)</span>
          <div className="text-xl font-bold text-emerald-400 font-display mt-0.5">
            {formatCurrency(currentDailyYield * 30)}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-700/60 pt-2">
            <span>Meta Mensal:</span>
            <span className="text-slate-200 font-semibold">{formatCurrency(goal * 30)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
