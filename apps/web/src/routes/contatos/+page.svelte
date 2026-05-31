<script lang="ts">
  import PageScaffold from "$lib/components/layout/PageScaffold.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import CrudTable from "$lib/components/workspace/CrudTable.svelte";
  import { workspaceApi, type Contact } from "$lib/workspace/client";
  import { onMount } from "svelte";

  let contacts = $state<Contact[]>([]);
  let loading = $state(true);
  let saving = $state(false);
  let error = $state("");
  let editingId = $state<string | null>(null);
  let draft = $state({ name: "", phone: "", email: "", notes: "" });

  async function load() {
    loading = true;
    error = "";
    try {
      contacts = (await workspaceApi.fetchContacts()).contacts;
    } catch (err) {
      error = err instanceof Error ? err.message : "Erro ao carregar contatos";
    } finally {
      loading = false;
    }
  }

  onMount(load);

  function edit(row: Contact) {
    editingId = row.id;
    draft = {
      name: row.name ?? "",
      phone: row.phone ?? "",
      email: row.email ?? "",
      notes: row.notes ?? ""
    };
  }

  function reset() {
    editingId = null;
    draft = { name: "", phone: "", email: "", notes: "" };
  }

  async function save() {
    saving = true;
    error = "";
    try {
      const { contact } = await workspaceApi.saveContact(draft, editingId ?? undefined);
      contacts = editingId
        ? contacts.map((row) => (row.id === editingId ? contact : row))
        : [contact, ...contacts];
      reset();
    } catch (err) {
      error = err instanceof Error ? err.message : "Erro ao salvar contato";
    } finally {
      saving = false;
    }
  }

  async function remove(row: Contact) {
    if (!confirm(`Excluir ${row.name || row.phone || row.email}?`)) return;
    await workspaceApi.deleteContact(row.id);
    contacts = contacts.filter((item) => item.id !== row.id);
  }
</script>

<PageScaffold title="Contatos" description="Cadastro de corretores, proprietarios e contatos de anuncios.">
  {#if error}<div class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>{/if}

  <form class="grid gap-3 rounded-md border border-app-border bg-app-surface p-4 md:grid-cols-[1fr_1fr_1fr_1.2fr_auto]" onsubmit={(event) => { event.preventDefault(); void save(); }}>
    <input class="h-10 rounded-md border border-app-border px-3" placeholder="Nome" bind:value={draft.name} />
    <input class="h-10 rounded-md border border-app-border px-3" placeholder="Telefone" bind:value={draft.phone} />
    <input class="h-10 rounded-md border border-app-border px-3" placeholder="Email" bind:value={draft.email} />
    <input class="h-10 rounded-md border border-app-border px-3" placeholder="Notas" bind:value={draft.notes} />
    <div class="flex gap-2">
      <Button type="submit" disabled={saving}>{editingId ? "Salvar" : "Adicionar"}</Button>
      {#if editingId}<Button variant="ghost" onclick={reset}>Cancelar</Button>{/if}
    </div>
  </form>

  <CrudTable
    rows={contacts}
    {loading}
    emptyLabel="Nenhum contato"
    columns={[
      { key: "name", label: "Nome", value: (row) => row.name },
      { key: "phone", label: "Telefone", value: (row) => row.phone },
      { key: "email", label: "Email", value: (row) => row.email },
      { key: "source", label: "Origem", value: (row) => row.source === "listing" ? "anuncio" : "manual" },
      { key: "listings", label: "Anuncios", value: (row) => row.listings?.length ?? 0 }
    ]}
    onEdit={edit}
    onDelete={remove}
  />
</PageScaffold>
