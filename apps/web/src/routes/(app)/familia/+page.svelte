<script lang="ts">
  import OrganizationMembersManager from "$lib/components/organizations/OrganizationMembersManager.svelte";

  let { data } = $props();
</script>

<OrganizationMembersManager
  kind="family"
  initialOrganizations={data.organizations}
  initialActiveOrganizationId={data.activeOrganizationId}
  initialError={data.organizationsError}
/>
