import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  writeBatch,
  FirestoreError,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, isOfflineError } from './firebase';
import { InvestmentProduct, Expense, PlatformSettings, ProductTemplate } from '../types/investment';
import { normalizeSettings, toFiniteNumber } from '../utils/calculations';

/**
 * CORREÇÃO: `Number(x) ?? padrão` nunca captura NaN — `??` só trata null e
 * undefined. Um campo ausente virava NaN e contaminava todo o motor de cálculo.
 */
const num = (value: unknown, fallback: number): number => toFiniteNumber(value, fallback);

/** Trata erros de listener de forma uniforme, distinguindo offline de falha real. */
function handleListenerError(
  error: FirestoreError,
  colPath: string,
  label: string,
  onError?: (err: Error) => void
) {
  if (isOfflineError(error)) {
    console.warn(`[Firestore offline] ${colPath}: operando com cache local.`);
  } else {
    console.error(`Erro no listener de ${label}:`, error.code, error.message);
  }
  onError?.(error);
}


// ---------------------------------------------------------------------------
// Construtores de payload — fonte única de verdade dos campos gravados.
//
// CORREÇÃO: os campos eram enumerados à mão em cada função de escrita e de
// leitura. Foi essa duplicação que deixou três campos de configuração caírem
// silenciosamente. Centralizar aqui impede que o descompasso volte.
// ---------------------------------------------------------------------------

function buildProductPayload(userId: string, product: InvestmentProduct): Record<string, unknown> {
  return {
    userId,
    name: product.name,
    investedAmount: product.investedAmount,
    returnAmount: product.returnAmount ?? null,
    returnType: product.returnType ?? 'total',
    dailyPercentage: product.dailyPercentage,
    durationDays: product.durationDays,
    startDate: product.startDate,
    returnCapitalAtEnd: product.returnCapitalAtEnd ?? true,
    category: product.category || 'Geral',
    status: product.status || 'active',
    notes: product.notes || '',
    isReinvestment: product.isReinvestment === true,
    isNewInvestment: product.isNewInvestment === true,
    updatedAt: new Date().toISOString(),
  };
}

function buildExpensePayload(userId: string, expense: Expense): Record<string, unknown> {
  const hasDue =
    expense.hasDueDate !== undefined
      ? Boolean(expense.hasDueDate)
      : Boolean(expense.dueDate && String(expense.dueDate).trim());
  const due = hasDue && expense.dueDate && String(expense.dueDate).trim()
    ? String(expense.dueDate).trim()
    : null;

  return {
    userId,
    title: expense.title.trim(),
    amount: toFiniteNumber(expense.amount, 0),
    dueDate: due,
    hasDueDate: hasDue,
    category: expense.category,
    isPaid: Boolean(expense.isPaid),
    paidDate: expense.paidDate ? String(expense.paidDate).trim() : null,
    deductFromRoadmap: expense.deductFromRoadmap ?? true,
    notes: expense.notes ? String(expense.notes).trim() : '',
    installmentGroupId: expense.installmentGroupId ?? null,
    installmentNumber: expense.installmentNumber ?? null,
    totalInstallments: expense.totalInstallments ?? null,
    updatedAt: new Date().toISOString(),
  };
}

function buildTemplatePayload(userId: string, template: ProductTemplate): Record<string, unknown> {
  return {
    userId,
    name: template.name,
    investedAmount: template.investedAmount,
    returnAmount: template.returnAmount ?? null,
    returnType: template.returnType ?? 'total',
    dailyPercentage: template.dailyPercentage,
    durationDays: template.durationDays,
    returnCapitalAtEnd: template.returnCapitalAtEnd ?? false,
    category: template.category || 'Robô / Arbitragem',
    notes: template.notes || '',
    updatedAt: new Date().toISOString(),
  };
}

function buildSettingsPayload(
  userId: string,
  settings: PlatformSettings,
  email?: string
): Record<string, unknown> {
  const s = normalizeSettings(settings);
  return {
    userId,
    email: email || '',
    withdrawalFeePercentage: s.withdrawalFeePercentage,
    fixedWithdrawalFee: s.fixedWithdrawalFee,
    minWithdrawalAmount: s.minWithdrawalAmount,
    minDepositAmount: s.minDepositAmount ?? 50,
    dailyGoalAmount: s.dailyGoalAmount,
    reinvestmentBufferPercentage: s.reinvestmentBufferPercentage,
    goalCycleStartDate: s.goalCycleStartDate ?? null,
    dynamicBufferEnabled: s.dynamicBufferEnabled !== false,
    protectionProfile: s.protectionProfile ?? 'balanced',
    completedRoadmapDays: s.completedRoadmapDays ?? [],
    updatedAt: new Date().toISOString(),
  };
}

// Caminho de sincronização das coleções do usuário
export const firestoreSync = {
  // Escuta modelos de produtos pré-cadastrados (templates)
  subscribeTemplates(
    userId: string,
    onSuccess: (templates: ProductTemplate[]) => void,
    onError?: (err: Error) => void
  ) {
    const colPath = `users/${userId}/templates`;
    const q = query(collection(db, 'users', userId, 'templates'));

    return onSnapshot(
      q,
      (snapshot) => {
        const list: ProductTemplate[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          list.push({
            id: docSnap.id,
            name: d.name,
            investedAmount: num(d.investedAmount, 0),
            returnAmount: d.returnAmount != null ? num(d.returnAmount, 0) : undefined,
            returnType: d.returnType === 'daily' ? 'daily' : 'total',
            dailyPercentage: num(d.dailyPercentage, 0),
            durationDays: Math.max(1, num(d.durationDays, 1)),
            returnCapitalAtEnd: Boolean(d.returnCapitalAtEnd),
            category: d.category || 'Geral',
            notes: d.notes || '',
            createdAt: d.createdAt,
          });
        });
        onSuccess(list);
      },
      (error) => handleListenerError(error, colPath, 'modelos', onError)
    );
  },

  // Salva template
  async saveTemplate(userId: string, template: ProductTemplate) {
    const path = `users/${userId}/templates/${template.id}`;
    try {
      const docRef = doc(db, 'users', userId, 'templates', template.id);
      await setDoc(docRef, buildTemplatePayload(userId, template), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // Exclui template
  async deleteTemplate(userId: string, templateId: string) {
    const path = `users/${userId}/templates/${templateId}`;
    try {
      const docRef = doc(db, 'users', userId, 'templates', templateId);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },
  // Escuta produtos em tempo real do usuário
  subscribeProducts(
    userId: string, 
    onSuccess: (products: InvestmentProduct[]) => void, 
    onError?: (err: Error) => void
  ) {
    const colPath = `users/${userId}/products`;
    const q = query(collection(db, 'users', userId, 'products'));

    return onSnapshot(
      q,
      (snapshot) => {
        const list: InvestmentProduct[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          list.push({
            id: docSnap.id,
            name: d.name,
            investedAmount: num(d.investedAmount, 0),
            returnAmount: d.returnAmount != null ? num(d.returnAmount, 0) : undefined,
            returnType: d.returnType === 'daily' ? 'daily' : 'total',
            dailyPercentage: num(d.dailyPercentage, 0),
            durationDays: Math.max(1, num(d.durationDays, 1)),
            startDate: d.startDate,
            returnCapitalAtEnd: Boolean(d.returnCapitalAtEnd),
            category: d.category || 'Geral',
            status: d.status || 'active',
            notes: d.notes || '',
            // CORREÇÃO: estes dois campos se perdiam no ida-e-volta, fazendo o
            // roadmap reclassificar contratos por match textual no nome.
            isReinvestment: d.isReinvestment === true,
            isNewInvestment: d.isNewInvestment === true,
          });
        });
        onSuccess(list);
      },
      (error) => handleListenerError(error, colPath, 'produtos', onError)
    );
  },

  // Escuta despesas em tempo real do usuário
  subscribeExpenses(
    userId: string, 
    onSuccess: (expenses: Expense[]) => void, 
    onError?: (err: Error) => void
  ) {
    const colPath = `users/${userId}/expenses`;
    const q = query(collection(db, 'users', userId, 'expenses'));

    return onSnapshot(
      q,
      (snapshot) => {
        const list: Expense[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          const hasDueDateVal = d.hasDueDate !== undefined
            ? Boolean(d.hasDueDate)
            : Boolean(d.dueDate && String(d.dueDate).trim());
          const dueDateVal = hasDueDateVal && d.dueDate ? String(d.dueDate).trim() : undefined;

          list.push({
            id: docSnap.id,
            title: d.title,
            amount: num(d.amount, 0),
            dueDate: dueDateVal,
            hasDueDate: hasDueDateVal,
            category: d.category || 'Outros',
            isPaid: Boolean(d.isPaid),
            paidDate: d.paidDate || undefined,
            deductFromRoadmap: d.deductFromRoadmap !== undefined ? Boolean(d.deductFromRoadmap) : true,
            notes: d.notes || '',
            installmentGroupId: d.installmentGroupId || undefined,
            installmentNumber: d.installmentNumber != null ? num(d.installmentNumber, 1) : undefined,
            totalInstallments: d.totalInstallments != null ? num(d.totalInstallments, 1) : undefined,
          });
        });
        onSuccess(list);
      },
      (error) => handleListenerError(error, colPath, 'despesas', onError)
    );
  },

  // Escuta perfil e configurações do usuário
  subscribeSettings(
    userId: string, 
    onSuccess: (settings: PlatformSettings) => void, 
    onError?: (err: Error) => void
  ) {
    const docPath = `users/${userId}`;
    const userDocRef = doc(db, 'users', userId);

    return onSnapshot(
      userDocRef,
      (snapshot) => {
        if (!snapshot.exists()) return;
        const d = snapshot.data();

        // CORREÇÃO: `goalCycleStartDate`, `dynamicBufferEnabled` e
        // `protectionProfile` eram descartados aqui. O listener devolvia o
        // documento sem eles e apagava o estado local — o reset do ciclo de
        // meta e o perfil de proteção voltavam sozinhos ao padrão.
        onSuccess(
          normalizeSettings({
            withdrawalFeePercentage: num(d.withdrawalFeePercentage, 5),
            fixedWithdrawalFee: num(d.fixedWithdrawalFee, 0),
            minWithdrawalAmount: num(d.minWithdrawalAmount, 50),
            minDepositAmount: num(d.minDepositAmount, 50),
            dailyGoalAmount: num(d.dailyGoalAmount, 150),
            reinvestmentBufferPercentage: num(d.reinvestmentBufferPercentage, 20),
            goalCycleStartDate:
              typeof d.goalCycleStartDate === 'string' && d.goalCycleStartDate.trim()
                ? d.goalCycleStartDate
                : undefined,
            dynamicBufferEnabled: d.dynamicBufferEnabled !== false,
            protectionProfile: d.protectionProfile,
            completedRoadmapDays: Array.isArray(d.completedRoadmapDays) ? d.completedRoadmapDays : [],
          })
        );
      },
      (error) => handleListenerError(error, docPath, 'configurações', onError)
    );
  },

  // Salva produto
  async saveProduct(userId: string, product: InvestmentProduct) {
    const path = `users/${userId}/products/${product.id}`;
    try {
      const docRef = doc(db, 'users', userId, 'products', product.id);
      await setDoc(docRef, buildProductPayload(userId, product), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // Exclui produto
  async deleteProduct(userId: string, productId: string) {
    const path = `users/${userId}/products/${productId}`;
    try {
      const docRef = doc(db, 'users', userId, 'products', productId);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Salva despesa
  async saveExpense(userId: string, expense: Expense) {
    const path = `users/${userId}/expenses/${expense.id}`;
    try {
      const docRef = doc(db, 'users', userId, 'expenses', expense.id);
      await setDoc(docRef, buildExpensePayload(userId, expense), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // Exclui despesa
  async deleteExpense(userId: string, expenseId: string) {
    const path = `users/${userId}/expenses/${expenseId}`;
    try {
      const docRef = doc(db, 'users', userId, 'expenses', expenseId);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Salva configurações do usuário
  async saveSettings(userId: string, settings: PlatformSettings, email?: string) {
    const path = `users/${userId}`;
    try {
      const docRef = doc(db, 'users', userId);
      await setDoc(docRef, buildSettingsPayload(userId, settings, email), { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  /**
   * Envia os dados locais para a nuvem.
   *
   * CORREÇÃO: antes eram N idas e voltas sequenciais, sem atomicidade — uma
   * falha no meio deixava o estado parcialmente migrado. Agora usa lotes de
   * até 450 operações (limite do Firestore é 500).
   */
  async syncLocalToCloud(
    userId: string,
    products: InvestmentProduct[],
    expenses: Expense[],
    settings: PlatformSettings,
    templates?: ProductTemplate[],
    email?: string
  ) {
    const BATCH_LIMIT = 450;
    const ops: { ref: ReturnType<typeof doc>; data: Record<string, unknown> }[] = [];

    ops.push({
      ref: doc(db, 'users', userId),
      data: buildSettingsPayload(userId, settings, email),
    });
    products.forEach((p) =>
      ops.push({ ref: doc(db, 'users', userId, 'products', p.id), data: buildProductPayload(userId, p) })
    );
    expenses.forEach((e) =>
      ops.push({ ref: doc(db, 'users', userId, 'expenses', e.id), data: buildExpensePayload(userId, e) })
    );
    (templates ?? []).forEach((t) =>
      ops.push({ ref: doc(db, 'users', userId, 'templates', t.id), data: buildTemplatePayload(userId, t) })
    );

    for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
      const batch = writeBatch(db);
      ops.slice(i, i + BATCH_LIMIT).forEach(({ ref, data }) => batch.set(ref, data, { merge: true }));
      await batch.commit();
    }
  },
};
