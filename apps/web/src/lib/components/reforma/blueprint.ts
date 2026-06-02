const MAX_BLUEPRINT_DIMENSION = 2000;
const BLUEPRINT_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export type ResizedBlueprint = {
  dataUrl: string;
  naturalWidth: number;
  naturalHeight: number;
};

export async function resizeBlueprintFile(file: File): Promise<ResizedBlueprint> {
  if (!BLUEPRINT_MIME_TYPES.has(file.type)) {
    throw new Error("Use uma imagem PNG, JPEG ou WebP.");
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const scale = Math.min(
      1,
      MAX_BLUEPRINT_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight)
    );
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Nao foi possivel preparar a imagem.");

    context.drawImage(image, 0, 0, width, height);
    const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
    const dataUrl = canvas.toDataURL(mimeType, 0.86);

    return {
      dataUrl,
      naturalWidth: width,
      naturalHeight: height
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = document.createElement("img");
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Nao foi possivel carregar a imagem."));
    image.src = src;
  });
}

