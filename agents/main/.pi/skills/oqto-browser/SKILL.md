---
name: oqto-browser
description: Controls the managed browser instance for web testing, form filling, screenshots, and data extraction. Use when the user starts a browser session and sends browser control instructions to chat. The browser daemon is managed by oqto -- do NOT try to start your own.
allowed-tools: Bash(oqto-browser:*)
---

# Browser Control with oqto-browser

The browser is managed by the oqto platform. When the user starts a browser session, they will send you a message with the session ID. Use that session ID in all commands.

## Quick start

```bash
oqto-browser --session <SESSION_ID> snapshot -i    # List interactive elements with refs
oqto-browser --session <SESSION_ID> click @e1      # Click element by ref
oqto-browser --session <SESSION_ID> fill @e2 "text" # Fill input by ref
oqto-browser --session <SESSION_ID> press Enter    # Press key
oqto-browser --session <SESSION_ID> screenshot /tmp/shot.png
oqto-browser --session <SESSION_ID> open <url>     # Navigate
oqto-browser --session <SESSION_ID> eval "JS"      # Run JS in page
```

## Core workflow

1. User starts browser and sends you the session ID
2. Snapshot: `oqto-browser --session <ID> snapshot -i` (returns elements with refs like `@e1`, `@e2`)
3. Interact using refs from the snapshot
4. Re-snapshot after navigation or significant DOM changes

## Commands

### Navigation
```bash
oqto-browser --session <ID> open <url>     # Navigate to URL
oqto-browser --session <ID> back           # Go back
oqto-browser --session <ID> forward        # Go forward
oqto-browser --session <ID> reload         # Reload page
```

### Snapshot (page analysis)
```bash
oqto-browser --session <ID> snapshot            # Full accessibility tree
oqto-browser --session <ID> snapshot -i         # Interactive elements only (recommended)
```

### Interactions (use @refs from snapshot)
```bash
oqto-browser --session <ID> click @e1           # Click
oqto-browser --session <ID> fill @e2 "text"     # Clear and type
oqto-browser --session <ID> type @e2 "text"     # Type without clearing
oqto-browser --session <ID> press Enter         # Press key
oqto-browser --session <ID> hover @e1           # Hover
oqto-browser --session <ID> select @e1 "value"  # Select dropdown
oqto-browser --session <ID> scroll down 500     # Scroll page
oqto-browser --session <ID> scrollintoview @e1  # Scroll element into view
```

### Screenshots & Information
```bash
oqto-browser --session <ID> screenshot /tmp/shot.png  # Save screenshot
oqto-browser --session <ID> title                     # Get page title
oqto-browser --session <ID> url                       # Get current URL
oqto-browser --session <ID> console                   # View console messages
oqto-browser --session <ID> content                   # Get page HTML
```

### JavaScript
```bash
oqto-browser --session <ID> eval "document.title"     # Run JavaScript
```

### Wait
```bash
oqto-browser --session <ID> wait 2000                 # Wait milliseconds
```

## Example: Form submission

```bash
oqto-browser --session <ID> snapshot -i
# Output: textbox "Email" [ref=e1], textbox "Password" [ref=e2], button "Submit" [ref=e3]

oqto-browser --session <ID> fill @e1 "user@example.com"
oqto-browser --session <ID> fill @e2 "password123"
oqto-browser --session <ID> click @e3
oqto-browser --session <ID> wait 2000
oqto-browser --session <ID> snapshot -i   # Check result
```

## JSON output

Add `--json` for machine-readable output:
```bash
oqto-browser --session <ID> snapshot -i --json
```

## Important

- Do NOT try to start your own browser or install Playwright -- the browser is managed by oqto
- Always use the session ID provided by the user
- The `AGENT_BROWSER_SOCKET_DIR_BASE` env var is set automatically
