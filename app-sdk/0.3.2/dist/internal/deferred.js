export function deferred() {
    let resolvePromise;
    let rejectPromise;
    const promise = new Promise((resolve, reject) => {
        resolvePromise = resolve;
        rejectPromise = reject;
    });
    return {
        promise,
        resolve(value) {
            resolvePromise?.(value);
        },
        reject(reason) {
            rejectPromise?.(reason);
        },
    };
}
//# sourceMappingURL=deferred.js.map