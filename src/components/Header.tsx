import React from 'react';
import { 
  TrendingUp, 
  Settings as SettingsIcon, 
  Calendar as CalendarIcon, 
  PlusCircle, 
  Wallet, 
  Layers, 
  Receipt, 
  Calculator,
  Percent,
  Sun,
  Moon
} from 'lucide-react';
import { PlatformSettings } from '../types/investment';
import { formatCurrency } from '../utils/calculations';
import { useTheme } from '../context/ThemeContext';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  currentTab: 'dashboard' | 'calendar' | 'products' | 'expenses' | 'simulator';
  setCurrentTab: (tab: 'dashboard' | 'calendar' | 'products' | 'expenses' | 'simulator') => void;
  settings: PlatformSettings;
  onOpenSettings: () => void;
  onOpenNewProduct: () => void;
  onOpenNewExpense: () => void;
  totalDailyYield: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  settings,
  onOpenSettings,
  onOpenNewProduct,
  onOpenNewExpense,
  totalDailyYield,
}) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs transition-colors duration-200">
      {/* Top Banner / Brand */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Logo & Name */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
              <TrendingUp className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100 tracking-tight">
                  RendimentoPro
                </span>
                <span className="text-[9px] sm:text-[10px] font-semibold tracking-normal px-1.5 sm:px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-md border border-emerald-200/60 dark:border-emerald-800/60">
                  Gestão ativa
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden lg:block">
                Controle de rendimentos diários, taxa de saque e fluxo de despesas
              </p>
            </div>
          </div>

          {/* Quick Stats Badges & Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Daily Yield Quick Chip */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/80">
              <span className="text-xs text-slate-500 dark:text-slate-400">Rendimento hoje:</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalDailyYield)}/dia</span>
            </div>

            {/* PWA Install Button */}
            <PWAInstallButton variant="header" />

            {/* Withdrawal Fee Badge */}
            <button
              onClick={onOpenSettings}
              title="Clique para ajustar taxas da plataforma"
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-lg border border-amber-200/80 dark:border-amber-800/60 transition-colors cursor-pointer"
            >
              <Percent className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span>Taxa: <strong>{settings.withdrawalFeePercentage}%</strong></span>
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              id="btn-theme-toggle"
              title={isDark ? "Alternar para tema claro" : "Alternar para tema escuro"}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer border border-transparent dark:border-slate-700/60"
            >
              {isDark ? (
                <Sun className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-slate-600" />
              )}
            </button>

            {/* Quick Actions */}
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={onOpenNewProduct}
                id="btn-header-add-product"
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-sm transition-all cursor-pointer"
              >
                <PlusCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Novo produto</span>
                <span className="sm:hidden text-[11px]">Produto</span>
              </button>

              <button
                onClick={onOpenNewExpense}
                id="btn-header-add-expense"
                className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
              >
                <Receipt className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                <span className="hidden sm:inline">Nova despesa</span>
              </button>

              <button
                onClick={onOpenSettings}
                id="btn-header-settings"
                title="Configurações e Metas"
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <SettingsIcon className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation with smooth horizontal scrolling */}
        <div className="flex space-x-1 sm:space-x-2 border-t border-slate-100 dark:border-slate-800/80 overflow-x-auto py-2 scrollbar-none">
          <button
            onClick={() => setCurrentTab('dashboard')}
            id="tab-dashboard"
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              currentTab === 'dashboard'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Visão geral
          </button>

          <button
            onClick={() => setCurrentTab('products')}
            id="tab-products"
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              currentTab === 'products'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Meus produtos
          </button>

          <button
            onClick={() => setCurrentTab('calendar')}
            id="tab-calendar"
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              currentTab === 'calendar'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <CalendarIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Calendário
          </button>

          <button
            onClick={() => setCurrentTab('expenses')}
            id="tab-expenses"
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              currentTab === 'expenses'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Receipt className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Despesas
          </button>

          <button
            onClick={() => setCurrentTab('simulator')}
            id="tab-simulator"
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              currentTab === 'simulator'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Calculator className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Simulador
          </button>
        </div>
      </div>
    </header>
  );
};
