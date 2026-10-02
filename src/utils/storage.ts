import { InvestmentProduct, Expense, PlatformSettings, ProductTemplate } from '../types/investment';
import { createId } from './id';

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
  manualBankInjection: 0, // Aporte externo livre
  manualBankInjectionDate: undefined,
  manualProtectionInjection: 0, // Aporte externo para a blindagem
  manualProtectionInjectionDate: undefined,
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
    if (seen.has(p.id)) {
      duplicates.push(p);
      continue;
    }
    seen.add(p.id);
    unique.push(p);
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

// Exportar catálogo de modelos para JSON
export function exportTemplatesAsJSON(templates: ProductTemplate[], filename?: string): void {
  const payload = {
    type: 'rendimentopro_catalog',
    version: 1,
    exportedAt: new Date().toISOString(),
    count: templates.length,
    templates,
  };
  const jsonContent = JSON.stringify(payload, null, 2);
  const targetName = filename || `catalogo_produtos_rendimentopro_${new Date().toISOString().split('T')[0]}.json`;
  downloadFile(jsonContent, targetName, 'application/json');
}

// Exportar catálogo de modelos para CSV (compatível com Excel e Google Planilhas)
export function exportTemplatesAsCSV(templates: ProductTemplate[], filename?: string): void {
  const headers = [
    'ID',
    'Nome do Modelo',
    'Valor da Cota (R$)',
    'Retorno Previsto (R$)',
    'Tipo de Retorno',
    '% ao Dia',
    'Duração (Dias)',
    'Devolve Capital ao Fim',
    'Categoria',
    'Observações',
  ];

  const escapeCSV = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(';') || str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = templates.map((t) => [
    escapeCSV(t.id),
    escapeCSV(t.name),
    escapeCSV(t.investedAmount),
    escapeCSV(t.returnAmount ?? ''),
    escapeCSV(t.returnType ?? 'total'),
    escapeCSV(t.dailyPercentage),
    escapeCSV(t.durationDays),
    escapeCSV(t.returnCapitalAtEnd ? 'SIM' : 'NÃO'),
    escapeCSV(t.category ?? ''),
    escapeCSV(t.notes ?? ''),
  ]);

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
  const targetName = filename || `catalogo_produtos_rendimentopro_${new Date().toISOString().split('T')[0]}.csv`;
  downloadFile(csvContent, targetName, 'text/csv;charset=utf-8;');
}

// Parser e normalizador de catálogo (modelos de produtos) vindos de JSON
export function parseTemplatesFromJSON(jsonString: string): { success: boolean; templates: ProductTemplate[]; error?: string } {
  try {
    const data = JSON.parse(jsonString);
    let rawList: any[] = [];

    if (Array.isArray(data)) {
      rawList = data;
    } else if (data && typeof data === 'object') {
      if (Array.isArray(data.templates)) {
        rawList = data.templates;
      } else if (Array.isArray(data.models)) {
        rawList = data.models;
      } else if (Array.isArray(data.products)) {
        rawList = data.products;
      } else if (Array.isArray(data.items)) {
        rawList = data.items;
      } else {
        return { success: false, templates: [], error: 'O JSON não contém uma lista válida de modelos (esperado array ou campo "templates").' };
      }
    } else {
      return { success: false, templates: [], error: 'Formato de JSON inválido.' };
    }

    if (rawList.length === 0) {
      return { success: false, templates: [], error: 'A lista de modelos no arquivo JSON está vazia.' };
    }

    const templates: ProductTemplate[] = [];

    for (const item of rawList) {
      if (!item || typeof item !== 'object') continue;
      const name = String(item.name || '').trim();
      const rawInvested = item.investedAmount ?? item.invested ?? item.valor ?? item.cota;
      const investedAmount = typeof rawInvested === 'number'
        ? Math.max(0, rawInvested)
        : Math.max(0, parseFloat(String(rawInvested || '0').replace(',', '.')) || 0);

      if (!name && investedAmount <= 0) continue;

      const rawDuration = item.durationDays ?? item.duration ?? item.dias ?? item.prazo ?? 16;
      const durationDays = Math.max(1, parseInt(String(rawDuration), 10) || 16);

      const rawReturn = item.returnAmount ?? item.retorno;
      let returnAmount = typeof rawReturn === 'number'
        ? Math.max(0, rawReturn)
        : rawReturn ? Math.max(0, parseFloat(String(rawReturn).replace(',', '.')) || 0) : undefined;

      const returnType: 'total' | 'daily' = item.returnType === 'daily' ? 'daily' : 'total';

      const rawPct = item.dailyPercentage ?? item.dailyPercent ?? item.percentual;
      let dailyPercentage = typeof rawPct === 'number'
        ? Math.max(0, rawPct)
        : rawPct ? Math.max(0, parseFloat(String(rawPct).replace(',', '.')) || 0) : 0;

      // Se percentual não veio, calcula a partir de returnAmount e duração
      if (dailyPercentage <= 0 && returnAmount && returnAmount > 0 && investedAmount > 0) {
        const dailyYield = returnType === 'daily' ? returnAmount : returnAmount / durationDays;
        dailyPercentage = (dailyYield / investedAmount) * 100;
      }

      // Se returnAmount não veio, calcula a partir de dailyPercentage e duração
      if ((!returnAmount || returnAmount <= 0) && dailyPercentage > 0 && investedAmount > 0) {
        const dailyYield = investedAmount * (dailyPercentage / 100);
        returnAmount = returnType === 'daily' ? dailyYield : dailyYield * durationDays;
      }

      const returnCapitalAtEnd = Boolean(
        item.returnCapitalAtEnd === true ||
        String(item.returnCapitalAtEnd).toLowerCase() === 'sim' ||
        String(item.returnCapitalAtEnd).toLowerCase() === 'true' ||
        item.returnCapitalAtEnd === 1
      );

      templates.push({
        id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : createId('tpl'),
        name: name || 'Modelo Importado',
        investedAmount,
        returnAmount,
        returnType,
        dailyPercentage: Math.max(0.001, Number(dailyPercentage.toFixed(4))),
        durationDays,
        returnCapitalAtEnd,
        category: typeof item.category === 'string' && item.category.trim() ? item.category.trim() : 'Robô / Arbitragem',
        notes: typeof item.notes === 'string' && item.notes.trim() ? item.notes.trim() : undefined,
      });
    }

    if (templates.length === 0) {
      return { success: false, templates: [], error: 'Nenhum modelo válido pôde ser extraído do arquivo JSON.' };
    }

    return { success: true, templates };
  } catch (err) {
    return { success: false, templates: [], error: `Erro ao analisar JSON do catálogo: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// Parser e normalizador de catálogo vindos de CSV
export function parseTemplatesFromCSV(csvString: string): { success: boolean; templates: ProductTemplate[]; error?: string; warnings?: string[] } {
  try {
    if (!csvString || !csvString.trim()) {
      return { success: false, templates: [], error: 'O conteúdo CSV fornecido está vazio.' };
    }

    const cleanCSV = csvString.charCodeAt(0) === 0xFEFF ? csvString.slice(1) : csvString;
    const lines = parseCSVRows(cleanCSV);

    if (lines.length < 2) {
      return { success: false, templates: [], error: 'O arquivo CSV precisa conter pelo menos a linha de cabeçalho e um modelo.' };
    }

    const header = lines[0].map((h) => h.toLowerCase().trim());
    const findCol = (keywords: string[]): number => {
      return header.findIndex((col) =>
        keywords.some((kw) => col.includes(kw))
      );
    };

    const colName = findCol(['nome', 'name', 'modelo', 'produto', 'title']);
    const colInvested = findCol(['valor da cota', 'cota', 'valor investido', 'invested', 'investido', 'valor', 'amount']);
    const colReturn = findCol(['retorno', 'return', 'retorno previsto']);
    const colReturnType = findCol(['tipo de retorno', 'tipo retorno', 'returntype']);
    const colDailyPct = findCol(['% ao dia', 'dailypercentage', 'percentual', 'porcentagem', 'rendimento', '% diário', '% diario']);
    const colDuration = findCol(['duração', 'duracao', 'duration', 'dias', 'prazo']);
    const colReturnCap = findCol(['devolve capital', 'returncapital', 'capital no final', 'devolução']);
    const colCategory = findCol(['categoria', 'category']);
    const colNotes = findCol(['observações', 'observacoes', 'notes', 'notas']);
    const colId = findCol(['id']);

    if (colName === -1 && colInvested === -1) {
      return { success: false, templates: [], error: 'Cabeçalho CSV não reconhecido. Certifique-se de ter colunas como "Nome", "Valor da Cota", "% ao dia", "Duração", etc.' };
    }

    const templates: ProductTemplate[] = [];
    const warnings: string[] = [];

    for (let r = 1; r < lines.length; r++) {
      const row = lines[r];
      if (row.length === 0 || (row.length === 1 && !row[0].trim())) continue;

      const name = colName !== -1 && row[colName] ? row[colName].trim() : `Modelo ${r}`;

      const rawInvested = colInvested !== -1 && row[colInvested] ? row[colInvested].trim() : '0';
      const cleanInvested = rawInvested.replace(/[R$\s]/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.');
      const investedAmount = Math.max(0, parseFloat(cleanInvested) || 0);

      const rawDuration = colDuration !== -1 && row[colDuration] ? row[colDuration].trim() : '16';
      const durationDays = Math.max(1, parseInt(rawDuration, 10) || 16);

      const rawReturn = colReturn !== -1 && row[colReturn] ? row[colReturn].trim() : '';
      const cleanReturn = rawReturn.replace(/[R$\s]/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.');
      let returnAmount = cleanReturn ? Math.max(0, parseFloat(cleanReturn) || 0) : undefined;

      const rawReturnType = colReturnType !== -1 && row[colReturnType] ? row[colReturnType].toLowerCase().trim() : '';
      const returnType: 'total' | 'daily' = rawReturnType.includes('dia') || rawReturnType === 'daily' ? 'daily' : 'total';

      const rawPct = colDailyPct !== -1 && row[colDailyPct] ? row[colDailyPct].trim() : '0';
      const cleanPct = rawPct.replace(/[%]/g, '').replace(',', '.');
      let dailyPercentage = Math.max(0, parseFloat(cleanPct) || 0);

      if (dailyPercentage <= 0 && returnAmount && returnAmount > 0 && investedAmount > 0) {
        const dailyYield = returnType === 'daily' ? returnAmount : returnAmount / durationDays;
        dailyPercentage = (dailyYield / investedAmount) * 100;
      }

      if ((!returnAmount || returnAmount <= 0) && dailyPercentage > 0 && investedAmount > 0) {
        const dailyYield = investedAmount * (dailyPercentage / 100);
        returnAmount = returnType === 'daily' ? dailyYield : dailyYield * durationDays;
      }

      let returnCapitalAtEnd = false;
      if (colReturnCap !== -1 && row[colReturnCap]) {
        const val = row[colReturnCap].toLowerCase().trim();
        returnCapitalAtEnd = val === 'sim' || val === 's' || val === 'true' || val === '1';
      }

      const category = colCategory !== -1 && row[colCategory] ? row[colCategory].trim() : 'Robô / Arbitragem';
      const notes = colNotes !== -1 && row[colNotes] ? row[colNotes].trim() : undefined;
      const id = colId !== -1 && row[colId] && row[colId].trim() ? row[colId].trim() : createId('tpl');

      if (investedAmount <= 0 && (!name || name.startsWith('Modelo '))) {
        warnings.push(`Linha ${r + 1} ignorada por não possuir nome ou valor de cota válido.`);
        continue;
      }

      templates.push({
        id,
        name: name || 'Modelo',
        investedAmount,
        returnAmount,
        returnType,
        dailyPercentage: Math.max(0.001, Number(dailyPercentage.toFixed(4))),
        durationDays,
        returnCapitalAtEnd,
        category,
        notes,
      });
    }

    if (templates.length === 0) {
      return { success: false, templates: [], error: 'Nenhum modelo válido pôde ser importado do arquivo CSV.' };
    }

    return { success: true, templates, warnings: warnings.length > 0 ? warnings : undefined };
  } catch (err) {
    return { success: false, templates: [], error: `Erro ao processar CSV do catálogo: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// Helper para disparo de download de arquivo no navegador
export function downloadFile(content: string, filename: string, mimeType = 'application/json'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Exportar produtos para JSON
export function exportProductsAsJSON(products: InvestmentProduct[], filename?: string): void {
  const payload = {
    type: 'rendimentopro_products',
    version: 1,
    exportedAt: new Date().toISOString(),
    count: products.length,
    products,
  };
  const jsonContent = JSON.stringify(payload, null, 2);
  const targetName = filename || `produtos_rendimentopro_${new Date().toISOString().split('T')[0]}.json`;
  downloadFile(jsonContent, targetName, 'application/json');
}

// Exportar produtos para CSV (compatível com Excel e Google Planilhas)
export function exportProductsAsCSV(products: InvestmentProduct[], filename?: string): void {
  const headers = [
    'ID',
    'Nome',
    'Valor Investido (R$)',
    'Retorno (R$)',
    'Tipo de Retorno',
    '% ao Dia',
    'Duração (Dias)',
    'Data de Início',
    'Devolve Capital ao Fim',
    'Categoria',
    'Status',
    'Observações',
  ];

  const escapeCSV = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(';') || str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = products.map((p) => [
    escapeCSV(p.id),
    escapeCSV(p.name),
    escapeCSV(p.investedAmount),
    escapeCSV(p.returnAmount ?? ''),
    escapeCSV(p.returnType ?? ''),
    escapeCSV(p.dailyPercentage),
    escapeCSV(p.durationDays),
    escapeCSV(p.startDate),
    escapeCSV(p.returnCapitalAtEnd ? 'SIM' : 'NÃO'),
    escapeCSV(p.category ?? ''),
    escapeCSV(p.status ?? 'active'),
    escapeCSV(p.notes ?? ''),
  ]);

  // Adiciona BOM UTF-8 (\uFEFF) e separador ponto-e-vírgula (padrão Brasil/Excel)
  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
  const targetName = filename || `produtos_rendimentopro_${new Date().toISOString().split('T')[0]}.csv`;
  downloadFile(csvContent, targetName, 'text/csv;charset=utf-8;');
}

// Parser e normalizador de produtos vindos de JSON
export function parseProductsFromJSON(jsonString: string): { success: boolean; products: InvestmentProduct[]; error?: string } {
  try {
    const data = JSON.parse(jsonString);
    let rawList: any[] = [];

    if (Array.isArray(data)) {
      rawList = data;
    } else if (data && typeof data === 'object') {
      if (Array.isArray(data.products)) {
        rawList = data.products;
      } else if (Array.isArray(data.items)) {
        rawList = data.items;
      } else {
        return { success: false, products: [], error: 'O JSON não contém uma lista de produtos válida (esperado array ou campo "products").' };
      }
    } else {
      return { success: false, products: [], error: 'Formato de JSON inválido.' };
    }

    if (rawList.length === 0) {
      return { success: false, products: [], error: 'O arquivo JSON contém uma lista de produtos vazia.' };
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const products: InvestmentProduct[] = [];

    for (const item of rawList) {
      if (!item || typeof item !== 'object') continue;
      const name = String(item.name || '').trim();
      const rawInvested = item.investedAmount ?? item.invested ?? item.valor;
      const invested = typeof rawInvested === 'number' ? Math.max(0, rawInvested) : Math.max(0, parseFloat(String(rawInvested || '0').replace(',', '.')) || 0);

      // Pula registros totalmente vazios
      if (!name && invested <= 0) continue;

      const rawPct = item.dailyPercentage ?? item.dailyPercent ?? item.percentual;
      const dailyPercentage = typeof rawPct === 'number' ? Math.max(0, rawPct) : Math.max(0, parseFloat(String(rawPct || '0').replace(',', '.')) || 0);

      const rawDuration = item.durationDays ?? item.duration ?? item.dias ?? 30;
      const durationDays = Math.max(1, parseInt(String(rawDuration), 10) || 30);

      let startDate = todayStr;
      if (typeof item.startDate === 'string' && item.startDate.trim()) {
        const cleanedDate = item.startDate.trim().split('T')[0];
        if (/^\d{4}-\d{2}-\d{2}$/.test(cleanedDate)) {
          startDate = cleanedDate;
        }
      }

      const returnCapitalAtEnd = Boolean(
        item.returnCapitalAtEnd === true ||
        String(item.returnCapitalAtEnd).toLowerCase() === 'sim' ||
        String(item.returnCapitalAtEnd).toLowerCase() === 'true' ||
        item.returnCapitalAtEnd === 1
      );

      let status: InvestmentProduct['status'] = 'active';
      const rawStatus = String(item.status || '').toLowerCase().trim();
      if (rawStatus === 'paused' || rawStatus === 'pausado') status = 'paused';
      else if (rawStatus === 'completed' || rawStatus === 'expirado' || rawStatus === 'concluído' || rawStatus === 'concluido') status = 'completed';

      products.push({
        id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : createId('prod'),
        name: name || 'Investimento Importado',
        investedAmount: invested,
        returnAmount: typeof item.returnAmount === 'number' ? item.returnAmount : undefined,
        returnType: item.returnType === 'total' || item.returnType === 'daily' ? item.returnType : undefined,
        dailyPercentage,
        durationDays,
        startDate,
        returnCapitalAtEnd,
        category: typeof item.category === 'string' && item.category.trim() ? item.category.trim() : undefined,
        status,
        notes: typeof item.notes === 'string' && item.notes.trim() ? item.notes.trim() : undefined,
        isReinvestment: Boolean(item.isReinvestment),
        isNewInvestment: Boolean(item.isNewInvestment),
      });
    }

    if (products.length === 0) {
      return { success: false, products: [], error: 'Nenhum produto válido pôde ser extraído do arquivo JSON.' };
    }

    return { success: true, products };
  } catch (err) {
    return { success: false, products: [], error: `Erro ao analisar JSON: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// Parser e normalizador de produtos vindos de CSV
export function parseProductsFromCSV(csvString: string): { success: boolean; products: InvestmentProduct[]; error?: string; warnings?: string[] } {
  try {
    if (!csvString || !csvString.trim()) {
      return { success: false, products: [], error: 'O conteúdo CSV fornecido está vazio.' };
    }

    // Remove BOM se presente
    const cleanCSV = csvString.charCodeAt(0) === 0xFEFF ? csvString.slice(1) : csvString;
    const lines = parseCSVRows(cleanCSV);

    if (lines.length < 2) {
      return { success: false, products: [], error: 'O arquivo CSV precisa conter pelo menos a linha de cabeçalho e um produto.' };
    }

    const header = lines[0].map((h) => h.toLowerCase().trim());
    const findCol = (keywords: string[]): number => {
      return header.findIndex((col) =>
        keywords.some((kw) => col.includes(kw))
      );
    };

    const colName = findCol(['nome', 'name', 'produto', 'investimento', 'title']);
    const colInvested = findCol(['valor investido', 'invested', 'investido', 'valor', 'amount', 'preco', 'preço']);
    const colDailyPct = findCol(['% ao dia', 'dailypercentage', 'percentual', 'porcentagem', 'rendimento', '% diário', '% diario']);
    const colDuration = findCol(['duração', 'duracao', 'duration', 'dias', 'prazo']);
    const colStartDate = findCol(['início', 'inicio', 'startdate', 'data', 'data de início']);
    const colReturnCap = findCol(['devolve capital', 'returncapital', 'capital no final', 'devolução']);
    const colCategory = findCol(['categoria', 'category']);
    const colStatus = findCol(['status', 'estado']);
    const colNotes = findCol(['observações', 'observacoes', 'notes', 'notas', 'nota']);
    const colId = findCol(['id']);

    if (colName === -1 && colInvested === -1) {
      return { success: false, products: [], error: 'Cabeçalho CSV não reconhecido. Certifique-se de ter colunas como "Nome", "Valor Investido", "% ao dia", etc.' };
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const products: InvestmentProduct[] = [];
    const warnings: string[] = [];

    for (let r = 1; r < lines.length; r++) {
      const row = lines[r];
      if (row.length === 0 || (row.length === 1 && !row[0].trim())) continue;

      const name = colName !== -1 && row[colName] ? row[colName].trim() : `Produto ${r}`;
      
      const rawInvested = colInvested !== -1 && row[colInvested] ? row[colInvested].trim() : '0';
      const cleanInvested = rawInvested.replace(/[R$\s]/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.');
      const investedAmount = Math.max(0, parseFloat(cleanInvested) || 0);

      const rawPct = colDailyPct !== -1 && row[colDailyPct] ? row[colDailyPct].trim() : '0';
      const cleanPct = rawPct.replace(/[%]/g, '').replace(',', '.');
      const dailyPercentage = Math.max(0, parseFloat(cleanPct) || 0);

      const rawDuration = colDuration !== -1 && row[colDuration] ? row[colDuration].trim() : '30';
      const durationDays = Math.max(1, parseInt(rawDuration, 10) || 30);

      let startDate = todayStr;
      if (colStartDate !== -1 && row[colStartDate] && row[colStartDate].trim()) {
        const val = row[colStartDate].trim();
        // Converte DD/MM/YYYY para YYYY-MM-DD se necessário
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
          const [d, m, y] = val.split('/');
          startDate = `${y}-${m}-${d}`;
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
          startDate = val;
        }
      }

      let returnCapitalAtEnd = false;
      if (colReturnCap !== -1 && row[colReturnCap]) {
        const val = row[colReturnCap].toLowerCase().trim();
        returnCapitalAtEnd = val === 'sim' || val === 's' || val === 'true' || val === '1';
      }

      let status: InvestmentProduct['status'] = 'active';
      if (colStatus !== -1 && row[colStatus]) {
        const val = row[colStatus].toLowerCase().trim();
        if (val.includes('paus') || val === 'paused') status = 'paused';
        else if (val.includes('exp') || val.includes('conc') || val === 'completed') status = 'completed';
      }

      const category = colCategory !== -1 && row[colCategory] ? row[colCategory].trim() : undefined;
      const notes = colNotes !== -1 && row[colNotes] ? row[colNotes].trim() : undefined;
      const id = colId !== -1 && row[colId] && row[colId].trim() ? row[colId].trim() : createId('prod');

      if (investedAmount <= 0 && (!name || name.startsWith('Produto '))) {
        warnings.push(`Linha ${r + 1} ignorada por não possuir nome ou valor investido válido.`);
        continue;
      }

      products.push({
        id,
        name: name || 'Investimento',
        investedAmount,
        dailyPercentage,
        durationDays,
        startDate,
        returnCapitalAtEnd,
        category: category || undefined,
        status,
        notes: notes || undefined,
      });
    }

    if (products.length === 0) {
      return { success: false, products: [], error: 'Nenhum produto válido pôde ser importado do arquivo CSV.' };
    }

    return { success: true, products, warnings: warnings.length > 0 ? warnings : undefined };
  } catch (err) {
    return { success: false, products: [], error: `Erro ao processar CSV: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// Parser auxiliar para linhas de CSV com suporte a delimitadores e aspas
function parseCSVRows(csvText: string): string[][] {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  // Auto-detecta delimitador baseado na primeira linha (';', ',', ou '\t')
  const firstLine = csvText.split(/\r\n|\n|\r/)[0] || '';
  const countSemi = (firstLine.match(/;/g) || []).length;
  const countComma = (firstLine.match(/,/g) || []).length;
  const countTab = (firstLine.match(/\t/g) || []).length;
  const delimiter = countSemi >= countComma && countSemi >= countTab ? ';' : countTab > countComma ? '\t' : ',';

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++; // pula aspas escapadas
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentField.trim());
      if (currentRow.some((f) => f.length > 0)) {
        lines.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      lines.push(currentRow);
    }
  }

  return lines;
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

// Disparar download do backup completo em JSON
export function downloadFullBackupJSON(filename?: string): void {
  const json = exportDataAsJSON();
  const targetName = filename || `rendimentopro_backup_${new Date().toISOString().split('T')[0]}.json`;
  downloadFile(json, targetName, 'application/json');
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
