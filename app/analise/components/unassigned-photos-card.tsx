"use client"

import { WorkspacePanel } from "@/app/components/workspace-ui"
import { RoomCardPhoto } from "./room-card-photo"

interface UnassignedPhotosCardProps {
  imageIndices: number[]
  imageUrls: string[]
}

export function UnassignedPhotosCard({
  imageIndices,
  imageUrls,
}: UnassignedPhotosCardProps) {
  if (imageIndices.length === 0) return null

  return (
    <WorkspacePanel className="mb-3 break-inside-avoid overflow-hidden border border-dashed border-app-border p-0">
      <div className="border-b border-app-border px-3 py-2">
        <h4 className="text-sm font-semibold text-app-muted">Outros</h4>
        <p className="text-xs text-app-muted">
          {imageIndices.length} foto{imageIndices.length !== 1 ? "s" : ""} sem ambiente
          identificado
        </p>
      </div>
      <RoomCardPhoto imageUrls={imageUrls} imageIndices={imageIndices} />
    </WorkspacePanel>
  )
}
