'use client';

import { useState, useEffect, useCallback } from 'react';
import { JWTPayload } from './auth';

function decodeJWT(token: string): (JWTPayload & { exp?: number }) | null {
  try {
    const base64Payload = token.split('.')[1];
    const decoded = JSON.parse(atob(base64Payload));
    return decoded as JWTPayload & { exp?: number };
  } catch {
    return null;
  }
}

const TOKEN_KEY = 'inginium_token';

function setTokenCookie(token: string) {
  document.cookie = `inginium_token=${token}; path=/; max-age=${12 * 60 * 60}; SameSite=Strict`;
}

function clearTokenCookie() {
  document.cookie = 'inginium_token=; path=/; max-age=0; SameSite=Strict';
}

export function useAuth() {
  const [user, setUser] = useState<JWTPayload | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (storedToken) {
      const decoded = decodeJWT(storedToken);
      const isExpired = decoded?.exp && decoded.exp * 1000 < Date.now();
      if (decoded && !isExpired) {
        setToken(storedToken);
        setUser(decoded);
        setTokenCookie(storedToken);
      } else {
        localStorage.removeItem(TOKEN_KEY);
        clearTokenCookie();
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback((newToken: string) => {
    const decoded = decodeJWT(newToken);
    if (decoded) {
      localStorage.setItem(TOKEN_KEY, newToken);
      setTokenCookie(newToken);
      setToken(newToken);
      setUser(decoded);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    clearTokenCookie();
    setToken(null);
    setUser(null);
  }, []);

  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const currentToken = localStorage.getItem(TOKEN_KEY);
      return fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
          ...(options.headers as Record<string, string>),
        },
      });
    },
    []
  );

  return { user, token, loading, login, logout, authFetch };
}
