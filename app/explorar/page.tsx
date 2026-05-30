import { Suspense } from "react"
import { WorkspaceLoadingState } from "@/app/components/workspace-ui"
import { ExplorarClient } from "./explorar-client"

export default function ExplorarPage() {
  return (
    <Suspense fallback={<WorkspaceLoadingState />}>
      <ExplorarClient />
    </Suspense>
  )
}
