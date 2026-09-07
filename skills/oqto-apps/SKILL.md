---
name: oqto-apps
description: Author user/agent-creatable Oqto apps per ADR-0038 — runtime-discovered workspace Apps with agent-editable file/CLI state, a TOML manifest, and declarative and/or sandboxed-web presentation. Use when creating, reviewing, or debugging an Oqto app, manifest, capability integration, live file workflow, or semantic CLI/operation surface. Never YAML.
---

# Authoring Oqto apps (ADR-0038)

## What you are building

An **Oqto app** is workspace source that the host discovers at runtime:
a manifest, app source, tests, and relative assets — ordinary inspectable files,
never hidden state or installed blobs.

## Agent-editable by default

Every App must expose a simple durable state plane that backend agents can edit
without driving its UI. Prefer documented files plus live reload. Add a schema-
validated JSON CLI/operation table only when validation, transactions, or derived
behavior justify it. Browser storage/KV is preferences only, never authoritative
shared content. See [REFERENCE.md](REFERENCE.md#agent-editability-contract).

## Before authoring
Inspect the target binding, existing data formats/CLIs, and conversation decisions.
Choose files versus semantic CLI deliberately; ask only when ownership
(personal/shared) or mutation invariants are genuinely unclear.

## Scaffold (preferred entry point)

Use the SDK's dependency-free scaffold instead of hand-writing the skeleton:

```bash
# managed hosts: offline SDK store provisioned at $OQTO_APP_SDK_HOME
oqto-app-init <App Name> --dir <workdir>/oqto-apps
# explicit SDK location (bun/npx both work):
bunx oqto-app-init <App Name> --dir <workdir>/oqto-apps --sdk "file:$OQTO_APP_SDK_PATH"
```

It creates `<workdir>/oqto-apps/<app-id>.oqtoapp/` with a publishable
manifest (`oqto-app/v0`, sandboxed-web, work-directory binding, KV grant),
a minimal themed presentation (`src/app.ts` + `bundle/index.html`), and a
package.json whose `@byteowlz/oqto-app-sdk` dependency resolves without
network: `--sdk` wins, then `$OQTO_APP_SDK_PATH`, then the newest version
directory under `$OQTO_APP_SDK_HOME`, then a version-pinned github fallback.
Then edit the generated `oqto-app.toml` to request the capabilities the App
actually needs; remember every package change requires republish.

## Quick start

```bash
cd <workdir>/oqto-apps/<app-id>.oqtoapp
bun install && bun run build
# use @byteowlz/oqto-app-sdk/testing for deterministic host/concurrency tests
```

App skeleton, manifest example, and sanity checklist: see [EXAMPLES.md](EXAMPLES.md).
Full contract and capability semantics: see [REFERENCE.md](REFERENCE.md).

## App layout (working convention — provisional)

```
<workdir>/oqto-apps/<app-id>.oqtoapp/
  oqto-app.toml          # manifest (TOML, schema "oqto-app/v0")
  src/                   # presentation source
  fixtures/              # optional sample/test content, not live instance data
  operations/            # optional pinned CLI/operation implementation
  bundle/                # built sandboxed-web entry (self-contained)
  ui/                    # declarative UI data payloads (JSON)
  test/                  # app + agent-editability tests
```

Live user/shared content belongs in the Instance's bound work-directory resource,
not inside the immutable App package; keep only fixtures beside source. The resolver
is specified in ADR-0038 but not implemented (`oqto-efbj`). Keep this provisional
layout mechanical so migration is a move, not a rewrite.

## Hard rules

1. Durable user/shared content must remain agent-editable through documented files
   with live refresh or through stable semantic operations backed by a JSON CLI.
   Never trap authoritative content in localStorage, IndexedDB, UI-only state, or
   an MCP-only interface.
2. The sandboxed presentation's only outside surface is `connectOqtoApp()` and
   its granted capabilities (`files`, `kv`, `notifications`, `theme`). No `fetch` to Oqto,
   DOM/window escape, shell/store import, credential, path, mount, or socket.
3. Theme via read-only Host theme snapshots/tokens — never mutate or hardcode Oqto
   appearance.
4. Capabilities used must appear in manifest `requested_capabilities`; a request
   is not a grant. Test with `@byteowlz/oqto-app-sdk/testing`.
5. Bundles are self-contained (CSP: packaged bundle only, no CDN, no network).
6. Declarative payloads are data only, validated against the advertised profile,
   with a declared fallback.
7. Manifests are TOML — never YAML.

## Verification loop

The SDK test Host exercises the real MessageChannel protocol — no running Oqto
required. Prove that an external agent edit updates an open interface, App writes
remain visible to agents, conflicts do not clobber data, and CLI/UI operations
share parity. Also test watcher coalescing, missing grants, and disconnects. Then
run the preview/screenshot loop at real viewports (1440×900, 390×844).

## Boundary — do not fabricate

The runtime side of ADR-0038 is **designed, not implemented**: filesystem
discovery/resolver, Installation/Instance/binding records, live capability grants,
the Gate, and OqtoUI iframe host. The SDK and Bridge protocol exist locally in
`~/byteowlz/oqto-app-sdk`; the live adapters do not. If your task requires those,
stop and say so — track against `oqto-efbj` / `oqto-xcgg` — instead of inventing loader code, grant APIs, or
manifest fields the host will never read. When asked how the app gets "installed"
today, the honest answer is: it doesn't; it runs standalone via the workbench and
is structured for discovery.

## Open questions — ask, don't assume

- Binding kind and capability set beyond the SDK's initial four (ADR-0038 lists more).
- Whether the app needs a Sidecar (server-side execution — ADR-0027, gated).
- Catalog/distribution mechanics (deferred in ADR-0027).
