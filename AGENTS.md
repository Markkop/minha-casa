<INSTRUCTIONS>

- Use pnpm
- This project is in build mode, so for any task you receive, consider this project as a draft and favor reworks, refactors and doing things the right way first.

- For validations, don't run frontend builds unless asked to.
- When working with a docker backend, make sure to rebuild it after code changes to be like a "hot reload"
```bash
docker run --rm -v "$(pwd)/backend:/app" -w /app elixir:1.18-otp-27-alpine \
  sh -lc 'apk add --no-cache build-base git && mix local.hex --force && mix local.rebar --force && mix deps.get'
```

- Never commit API keys, tokens, or secrets in source files (including tests and one-off scripts).
- If user pastes a key, use it, but assume the user will rotate it later. Say that to the user when doing that.
- After completing a task, you may run the commands you would ask the user to do to validate.
- Unless it's too risky. If it is, show how the user could run and ask if you can proceed by confirming you can run them.

- This project is being migrated/was migrated from a NextJs project, so feel free to fix and improve from left overs/bad migration.


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
