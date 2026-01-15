"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Check } from "lucide-react"

type Plano = {
  nome: string
  preco: number
  descricao: string
  features: string[]
  destaque?: boolean
}

const planos: Record<string, Plano[]> = {
  comprador: [
    {
      nome: "Free",
      preco: 0,
      descricao: "Pra organizar e aprender",
      features: [
        "3 coleções",
        "Até 25 anúncios salvos",
        "Parser de anúncio (texto) limitado/dia",
        "Simulador básico (1 cenário salvo)",
        "Mapa e comparador",
      ],
    },
    {
      nome: "Plus",
      preco: 20,
      descricao: "Pra decidir compra de verdade",
      features: [
        "10 coleções",
        "200 anúncios",
        "Parser multimodal (texto + conversa)",
        "Simulador completo (cenários ilimitados + amortização extra)",
        "Alerta de mudança (manual ou por lembrete)",
        "Export PDF/print (pra enviar pra família)",
      ],
      destaque: true,
    },
    {
      nome: "Pro Comprador",
      preco: 50,
      descricao: "Pra usuário pesado",
      features: [
        "Anúncios ilimitados",
        "IA mais forte (resumo + checklist + riscos)",
        "Score automático 'bom negócio vs caro'",
        "Histórico de visitas e decisões",
        "Compartilhamento privado com família",
      ],
    },
  ],
  vendedor: [
    {
      nome: "Free",
      preco: 0,
      descricao: "Comece a vender",
      features: [
        "1 imóvel",
        "Checklist vendedor básico",
        "Gerador de descrição (1 versão)",
        "Link compartilhável do anúncio",
      ],
    },
    {
      nome: "Plus",
      preco: 20,
      descricao: "Venda mais rápido",
      features: [
        "Até 3 imóveis",
        "Gerador de anúncio 'multi-canal' (portal + insta + whatsapp)",
        "Organizador de leads simples (nome + status + notas)",
        "Checklist com etapas + prazos",
        "'Kit do anúncio': texto + fotos + pontos fortes",
      ],
      destaque: true,
    },
    {
      nome: "Pro Vendedor",
      preco: 50,
      descricao: "Profissionalize sua venda",
      features: [
        "Leads ilimitados",
        "Acompanhamento de concorrentes (comparáveis manuais)",
        "Histórico de mudanças (preço, descrição)",
        "'Assistente de negociação' (scripts + respostas)",
      ],
    },
  ],
  corretor: [
    {
      nome: "Free (solo)",
      preco: 0,
      descricao: "Comece como corretor",
      features: [
        "Até 30 leads",
        "10 anúncios próprios",
        "Funil simples",
        "Parser de anúncio (texto)",
      ],
    },
    {
      nome: "Pro",
      preco: 99,
      descricao: "CRM completo para corretores",
      features: [
        "Leads ilimitados",
        "Funil customizável",
        "Tarefas, lembretes, SLA de resposta",
        "'Briefing do cliente' automático (preferências)",
        "Anúncios próprios ilimitados + páginas públicas",
        "Export pronto p/ portais",
        "Extensão Chrome (captura 1 clique)",
      ],
      destaque: true,
    },
    {
      nome: "Imobiliária",
      preco: 199,
      descricao: "Para equipes e imobiliárias",
      features: [
        "Múltiplos usuários + permissões",
        "Distribuição de leads (fila / regras)",
        "Dashboard do time",
        "Templates por corretor",
        "Biblioteca condomínio/bairro compartilhada",
        "Integrações (Zapier/RD Station depois)",
      ],
    },
  ],
}

function PricingCard({ plano }: { plano: Plano }) {
  return (
    <Card
      className={`relative flex flex-col ${
        plano.destaque
          ? "border-primary border-2 shadow-[0_0_30px_rgba(197,255,1,0.15)]"
          : "border-brightGrey"
      } bg-eerieBlack`}
    >
      {plano.destaque && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-primary text-black px-3 py-1 rounded-full text-xs font-bold">
            Popular
          </span>
        </div>
      )}
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-2xl font-bold text-white">{plano.nome}</CardTitle>
        <CardDescription className="text-ashGray mt-2">{plano.descricao}</CardDescription>
        <div className="mt-4">
          <span className="text-4xl font-bold text-white">
            {plano.preco === 0 ? "Grátis" : `R$ ${plano.preco}`}
          </span>
          {plano.preco > 0 && (
            <span className="text-ashGray text-sm ml-2">/mês</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <ul className="space-y-3">
          {plano.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <span className="text-ashGray text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <button
          className={`w-full py-3 rounded-lg font-medium transition-all ${
            plano.destaque
              ? "bg-primary text-black hover:bg-primary/90"
              : "bg-middleGray text-white hover:bg-fadedGray border border-brightGrey"
          }`}
          disabled
        >
          Em breve
        </button>
      </CardFooter>
    </Card>
  )
}

export default function PlanosPage() {
  return (
    <div className="min-h-[calc(100vh-56px)] bg-black text-white">
      <main className="max-w-7xl mx-auto px-4 py-16 sm:py-24">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            <span className="text-primary">Planos</span>
          </h1>
          <p className="text-lg sm:text-xl text-ashGray max-w-3xl mx-auto">
            Escolha o plano ideal para o seu perfil. De comprador iniciante a imobiliária completa.
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="comprador" className="w-full">
          <div className="flex justify-center mb-8">
            <TabsList className="bg-eerieBlack border border-brightGrey p-1">
              <TabsTrigger
                value="comprador"
                className="data-[state=active]:bg-primary data-[state=active]:text-black data-[state=active]:border-primary"
              >
                Comprador
              </TabsTrigger>
              <TabsTrigger
                value="vendedor"
                className="data-[state=active]:bg-primary data-[state=active]:text-black data-[state=active]:border-primary"
              >
                Vendedor
              </TabsTrigger>
              <TabsTrigger
                value="corretor"
                className="data-[state=active]:bg-primary data-[state=active]:text-black data-[state=active]:border-primary"
              >
                Corretor
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Comprador Plans */}
          <TabsContent value="comprador">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {planos.comprador.map((plano) => (
                <PricingCard key={plano.nome} plano={plano} />
              ))}
            </div>
            <div className="mt-8 text-center">
              <p className="text-ashGray text-sm">
                O comprador paga quando você vira <span className="text-primary font-medium">"minha central de decisão imobiliária"</span>, não só uma lista.
              </p>
            </div>
          </TabsContent>

          {/* Vendedor Plans */}
          <TabsContent value="vendedor">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {planos.vendedor.map((plano) => (
                <PricingCard key={plano.nome} plano={plano} />
              ))}
            </div>
            <div className="mt-8 text-center">
              <p className="text-ashGray text-sm">
                O vendedor paga quando você resolve <span className="text-primary font-medium">"como criar um anúncio que vende e não perder interessados"</span>.
              </p>
            </div>
          </TabsContent>

          {/* Corretor Plans */}
          <TabsContent value="corretor">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {planos.corretor.map((plano) => (
                <PricingCard key={plano.nome} plano={plano} />
              ))}
            </div>
            <div className="mt-8 text-center">
              <p className="text-ashGray text-sm">
                CRM completo com <span className="text-primary font-medium">integração com portais</span> e <span className="text-primary font-medium">gestão de leads</span> profissional.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
