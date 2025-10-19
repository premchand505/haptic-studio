// apps/web/src/context/AuthContext.tsx
'use client';

import { createContext, useState, useContext, ReactNode, useEffect } from 'react';

// 1. Define the shape of the data our context will hold
interface AuthContextType {
  token: string | null;
  login: (newToken: string) => void;
  logout: () => void;
}

// 2. Create the context with a default value of null
const AuthContext = createContext<AuthContextType | null>(null);

// 3. Create the Provider Component
// This component will wrap our app and manage the actual state.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);

  // Check localStorage for a token when the app loads
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const login = (newToken: string) => {
    setToken(newToken);
    // Persist the token so the user stays logged in after a refresh
    localStorage.setItem('authToken', newToken);
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem('authToken');
  };

  const value = { token, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// 4. Create a custom hook for easy access
// This hook simplifies how other components get the auth data.
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}