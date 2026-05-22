import Link from "next/link"
import { getFlag } from "@/lib/feature-flags"
import { DemoListingsSection } from "./components/demo-listings-section"
import { DemoFinanciamentoSection } from "./components/demo-financiamento-section"
import { DemoFloodSection } from "./components/demo-flood-section"

interface Feature {
  href: string
  icon: string
  title: string
  description: string
  highlights: string[]
  featureFlag?: "organizations"
}

const allFeatures: Feature[] = []

export default function Home() {
  // Filter features based on feature flags
  const features = allFeatures.filter((feature) => {
    if (!feature.featureFlag) return true
    return getFlag(feature.featureFlag)
  })

  return (
    <div className="min-h-[calc(100vh-104px)] bg-app-bg text-app-fg">
      <main className="max-w-5xl mx-auto px-4 py-16 sm:py-24">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-app-fg">
            <span>Minha Casa</span>
          </h1>
          <p className="text-lg sm:text-xl text-app-muted max-w-2xl mx-auto">
            Ferramentas inteligentes para ajudar na sua jornada de compra do
            imovel dos sonhos.
          </p>
        </div>

        {/* Feature Cards */}
        <div className={`grid grid-cols-1 ${features.length > 1 ? "md:grid-cols-2" : "max-w-xl mx-auto"} gap-6`}>
          {features.map((feature) => (
            <Link
              key={feature.href}
              href={feature.href}
              className="group block rounded-xl border border-app-border bg-app-surface p-6 transition-all duration-300 hover:border-app-border-strong hover:shadow-sm"
            >
              <div className="flex items-start gap-4">
                <span className="text-4xl">{feature.icon}</span>
                <div className="flex-1">
                  <h2 className="mb-2 text-xl font-bold text-app-fg transition-colors group-hover:text-app-fg">
                    {feature.title}
                  </h2>
                  <p className="mb-4 text-sm leading-relaxed text-app-muted">
                    {feature.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {feature.highlights.map((highlight) => (
                      <span
                        key={highlight}
                        className="rounded-full bg-app-surface-muted px-2 py-1 text-xs text-app-muted"
                      >
                        {highlight}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-app-fg opacity-0 transition-opacity group-hover:opacity-100">
                <span>Acessar</span>
                <span className="ml-1">→</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Demo Sections */}
        <DemoListingsSection />
        <DemoFinanciamentoSection />
        <DemoFloodSection />

        {/* Subtle decorative element */}
        <div className="mt-20 text-center">
          <div className="inline-flex items-center gap-2 text-xs text-app-subtle">
            <span className="w-8 h-px bg-app-border"></span>
            <span>Seus dados sincronizados com seguranca</span>
            <span className="w-8 h-px bg-app-border"></span>
          </div>
        </div>
      </main>
    </div>
  )
}
