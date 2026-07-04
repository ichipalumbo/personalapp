import { useState, useCallback } from "react";
import { AuthToken, User } from "../types";
import { apiClient } from "../services/apiClient";

interface UseAuthReturn {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (id: string, senha: string) => Promise<void>;
  logout: () => void;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });

  const [token, setToken] = useState<string | null>(
    localStorage.getItem("authToken")
  );

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (id: string, senha: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result: AuthToken = await apiClient.login(id, senha);
      setUser(result.user);
      setToken(result.token);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao fazer login";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    apiClient.logout();
    setUser(null);
    setToken(null);
    setError(null);
  }, []);

  return {
    user,
    token,
    isLoading,
    error,
    login,
    logout
  };
}
