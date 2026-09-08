export type OqtoAppErrorCode = "cancelled" | "denied" | "disconnected" | "gone" | "internal" | "invalid" | "quota_exceeded"
/** Authority was withdrawn while this mount was live. */
 | "suspended" | "timeout" | "too_large" | "unsupported";
/** Typed exceptional failure. Conditional-write conflicts are values, not exceptions. */
export declare class OqtoAppError extends Error {
    readonly code: OqtoAppErrorCode;
    readonly details?: Readonly<Record<string, string>>;
    constructor(code: OqtoAppErrorCode, message: string, options?: {
        readonly cause?: unknown;
        readonly details?: Readonly<Record<string, string>>;
    });
}
export declare function isOqtoAppError(value: unknown): value is OqtoAppError;
//# sourceMappingURL=errors.d.ts.map