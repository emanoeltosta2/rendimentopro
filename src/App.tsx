import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { CloudSyncBar } from './components/CloudSyncBar';
import { GoalBanner } from './components/GoalBanner';
import { DashboardOverview } from './components/DashboardOverview';
import { CalendarView } from './components/CalendarView';
import { ProductsList } from './components/ProductsList';
import { ExpensesList } from './components/ExpensesList';
import { GoalSimulator } from './components/GoalSimulator';
import { ProductModal } from './components/ProductModal';
import { ExpenseModal } from './components/ExpenseModal';
import { SettingsModal } from './components/SettingsModal';
import { QuickLaunchModal } from './components/QuickLaunchModal';
import { TemplateManagementModal } from './components/TemplateManagementModal';
import { InvestmentProduct, Expense, PlatformSettings, ProductTemplate, RoadmapPointDetails } from './types/investment';
import { 
  loadProducts, 
  saveProducts, 
  loadExpenses, 
  saveExpenses, 
  loadSettings, 
  saveSettings,
  loadProductTemplates,
  saveProductTemplates,
  resetToDefaults,
  deduplicateProducts,
  deduplicateExpenses,
  deduplicateTemplates
} from './utils/storage';
import { getTodayString, isProductActiveOnDate, normalizeSettings } from './utils/calculations';
import { useAuth } from './services/AuthContext';
import { firestoreSync } from './services/firestoreSync';

/**
 * CORREÇÃO: `prod-${Date.now()}` colide em duplicações rápidas (mesmo
 * milissegundo), gerando dois registros com o mesmo id.
 */
function createId(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

export default function App() {
  const { user } = useAuth();

  // Estado Principal
  const [products, setProducts] = useState<InvestmentProduct[]>(() => loadProducts());
  const [expenses, setExpenses] = useState<Expense[]>(() => loadExpenses());
  const [settings, setSettings] = useState<PlatformSettings>(() => normalizeSettings(loadSettings()));
  const [productTemplates, setProductTemplates] = useState<ProductTemplate[]>(() => loadProductTemplates());

  // Estado de sincronização com a nuvem
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  // Guarda o primeiro snapshot de cada coleção para fazer merge em vez de
  // sobrescrever os dados criados offline.
  const isInitialCloudLoad = useRef<{ products: boolean; expenses: boolean; templates: boolean }>({
    products: true,
    expenses: true,
    templates: true,
  });

  /** Envolve uma escrita na nuvem para que a falha chegue à interface. */
  const trackWrite = useCallback((promise: Promise<unknown>) => {
    promise
      .then(() => setSyncError(null))
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Falha ao sincronizar com a nuvem.';
        console.error('[Sync]', err);
        setSyncError(message);
      });
  }, []);

  // Aba selecionada
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'calendar' | 'products' | 'expenses' | 'simulator'>('dashboard');

  // Controle de Modais
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<InvestmentProduct | null>(null);
  const [initialProductDate, setInitialProductDate] = useState<string | undefined>(undefined);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const [initialExpenseDate, setInitialExpenseDate] = useState<string | undefined>(undefined);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Modais de Modelos de Produtos (Templates)
  const [isQuickLaunchOpen, setIsQuickLaunchOpen] = useState(false);
  const [quickLaunchTemplate, setQuickLaunchTemplate] = useState<ProductTemplate | null>(null);
  const [quickLaunchInitialDate, setQuickLaunchInitialDate] = useState<string | undefined>(undefined);
  const [isTemplatesManagerOpen, setIsTemplatesManagerOpen] = useState(false);

  // Sincronizar com localStorage para resiliência offline
  useEffect(() => {
    saveProducts(products);
  }, [products]);

  useEffect(() => {
    saveExpenses(expenses);
  }, [expenses]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveProductTemplates(productTemplates);
  }, [productTemplates]);

  // Sincronização em tempo real com Firebase Firestore quando autenticado
  useEffect(() => {
    if (!user) {
      isInitialCloudLoad.current = { products: true, expenses: true, templates: true };
      return;
    }

    setIsSyncing(true);
    setSyncError(null);

    /**
     * CORREÇÃO: no primeiro snapshot, itens que só existem localmente são
     * preservados e enviados para a nuvem. Antes, entrar com a conta Google
     * depois de usar o app offline apagava tudo o que havia sido criado — e
     * ainda sobrescrevia a cópia de resgate no localStorage.
     */
    const mergeWithLocal = <T extends { id: string }>(cloud: T[], local: T[]): { merged: T[]; localOnly: T[] } => {
      const cloudIds = new Set(cloud.map((item) => item.id));
      const localOnly = local.filter((item) => !cloudIds.has(item.id));
      return { merged: [...localOnly, ...cloud], localOnly };
    };

    // Escutar produtos da nuvem (Firebase é a fonte autoritativa)
    const unsubProducts = firestoreSync.subscribeProducts(user.uid, (cloudProducts) => {
      const { unique: uniqueCloudProds, duplicates: duplicateCloudProds } = deduplicateProducts(cloudProducts);

      // Se existirem duplicatas salvas no Firestore, remove do banco de dados
      if (duplicateCloudProds.length > 0) {
        console.log(`[Firebase Clean] Removendo ${duplicateCloudProds.length} produto(s) duplicado(s) do Firestore...`);
        for (const dup of duplicateCloudProds) {
          firestoreSync.deleteProduct(user.uid, dup.id).catch((err) => {
            console.error('[Firebase Clean] Erro ao deletar produto duplicado:', err);
          });
        }
      }

      let nextProducts = uniqueCloudProds;
      if (isInitialCloudLoad.current.products) {
        isInitialCloudLoad.current.products = false;
        const { merged, localOnly } = mergeWithLocal(uniqueCloudProds, loadProducts());
        nextProducts = merged;
        localOnly.forEach((p) => trackWrite(firestoreSync.saveProduct(user.uid, p)));
      }

      setProducts(nextProducts);
      saveProducts(nextProducts);
      setLastSyncTime(new Date());
      setIsSyncing(false);
    });

    // Escutar despesas da nuvem (Firebase é a fonte autoritativa)
    const unsubExpenses = firestoreSync.subscribeExpenses(user.uid, (cloudExpenses) => {
      const { unique: uniqueCloudExpenses, duplicates: duplicateCloudExpenses } = deduplicateExpenses(cloudExpenses);

      // Se existirem duplicatas salvas no Firestore, remove do banco de dados
      if (duplicateCloudExpenses.length > 0) {
        console.log(`[Firebase Clean] Removendo ${duplicateCloudExpenses.length} despesa(s) duplicada(s) do Firestore...`);
        for (const dup of duplicateCloudExpenses) {
          firestoreSync.deleteExpense(user.uid, dup.id).catch((err) => {
            console.error('[Firebase Clean] Erro ao deletar despesa duplicada:', err);
          });
        }
      }

      let nextExpenses = uniqueCloudExpenses;
      if (isInitialCloudLoad.current.expenses) {
        isInitialCloudLoad.current.expenses = false;
        const { merged, localOnly } = mergeWithLocal(uniqueCloudExpenses, loadExpenses());
        nextExpenses = merged;
        localOnly.forEach((e) => trackWrite(firestoreSync.saveExpense(user.uid, e)));
      }

      setExpenses(nextExpenses);
      saveExpenses(nextExpenses);
      setLastSyncTime(new Date());
    });

    // Escutar configurações da nuvem
    const unsubSettings = firestoreSync.subscribeSettings(
      user.uid,
      (cloudSettings) => {
        setSettings(normalizeSettings(cloudSettings));
        setLastSyncTime(new Date());
      },
      (err) => setSyncError(err.message)
    );

    // Escutar modelos de produtos da nuvem
    const unsubTemplates = firestoreSync.subscribeTemplates(user.uid, (cloudTemplates) => {
      const { unique: uniqueCloudTemplates, duplicates: duplicateCloudTemplates } = deduplicateTemplates(cloudTemplates);

      if (duplicateCloudTemplates.length > 0) {
        for (const dup of duplicateCloudTemplates) {
          firestoreSync.deleteTemplate(user.uid, dup.id).catch(console.error);
        }
      }

      let nextTemplates = uniqueCloudTemplates;
      if (isInitialCloudLoad.current.templates) {
        isInitialCloudLoad.current.templates = false;
        const { merged, localOnly } = mergeWithLocal(uniqueCloudTemplates, loadProductTemplates());
        nextTemplates = merged;
        localOnly.forEach((t) => trackWrite(firestoreSync.saveTemplate(user.uid, t)));
      }

      setProductTemplates(nextTemplates);
      saveProductTemplates(nextTemplates);
      setLastSyncTime(new Date());
    });

    return () => {
      unsubProducts();
      unsubExpenses();
      unsubSettings();
      unsubTemplates();
    };
  }, [user, trackWrite]);

  // Função para forçar sincronização manual dos dados atuais para a nuvem
  const handleManualSync = useCallback(async () => {
    if (!user) return;
    try {
      setIsSyncing(true);
      setSyncError(null);
      await firestoreSync.syncLocalToCloud(
        user.uid,
        products,
        expenses,
        settings,
        productTemplates,
        user.email || undefined
      );
      setLastSyncTime(new Date());
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Falha ao sincronizar com a nuvem.');
    } finally {
      setIsSyncing(false);
    }
  }, [user, products, expenses, settings, productTemplates]);

  // Cálculos agregados: considera produtos ativos e que ainda NÃO expiraram hoje
  const activeProducts = useMemo(() => {
    const today = getTodayString();
    return products.filter((p) => isProductActiveOnDate(p, today));
  }, [products]);

  const totalDailyYield = useMemo(() => {
    return activeProducts.reduce((sum, p) => sum + p.investedAmount * (p.dailyPercentage / 100), 0);
  }, [activeProducts]);

  const weightedAvgDailyRate = useMemo(() => {
    const totalInvested = activeProducts.reduce((sum, p) => sum + p.investedAmount, 0);
    if (totalInvested === 0) return 2.5;
    const weightedSum = activeProducts.reduce((sum, p) => sum + p.investedAmount * p.dailyPercentage, 0);
    return weightedSum / totalInvested;
  }, [activeProducts]);

  // Handlers para Produtos
  const handleOpenNewProduct = (date?: string) => {
    setProductToEdit(null);
    setInitialProductDate(date);
    setIsProductModalOpen(true);
  };

  const handleEditProduct = (product: InvestmentProduct) => {
    setProductToEdit(product);
    setInitialProductDate(undefined);
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = (product: InvestmentProduct) => {
    setProducts((prev) => {
      const idx = prev.findIndex((p) => p.id === product.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = product;
        return updated;
      }
      return [product, ...prev];
    });

    if (user) {
      trackWrite(firestoreSync.saveProduct(user.uid, product));
    }
  };

  const handleDeleteProduct = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    if (user) {
      trackWrite(firestoreSync.deleteProduct(user.uid, productId));
    }
  };

  /**
   * CORREÇÃO: a escrita no Firestore estava dentro do updater de `setState`.
   * Com `<StrictMode>`, o React 19 invoca os updaters duas vezes para expor
   * impureza — eram duas gravações por clique. O efeito colateral agora
   * acontece fora do updater.
   */
  const handleToggleProductStatus = useCallback((productId: string) => {
    let updated: InvestmentProduct | null = null;

    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        updated = { ...p, status: p.status === 'active' ? 'paused' : 'active' };
        return updated;
      })
    );

    if (user && updated) trackWrite(firestoreSync.saveProduct(user.uid, updated));
  }, [user, trackWrite]);

  const handleDuplicateProduct = (product: InvestmentProduct) => {
    const cloned: InvestmentProduct = {
      ...product,
      id: createId('prod'),
      name: `${product.name} (Reinvestimento)`,
      startDate: getTodayString(),
      status: 'active',
    };
    setProducts((prev) => [cloned, ...prev]);
    if (user) {
      trackWrite(firestoreSync.saveProduct(user.uid, cloned));
    }
  };

  // Handlers para Modelos de Produtos (Templates)
  const handleSaveTemplate = (template: ProductTemplate) => {
    setProductTemplates((prev) => {
      const idx = prev.findIndex((t) => t.id === template.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = template;
        return updated;
      }
      return [template, ...prev];
    });

    if (user) {
      trackWrite(firestoreSync.saveTemplate(user.uid, template));
    }
  };

  const handleDeleteTemplate = (templateId: string) => {
    setProductTemplates((prev) => prev.filter((t) => t.id !== templateId));
    if (user) {
      trackWrite(firestoreSync.deleteTemplate(user.uid, templateId));
    }
  };

  const handleOpenQuickLaunch = (template: ProductTemplate, initialDate?: string) => {
    setQuickLaunchTemplate(template);
    setQuickLaunchInitialDate(initialDate);
    setIsQuickLaunchOpen(true);
  };

  const handleLaunchProductFromTemplate = (newProduct: InvestmentProduct) => {
    handleSaveProduct(newProduct);
    setIsQuickLaunchOpen(false);
  };

  // Handlers para Despesas
  const handleOpenNewExpense = (date?: string) => {
    setExpenseToEdit(null);
    setInitialExpenseDate(date);
    setIsExpenseModalOpen(true);
  };

  const handleEditExpense = (expense: Expense) => {
    setExpenseToEdit(expense);
    setInitialExpenseDate(undefined);
    setIsExpenseModalOpen(true);
  };

  const handleSaveExpense = (expenseOrList: Expense | Expense[]) => {
    const listToSave = Array.isArray(expenseOrList) ? expenseOrList : [expenseOrList];
    setExpenses((prev) => {
      let updated = [...prev];
      for (const item of listToSave) {
        const idx = updated.findIndex((e) => e.id === item.id);
        if (idx >= 0) {
          updated[idx] = item;
        } else {
          updated = [item, ...updated];
        }
      }
      return updated;
    });

    if (user) {
      for (const item of listToSave) {
        trackWrite(firestoreSync.saveExpense(user.uid, item));
      }
    }
  };

  const handleDeleteExpense = (expenseId: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
    if (user) {
      trackWrite(firestoreSync.deleteExpense(user.uid, expenseId));
    }
  };

  const handleDeleteExpenseGroup = (groupId: string) => {
    const toDelete = expenses.filter((e) => e.installmentGroupId === groupId);
    setExpenses((prev) => prev.filter((e) => e.installmentGroupId !== groupId));
    if (user) {
      for (const item of toDelete) {
        trackWrite(firestoreSync.deleteExpense(user.uid, item.id));
      }
    }
  };

  const handleToggleExpensePaid = useCallback((expenseId: string) => {
    let updated: Expense | null = null;

    setExpenses((prev) =>
      prev.map((e) => {
        if (e.id !== expenseId) return e;
        updated = { ...e, isPaid: !e.isPaid, paidDate: !e.isPaid ? getTodayString() : undefined };
        return updated;
      })
    );

    if (user && updated) trackWrite(firestoreSync.saveExpense(user.uid, updated));
  }, [user, trackWrite]);

  // Atualização rápida de meta
  /** Ponto único de gravação das configurações, local e na nuvem. */
  const persistSettings = useCallback(
    (next: PlatformSettings) => {
      const normalized = normalizeSettings(next);
      setSettings(normalized);
      if (user) {
        trackWrite(firestoreSync.saveSettings(user.uid, normalized, user.email || undefined));
      }
    },
    [user, trackWrite]
  );

  const handleUpdateGoal = useCallback(
    (newGoal: number) => persistSettings({ ...settings, dailyGoalAmount: newGoal }),
    [settings, persistSettings]
  );

  const handleResetGoalCycle = useCallback(
    (newGoalAmount: number, newStartDate: string) =>
      persistSettings({ ...settings, dailyGoalAmount: newGoalAmount, goalCycleStartDate: newStartDate }),
    [settings, persistSettings]
  );

  const handleSetRoadmapStartDate = useCallback(
    (startDate: string | undefined) =>
      persistSettings({ ...settings, goalCycleStartDate: startDate }),
    [settings, persistSettings]
  );

  const handleCompleteRoadmapDay = useCallback(
    (details: RoadmapPointDetails) => {
      const date = details.date;

      // 1. Se o dia tinha despesas, marca como pagas
      const expensesToPay = details.expensesTodayList.filter((e) => !e.isPaid);
      if (expensesToPay.length > 0) {
        setExpenses((prev) => {
          const idsToPay = new Set(expensesToPay.map((e) => e.id));
          return prev.map((e) => {
            if (idsToPay.has(e.id)) {
              const updated = { ...e, isPaid: true, paidDate: date };
              if (user) {
                trackWrite(firestoreSync.saveExpense(user.uid, updated));
              }
              return updated;
            }
            return e;
          });
        });
      }

      // 2. Se houve novas aquisições planejadas para este dia, adiciona aos meus produtos
      const acquisitions = details.acquisitionsToday ?? details.newPurchasesToday ?? [];
      if (acquisitions.length > 0) {
        const newProducts: InvestmentProduct[] = acquisitions.map((acq) => ({
          id: createId('prod'),
          name: acq.name,
          investedAmount: acq.investedAmount,
          dailyPercentage: acq.dailyPercentage,
          durationDays: acq.durationDays,
          startDate: date,
          status: 'active' as const,
          returnCapitalAtEnd: acq.returnCapitalAtEnd ?? false,
          category: 'Reinvestimento do Roadmap',
          notes: `Adquirido via conclusão do Roadmap no Dia ${details.day} (${details.dateFormatted})`,
        }));

        setProducts((prev) => [...newProducts, ...prev]);

        if (user) {
          for (const np of newProducts) {
            trackWrite(firestoreSync.saveProduct(user.uid, np));
          }
        }
      }

      // 3. Marca a data como concluída em settings.completedRoadmapDays
      const currentCompleted = settings.completedRoadmapDays || [];
      if (!currentCompleted.includes(date)) {
        persistSettings({
          ...settings,
          completedRoadmapDays: [...currentCompleted, date],
        });
      }
    },
    [settings, user, trackWrite, persistSettings]
  );

  const handleUndoCompleteRoadmapDay = useCallback(
    (date: string) => {
      const currentCompleted = settings.completedRoadmapDays || [];
      if (currentCompleted.includes(date)) {
        persistSettings({
          ...settings,
          completedRoadmapDays: currentCompleted.filter((d) => d !== date),
        });
      }
    },
    [settings, persistSettings]
  );

  const handleQuickCreateProduct = (partialProduct: Partial<InvestmentProduct>) => {
    const newProd: InvestmentProduct = {
      id: createId('prod'),
      name: partialProduct.name || 'Novo Plano de Meta',
      investedAmount: partialProduct.investedAmount || 1000,
      dailyPercentage: partialProduct.dailyPercentage || 2.5,
      durationDays: partialProduct.durationDays || 30,
      startDate: getTodayString(),
      returnCapitalAtEnd: partialProduct.returnCapitalAtEnd ?? true,
      category: partialProduct.category || 'Meta Simulada',
      status: 'active',
      notes: 'Criado a partir da simulação de meta diária',
    };
    setProducts((prev) => [newProd, ...prev]);
    if (user) {
      trackWrite(firestoreSync.saveProduct(user.uid, newProd));
    }
    setCurrentTab('products');
  };

  // Restaurar dados
  const handleResetData = () => {
    if (confirm('Deseja restaurar todos os dados para os exemplos padrão? Todas as alterações manuais serão resetadas.')) {
      const { settings: s, products: p, expenses: e, templates: t } = resetToDefaults();
      setSettings(normalizeSettings(s));
      setProducts(p);
      setExpenses(e);
      setProductTemplates(t);
      if (user) {
        trackWrite(firestoreSync.syncLocalToCloud(user.uid, p, e, s, t, user.email || undefined));
      }
      setIsSettingsModalOpen(false);
    }
  };

  const handleDataImported = () => {
    const p = loadProducts();
    const e = loadExpenses();
    const s = normalizeSettings(loadSettings());
    const t = loadProductTemplates();
    setProducts(p);
    setExpenses(e);
    setSettings(s);
    setProductTemplates(t);
    if (user) {
      trackWrite(firestoreSync.syncLocalToCloud(user.uid, p, e, s, t, user.email || undefined));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Cloud Sync Notification & Login Bar */}
      <CloudSyncBar
        isSyncing={isSyncing}
        lastSyncTime={lastSyncTime}
        syncError={syncError}
        onManualSync={handleManualSync}
        onDismissError={() => setSyncError(null)}
      />

      {/* Top App Header with Nav and Actions */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        settings={settings}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenNewProduct={() => handleOpenNewProduct()}
        onOpenNewExpense={() => handleOpenNewExpense()}
        totalDailyYield={totalDailyYield}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Daily Goal Banner Always Visible on Top */}
        <GoalBanner
          currentDailyYield={totalDailyYield}
          settings={settings}
          onUpdateGoal={handleUpdateGoal}
          weightedAvgDailyRate={weightedAvgDailyRate}
        />

        {/* Tab Views */}
        {currentTab === 'dashboard' && (
          <DashboardOverview
            products={products}
            expenses={expenses}
            settings={settings}
            templates={productTemplates}
            onNavigateTab={setCurrentTab}
            onSelectExpense={(exp) => {
              setCurrentTab('expenses');
              handleEditExpense(exp);
            }}
            onOpenNewProduct={() => handleOpenNewProduct()}
            onOpenNewExpense={() => handleOpenNewExpense()}
            onResetGoalCycle={handleResetGoalCycle}
            onSetRoadmapStartDate={handleSetRoadmapStartDate}
            onCompleteRoadmapDay={handleCompleteRoadmapDay}
            onUndoCompleteRoadmapDay={handleUndoCompleteRoadmapDay}
          />
        )}

        {currentTab === 'calendar' && (
          <CalendarView
            products={products}
            expenses={expenses}
            settings={settings}
            onOpenNewExpense={handleOpenNewExpense}
            onOpenNewProduct={handleOpenNewProduct}
            onSelectExpense={(exp) => {
              setCurrentTab('expenses');
              handleEditExpense(exp);
            }}
            onSetRoadmapStartDate={handleSetRoadmapStartDate}
          />
        )}

        {currentTab === 'products' && (
          <ProductsList
            products={products}
            settings={settings}
            templates={productTemplates}
            onOpenNewProduct={() => handleOpenNewProduct()}
            onEditProduct={handleEditProduct}
            onDeleteProduct={handleDeleteProduct}
            onToggleStatus={handleToggleProductStatus}
            onDuplicateProduct={handleDuplicateProduct}
            onOpenTemplatesManager={() => setIsTemplatesManagerOpen(true)}
            onQuickLaunchTemplate={handleOpenQuickLaunch}
            onSaveTemplate={handleSaveTemplate}
          />
        )}

        {currentTab === 'expenses' && (
          <ExpensesList
            expenses={expenses}
            products={products}
            settings={settings}
            onOpenNewExpense={() => handleOpenNewExpense()}
            onEditExpense={handleEditExpense}
            onDeleteExpense={handleDeleteExpense}
            onDeleteExpenseGroup={handleDeleteExpenseGroup}
            onTogglePaid={handleToggleExpensePaid}
          />
        )}

        {currentTab === 'simulator' && (
          <GoalSimulator
            currentDailyYield={totalDailyYield}
            settings={settings}
            onApplyNewGoal={handleUpdateGoal}
            onQuickCreateProduct={handleQuickCreateProduct}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 mt-12 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>
            <strong className="text-slate-700 dark:text-slate-300">RendimentoPro</strong> • Plataforma de Gestão de Investimentos & Metas Diárias
          </span>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Taxa por Saque Atual: <strong className="text-slate-700 dark:text-slate-300">{settings.withdrawalFeePercentage}%</strong></span>
            <span>•</span>
            <span>Meta Diária: <strong className="text-slate-700 dark:text-slate-300">R$ {settings.dailyGoalAmount.toFixed(2)}/dia</strong></span>
            <span>•</span>
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
            >
              Ajustar Taxas
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onSave={handleSaveProduct}
        productToEdit={productToEdit}
        settings={settings}
        initialDate={initialProductDate}
        templates={productTemplates}
        onSaveTemplate={handleSaveTemplate}
        onOpenTemplatesManager={() => setIsTemplatesManagerOpen(true)}
      />

      <QuickLaunchModal
        isOpen={isQuickLaunchOpen}
        onClose={() => {
          setIsQuickLaunchOpen(false);
          setQuickLaunchTemplate(null);
        }}
        template={quickLaunchTemplate}
        settings={settings}
        onLaunch={handleLaunchProductFromTemplate}
        initialDate={quickLaunchInitialDate}
      />

      <TemplateManagementModal
        isOpen={isTemplatesManagerOpen}
        onClose={() => setIsTemplatesManagerOpen(false)}
        templates={productTemplates}
        settings={settings}
        onSaveTemplate={handleSaveTemplate}
        onDeleteTemplate={handleDeleteTemplate}
        onQuickLaunchTemplate={(tpl) => {
          setIsTemplatesManagerOpen(false);
          handleOpenQuickLaunch(tpl);
        }}
      />

      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSave={handleSaveExpense}
        expenseToEdit={expenseToEdit}
        initialDate={initialExpenseDate}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={persistSettings}
        onResetData={handleResetData}
        onDataImported={handleDataImported}
      />
    </div>
  );
}
