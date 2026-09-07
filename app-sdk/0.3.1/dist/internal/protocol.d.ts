import { OqtoAppError, type OqtoAppErrorCode } from "../errors.js";
import { OQTO_APP_PROTOCOL, type OqtoGrantedOperation, type OqtoGrantedResource, type OqtoHostContext, type OqtoPresentationContext, type OqtoProtocolVersion, type OqtoSuspension, type OqtoSuspensionReason } from "../types.js";
export declare const READY_KIND: "oqto.app.ready";
export declare const CONNECT_KIND: "oqto.app.connect";
export declare const SUSPEND_KIND: "suspend";
export interface ReadyMessage {
    /** Always the v0 tag so hosts predating negotiation still recognize it. */
    readonly protocol: typeof OQTO_APP_PROTOCOL;
    readonly kind: typeof READY_KIND;
    readonly nonce: string;
    /** Versions the App accepts, newest first. Ignored by v0 hosts. */
    readonly supportedVersions: readonly OqtoProtocolVersion[];
}
export interface ConnectMessage {
    /** The version the host selected; all later frames must use it. */
    readonly protocol: OqtoProtocolVersion;
    readonly kind: typeof CONNECT_KIND;
    readonly nonce: string;
    readonly context: OqtoHostContext;
}
export interface RequestMessage {
    readonly protocol: OqtoProtocolVersion;
    readonly kind: "request";
    readonly id: number;
    readonly method: string;
    readonly params: unknown;
}
export interface ResultMessage {
    readonly protocol: OqtoProtocolVersion;
    readonly kind: "result";
    readonly id: number;
    readonly ok: boolean;
    readonly value?: unknown;
    readonly error?: SerializedError;
}
export interface EventMessage {
    readonly protocol: OqtoProtocolVersion;
    readonly kind: "event";
    readonly subscriptionId: string;
    readonly value: unknown;
}
export interface CloseMessage {
    readonly protocol: OqtoProtocolVersion;
    readonly kind: "close";
    readonly reason: "app" | "host" | "transport";
}
export interface SuspendMessage {
    readonly protocol: OqtoProtocolVersion;
    readonly kind: typeof SUSPEND_KIND;
    readonly reason: OqtoSuspensionReason;
    readonly message?: string;
}
export interface SerializedError {
    readonly code: OqtoAppErrorCode;
    readonly message: string;
    readonly details?: Readonly<Record<string, string>>;
}
export declare function isRecord(value: unknown): value is Record<string, unknown>;
export declare function isProtocolVersion(value: unknown): value is OqtoProtocolVersion;
/** True when the negotiated version includes the v1 capability surface. */
export declare function supportsV1(protocol: OqtoProtocolVersion): boolean;
/** True when the negotiated version includes App-defined Agent Context. */
export declare function supportsV2(protocol: OqtoProtocolVersion): boolean;
export declare function isReadyMessage(value: unknown): value is ReadyMessage;
/**
 * Versions an App offered, newest first.
 *
 * A v0 App sends no offer, which is read as "v0 only" rather than as an error.
 */
export declare function readSupportedVersions(value: ReadyMessage | unknown): readonly OqtoProtocolVersion[];
/** Pick the newest version both sides accept. */
export declare function negotiateProtocol(offered: readonly OqtoProtocolVersion[], supported?: readonly OqtoProtocolVersion[]): OqtoProtocolVersion | undefined;
export declare function parseConnectMessage(value: unknown, nonce: string, offered: readonly OqtoProtocolVersion[]): ConnectMessage;
export declare function parseHostContext(value: unknown, expected?: OqtoProtocolVersion): OqtoHostContext;
export declare function parseGrantedResource(value: unknown): OqtoGrantedResource;
export declare function parseGrantedOperation(value: unknown): OqtoGrantedOperation;
export declare function parsePresentation(value: unknown): OqtoPresentationContext;
export declare function isRequestMessage(value: unknown): value is RequestMessage;
export declare function isResultMessage(value: unknown): value is ResultMessage;
export declare function isEventMessage(value: unknown): value is EventMessage;
export declare function isCloseMessage(value: unknown): value is CloseMessage;
export declare function isSuspendMessage(value: unknown): value is SuspendMessage;
export declare function parseSuspension(value: SuspendMessage): OqtoSuspension;
export declare function serializeError(error: unknown): SerializedError;
export declare function deserializeError(value: unknown): OqtoAppError;
//# sourceMappingURL=protocol.d.ts.map