import React, { useState, useEffect } from 'react';
import { 
  X, 
  Wallet,
  Calendar, 
  CheckCircle2, 
  Clock, 
  Layers, 
  Archive, 
  ShieldCheck, 
  Target, 
  Receipt, 
  AlertTriangle, 
  PlusCircle, 
  Info,
  Flag,
  RotateCcw,
  Sparkles,
  CalendarClock,
  Undo2,
} from 'lucide-react';
import { RoadmapPointDetails, PlatformSettings, ManualCashMovement } from '../types/investment';
import { formatCurrency, formatNumberBR } from '../utils/calculations';
import { useModal } from '../hooks/useModal';

interface RoadmapDayDetailsModalProps {
  details: RoadmapPointDetails | null;
  onClose: () => void;
  targetDailyYield: number;
  settings?: PlatformSettings;
  onSetAsStartDate?: (date: string) => void;
  onClearStartDate?: () => void;
  isStartDate?: boolean;
  isDayCompleted?: boolean;
  onCompleteDay?: (details: RoadmapPointDetails) => void;
  onUndoCompleteDay?: (date: string) => void;
  /** Lançamentos manuais do dia, para exibir na seção de saldo. */
  movementsForDay?: ManualCashMovement[];
  /** Adiciona um lançamento (delta) neste dia do Roadmap. */
  onAddMovement?: (date: string, delta: { bank: number; protection: number; note?: string }) => void;
  /** Remove um lançamento já registrado. */
  onRemoveMovement?: (movementId: string) => void;
  /** True quando as compras deste dia foram adiadas pelo usuário. */
  isAcquisitionDeferred?: boolean;
  /**
   * Alterna o adiamento das compras deste dia. Com o adiamento ativo, o dia
   * pode ser concluído normalmente (despesas pagas, data registrada) mas
   * nenhuma cota é comprada — o caixa acumula e o dia seguinte reotimiza.
   */
  onToggleDeferAcquisitions?: (date: string, deferred: boolean) => void;
}

export const RoadmapDayDetailsModal: React.FC<RoadmapDayDetailsModalProps> = ({
  details,
  onClose,
  targetDailyYield,
  settings,
  onSetAsStartDate,
  onClearStartDate,
  isStartDate,
  isDayCompleted,
  onCompleteDay,
  onUndoCompleteDay,
  movementsForDay,
  onAddMovement,
  onRemoveMovement,
  isAcquisitionDeferred,
  onToggleDeferAcquisitions,
}) => {
  type TabId = 'acquisitions' | 'active' | 'expenses' | 'expired';

  const todayAcquisitions = details?.acquisitionsToday ?? details?.newPurchasesToday ?? [];

  const pickInitialTab = (d: RoadmapPointDetails | null): TabId => {
    if (!d) return 'active';
    const acqs = d.acquisitionsToday?.length ?? d.newPurchasesToday?.length ?? 0;
    if (acqs > 0) return 'acquisitions';
    if (d.expensesTodayList.length > 0) return 'expenses';
    return 'active';
  };

  const [activeTab, setActiveTab] = useState<TabId>(() => pickInitialTab(details));
  const dialogRef = useModal(Boolean(details), onClose);

  // Estado local do formulário de lançamento manual de saldo.
  const [movementSign, setMovementSign] = useState<1 | -1>(1);
  const [movementAmount, setMovementAmount] = useState<string>('');
  const [movementProtection, setMovementProtection] = useState<string>('');
  const [movementNote, setMovementNote] = useState<string>('');

  // Zera o formulário ao trocar de dia, para o valor de um dia não vazar no outro.
  useEffect(() => {
    setMovementAmount('');
    setMovementProtection('');
    setMovementNote('');
    setMovementSign(1);
  }, [details?.date]);

  /**
   * CORREÇÃO: o modal fica montado permanentemente, então o inicializador do
   * `useState` só rodava uma vez — com `details` ainda nulo — e sempre caía em
   * 'active'. Pior: a aba "Gastos" some quando o dia não tem despesas, o que
   * deixava o corpo do modal vazio ao reabrir em outro dia.
   */
  useEffect(() => {
    if (details) setActiveTab(pickInitialTab(details));
    // A aba é reancorada a cada dia aberto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [details?.day, details?.date]);

  if (!details) return null;

  const isGoalReached = details.dailyYield >= targetDailyYield && targetDailyYield > 0;
  const remainingToGoal = Math.max(0, targetDailyYield - details.dailyYield);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-3 sm:p-4 overflow-hidden">
      <div
        ref={dialogRef}
        className="bg-slate-900 text-slate-100 rounded-2xl max-w-3xl w-full max-h-[90vh] shadow-2xl border border-slate-800 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="roadmap-day-title"
      >
        {/* Header - Fixed */}
        <div className="flex items-start justify-between border-b border-slate-800 px-4 py-3 sm:px-6 sm:py-3.5 bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-950/60 text-emerald-400 rounded-xl shrink-0 border border-emerald-900/60">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id="roadmap-day-title" className="text-sm sm:text-base font-bold text-slate-100 font-display">
                  Visão Geral do Roadmap — {details.dateFormatted}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-slate-800 text-slate-200 border border-slate-700">
                  Dia {details.day}
                </span>
                {details.isToday && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-extrabold bg-cyan-950/80 text-cyan-300 border border-cyan-800">
                    Hoje
                  </span>
                )}
                {isStartDate && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                    <Flag className="h-3 w-3 fill-emerald-400 text-emerald-400" />
                    Ponto de Início
                  </span>
                )}
                {details.isOptimizedState ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-950 text-indigo-200 border border-indigo-800">
                    <Sparkles className="h-3 w-3 text-indigo-400" />
                    Carteira Otimizada (Mínima)
                  </span>
                ) : details.isOptimizationPhase ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-950/60 text-indigo-300 border border-indigo-800">
                    <Sparkles className="h-3 w-3 text-indigo-400" />
                    Período de Otimização Pós-Meta
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isStartDate || details.day === 0 
                  ? 'Ponto inicial da simulação da meta (períodos anteriores descartados)' 
                  : `Projeção acumulada após ${details.day} dias de reinvestimento contínuo`}
              </p>
              <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                {isStartDate ? (
                  onClearStartDate && (
                    <button
                      type="button"
                      onClick={() => {
                        onClearStartDate();
                        onClose();
                      }}
                      className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 transition-colors shadow-2xs cursor-pointer"
                      title="Restaurar ponto de partida automático baseado no primeiro produto ativo"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Remover Ponto de Início (Automático)</span>
                    </button>
                  )
                ) : (
                  onSetAsStartDate && (
                    <button
                      type="button"
                      onClick={() => {
                        onSetAsStartDate(details.date);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xs transition-all cursor-pointer"
                      title="Descarta a influência dos dias anteriores no alcance da meta e projeta o roadmap a partir desta data"
                    >
                      <Flag className="h-3 w-3" />
                      <span>Marcar como Ponto de Início</span>
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Fechar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-5 space-y-3.5">
          {/* Banner de Ações do Dia / Marcar como Concluído */}
          <div className={`p-3.5 rounded-xl border transition-all ${
            isDayCompleted
              ? 'bg-emerald-950/30 border-emerald-800/80 shadow-2xs'
              : todayAcquisitions.length > 0 || details.expensesTodayList.length > 0
              ? 'bg-slate-900/90 border-emerald-800/50 shadow-sm'
              : 'bg-slate-900/70 border-slate-800 shadow-2xs'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className={`p-2 rounded-lg shrink-0 mt-0.5 border ${
                  isDayCompleted
                    ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800'
                    : todayAcquisitions.length > 0 || details.expensesTodayList.length > 0
                    ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/70'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}>
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-100">
                      {isDayCompleted ? 'Dia Marcado como Concluído' : 'Ações Planejadas para este Dia'}
                    </span>
                    {isDayCompleted ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full">
                        ✓ Concluído
                      </span>
                    ) : (todayAcquisitions.length > 0 || details.expensesTodayList.length > 0) ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-950/60 text-amber-300 border border-amber-800 px-2 py-0.5 rounded-full">
                        <Clock className="h-3 w-3" /> Ações Pendentes
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full">
                        Rendimento em Acúmulo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {isDayCompleted ? (
                      <>As ações deste dia foram efetuadas: despesas marcadas como pagas e novos produtos integrados à sua carteira ativa.</>
                    ) : (
                      <>
                        {todayAcquisitions.length > 0 && details.expensesTodayList.length > 0 ? (
                          <>Ao marcar o dia como concluído, <strong>{details.expensesTodayList.length} despesa(s)</strong> serão marcadas como pagas e <strong>{todayAcquisitions.length} novo(s) produto(s)</strong> serão adicionados aos seus produtos ativos.</>
                        ) : todayAcquisitions.length > 0 ? (
                          <>Ao marcar o dia como concluído, <strong>{todayAcquisitions.length} novo(s) produto(s)</strong> serão integrados à sua carteira de investimentos.</>
                        ) : details.expensesTodayList.length > 0 ? (
                          <>Ao marcar o dia como concluído, <strong>{details.expensesTodayList.length} despesa(s)</strong> serão marcadas como pagas.</>
                        ) : (
                          <>Marque este dia como concluído para manter o acompanhamento histórico do seu plano em dia.</>
                        )}
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {isDayCompleted ? (
                  onUndoCompleteDay && (
                    <button
                      type="button"
                      onClick={() => onUndoCompleteDay(details.date)}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors shadow-2xs cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Desfazer Conclusão</span>
                    </button>
                  )
                ) : (
                  onCompleteDay && (
                    <button
                      type="button"
                      onClick={() => onCompleteDay(details)}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white shadow-xs transition-all cursor-pointer whitespace-nowrap"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Marcar Concluído</span>
                    </button>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Adiamento das compras deste dia */}
          {details && onToggleDeferAcquisitions && (
            <div className={`p-3.5 rounded-xl border transition-all ${
              isAcquisitionDeferred
                ? 'bg-amber-950/30 border-amber-800/70 shadow-2xs'
                : 'bg-slate-900/70 border-slate-800 shadow-2xs'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className={`p-2 rounded-lg shrink-0 mt-0.5 border ${
                    isAcquisitionDeferred
                      ? 'bg-amber-950/70 text-amber-300 border-amber-800'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}>
                    <CalendarClock className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-100">
                        Compras deste dia
                      </span>
                      {isAcquisitionDeferred ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-950/70 text-amber-300 border border-amber-800 px-2 py-0.5 rounded-full">
                          Adiadas
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full">
                          Compra prevista
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {isAcquisitionDeferred
                        ? 'Nenhuma cota será comprada neste dia. O dinheiro continua no caixa e chega somado ao dia seguinte, onde a alocação é recalculada.'
                        : 'Adie para não comprar hoje — útil quando você prefere manter o mesmo horário de compra todos os dias. As despesas deste dia continuam sendo pagas normalmente.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onToggleDeferAcquisitions(details.date, !isAcquisitionDeferred)}
                  className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold transition-all shrink-0 self-end sm:self-center cursor-pointer whitespace-nowrap ${
                    isAcquisitionDeferred
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      : 'bg-amber-600 hover:bg-amber-500 text-white shadow-xs'
                  }`}
                >
                  {isAcquisitionDeferred ? (
                    <>
                      <Undo2 className="h-3.5 w-3.5" />
                      <span>Cancelar adiamento</span>
                    </>
                  ) : (
                    <>
                      <CalendarClock className="h-3.5 w-3.5" />
                      <span>Adiar compras hoje</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Lançamento manual de saldo DESTE dia (delta acumulativo) */}
          {details && onAddMovement && (
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/70 shadow-2xs space-y-3">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-lg shrink-0 mt-0.5 border bg-slate-800 text-slate-300 border-slate-700">
                  <Wallet className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-100">Saldo manual deste dia</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full">
                      {details.dateFormatted}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Registre aqui o dinheiro que entrou ou saiu da sua conta neste dia, por fora do fluxo de
                    rendimentos. O valor é somado ao caixa e continua valendo nos dias seguintes. Use
                    Retirada para valores negativos.
                  </p>
                </div>
              </div>

              {movementsForDay && movementsForDay.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {movementsForDay.map((mv) => (
                    <div
                      key={mv.id}
                      className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`font-bold shrink-0 ${mv.bank >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {mv.bank >= 0 ? '+' : '−'}{formatCurrency(Math.abs(mv.bank))}
                        </span>
                        {mv.protection ? (
                          <span className="text-blue-300 shrink-0">· blindagem {formatCurrency(mv.protection)}</span>
                        ) : null}
                        {mv.note ? <span className="text-slate-400 truncate">· {mv.note}</span> : null}
                      </div>
                      {onRemoveMovement && (
                        <button
                          type="button"
                          onClick={() => onRemoveMovement(mv.id)}
                          className="text-slate-500 hover:text-rose-400 transition-colors shrink-0 p-0.5 rounded cursor-pointer"
                          title="Remover este lançamento"
                          aria-label={`Remover lançamento de ${formatCurrency(mv.bank)}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const amount = Number(String(movementAmount).replace(',', '.'));
                  if (!Number.isFinite(amount) || amount <= 0) return;
                  onAddMovement(details.date, {
                    bank: movementSign * amount,
                    protection: Math.max(0, Number(String(movementProtection).replace(',', '.')) || 0),
                    note: movementNote.trim() || undefined,
                  });
                  setMovementAmount('');
                  setMovementProtection('');
                  setMovementNote('');
                }}
                className="space-y-2.5 pt-1 border-t border-slate-800"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Tipo</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setMovementSign(1)}
                        className={`h-9 rounded-lg text-xs font-bold transition-all cursor-pointer ${movementSign === 1 ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'}`}
                      >
                        + Entrada
                      </button>
                      <button
                        type="button"
                        onClick={() => setMovementSign(-1)}
                        className={`h-9 rounded-lg text-xs font-bold transition-all cursor-pointer ${movementSign === -1 ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'}`}
                      >
                        − Retirada
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Valor (R$)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">R$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={movementAmount}
                        onChange={(e) => setMovementAmount(e.target.value)}
                        className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-700 bg-slate-950 text-slate-100 text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Para blindagem (opcional)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">R$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={movementProtection}
                        onChange={(e) => setMovementProtection(e.target.value)}
                        className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-700 bg-slate-950 text-slate-100 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-end gap-2.5">
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Anotação (opcional)</label>
                    <input
                      type="text"
                      maxLength={200}
                      placeholder="Ex: aporte da reserva, retirada para conta pessoal..."
                      value={movementNote}
                      onChange={(e) => setMovementNote(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-slate-700 bg-slate-950 text-slate-100 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!(Number(String(movementAmount).replace(',', '.')) > 0)}
                    className="h-9 px-4 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>Registrar neste dia</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Pagamento previsto para hoje: é uma pendência, não uma baixa financeira. */}
          {!isDayCompleted && details.expensesTodayList.length > 0 && details.expensesDeductedToday <= 0 && (
            <div className="p-3 bg-orange-950/30 border border-orange-900/70 rounded-xl flex items-start gap-2.5 text-xs text-orange-200 shadow-2xs">
              <Clock className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-orange-200">Pagamento previsto / pendente neste dia</span>
                  <span className="font-extrabold text-orange-300">
                    {formatCurrency(details.expensesTodayList.reduce((sum, e) => sum + e.amount, 0))}
                  </span>
                </div>
                <p className="text-orange-300/90 mt-1 leading-relaxed">
                  Esta é a data recomendada para a quitação. A dívida só será marcada como paga e retirada do fluxo quando você <strong>marcar o dia como concluído</strong>. Se o dia for perdido, o Roadmap recalculará a próxima data a partir do novo dia atual.
                </p>
              </div>
            </div>
          )}

          {/* Goal Status Strip */}
          <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
            isGoalReached 
              ? 'bg-emerald-950/30 border-emerald-800 text-emerald-200' 
              : 'bg-slate-900/80 border-slate-800 text-slate-200'
          }`}>
            <div className="flex items-center gap-2.5">
              {isGoalReached ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              ) : (
                <Target className="h-4 w-4 text-slate-400 shrink-0" />
              )}
              <div className="text-xs">
                {isGoalReached ? (
                  <span>
                    <strong className="text-emerald-300">Meta diária conquistada.</strong> Renda de {formatCurrency(details.dailyYield)}/dia superou a meta de {formatCurrency(targetDailyYield)}/dia.
                  </span>
                ) : (
                  <span>
                    <strong className="text-slate-200">Progresso da Meta:</strong> {details.progressPercent}% ({formatCurrency(details.dailyYield)} de {formatCurrency(targetDailyYield)}/dia). Falta <strong className="text-slate-100">{formatCurrency(remainingToGoal)}/dia</strong>.
                  </span>
                )}
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[11px] font-bold text-slate-400 block">Tempo decorrido</span>
              <span className="text-xs font-extrabold text-slate-200">{details.day} dias</span>
            </div>
          </div>

          {/* Optimization Phase Status Banner */}
          {(details.isOptimizationPhase || details.isOptimizedState) && (
            <div className="p-3 bg-indigo-950/30 border border-indigo-900/60 rounded-xl flex items-start gap-2.5 text-xs text-indigo-200 shadow-2xs">
              <Sparkles className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between font-bold flex-wrap gap-1">
                  <span className="text-xs text-indigo-100 font-bold">
                    {details.isOptimizedState ? 'Carteira Otimizada no Mínimo de Produtos' : 'Fase de Otimização & Consolidação de Produtos'}
                  </span>
                  <span className="text-indigo-300 font-extrabold text-xs">
                    {details.activeContractsCount} {details.activeContractsCount === 1 ? 'produto ativo' : 'produtos ativos'}
                  </span>
                </div>
                <p className="text-xs text-indigo-300/90 mt-1 leading-relaxed">
                  {details.isOptimizedState
                    ? 'A carteira atingiu a quantidade mínima e mais eficiente de produtos simultâneos para manter e sustentar a meta diária com simplicidade de gerenciamento.'
                    : 'Após o alcance da meta diária, os reinvestimentos priorizam produtos de maior capacidade unitária para gradualmente reduzir a quantidade de produtos ativos até o mínimo necessário.'}
                </p>
              </div>
            </div>
          )}

          {/* Unforeseen Expense / Withdrawal Notice on this day if any */}
          {details.expensesDeductedToday > 0 && (
            (() => {
              const totalToPay = details.expensesTodayList.length > 0
                ? details.expensesTodayList.reduce((acc, e) => acc + e.amount, 0)
                : details.expensesDeductedToday;
              const feeTotal = Math.max(0, details.expensesDeductedToday - totalToPay);

              return (
                <div className="p-3 bg-amber-950/30 border border-amber-900/60 rounded-xl flex items-start gap-2.5 text-xs text-amber-200 shadow-2xs">
                  <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between font-bold flex-wrap gap-1">
                      <span className="text-xs text-amber-200 font-bold">Pagamento de despesas neste dia</span>
                      <div className="text-right">
                        <span className="text-amber-200 font-extrabold text-xs block">
                          A Pagar: {formatCurrency(totalToPay)}
                        </span>
                        <span className="text-[11px] text-amber-300 font-semibold">
                          Saque em Caixa: -{formatCurrency(details.expensesDeductedToday)}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-amber-300/90 mt-1 leading-relaxed">
                      Valor a ser pago para a despesa: <strong>{formatCurrency(totalToPay)}</strong>.{' '}
                      {feeTotal > 0 ? (
                        <>Para liquidar esse valor, foi realizado o saque de <strong>{formatCurrency(details.expensesDeductedToday)}</strong> em caixa (sendo <strong>{formatCurrency(feeTotal)}</strong> de taxa retida pela plataforma).</>
                      ) : (details.expensesPaidFromBlindagemToday ?? 0) >= details.expensesDeductedToday ? (
                        <>Foi debitado <strong>{formatCurrency(details.expensesDeductedToday)}</strong> utilizando a reserva segura da blindagem acumulada, mantendo o saldo livre de reinvestimento intacto.</>
                      ) : (details.expensesPaidFromBlindagemToday ?? 0) > 0 ? (
                        <>Foi utilizado <strong>{formatCurrency(details.expensesPaidFromBlindagemToday ?? 0)}</strong> da blindagem acumulada e complementado com <strong>{formatCurrency(details.expensesPaidFromFreeBankToday ?? 0)}</strong> do saldo líquido no banco.</>
                      ) : (
                        <>Foi debitado <strong>{formatCurrency(details.expensesDeductedToday)}</strong> do saldo líquido no banco para a quitação da conta.</>
                      )}
                    </p>
                  </div>
                </div>
              );
            })()
          )}

          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {/* Renda Diária */}
            <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 shadow-2xs">
              <span className="text-xs font-medium text-slate-400 block">
                Renda diária
              </span>
              <div className="text-base font-bold text-emerald-400 font-display mt-0.5">
                {formatCurrency(details.dailyYield)}
              </div>
              <span className="text-[11px] text-slate-400 block font-medium">
                Líq: {formatCurrency(details.dailyYieldNet)}/dia
              </span>
            </div>

            {/* Capital Ativo */}
            <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 shadow-2xs">
              <span className="text-xs font-medium text-slate-400 block">
                Capital em custódia
              </span>
              <div className="text-base font-bold text-slate-100 font-display mt-0.5">
                {formatCurrency(details.activeInvestedAmount)}
              </div>
              <span className="text-[11px] text-slate-400 block font-medium">
                {details.activeContractsCount} produtos ativo(s)
              </span>
            </div>

            {/* Total Reinvestido */}
            <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 shadow-2xs">
              <span className="text-xs font-medium text-slate-400 block">
                Total reinvestido
              </span>
              <div className="text-base font-bold text-teal-400 font-display mt-0.5">
                {formatCurrency(details.totalReinvestedUpToDay)}
              </div>
              <span className="text-[11px] text-slate-400 block font-medium">
                {details.allReinvestmentsUpToDay.length} aportes
              </span>
            </div>

            {/* Saldo no Banco (Líquido) */}
            <div className="bg-slate-900/80 rounded-xl p-3 border border-emerald-900/60 shadow-2xs">
              <span className="text-xs font-medium text-emerald-300 flex items-center gap-1">
                <span>Saldo no banco</span>
                <span className="text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-800 px-1 rounded font-semibold">Líquido</span>
              </span>
              <div className="text-base font-bold font-display text-emerald-400 mt-0.5">
                {formatCurrency(details.bankBalance ?? details.cashBalance)}
              </div>
              <span className="text-[11px] block mt-0.5">
                {(details.reservedForExpenses ?? 0) > 0 ? (
                  <span className="text-amber-400 font-semibold">
                    {formatCurrency(details.reservedForExpenses!)} p/ despesas
                  </span>
                ) : (
                  <span className="text-slate-400 font-medium">Fora de risco</span>
                )}
              </span>
            </div>

            {/* Saldo na Plataforma (Bruto) */}
            <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 shadow-2xs">
              <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                <span>Saldo na plataforma</span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-1 rounded font-semibold">Bruto</span>
              </span>
              <div className="text-base font-bold font-display text-slate-200 mt-0.5">
                {formatCurrency(details.platformBalance ?? 0)}
              </div>
              <span className="text-[11px] text-slate-400 block mt-0.5 font-medium">
                {(details.platformBalance ?? 0) > 0
                  ? `Mín. saque: ${formatCurrency(settings?.minWithdrawalAmount ?? 0)}`
                  : 'Zero retido'}
              </span>
            </div>
          </div>

          {/* Dynamic Protected Buffer & Platform Risk Mitigation Section */}
          {details.dynamicBufferPercentage !== undefined && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-950/60 text-blue-400 rounded-lg border border-blue-900/60">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-slate-100">
                        Blindagem dinâmica autônoma
                      </span>
                      <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-blue-950/80 text-blue-300 border border-blue-800">
                        {details.dynamicBufferPercentage}% sugerido hoje
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 block">
                      Calculado de forma autônoma pelo algoritmo baseado em prazos de contratos, despesas e payback
                    </span>
                  </div>
                </div>

                {/* Risk Exposure Badge */}
                {details.riskExposureLevel && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-400">Risco plataforma:</span>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                      details.riskExposureLevel === 'low'
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                        : details.riskExposureLevel === 'moderate'
                        ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                        : 'bg-rose-950/80 text-rose-300 border border-rose-800'
                    }`}>
                      {details.riskExposureLevel === 'low' ? 'Risco baixo' : details.riskExposureLevel === 'moderate' ? 'Risco moderado' : 'Exposição alta'}
                    </span>
                  </div>
                )}
              </div>

              {/* Quick Metrics of Buffer */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-xs font-medium text-slate-400 block">Guardar hoje</span>
                  <span className="font-extrabold text-blue-400 text-sm block mt-0.5">
                    {formatCurrency(details.suggestedProtectionToday ?? 0)}
                  </span>
                  <span className="text-[11px] text-slate-400 block">{details.dynamicBufferPercentage}% retido p/ cofre</span>
                </div>

                <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-xs font-medium text-slate-400 block">Total blindado</span>
                  <span className="font-extrabold text-emerald-400 text-sm block mt-0.5">
                    {formatCurrency(details.totalProtectedAccumulated ?? 0)}
                  </span>
                  <span className="text-[11px] text-slate-400 block">Reserva segura acumulada</span>
                </div>

                <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-xs font-medium text-slate-400 block">Duração contratos</span>
                  <span className="font-extrabold text-slate-100 text-sm block mt-0.5">
                    {details.contractDurationRisk ? `${formatNumberBR(details.contractDurationRisk.avgRemainingDays)}d em média` : '—'}
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    {details.contractDurationRisk?.contractsExpiringSoonCount
                      ? `${details.contractDurationRisk.contractsExpiringSoonCount} vencendo em ≤5d`
                      : 'Prazos ativos'}
                  </span>
                </div>

                <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-xs font-medium text-slate-400 block">Alocável reinvestir</span>
                  <span className="font-extrabold text-slate-100 text-sm block mt-0.5">
                    {formatCurrency(details.reservedForReinvestment ?? (details.bankBalance ?? details.cashBalance))}
                  </span>
                  <span className="text-[11px] text-slate-400 block">Saldo livre no banco</span>
                </div>
              </div>

              {/* Protection tip / algorithm rationale */}
              {details.protectionTip && (
                <div className="p-2.5 bg-blue-950/40 border border-blue-900/60 rounded-lg text-xs text-blue-200 flex items-start gap-2 leading-relaxed">
                  <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>{details.protectionTip}</span>
                </div>
              )}
            </div>
          )}

          {/* Tab Navigation */}
          <div
            role="tablist"
            aria-label="Detalhes do dia"
            className="border-b border-slate-800 pt-1 flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-none"
          >
            <button
              onClick={() => setActiveTab('acquisitions')}
              role="tab"
              aria-selected={activeTab === 'acquisitions'}
              className={`h-8 px-2.5 sm:px-3 text-xs sm:text-sm font-semibold transition-all border-b-2 flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
                activeTab === 'acquisitions'
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 rounded-t-lg'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 rounded-t-lg'
              }`}
            >
              <PlusCircle className="h-4 w-4 text-emerald-400" />
              <span>Aquisições ({todayAcquisitions.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('active')}
              role="tab"
              aria-selected={activeTab === 'active'}
              className={`h-8 px-2.5 sm:px-3 text-xs sm:text-sm font-semibold transition-all border-b-2 flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
                activeTab === 'active'
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 rounded-t-lg'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 rounded-t-lg'
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>Carteira Ativa ({details.activeContracts.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('expenses')}
              role="tab"
              aria-selected={activeTab === 'expenses'}
              className={`h-8 px-2.5 sm:px-3 text-xs sm:text-sm font-semibold transition-all border-b-2 flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
                activeTab === 'expenses'
                  ? 'border-amber-500 text-amber-400 bg-amber-500/10 rounded-t-lg'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 rounded-t-lg'
              }`}
            >
              <Receipt className="h-4 w-4 text-amber-400" />
              <span>Despesas ({details.expensesTodayList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('expired')}
              role="tab"
              aria-selected={activeTab === 'expired'}
              className={`h-8 px-2.5 sm:px-3 text-xs sm:text-sm font-semibold transition-all border-b-2 flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
                activeTab === 'expired'
                  ? 'border-slate-400 text-slate-200 bg-slate-800/60 rounded-t-lg'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 rounded-t-lg'
              }`}
            >
              <Archive className="h-4 w-4 text-slate-400" />
              <span>Encerrados ({details.expiredTodayContracts?.length || 0})</span>
            </button>
          </div>

          {/* Tab Content Cards List */}
          <div className="space-y-3 pb-2">
            {/* TAB 1: AQUISIÇÕES ESPECÍFICAS DESTE DIA */}
            {activeTab === 'acquisitions' && (
              <div className="space-y-2.5">
                {todayAcquisitions.length === 0 ? (
                  <div className="text-center py-8 px-4 bg-slate-900/50 rounded-xl border border-slate-800">
                    <div className="w-10 h-10 mx-auto mb-2.5 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                      <PlusCircle className="h-5 w-5" />
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-200 mb-1">
                      Nenhum produto adquirido no Dia {details.day}
                    </h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                      Nesta data não houve novos aportes. Os rendimentos ({formatCurrency(details.dailyYield)}) foram acumulados no saldo livre para futuros investimentos ou despesas.
                    </p>
                  </div>
                ) : (
                  todayAcquisitions.map((acq, idx) => (
                    <div
                      key={`${acq.id}-${idx}`}
                      className="p-3.5 rounded-xl border border-emerald-800/60 bg-slate-900/90 hover:border-emerald-700/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-emerald-950/60 text-emerald-400 rounded-lg shrink-0 border border-emerald-800/70">
                          <PlusCircle className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-100 text-xs sm:text-sm">{acq.name}</span>
                            <span className="text-[11px] font-semibold bg-emerald-950/70 text-emerald-300 border border-emerald-800 px-1.5 py-0.5 rounded">
                              Hoje (Dia {details.day})
                            </span>
                            {acq.units > 1 && (
                              <span className="text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700 px-1.5 py-0.5 rounded">
                                {acq.units}x cotas ({formatCurrency(acq.unitPrice)})
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Vigência: <strong className="text-slate-300">{acq.startDateFormatted}</strong> até <strong className="text-slate-300">{acq.endDateFormatted}</strong> ({acq.durationDays} dias)
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 sm:text-right shrink-0 bg-slate-950/70 px-3 py-2 rounded-lg border border-slate-800">
                        <div>
                          <span className="text-[11px] text-slate-400 block font-medium">Investido hoje</span>
                          <span className="font-bold text-slate-100 text-xs">{formatCurrency(acq.investedAmount)}</span>
                        </div>
                        <div className="border-l border-slate-800 pl-3">
                          <span className="text-[11px] text-slate-400 block font-medium">Renda adicional</span>
                          <span className="font-bold text-emerald-400 text-xs">
                            +{formatCurrency(acq.dailyYield)}/dia ({acq.dailyPercentage}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 2: CARTEIRA ATIVA EM ANDAMENTO */}
            {activeTab === 'active' && (
              <div className="space-y-2.5">
                {details.activeContracts.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs bg-slate-900/50 rounded-xl border border-slate-800">
                    Nenhum produto ativo neste dia específico.
                  </div>
                ) : (
                  details.activeContracts.map((c, idx) => (
                    <div
                      key={`${c.id}-${idx}`}
                      className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:border-slate-700 shadow-2xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-lg shrink-0 ${
                          c.isAcquiredToday || c.startDay === details.day
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}>
                          {c.isAcquiredToday || c.startDay === details.day ? <PlusCircle className="h-4 w-4" /> : <Layers className="h-4 w-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-100">{c.name}</span>
                            {c.isInitialPortfolio ? (
                              <span className="text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded">
                                Carteira inicial
                              </span>
                            ) : c.isAcquiredToday || (c.startDay === details.day && !c.isInitialPortfolio) ? (
                              <span className="text-[11px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800 px-1.5 py-0.5 rounded">
                                Novo aporte hoje (Dia {details.day})
                              </span>
                            ) : (
                              <span className="text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded">
                                Dia {c.startDay}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                            <span>Vigência: <strong className="text-slate-300">{c.startDateFormatted}</strong> a <strong className="text-slate-300">{c.endDateFormatted}</strong></span>
                            <span>•</span>
                            <span className="font-semibold text-amber-400">Restam {c.daysRemaining} dias</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 sm:text-right shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                        <div>
                          <span className="text-[11px] text-slate-400 font-medium block">Em custódia</span>
                          <span className="font-bold text-slate-200 text-xs">{formatCurrency(c.investedAmount)}</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 font-medium block">Rendimento</span>
                          {c.startDay === details.day ? (
                            <span className="font-semibold text-amber-400 flex items-center gap-1 text-xs" title="O primeiro rendimento ocorre 24h após o aporte">
                              <Clock className="h-3 w-3" /> Em 24h (+{formatCurrency(c.dailyYield)}/dia)
                            </span>
                          ) : (
                            <span className="font-bold text-emerald-400 text-xs">
                              +{formatCurrency(c.dailyYield)}/dia ({c.dailyPercentage}%)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 3: GASTOS E RETIRADAS */}
            {activeTab === 'expenses' && (
              <div className="space-y-2.5">
                <div className="p-3 bg-amber-950/20 border border-amber-900/60 rounded-xl text-xs text-amber-200">
                  <span className="font-bold text-xs text-amber-200 block">Detalhamento dos Pagamentos de Despesas:</span>
                  <p className="text-[11px] text-amber-300/90 mt-0.5 leading-relaxed">
                    Confira o valor a pagar e o saque bruto necessário (incluindo taxa de saque da plataforma para atingir o valor líquido exato).
                  </p>
                </div>

                {details.expensesTodayList.map((exp, idx) => {
                  const feeRate = (settings?.withdrawalFeePercentage ?? 0) / 100;
                  const fixedFee = settings?.fixedWithdrawalFee ?? 0;
                  const reqGross = feeRate < 1 
                    ? (exp.amount + fixedFee) / (1 - feeRate)
                    : exp.amount;
                  const feeAmount = reqGross - exp.amount;

                  return (
                    <div
                      key={`${exp.id}-${idx}`}
                      className="p-3.5 rounded-xl border border-amber-900/60 bg-slate-900/90 hover:border-amber-800 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-amber-950/60 text-amber-400 rounded-lg shrink-0 border border-amber-900/70">
                          <Receipt className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-100 text-xs sm:text-sm">{exp.title}</span>
                            <span className="bg-amber-950/70 text-amber-300 border border-amber-900/80 px-1.5 py-0.5 rounded text-[11px] font-semibold">{exp.category}</span>
                            {exp.isPaid ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-950/70 text-emerald-300 border border-emerald-800 px-1.5 py-0.5 rounded text-[11px] font-semibold">
                                <CheckCircle2 className="h-3 w-3" /> Paga
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-amber-950/70 text-amber-300 border border-amber-800 px-1.5 py-0.5 rounded text-[11px] font-semibold">
                                <Clock className="h-3 w-3" /> A Pagar
                              </span>
                            )}
                          </div>
                          {exp.notes && (
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {exp.notes}
                            </div>
                          )}
                          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                            <span>Saque em Caixa: <strong className="text-slate-200">{formatCurrency(reqGross)}</strong></span>
                            {feeAmount > 0 && (
                              <span className="text-amber-400">
                                • Taxa ({settings?.withdrawalFeePercentage}%): {formatCurrency(feeAmount)}
                              </span>
                            )}
                            {(details.expensesPaidFromBlindagemToday ?? 0) > 0 && (
                              <span className="text-emerald-300 bg-emerald-950/70 border border-emerald-800 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                {(details.expensesPaidFromBlindagemToday ?? 0) >= details.expensesDeductedToday ? '100% da Blindagem' : `${formatCurrency(details.expensesPaidFromBlindagemToday ?? 0)} blindado + ${formatCurrency(details.expensesPaidFromFreeBankToday ?? 0)} saldo líquido`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-left sm:text-right shrink-0 bg-slate-950/70 px-3 py-2 rounded-lg border border-slate-800">
                        <span className="text-[11px] text-slate-400 font-medium block">Valor da despesa</span>
                        <span className="font-bold text-amber-400 text-sm">{formatCurrency(exp.amount)}</span>
                        <span className="text-[11px] text-rose-400 block mt-0.5">
                          Saque: -{formatCurrency(reqGross)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB 4: CONTRATOS ENCERRADOS NESTE DIA */}
            {activeTab === 'expired' && (
              <div className="space-y-2.5">
                {details.capitalReturnedToday > 0 && (
                  <div className="p-3 bg-blue-950/30 border border-blue-900/60 rounded-xl text-xs text-blue-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-blue-400 shrink-0" />
                      <span>
                        <strong className="text-blue-200">Capital devolvido no Dia {details.day}:</strong> Retorno de{' '}
                        <strong className="text-blue-300">{formatCurrency(details.capitalReturnedToday)}</strong> creditado ao saldo de caixa.
                      </span>
                    </div>
                  </div>
                )}

                {(!details.expiredTodayContracts || details.expiredTodayContracts.length === 0) ? (
                  <div className="text-center py-8 text-slate-400 text-xs bg-slate-900/50 rounded-xl border border-slate-800">
                    Nenhum contrato completou o ciclo de vigência especificamente no Dia {details.day}.
                  </div>
                ) : (
                  details.expiredTodayContracts.map((ex, idx) => (
                    <div
                      key={`${ex.id}-${idx}`}
                      className="p-3 rounded-xl border border-slate-800 bg-slate-900/70 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs opacity-90 shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-slate-800 text-slate-300 rounded-lg shrink-0 border border-slate-700">
                          <Archive className="h-4 w-4 text-slate-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-300 line-through decoration-slate-500">{ex.name}</span>
                            <span className="text-[11px] bg-slate-800 text-slate-300 border border-slate-700 px-1.5 py-0.5 rounded font-medium">
                              Encerrado no Dia {ex.endDay}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Vigência concluída: {ex.durationDays} dias ({ex.startDateFormatted} a {ex.endDateFormatted})
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 sm:text-right shrink-0">
                        <div>
                          <span className="text-[11px] text-slate-400 font-medium block">Capital inicial</span>
                          <span className="font-semibold text-slate-300 text-xs">{formatCurrency(ex.investedAmount)}</span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 font-medium block">Status</span>
                          <span className={`font-semibold text-xs ${ex.returnCapitalAtEnd ? 'text-emerald-400' : 'text-slate-400'}`}>
                            {ex.returnCapitalAtEnd ? 'Devolvido ao Saldo' : 'Retido na Operação'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="border-t border-slate-800 px-4 py-3 sm:px-5 sm:py-3 bg-slate-950/90 flex items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-slate-400 hidden sm:inline">
            Dica: clique em qualquer ponto do gráfico para navegar pelas datas.
          </span>
          <div className="flex items-center gap-2 ml-auto">
            {isDayCompleted ? (
              <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold bg-emerald-950/70 text-emerald-300 border border-emerald-800">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                Dia Concluído
              </span>
            ) : onCompleteDay ? (
              <button
                type="button"
                onClick={() => onCompleteDay(details)}
                className="inline-flex items-center gap-1.5 h-8 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-all shadow-xs active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Marcar Concluído</span>
              </button>
            ) : null}
            <button
              onClick={onClose}
              className="h-8 px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-all cursor-pointer whitespace-nowrap"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
