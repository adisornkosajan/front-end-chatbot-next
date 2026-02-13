const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const RAW_WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

function normalizeBaseUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim().replace(/\/+$/, '');
  if (typeof window === 'undefined') {
    return trimmed;
  }

  // Prevent mixed-content requests on HTTPS pages.
  if (window.location.protocol === 'https:' && trimmed.startsWith('http://')) {
    return `https://${trimmed.slice('http://'.length)}`;
  }

  return trimmed;
}

function normalizeWsUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim().replace(/\/+$/, '');
  if (typeof window === 'undefined') {
    return trimmed;
  }

  if (window.location.protocol === 'https:' && trimmed.startsWith('ws://')) {
    return `wss://${trimmed.slice('ws://'.length)}`;
  }

  if (window.location.protocol === 'https:' && trimmed.startsWith('http://')) {
    return `https://${trimmed.slice('http://'.length)}`;
  }

  return trimmed;
}

export const API_CONFIG = {
  BASE_URL: RAW_API_URL,
  WS_URL: RAW_WS_URL,
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/api/auth/login',
      ME: '/api/auth/me',
      OAUTH_URL: '/api/auth/oauth/url',
      OAUTH_CALLBACK: '/api/auth/oauth/callback',
    },
    CONVERSATIONS: {
      LIST: '/api/conversations',
      MESSAGES: (id: string) => `/api/conversations/${id}/messages`,
      SEND: '/api/conversations/send',
      ASSIGN: (id: string) => `/api/conversations/${id}/assign`,
      SYNC_FACEBOOK: (platformId: string) => `/api/conversations/sync/facebook/${platformId}`,
    },
    USERS: {
      PROFILE: '/api/users/profile',
      CHANGE_PASSWORD: '/api/users/change-password',
      TEAM: '/api/users/team',
      INVITE: '/api/users/team/invite',
      INVITATIONS: '/api/users/team/invitations',
      REVOKE_INVITATION: (id: string) => `/api/users/team/invitations/${id}`,
    },
    ORGANIZATIONS: {
      CURRENT: '/api/organizations/current',
    },
    PLATFORM_ADMIN: {
      ORGANIZATIONS: '/api/platform-admin/organizations',
      IMPERSONATE: (organizationId: string) =>
        `/api/platform-admin/organizations/${organizationId}/impersonate`,
    },
    AI: {
      CONFIG: '/api/ai/config',
      TEST: '/api/ai/test',
    },
    NOTES: {
      LIST: '/api/notes',
      CREATE: '/api/notes',
      UPDATE: '/api/notes',
      DELETE: '/api/notes',
    },
  },
};

export function getApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const baseUrl = normalizeBaseUrl(API_CONFIG.BASE_URL);
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

export function getWsUrl(): string {
  return normalizeWsUrl(API_CONFIG.WS_URL);
}
