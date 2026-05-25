import Link from "next/link"

const SUPPORT_EMAIL = "me@markkop.dev"

export default function DataDeletionPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 space-y-8">
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Última atualização: maio de 2026</p>
        <h1 className="text-3xl font-bold tracking-tight">Exclusão de dados</h1>
        <p className="text-muted-foreground">
          Esta página explica como solicitar a exclusão dos seus dados no Minha Casa, incluindo dados
          obtidos por meio do WhatsApp (Meta) e da sua conta no site.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">A quem se aplica</h2>
        <p className="text-muted-foreground">
          Usuários do Minha Casa que acessam o serviço pelo site, conectam o assistente pelo WhatsApp
          (incluindo o número de teste ou produção da Meta) ou vinculam outros canais, como o Telegram.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Quais dados podemos excluir</h2>
        <ul className="list-disc space-y-2 pl-6 text-muted-foreground">
          <li>
            <strong>WhatsApp (Meta):</strong> identificador WhatsApp (<code className="text-sm">wa_id</code>),
            número de telefone, códigos de vinculação, eventos de webhook e histórico de conversas do bot
            vinculado à sua conta.
          </li>
          <li>
            <strong>Conta Minha Casa:</strong> perfil, email, sessões, coleções, anúncios importados,
            organizações e demais conteúdo criado no aplicativo.
          </li>
          <li>
            <strong>Telegram (se conectado):</strong> identificador do chat, códigos de vinculação e dados
            associados ao bot no Telegram — solicite separadamente se quiser remover apenas esse canal.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Como solicitar exclusão</h2>
        <ol className="list-decimal space-y-4 pl-6 text-muted-foreground">
          <li>
            <strong>Apenas dados do WhatsApp</strong> — Envie um email para{" "}
            <a
              className="text-app-accent hover:underline"
              href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Exclusão de dados WhatsApp")}`}
            >
              {SUPPORT_EMAIL}
            </a>{" "}
            com o assunto <em>Exclusão de dados WhatsApp</em> e informe o número de WhatsApp que você
            usou com o bot. Removemos a vinculação, códigos pendentes, eventos de webhook e metadados
            de conversa associados a esse número.
          </li>
          <li>
            <strong>Conta completa no Minha Casa</strong> — Envie um email para{" "}
            <a
              className="text-app-accent hover:underline"
              href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Exclusão de conta Minha Casa")}`}
            >
              {SUPPORT_EMAIL}
            </a>{" "}
            com o assunto <em>Exclusão de conta Minha Casa</em> e o email de login da sua conta.
            Excluímos o usuário e os dados vinculados (coleções, anúncios, integrações WhatsApp/Telegram,
            sessões, etc.). Hoje essa exclusão é processada manualmente pela nossa equipe após validação
            da solicitação.
          </li>
          <li>
            <strong>Pelo painel da Meta (Facebook)</strong> — Se você removeu o app nas configurações da
            Meta, acesse{" "}
            <a
              className="text-app-accent hover:underline"
              href="https://www.facebook.com/settings?tab=applications"
              rel="noopener noreferrer"
              target="_blank"
            >
              Apps e sites no Facebook
            </a>{" "}
            e solicite a exclusão de dados conforme as instruções da Meta. Mesmo assim, envie-nos um email
            (opção 1 ou 2 acima) para garantir que cópias em nossos servidores sejam removidas.
          </li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Prazo</h2>
        <p className="text-muted-foreground">
          Confirmamos o recebimento em até 7 dias úteis e concluímos a exclusão em até 30 dias, salvo
          retenção exigida por lei (por exemplo, registros financeiros de assinaturas).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Contato</h2>
        <p className="text-muted-foreground">
          Dúvidas ou pedidos de correção/exportação:{" "}
          <a className="text-app-accent hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
        </p>
      </section>

      <p className="text-sm text-muted-foreground">
        Veja também a{" "}
        <Link className="text-app-accent hover:underline" href="/privacy">
          Política de Privacidade
        </Link>{" "}
        e os{" "}
        <Link className="text-app-accent hover:underline" href="/terms">
          Termos de Uso
        </Link>
        .
      </p>
    </main>
  )
}
