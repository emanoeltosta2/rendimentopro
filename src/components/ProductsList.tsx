import React, { useState } from 'react';
import { 
  PlusCircle, 
  Layers, 
  Edit3, 
  Trash2, 
  Copy, 
  Play, 
  Pause, 
  Search,
  BookmarkPlus,
  Rocket,
  Sparkles,
  RotateCw,
  Star
} from 'lucide-react';
import { InvestmentProduct, PlatformSettings, ProductTemplate } from '../types/investment';
import { 
  formatCurrency, 
  formatPercent, 
  calculateProductMetrics, 
  formatDateBR,
  getTodayString,
  isProductActiveOnDate,
  formatPercentBR,
} from '../utils/calculations';
import { createId } from '../utils/id';

interface ProductsListProps {
  products: InvestmentProduct[];
  settings: PlatformSettings;
  templates?: ProductTemplate[];
  onOpenNewProduct: () => void;
  onEditProduct: (product: InvestmentProduct) => void;
  onDeleteProduct: (productId: string) => void;
  onToggleStatus: (productId: string) => void;
  onDuplicateProduct: (product: InvestmentProduct) => void;
  onOpenTemplatesManager?: () => void;
  onQuickLaunchTemplate?: (template: ProductTemplate) => void;
  onSaveTemplate?: (template: ProductTemplate) => void;
}

export const ProductsList: React.FC<ProductsListProps> = ({
  products,
  settings,
  templates = [],
  onOpenNewProduct,
  onEditProduct,
  onDeleteProduct,
  onToggleStatus,
  onDuplicateProduct,
  onOpenTemplatesManager,
  onQuickLaunchTemplate,
  onSaveTemplate,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'paused'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtragem inteligente que leva em consideração expiração da data
  const today = getTodayString();

  const filteredProducts = products.filter((p) => {
    const isAct = isProductActiveOnDate(p, today);
    const isExpiredOrDone = p.status === 'completed' || !isAct && p.status === 'active';

    let matchesStatus = true;
    if (filterStatus === 'active') {
      matchesStatus = isAct;
    } else if (filterStatus === 'completed') {
      matchesStatus = isExpiredOrDone;
    } else if (filterStatus === 'paused') {
      matchesStatus = p.status === 'paused';
    }

    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Bar with Title, Search & Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Layers className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold font-display text-slate-900 dark:text-slate-100">
              Produtos de investimento
            </h2>
            <span className="text-xs px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold rounded-full border border-emerald-200/60 dark:border-emerald-800">
              {products.length} contrato(s)
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Acompanhe o rendimento diário, retorno bruto e lucro líquido de cada plano contratado
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative min-w-[180px]">
            <Search className="h-4 w-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar produto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-emerald-600 dark:focus:border-emerald-500 focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs border border-slate-200/60 dark:border-slate-700">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                filterStatus === 'all' 
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs font-semibold' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                filterStatus === 'active' 
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs font-bold' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Ativos
            </button>
            <button
              onClick={() => setFilterStatus('paused')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                filterStatus === 'paused' 
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs font-semibold' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Pausados
            </button>
            <button
              onClick={() => setFilterStatus('completed')}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                filterStatus === 'completed' 
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs font-bold' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Expirados
            </button>
          </div>

          {/* Gerenciar Modelos de Catálogo */}
          {onOpenTemplatesManager && (
            <button
              onClick={onOpenTemplatesManager}
              className="px-3 py-2 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Acessar catálogo de produtos pré-cadastrados"
            >
              <BookmarkPlus className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>Catálogo ({templates.length})</span>
            </button>
          )}

          {/* Add Product Button */}
          <button
            onClick={onOpenNewProduct}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Novo produto</span>
          </button>
        </div>
      </div>

      {/* QUICK LAUNCH TEMPLATE CAROUSEL BANNER */}
      {templates.length > 0 && onQuickLaunchTemplate && (
        <div className="bg-gradient-to-r from-indigo-50/90 via-slate-50 to-emerald-50/80 dark:from-indigo-950/40 dark:via-slate-900 dark:to-emerald-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-display">
                Lançamento rápido a partir do catálogo
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
                (Clique para ativar um novo ciclo escolhendo apenas a data)
              </span>
            </div>
            {onOpenTemplatesManager && (
              <button
                onClick={onOpenTemplatesManager}
                className="text-xs font-bold text-indigo-700 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 hover:underline cursor-pointer"
              >
                + Cadastrar Novo Modelo
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {templates.slice(0, 4).map((tpl) => {
              const dailyYield = tpl.returnType === 'daily'
                ? (tpl.returnAmount || 0)
                : ((tpl.returnAmount || 0) / Math.max(1, tpl.durationDays));

              return (
                <div
                  key={tpl.id}
                  className="bg-white/95 dark:bg-slate-900/90 rounded-lg border border-indigo-100 dark:border-indigo-900/60 p-3 flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-xs transition-all"
                >
                  <div className="flex items-start justify-between mb-1.5">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 font-display">
                        {tpl.name}
                      </h4>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {tpl.durationDays} dias • {tpl.dailyPercentage}% / dia
                      </span>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200/50 dark:border-emerald-800/50">
                      +{formatCurrency(dailyYield)}/d
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-2 mt-1 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400">Aporte: <strong className="text-slate-900 dark:text-slate-200">{formatCurrency(tpl.investedAmount)}</strong></span>
                    <button
                      onClick={() => onQuickLaunchTemplate(tpl)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-[11px] font-bold rounded-md flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                    >
                      <Rocket className="h-3 w-3" />
                      <span>Ativar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <Layers className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Nenhum contrato encontrado</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            {searchQuery || filterStatus !== 'all'
              ? 'Tente ajustar os filtros ou a busca acima.'
              : 'Comece adicionando ou ativando seu primeiro produto de investimento da plataforma.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            {templates.length > 0 && onQuickLaunchTemplate && (
              <button
                onClick={() => onQuickLaunchTemplate(templates[0])}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Rocket className="h-4 w-4" />
                <span>Ativar {templates[0].name}</span>
              </button>
            )}
            <button
              onClick={onOpenNewProduct}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer"
            >
              Cadastrar novo produto
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProducts.map((product) => {
            const metrics = calculateProductMetrics(product, settings);

            return (
              <div
                key={product.id}
                className={`bg-white dark:bg-slate-900 rounded-xl border transition-all shadow-xs flex flex-col justify-between overflow-hidden ${
                  product.status === 'active'
                    ? 'border-slate-200/90 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 opacity-80'
                }`}
              >
                {/* Card Header */}
                <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base text-slate-900 dark:text-slate-100 font-display">
                          {product.name}
                        </span>
                        <span className="text-[10px] tracking-normal font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md">
                          {product.category || 'Geral'}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        Início: {formatDateBR(product.startDate)} • Término: {formatDateBR(metrics.endDate)}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      {metrics.isExpired ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          Expirado / concluído
                        </span>
                      ) : product.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Ativo ({metrics.daysRemaining}d restantes)
                        </span>
                      ) : product.status === 'paused' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          Pausado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          Concluído
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Main Metric Chips: Investido & Rendimento Diário */}
                  <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100/80 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block">
                        Capital investido
                      </span>
                      <div className="text-base font-bold text-slate-900 dark:text-slate-100 font-display">
                        {formatCurrency(product.investedAmount)}
                      </div>
                    </div>

                    <div>
                      <span className={`text-[10px] font-semibold block ${metrics.isExpired ? 'text-slate-400 dark:text-slate-500' : 'text-emerald-700 dark:text-emerald-400'}`}>
                        Rendimento Diário ({product.dailyPercentage}%)
                      </span>
                      <div className={`text-base font-bold font-display ${metrics.isExpired ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        +{formatCurrency(metrics.dailyYield)}
                        <span className="text-xs font-normal text-slate-400 dark:text-slate-500">/dia</span>
                      </div>
                      {metrics.isExpired && (
                        <span className="text-[10px] text-rose-500 dark:text-rose-400 font-semibold block">
                          Contrato expirado (não rende mais)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Body: Profit & Return Percentages */}
                <div className="p-4 sm:p-5 bg-slate-50/50 dark:bg-slate-950/40 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Retorno Bruto */}
                    <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-blue-100/80 dark:border-blue-900/50 shadow-2xs">
                      <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 tracking-normal block">
                        Retorno bruto
                      </span>
                      <div className="text-lg font-extrabold text-blue-800 dark:text-blue-300 font-display">
                        {formatPercent(metrics.grossReturnPercentage, 1)}
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Total: {formatCurrency(metrics.grossReturnAmount)}
                      </span>
                    </div>

                    {/* Lucro Líquido Real (com taxa de saque abatida) */}
                    <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-teal-100/80 dark:border-teal-900/50 shadow-2xs">
                      <span className="text-[10px] font-bold text-teal-700 dark:text-teal-400 tracking-normal block">
                        Lucro líquido real
                      </span>
                      <div className="text-lg font-extrabold text-teal-800 dark:text-teal-300 font-display">
                        {formatPercent(metrics.netProfitPercentage, 1)}
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Lucro: {metrics.netProfitAmount >= 0 ? '+' : ''}{formatCurrency(metrics.netProfitAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Info details & Progress Bar */}
                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span>
                        Duração: <strong className="text-slate-800 dark:text-slate-200">{product.durationDays} dias</strong> ({metrics.daysElapsed} decorridos • {metrics.daysRemaining} restantes)
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {formatPercentBR(metrics.progressPercentage, 0)}
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${metrics.progressPercentage}%` }}
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>
                        Payback: <strong className="text-slate-800 dark:text-slate-200">{metrics.paybackDays} dias</strong> para cobrir o aporte
                      </span>
                      <span className={product.returnCapitalAtEnd ? 'text-blue-700 dark:text-blue-400 font-medium' : 'text-slate-500 dark:text-slate-400'}>
                        {product.returnCapitalAtEnd ? 'Devolve o capital no final' : 'Capital amortizado no retorno'}
                      </span>
                    </div>

                    {settings.withdrawalFeePercentage > 0 && (
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">
                        Taxa de saque ({settings.withdrawalFeePercentage}%): deduzirá aprox. {formatCurrency(metrics.totalWithdrawalFee)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {/* Reativar / Novo Ciclo */}
                    {onQuickLaunchTemplate && (
                      <button
                        onClick={() => {
                          const tpl: ProductTemplate = {
                            id: createId('tpl'),
                            name: product.name,
                            investedAmount: product.investedAmount,
                            returnAmount: product.returnAmount,
                            returnType: product.returnType || 'total',
                            dailyPercentage: product.dailyPercentage,
                            durationDays: product.durationDays,
                            returnCapitalAtEnd: product.returnCapitalAtEnd,
                            category: product.category || 'Robô / Arbitragem',
                            notes: product.notes,
                          };
                          onQuickLaunchTemplate(tpl);
                        }}
                        title="Ativar novo ciclo deste contrato a partir de hoje"
                        className="px-2.5 py-1 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200/60 dark:border-emerald-800 text-xs font-bold rounded-md flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <RotateCw className="h-3.5 w-3.5" />
                        <span>Novo ciclo</span>
                      </button>
                    )}

                    {/* Salvar como Modelo se ainda não foi salvo */}
                    {onSaveTemplate && (
                      <button
                        onClick={() => {
                          const tpl: ProductTemplate = {
                            id: createId('tpl'),
                            name: product.name,
                            investedAmount: product.investedAmount,
                            returnAmount: product.returnAmount,
                            returnType: product.returnType || 'total',
                            dailyPercentage: product.dailyPercentage,
                            durationDays: product.durationDays,
                            returnCapitalAtEnd: product.returnCapitalAtEnd,
                            category: product.category || 'Robô / Arbitragem',
                            notes: product.notes,
                          };
                          onSaveTemplate(tpl);
                        }}
                        title="Salvar configurações deste produto no Catálogo de Modelos"
                        className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                      >
                        <Star className="h-4 w-4" />
                      </button>
                    )}

                    <button
                      onClick={() => onToggleStatus(product.id)}
                      title={product.status === 'active' ? 'Pausar rendimento' : 'Ativar rendimento'}
                      className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                    >
                      {product.status === 'active' ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      )}
                    </button>

                    <button
                      onClick={() => onDuplicateProduct(product)}
                      title="Duplicar / Reinvestir neste produto"
                      className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditProduct(product)}
                      title="Editar configurações do produto"
                      className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDeleteProduct(product.id)}
                      title="Excluir produto"
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

