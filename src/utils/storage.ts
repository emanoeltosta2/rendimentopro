import { InvestmentProduct, Expense, PlatformSettings, ProductTemplate } from '../types/investment';

const STORAGE_KEYS = {
  PRODUCTS: 'rendimentopro_products_v1',
  EXPENSES: 'rendimentopro_expenses_v1',
  SETTINGS: 'rendimentopro_settings_v1',
  TEMPLATES: 'rendimentopro_templates_v1',
};

export const DEFAULT_SETTINGS: PlatformSettings = {
  withdrawalFeePercentage: 5.0, // 5% por saque
  fixedWithdrawalFee: 0,
  minWithdrawalAmount: 50.0,
  minDepositAmount: 50.0, // Depósito mínimo padrão (R$ 50,00)
  dailyGoalAmount: 150.0, // Meta padrão de R$ 150,00 ao dia
  reinvestmentBufferPercentage: 20, // 20% reservado para reinvestimento
  dynamicBufferEnabled: true, // Buffer de Reinvestimento Protegido Dinâmico ativado
  protectionProfile: 'balanced', // Perfil de proteção equilibrado
};

export const DEFAULT_PRODUCT_TEMPLATES: ProductTemplate[] = [
  {
    id: 'tpl-nw4050',
    name: 'NW4050',
    investedAmount: 50,
    returnAmount: 160,
    returnType: 'total',
    dailyPercentage: 20,
    durationDays: 16,
    returnCapitalAtEnd: false,
    category: 'Robô / Arbitragem',
    notes: 'Plano NW4050 de 16 dias com 20% ao dia',
  },
  {
    id: 'tpl-nw354',
    name: 'NW354',
    investedAmount: 25,
    returnAmount: 80,
    returnType: 'total',
    dailyPercentage: 20,
    durationDays: 16,
    returnCapitalAtEnd: false,
    category: 'Robô / Arbitragem',
    notes: 'Plano NW354 de 16 dias com 20% ao dia',
  },
  {
    id: 'tpl-vip-100',
    name: 'Robô VIP 100',
    investedAmount: 100,
    returnAmount: 320,
    returnType: 'total',
    dailyPercentage: 20,
    durationDays: 16,
    returnCapitalAtEnd: false,
    category: 'Robô / Arbitragem',
    notes: 'Plano com aporte de R$ 100,00 gerando R$ 20/dia',
  },
];

export function getDefaultProducts(): InvestmentProduct[] {
  return [];
}

export function getDefaultExpenses(): Expense[] {
  return [];
}

export function getDefaultProductTemplates(): ProductTemplate[] {
  return DEFAULT_PRODUCT_TEMPLATES;
}

export function loadSettings(): PlatformSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.error('Erro ao carregar configurações:', err);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: PlatformSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error('Erro ao salvar configurações:', err);
  }
}

// Helpers de Desduplicação
export function deduplicateProducts(products: InvestmentProduct[]): { unique: InvestmentProduct[]; duplicates: InvestmentProduct[] } {
  const unique: InvestmentProduct[] = [];
  const duplicates: InvestmentProduct[] = [];
  const seen = new Set<string>();

  for (const p of products) {
    const nameClean = (p.name || '').trim().toLowerCase();
    const investedVal = Number(p.investedAmount) || 0;
    const startDateStr = (p.startDate || '').trim();
    const dailyPct = Number(p.dailyPercentage) || 0;
    const duration = Number(p.durationDays) || 0;
    const statusStr = (p.status || 'active').trim().toLowerCase();

    const key = `${nameClean}_${investedVal}_${startDateStr}_${dailyPct}_${duration}_${statusStr}`;

    if (seen.has(key)) {
      duplicates.push(p);
    } else {
      seen.add(key);
      unique.push(p);
    }
  }
  return { unique, duplicates };
}

export function deduplicateExpenses(expenses: Expense[]): { unique: Expense[]; duplicates: Expense[] } {
  const unique: Expense[] = [];
  const duplicates: Expense[] = [];
  const seen = new Set<string>();

  for (const e of expenses) {
    const titleClean = (e.title || '').trim().toLowerCase();
    const amountVal = Number(e.amount) || 0;
    const catClean = (e.category || 'Outros').trim().toLowerCase();
    const dueDateStr = e.dueDate ? e.dueDate.trim() : 'nodate';
    const paidDateStr = e.paidDate ? e.paidDate.trim() : 'nopaid';
    const isPaidStr = Boolean(e.isPaid) ? 'paid' : 'unpaid';
    const instNumStr = e.installmentNumber ? `inst_${e.installmentNumber}` : 'noinst';

    const key = `${titleClean}_${amountVal}_${catClean}_${dueDateStr}_${isPaidStr}_${paidDateStr}_${instNumStr}`;

    if (seen.has(key)) {
      duplicates.push(e);
    } else {
      seen.add(key);
      unique.push(e);
    }
  }
  return { unique, duplicates };
}

export function deduplicateTemplates(templates: ProductTemplate[]): { unique: ProductTemplate[]; duplicates: ProductTemplate[] } {
  const unique: ProductTemplate[] = [];
  const duplicates: ProductTemplate[] = [];
  const seen = new Set<string>();

  for (const t of templates) {
    const key = `${(t.name || '').trim().toLowerCase()}_${t.investedAmount}_${t.dailyPercentage}_${t.durationDays}`;
    if (seen.has(key)) {
      duplicates.push(t);
    } else {
      seen.add(key);
      unique.push(t);
    }
  }
  return { unique, duplicates };
}

export function loadProducts(): InvestmentProduct[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Se continha apenas os dados de exemplo gerados inicialmente (prod-1, prod-2, prod-3), limpa
        const isMockOnly = parsed.length > 0 && parsed.every(p => ['prod-1', 'prod-2', 'prod-3'].includes(p.id));
        if (isMockOnly) {
          saveProducts([]);
          return [];
        }
        const { unique } = deduplicateProducts(parsed);
        return unique;
      }
    }
  } catch (err) {
    console.error('Erro ao carregar produtos:', err);
  }
  return [];
}

export function saveProducts(products: InvestmentProduct[]): void {
  try {
    const { unique } = deduplicateProducts(products);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(unique));
  } catch (err) {
    console.error('Erro ao salvar produtos:', err);
  }
}

export function loadExpenses(): Expense[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const isMockOnly = parsed.length > 0 && parsed.every(e => ['exp-1', 'exp-2', 'exp-3'].includes(e.id));
        if (isMockOnly) {
          saveExpenses([]);
          return [];
        }
        const { unique } = deduplicateExpenses(parsed);
        return unique;
      }
    }
  } catch (err) {
    console.error('Erro ao carregar despesas:', err);
  }
  return [];
}

export function saveExpenses(expenses: Expense[]): void {
  try {
    const { unique } = deduplicateExpenses(expenses);
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(unique));
  } catch (err) {
    console.error('Erro ao salvar despesas:', err);
  }
}

export function loadProductTemplates(): ProductTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const { unique } = deduplicateTemplates(parsed);
        return unique;
      }
    }
  } catch (err) {
    console.error('Erro ao carregar modelos de produtos:', err);
  }
  return DEFAULT_PRODUCT_TEMPLATES;
}

export function saveProductTemplates(templates: ProductTemplate[]): void {
  try {
    const { unique } = deduplicateTemplates(templates);
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(unique));
  } catch (err) {
    console.error('Erro ao salvar modelos de produtos:', err);
  }
}

// Exportar todos os dados para JSON para backup
export function exportDataAsJSON(): string {
  const payload = {
    settings: loadSettings(),
    products: loadProducts(),
    expenses: loadExpenses(),
    templates: loadProductTemplates(),
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(payload, null, 2);
}

// Importar dados de arquivo JSON
export function importDataFromJSON(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    if (data.settings) saveSettings(data.settings);
    if (data.products && Array.isArray(data.products)) saveProducts(data.products);
    if (data.expenses && Array.isArray(data.expenses)) saveExpenses(data.expenses);
    if (data.templates && Array.isArray(data.templates)) saveProductTemplates(data.templates);
    return true;
  } catch (err) {
    console.error('Falha ao importar JSON:', err);
    return false;
  }
}

// Resetar para dados padrão
export function resetToDefaults(): {
  settings: PlatformSettings;
  products: InvestmentProduct[];
  expenses: Expense[];
  templates: ProductTemplate[];
} {
  const settings = DEFAULT_SETTINGS;
  const products = getDefaultProducts();
  const expenses = getDefaultExpenses();
  const templates = getDefaultProductTemplates();
  saveSettings(settings);
  saveProducts(products);
  saveExpenses(expenses);
  saveProductTemplates(templates);
  return { settings, products, expenses, templates };
}
