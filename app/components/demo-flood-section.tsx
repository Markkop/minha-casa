"use client"

import { useState, useMemo, Suspense } from "react"
import dynamic from "next/dynamic"
import { cn } from "@/lib/utils"
import { LEVEL_BLOCKS } from "@/app/floodrisk/lib/constants"
import { ConnectionType } from "@/app/floodrisk/lib/types"
import { floodSceneColors } from "@/lib/theme/colors"

// Dynamically import Three.js components to avoid SSR issues
const Canvas = dynamic(
  () => import("@react-three/fiber").then((mod) => mod.Canvas),
  { ssr: false }
)
const OrbitControls = dynamic(
  () => import("@react-three/drei").then((mod) => mod.OrbitControls),
  { ssr: false }
)

// Dynamically import World component
const World = dynamic(
  () => import("@/app/floodrisk/components/World").then((mod) => mod.World),
  { ssr: false }
)

// Custom demo blocks with repositioned x_pos to be adjacent (no big gaps)
const DEMO_BLOCKS = LEVEL_BLOCKS
  .filter(block => ['rua', 'calcada', 'casa'].includes(block.id))
  .map(block => {
    // Reposition blocks to be adjacent: rua -> calcada -> casa
    if (block.id === 'rua') return { ...block, x_pos: 2, width: 4 }
    if (block.id === 'calcada') return { ...block, x_pos: 4.75, width: 1.5 }
    if (block.id === 'casa') return { ...block, x_pos: 8.5, width: 6 }
    return block
  })

// Demo projections (Today, 2030, 2040, 2050)
interface Projection {
  id: string
  year: string
  waterLevel: number // Relative to creek (0)
  ruaFlooded: boolean
  calcadaFlooded: boolean
  casaFlooded: boolean
}

const DEMO_PROJECTIONS: Projection[] = [
  { id: "today", year: "Hoje", waterLevel: 1.9, ruaFlooded: false, calcadaFlooded: false, casaFlooded: false },
  { id: "2030", year: "2030", waterLevel: 2.1, ruaFlooded: true, calcadaFlooded: false, casaFlooded: false },
  { id: "2040", year: "2040", waterLevel: 2.5, ruaFlooded: true, calcadaFlooded: true, casaFlooded: false },
  { id: "2050", year: "2050", waterLevel: 3.0, ruaFlooded: true, calcadaFlooded: true, casaFlooded: true },
]

// Default edge states for demo (no-op, just need to pass something)
const DEMO_EDGE_STATES: Record<number, ConnectionType> = {
  0: ConnectionType.STEP, // Rua -> Calcada
  1: ConnectionType.STEP, // Calcada -> Casa
}

export function DemoFloodSection() {
  const [activeProjectionId, setActiveProjectionId] = useState("today")
  
  const activeProjection = useMemo(() => {
    return DEMO_PROJECTIONS.find(p => p.id === activeProjectionId) || DEMO_PROJECTIONS[0]
  }, [activeProjectionId])

  return (
    <section className="mt-16 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-app-border pb-4 md:flex-row md:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-app-fg">
            <span>🌊</span>
            <span>Visualizador de Alagamento</span>
            <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800">
              <span>🚀</span>
              Em Breve
            </span>
          </h2>
          <p className="text-sm text-app-muted">
            Visualize projeções de alagamento em 3D baseadas em dados climáticos.
          </p>
        </div>
      </div>

      {/* Main content: 3D view + projections */}
      <div className="overflow-hidden rounded-xl border border-app-border bg-app-surface">
        <div className="flex flex-col md:flex-row">
          {/* 3D Canvas */}
          <div className="w-full h-[200px] md:h-[280px] md:flex-1 relative">
            <Suspense fallback={
              <div className="h-full w-full flex items-center justify-center bg-app-fg">
                <div className="text-sm text-app-surface-muted">Carregando 3D...</div>
              </div>
            }>
              <Canvas
                shadows
                camera={{ position: [5, 8, 12] as [number, number, number], fov: 40 }}
                gl={{ preserveDrawingBuffer: true, antialias: true }}
                style={{ width: '100%', height: '100%' }}
              >
                <World 
                  waterLevel={activeProjection.waterLevel} 
                  edgeStates={DEMO_EDGE_STATES}
                  onToggleEdge={() => {}} // No-op for demo
                  customBlocks={DEMO_BLOCKS}
                />
                <OrbitControls 
                  target={[5, 2, 0]} 
                  minPolarAngle={0} 
                  maxPolarAngle={Math.PI / 2.1}
                  enablePan={false}
                  enableZoom={false}
                />
              </Canvas>
            </Suspense>
            
            {/* Legend overlay */}
            <div className="absolute bottom-3 left-3 flex gap-2 text-[10px]">
              <div className="flex items-center gap-1 bg-app-fg/60 px-2 py-1 rounded">
                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: floodSceneColors.street }}></div>
                <span className="text-app-fg">Rua</span>
              </div>
              <div className="flex items-center gap-1 bg-app-fg/60 px-2 py-1 rounded">
                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: floodSceneColors.sidewalk }}></div>
                <span className="text-app-fg">Calçada</span>
              </div>
              <div className="flex items-center gap-1 bg-app-fg/60 px-2 py-1 rounded">
                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: floodSceneColors.houseGround }}></div>
                <span className="text-app-fg">Casa</span>
              </div>
            </div>
          </div>

          {/* Projections - horizontal on mobile, vertical column on desktop */}
          <div className="flex w-full items-center justify-center gap-3 border-t border-app-border bg-app-bg py-3 md:w-20 md:flex-col md:justify-start md:gap-2 md:border-l md:border-t-0 md:py-4">
            <span className="hidden text-center text-[10px] text-app-muted md:mb-2 md:block">Projeções</span>
            {DEMO_PROJECTIONS.map((proj) => {
              const isActive = proj.id === activeProjectionId
              const hasFlood = proj.ruaFlooded || proj.calcadaFlooded || proj.casaFlooded
              const isCritical = proj.casaFlooded
              
              return (
                <button
                  key={proj.id}
                  onClick={() => setActiveProjectionId(proj.id)}
                  title={proj.year}
                  className={cn(
                    "w-12 h-12 rounded-md border-2 transition-all duration-200 flex items-center justify-center text-xs font-bold",
                    isActive && !hasFlood && "scale-110 border-app-action bg-app-action text-app-action-foreground",
                    isActive && hasFlood && !isCritical && "scale-110 border-amber-500 bg-amber-50 text-amber-800",
                    isActive && isCritical && "scale-110 border-red-500 bg-red-50 text-red-700",
                    !isActive && "border-app-border bg-app-surface text-app-muted hover:border-app-border-strong hover:scale-105"
                  )}
                >
                  {proj.year}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
