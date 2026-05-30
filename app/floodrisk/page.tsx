"use client"

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { AddonGuard } from "@/components/addon-guard"

const FloodRiskClient = dynamic(
  () => import('./components/floodrisk-client'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex h-[calc(100vh-var(--nav-height,2.75rem))] w-full items-center justify-center bg-app-bg">
        <div className="text-app-muted">Carregando visualização 3D...</div>
      </div>
    )
  }
);

export default function FloodRiskPage() {
  return (
    <AddonGuard addonSlug="flood" addonName="Risco de Enchente">
      <div className="h-[calc(100vh-var(--nav-height,2.75rem))] w-full overflow-hidden">
        <Suspense fallback={
          <div className="flex h-full w-full items-center justify-center bg-app-bg">
            <div className="text-app-muted">Carregando...</div>
          </div>
        }>
          <FloodRiskClient />
        </Suspense>
      </div>
    </AddonGuard>
  );
}
