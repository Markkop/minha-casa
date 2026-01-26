"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onApiKeyChange?: (hasKey: boolean) => void // Deprecated: API key is now managed server-side
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <Card className="relative z-10 w-full max-w-md mx-4 bg-raisinBlack border-brightGrey">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <span>⚙️</span>
            <span>Configurações</span>
          </CardTitle>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-white transition-colors"
          >
            ✕
          </button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* AI Status */}
          <div className="space-y-2">
            <p className="text-sm text-ashGray">Status da IA</p>
            <div className="bg-green/10 border border-green/30 rounded-lg p-3">
              <p className="text-sm text-green font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green" />
                IA disponível
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                O parsing de anúncios é processado no servidor.
              </p>
            </div>
          </div>

          {/* Info */}
          <div className="text-xs text-muted-foreground space-y-1 border-t border-brightGrey pt-4">
            <p className="font-medium text-ashGray">Sobre o Parser de IA:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Usamos o modelo gpt-4o-mini para extração de dados</li>
              <li>O processamento é feito de forma segura no servidor</li>
              <li>Você precisa estar logado para usar o parser</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

