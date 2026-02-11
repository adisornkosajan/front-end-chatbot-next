'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

type InvitationDetails = {
  email: string;
  role: string;
  organizationName: string;
  expiresAt: string;
};

export default function AcceptInvitePage() {
  const router = useRouter();
  const locale = useLocale();
  const setToken = useAuthStore((s) => s.setToken);
  const setUser = useAuthStore((s) => s.setUser);

  const [token, setInviteToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setInviteToken(params.get('token'));
  }, []);

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }

    const loadInvitation = async () => {
      try {
        const data = await apiFetch(`/api/auth/invitation/${token}`);
        setInvitation(data);
      } catch (err: any) {
        setError(err.message || 'Invitation not found or has expired');
      } finally {
        setLoading(false);
      }
    };

    loadInvitation().catch(() => {
      setError('Invitation not found or has expired');
      setLoading(false);
    });
  }, [token]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token || !name || !password) {
      alert('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    setAccepting(true);
    try {
      const result = await apiFetch('/api/auth/accept-invite', undefined, {
        method: 'POST',
        body: JSON.stringify({ token, name, password }),
      });

      if (result.accessToken) {
        setToken(result.accessToken);
        if (result.user) {
          setUser(result.user);
        }

        router.push(`/${locale}/dashboard/inbox`);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create account');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading invitation...</div>;
  }

  if (error || !invitation) {
    return (
      <div className="p-8 max-w-md mx-auto text-center">
        <h1 className="text-xl font-semibold mb-2">Invitation Error</h1>
        <p className="text-gray-600">{error || 'Invitation not found'}</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-2">Accept Invitation</h1>
      <p className="text-sm text-gray-600 mb-1">Organization: {invitation.organizationName}</p>
      <p className="text-sm text-gray-600 mb-4">Email: {invitation.email}</p>

      <form onSubmit={handleAccept} className="space-y-3">
        <input
          className="w-full border rounded px-3 py-2"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="password"
          className="w-full border rounded px-3 py-2"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />
        <input
          type="password"
          className="w-full border rounded px-3 py-2"
          placeholder="Confirm password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          minLength={6}
          required
        />
        <button
          type="submit"
          disabled={accepting}
          className="w-full bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-50"
        >
          {accepting ? 'Creating account...' : 'Create account'}
        </button>
      </form>
    </div>
  );
}
