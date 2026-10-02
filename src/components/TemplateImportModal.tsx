import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  RefreshCw, 
  BookmarkPlus 
} from 'lucide-react';
import { ProductTemplate } from '../types/investment';
import { parseTemplatesFromJSON, parseTemplatesFromCSV } from '../utils/storage';
import { formatCurrency, formatPercentBR } from '../utils/calculations';
import { useModal } from '../hooks/useModal';

interface TemplateImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (templates: ProductTemplate[], mode: 'merge' | 'replace') => void;
  existingTemplatesCount: number;
}

export const TemplateImportModal: React.FC<TemplateImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  existingTemplatesCount,
}) => {
  const dialogRef = useModal(isOpen, onClose);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [inputTab, setInputTab] = useState<'file' | 'text'>('file');
  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);

  const [parsedTemplates, setParsedTemplates] = useState<ProductTemplate[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[] | null>(null);
  const [detectedFormat, setDetectedFormat] = useState<'json' | 'csv' | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen) return null;

  const handleReset = () => {
    setParsedTemplates(null);
    setParseError(null);
    setWarnings(null);
    setFileName(null);
    setFileSize(null);
    setRawText('');
    setDetectedFormat(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processContent = (content: string) => {
    setParseError(null);
    setWarnings(null);
    const trimmed = content.trim();

    if (!trimmed) {
      setParseError('O arquivo ou texto informado está vazio.');
      setParsedTemplates(null);
      return;
    }

    // Tenta primeiro como JSON se começar com '{' ou '['
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      const jsonRes = parseTemplatesFromJSON(trimmed);
      if (jsonRes.success && jsonRes.templates.length > 0) {
        setParsedTemplates(jsonRes.templates);
        setDetectedFormat('json');
        return;
      }
    }

    // Tenta como CSV
    const csvRes = parseTemplatesFromCSV(trimmed);
    if (csvRes.success && csvRes.templates.length > 0) {
      setParsedTemplates(csvRes.templates);
      setDetectedFormat('csv');
      if (csvRes.warnings && csvRes.warnings.length > 0) {
        setWarnings(csvRes.warnings);
      }
      return;
    }

    // Se ambos falharem, exibe o erro
    const fallbackJsonRes = parseTemplatesFromJSON(trimmed);
    setParseError(
      fallbackJsonRes.error ||
      csvRes.error ||
      'Formato não reconhecido. Certifique-se de enviar um arquivo JSON válido ou uma planilha CSV com cabeçalho de catálogo.'
    );
    setParsedTemplates(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setFileSize(`${(file.size / 1024).toFixed(1)} KB`);

    try {
      const text = await file.text();
      processContent(text);
    } catch (err) {
      setParseError(`Falha ao ler o arquivo: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setFileSize(`${(file.size / 1024).toFixed(1)} KB`);

    try {
      const text = await file.text();
      processContent(text);
    } catch (err) {
      setParseError(`Falha ao ler o arquivo: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setRawText(text);
    if (text.trim().length > 5) {
      processContent(text);
    } else {
      setParsedTemplates(null);
      setParseError(null);
    }
  };

  const handleConfirmImport = () => {
    if (!parsedTemplates || parsedTemplates.length === 0) return;
    onImport(parsedTemplates, importMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 overflow-hidden">
      <div 
        ref={dialogRef}
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[92vh] sm:max-h-[90vh] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-catalog-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-200/60 dark:border-indigo-800">
              <BookmarkPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 id="import-catalog-modal-title" className="text-base font-bold text-slate-900 dark:text-slate-100 font-display">
                Importar Catálogo de Produtos
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Carregue modelos de investimento via arquivo JSON ou planilha CSV
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

        {/* Content Body */}
        <div className="p-5 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
          {/* Seletor de Método: Arquivo vs Texto */}
          {!parsedTemplates && (
            <div className="flex border-b border-slate-200 dark:border-slate-800 pb-2 gap-2">
              <button
                type="button"
                onClick={() => setInputTab('file')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  inputTab === 'file'
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Carregar Arquivo (.json, .csv)</span>
              </button>
              <button
                type="button"
                onClick={() => setInputTab('text')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  inputTab === 'text'
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Colar Texto ou Código</span>
              </button>
            </div>
          )}

          {/* Área de Entrada */}
          {!parsedTemplates && (
            <>
              {inputTab === 'file' ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`p-8 border-2 border-dashed rounded-2xl text-center transition-all flex flex-col items-center justify-center gap-3 cursor-pointer ${
                    isDragging
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
                      : 'border-slate-300 dark:border-slate-700 hover:border-indigo-500 bg-slate-50/50 dark:bg-slate-800/30'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.csv,.txt"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="p-3 bg-indigo-100/80 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-full">
                    <BookmarkPlus className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Arraste e solte o arquivo do catálogo aqui, ou <span className="text-indigo-600 dark:text-indigo-400 underline">clique para procurar</span>
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Formatos aceitos: <strong>.json</strong> ou planilhas <strong>.csv</strong>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Cole o conteúdo JSON ou CSV do catálogo aqui:
                  </label>
                  <textarea
                    rows={8}
                    value={rawText}
                    onChange={handleTextChange}
                    placeholder={`Exemplo JSON:\n[\n  {\n    "name": "Robô VIP 100",\n    "investedAmount": 100,\n    "returnAmount": 160,\n    "dailyPercentage": 2.5,\n    "durationDays": 16,\n    "category": "Robô / Arbitragem"\n  }\n]`}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-slate-900 dark:text-slate-100"
                  />
                </div>
              )}
            </>
          )}

          {/* Erro de Parse */}
          {parseError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-800 dark:text-rose-200 flex items-start gap-2.5 text-xs">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Erro ao processar catálogo:</strong>
                <span>{parseError}</span>
              </div>
            </div>
          )}

          {/* SUCESSO: PREVIEW DOS MODELOS */}
          {parsedTemplates && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Resumo */}
              <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <div>
                    <div className="text-sm font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
                      <span>{parsedTemplates.length} modelo(s) reconhecido(s)</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-200/80 dark:bg-indigo-900/80 text-indigo-800 dark:text-indigo-200 uppercase tracking-wider">
                        {detectedFormat}
                      </span>
                    </div>
                    <div className="text-xs text-indigo-800/80 dark:text-indigo-300">
                      Prontos para adicionar ao catálogo do sistema
                      {fileName && ` • Arquivo: ${fileName} (${fileSize})`}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Trocar arquivo</span>
                </button>
              </div>

              {/* Avisos */}
              {warnings && warnings.length > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-900 dark:text-amber-200 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span>Avisos de processamento:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] pl-1">
                    {warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tabela de Modelos */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Pré-visualização dos modelos que serão importados:
                </label>
                <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 font-bold sticky top-0">
                        <th className="py-2 px-3">Modelo</th>
                        <th className="py-2 px-3">Valor da Cota</th>
                        <th className="py-2 px-3">Retorno Previsto</th>
                        <th className="py-2 px-3">% ao dia</th>
                        <th className="py-2 px-3">Duração</th>
                        <th className="py-2 px-3">Categoria</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {parsedTemplates.map((t, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[140px]">
                            {t.name}
                          </td>
                          <td className="py-2 px-3 font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            {formatCurrency(t.investedAmount)}
                          </td>
                          <td className="py-2 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {t.returnAmount ? formatCurrency(t.returnAmount) : '-'}
                          </td>
                          <td className="py-2 px-3 text-slate-700 dark:text-slate-300">
                            {formatPercentBR(t.dailyPercentage)}
                          </td>
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                            {t.durationDays} dias
                          </td>
                          <td className="py-2 px-3">
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {t.category || 'Geral'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modo de Importação */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Como aplicar ao catálogo existente?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setImportMode('merge')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                      importMode === 'merge'
                        ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Plus className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-xs">
                        Mesclar com o catálogo atual (Recomendado)
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Mantém os {existingTemplatesCount} modelos atuais e soma os {parsedTemplates.length} novos.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImportMode('replace')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                      importMode === 'replace'
                        ? 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/40 text-rose-950 dark:text-rose-200 ring-2 ring-rose-500/20'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <RefreshCw className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-xs">
                        Substituir catálogo inteiro
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Remove os {existingTemplatesCount} modelos existentes e deixa apenas os {parsedTemplates.length} importados.
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-200/70 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          
          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={!parsedTemplates || parsedTemplates.length === 0}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <BookmarkPlus className="h-3.5 w-3.5" />
            <span>
              {parsedTemplates && parsedTemplates.length > 0
                ? `Confirmar Importação (${parsedTemplates.length} modelos)`
                : 'Aguardando Arquivo...'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
