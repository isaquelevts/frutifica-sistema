const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

export function setToken(token: string | null) {
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

export function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));

  if (!res.ok) {
    throw new Error(data?.message || `HTTP ${res.status}`);
  }

  return data as T;
}
