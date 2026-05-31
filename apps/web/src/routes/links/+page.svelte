<script lang="ts">
  import PageScaffold from "$lib/components/layout/PageScaffold.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import CrudTable from "$lib/components/workspace/CrudTable.svelte";
  import { workspaceApi, type SavedLink } from "$lib/workspace/client";
  import { onMount } from "svelte";

  let links = $state<SavedLink[]>([]);
  let loading = $state(true);
  let saving = $state(false);
  let error = $state("");
  let editingId = $state<string | null>(null);
  let draft = $state({ title: "", url: "", description: "" });

  async function load() {
    loading = true;
    error = "";
    try {
      links = (await workspaceApi.fetchSavedLinks()).links;
    } catch (err) {
      error = err instanceof Error ? err.message : "Erro ao carregar links";
    } finally {
      loading = false;
    }
  }

  onMount(load);

  function edit(row: SavedLink) {
    editingId = row.id;
    draft = { title: row.title, url: row.url, description: row.description ?? "" };
  }

  function reset() {
    editingId = null;
    draft = { title: "", url: "", description: "" };
  }

  async function save() {
    saving = true;
    error = "";
    try {
      if (editingId) {
        const { link } = await workspaceApi.updateSavedLink(editingId, draft);
        links = links.map((row) => (row.id === editingId ? link : row));
      } else {
        const { link } = await workspaceApi.createSavedLink(draft);
        links = [link, ...links];
      }
      reset();
    } catch (err) {
      error = err instanceof Error ? err.message : "Erro ao salvar link";
    } finally {
      saving = false;
    }
  }

  async function remove(row: SavedLink) {
    if (!confirm(`Excluir ${row.title}?`)) return;
    await workspaceApi.deleteSavedLink(row.id);
    links = links.filter((item) => item.id !== row.id);
  }

  async function enrich() {
    if (!editingId) return;
    saving = true;
    try {
      const { link } = await workspaceApi.enrichSavedLink(editingId);
      links = links.map((row) => (row.id === editingId ? link : row));
      edit(link);
    } finally {
      saving = false;
    }
  }
</script>

<PageScaffold title="Links" description="Links salvos e enriquecimento de metadados.">
  {#if error}<div class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>{/if}

  <form class="grid gap-3 rounded-md border border-app-border bg-app-surface p-4 md:grid-cols-[1fr_1.2fr_1.5fr_auto]" onsubmit={(event) => { event.preventDefault(); void save(); }}>
    <input class="h-10 rounded-md border border-app-border px-3" placeholder="Titulo" bind:value={draft.title} />
    <input class="h-10 rounded-md border border-app-border px-3" placeholder="https://..." bind:value={draft.url} required />
    <input class="h-10 rounded-md border border-app-border px-3" placeholder="Descricao" bind:value={draft.description} />
    <div class="flex gap-2">
      <Button type="submit" disabled={saving}>{editingId ? "Salvar" : "Adicionar"}</Button>
      {#if editingId}
        <Button variant="secondary" onclick={enrich} disabled={saving}>Enriquecer</Button>
        <Button variant="ghost" onclick={reset}>Cancelar</Button>
      {/if}
    </div>
  </form>

  <CrudTable
    rows={links}
    {loading}
    emptyLabel="Nenhum link salvo"
    columns={[
      { key: "title", label: "Titulo", value: (row) => row.title },
      { key: "url", label: "URL", value: (row) => row.url },
      { key: "description", label: "Descricao", value: (row) => row.description }
    ]}
    onEdit={edit}
    onDelete={remove}
  />
</PageScaffold>
