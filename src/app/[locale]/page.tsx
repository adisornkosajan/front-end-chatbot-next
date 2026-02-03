'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useLocale } from 'next-intl';

export default function Home() {
  const router = useRouter();
  const locale = useLocale();
  const token = useAuthStore((s) => s.token);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!isHydrated) return;

    // Redirect based on auth status
    if (token) {
      router.push(`/${locale}/dashboard/inbox`);
    } else {
      router.push(`/${locale}/auth/login`);
    }
    
    setIsChecking(false);
  }, [token, isHydrated, router]);

  // Show loading while checking
  if (isChecking || !isHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return null;
}
