'use client';

import { AbstractWalletProvider as AGWProvider } from '@abstract-foundation/agw-react';
import { abstract } from 'viem/chains';

export default function AbstractWalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <AGWProvider chain={abstract}>
      {children}
    </AGWProvider>
  );
}
