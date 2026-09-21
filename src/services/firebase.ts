import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut } from 'firebase/auth';
import { initializeFirestore, getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const databaseId =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? firebaseConfig.firestoreDatabaseId
    : undefined;

// Banco de dados Firestore com long-polling forçado para resiliência total em iframes, WebViews e proxies
let dbInstance;
try {
  dbInstance = initializeFirestore(
    app,
    {
      experimentalForceLongPolling: true,
    },
    databaseId
  );
} catch {
  dbInstance = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
}

export const db = dbInstance;
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Tipo de operação para logging e diagnóstico seguro de regras
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

/**
 * Erro de sincronização que preserva o código original do Firestore.
 *
 * CORREÇÃO: antes era lançado `new Error(JSON.stringify(errInfo))`, o que
 * serializava uid, e-mail e tenantId na mensagem e destruía a identidade do
 * erro — quem chamava não conseguia distinguir offline de permissão negada.
 */
export class SyncError extends Error {
  readonly code: string;
  readonly operationType: OperationType;
  readonly path: string | null;

  constructor(message: string, code: string, operationType: OperationType, path: string | null, cause?: unknown) {
    super(message);
    this.name = 'SyncError';
    this.code = code;
    this.operationType = operationType;
    this.path = path;
    if (cause !== undefined) (this as { cause?: unknown }).cause = cause;
  }
}

/** Códigos do Firestore que indicam indisponibilidade temporária, não falha real. */
const OFFLINE_CODES = new Set(['unavailable', 'deadline-exceeded', 'cancelled']);

/**
 * CORREÇÃO: a detecção de offline era feita por substring da mensagem, que é
 * detalhe de implementação do SDK e muda entre versões.
 */
export function isOfflineError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  if (typeof code === 'string') return OFFLINE_CODES.has(code.replace(/^firestore\//, ''));
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  return false;
}

/** Mensagem em português para o usuário final, por código de erro. */
export function describeFirestoreError(error: unknown): string {
  const code = String((error as { code?: string } | null)?.code ?? '').replace(/^firestore\//, '');
  switch (code) {
    case 'unavailable':
    case 'deadline-exceeded':
      return 'Sem conexão com o servidor. As alterações ficaram salvas neste dispositivo.';
    case 'permission-denied':
      return 'Sem permissão para gravar estes dados. Entre novamente na sua conta.';
    case 'unauthenticated':
      return 'Sessão expirada. Entre novamente para retomar a sincronização.';
    case 'resource-exhausted':
      return 'Limite de uso do banco atingido. Tente novamente em alguns minutos.';
    default:
      return 'Não foi possível sincronizar com a nuvem.';
  }
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const code = String((error as { code?: string } | null)?.code ?? 'unknown');
  const errMsg = error instanceof Error ? error.message : String(error);

  if (isOfflineError(error)) {
    console.warn(`[Firestore offline] ${operationType} em ${path || 'raiz'}: gravação pendente no cache local.`);
  } else {
    // Diagnóstico completo apenas em desenvolvimento e fora da mensagem do erro.
    if (import.meta.env?.DEV) {
      const errInfo: FirestoreErrorInfo = {
        error: errMsg,
        authInfo: {
          userId: auth.currentUser?.uid,
          email: auth.currentUser?.email,
          emailVerified: auth.currentUser?.emailVerified,
          isAnonymous: auth.currentUser?.isAnonymous,
          tenantId: auth.currentUser?.tenantId,
          providerInfo:
            auth.currentUser?.providerData?.map((provider) => ({
              providerId: provider.providerId,
              email: provider.email,
            })) || [],
        },
        operationType,
        path,
      };
      console.debug('[Firestore] diagnóstico:', errInfo);
    }
    console.error(`Firestore ${operationType} falhou em ${path || 'raiz'}:`, code, errMsg);
  }

  throw new SyncError(describeFirestoreError(error), code, operationType, path, error);
}

/**
 * Verificação de conectividade.
 *
 * CORREÇÃO: não depende mais de um documento `/test/connection` com leitura
 * pública nas regras. Usa o estado da rede e, quando há usuário autenticado,
 * uma leitura do próprio documento do usuário.
 */
export async function testFirebaseConnection(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    console.warn('Dispositivo offline. O Firestore operará com cache local.');
    return false;
  }

  const uid = auth.currentUser?.uid;
  if (!uid) return true; // Sem sessão não há o que verificar no banco.

  try {
    const fetchDoc = getDocFromServer(doc(db, 'users', uid));
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 4000)
    );
    await Promise.race([fetchDoc, timeout]);
    return true;
  } catch (error) {
    console.warn('Firestore indisponível no momento; operando localmente.', (error as { code?: string })?.code ?? '');
    return false;
  }
}

// Helpers de login e logout
export async function loginWithGoogle() {
  try {
    googleProvider.setCustomParameters({
      prompt: 'select_account',
    });
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    if (error?.code === 'auth/unauthorized-domain' || error?.message?.includes('unauthorized-domain')) {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
      console.warn(`[Firebase Auth] O domínio "${currentHost}" precisa ser adicionado aos Domínios Autorizados no Firebase Console (Authentication > Settings > Authorized domains).`);
      const customErr = new Error(
        `O domínio "${currentHost}" não está autorizado no Firebase Authentication.`
      );
      (customErr as any).code = 'auth/unauthorized-domain';
      (customErr as any).domain = currentHost;
      throw customErr;
    }
    console.error('Erro ao autenticar com Google:', error);
    throw error;
  }
}

export async function logoutUser() {
  try {
    await fbSignOut(auth);
  } catch (error) {
    console.error('Erro ao sair:', error);
    throw error;
  }
}
