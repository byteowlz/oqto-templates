export interface Deferred<T> {
    readonly promise: Promise<T>;
    resolve(value: T): void;
    reject(reason: unknown): void;
}
export declare function deferred<T>(): Deferred<T>;
//# sourceMappingURL=deferred.d.ts.map