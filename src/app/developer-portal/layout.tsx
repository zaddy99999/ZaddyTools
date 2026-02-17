'use client';

import AbstractWalletProvider from '@/components/AbstractWalletProvider';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AbstractWalletProvider>
      {children}
    </AbstractWalletProvider>
  );
}
