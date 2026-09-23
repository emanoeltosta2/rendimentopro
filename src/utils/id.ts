/**
 * Gerador de IDs únicos, compartilhado por todo o app.
 *
 * CORREÇÃO (Otimização de Código): vários pontos do app geravam ids apenas com
 * `` `prefixo-${Date.now()}` `` (ProductModal, ExpenseModal, QuickLaunchModal,
 * ProductsList, TemplateManagementModal). Dois registros criados no mesmo
 * milissegundo (ex.: duplo clique, criação em lote) recebiam o MESMO id,
 * causando: (a) colisão de `key` no React, (b) um documento sobrescrevendo o
 * outro no Firestore (que usa o id como nome do documento) e (c) merges de
 * sincronização silenciosamente perdendo um dos registros.
 *
 * `createId` resolve isso combinando o timestamp com uma parte aleatória de
 * alta entropia (`crypto.randomUUID` quando disponível, com fallback para
 * `Math.random`). Use esta função em vez de montar ids manualmente.
 */
export function createId(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}
