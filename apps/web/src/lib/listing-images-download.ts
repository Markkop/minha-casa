import JSZip from "jszip";

export interface DownloadImageItem {
  url: string;
  originalIndex: number;
}

const JPEG_MIME = "image/jpeg";
const JPEG_QUALITY = 0.9;

function slugifyArchiveSegment(label: string): string {
  const normalized = label
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "imagem";
}

function isExternalUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = document.createElement("img");
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Não foi possível carregar a imagem."));
    image.src = src;
  });
}

export async function convertBlobToJpeg(blob: Blob): Promise<Blob> {
  const objectUrl = URL.createObjectURL(blob);

  try {
    const image = await loadImage(objectUrl);
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Não foi possível preparar a imagem para download.");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);

    return await new Promise((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) resolve(result);
          else reject(new Error("Não foi possível converter a imagem para JPEG."));
        },
        JPEG_MIME,
        JPEG_QUALITY
      );
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function buildImageArchiveEntryName(
  orderIndex: number,
  _originalIndex: number,
  label?: string | null
): string {
  const padded = String(orderIndex + 1).padStart(2, "0");
  const suffix = label ? `-${slugifyArchiveSegment(label)}` : "";
  return `${padded}${suffix}.jpg`;
}

export function buildImageArchiveFilename(listingTitle: string, listingId?: string): string {
  const base = listingTitle.trim()
    ? slugifyArchiveSegment(listingTitle)
    : listingId?.trim()
      ? slugifyArchiveSegment(listingId)
      : "imovel";

  return `${base}-imagens.zip`;
}

export async function downloadSelectedImagesZip(options: {
  title: string;
  listingId?: string;
  images: DownloadImageItem[];
  getLabel?: (originalIndex: number) => string | null;
}): Promise<void> {
  const { title, listingId, images, getLabel } = options;

  if (images.length === 0) {
    throw new Error("Nenhuma imagem selecionada.");
  }

  const zip = new JSZip();

  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    const response = await fetch(image.url, { credentials: "include" });

    if (!response.ok) {
      if (isExternalUrl(image.url)) {
        throw new Error(
          "Não foi possível baixar imagens externas. Busque as imagens do anúncio primeiro."
        );
      }

      throw new Error(`Não foi possível baixar a imagem ${i + 1}.`);
    }

    const sourceBlob = await response.blob();
    const jpegBlob = await convertBlobToJpeg(sourceBlob);
    const label = getLabel?.(image.originalIndex) ?? null;
    const entryName = buildImageArchiveEntryName(i, image.originalIndex, label);

    zip.file(entryName, jpegBlob);
  }

  const archiveBlob = await zip.generateAsync({ type: "blob" });
  const objectUrl = URL.createObjectURL(archiveBlob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = buildImageArchiveFilename(title, listingId);
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}
