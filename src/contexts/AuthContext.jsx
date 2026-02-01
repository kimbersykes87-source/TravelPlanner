import { createContext, useContext, useState } from 'react';

const isDev = import.meta.env.DEV;

const AuthContext = createContext({
  unlocked: isDev,
  setUnlocked: () => {},
});

export function AuthProvider({ children }) {
  const [unlocked, setUnlocked] = useState(isDev);
  return (
    <AuthContext.Provider value={{ unlocked, setUnlocked }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
