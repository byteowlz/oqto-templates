# octo-templates Repository Instructions

## Purpose

This repository is the central source for Octo platform templates. All templates must be production-grade, reusable, and follow established patterns.

## What This Repository Contains

- **skills/**: Agent skills (SKILL.md + references + scripts)
- **workspaces/**: Pre-configured workspace templates
- **agent-settings/**: AGENTS.md templates (global and personal)
- **document-templates/**: tmpltr TOML/Typst pairs for PDF generation

## What This Repository Does NOT Contain

- Application code (lives in octo repo)
- User-specific configurations
- Generated output files
- Secrets or credentials

---

## Before Implementation

Gather context before creating or modifying templates:

| Source | Gather |
|--------|--------|
| **Existing templates** | Review similar templates for patterns and conventions |
| **Octo repo** | Check `agent_templates/` for reference implementations |
| **skill-creator-pro** | Load skill for creating new skills |
| **User requirements** | Specific use case, constraints, target audience |

---

## Template Standards

### Skills

Skills follow the skill-creator-pro framework. Required structure:

```
skill-name/
├── SKILL.md              # Required: YAML frontmatter + instructions
├── references/           # Optional: Domain expertise documents
│   └── *.md
├── scripts/              # Optional: Executable procedures
│   └── *.sh|*.py
└── assets/               # Optional: Templates, boilerplate
    └── *.*
```

**SKILL.md requirements**:

| Component | Requirement |
|-----------|-------------|
| Frontmatter | `name`, `description` required; `allowed-tools`, `model` optional |
| `name` | Lowercase, numbers, hyphens; ≤64 chars; match directory |
| `description` | [What] + [When triggers]; ≤1024 chars; third-person style |
| Line count | <500 lines (extract to references/) |
| Scope | Document what skill does AND does not do |

**Frontmatter template**:

```yaml
---
name: skill-name
description: |
  [What] Brief capability statement.
  [When] This skill should be used when users ask to <specific triggers>.
allowed-tools: Read, Grep, Glob    # Optional: restrict tools
---
```

**Required sections**:

1. What This Skill Does / Does NOT Do
2. Before Implementation (context gathering)
3. Workflow or process steps
4. Output Checklist
5. Reference Files table (if references/ exists)

### Workspaces

Workspace templates provide pre-configured `.opencode/` directories:

```
workspace-name/
├── .opencode/
│   ├── skill/           # Workspace-specific skills
│   │   └── skill-name/
│   └── plugin/          # Workspace-specific plugins
│       └── *.ts
└── README.md            # Required: purpose, usage, features
```

**README requirements**:

- Purpose statement
- Target use case
- Included skills/plugins
- Setup instructions

### Agent Settings

AGENTS.md templates for configuring agent behavior:

| Type | Location | Purpose |
|------|----------|---------|
| Global | `agent-settings/global/AGENTS.md` | Shared coding standards, conventions |
| Personal | `agent-settings/personal/AGENTS.md` | User-specific context, preferences |

**Content guidelines**:

- Use clear section headers
- Include placeholder values (e.g., `<name>`, `<role>`)
- Document referenced tools/CLIs
- Keep language-specific sections concise

### Document Templates

tmpltr-compatible TOML/Typst pairs:

```
template-name/
├── template.toml         # Content file with placeholders
├── template.typ          # Typst layout (single file)
└── README.md             # Template documentation
```

**TOML requirements**:

- `[meta]` section with template reference
- Example/placeholder data for all fields
- Comments explaining required vs optional fields

**Typst requirements**:

- Single .typ file per template (no splits)
- Import tmpltr-lib helpers
- Safe data access with defaults
- Brand color/font integration

---

## File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Directories | kebab-case | `deep-research/`, `document-generation/` |
| Skills | SKILL.md (uppercase) | `skills/deep-research/SKILL.md` |
| Agent settings | AGENTS.md (uppercase) | `agent-settings/global/AGENTS.md` |
| References | lowercase.md | `references/api-patterns.md` |
| Scripts | lowercase with extension | `scripts/setup.sh` |

---

## Content Guidelines

### Conciseness

Context window is a shared resource. For every piece of content:

- "Does the agent really need this?"
- "Does this paragraph justify its token cost?"
- Prefer concise examples over verbose explanations

### Appropriate Freedom

Match specificity to task fragility:

| Freedom | When | Example |
|---------|------|---------|
| High | Multiple approaches valid | "Choose preferred style" |
| Medium | Preferred pattern exists | Pseudocode with parameters |
| Low | Operations are fragile | Exact scripts, few parameters |

### Reusability

Templates must handle variations, not single use cases:

```
Bad:  "Create bar chart with sales data using Recharts"
Good: "Create visualizations - adaptable to data shape, chart type, library"
```

Identify what VARIES vs what's CONSTANT in each template.

---

## Workflow

### Adding a Skill

1. Load skill-creator-pro: `@skill skill-creator-pro`
2. Follow domain discovery (automatic research)
3. Gather user requirements (use case, constraints)
4. Create skill directory under `skills/`
5. Write SKILL.md with frontmatter + body
6. Add references/ if domain needs documentation
7. Add scripts/ if procedures need exact execution
8. Test skill activation and execution
9. Update README.md skill table

### Adding a Workspace

1. Create directory under `workspaces/`
2. Add `.opencode/` structure with skills and plugins
3. Write README.md with purpose and usage
4. Test workspace in Octo session

### Adding a Document Template

1. Create directory under `document-templates/`
2. Add .toml content file with example data
3. Add .typ Typst template following tmpltr conventions
4. Write README.md with field documentation
5. Test with `tmpltr compile`
6. Verify PDF output

### Updating Templates

1. Make changes to template files
2. Update version numbers in frontmatter if applicable
3. Test the template
4. Update README if behavior changed

---

## Testing

Before committing any template:

| Type | Test Method |
|------|-------------|
| Skills | Load in opencode, verify trigger phrases activate skill |
| Workspaces | Copy to test session, verify agent behavior |
| Agent settings | Apply to agent, verify behavior matches instructions |
| Document templates | Compile with `tmpltr compile`, review PDF output |

---

## Output Checklist

Before committing:

- [ ] Template follows directory structure for its type
- [ ] File naming conventions followed
- [ ] Required sections present
- [ ] Content is concise and token-efficient
- [ ] No secrets or user-specific data
- [ ] README.md updated if adding new templates
- [ ] Template tested and working
