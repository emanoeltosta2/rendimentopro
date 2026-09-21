import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, loginWithGoogle, logoutUser, testFirebaseConnection } from './firebase';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isFirebaseOnline: boolean;
  signInGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isFirebaseOnline: true,
  signInGoogle: async () => {},
  signOut: async () => {},
  authError: null,
  clearAuthError: () => {},
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFirebaseOnline, setIsFirebaseOnline] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Testa conectividade no boot do app
    testFirebaseConnection().then((connected) => {
      setIsFirebaseOnline(connected);
    });

    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setIsLoading(false);
      },
      (err) => {
        console.warn('Listener de autenticação:', err.message);
        setAuthError(err.message);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const clearAuthError = () => {
    setAuthError(null);
  };

  const signInGoogle = async () => {
    setAuthError(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      if (err?.code !== 'auth/unauthorized-domain') {
        console.error('Falha ao entrar com Google:', err);
      }
      setAuthError(err?.message || 'Falha ao autenticar com a conta Google');
      throw err;
    }
  };

  const signOut = async () => {
    setAuthError(null);
    try {
      await logoutUser();
    } catch (err: any) {
      console.error('Falha ao deslogar:', err);
      setAuthError(err?.message || 'Falha ao desconectar');
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isFirebaseOnline,
        signInGoogle,
        signOut,
        authError,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
