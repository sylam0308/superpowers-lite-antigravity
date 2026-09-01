# Contributor instructions

This directory is the source of truth for the `superpowers-lite` Antigravity plugin.

- Keep the baseline rule short and proportional. A clear local change must stay a quick task.
- Keep each workflow self-contained. Do not add mandatory bootstrap, brainstorming, worktrees, subagents, commits, hooks, telemetry, or MCP servers.
- Write runtime instructions in concise English. Keep user documentation in Vietnamese and English.
- Never edit an installed App or CLI copy directly. Run `scripts/deploy.ps1` after validation.
- Add or update validator and fixture coverage for any behavioral change.
- Preserve upstream attribution without copying upstream skill text verbatim.
- Do not commit or push unless the user explicitly asks.

Before reporting a change complete, run:

```powershell
node tests/validate.mjs
agy plugin validate .
pwsh -File scripts/verify-install.ps1 -Surface Source
```
