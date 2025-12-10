import {
  createContext,
  useState,
  useContext,
  ReactNode,
  Dispatch,
  SetStateAction,
} from "react";

interface AuthState {
  user: any | null;
  userId: string | null;
  role: string | null;
  token: string | null;
}

interface AuthContextValue {
  auth: AuthState;
  setAuth: Dispatch<SetStateAction<AuthState>>;
}

type AuthProviderProps = {
  children: ReactNode;
};

const initialAuthState: AuthState = {
  user: null,
  userId: null,
  role: null,
  token: null,
};

const defaultContextValue: AuthContextValue = {
  auth: initialAuthState,
  setAuth: () => {},
};

export const AuthContext = createContext<AuthContextValue>(defaultContextValue);

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [auth, setAuth] = useState<AuthState>(initialAuthState);

  return (
    <AuthContext.Provider value={{ auth, setAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
