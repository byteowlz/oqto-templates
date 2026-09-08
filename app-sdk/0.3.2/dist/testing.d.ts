import { type OqtoHostAdapter } from "./host.js";
import { type JsonValue, type OqtoCapability, type OqtoFileRef, type OqtoFileVersion, type OqtoHost, type OqtoNotification, type OqtoOperationResult, type OqtoPresentationContext, type OqtoProtocolVersion, type OqtoResourceAccess, type OqtoSuspension, type OqtoThemeSnapshot } from "./types.js";
export interface TestFileSeed {
    readonly id: string;
    /** Grant role. Defaults to the id. */
    readonly role?: string;
    readonly label?: string;
    readonly mediaType?: string;
    readonly access?: OqtoResourceAccess;
    /** Whether the grant promises change events. Defaults to true. */
    readonly watch?: boolean;
    readonly bytes: Uint8Array | string;
}
export interface TestCollectionSeed {
    readonly id: string;
    readonly role?: string;
    readonly label?: string;
    readonly access?: OqtoResourceAccess;
    readonly watch?: boolean;
    /** Ids of seeded files that belong to this collection. */
    readonly entries: readonly string[];
}
export interface TestOperationSeed {
    readonly id: string;
    readonly summary?: string;
    /** Defaults to echoing the input. Throw to model a transport-level failure. */
    readonly handler?: (input: JsonValue | undefined, signal: AbortSignal) => Promise<OqtoOperationResult> | OqtoOperationResult;
}
export interface RecordedInvocation {
    readonly id: string;
    readonly input: JsonValue | undefined;
}
export interface CreateTestHostOptions {
    readonly files?: readonly TestFileSeed[];
    readonly collections?: readonly TestCollectionSeed[];
    readonly boundFileId?: string;
    readonly capabilities?: readonly OqtoCapability[];
    readonly theme?: OqtoThemeSnapshot;
    readonly presentation?: OqtoPresentationContext;
    readonly operations?: readonly TestOperationSeed[];
    readonly instanceId?: string;
    /** Version the simulated host negotiates. Defaults to the newest. */
    readonly protocol?: OqtoProtocolVersion;
}
export interface ConnectTestHostOptions {
    /** Override the negotiated version to exercise compatibility paths. */
    readonly protocol?: OqtoProtocolVersion;
}
export interface OqtoTestHost {
    readonly adapter: OqtoHostAdapter;
    readonly notifications: readonly OqtoNotification[];
    readonly invocations: readonly RecordedInvocation[];
    connect(options?: ConnectTestHostOptions): OqtoHost;
    ref(fileId: string): OqtoFileRef;
    externalWrite(fileId: string, bytes: Uint8Array | string): OqtoFileVersion;
    contentsOf(fileId: string): Uint8Array;
    versionOf(fileId: string): OqtoFileVersion;
    flushFileChanges(): void;
    setTheme(theme: OqtoThemeSnapshot): void;
    setPresentation(presentation: OqtoPresentationContext): void;
    /** Withdraw authority on every live bridge, as a revocation would. */
    suspend(suspension: OqtoSuspension): void;
    close(): void;
}
/**
 * Deterministic in-memory host. `connect()` always exercises the real
 * MessageChannel bridge, so tests catch structured-clone and protocol drift.
 */
export declare function createTestHost(options?: CreateTestHostOptions): OqtoTestHost;
//# sourceMappingURL=testing.d.ts.map