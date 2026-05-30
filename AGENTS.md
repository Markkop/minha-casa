<INSTRUCTIONS>

## Property analysis

Property deep analysis results use schema v6 (`clima`, `riscos`, `mercado`, `ambientes`, `idade`, per-card `xray` with blind spots and orçamento). Ambiente inventory uses structured `{tipo, material?, detalhe?}` items from controlled vocabularies (estruturais, instalações, móveis, materiais) — no color in inventory output. Pre-v6 rows are not migrated; users must re-run analysis.

## Docker & local dev

Don't run frontend builds unless asked to.

Docker builds/recreates are allowed after code changes when needed to verify or run the updated app.

Do rebuild Phoenix in local docker after code changes.

## Elixir / Mix

Mix is often not installed on the host (Docker-only workflow). Do not ask the user to install Elixir.

Use the same base image as `backend/Dockerfile` (`elixir:1.18-otp-27-alpine`) with `backend/` mounted at `/app` to resolve deps, refresh `mix.lock`, run tests, format, etc. The release image (`phoenix-api`) does not include Mix.

```bash
docker run --rm -v "$(pwd)/backend:/app" -w /app elixir:1.18-otp-27-alpine \
  sh -lc 'apk add --no-cache build-base git && mix local.hex --force && mix local.rebar --force && mix deps.get'
```

Replace the final `mix …` command as needed (`mix test`, `mix format`, `mix deps.unlock …`, etc.).

## Secrets & environment

Never commit API keys, tokens, or secrets in source files (including tests and one-off scripts).

Use `.env`, `.env.local`, or env examples with placeholders only. 

If user pastes a key, use it, but assume the user will rotate it later. Say that to the user when doing that.

## Production VPS

When needed, access the production VPS using `.ssh-prod` at the repository root. The file is ignored by git and uses this format:

```text
user@host
password
```

Use `sshpass` without printing the password:

```bash
VPS_TARGET="$(sed -n '1p' .ssh-prod)"
VPS_PASSWORD="$(sed -n '2p' .ssh-prod)"
sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no "$VPS_TARGET" "hostname"
```

</INSTRUCTIONS>
