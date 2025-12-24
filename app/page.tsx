import Link from "next/link"

const features = [
  {
    href: "/casa",
    icon: "🏠",
    title: "Simulador de Financiamento",
    description:
      "Simule financiamentos imobiliários com Sistema SAC, análise de cenários, estratégias de amortização e comparação permuta vs venda.",
    highlights: ["Sistema SAC", "Análise de cenários", "Amortização acelerada"],
  },
  {
    href: "/anuncios",
    icon: "🏘️",
    title: "Parser de Anúncios",
    description:
      "Cole anúncios de imóveis e deixe a IA extrair automaticamente todos os dados relevantes: preço, área, quartos, localização e mais.",
    highlights: ["Extração com IA", "Dados estruturados", "Armazenamento local"],
  },
]

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-56px)] bg-black text-white">
      <main className="max-w-5xl mx-auto px-4 py-16 sm:py-24">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            <span className="text-primary">Minha Casa</span>
          </h1>
          <p className="text-lg sm:text-xl text-ashGray max-w-2xl mx-auto">
            Ferramentas inteligentes para ajudar na sua jornada de compra do
            imóvel dos sonhos.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature) => (
            <Link
              key={feature.href}
              href={feature.href}
              className="group block p-6 rounded-xl bg-eerieBlack border border-brightGrey hover:border-primary transition-all duration-300 hover:shadow-[0_0_30px_rgba(197,255,1,0.1)]"
            >
              <div className="flex items-start gap-4">
                <span className="text-4xl">{feature.icon}</span>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-white group-hover:text-primary transition-colors mb-2">
                    {feature.title}
                  </h2>
                  <p className="text-ashGray text-sm leading-relaxed mb-4">
                    {feature.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {feature.highlights.map((highlight) => (
                      <span
                        key={highlight}
                        className="px-2 py-1 text-xs rounded-full bg-middleGray text-cadetGray"
                      >
                        {highlight}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Acessar</span>
                <span className="ml-1">→</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Subtle decorative element */}
        <div className="mt-20 text-center">
          <div className="inline-flex items-center gap-2 text-xs text-dimGray">
            <span className="w-8 h-px bg-brightGrey"></span>
            <span>Dados salvos localmente no seu navegador</span>
            <span className="w-8 h-px bg-brightGrey"></span>
          </div>
        </div>
      </main>
    </div>
  )
}
