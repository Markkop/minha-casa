<script lang="ts">
  const legalLinks = [
    { href: "/privacy", label: "Privacidade" },
    { href: "/terms", label: "Termos" },
    { href: "/data-deletion", label: "Exclusão de dados" }
  ] as const;

  const currentYear = new Date().getFullYear();
</script>

<footer class="marketing-footer">
  <div class="footer-shell">
    <div class="footer-meta">
      <small>© {currentYear} Prisma</small>
      <nav class="footer-links" aria-label="Informações legais">
        {#each legalLinks as link (link.href)}
          <a href={link.href}>{link.label}</a>
        {/each}
      </nav>
    </div>
  </div>
</footer>

<style>
  .marketing-footer {
    position: relative;
    z-index: 5;
    border-top: 1px solid rgba(96, 165, 250, 0.14);
    background:
      radial-gradient(70rem 12rem at 50% 0%, rgba(34, 211, 238, 0.06), transparent 65%),
      linear-gradient(180deg, rgba(5, 11, 26, 0.96), #030711);
    color: #dbeafe;
    color-scheme: dark;
    font-family: "Space Grotesk Variable", "Space Grotesk", ui-sans-serif, system-ui, sans-serif;
    box-shadow: 0 -12px 40px rgba(3, 7, 17, 0.2);
  }

  .footer-shell {
    width: 100%;
    max-width: 1440px;
    margin: 0 auto;
    padding: 0 clamp(1.25rem, 5vw, 5rem);
  }

  .footer-links {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.15rem;
  }

  .footer-links a {
    display: inline-flex;
    min-height: 2.25rem;
    align-items: center;
    border-radius: 0.375rem;
    padding: 0 0.6rem;
    color: #7f9bce;
    font-size: 0.875rem;
    font-weight: 500;
    transition: background-color 180ms ease, color 180ms ease;
  }

  .footer-links a:hover {
    background: rgba(12, 27, 58, 0.72);
    color: #dbeafe;
  }

  .footer-links a:focus-visible {
    outline: 2px solid #67e8f9;
    outline-offset: 1px;
  }

  .footer-meta {
    display: flex;
    min-height: 4.75rem;
    align-items: center;
    justify-content: space-between;
    gap: 1.5rem;
  }

  .footer-meta small {
    color: #4a5f8a;
    font-family: "JetBrains Mono Variable", "JetBrains Mono", ui-monospace, monospace;
    font-size: 0.58rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  @media (max-width: 640px) {
    .footer-meta {
      min-height: 0;
      align-items: flex-start;
      flex-direction: column;
      gap: 0.35rem;
      padding: 1.1rem 0 1.25rem;
    }

    .footer-links {
      justify-content: flex-start;
      flex-wrap: wrap;
      margin-left: -0.6rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .footer-links a {
      transition: none;
    }
  }
</style>
