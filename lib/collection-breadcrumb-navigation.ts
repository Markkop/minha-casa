import { isActivePath } from "@/lib/navigation"

export function shouldNavigateToAnunciosOnCollectionSelect(
  pathname: string,
  activeCollectionId: string | undefined,
  selectedCollectionId: string
): boolean {
  return (
    !isActivePath(pathname, "/anuncios") &&
    activeCollectionId === selectedCollectionId
  )
}
