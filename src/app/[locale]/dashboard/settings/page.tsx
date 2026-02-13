'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { apiFetch } from '@/lib/api';
import { useRouter } from 'next/navigation';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function SettingsPage() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [organizationData, setOrganizationData] = useState({
    name: '',
    address: '',
    contact: '',
    trn: '',
  });
  const canEditOrganization = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if not logged in or not admin
  useEffect(() => {
    if (mounted) {
      if (!token) {
        router.push('/auth/login');
      } else if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
        router.push('/dashboard/inbox');
      }
    }
  }, [mounted, token, user, router]);

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
      }));
    }
  }, [user]);

  useEffect(() => {
    const loadOrganization = async () => {
      if (!token) return;
      try {
        const org = await apiFetch('/api/organizations/current', token);
        setOrganizationData({
          name: org?.name || '',
          address: org?.address || '',
          contact: org?.contact || '',
          trn: org?.trn || '',
        });
      } catch (error) {
        console.error('Error loading organization:', error);
      }
    };

    if (token) {
      loadOrganization();
    }
  }, [token]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      await apiFetch('/api/users/profile', token!, {
        method: 'PUT',
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
        }),
      });

      alert('Profile updated successfully!');
      
      // รีเฟรชข้อมูล user
      const updatedUser = await apiFetch('/api/auth/me', token!);
      useAuthStore.getState().setUser(updatedUser);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      alert(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      alert('Please fill in all password fields');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    if (formData.newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      
      await apiFetch('/api/users/change-password', token!, {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      alert('Password changed successfully!');
      
      setFormData((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
    } catch (error: any) {
      console.error('Error changing password:', error);
      alert(error.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleOrganizationUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!organizationData.name) {
      alert('Organization name is required');
      return;
    }

    try {
      setLoading(true);
      
      await apiFetch('/api/organizations/current', token!, {
        method: 'PUT',
        body: JSON.stringify(organizationData),
      });

      alert('Organization updated successfully!');
    } catch (error: any) {
      console.error('Error updating organization:', error);
      alert(error.message || 'Failed to update organization');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || !token) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
      </div>
      
      <div className="max-w-4xl mx-auto p-4 sm:p-8 relative z-10">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">General Settings</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage your account settings and preferences</p>
        </div>

        {/* Language Settings */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/40 p-4 sm:p-6 mb-4 sm:mb-6 hover:shadow-2xl transition-all duration-300">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-800">Language Preference</h2>
                <p className="text-xs sm:text-sm text-gray-600">Choose your preferred language</p>
              </div>
            </div>
            <LanguageSwitcher />
          </div>
        </div>

        {/* Profile Settings */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/40 p-4 sm:p-6 mb-4 sm:mb-6 hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">Profile Information</h2>
              <p className="text-xs sm:text-sm text-gray-600">Update your personal details</p>
            </div>
          </div>

          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white text-gray-900 font-medium"
                style={{ fontSize: '15px' }}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white text-gray-900 font-medium"
                style={{ fontSize: '15px' }}
                placeholder="your@email.com"
                required
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Password Change */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/40 p-4 sm:p-6 mb-4 sm:mb-6 hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Change Password</h2>
              <p className="text-sm text-gray-600">Update your password to keep your account secure</p>
            </div>
          </div>

          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Current Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={formData.currentPassword}
                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white text-gray-900 font-medium"
                style={{ fontSize: '15px' }}
                placeholder="Enter current password"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                New Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white text-gray-900 font-medium"
                style={{ fontSize: '15px' }}
                placeholder="Enter new password (min 6 characters)"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Confirm New Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white text-gray-900 font-medium"
                style={{ fontSize: '15px' }}
                placeholder="Confirm new password"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-yellow-600 text-white font-semibold rounded-lg hover:bg-yellow-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>

        {/* Organization Settings */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Organization Settings</h2>
              <p className="text-sm text-gray-600">Manage your organization details</p>
            </div>
          </div>

          <form onSubmit={handleOrganizationUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Organization Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={organizationData.name}
                onChange={(e) => setOrganizationData({ ...organizationData, name: e.target.value })}
                readOnly={!canEditOrganization}
                className={`w-full px-4 py-3 border-2 border-gray-300 rounded-lg outline-none transition font-medium ${
                  canEditOrganization
                    ? 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900'
                    : 'bg-gray-50 text-gray-600 cursor-not-allowed'
                }`}
                style={{ fontSize: '15px' }}
                placeholder="Enter organization name"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Address
              </label>
              <textarea
                value={organizationData.address}
                onChange={(e) => setOrganizationData({ ...organizationData, address: e.target.value })}
                readOnly={!canEditOrganization}
                className={`w-full px-4 py-3 border-2 border-gray-300 rounded-lg outline-none transition font-medium ${
                  canEditOrganization
                    ? 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900'
                    : 'bg-gray-50 text-gray-600 cursor-not-allowed'
                }`}
                style={{ fontSize: '15px' }}
                placeholder="Enter organization address"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Contact
              </label>
              <input
                type="text"
                value={organizationData.contact}
                onChange={(e) => setOrganizationData({ ...organizationData, contact: e.target.value })}
                readOnly={!canEditOrganization}
                className={`w-full px-4 py-3 border-2 border-gray-300 rounded-lg outline-none transition font-medium ${
                  canEditOrganization
                    ? 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900'
                    : 'bg-gray-50 text-gray-600 cursor-not-allowed'
                }`}
                style={{ fontSize: '15px' }}
                placeholder="Enter contact information"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                TRN
              </label>
              <input
                type="text"
                value={organizationData.trn}
                onChange={(e) => setOrganizationData({ ...organizationData, trn: e.target.value })}
                readOnly={!canEditOrganization}
                className={`w-full px-4 py-3 border-2 border-gray-300 rounded-lg outline-none transition font-medium ${
                  canEditOrganization
                    ? 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900'
                    : 'bg-gray-50 text-gray-600 cursor-not-allowed'
                }`}
                style={{ fontSize: '15px' }}
                placeholder="Enter tax registration number"
              />
            </div>

            <div className="flex justify-between items-center pt-2">
              {!canEditOrganization && (
                <p className="text-xs text-gray-500">Read-only. Please contact Dev to update these fields.</p>
              )}
              {canEditOrganization && (
                <button
                  type="submit"
                  disabled={loading}
                  className="ml-auto px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : 'Save Organization'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
