## The contract (ADR-0038, accepted 2026-08-09)

- An app is **workspace source**: manifest, source, tests, relative assets. Ordinary
  inspectable files — never hidden state, never installed blobs.
- Two optional presentations:
  - **declarative**: validated UI *data* (JSON payloads rendered by the host's native
    registry) — forms, tables, dashboards, approvals.
  - **sandboxed web**: a self-contained bundle (HTML/TS/JS) rendered in an
    iframe/WebView with CSP; egress only through granted capabilities.
- **No agent-authored React, Rust, Swift, or other code loads into an OqtoUI host
  process.** Your code runs in its own document (standalone workbench today,
  sandboxed frame later). This is a contract, not a preference.
- Initial capabilities (files, Account-private preference KV, notifications,
  theme; later: operations, session input, navigation, dialogs, egress) are
  **declared, never self-granted**.
- Binding is the narrowest durable owner that contains the app's data
  (work-directory → workspace → account → deployment). Never widen silently.
- The manifest preserves unknown fields; assets are bounded; discovery rejects
  symlink escape and path traversal.

## No YAML

App implementation is code and data. Manifests are **TOML** (repo precedent:
`sandbox.toml`, `dependencies.toml`); declarative UI payloads are **JSON**
(validated against the host's advertised profile). If you find yourself writing a
`.yaml` file for an Oqto app, stop — that is out of contract. The manifest format
is provisionally TOML pending the format decision ADR-0027 deferred; the
`schema` key marks compatibility.

## Agent editability contract

An App is incomplete until a backend agent can inspect and change its durable
content without manipulating the UI. Choose the shallowest sufficient interface:

1. **Files first:** use documented, versioned JSON/Markdown/CSV/media files for
   content and configuration. The App reads a bound ref, watches version changes,
   and refreshes without rebuild or reload. App saves use expected-version/atomic
   replacement; direct agent writes use temp-file + rename. Define a conflict
   policy and recover watcher generation gaps by stat/re-read.
2. **Semantic CLI when needed:** let the authoring agent build a small CLI beside
   the App for validation, transactions, imports, or derived behavior. Give it
   stable operation IDs, a fixed executable/argument array, bounded JSON
   stdin/stdout, schemas, deterministic exit codes, timeouts, and expected
   revisions. UI, CLI, and MCP derive from one operations table; publication pins
   the executable with the Definition.
3. **MCP is an adapter:** expose the same operations to agents through a
   runner-managed MCP/harness adapter when useful. Never make MCP, a socket, or UI
   automation the only route to content.

Keep live Instance data in its bound work-directory resource, outside immutable
App source; fixtures may live in the App package. Document the agent interface in
the App README: canonical data files, schemas, which edits are safe, refresh
behavior, build/test/publish commands, operation
IDs, and conflict recovery. Keep personal preferences in Account-private KV;
shared/business content belongs in bound files or separately granted versioned
shared state. Source edits follow the normal Chat build/test/publish loop; content
edits must update open Views live without rebuilding the App.

Required proof:

- an external file edit becomes visible in an already-open App;
- an App edit is immediately inspectable through the documented files/CLI;
- stale concurrent writes fail instead of clobbering an agent's update;
- file watcher gaps converge through stat/re-read;
- CLI, UI, and MCP adapters pass the same operation scenarios;
- deleting browser storage loses preferences only, never authoritative content.

Anti-patterns: business data only in localStorage/IndexedDB; opaque binary state
without an inspect/export/edit adapter; UI-only mutations; whole-string shell
commands; an App-controlled workdir socket; separate CLI/MCP behavior that drifts
from the UI.

## Files capability v0.1 (contract — tracked as oqto-xcgg)

Canonical package: `~/byteowlz/oqto-app-sdk/` (`@byteowlz/oqto-app-sdk`).

```ts
type OqtoFileRef = string & Opaque;      // stable resource identity
type OqtoFileVersion = string & Opaque;  // freshness token; equality only

type OqtoFileWriteResult =
  | { ok: true; stat: OqtoFileStat }
  | { ok: false; reason: "conflict"; currentVersion: OqtoFileVersion };

interface OqtoFilesCapability {
  pick(opts?): Promise<readonly OqtoFileDescriptor[]>;
  read(ref): Promise<OqtoFileContents>;  // Uint8Array + current stat/version
  stat(ref): Promise<OqtoFileStat>;      // no bytes
  write(ref, bytes: Uint8Array, opts: { expectedVersion: OqtoFileVersion }):
    Promise<OqtoFileWriteResult>;
  watch(ref, cb: (change: OqtoFileChange) => void): Promise<() => void>;
}

interface OqtoHostContext {
  instanceId: string;
  capabilities: readonly OqtoCapability[]; // granted, not merely requested
  bound?: { ref: OqtoFileRef; role: "document"; access: "read" | "readwrite" };
}
```

Refs and versions are separate opaque tokens. Apps may persist refs in the same
Instance's KV but never construct or parse them; the Host revalidates scope on
every use. There is deliberately no unconditional document write. A conflict is
an expected result: re-read and apply the App's domain-specific rebase policy.
`stat` is the polling fallback; `watch` emits coalescible version-only changes.
Host-driven “Open with” supplies `host.context.bound` at mount.

## Authoring rules (full)

1. Import `connectOqtoApp()` from `@byteowlz/oqto-app-sdk`; React Apps may use the
   optional `@byteowlz/oqto-app-sdk/react` provider. Do not duplicate manifest
   metadata in runtime code.
2. Reach the outside world **only** through granted Host capabilities (`files`,
   `kv`, `notifications`, `theme`). No `fetch` to Oqto, direct DOM/window escape,
   shell/store import, credential, path, mount, or control socket.
3. Consume theme snapshots/tokens from the read-only `theme` capability; do not
   hardcode a host scheme or mutate Oqto appearance.
4. List used capabilities in `requested_capabilities`; that request is never a
   grant. Test with `@byteowlz/oqto-app-sdk/testing`, including external-write
   conflicts and bridge disconnects.
5. The bundle is self-contained: no external network, no CDN scripts. CSP defaults
   to packaged-bundle-only.
6. Declarative payloads carry no logic — data only, validated against the
   advertised profile; fail loudly with a declared fallback when unsupported.

