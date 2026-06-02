<script lang="ts">
  import Input from "$lib/components/ui/Input.svelte";
  import AnchoredPopover from "$lib/components/ui/AnchoredPopover.svelte";
  import FloatingTooltip from "$lib/components/ui/FloatingTooltip.svelte";
  import WhatsAppIcon from "$lib/components/anuncios/WhatsAppIcon.svelte";
  import type { ListingRowInteractions } from "$lib/components/anuncios/listing-row-interactions.svelte";
  import { cn } from "$lib/utils";

  let {
    interactions,
    uniqueContacts,
    actionMutedClass,
    actionIconClass,
    inputClass,
    onClose
  }: {
    interactions: ListingRowInteractions;
    uniqueContacts: { name: string | null; number: string }[];
    actionMutedClass: string;
    actionIconClass: string;
    inputClass: string;
    onClose: () => void;
  } = $props();
</script>

<AnchoredPopover
  bind:open={interactions.contactPopoverOpen}
  align="auto"
  panelClass="w-64 p-3"
  {onClose}
>
  {#snippet trigger()}
    <FloatingTooltip
      label="Adicionar contato WhatsApp"
      side="bottom"
      disabled={interactions.contactPopoverOpen}
    >
      <button
        type="button"
        class={actionMutedClass}
        aria-label="Adicionar contato WhatsApp"
        onclick={() => interactions.openContactPopover()}
      >
        <WhatsAppIcon class={cn(actionIconClass, "size-3.5")} />
      </button>
    </FloatingTooltip>
  {/snippet}
  <div class="space-y-3">
    <p class="text-sm font-medium text-app-muted">Contato WhatsApp</p>
    {#if uniqueContacts.length > 0}
      <select
        class="w-full rounded border border-app-border bg-app-surface-muted px-2 py-1.5 text-sm text-app-fg"
        value=""
        onchange={(event) => {
          const contact = uniqueContacts.find((c) => c.number === event.currentTarget.value);
          if (contact) interactions.handleSelectExistingContact(contact);
        }}
      >
        <option value="">Selecionar contato existente...</option>
        {#each uniqueContacts as contact (contact.number)}
          <option value={contact.number}>
            {contact.name || contact.number}
            {contact.name ? ` (${contact.number})` : ""}
          </option>
        {/each}
      </select>
    {/if}
    <div class="space-y-2">
      <Input
        bind:value={interactions.contactNameInput}
        placeholder="Nome do contato"
        ariaLabel="Nome do contato"
        class={inputClass}
      />
      <Input
        bind:value={interactions.contactNumberInput}
        placeholder="Ex: 48996792216"
        ariaLabel="Número do WhatsApp"
        class={inputClass}
        onkeydown={(event: KeyboardEvent) => {
          if (event.key === "Enter") void interactions.handleSaveContact();
        }}
      />
    </div>
    <div class="flex gap-2">
      <button
        type="button"
        onclick={onClose}
        class="flex-1 rounded border border-app-border bg-app-surface-muted px-3 py-1.5 text-sm text-app-fg transition-colors hover:border-app-action hover:text-app-accent"
      >
        Cancelar
      </button>
      <button
        type="button"
        onclick={() => void interactions.handleSaveContact()}
        class="flex-1 rounded bg-app-action px-3 py-1.5 text-sm text-app-action-foreground transition-colors hover:bg-app-action-hover"
      >
        Salvar
      </button>
    </div>
  </div>
</AnchoredPopover>
