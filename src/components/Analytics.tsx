'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    // Don't track admin/developer portal pages
    if (pathname?.startsWith('/developer-portal')) return;

    // Log page view
    const logPageView = async () => {
      try {
        await fetch('/api/admin/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'pageview',
            page: pathname,
            timestamp: new Date().toISOString(),
          }),
        });
      } catch {
        // Silently fail - analytics shouldn't break the app
      }
    };

    logPageView();
  }, [pathname]);

  return null;
}

// Helper to track tool usage
export async function trackToolUsage(toolName: string) {
  try {
    await fetch('/api/admin/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'tool',
        tool: toolName,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch {
    // Silently fail
  }
}
