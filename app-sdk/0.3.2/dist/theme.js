/** Apply a host theme to one app root without mutating global document state. */
export function applyOqtoTheme(element, theme) {
    element.dataset.oqtoColorScheme = theme.colorScheme;
    for (const [name, value] of Object.entries(theme.tokens)) {
        if (!name.startsWith("--"))
            continue;
        element.style.setProperty(name, value);
    }
}
//# sourceMappingURL=theme.js.map