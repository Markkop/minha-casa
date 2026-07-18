export type ClipboardReadFailureKind =
  | "denied"
  | "insecure"
  | "not_found"
  | "unknown";

export async function queryClipboardReadPermission(): Promise<PermissionState | "unsupported"> {
  try {
    if (!navigator.permissions?.query) return "unsupported";
    const status = await navigator.permissions.query({
      name: "clipboard-read" as PermissionName
    });
    return status.state;
  } catch {
    return "unsupported";
  }
}

export function isChromiumClipboardBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isChromium = /Chrome|Chromium|Edg|OPR|Brave/i.test(ua);
  const isFirefox = /Firefox/i.test(ua);
  const isSafari = /Safari/i.test(ua) && !isChromium;
  return isChromium && !isFirefox && !isSafari;
}

export type ClipboardRestoreStepIcon =
  | "sliders"
  | "info"
  | "clipboard-off"
  | "toggle"
  | "reload"
  | "paste";

export type ClipboardRestoreSegment =
  | { type: "text"; value: string }
  | { type: "icon"; icon: ClipboardRestoreStepIcon };

export interface ClipboardRestoreStep {
  segments: ClipboardRestoreSegment[];
}

export function classifyClipboardReadError(error: unknown): ClipboardReadFailureKind {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") return "denied";
    if (error.name === "SecurityError") return "insecure";
    if (error.name === "NotFoundError") return "not_found";
  }
  if (error instanceof Error && error.message === "Clipboard unavailable") return "insecure";
  return "unknown";
}

export function clipboardFailureMessage(kind: ClipboardReadFailureKind): string {
  switch (kind) {
    case "denied":
      return "O navegador bloqueou o acesso à área de transferência.";
    case "insecure":
      return "A área de transferência não está disponível aqui. Cole manualmente.";
    case "not_found":
      return "Não deu para ler o que foi copiado. Copie de novo.";
    case "unknown":
      return "Não foi possível ler a área de transferência.";
  }
}

function textStep(value: string): ClipboardRestoreStep {
  return { segments: [{ type: "text", value }] };
}

export function clipboardRestoreInstructions(kind: ClipboardReadFailureKind): ClipboardRestoreStep[] {
  if (kind === "denied" && isChromiumClipboardBrowser()) {
    return [
      {
        segments: [
          { type: "text", value: "Clique em " },
          { type: "icon", icon: "sliders" },
          { type: "text", value: ", " },
          { type: "icon", icon: "info" },
          { type: "text", value: " ou " },
          { type: "icon", icon: "clipboard-off" },
          { type: "text", value: " na barra de endereço" }
        ]
      },
      {
        segments: [
          { type: "text", value: "Conceda permissão à " },
          { type: "icon", icon: "toggle" },
          { type: "text", value: " Área de transferência" }
        ]
      },
      textStep("Tente novamente")
    ];
  }

  if (kind === "denied") {
    return [
      textStep("Clique em Tentar de novo"),
      {
        segments: [
          { type: "text", value: "Escolha " },
          { type: "icon", icon: "paste" },
          { type: "text", value: " Colar no aviso do navegador" }
        ]
      }
    ];
  }

  if (kind === "insecure") {
    return [textStep("Cole o link ou texto direto no campo de adicionar")];
  }

  if (kind === "not_found") {
    return [textStep("Copie o link ou texto do anúncio novamente")];
  }

  return [textStep("Copie o conteúdo de novo e tente mais uma vez")];
}

export function isClipboardPermissionDenied(kind: ClipboardReadFailureKind): boolean {
  return kind === "denied";
}
