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
