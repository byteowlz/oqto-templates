import { type OqtoHost, type OqtoProtocolVersion } from "./types.js";
export interface ConnectOqtoAppOptions {
    /**
     * Exact Oqto shell origin. Defaults to the origin of `document.referrer`.
     * Wildcards are never accepted.
     */
    readonly hostOrigin?: string;
    readonly handshakeTimeoutMs?: number;
    readonly requestTimeoutMs?: number;
    readonly signal?: AbortSignal;
    /**
     * Protocol versions to offer, newest first. Defaults to everything this SDK
     * speaks. Narrow it only to pin an App to an older contract on purpose.
     */
    readonly supportedVersions?: readonly OqtoProtocolVersion[];
}
/**
 * Connect a sandboxed-web App to its Oqto host.
 *
 * The app announces readiness to its exact parent origin, offering the protocol
 * versions it speaks. The host responds once with a nonce-bound MessagePort and
 * the version it selected; all later traffic uses only that port and version.
 * A host that predates negotiation simply answers `oqto-app/v0`.
 */
export declare function connectOqtoApp(options?: ConnectOqtoAppOptions): Promise<OqtoHost>;
//# sourceMappingURL=connect.d.ts.map