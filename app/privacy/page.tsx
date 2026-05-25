import Link from "next/link"

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 space-y-8">
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Última atualização: maio de 2026</p>
        <h1 className="text-3xl font-bold tracking-tight">Política de Privacidade</h1>
        <p className="text-muted-foreground">
          A Minha Casa ajuda usuários a organizar anúncios, simulações e análises relacionadas a imóveis.
          Esta política resume quais dados coletamos e como eles são usados para operar o serviço.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Dados que coletamos</h2>
        <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
          <li>Dados de conta, como nome, email, imagem de perfil e identificadores retornados por provedores de autenticação, incluindo Google.</li>
          <li>Conteúdo criado no app, como coleções, anúncios, organizações, preferências e dados importados pelo usuário.</li>
          <li>Dados de assinatura e pagamento necessários para processar planos, cobranças e acesso a recursos pagos.</li>
          <li>Cookies e tokens de sessão usados para manter o usuário autenticado e proteger rotas privadas.</li>
          <li>
            Dados do assistente WhatsApp (Meta), como identificador WhatsApp, número de telefone, mensagens
            enviadas ao bot e eventos de webhook, quando você conecta ou usa o canal.
          </li>
          <li>Logs técnicos, métricas operacionais e eventos de erro usados para segurança, suporte e estabilidade.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Como usamos os dados</h2>
        <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
          <li>Autenticar usuários e proteger contas.</li>
          <li>Entregar funcionalidades do app, incluindo coleções, análises, simulações e recursos pagos.</li>
          <li>Processar pagamentos, assinaturas, webhooks e suporte financeiro.</li>
          <li>Melhorar confiabilidade, segurança e experiência do produto.</li>
          <li>Cumprir obrigações legais e prevenir abuso do serviço.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Serviços terceiros</h2>
        <p className="text-muted-foreground">
          Podemos usar provedores como Google OAuth para login, Meta (WhatsApp Cloud API) para o bot de mensagens,
          Vercel para hospedagem, Postgres em VPS ou provedor gerenciado para banco de dados, Stripe ou outro
          processador de pagamento, Google Maps e provedores de IA/APIs externas quando recursos específicos forem usados.
          Cada provedor processa dados conforme suas próprias políticas.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Retenção, exclusão e contato</h2>
        <p className="text-muted-foreground">
          Mantemos dados pelo tempo necessário para operar o serviço, cumprir obrigações legais e resolver disputas.
          Para solicitar exportação, correção ou exclusão de dados, siga as instruções em{" "}
          <Link className="text-app-accent hover:underline" href="/data-deletion">
            Exclusão de dados
          </Link>{" "}
          ou escreva para{" "}
          <a className="text-app-accent hover:underline" href="mailto:me@markkop.dev">
            me@markkop.dev
          </a>
          .
        </p>
      </section>

      <p className="text-sm text-muted-foreground">
        Veja também nossos <Link className="text-app-accent hover:underline" href="/terms">Termos de Uso</Link>.
      </p>
    </main>
  )
}
