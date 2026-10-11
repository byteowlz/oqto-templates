import type { OqtoThemeSnapshot } from "./types.js";
/**
 * Apply a host theme to an app root and to its document root.
 *
 * The theme must reach the whole app document (portals, shadow roots,
 * teleported nodes), so tokens are declared at the document root too; the app
 * root still gets the dataset and inline vars for direct access.
 *
 * Each call is a full snapshot, not a patch: a token applied by an earlier call
 * and omitted by this one is withdrawn. Withdrawal restores the inline value the
 * root had before this helper first set that token (or removes it when there
 * was none), so app-owned custom properties are never cleared. Only `--`
 * custom properties are applied; other names are ignored.
 */
export declare function applyOqtoTheme(element: HTMLElement, theme: OqtoThemeSnapshot): void;
