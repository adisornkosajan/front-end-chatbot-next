import { getApiUrl } from './config';

function getLoginPathWithLocale() {
  if (typeof window === 'undefined') {
    return '/en/auth/login';
  }

  const firstSegment = window.location.pathname.split('/').filter(Boolean)[0];
  const locale = firstSegment && /^[a-z]{2}$/i.test(firstSegment) ? firstSegment : 'en';
  return `/${locale}/auth/login`;
}

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
        window.location.href = getLoginPathWithLocale();
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
