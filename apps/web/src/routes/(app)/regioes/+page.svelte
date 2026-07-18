<script lang="ts">
  import PageScaffold from "$lib/components/layout/PageScaffold.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import CrudTable from "$lib/components/workspace/CrudTable.svelte";
  import { workspaceApi, type Region } from "$lib/workspace/client";
  import { onMount } from "svelte";

  let regions = $state<Region[]>([]);
  let loading = $state(true);
  let saving = $state(false);
  let error = $state("");
  let editingId = $state<string | null>(null);
  let draft = $state({ city: "", neighborhood: "", propertyType: "house" as "house" | "apartment", pricePerM2: 0, notes: "" });

  async function load() {
    loading = true;
    error = "";
    try {
      regions = (await workspaceApi.fetchRegions()).regions;
    } catch (err) {
      error = err instanceof Error ? err.message : "Erro ao carregar regioes";
    } finally {
      loading = false;
    }
  }

  onMount(load);

  function edit(row: Region) {
    editingId = row.id;
    draft = {
      city: row.city,
      neighborhood: row.neighborhood,
      propertyType: row.propertyType,
      pricePerM2: row.pricePerM2,
      notes: row.notes ?? ""
    };
  }

  function reset() {
    editingId = null;
    draft = { city: "", neighborhood: "", propertyType: "house", pricePerM2: 0, notes: "" };
  }

  async function save() {
    saving = true;
    error = "";
    try {
      const { region } = await workspaceApi.saveRegion(draft, editingId ?? undefined);
      regions = editingId
        ? regions.map((row) => (row.id === editingId ? region : row))
        : [region, ...regions];
      reset();
    } catch (err) {
      error = err instanceof Error ? err.message : "Erro ao salvar regiao";
    } finally {
      saving = false;
    }
  }

  async function remove(row: Region) {
    if (!confirm(`Excluir ${row.neighborhood}, ${row.city}?`)) return;
    await workspaceApi.deleteRegion(row.id);
    regions = regions.filter((item) => item.id !== row.id);
  }
</script>

<PageScaffold title="Regiões" description="Regiões de interesse do workspace.">
  {#if error}<div class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>{/if}

  <form class="grid gap-3 rounded-md border border-app-border bg-app-surface p-4 md:grid-cols-[1fr_1fr_160px_160px_1fr_auto]" onsubmit={(event) => { event.preventDefault(); void save(); }}>
    <input class="h-10 rounded-md border border-app-border px-3" placeholder="Cidade" bind:value={draft.city} required />
    <input class="h-10 rounded-md border border-app-border px-3" placeholder="Bairro" bind:value={draft.neighborhood} required />
    <select class="h-10 rounded-md border border-app-border px-3" bind:value={draft.propertyType}>
      <option value="house">Casa</option>
      <option value="apartment">Apartamento</option>
    </select>
    <input class="h-10 rounded-md border border-app-border px-3" type="number" min="0" placeholder="R$/m2" bind:value={draft.pricePerM2} required />
    <input class="h-10 rounded-md border border-app-border px-3" placeholder="Notas" bind:value={draft.notes} />
    <div class="flex gap-2">
      <Button type="submit" disabled={saving}>{editingId ? "Salvar" : "Adicionar"}</Button>
      {#if editingId}<Button variant="ghost" onclick={reset}>Cancelar</Button>{/if}
    </div>
  </form>

  <CrudTable
    rows={regions}
    {loading}
    emptyLabel="Nenhuma regiao"
    columns={[
      { key: "city", label: "Cidade", value: (row) => row.city },
      { key: "neighborhood", label: "Bairro", value: (row) => row.neighborhood },
      { key: "propertyType", label: "Tipo", value: (row) => row.propertyType },
      { key: "pricePerM2", label: "R$/m2", value: (row) => row.pricePerM2 },
      { key: "listingCount", label: "Imóveis", value: (row) => row.listingCount ?? 0 }
    ]}
    onEdit={edit}
    onDelete={remove}
  />
</PageScaffold>
