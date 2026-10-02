import React, { useState } from 'react';
import { 
  X, 
  Download, 
  FileJson, 
  FileSpreadsheet, 
  CheckCircle2, 
  BookmarkPlus 
} from 'lucide-react';
import { ProductTemplate } from '../types/investment';
import { exportTemplatesAsJSON, exportTemplatesAsCSV } from '../utils/storage';
import { getTodayString, formatCurrency, formatPercentBR } from '../utils/calculations';
import { useModal } from '../hooks/useModal';

interface TemplateExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: ProductTemplate[];
}

export const TemplateExportModal: React.FC<TemplateExportModalProps> = ({
  isOpen,
  onClose,
  templates,
}) => {
  const dialogRef = useModal(isOpen, onClose);
  const [format, setFormat] = useState<'json' | 'csv'>('json');
  const [exportedSuccess, setExportedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleExport = () => {
    const today = getTodayString();
    if (format === 'json') {
      exportTemplatesAsJSON(templates, `catalogo_produtos_${today}.json`);
    } else {
      exportTemplatesAsCSV(templates, `catalogo_produtos_${today}.csv`);
    }

    setExportedSuccess(true);
    setTimeout(() => {
      setExportedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 overflow-hidden">
      <div 
        ref={dialogRef}
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-template-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-200/60 dark:border-indigo-800">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <h2 id="export-template-modal-title" className="text-base font-bold text-slate-900 dark:text-slate-100 font-display">
                Exportar Catálogo de Produtos
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Baixe seus modelos de investimento para compartilhar ou fazer backup
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
          {/* Escolha do Formato */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Escolha o formato do arquivo:
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setFormat('json')}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1.5 transition-all cursor-pointer ${
                  format === 'json'
                    ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold">
                    <FileJson className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span>JSON</span>
                  </div>
                  {format === 'json' && <CheckCircle2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                  Ideal para backup fiel do catálogo e migração entre contas ou celulares.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setFormat('csv')}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1.5 transition-all cursor-pointer ${
                  format === 'csv'
                    ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold">
                    <FileSpreadsheet className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Planilha CSV</span>
                  </div>
                  {format === 'csv' && <CheckCircle2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                  Compatível com Microsoft Excel, Google Planilhas e LibreOffice.
                </p>
              </button>
            </div>
          </div>

          {/* Resumo */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookmarkPlus className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Modelos a exportar:
              </span>
            </div>
            <div className="text-right">
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {templates.length} modelo(s)
              </span>
            </div>
          </div>

          {/* Prévia dos Modelos do Catálogo */}
          {templates.length > 0 && (
            <div className="space-y-1.5">
              <span className="font-semibold text-slate-700 dark:text-slate-300 block text-[11px]">
                Itens incluídos no catálogo a exportar:
              </span>
              <div className="max-h-40 overflow-y-auto space-y-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-2.5 divide-y divide-slate-100 dark:divide-slate-800/60">
                {templates.map((tpl) => (
                  <div key={tpl.id} className="pt-1.5 first:pt-0 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {tpl.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                        {tpl.category || 'Geral'}
                      </span>
                    </div>
                    <div className="text-right text-slate-500 dark:text-slate-400 shrink-0 ml-2">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(tpl.investedAmount)}
                      </span>
                      <span className="mx-1">•</span>
                      <span>{formatPercentBR(tpl.dailyPercentage)}/dia</span>
                      <span className="mx-1">•</span>
                      <span>{tpl.durationDays}d</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {exportedSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-xl flex items-center gap-2 text-xs font-medium animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Download do catálogo iniciado com sucesso!</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-200/70 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={templates.length === 0}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Baixar Catálogo ({templates.length})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
