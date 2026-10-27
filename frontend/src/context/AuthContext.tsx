import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface User {
  id?: number;
  userUuid: string;
  userName?: string;
  fullName: string;
  designation: string;
  email: string;
  mobileNo?: string;
  address?: string;
}

interface JwtPayload {
  userId: number;
  userUuid: string;
  email: string;
  role: string;
  exp: number;
}

interface AuthState {
  token: string | null;
  user: User | null;
  role: string | null;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (token: string, user: User) => void;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function parseJwt(token: string): JwtPayload | null {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    if (token && userStr) {
      const payload = parseJwt(token);
      if (payload && payload.exp * 1000 > Date.now()) {
        return {
          token,
          user: JSON.parse(userStr),
          role: payload.role,
          isAuthenticated: true,
        };
      }
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
    return { token: null, user: null, role: null, isAuthenticated: false };
  });

  const login = (token: string, user: User) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    const payload = parseJwt(token);
    setAuth({ token, user, role: payload?.role || "user", isAuthenticated: true });
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setAuth({ token: null, user: null, role: null, isAuthenticated: false });
  };

  useEffect(() => {
    if (auth.token) {
      const payload = parseJwt(auth.token);
      if (payload && payload.exp * 1000 < Date.now()) {
        logout();
      }
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...auth, login, logout, isAdmin: auth.role === "admin" }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
