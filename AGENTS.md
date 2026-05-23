<INSTRUCTIONS>
Don't run build unless asked to.

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
