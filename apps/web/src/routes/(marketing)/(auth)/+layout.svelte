<script lang="ts">
  import AuthForm from "$lib/components/auth/AuthForm.svelte";

  let { children } = $props<{
    children?: import("svelte").Snippet;
  }>();
</script>

{@render children?.()}
<AuthForm />
