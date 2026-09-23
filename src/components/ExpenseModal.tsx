import React, { useState, useEffect } from 'react';
import { X, Receipt, TrendingDown, Layers, Clock } from 'lucide-react';
import { Expense } from '../types/investment';
import { getTodayString, addMonths, formatDateBR, formatCurrency } from '../utils/calculations';
import { createId } from '../utils/id';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expense: Expense | Expense[]) => void;
  expenseToEdit?: Expense | null;
  initialDate?: string;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  expenseToEdit,
  initialDate,
}) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<number | ''>(100);
  const [hasDueDate, setHasDueDate] = useState<boolean>(true);
  const [dueDate, setDueDate] = useState<string>(getTodayString());
  const [category, setCategory] = useState<Expense['category']>('Imprevisto');
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [paidDate, setPaidDate] = useState<string>('');
  const [deductFromRoadmap, setDeductFromRoadmap] = useState<boolean>(true);
  const [notes, setNotes] = useState('');

  // Estados para Parcelamento
  const [isInstallment, setIsInstallment] = useState<boolean>(false);
  const [totalInstallments, setTotalInstallments] = useState<number | ''>(2);
  const [installmentValueMode, setInstallmentValueMode] = useState<'per_installment' | 'total_purchase'>('per_installment');

  useEffect(() => {
    if (expenseToEdit) {
      setTitle(expenseToEdit.title);
      setAmount(expenseToEdit.amount);
      const withDueDate = expenseToEdit.hasDueDate !== false && Boolean(expenseToEdit.dueDate && expenseToEdit.dueDate.trim());
      setHasDueDate(withDueDate);
      setDueDate(expenseToEdit.dueDate || getTodayString());
      setCategory(expenseToEdit.category);
      setIsPaid(expenseToEdit.isPaid);
      setPaidDate(expenseToEdit.paidDate || '');
      setDeductFromRoadmap(expenseToEdit.deductFromRoadmap ?? true);
      setNotes(expenseToEdit.notes || '');
      setIsInstallment(Boolean(expenseToEdit.installmentGroupId));
      setTotalInstallments(expenseToEdit.totalInstallments || 2);
      setInstallmentValueMode('per_installment');
    } else {
      setTitle('');
      setAmount('');
      setHasDueDate(true);
      setDueDate(initialDate || getTodayString());
      setCategory('Imprevisto');
      setIsPaid(false);
      setPaidDate('');
      setDeductFromRoadmap(true);
      setNotes('');
      setIsInstallment(false);
      setTotalInstallments(2);
      setInstallmentValueMode('per_installment');
    }
  }, [expenseToEdit, isOpen, initialDate]);

  if (!isOpen) return null;

  const numAmount = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  const numInstallments = typeof totalInstallments === 'number' ? Math.max(2, totalInstallments) : parseInt(String(totalInstallments)) || 2;

  // Cálculo prévio para exibição do parcelamento
  const calcInstallmentAmount = installmentValueMode === 'total_purchase'
    ? (numInstallments > 0 ? numAmount / numInstallments : 0)
    : numAmount;
  
  const calcTotalAmount = installmentValueMode === 'total_purchase'
    ? numAmount
    : numAmount * numInstallments;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (numAmount <= 0) return;

    if (isInstallment && !expenseToEdit && numInstallments >= 2) {
      const groupId = createId('exp-grp');
      const generatedExpenses: Expense[] = [];
      const baseDueDate = dueDate || getTodayString();

      const perInstallmentValue = Math.max(0.01, Math.round((installmentValueMode === 'total_purchase' ? numAmount / numInstallments : numAmount) * 100) / 100);

      for (let i = 1; i <= numInstallments; i++) {
        const installmentDueDate = addMonths(baseDueDate, i - 1);
        generatedExpenses.push({
          id: createId('exp'),
          title: `${title.trim()} (${i}/${numInstallments})`,
          amount: perInstallmentValue,
          dueDate: installmentDueDate,
          hasDueDate: true,
          category,
          isPaid: i === 1 ? isPaid : false,
          paidDate: (i === 1 && isPaid) ? (paidDate || installmentDueDate) : undefined,
          deductFromRoadmap,
          notes: notes.trim(),
          installmentGroupId: groupId,
          installmentNumber: i,
          totalInstallments: numInstallments,
        });
      }

      onSave(generatedExpenses);
    } else {
      const effectiveDueDate = hasDueDate ? (dueDate || getTodayString()) : undefined;
      const expense: Expense = {
        id: expenseToEdit?.id || createId('exp'),
        title: title.trim(),
        amount: Math.max(0.01, numAmount),
        dueDate: effectiveDueDate,
        hasDueDate: hasDueDate,
        category,
        isPaid,
        paidDate: isPaid ? (paidDate || effectiveDueDate || getTodayString()) : undefined,
        deductFromRoadmap,
        notes: notes.trim(),
        ...(expenseToEdit?.installmentGroupId ? {
          installmentGroupId: expenseToEdit.installmentGroupId,
          installmentNumber: expenseToEdit.installmentNumber,
          totalInstallments: expenseToEdit.totalInstallments,
        } : {}),
      };

      onSave(expense);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 relative my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 rounded-xl border border-amber-100 dark:border-amber-900/60">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-display">
                {expenseToEdit ? 'Editar Gasto / Despesa' : 'Novo Gasto ou Imprevisto'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ajuste gastos e parcelas para recalcular seu roadmap e meta dinamicamente
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 tracking-normal mb-1">
              Descrição do gasto / despesa *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Fatura Nubank, Compra Notebook, Mecânico..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-hidden focus:border-amber-600 focus:ring-1 focus:ring-amber-600 font-medium"
              autoFocus
            />
          </div>

          {/* Opção À Vista vs Parcelado */}
          {!expenseToEdit && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
              <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 tracking-normal">
                Forma de pagamento
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsInstallment(false)}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    !isInstallment
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Receipt className="h-3.5 w-3.5" />
                  À vista / única
                </button>
                <button
                  type="button"
                  onClick={() => setIsInstallment(true)}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isInstallment
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  Parcelado em meses
                </button>
              </div>
            </div>
          )}

          {/* Campos de Parcelamento */}
          {isInstallment && !expenseToEdit && (
            <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-150 dark:border-indigo-800/60 rounded-xl space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-indigo-900 dark:text-indigo-300 tracking-normal mb-1">
                    Nº de parcelas (Meses)
                  </label>
                  <select
                    value={totalInstallments}
                    onChange={(e) => setTotalInstallments(parseInt(e.target.value) || 2)}
                    className="w-full px-3 py-2 rounded-lg border border-indigo-200 dark:border-indigo-700 text-sm focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    {[2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 18, 24, 36, 48, 60].map((n) => (
                      <option key={n} value={n}>
                        {n}x parcelas mensais
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-indigo-900 dark:text-indigo-300 tracking-normal mb-1">
                    Tipo do valor informado
                  </label>
                  <select
                    value={installmentValueMode}
                    onChange={(e) => setInstallmentValueMode(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-indigo-200 dark:border-indigo-700 text-sm focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-semibold bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="per_installment">Valor por Parcela (R$)</option>
                    <option value="total_purchase">Valor Total da Compra (R$)</option>
                  </select>
                </div>
              </div>

              {/* Resumo visual do parcelamento */}
              {numAmount > 0 && (
                <div className="pt-2 border-t border-indigo-200/60 dark:border-indigo-800/60 flex flex-col gap-1 text-xs text-indigo-950 dark:text-indigo-200">
                  <div className="flex items-center justify-between font-bold">
                    <span>Valor da Parcela Mensal:</span>
                    <span className="text-indigo-700 dark:text-indigo-400 font-mono text-sm">{formatCurrency(calcInstallmentAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-indigo-700 dark:text-indigo-300">
                    <span>Total da Compra ({numInstallments}x):</span>
                    <span className="font-semibold">{formatCurrency(calcTotalAmount)}</span>
                  </div>
                  <p className="text-[10px] text-indigo-800/80 dark:text-indigo-300/80 mt-1 leading-snug">
                    Serão lançadas parcelas a cada mês a partir de <strong>{formatDateBR(dueDate)}</strong>.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 tracking-normal mb-1">
                {isInstallment && !expenseToEdit
                  ? installmentValueMode === 'total_purchase'
                    ? 'Valor Total (R$) *'
                    : 'Valor da Parcela (R$) *'
                  : 'Valor do Gasto (R$) *'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400 dark:text-slate-500">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0,00"
                  value={amount}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAmount(val === '' ? '' : parseFloat(val));
                  }}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-hidden focus:border-amber-600 focus:ring-1 focus:ring-amber-600 font-bold"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 tracking-normal">
                  {isInstallment && !expenseToEdit ? 'Vencimento 1ª Parcela *' : 'Vencimento / Prazo'}
                </label>
                {!isInstallment && (
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={!hasDueDate}
                      onChange={(e) => {
                        const withoutDate = e.target.checked;
                        setHasDueDate(!withoutDate);
                        if (!withoutDate && !dueDate) {
                          setDueDate(getTodayString());
                        }
                      }}
                      className="rounded border-slate-300 dark:border-slate-600 text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                    />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Sem vencimento</span>
                  </label>
                )}
              </div>

              {hasDueDate ? (
                <input
                  type="date"
                  required={hasDueDate}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-hidden focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                />
              ) : (
                <div className="px-3 py-2 rounded-lg border border-dashed border-amber-300 dark:border-amber-700/60 bg-amber-50/60 dark:bg-amber-950/30 text-xs text-amber-900 dark:text-amber-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    Sem data definida (a qualquer momento)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setHasDueDate(true);
                      setDueDate(getTodayString());
                    }}
                    className="text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 underline ml-2 cursor-pointer"
                  >
                    Definir data
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 tracking-normal mb-1">
              Categoria
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm focus:outline-hidden focus:border-amber-600 focus:ring-1 focus:ring-amber-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
            >
              <option value="Cartão / Fatura">Cartão / Fatura</option>
              <option value="Imprevisto">Gasto imprevisto / emergência</option>
              <option value="Moradia">Moradia (aluguel, condomínio)</option>
              <option value="Serviços">Serviços (luz, internet, água)</option>
              <option value="Alimentação">Alimentação</option>
              <option value="Reinvestimento">Aporte de reinvestimento</option>
              <option value="Outros">Outros</option>
            </select>
          </div>

          {/* Opção de Ajustar Roadmap Dinamicamente */}
          <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-amber-700 dark:text-amber-400 shrink-0" />
                <span className="text-xs font-bold text-amber-950 dark:text-amber-200">
                  Abater do caixa do roadmap
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={deductFromRoadmap}
                  onChange={(e) => setDeductFromRoadmap(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-300 dark:bg-slate-600 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>
            <p className="text-[11px] text-amber-900 dark:text-amber-300 leading-snug">
              {deductFromRoadmap 
                ? 'Esse valor será debitado do saldo acumulado do investimento na data escolhida, recalculando automaticamente os dias para a meta diária.'
                : 'Esse gasto não alterará o saldo de reinvestimentos do roadmap.'}
            </p>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                {isInstallment && !expenseToEdit ? '1ª Parcela já foi paga?' : 'Já foi pago/retirado?'}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">Marque se o dinheiro já saiu da conta</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isPaid}
                onChange={(e) => setIsPaid(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-300 dark:bg-slate-600 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 tracking-normal mb-1">
              Observações / motivo
            </label>
            <input
              type="text"
              placeholder="Ex: Compra parcelada do cartão..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-hidden focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              {expenseToEdit
                ? 'Salvar Alterações'
                : isInstallment
                ? `Gerar ${numInstallments}x Parcelas`
                : 'Adicionar e Ajustar Roadmap'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
