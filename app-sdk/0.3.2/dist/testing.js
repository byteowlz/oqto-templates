import { OqtoAppError } from "./errors.js";
import { createOqtoFileRef, createOqtoFileVersion, serveOqtoAppPort, } from "./host.js";
import { isJsonValue } from "./internal/json.js";
import { parseHostContext } from "./internal/protocol.js";
import { connectOqtoAppPort } from "./internal/rpc-client.js";
import { OQTO_APP_PROTOCOL_V1, } from "./types.js";
const DEFAULT_PRESENTATION = {
    surface: "container",
    width: 960,
    height: 720,
    sizeClass: "regular",
    density: "comfortable",
    safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
    reducedMotion: false,
};
/**
 * Deterministic in-memory host. `connect()` always exercises the real
 * MessageChannel bridge, so tests catch structured-clone and protocol drift.
 */
export function createTestHost(options = {}) {
    const files = new Map();
    const collections = new Map();
    const refs = new Map();
    const collectionRefs = new Map();
    for (const seed of options.files ?? []) {
        if (files.has(seed.id))
            throw new OqtoAppError("invalid", `Duplicate test file id: ${seed.id}`);
        const file = {
            id: seed.id,
            ref: makeRef(seed.id),
            role: seed.role ?? seed.id,
            label: seed.label ?? seed.id,
            mediaType: seed.mediaType ?? "application/octet-stream",
            access: seed.access ?? "readwrite",
            watch: seed.watch ?? true,
            bytes: toBytes(seed.bytes),
            revision: 1,
        };
        files.set(seed.id, file);
        refs.set(file.ref, file);
    }
    for (const seed of options.collections ?? []) {
        if (files.has(seed.id) || collections.has(seed.id)) {
            throw new OqtoAppError("invalid", `Duplicate test resource id: ${seed.id}`);
        }
        for (const entry of seed.entries)
            requireFileById(files, entry);
        const collection = {
            id: seed.id,
            ref: makeRef(seed.id),
            role: seed.role ?? seed.id,
            label: seed.label ?? seed.id,
            access: seed.access ?? "read",
            watch: seed.watch ?? true,
            entries: [...seed.entries],
        };
        collections.set(seed.id, collection);
        collectionRefs.set(collection.ref, collection);
    }
    const capabilities = options.capabilities ??
        ["files", "kv", "theme", "notifications", "operations", "presentation"];
    const boundFile = options.boundFileId === undefined ? undefined : requireFileById(files, options.boundFileId);
    const operationSeeds = new Map();
    for (const seed of options.operations ?? [])
        operationSeeds.set(seed.id, seed);
    const grantedResources = [
        ...Array.from(files.values()).map((file) => ({
            role: file.role,
            ref: file.ref,
            label: file.label,
            mediaType: file.mediaType,
            access: file.access,
            kind: "document",
            watch: file.watch,
        })),
        ...Array.from(collections.values()).map((collection) => ({
            role: collection.role,
            ref: collection.ref,
            label: collection.label,
            mediaType: "inode/directory",
            access: collection.access,
            kind: "collection",
            watch: collection.watch,
        })),
    ];
    const grantedOperations = Array.from(operationSeeds.values()).map((seed) => (seed.summary === undefined ? { id: seed.id } : { id: seed.id, summary: seed.summary }));
    const buildContext = (protocol) => ({
        protocol,
        instanceId: options.instanceId ?? "test-instance",
        installationId: "test-installation",
        definitionId: "test-definition",
        capabilities,
        // v0 has no way to convey resource or operation detail, so a v0 mount sees
        // the capability list only — the same degradation a real v0 host produces.
        grants: protocol === OQTO_APP_PROTOCOL_V1
            ? { capabilities, resources: grantedResources, operations: grantedOperations }
            : { capabilities, resources: [], operations: [] },
        ...(boundFile === undefined
            ? {}
            : {
                bound: {
                    ref: boundFile.ref,
                    label: boundFile.label,
                    mediaType: boundFile.mediaType,
                    access: boundFile.access,
                    role: "document",
                },
            }),
        ...(protocol === OQTO_APP_PROTOCOL_V1 ? { presentation } : {}),
    });
    const fileWatchers = new Set();
    /** Coalesced change counts per ref, so a flush can report a real gap. */
    const pendingChanges = new Map();
    const kv = new Map();
    let theme = options.theme ?? { colorScheme: "dark", tokens: {} };
    let presentation = options.presentation ?? DEFAULT_PRESENTATION;
    const themeWatchers = new Set();
    const presentationWatchers = new Set();
    const notifications = [];
    const invocations = [];
    const bridges = new Set();
    const queueChange = (file) => {
        const existing = pendingChanges.get(file.ref);
        pendingChanges.set(file.ref, {
            version: version(file),
            coalesced: (existing?.coalesced ?? 0) + 1,
        });
    };
    const filesCapability = {
        async pick(input = {}) {
            const candidates = Array.from(files.values()).filter((file) => matchesAccept(file, input.accept));
            const picked = input.multiple ? candidates : candidates.slice(0, 1);
            return picked.map(descriptor);
        },
        async read(ref) {
            const file = requireFileByRef(refs, ref);
            return { ...stat(file), bytes: file.bytes.slice() };
        },
        async stat(ref) {
            return stat(requireFileByRef(refs, ref));
        },
        async write(ref, bytes, writeOptions) {
            const file = requireFileByRef(refs, ref);
            if (file.access !== "readwrite")
                throw new OqtoAppError("denied", "File is read-only");
            const currentVersion = version(file);
            if (writeOptions.expectedVersion !== currentVersion) {
                return { ok: false, reason: "conflict", currentVersion };
            }
            replace(file, bytes);
            queueChange(file);
            return { ok: true, stat: stat(file) };
        },
        async watch(ref, listener) {
            requireWatchable(refs, collectionRefs, ref);
            const watcher = { refs: new Set([ref]), listener, generation: 0 };
            fileWatchers.add(watcher);
            return () => fileWatchers.delete(watcher);
        },
        async resources() {
            return grantedResources.map((resource) => ({ ...resource }));
        },
        async list(ref, listOptions) {
            const collection = collectionRefs.get(ref);
            if (!collection)
                throw new OqtoAppError("gone", "Ref is not a granted collection");
            const members = collection.entries.map((id) => requireFileById(files, id));
            const start = listOptions?.cursor === undefined ? 0 : decodeCursor(listOptions.cursor);
            const limit = listOptions?.limit ?? members.length;
            const slice = members.slice(start, start + limit);
            const next = start + slice.length;
            const entries = slice.map(stat);
            return next < members.length ? { entries, cursor: encodeCursor(next) } : { entries };
        },
        async watchResources(watched, listener) {
            for (const ref of watched)
                requireWatchable(refs, collectionRefs, ref);
            const expanded = new Set();
            for (const ref of watched) {
                const collection = collectionRefs.get(ref);
                if (collection) {
                    for (const id of collection.entries)
                        expanded.add(requireFileById(files, id).ref);
                    continue;
                }
                expanded.add(ref);
            }
            const watcher = { refs: expanded, listener, generation: 0 };
            fileWatchers.add(watcher);
            return () => fileWatchers.delete(watcher);
        },
    };
    const adapter = {
        context: buildContext(options.protocol ?? OQTO_APP_PROTOCOL_V1),
        ...(capabilities.includes("files") ? { files: filesCapability } : {}),
        ...(capabilities.includes("kv")
            ? {
                kv: {
                    async get(key) {
                        return cloneJson(kv.get(key));
                    },
                    async set(key, value) {
                        if (!isJsonValue(value))
                            throw new OqtoAppError("invalid", "KV accepts finite JSON values only");
                        kv.set(key, cloneJson(value));
                    },
                    async delete(key) {
                        kv.delete(key);
                    },
                },
            }
            : {}),
        ...(capabilities.includes("theme")
            ? {
                theme: {
                    async get() {
                        return cloneTheme(theme);
                    },
                    async watch(listener) {
                        themeWatchers.add(listener);
                        return () => themeWatchers.delete(listener);
                    },
                },
            }
            : {}),
        ...(capabilities.includes("notifications")
            ? {
                notifications: {
                    async notify(notification) {
                        notifications.push(structuredClone(notification));
                    },
                },
            }
            : {}),
        ...(capabilities.includes("operations")
            ? {
                operations: {
                    async list() {
                        return grantedOperations.map((operation) => ({ ...operation }));
                    },
                    async invoke(id, input, invokeOptions) {
                        const seed = operationSeeds.get(id);
                        if (!seed)
                            throw new OqtoAppError("denied", `Operation is not granted: ${id}`);
                        invocations.push({ id, input: cloneJson(input) });
                        const signal = invokeOptions?.signal ?? new AbortController().signal;
                        if (seed.handler === undefined) {
                            return { ok: true, output: input === undefined ? null : cloneJson(input) };
                        }
                        return seed.handler(input, signal);
                    },
                },
            }
            : {}),
        ...(capabilities.includes("presentation")
            ? {
                presentation: {
                    async get() {
                        return clonePresentation(presentation);
                    },
                    async watch(listener) {
                        presentationWatchers.add(listener);
                        return () => presentationWatchers.delete(listener);
                    },
                },
            }
            : {}),
    };
    return {
        adapter,
        notifications,
        invocations,
        connect(connectOptions = {}) {
            const protocol = connectOptions.protocol ?? adapter.context.protocol;
            const context = buildContext(protocol);
            const channel = new MessageChannel();
            const bridge = serveOqtoAppPort({ ...adapter, context }, channel.port1);
            bridges.add(bridge);
            void bridge.closed.then(() => bridges.delete(bridge));
            return connectOqtoAppPort(parseHostContext(structuredClone(context)), channel.port2);
        },
        ref(fileId) {
            const file = files.get(fileId);
            if (file)
                return file.ref;
            const collection = collections.get(fileId);
            if (collection)
                return collection.ref;
            throw new OqtoAppError("gone", `Unknown test resource: ${fileId}`);
        },
        externalWrite(fileId, bytes) {
            const file = requireFileById(files, fileId);
            replace(file, toBytes(bytes));
            queueChange(file);
            return version(file);
        },
        contentsOf(fileId) {
            return requireFileById(files, fileId).bytes.slice();
        },
        versionOf(fileId) {
            return version(requireFileById(files, fileId));
        },
        flushFileChanges() {
            const changes = Array.from(pendingChanges.entries());
            pendingChanges.clear();
            for (const [ref, pending] of changes) {
                for (const watcher of Array.from(fileWatchers)) {
                    if (!watcher.refs.has(ref))
                        continue;
                    watcher.generation += 1;
                    const change = {
                        ref,
                        version: pending.version,
                        generation: watcher.generation,
                        ...(pending.coalesced > 1 ? { gap: true } : {}),
                    };
                    watcher.listener(change);
                }
            }
        },
        setTheme(value) {
            theme = cloneTheme(value);
            for (const listener of Array.from(themeWatchers))
                listener(cloneTheme(theme));
        },
        setPresentation(value) {
            presentation = clonePresentation(value);
            for (const listener of Array.from(presentationWatchers))
                listener(clonePresentation(presentation));
        },
        suspend(suspension) {
            for (const bridge of Array.from(bridges))
                bridge.suspend(suspension);
        },
        close() {
            for (const bridge of Array.from(bridges))
                bridge.close();
            bridges.clear();
        },
    };
}
function descriptor(file) {
    return { ref: file.ref, label: file.label, mediaType: file.mediaType, access: file.access };
}
function stat(file) {
    return { ...descriptor(file), version: version(file), size: file.bytes.byteLength };
}
function version(file) {
    return createOqtoFileVersion(`test-v${file.revision}`);
}
function replace(file, bytes) {
    file.bytes = bytes.slice();
    file.revision += 1;
}
function makeRef(id) {
    return createOqtoFileRef(`oqto-test:${encodeURIComponent(id)}`);
}
function encodeCursor(index) {
    return `cursor:${index}`;
}
function decodeCursor(cursor) {
    const index = Number.parseInt(cursor.replace("cursor:", ""), 10);
    if (!Number.isSafeInteger(index) || index < 0) {
        throw new OqtoAppError("invalid", "Unknown list cursor");
    }
    return index;
}
function requireFileById(files, id) {
    const file = files.get(id);
    if (!file)
        throw new OqtoAppError("gone", `Unknown test file: ${id}`);
    return file;
}
function requireFileByRef(files, ref) {
    const file = files.get(ref);
    if (!file)
        throw new OqtoAppError("gone", "File ref is unavailable in this binding");
    return file;
}
function requireWatchable(files, collections, ref) {
    if (!files.has(ref) && !collections.has(ref)) {
        throw new OqtoAppError("gone", "Ref is unavailable in this binding");
    }
}
function toBytes(value) {
    return typeof value === "string" ? new TextEncoder().encode(value) : value.slice();
}
function matchesAccept(file, accept) {
    if (!accept || accept.length === 0)
        return true;
    return accept.some((pattern) => {
        if (pattern.endsWith("/*"))
            return file.mediaType.startsWith(pattern.slice(0, -1));
        if (pattern.startsWith("."))
            return file.label.toLowerCase().endsWith(pattern.toLowerCase());
        return file.mediaType === pattern;
    });
}
function cloneJson(value) {
    return value === undefined ? value : structuredClone(value);
}
function cloneTheme(value) {
    return { colorScheme: value.colorScheme, tokens: { ...value.tokens } };
}
function clonePresentation(value) {
    return { ...value, safeArea: { ...value.safeArea } };
}
//# sourceMappingURL=testing.js.map