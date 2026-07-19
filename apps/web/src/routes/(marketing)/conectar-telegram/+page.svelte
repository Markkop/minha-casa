<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { getSession } from "$lib/auth-client";
  import { formatApiError } from "$lib/api/error-message";
  import Button from "$lib/components/ui/Button.svelte";
  import { workspaceApi, type TelegramStatus } from "$lib/workspace/client";

  type LinkState = "idle" | "linking" | "success" | "error";

  const pendingKey = "minha-casa:pending-tg-link-code";

  let code = $state("");
  let manualCode = $state("");
  let linkState = $state<LinkState>("idle");
  let error = $state("");
  let sessionChecked = $state(false);
  let isAuthenticated = $state(false);
  let status = $state<TelegramStatus | null>(null);

  const redirectPath = $derived(code ? `/conectar-telegram?tg=${encodeURIComponent(code)}` : "/conectar-telegram");

  onMount(async () => {
    const params = new URLSearchParams(window.location.search);
    const urlCode = params.get("tg")?.trim() ?? "";
    code = urlCode || window.localStorage.getItem(pendingKey) || "";
    manualCode = code;
    if (code) window.localStorage.setItem(pendingKey, code);

    const session = await getSession();
    isAuthenticated = Boolean(session.data?.user);
    sessionChecked = true;

    if (isAuthenticated) {
      await loadStatus();
      if (code && linkState !== "success") {
        await connect(code);
      }
    }
  });

  async function loadStatus() {
    try {
      status = await workspaceApi.fetchTelegramStatus();
    } catch {
      status = { linked: false };
    }
  }

  async function connect(linkCode = manualCode) {
    const trimmed = linkCode.trim();
    if (!trimmed) return;
    code = trimmed;
    window.localStorage.setItem(pendingKey, trimmed);
    linkState = "linking";
    error = "";

    try {
      await workspaceApi.linkTelegram(trimmed);
      window.localStorage.removeItem(pendingKey);
      linkState = "success";
      await loadStatus();
    } catch (err) {
      linkState = "error";
      error = formatApiError(err, { action: "conectar o Telegram" });
    }
  }
</script>

<main class="grid min-h-screen place-items-center bg-app-bg px-4 text-app-fg">
  <section class="w-full max-w-md rounded-md border border-app-border bg-app-surface p-6 shadow-sm">
    <h1 class="text-2xl font-semibold">Conectar Telegram</h1>

    {#if !sessionChecked}
      <p class="mt-3 text-sm text-app-muted">Verificando sessao...</p>
    {:else if !isAuthenticated && code}
      <p class="mt-3 text-sm leading-6 text-app-muted">
        Entre ou crie sua conta para vincular o Telegram. O codigo
        <span class="font-mono font-medium text-app-fg">{code}</span> sera usado apos o login.
      </p>
      <div class="mt-6 flex flex-col gap-3">
        <a href={`/login?redirect=${encodeURIComponent(redirectPath)}`}><Button class="w-full">Entrar</Button></a>
        <a href={`/signup?redirect=${encodeURIComponent(redirectPath)}`}><Button class="w-full" variant="secondary">Criar conta</Button></a>
      </div>
    {:else if linkState === "success"}
      <p class="mt-3 text-sm leading-6 text-app-muted">
        Sua conta foi vinculada. Volte ao Telegram e envie anuncios, links ou arquivos para analise.
      </p>
      <Button class="mt-6 w-full" onclick={() => void goto("/lista")}>Ir para Lista</Button>
    {:else}
      <p class="mt-3 text-sm leading-6 text-app-muted">
        Envie uma mensagem para o bot no Telegram para receber um link com codigo de conexao.
      </p>

      {#if isAuthenticated && status?.linked}
        <div class="mt-4 rounded-md border border-app-border bg-white p-3 text-sm text-app-muted">
          Telegram ja conectado ao chat {status.chatId}.
        </div>
      {/if}

      <form class="mt-5 flex flex-col gap-3" onsubmit={(event) => { event.preventDefault(); void connect(); }}>
        <label class="text-sm font-medium" for="tg-code">Codigo</label>
        <input
          id="tg-code"
          class="h-10 rounded-md border border-app-border bg-white px-3"
          bind:value={manualCode}
          placeholder="Codigo recebido no Telegram"
        />
        {#if error}
          <p class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        {/if}
        <Button type="submit" disabled={!isAuthenticated || linkState === "linking"}>
          {linkState === "linking" ? "Conectando..." : "Conectar agora"}
        </Button>
      </form>
    {/if}
  </section>
</main>
