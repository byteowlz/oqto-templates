import { type ReactNode } from "react";
import type { JsonValue, OqtoContextSnapshot, OqtoGrantSnapshot, OqtoHost, OqtoOperationInvokeOptions, OqtoOperationResult, OqtoPresentationContext, OqtoSuspension, OqtoThemeSnapshot } from "./types.js";
export interface OqtoHostProviderProps {
    readonly host: OqtoHost;
    readonly children: ReactNode;
}
/** Optional React adapter. The core SDK has no React runtime dependency. */
export declare function OqtoHostProvider({ host, children }: OqtoHostProviderProps): import("react").JSX.Element;
export declare function useOqtoHost(): OqtoHost;
/** Exactly what this mount may do. Stable for the lifetime of the mount. */
export declare function useOqtoGrants(): OqtoGrantSnapshot;
/** Live host theme, or `undefined` until the first snapshot arrives. */
export declare function useOqtoTheme(): OqtoThemeSnapshot | undefined;
/**
 * Live container geometry.
 *
 * Size against this rather than the viewport: an App may be mounted in a narrow
 * split pane or a phone-sized sheet, and the window says nothing about either.
 */
export declare function useOqtoPresentation(): OqtoPresentationContext | undefined;
/** Live value for one App-defined Agent Context topic. */
export declare function useOqtoContextTopic(topic: string): OqtoContextSnapshot | undefined;
/**
 * Suspension state for this mount.
 *
 * Once set, every capability call rejects. Render a read-only explanation
 * rather than retrying.
 */
export declare function useOqtoSuspension(): OqtoSuspension | undefined;
export interface UseOqtoOperationState {
    readonly pending: boolean;
    readonly result: OqtoOperationResult | undefined;
    /** Transport, authorization, or suspension failure. Not an operation failure. */
    readonly error: Error | undefined;
}
export interface UseOqtoOperation extends UseOqtoOperationState {
    invoke(input?: JsonValue, options?: OqtoOperationInvokeOptions): Promise<OqtoOperationResult>;
    /** Cancel the in-flight invocation, if any. */
    cancel(): void;
    reset(): void;
}
/**
 * Invoke one granted operation with pending, result, and error state.
 *
 * Only the newest invocation may update state, so an overlapping call cannot
 * resurrect a stale result. Unmounting cancels the in-flight request.
 */
export declare function useOqtoOperation(id: string): UseOqtoOperation;
//# sourceMappingURL=react.d.ts.map