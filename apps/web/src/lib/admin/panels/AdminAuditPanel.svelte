<script lang="ts">
  import { History } from "@lucide/svelte";
  import type { AdminState } from "./use-admin-state.svelte";

  let { admin }: { admin: AdminState } = $props();
</script>

<section class="rounded-md border border-app-border bg-app-surface">
  <div class="border-b border-app-border p-4">
    <h2 class="font-semibold">Auditoria da plataforma</h2>
    <p class="text-sm text-app-muted">Ações globais retornadas pela API administrativa, quando disponíveis.</p>
  </div>

  {#if admin.stats?.auditEvents?.length}
    <div class="divide-y divide-app-border">
      {#each admin.stats.auditEvents as event (event.id)}
        <div class="grid gap-2 p-4 text-sm md:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <div class="font-medium">{event.action}</div>
            <div class="text-app-muted">
              {event.actorName ?? event.actorEmail ?? "Sistema"}
              {#if event.targetLabel} · {event.targetLabel}{/if}
            </div>
            {#if event.reason}<div class="mt-1 text-xs text-app-muted">Motivo: {event.reason}</div>{/if}
          </div>
          <time class="text-xs text-app-muted" datetime={event.insertedAt}>{admin.formatDate(event.insertedAt)}</time>
        </div>
      {/each}
    </div>
  {:else}
    <div class="flex flex-col items-center px-6 py-12 text-center">
      <span class="rounded-full bg-app-surface-muted p-3"><History class="h-6 w-6 text-app-muted" /></span>
      <h3 class="mt-3 font-medium">Auditoria central ainda não retornada</h3>
      <p class="mt-1 max-w-xl text-sm text-app-muted">
        A API atual mantém históricos de assinaturas e concessões nos respectivos usuários e organizações. Esta área
        exibirá o audit log global assim que ele fizer parte da resposta administrativa.
      </p>
    </div>
  {/if}
</section>
