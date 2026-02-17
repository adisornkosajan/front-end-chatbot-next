const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.nighttime77.win';
const RAW_WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'https://api.nighttime77.win';

// Debug: Check if env vars are loaded
console.log('🔧 Environment Check:', {
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  RAW_API_URL,
  RAW_WS_URL,
});

function normalizeBaseUrl(rawUrl: string): string {
  return rawUrl.trim().replace(/\/+$/, '');
}

function normalizeWsUrl(rawUrl: string): string {
  return rawUrl.trim().replace(/\/+$/, '');
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
    CONTACTS: {
      LIST: '/api/contacts',
      DETAIL: (id: string) => `/api/contacts/${id}`,
      TAGS: '/api/contacts/tags',
      ADD_TAG: (id: string, tagId: string) => `/api/contacts/${id}/tags/${tagId}`,
    },
    BROADCASTS: {
      LIST: '/api/broadcasts',
      CREATE: '/api/broadcasts',
      DETAIL: (id: string) => `/api/broadcasts/${id}`,
      SEND: (id: string) => `/api/broadcasts/${id}/send`,
    },
    CHATBOT_FLOWS: {
      LIST: '/api/chatbot-flows',
      CREATE: '/api/chatbot-flows',
      DETAIL: (id: string) => `/api/chatbot-flows/${id}`,
      TOGGLE: (id: string) => `/api/chatbot-flows/${id}/toggle`,
    },
    AUTO_ASSIGN_RULES: {
      LIST: '/api/auto-assign-rules',
      CREATE: '/api/auto-assign-rules',
      DETAIL: (id: string) => `/api/auto-assign-rules/${id}`,
      TOGGLE: (id: string) => `/api/auto-assign-rules/${id}/toggle`,
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
