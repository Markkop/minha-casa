<script lang="ts">
  import PageScaffold from "$lib/components/layout/PageScaffold.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import CrudTable from "$lib/components/workspace/CrudTable.svelte";
  import { workspaceApi, type Condominium } from "$lib/workspace/client";
  import { onMount } from "svelte";

  let condominiums = $state<Condominium[]>([]);
  let loading = $state(true);
  let saving = $state(false);
  let error = $state("");
  let editingId = $state<string | null>(null);
  let draft = $state({
    name: "",
    city: "",
    neighborhood: "",
    address: "",
    propertyType: "" as "" | "casa" | "apartamento",
    amenities: "",
    notes: ""
  });

  async function load() {
    loading = true;
    error = "";
    try {
      condominiums = (await workspaceApi.fetchCondominiums()).condominiums;
    } catch (err) {
      error = err instanceof Error ? err.message : "Erro ao carregar condominios";
    } finally {
      loading = false;
    }
  }

  onMount(load);

  function edit(row: Condominium) {
    editingId = row.id;
    draft = {
      name: row.name,
      city: row.city ?? "",
      neighborhood: row.neighborhood ?? "",
      address: row.address ?? "",
      propertyType: row.propertyType ?? "",
      amenities: (row.amenities ?? []).join(", "),
      notes: row.notes ?? ""
    };
  }

  function reset() {
    editingId = null;
    draft = { name: "", city: "", neighborhood: "", address: "", propertyType: "", amenities: "", notes: "" };
  }

  async function save() {
    saving = true;
    error = "";
    try {
      const payload = {
        ...draft,
        propertyType: draft.propertyType || null,
        amenities: draft.amenities.split(",").map((item) => item.trim()).filter(Boolean)
      };
      const { condominium } = await workspaceApi.saveCondominium(payload, editingId ?? undefined);
      condominiums = editingId
        ? condominiums.map((row) => (row.id === editingId ? condominium : row))
        : [condominium, ...condominiums];
      reset();
    } catch (err) {
      error = err instanceof Error ? err.message : "Erro ao salvar condominio";
    } finally {
      saving = false;
    }
  }

  async function remove(row: Condominium) {
    if (!confirm(`Excluir ${row.name}?`)) return;
    await workspaceApi.deleteCondominium(row.id);
    condominiums = condominiums.filter((item) => item.id !== row.id);
  }
</script>

<PageScaffold title="Condominios" description="Cadastro e classificacao de condominios.">
  {#if error}<div class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>{/if}

  <form class="grid gap-3 rounded-md border border-app-border bg-app-surface p-4 md:grid-cols-3 xl:grid-cols-[1fr_1fr_1fr_1.4fr_160px_1fr_auto]" onsubmit={(event) => { event.preventDefault(); void save(); }}>
    <input class="h-10 rounded-md border border-app-border px-3" placeholder="Nome" bind:value={draft.name} required />
    <input class="h-10 rounded-md border border-app-border px-3" placeholder="Cidade" bind:value={draft.city} />
    <input class="h-10 rounded-md border border-app-border px-3" placeholder="Bairro" bind:value={draft.neighborhood} />
    <input class="h-10 rounded-md border border-app-border px-3" placeholder="Endereco" bind:value={draft.address} />
    <select class="h-10 rounded-md border border-app-border px-3" bind:value={draft.propertyType}>
      <option value="">Tipo</option>
      <option value="casa">Casa</option>
      <option value="apartamento">Apartamento</option>
    </select>
    <input class="h-10 rounded-md border border-app-border px-3" placeholder="Amenidades" bind:value={draft.amenities} />
    <div class="flex gap-2">
      <Button type="submit" disabled={saving}>{editingId ? "Salvar" : "Adicionar"}</Button>
      {#if editingId}<Button variant="ghost" onclick={reset}>Cancelar</Button>{/if}
    </div>
  </form>

  <CrudTable
    rows={condominiums}
    {loading}
    emptyLabel="Nenhum condominio"
    columns={[
      { key: "name", label: "Nome", value: (row) => row.name },
      { key: "city", label: "Cidade", value: (row) => row.city },
      { key: "neighborhood", label: "Bairro", value: (row) => row.neighborhood },
      { key: "propertyType", label: "Tipo", value: (row) => row.propertyType },
      { key: "listingCount", label: "Anuncios", value: (row) => row.listingCount ?? 0 }
    ]}
    onEdit={edit}
    onDelete={remove}
  />
</PageScaffold>
