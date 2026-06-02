<script lang="ts">
  const supportEmail = "me@markkop.dev";
</script>

<main class="mx-auto max-w-3xl space-y-8 px-6 py-12">
  <div class="space-y-3">
    <p class="text-sm text-muted-foreground">Última atualização: maio de 2026</p>
    <h1 class="text-3xl font-bold tracking-tight">Exclusão de dados</h1>
    <p class="text-muted-foreground">
      Esta página explica como solicitar a exclusão dos seus dados no Minha Casa, incluindo dados
      obtidos por meio do WhatsApp (Meta) e da sua conta no site.
    </p>
  </div>

  <section class="space-y-3">
    <h2 class="text-xl font-semibold">A quem se aplica</h2>
    <p class="text-muted-foreground">
      Usuários do Minha Casa que acessam o serviço pelo site, conectam o assistente pelo WhatsApp
      ou vinculam outros canais, como o Telegram.
    </p>
  </section>

  <section class="space-y-3">
    <h2 class="text-xl font-semibold">Quais dados podemos excluir</h2>
    <ul class="list-disc space-y-2 pl-6 text-muted-foreground">
      <li><strong>WhatsApp (Meta):</strong> identificador WhatsApp, número de telefone, códigos de vinculação, eventos de webhook e histórico de conversas do bot vinculado à sua conta.</li>
      <li><strong>Conta Minha Casa:</strong> perfil, email, sessões, coleções, anúncios importados, organizações e demais conteúdo criado no aplicativo.</li>
      <li><strong>Telegram (se conectado):</strong> identificador do chat, códigos de vinculação e dados associados ao bot no Telegram.</li>
    </ul>
  </section>

  <section class="space-y-3">
    <h2 class="text-xl font-semibold">Como solicitar exclusão</h2>
    <ol class="list-decimal space-y-4 pl-6 text-muted-foreground">
      <li>
        <strong>Apenas dados do WhatsApp</strong> — Envie um email para
        <a class="text-app-accent hover:underline" href={`mailto:${supportEmail}?subject=${encodeURIComponent("Exclusão de dados WhatsApp")}`}>{supportEmail}</a>
        com o assunto <em>Exclusão de dados WhatsApp</em> e informe o número usado com o bot.
      </li>
      <li>
        <strong>Conta completa no Minha Casa</strong> — Envie um email para
        <a class="text-app-accent hover:underline" href={`mailto:${supportEmail}?subject=${encodeURIComponent("Exclusão de conta Minha Casa")}`}>{supportEmail}</a>
        com o assunto <em>Exclusão de conta Minha Casa</em> e o email de login da sua conta.
      </li>
      <li>
        <strong>Pelo painel da Meta (Facebook)</strong> — Se você removeu o app nas configurações da Meta, acesse
        <a class="text-app-accent hover:underline" href="https://www.facebook.com/settings?tab=applications" rel="noopener noreferrer" target="_blank">Apps e sites no Facebook</a>
        e solicite a exclusão de dados conforme as instruções da Meta.
      </li>
    </ol>
  </section>

  <section class="space-y-3">
    <h2 class="text-xl font-semibold">Prazo</h2>
    <p class="text-muted-foreground">
      Confirmamos o recebimento em até 7 dias úteis e concluímos a exclusão em até 30 dias, salvo retenção exigida por lei.
    </p>
  </section>

  <section class="space-y-3">
    <h2 class="text-xl font-semibold">Contato</h2>
    <p class="text-muted-foreground">
      Dúvidas ou pedidos de correção/exportação:
      <a class="text-app-accent hover:underline" href={`mailto:${supportEmail}`}>{supportEmail}</a>
    </p>
  </section>

  <p class="text-sm text-muted-foreground">
    Veja também a <a class="text-app-accent hover:underline" href="/privacy">Política de Privacidade</a>
    e os <a class="text-app-accent hover:underline" href="/terms">Termos de Uso</a>.
  </p>
</main>
