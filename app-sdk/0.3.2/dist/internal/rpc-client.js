import { OqtoAppError } from "../errors.js";
import { OQTO_APP_PROTOCOL, } from "../types.js";
import { deferred } from "./deferred.js";
import { isJsonValue } from "./json.js";
import { deserializeError, isCloseMessage, isEventMessage, isRecord, isResultMessage, isSuspendMessage, parseGrantedOperation, parseGrantedResource, parsePresentation, parseSuspension, supportsV1, supportsV2, } from "./protocol.js";
class RpcClient {
    protocol;
    port;
    requestTimeoutMs;
    pending = new Map();
    subscriptions = new Map();
    closedState = deferred();
    suspensionState = deferred();
    suspensionListeners = new Set();
    nextId = 1;
    didClose = false;
    suspension;
    closed = this.closedState.promise;
    suspended = this.suspensionState.promise;
    constructor(protocol, port, requestTimeoutMs) {
        this.protocol = protocol;
        this.port = port;
        this.requestTimeoutMs = requestTimeoutMs;
        port.onmessage = (event) => this.receive(event.data);
        port.onmessageerror = () => this.closeAs("transport");
        port.start();
    }
    suspensionOf() {
        return this.suspension;
    }
    onSuspended(listener) {
        if (this.suspension !== undefined) {
            const current = this.suspension;
            queueMicrotask(() => listener(current));
            return () => undefined;
        }
        this.suspensionListeners.add(listener);
        return () => {
            this.suspensionListeners.delete(listener);
        };
    }
    request(method, params, options = {}) {
        if (this.suspension !== undefined)
            return Promise.reject(suspendedError(this.suspension));
        if (this.didClose)
            return Promise.reject(new OqtoAppError("disconnected", "Oqto host is disconnected"));
        const id = this.nextId;
        this.nextId += 1;
        const message = {
            protocol: this.protocol,
            kind: "request",
            id,
            method,
            params,
        };
        return new Promise((resolve, reject) => {
            let done = false;
            const settle = (outcome) => {
                if (done)
                    return;
                done = true;
                clearTimeout(timer);
                this.pending.delete(id);
                if (outcome.ok)
                    resolve(outcome.value);
                else
                    reject(outcome.error);
            };
            const timer = setTimeout(() => settle({ ok: false, error: new OqtoAppError("timeout", `Host operation timed out: ${method}`) }), options.timeoutMs ?? this.requestTimeoutMs);
            this.pending.set(id, {
                reject: (error) => settle({ ok: false, error }),
                settle,
                timer,
            });
            try {
                this.port.postMessage(message);
            }
            catch (error) {
                settle({
                    ok: false,
                    error: new OqtoAppError("disconnected", "Could not reach the Oqto host", { cause: error }),
                });
            }
        });
    }
    /** Fire-and-forget notification that must not fail an App code path. */
    post(method, params) {
        if (this.didClose || this.suspension !== undefined)
            return;
        const message = {
            protocol: this.protocol,
            kind: "request",
            id: this.nextId,
            method,
            params,
        };
        this.nextId += 1;
        try {
            this.port.postMessage(message);
        }
        catch {
            // A dead port is already reported through `closed`.
        }
    }
    addSubscription(id, listener) {
        this.subscriptions.set(id, listener);
    }
    removeSubscription(id) {
        this.subscriptions.delete(id);
    }
    requireLive() {
        if (this.suspension !== undefined)
            throw suspendedError(this.suspension);
        if (this.didClose)
            throw new OqtoAppError("disconnected", "Oqto host is disconnected");
    }
    close() {
        if (this.didClose)
            return;
        try {
            this.port.postMessage({ protocol: this.protocol, kind: "close", reason: "app" });
        }
        finally {
            this.closeAs("app");
        }
    }
    receive(value) {
        if (!isRecord(value) || value.protocol !== this.protocol)
            return;
        if (isResultMessage(value)) {
            const pending = this.pending.get(value.id);
            if (!pending)
                return;
            if (value.ok)
                pending.settle({ ok: true, value: value.value });
            else
                pending.settle({ ok: false, error: deserializeError(value.error) });
            return;
        }
        if (isEventMessage(value)) {
            this.subscriptions.get(value.subscriptionId)?.(value.value);
            return;
        }
        if (isSuspendMessage(value)) {
            this.suspendAs(parseSuspension(value));
            return;
        }
        if (isCloseMessage(value))
            this.closeAs("host");
    }
    /**
     * Withdraw authority immediately.
     *
     * Pending work rejects and later calls never reach the host, so a revoked
     * grant cannot be exercised by a request that was already in flight.
     */
    suspendAs(suspension) {
        if (this.suspension !== undefined)
            return;
        this.suspension = suspension;
        const error = suspendedError(suspension);
        for (const pending of this.pending.values())
            pending.reject(error);
        this.pending.clear();
        this.subscriptions.clear();
        this.suspensionState.resolve(suspension);
        const listeners = Array.from(this.suspensionListeners);
        this.suspensionListeners.clear();
        for (const listener of listeners)
            listener(suspension);
    }
    closeAs(reason) {
        if (this.didClose)
            return;
        this.didClose = true;
        this.port.close();
        const error = new OqtoAppError("disconnected", "Oqto host disconnected");
        for (const pending of this.pending.values())
            pending.reject(error);
        this.pending.clear();
        this.subscriptions.clear();
        this.closedState.resolve(reason);
    }
}
function suspendedError(suspension) {
    return new OqtoAppError("suspended", suspension.message ?? `Oqto host withdrew this App's access (${suspension.reason})`, { details: { reason: suspension.reason } });
}
export function connectOqtoAppPort(context, port, options = {}) {
    const protocol = context.protocol;
    const client = new RpcClient(protocol, port, options.requestTimeoutMs ?? 30_000);
    const has = (capability) => context.capabilities.includes(capability);
    const v1 = supportsV1(protocol);
    const v2 = supportsV2(protocol);
    const requireV1 = (feature) => {
        if (!v1) {
            throw new OqtoAppError("unsupported", `${feature} requires protocol ${"oqto-app/v1"}; this host negotiated ${protocol}`);
        }
    };
    const requireV2 = (feature) => {
        if (!v2) {
            throw new OqtoAppError("unsupported", `${feature} requires protocol ${"oqto-app/v2"}; this host negotiated ${protocol}`);
        }
    };
    /**
     * Register a subscription, then roll it back if the host refuses.
     *
     * `stopMethod` stays capability-specific because a v0 host only understands
     * `files.watch.stop` and `theme.watch.stop`.
     */
    const subscribe = async (prefix, stopMethod, start, onValue) => {
        const subscriptionId = newOpaqueId(prefix);
        client.addSubscription(subscriptionId, onValue);
        try {
            await start(subscriptionId);
        }
        catch (error) {
            client.removeSubscription(subscriptionId);
            throw error;
        }
        let active = true;
        return () => {
            if (!active)
                return;
            active = false;
            client.removeSubscription(subscriptionId);
            void client.request(stopMethod, { subscriptionId }).catch(() => undefined);
        };
    };
    const files = has("files")
        ? {
            async pick(pickOptions) {
                return parseFileDescriptors(await client.request("files.pick", pickOptions ?? {}));
            },
            async read(ref) {
                return parseFileContents(await client.request("files.read", { ref }));
            },
            async stat(ref) {
                return parseFileStat(await client.request("files.stat", { ref }));
            },
            async write(ref, bytes, writeOptions) {
                return parseWriteResult(await client.request("files.write", {
                    ref,
                    bytes: bytes.slice(),
                    expectedVersion: writeOptions.expectedVersion,
                }));
            },
            async watch(ref, listener) {
                const track = trackGenerations();
                return subscribe("file-watch", "files.watch.stop", (subscriptionId) => client.request("files.watch.start", { ref, subscriptionId }), (value) => listener(track(parseFileChange(value))));
            },
            async resources() {
                requireV1("files.resources");
                const value = await client.request("files.resources", {});
                if (!Array.isArray(value))
                    throw invalidResponse("granted resources");
                return value.map(parseGrantedResource);
            },
            async list(ref, listOptions) {
                requireV1("files.list");
                return parseListPage(await client.request("files.list", {
                    ref,
                    ...(listOptions?.cursor === undefined ? {} : { cursor: listOptions.cursor }),
                    ...(listOptions?.limit === undefined ? {} : { limit: listOptions.limit }),
                }));
            },
            async watchResources(refs, listener) {
                requireV1("files.watchResources");
                if (refs.length === 0) {
                    throw new OqtoAppError("invalid", "watchResources requires at least one ref");
                }
                const track = trackGenerations();
                return subscribe("files-watch", "files.watchResources.stop", (subscriptionId) => client.request("files.watchResources.start", { refs: [...refs], subscriptionId }), (value) => listener(track(parseFileChange(value))));
            },
        }
        : undefined;
    const operations = has("operations")
        ? {
            async list() {
                requireV1("operations.list");
                const value = await client.request("operations.list", {});
                if (!Array.isArray(value))
                    throw invalidResponse("operation list");
                return value.map(parseGrantedOperation);
            },
            async invoke(id, input, invokeOptions) {
                requireV1("operations.invoke");
                if (typeof id !== "string" || id.length === 0) {
                    throw new OqtoAppError("invalid", "Operation id must be a non-empty string");
                }
                if (input !== undefined && !isJsonValue(input)) {
                    throw new OqtoAppError("invalid", "Operation input must be bounded finite JSON");
                }
                const signal = invokeOptions?.signal;
                if (signal?.aborted)
                    throw new OqtoAppError("cancelled", "Operation cancelled before dispatch");
                const invocationId = newOpaqueId("op");
                const timeoutMs = invokeOptions?.timeoutMs;
                const pending = client.request("operations.invoke", { id, invocationId, ...(input === undefined ? {} : { input }) }, timeoutMs === undefined ? {} : { timeoutMs });
                if (signal === undefined)
                    return parseOperationResult(await pending);
                const onAbort = () => client.post("operations.cancel", { invocationId });
                signal.addEventListener("abort", onAbort, { once: true });
                try {
                    return parseOperationResult(await pending);
                }
                finally {
                    signal.removeEventListener("abort", onAbort);
                }
            },
        }
        : undefined;
    const presentation = has("presentation")
        ? {
            async get() {
                requireV1("presentation.get");
                return parsePresentation(await client.request("presentation.get", {}));
            },
            async watch(listener) {
                requireV1("presentation.watch");
                return subscribe("presentation-watch", "presentation.watch.stop", (subscriptionId) => client.request("presentation.watch.start", { subscriptionId }), (value) => listener(parsePresentation(value)));
            },
        }
        : undefined;
    const agentContext = has("agent_context")
        ? {
            async catalog() {
                requireV2("agentContext.catalog");
                return parseContextCatalog(await client.request("agentContext.catalog", {}));
            },
            async get(topic) {
                requireV2("agentContext.get");
                const value = await client.request("agentContext.get", { topic });
                return value === undefined ? undefined : parseContextSnapshot(value);
            },
            async publish(topic, value) {
                requireV2("agentContext.publish");
                if (!isJsonValue(value))
                    throw new OqtoAppError("invalid", "Context accepts bounded finite JSON only");
                return parseContextSnapshot(await client.request("agentContext.publish", { topic, value }));
            },
            async clear(topic) {
                requireV2("agentContext.clear");
                await client.request("agentContext.clear", { topic });
            },
            async watch(topics, listener, watchOptions) {
                requireV2("agentContext.watch");
                if (topics.length === 0)
                    throw new OqtoAppError("invalid", "Context watch requires a topic");
                let generation;
                return subscribe("context-watch", "agentContext.watch.stop", (subscriptionId) => client.request("agentContext.watch.start", {
                    topics: [...topics],
                    subscriptionId,
                    ...(watchOptions?.fromRevision === undefined
                        ? {}
                        : { fromRevision: watchOptions.fromRevision }),
                }), (value) => {
                    const change = parseContextChange(value);
                    const gap = change.gap || (generation !== undefined && change.generation !== generation + 1);
                    generation = change.generation;
                    listener(gap === change.gap ? change : { ...change, gap });
                });
            },
            async invokeAction(id, expectedContextRevision, input) {
                requireV2("agentContext.invokeAction");
                if (!Number.isSafeInteger(expectedContextRevision) || expectedContextRevision < 0) {
                    throw new OqtoAppError("invalid", "Expected context revision must be non-negative");
                }
                return parseContextActionResult(await client.request("agentContext.action.invoke", {
                    id,
                    expectedContextRevision,
                    ...(input === undefined ? {} : { input }),
                }));
            },
        }
        : undefined;
    const kv = has("kv")
        ? {
            async get(key) {
                const result = await client.request("kv.get", { key });
                return result === undefined ? undefined : parseJsonValue(result);
            },
            async set(key, value) {
                if (!isJsonValue(value)) {
                    throw new OqtoAppError("invalid", "KV accepts bounded finite JSON values only");
                }
                await client.request("kv.set", { key, value });
            },
            async delete(key) {
                await client.request("kv.delete", { key });
            },
        }
        : undefined;
    const theme = has("theme")
        ? {
            async get() {
                return parseTheme(await client.request("theme.get", {}));
            },
            async watch(listener) {
                return subscribe("theme-watch", "theme.watch.stop", (subscriptionId) => client.request("theme.watch.start", { subscriptionId }), (value) => listener(parseTheme(value)));
            },
        }
        : undefined;
    const notifications = has("notifications")
        ? {
            async notify(notification) {
                await client.request("notifications.notify", notification);
            },
        }
        : undefined;
    return {
        context,
        protocol,
        ...(files === undefined ? {} : { files }),
        ...(kv === undefined ? {} : { kv }),
        ...(theme === undefined ? {} : { theme }),
        ...(notifications === undefined ? {} : { notifications }),
        ...(operations === undefined ? {} : { operations }),
        ...(presentation === undefined ? {} : { presentation }),
        ...(agentContext === undefined ? {} : { agentContext }),
        closed: client.closed,
        suspension: client.suspended,
        isSuspended: () => client.suspensionOf(),
        onSuspended: (listener) => client.onSuspended(listener),
        close: () => client.close(),
    };
}
/**
 * Mark a change stream with a client-side gap flag.
 *
 * The host owns `generation`; this only decides whether the App observed a
 * contiguous run. A v0 host sends no generation, so nothing is inferred.
 */
function trackGenerations() {
    let last;
    return (change) => {
        if (change.generation === undefined)
            return change;
        const previous = last;
        last = change.generation;
        if (change.gap === true)
            return change;
        if (previous !== undefined && change.generation > previous + 1)
            return { ...change, gap: true };
        return change;
    };
}
function parseContextCatalog(value) {
    if (!isRecord(value) ||
        typeof value.providerId !== "string" ||
        !Array.isArray(value.topics) ||
        !Array.isArray(value.actions)) {
        throw invalidResponse("Agent Context catalog");
    }
    return {
        providerId: value.providerId,
        topics: value.topics.map((topic) => {
            if (!isRecord(topic) ||
                typeof topic.id !== "string" ||
                typeof topic.title !== "string" ||
                typeof topic.schemaVersion !== "string" ||
                !["ephemeral", "session_local", "durable_reference"].includes(String(topic.lifetime)) ||
                !["ambient", "explicit_intent", "sensitive", "high_volume"].includes(String(topic.disclosure))) {
                throw invalidResponse("Agent Context topic");
            }
            if (topic.description !== undefined && typeof topic.description !== "string")
                throw invalidResponse("Agent Context topic");
            return {
                id: topic.id,
                title: topic.title,
                ...(topic.description === undefined ? {} : { description: topic.description }),
                schemaVersion: topic.schemaVersion,
                lifetime: topic.lifetime,
                disclosure: topic.disclosure,
            };
        }),
        actions: value.actions.map((action) => {
            if (!isRecord(action) ||
                typeof action.id !== "string" ||
                typeof action.title !== "string" ||
                !Array.isArray(action.requiredTopics) ||
                !action.requiredTopics.every((topic) => typeof topic === "string") ||
                typeof action.requiresUserActivation !== "boolean") {
                throw invalidResponse("Agent Context action");
            }
            if (action.description !== undefined && typeof action.description !== "string")
                throw invalidResponse("Agent Context action");
            return {
                id: action.id,
                title: action.title,
                ...(action.description === undefined ? {} : { description: action.description }),
                requiredTopics: action.requiredTopics,
                requiresUserActivation: action.requiresUserActivation,
            };
        }),
    };
}
function parseContextSnapshot(value) {
    if (!isRecord(value) ||
        typeof value.providerId !== "string" ||
        typeof value.topic !== "string" ||
        !Number.isSafeInteger(value.revision) ||
        value.revision < 0 ||
        typeof value.updatedAt !== "string" ||
        !isJsonValue(value.value)) {
        throw invalidResponse("Agent Context snapshot");
    }
    return {
        providerId: value.providerId,
        topic: value.topic,
        revision: value.revision,
        updatedAt: value.updatedAt,
        value: value.value,
    };
}
function parseContextChange(value) {
    if (!isRecord(value) ||
        !Number.isSafeInteger(value.generation) ||
        value.generation < 0 ||
        typeof value.gap !== "boolean") {
        throw invalidResponse("Agent Context change");
    }
    return {
        snapshot: parseContextSnapshot(value.snapshot),
        generation: value.generation,
        gap: value.gap,
    };
}
function parseContextActionResult(value) {
    if (!isRecord(value) || typeof value.ok !== "boolean")
        throw invalidResponse("Agent Context action");
    if (value.ok) {
        if (!isJsonValue(value.output))
            throw invalidResponse("Agent Context action");
        return { ok: true, output: value.output };
    }
    if (value.reason === "stale_context" &&
        Number.isSafeInteger(value.currentRevision) &&
        value.currentRevision >= 0) {
        return { ok: false, reason: "stale_context", currentRevision: value.currentRevision };
    }
    if (value.reason === "failed" && typeof value.code === "string" && typeof value.message === "string") {
        return { ok: false, reason: "failed", code: value.code, message: value.message };
    }
    throw invalidResponse("Agent Context action");
}
function parseFileDescriptors(value) {
    if (!Array.isArray(value))
        throw invalidResponse("file picker");
    return value.map(parseFileDescriptor);
}
function parseFileDescriptor(value) {
    if (!isRecord(value))
        throw invalidResponse("file descriptor");
    const { ref, label, mediaType, access } = value;
    if (typeof ref !== "string" ||
        ref.length === 0 ||
        typeof label !== "string" ||
        typeof mediaType !== "string" ||
        (access !== "read" && access !== "readwrite")) {
        throw invalidResponse("file descriptor");
    }
    return { ref: ref, label, mediaType, access };
}
function parseFileStat(value) {
    const descriptor = parseFileDescriptor(value);
    if (!isRecord(value))
        throw invalidResponse("file stat");
    const size = value.size;
    if (typeof value.version !== "string" ||
        value.version.length === 0 ||
        typeof size !== "number" ||
        !Number.isSafeInteger(size) ||
        size < 0) {
        throw invalidResponse("file stat");
    }
    const modifiedAt = value.modifiedAt;
    if (modifiedAt !== undefined && typeof modifiedAt !== "string")
        throw invalidResponse("file stat");
    return {
        ...descriptor,
        version: value.version,
        size,
        ...(modifiedAt === undefined ? {} : { modifiedAt }),
    };
}
function parseFileEntry(value) {
    return parseFileStat(value);
}
function parseListPage(value) {
    if (!isRecord(value) || !Array.isArray(value.entries))
        throw invalidResponse("file list");
    const cursor = value.cursor;
    if (cursor !== undefined && (typeof cursor !== "string" || cursor.length === 0)) {
        throw invalidResponse("file list");
    }
    const entries = value.entries.map(parseFileEntry);
    return cursor === undefined ? { entries } : { entries, cursor };
}
function parseFileContents(value) {
    const stat = parseFileStat(value);
    if (!isRecord(value) || !(value.bytes instanceof Uint8Array))
        throw invalidResponse("file contents");
    return { ...stat, bytes: value.bytes };
}
function parseWriteResult(value) {
    if (!isRecord(value) || typeof value.ok !== "boolean")
        throw invalidResponse("file write");
    if (value.ok)
        return { ok: true, stat: parseFileStat(value.stat) };
    if (value.reason !== "conflict" ||
        typeof value.currentVersion !== "string" ||
        value.currentVersion.length === 0)
        throw invalidResponse("file write");
    return { ok: false, reason: "conflict", currentVersion: value.currentVersion };
}
function parseFileChange(value) {
    if (!isRecord(value) ||
        typeof value.ref !== "string" ||
        value.ref.length === 0 ||
        typeof value.version !== "string" ||
        value.version.length === 0) {
        throw invalidResponse("file change");
    }
    const generation = value.generation;
    if (generation !== undefined &&
        (typeof generation !== "number" || !Number.isSafeInteger(generation) || generation < 0)) {
        throw invalidResponse("file change");
    }
    const gap = value.gap;
    if (gap !== undefined && typeof gap !== "boolean")
        throw invalidResponse("file change");
    return {
        ref: value.ref,
        version: value.version,
        ...(generation === undefined ? {} : { generation }),
        ...(gap === undefined ? {} : { gap }),
    };
}
function parseOperationResult(value) {
    if (!isRecord(value) || typeof value.ok !== "boolean")
        throw invalidResponse("operation");
    if (value.ok) {
        if (!isJsonValue(value.output))
            throw invalidResponse("operation");
        return { ok: true, output: value.output };
    }
    if (value.reason !== "failed" ||
        typeof value.code !== "string" ||
        value.code.length === 0 ||
        typeof value.message !== "string") {
        throw invalidResponse("operation");
    }
    return { ok: false, reason: "failed", code: value.code, message: value.message };
}
function parseJsonValue(value) {
    if (!isJsonValue(value))
        throw invalidResponse("KV value");
    return value;
}
function parseTheme(value) {
    if (!isRecord(value) ||
        (value.colorScheme !== "light" && value.colorScheme !== "dark") ||
        !isRecord(value.tokens)) {
        throw invalidResponse("theme");
    }
    const entries = Object.entries(value.tokens);
    if (!entries.every((entry) => entry[0].startsWith("--") && typeof entry[1] === "string")) {
        throw invalidResponse("theme");
    }
    return { colorScheme: value.colorScheme, tokens: Object.fromEntries(entries) };
}
function invalidResponse(subject) {
    return new OqtoAppError("internal", `Host returned an invalid ${subject} response`);
}
function newOpaqueId(prefix) {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return `${prefix}:${crypto.randomUUID()}`;
    }
    return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}
/** Re-exported so the v0 tag stays reachable for compatibility checks. */
export const CLIENT_BASELINE_PROTOCOL = OQTO_APP_PROTOCOL;
//# sourceMappingURL=rpc-client.js.map