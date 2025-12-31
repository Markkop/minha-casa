"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getApiKey, setApiKey, removeApiKey } from "../lib/storage"
import { validateApiKey } from "../lib/openai"
import { cn } from "@/lib/utils"

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onApiKeyChange: (hasKey: boolean) => void
}

export function SettingsModal({ isOpen, onClose, onApiKeyChange }: SettingsModalProps) {
  const [apiKeyInput, setApiKeyInput] = useState("")
  const [isValidating, setIsValidating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [savedKey, setSavedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (isOpen) {
      const key = getApiKey()
      setSavedKey(key)
      setApiKeyInput("")
      setValidationError(null)
    }
  }, [isOpen])

  const handleSave = async () => {
    if (!apiKeyInput.trim()) {
      setValidationError("Digite uma chave API válida")
      return
    }

    if (!apiKeyInput.startsWith("sk-")) {
      setValidationError("A chave deve começar com 'sk-'")
      return
    }

    setIsValidating(true)
    setValidationError(null)

    try {
      const isValid = await validateApiKey(apiKeyInput)
      if (isValid) {
        setApiKey(apiKeyInput)
        setSavedKey(apiKeyInput)
        onApiKeyChange(true)
        setApiKeyInput("")
      } else {
        setValidationError("Chave API inválida ou sem permissões")
      }
    } catch {
      setValidationError("Erro ao validar chave API")
    } finally {
      setIsValidating(false)
    }
  }

  const handleRemove = () => {
    removeApiKey()
    setSavedKey(null)
    onApiKeyChange(false)
  }

  const handleCopy = async () => {
    if (!savedKey) return
    
    try {
      await navigator.clipboard.writeText(savedKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy key:", err)
    }
  }

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return key
    return `${key.slice(0, 7)}...${key.slice(-4)}`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
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
          {/* Current Key Status */}
          <div className="space-y-2">
            <Label className="text-sm text-ashGray">Status da API</Label>
            {savedKey ? (
              <div className="flex items-center justify-between bg-green/10 border border-green/30 rounded-lg p-3">
                <div>
                  <p className="text-sm text-green font-medium">
                    ✓ Chave configurada
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {maskApiKey(savedKey)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="text-xs text-primary hover:text-primary/80 transition-colors"
                    title="Copiar chave"
                  >
                    {copied ? "✓ Copiado!" : "📋 Copiar"}
                  </button>
                  <button
                    onClick={handleRemove}
                    className="text-xs text-destructive hover:text-destructive/80 transition-colors"
                  >
                    Remover
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                <p className="text-sm text-destructive">
                  ✕ Nenhuma chave configurada
                </p>
              </div>
            )}
          </div>

          {/* New Key Input */}
          <div className="space-y-2">
            <Label htmlFor="api-key" className="text-sm text-ashGray">
              {savedKey ? "Substituir chave API" : "Chave API OpenAI"}
            </Label>
            <Input
              id="api-key"
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="sk-..."
              className="font-mono"
            />
            {validationError && (
              <p className="text-xs text-destructive">{validationError}</p>
            )}
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isValidating || !apiKeyInput.trim()}
            className={cn(
              "w-full py-2.5 px-4 rounded-lg font-medium transition-all",
              "bg-primary text-primary-foreground",
              "hover:bg-primary/90",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "flex items-center justify-center gap-2"
            )}
          >
            {isValidating ? (
              <>
                <span className="animate-spin">⏳</span>
                Validando...
              </>
            ) : (
              <>
                <span>💾</span>
                Salvar Chave
              </>
            )}
          </button>

          {/* Info */}
          <div className="text-xs text-muted-foreground space-y-1 border-t border-brightGrey pt-4">
            <p className="font-medium text-ashGray">Sobre a API OpenAI:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>A chave é armazenada apenas no seu navegador</li>
              <li>Usamos o modelo gpt-4o-mini para economia</li>
              <li>Cada parsing consome aproximadamente $0.001</li>
              <li>
                Crie sua chave em{" "}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  platform.openai.com
                </a>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

