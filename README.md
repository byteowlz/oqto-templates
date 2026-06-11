# oqto-templates

Canonical template content for Oqto.

This repository now uses three top-level template families aligned with Oqto distribution packaging:

- `pi-agent/` - baseline `~/.pi/agent` content
- `workdir-templates/` - project/workspace template variants
- `onboarding-templates/` - onboarding document templates (`BOOTSTRAP.md`, `PERSONALITY.md`, `USER.md`, `AGENTS.md`)

## Directory layout

```text
oqto-templates/
├── pi-agent/
│   ├── AGENTS.md
│   ├── mcp.json
│   ├── extensions/
│   ├── skills/
│   └── prompts/
├── workdir-templates/
│   ├── main/
│   ├── coder/
│   ├── automation/
│   └── ...
├── onboarding-templates/
│   └── onboarding/
│       ├── BOOTSTRAP.md
│       ├── PERSONALITY.md
│       ├── USER.md
│       └── AGENTS.md
├── skills/
├── agents/          # legacy path (kept temporarily for compatibility)
└── dotfiles/        # legacy path (kept temporarily for compatibility)
```

## Mapping from legacy paths

- `dotfiles/.pi/agent/*` -> `pi-agent/*`
- `agents/<name>/*` -> `workdir-templates/<name>/*`
- `agents/main/{BOOTSTRAP,PERSONALITY,USER,AGENTS}.md` -> `onboarding-templates/onboarding/*.md`

## Notes

- New integrations should use the new canonical paths.
- Legacy `agents/` and `dotfiles/` remain for now to avoid breaking existing consumers while Oqto migrates.
