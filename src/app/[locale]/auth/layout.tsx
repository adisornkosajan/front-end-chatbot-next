'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = useAuthStore((s) => s.token);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  // Wait for Zustand to hydrate
  useEffect(() => {
    if (isHydrated) {
      setIsLoading(false);
    }
  }, [isHydrated]);

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (!isLoading && token) {
      console.log('Already logged in, redirecting to dashboard...');
      router.push('/dashboard/inbox');
    }
  }, [token, router, isLoading]);

  // Show loading while hydrating
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render auth pages if user is already logged in
  if (token) {
    return null;
  }

  return <>{children}</>;
}
