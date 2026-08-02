const LISTING_IMAGES_PRINT_ROUTE = /^\/imoveis\/[^/]+\/imagens\/imprimir$/;

export function isPrintThemePath(pathname: string): boolean {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";
  return normalizedPath === "/analise/imagens/imprimir"
    || LISTING_IMAGES_PRINT_ROUTE.test(normalizedPath);
}
