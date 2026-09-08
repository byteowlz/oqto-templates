/** Typed exceptional failure. Conditional-write conflicts are values, not exceptions. */
export class OqtoAppError extends Error {
    code;
    details;
    constructor(code, message, options = {}) {
        super(message, options.cause === undefined ? undefined : { cause: options.cause });
        this.name = "OqtoAppError";
        this.code = code;
        if (options.details !== undefined)
            this.details = options.details;
    }
}
export function isOqtoAppError(value) {
    return value instanceof OqtoAppError;
}
//# sourceMappingURL=errors.js.map