export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001',
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/api/auth/login',
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
    AI: {
      CONFIG: '/api/ai/config',
      TEST: '/api/ai/test',
    },
  },
};

export function getApiUrl(path: string): string {
  return `${API_CONFIG.BASE_URL}${path}`;
}

export function getWsUrl(): string {
  return API_CONFIG.WS_URL;
}
