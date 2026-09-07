import { type OqtoAgentContextCapability, type OqtoFileRef, type OqtoFilesCapability, type OqtoFileVersion, type OqtoHostContext, type OqtoKvCapability, type OqtoNotificationsCapability, type OqtoOperationsCapability, type OqtoPresentationCapability, type OqtoProtocolVersion, type OqtoSuspension, type OqtoThemeCapability } from "./types.js";
/** Host-side implementation. Every call is additionally checked against context grants. */
export interface OqtoHostAdapter {
    readonly context: OqtoHostContext;
    readonly files?: OqtoFilesCapability;
    readonly kv?: OqtoKvCapability;
    readonly theme?: OqtoThemeCapability;
    readonly notifications?: OqtoNotificationsCapability;
    readonly operations?: OqtoOperationsCapability;
    readonly presentation?: OqtoPresentationCapability;
    readonly agent_context?: OqtoAgentContextCapability;
}
export interface OqtoHostBridge {
    readonly closed: Promise<"app" | "host" | "transport">;
    /** Version negotiated for this bridge. */
    readonly protocol: OqtoProtocolVersion;
    /**
     * Withdraw authority immediately.
     *
     * The App's pending and future calls fail without reaching this adapter, so a
     * revoked grant cannot be exercised by an in-flight request.
     */
    suspend(suspension: OqtoSuspension): void;
    close(): void;
}
export interface OqtoHostBridgeLimits {
    readonly maxConcurrentRequests?: number;
    readonly maxFileWriteBytes?: number;
    readonly maxKvBytes?: number;
    readonly maxSubscriptions?: number;
}
export interface AttachOqtoAppFrameOptions extends OqtoHostBridgeLimits {
    readonly frameWindow: WindowProxy;
    readonly appOrigin: string;
    readonly adapter: OqtoHostAdapter;
    readonly handshakeTimeoutMs?: number;
    readonly signal?: AbortSignal;
    /** Parent event target; defaults to the current window. Useful for host tests. */
    readonly parentWindow?: Window;
    /**
     * Versions this host accepts, newest first. Defaults to everything the SDK
     * speaks; narrow it to hold a deployment on an older contract.
     */
    readonly supportedVersions?: readonly OqtoProtocolVersion[];
}
/** Create a validated opaque ref in a host adapter without exposing its representation to apps. */
export declare function createOqtoFileRef(value: string): OqtoFileRef;
/** Create a validated opaque version token in a host adapter. */
export declare function createOqtoFileVersion(value: string): OqtoFileVersion;
/**
 * Wait for one readiness announcement from an exact app frame, then transfer a
 * private MessagePort. Call after creating the iframe; there is no load race.
 */
export declare function attachOqtoAppFrame(options: AttachOqtoAppFrameOptions): Promise<OqtoHostBridge>;
/** Serve a validated adapter over an already-private MessagePort. */
export declare function serveOqtoAppPort(adapter: OqtoHostAdapter, port: MessagePort, limits?: OqtoHostBridgeLimits): OqtoHostBridge;
//# sourceMappingURL=host.d.ts.map