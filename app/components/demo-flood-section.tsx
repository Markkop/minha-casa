"use client"

import { useState, useMemo, Suspense } from "react"
import dynamic from "next/dynamic"
import { cn } from "@/lib/utils"
import { LEVEL_BLOCKS } from "@/app/floodrisk/lib/constants"
import { ConnectionType } from "@/app/floodrisk/lib/types"

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brightGrey pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>🌊</span>
            <span>Visualizador de Alagamento</span>
            <span className="px-2 py-1 text-xs rounded-md border inline-flex items-center gap-1 bg-amber-500/20 text-amber-400 border-amber-500">
              <span>🚀</span>
              Em Breve
            </span>
          </h2>
          <p className="text-ashGray text-sm">
            Visualize projeções de alagamento em 3D baseadas em dados climáticos.
          </p>
        </div>
      </div>

      {/* Main content: 3D view + projections */}
      <div className="bg-eerieBlack border border-brightGrey rounded-xl overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* 3D Canvas */}
          <div className="w-full h-[200px] md:h-[280px] md:flex-1 relative">
            <Suspense fallback={
              <div className="h-full w-full flex items-center justify-center bg-slate-900">
                <div className="text-ashGray text-sm">Carregando 3D...</div>
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
              <div className="flex items-center gap-1 bg-black/60 px-2 py-1 rounded">
                <div className="w-2 h-2 rounded-sm bg-[#334155]"></div>
                <span className="text-white">Rua</span>
              </div>
              <div className="flex items-center gap-1 bg-black/60 px-2 py-1 rounded">
                <div className="w-2 h-2 rounded-sm bg-[#475569]"></div>
                <span className="text-white">Calçada</span>
              </div>
              <div className="flex items-center gap-1 bg-black/60 px-2 py-1 rounded">
                <div className="w-2 h-2 rounded-sm bg-[#166534]"></div>
                <span className="text-white">Casa</span>
              </div>
            </div>
          </div>

          {/* Projections - horizontal on mobile, vertical column on desktop */}
          <div className="w-full md:w-20 bg-black/30 border-t md:border-t-0 md:border-l border-brightGrey flex md:flex-col items-center justify-center md:justify-start py-3 md:py-4 gap-3 md:gap-2">
            <span className="text-[10px] text-ashGray md:mb-2 text-center hidden md:block">Projeções</span>
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
                    isActive && !hasFlood && "border-primary bg-primary/20 scale-110 text-primary",
                    isActive && hasFlood && !isCritical && "border-amber-500 bg-amber-500/20 scale-110 text-amber-400",
                    isActive && isCritical && "border-red-500 bg-red-500/20 scale-110 text-red-400",
                    !isActive && "border-brightGrey bg-eerieBlack hover:border-dimGray hover:scale-105 text-ashGray"
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
