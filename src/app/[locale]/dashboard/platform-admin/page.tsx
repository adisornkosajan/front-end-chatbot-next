'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useAuthStore } from '@/store/auth.store';
import { apiFetch } from '@/lib/api';
import { API_CONFIG } from '@/lib/config';

type OrganizationItem = {
  id: string;
  name: string;
  createdAt: string;
  _count?: {
    users?: number;
    conversations?: number;
    platforms?: number;
  };
};

export default function PlatformAdminPage() {
  const locale = useLocale();
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const setToken = useAuthStore((s) => s.setToken);
  const setUser = useAuthStore((s) => s.setUser);

  const [items, setItems] = useState<OrganizationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reasonByOrg, setReasonByOrg] = useState<Record<string, string>>({});
  const [workingOrgId, setWorkingOrgId] = useState<string | null>(null);

  const platformRole = user?.platformRole || 'NONE';
  const canAccess =
    user?.role === 'SUPER_ADMIN' ||
    platformRole === 'OWNER' ||
    platformRole === 'SUPPORT_ADMIN';
  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.name.localeCompare(b.name)),
    [items],
  );

  useEffect(() => {
    if (!token) {
      router.push(`/${locale}/auth/login`);
      return;
    }
    if (!canAccess) {
      router.push(`/${locale}/dashboard/inbox`);
      return;
    }

    let mounted = true;
    setLoading(true);
    apiFetch(API_CONFIG.ENDPOINTS.PLATFORM_ADMIN.ORGANIZATIONS, token)
      .then((data) => {
        if (mounted) {
          setItems(Array.isArray(data) ? data : []);
          setError(null);
        }
      })
      .catch((e: any) => {
        if (mounted) {
          setError(e?.message || 'Failed to load organizations');
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [token, canAccess, router, locale]);

  const handleImpersonate = async (organizationId: string) => {
    if (!token || workingOrgId) return;
    setWorkingOrgId(organizationId);
    setError(null);

    try {
      const reason = reasonByOrg[organizationId]?.trim();
      const result = await apiFetch(
        API_CONFIG.ENDPOINTS.PLATFORM_ADMIN.IMPERSONATE(organizationId),
        token,
        {
          method: 'POST',
          body: JSON.stringify({
            reason: reason || 'Support investigation',
            expiresInMinutes: 30,
          }),
        },
      );

      if (!result?.accessToken) {
        throw new Error('Impersonation token is missing');
      }

      setToken(result.accessToken);
      const me = await apiFetch(API_CONFIG.ENDPOINTS.AUTH.ME, result.accessToken);
      setUser(me);
      router.push(`/${locale}/dashboard/inbox`);
    } catch (e: any) {
      setError(e?.message || 'Failed to impersonate organization');
    } finally {
      setWorkingOrgId(null);
    }
  };

  if (!token || !canAccess) {
    return null;
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
          <h1 className="text-2xl font-bold text-gray-900">Platform Admin</h1>
          <p className="text-sm text-gray-600 mt-1">
            View organizations and login into a customer tenant for support.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm text-gray-700 font-medium">
              Organizations: {sortedItems.length}
            </p>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-gray-500">Loading organizations...</div>
          ) : sortedItems.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">No organizations found.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {sortedItems.map((org) => (
                <div key={org.id} className="p-4 flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{org.name}</p>
                      <p className="text-xs text-gray-500">
                        Users: {org._count?.users || 0} | Conversations:{' '}
                        {org._count?.conversations || 0} | Platforms:{' '}
                        {org._count?.platforms || 0}
                      </p>
                    </div>
                    <button
                      onClick={() => handleImpersonate(org.id)}
                      disabled={workingOrgId === org.id}
                      className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300"
                    >
                      {workingOrgId === org.id ? 'Impersonating...' : 'Impersonate'}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={reasonByOrg[org.id] || ''}
                    onChange={(e) =>
                      setReasonByOrg((prev) => ({ ...prev, [org.id]: e.target.value }))
                    }
                    placeholder="Reason (optional)"
                    className="w-full sm:max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
