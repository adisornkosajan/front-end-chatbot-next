import { getApiUrl } from './config';

export async function apiFetch(
  endpoint: string,
  token?: string,
  options?: RequestInit,
) {
  const url = getApiUrl(endpoint);
  
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });

    // Handle 401 Unauthorized (token expired or invalid)
    if (res.status === 401) {
      console.error('Authentication failed: Token invalid or expired');
      
      // Clear auth store and redirect to login
      if (typeof window !== 'undefined') {
        const { useAuthStore } = await import('@/store/auth.store');
        useAuthStore.getState().logout();
        window.location.href = '/auth/login';
      }
      
      throw new Error('Authentication failed. Please login again.');
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(errorData.message || `API error: ${res.status}`);
    }

    return res.json();
  } catch (error) {
    console.error('API Fetch Error:', error);
    throw error;
  }
}
