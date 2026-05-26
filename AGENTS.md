<INSTRUCTIONS>
Don't run frontend builds unless asked to.
Docker builds/recreates are allowed after code changes when needed to verify or run the updated app.

Never commit API keys, tokens, or secrets in source files (including tests and one-off scripts).
Use `.env`, `.env.local`, or env examples with placeholders only. Rotate any key that was ever committed.

When needed, access the production VPS using `.ssh-prod` at the repository root.
The file is ignored by git and uses this format:

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
