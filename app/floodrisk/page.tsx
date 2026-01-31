"use client"

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { AddonAccessGuard } from "@/app/casa/components/addon-access-guard"

const FloodRiskClient = dynamic(
  () => import('./components/floodrisk-client'),
  { 
    ssr: false,
    loading: () => (
      <div className="h-[calc(100vh-3.5rem)] w-full flex items-center justify-center bg-slate-900">
        <div className="text-white">Carregando visualização 3D...</div>
      </div>
    )
  }
);

export default function FloodRiskPage() {
  return (
    <AddonAccessGuard addonSlug="flood" addonName="Risco de Enchente">
      <div className="h-[calc(100vh-3.5rem)] w-full overflow-hidden">
        <Suspense fallback={
          <div className="h-full w-full flex items-center justify-center bg-slate-900">
            <div className="text-white">Carregando...</div>
          </div>
        }>
          <FloodRiskClient />
        </Suspense>
      </div>
    </AddonAccessGuard>
  );
}

