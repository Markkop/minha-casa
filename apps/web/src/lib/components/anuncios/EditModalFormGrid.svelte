<script lang="ts">
  import Input from "$lib/components/ui/Input.svelte";
  import type { Imovel } from "$lib/anuncios/types";
  import type { Condominium, Region } from "$lib/workspace/client";
  import {
    EDIT_MODAL_INPUT_CLASS,
    EDIT_MODAL_SELECT_CLASS,
    applyInputChange,
    applyNumberInputChange,
    boolSelectValue
  } from "$lib/components/anuncios/edit-modal-shared";

  type UniqueContact = { name: string | null; number: string };

  let {
    formData = $bindable(),
    autoTitle,
    regions,
    condominiums,
    uniqueContacts = []
  } = $props<{
    formData: Partial<Imovel>;
    autoTitle: string;
    regions: Region[];
    condominiums: Condominium[];
    uniqueContacts?: UniqueContact[];
  }>();

  function handleInputChange(field: keyof Imovel, value: string | number | boolean | null) {
    formData = applyInputChange(formData, field, value);
  }

  function handleNumberInputChange(field: keyof Imovel, value: string) {
    formData = applyNumberInputChange(formData, field, value);
  }

  function handleBooleanChange(field: keyof Imovel, value: string) {
    handleInputChange(field, value === "null" ? null : value === "true");
  }

  function handleTipoImovelChange(value: string) {
    const tipo: Imovel["tipoImovel"] =
      value === "null" ? null : value === "casa" || value === "apartamento" ? value : null;
    handleInputChange("tipoImovel", tipo);
  }

  function handleNullableStringChange(field: keyof Imovel, value: string) {
    handleInputChange(field, value === "none" ? null : value);
  }

  function handleSelectExistingContact(contact: UniqueContact) {
    formData = {
      ...formData,
      contactName: contact.name,
      contactNumber: contact.number
    };
  }
</script>

<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
  <div class="space-y-2 md:col-span-2">
    <span class="text-sm text-app-muted">Título automático</span>
    <p class="text-sm text-app-fg">{autoTitle}</p>
    <label for="tituloManual" class="text-sm text-app-muted">Título personalizado (opcional)</label>
    <Input
      id="tituloManual"
      type="text"
      value={formData.tituloManual || ""}
      oninput={(e) => handleInputChange("tituloManual", e.currentTarget.value || null)}
      placeholder="Substitui o título automático"
      class={EDIT_MODAL_INPUT_CLASS}
    />
    {#if formData.tituloManual?.trim()}
      <button
        type="button"
        class="text-xs text-app-accent hover:underline"
        onclick={() => handleInputChange("tituloManual", null)}
      >
        Usar título automático
      </button>
    {/if}
  </div>

  <div class="space-y-2 md:col-span-2">
    <label for="endereco" class="text-sm text-app-muted">Endereço *</label>
    <Input
      id="endereco"
      type="text"
      value={formData.endereco || ""}
      oninput={(e) => handleInputChange("endereco", e.currentTarget.value)}
      placeholder="Ex: Itacorubi, Florianópolis - SC"
      class={EDIT_MODAL_INPUT_CLASS}
    />
  </div>

  <div class="space-y-2">
    <label for="bairro" class="text-sm text-app-muted">Bairro</label>
    <Input
      id="bairro"
      type="text"
      value={formData.bairro || ""}
      oninput={(e) => handleInputChange("bairro", e.currentTarget.value)}
      placeholder="Ex: Campeche"
      class={EDIT_MODAL_INPUT_CLASS}
    />
  </div>

  <div class="space-y-2">
    <label for="cidade" class="text-sm text-app-muted">Cidade</label>
    <Input
      id="cidade"
      type="text"
      value={formData.cidade || ""}
      oninput={(e) => handleInputChange("cidade", e.currentTarget.value)}
      placeholder="Ex: Florianópolis"
      class={EDIT_MODAL_INPUT_CLASS}
    />
  </div>

  <div class="space-y-2">
    <label for="m2Totais" class="text-sm text-app-muted">m² total</label>
    <Input
      id="m2Totais"
      type="number"
      value={formData.m2Totais ?? ""}
      oninput={(e) => handleNumberInputChange("m2Totais", e.currentTarget.value)}
      placeholder="Ex: 720"
      class={EDIT_MODAL_INPUT_CLASS}
    />
  </div>

  <div class="space-y-2">
    <label for="m2Privado" class="text-sm text-app-muted">m² privado</label>
    <Input
      id="m2Privado"
      type="number"
      value={formData.m2Privado ?? ""}
      oninput={(e) => handleNumberInputChange("m2Privado", e.currentTarget.value)}
      placeholder="Ex: 330"
      class={EDIT_MODAL_INPUT_CLASS}
    />
  </div>

  <div class="space-y-2">
    <label for="quartos" class="text-sm text-app-muted">Quartos</label>
    <Input
      id="quartos"
      type="number"
      value={formData.quartos ?? ""}
      oninput={(e) => handleNumberInputChange("quartos", e.currentTarget.value)}
      placeholder="Ex: 4"
      class={EDIT_MODAL_INPUT_CLASS}
    />
  </div>

  <div class="space-y-2">
    <label for="suites" class="text-sm text-app-muted">Suítes</label>
    <Input
      id="suites"
      type="number"
      value={formData.suites ?? ""}
      oninput={(e) => handleNumberInputChange("suites", e.currentTarget.value)}
      placeholder="Ex: 2"
      class={EDIT_MODAL_INPUT_CLASS}
    />
  </div>

  <div class="space-y-2">
    <label for="banheiros" class="text-sm text-app-muted">Banheiros</label>
    <Input
      id="banheiros"
      type="number"
      value={formData.banheiros ?? ""}
      oninput={(e) => handleNumberInputChange("banheiros", e.currentTarget.value)}
      placeholder="Ex: 3"
      class={EDIT_MODAL_INPUT_CLASS}
    />
  </div>

  <div class="space-y-2">
    <label for="garagem" class="text-sm text-app-muted">Garagem</label>
    <Input
      id="garagem"
      type="number"
      value={formData.garagem ?? ""}
      oninput={(e) => handleNumberInputChange("garagem", e.currentTarget.value)}
      placeholder="Ex: 2"
      class={EDIT_MODAL_INPUT_CLASS}
    />
  </div>

  <div class="space-y-2">
    <label for="preco" class="text-sm text-app-muted">Preço (R$)</label>
    <Input
      id="preco"
      type="number"
      value={formData.preco ?? ""}
      oninput={(e) => handleNumberInputChange("preco", e.currentTarget.value)}
      placeholder="Ex: 850000"
      class={EDIT_MODAL_INPUT_CLASS}
    />
  </div>

  <div class="space-y-2">
    <label for="piscina" class="text-sm text-app-muted">Piscina</label>
    <select
      id="piscina"
      value={boolSelectValue(formData.piscina)}
      onchange={(e) => handleBooleanChange("piscina", e.currentTarget.value)}
      class={EDIT_MODAL_SELECT_CLASS}
    >
      <option value="null">Não informado</option>
      <option value="true">Sim</option>
      <option value="false">Não</option>
    </select>
  </div>

  <div class="space-y-2">
    <label for="piscinaTermica" class="text-sm text-app-muted">Piscina Térmica</label>
    <select
      id="piscinaTermica"
      value={boolSelectValue(formData.piscinaTermica)}
      onchange={(e) => handleBooleanChange("piscinaTermica", e.currentTarget.value)}
      class={EDIT_MODAL_SELECT_CLASS}
    >
      <option value="null">Não informado</option>
      <option value="true">Sim</option>
      <option value="false">Não</option>
    </select>
  </div>

  <div class="space-y-2">
    <label for="porteiro24h" class="text-sm text-app-muted">Porteiro 24h</label>
    <select
      id="porteiro24h"
      value={boolSelectValue(formData.porteiro24h)}
      onchange={(e) => handleBooleanChange("porteiro24h", e.currentTarget.value)}
      class={EDIT_MODAL_SELECT_CLASS}
    >
      <option value="null">Não informado</option>
      <option value="true">Sim</option>
      <option value="false">Não</option>
    </select>
  </div>

  <div class="space-y-2">
    <label for="academia" class="text-sm text-app-muted">Academia</label>
    <select
      id="academia"
      value={boolSelectValue(formData.academia)}
      onchange={(e) => handleBooleanChange("academia", e.currentTarget.value)}
      class={EDIT_MODAL_SELECT_CLASS}
    >
      <option value="null">Não informado</option>
      <option value="true">Sim</option>
      <option value="false">Não</option>
    </select>
  </div>

  <div class="space-y-2">
    <label for="vistaLivre" class="text-sm text-app-muted">Vista Livre</label>
    <select
      id="vistaLivre"
      value={boolSelectValue(formData.vistaLivre)}
      onchange={(e) => handleBooleanChange("vistaLivre", e.currentTarget.value)}
      class={EDIT_MODAL_SELECT_CLASS}
    >
      <option value="null">Não informado</option>
      <option value="true">Sim</option>
      <option value="false">Não</option>
    </select>
  </div>

  <div class="space-y-2">
    <label for="andar" class="text-sm text-app-muted">Andar (0-10, onde 10 = 10+)</label>
    <Input
      id="andar"
      type="number"
      min={0}
      max={10}
      value={formData.andar ?? ""}
      oninput={(e) => handleNumberInputChange("andar", e.currentTarget.value)}
      placeholder="Ex: 5"
      class={EDIT_MODAL_INPUT_CLASS}
    />
  </div>

  <div class="space-y-2">
    <label for="tipoImovel" class="text-sm text-app-muted">Tipo de Imóvel</label>
    <select
      id="tipoImovel"
      value={formData.tipoImovel ?? "null"}
      onchange={(e) => handleTipoImovelChange(e.currentTarget.value)}
      class={EDIT_MODAL_SELECT_CLASS}
    >
      <option value="null">Não informado</option>
      <option value="casa">Casa</option>
      <option value="apartamento">Apartamento</option>
    </select>
  </div>

  <div class="space-y-2">
    <label for="regionId" class="text-sm text-app-muted">Região de referência</label>
    <select
      id="regionId"
      value={formData.regionId ?? "none"}
      onchange={(e) => handleNullableStringChange("regionId", e.currentTarget.value)}
      class={EDIT_MODAL_SELECT_CLASS}
    >
      <option value="none">Sem região</option>
      {#each regions as region (region.id)}
        <option value={region.id}>
          {region.neighborhood}, {region.city} · {region.propertyType}
        </option>
      {/each}
    </select>
  </div>

  <div class="space-y-2">
    <label for="condominiumId" class="text-sm text-app-muted">Condomínio salvo</label>
    <select
      id="condominiumId"
      value={formData.condominiumId ?? "none"}
      onchange={(e) => {
        const value = e.currentTarget.value;
        handleNullableStringChange("condominiumId", value);
        const condominium = condominiums.find((item: Condominium) => item.id === value);
        if (condominium) handleInputChange("condominiumName", condominium.name);
      }}
      class={EDIT_MODAL_SELECT_CLASS}
    >
      <option value="none">Sem condomínio salvo</option>
      {#each condominiums as condominium (condominium.id)}
        <option value={condominium.id}>{condominium.name}</option>
      {/each}
    </select>
  </div>

  <div class="space-y-2 md:col-span-2">
    <label for="condominiumName" class="text-sm text-app-muted">Nome do condomínio</label>
    <Input
      id="condominiumName"
      type="text"
      value={formData.condominiumName || ""}
      oninput={(e) => handleInputChange("condominiumName", e.currentTarget.value)}
      placeholder="Ex: Residencial Atlântico"
      class={EDIT_MODAL_INPUT_CLASS}
    />
  </div>

  <div class="space-y-2 md:col-span-2">
    <label for="link" class="text-sm text-app-muted">Link</label>
    <Input
      id="link"
      type="url"
      value={formData.link || ""}
      oninput={(e) => handleInputChange("link", e.currentTarget.value)}
      placeholder="Ex: https://www.zapimoveis.com.br/imovel/..."
      class={EDIT_MODAL_INPUT_CLASS}
    />
  </div>

  <div class="space-y-2 md:col-span-2">
    <label for="imageUrl" class="text-sm text-app-muted">Image URL</label>
    <Input
      id="imageUrl"
      type="url"
      value={formData.imageUrl || ""}
      oninput={(e) => handleInputChange("imageUrl", e.currentTarget.value)}
      placeholder="Ex: https://example.com/image.jpg"
      class={EDIT_MODAL_INPUT_CLASS}
    />
  </div>

  <div class="space-y-2">
    <label for="addedAt" class="text-sm text-app-muted">Adicionado por você</label>
    <Input
      id="addedAt"
      type="date"
      value={formData.addedAt || "2025-12-31"}
      oninput={(e) => handleInputChange("addedAt", e.currentTarget.value)}
      class={EDIT_MODAL_INPUT_CLASS}
    />
  </div>

  <div class="space-y-2">
    <label for="sitePublishedAt" class="text-sm text-app-muted">Publicado no site</label>
    <Input
      id="sitePublishedAt"
      type="date"
      value={formData.sitePublishedAt || ""}
      oninput={(e) => handleInputChange("sitePublishedAt", e.currentTarget.value || null)}
      class={EDIT_MODAL_INPUT_CLASS}
    />
  </div>

  <div class="space-y-2 md:col-span-2">
    <label for="siteUpdatedAt" class="text-sm text-app-muted">Atualizado no site</label>
    <Input
      id="siteUpdatedAt"
      type="date"
      value={formData.siteUpdatedAt || ""}
      oninput={(e) => handleInputChange("siteUpdatedAt", e.currentTarget.value || null)}
      class={EDIT_MODAL_INPUT_CLASS}
    />
  </div>

  <div class="space-y-2 md:col-span-2">
    <label for="discardedReason" class="text-sm text-app-muted">Motivo de descarte</label>
    <Input
      id="discardedReason"
      type="text"
      value={formData.discardedReason || ""}
      oninput={(e) => handleInputChange("discardedReason", e.currentTarget.value)}
      placeholder="Ex: Preço muito alto, localização ruim..."
      class={EDIT_MODAL_INPUT_CLASS}
    />
  </div>

  {#if uniqueContacts.length > 0}
    <div class="space-y-2 md:col-span-2">
      <label for="existing-contact" class="text-sm text-app-muted">Selecionar Contato Existente</label>
      <select
        id="existing-contact"
        value=""
        onchange={(e) => {
          const value = e.currentTarget.value;
          if (!value) return;
          const contact = uniqueContacts.find((c: UniqueContact) => c.number === value);
          if (contact) handleSelectExistingContact(contact);
          e.currentTarget.value = "";
        }}
        class={EDIT_MODAL_SELECT_CLASS}
      >
        <option value="">Selecionar contato existente...</option>
        {#each uniqueContacts as contact (contact.number)}
          <option value={contact.number}>
            {#if contact.name}
              {contact.name} ({contact.number})
            {:else}
              {contact.number}
            {/if}
          </option>
        {/each}
      </select>
    </div>
  {/if}

  <div class="space-y-2 md:col-span-2">
    <label for="contactName" class="text-sm text-app-muted">Nome do Contato</label>
    <Input
      id="contactName"
      type="text"
      value={formData.contactName || ""}
      oninput={(e) => handleInputChange("contactName", e.currentTarget.value)}
      placeholder="Ex: João Silva"
      class={EDIT_MODAL_INPUT_CLASS}
    />
  </div>

  <div class="space-y-2 md:col-span-2">
    <label for="contactNumber" class="text-sm text-app-muted">Número WhatsApp</label>
    <Input
      id="contactNumber"
      type="text"
      value={formData.contactNumber || ""}
      oninput={(e) => handleInputChange("contactNumber", e.currentTarget.value)}
      placeholder="Ex: 48996792216"
      class={EDIT_MODAL_INPUT_CLASS}
    />
  </div>
</div>
