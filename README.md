# octo-templates

Central repository for Octo platform templates including skills, agent settings, workspace templates, and document templates.

## Overview

This repository provides reusable components for configuring AI agents running in the [Octo platform](https://github.com/byteowlz/octo):

- **Skills**: Specialized capabilities that extend agent functionality
- **Workspaces**: Pre-configured agent environments for specific use cases
- **Agent Settings**: AGENTS.md templates for personal and global agent configuration
- **Document Templates**: TOML/Typst templates for document generation via tmpltr

## Directory Structure

```
octo-templates/
├── skills/                     # Reusable agent skills
│   ├── deep-research/          # Multi-agent research workflow
│   ├── document-generation/    # PDF generation via tmpltr
│   ├── octo-platform/          # Platform-specific operations
│   └── ...
├── workspaces/                 # Complete workspace templates
│   ├── researcher/             # Research-focused agent
│   ├── developer/              # Software development agent
│   └── main/                   # General-purpose orchestrator
├── agent-settings/             # AGENTS.md templates
│   ├── global/                 # Shared coding standards
│   └── personal/               # Personal preferences template
└── document-templates/         # tmpltr document templates
    ├── agenda/                 # Meeting agenda template
    ├── quote/                  # Project quote template
    └── ...
```

## Skills

Skills are specialized knowledge modules that give agents domain-specific capabilities.

### Skill Format

Each skill is a directory containing:

```
skill-name/
├── SKILL.md              # Main skill definition (YAML frontmatter + instructions)
├── references/           # Optional reference documents
│   └── *.md
└── templates/            # Optional template files
    └── *.*
```

### Skill Frontmatter

```yaml
---
name: skill-name
description: When to use this skill and what it does
license: MIT
---
```

### Available Skills

| Skill | Description |
|-------|-------------|
| `deep-research` | Multi-agent research producing academic-quality reports |
| `document-generation` | PDF document creation via tmpltr |
| `octo-platform` | Octo API, CLI, and platform operations |
| `webapp-testing` | Browser automation and testing via Playwright |

## Workspaces

Workspace templates provide pre-configured `.opencode/` directories for specific agent roles.

### Usage

Copy a workspace template into your session:

```bash
cp -r workspaces/researcher/.opencode ~/workspace/.opencode
```

### Available Workspaces

| Workspace | Purpose |
|-----------|---------|
| `researcher` | Deep research with multi-agent coordination |
| `main` | Orchestrator with session delegation capabilities |
| `developer` | Software development with testing and deployment |

## Agent Settings

AGENTS.md templates for configuring agent behavior and context.

### Global Settings (`agent-settings/global/`)

Shared standards applied to all agents:

- Coding conventions by language
- Configuration patterns (XDG compliance)
- Documentation standards
- Tool preferences

### Personal Settings (`agent-settings/personal/`)

Template for personal agent customization:

- User context and preferences
- Directory structure
- Tool integrations (lst, mmry)
- Working patterns

## Document Templates

tmpltr-compatible TOML/Typst template pairs for generating professional PDFs.

### Format

```
template-name/
├── template.toml         # Content file with placeholder values
├── template.typ          # Typst layout template
└── README.md             # Template documentation
```

### Usage with tmpltr

```bash
# Copy template and customize
cp document-templates/agenda/agenda.toml my-agenda.toml

# Edit content
$EDITOR my-agenda.toml

# Compile to PDF
tmpltr compile my-agenda.toml --brand byteowlz -o output.pdf
```

## Installation

### Manual

Clone and symlink desired templates:

```bash
git clone https://github.com/byteowlz/octo-templates.git

# Symlink a skill
ln -s ~/octo-templates/skills/deep-research ~/.opencode/skill/deep-research

# Copy agent settings
cp ~/octo-templates/agent-settings/global/AGENTS.md ~/.config/opencode/AGENTS.md
```

### Via Octo Platform

Templates are automatically available in Octo sessions when configured in `~/.config/octo/config.toml`:

```toml
[templates]
repo = "~/byteowlz/octo-templates"
```

## Contributing

### Adding a Skill

1. Create directory under `skills/`
2. Add `SKILL.md` with YAML frontmatter
3. Include reference docs in `references/` if needed
4. Add entry to this README

### Adding a Workspace

1. Create directory under `workspaces/`
2. Add `.opencode/` structure with skills and plugins
3. Document the workspace purpose

### Adding a Document Template

1. Create directory under `document-templates/`
2. Add `.toml` content file and `.typ` Typst template
3. Include README with example content

## License

MIT
