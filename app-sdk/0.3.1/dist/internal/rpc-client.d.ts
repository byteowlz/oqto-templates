import { type OqtoHost, type OqtoHostContext } from "../types.js";
interface RpcClientOptions {
    readonly requestTimeoutMs?: number;
}
export declare function connectOqtoAppPort(context: OqtoHostContext, port: MessagePort, options?: RpcClientOptions): OqtoHost;
/** Re-exported so the v0 tag stays reachable for compatibility checks. */
export declare const CLIENT_BASELINE_PROTOCOL: "oqto-app/v0";
export {};
//# sourceMappingURL=rpc-client.d.ts.map