---
name: camofox-browser
description: Anti-detection headless browser for AI agents powered by Camoufox (Firefox fork with C++ fingerprint spoofing). Use when the user asks to browse websites, scrape pages, fill forms, take screenshots, extract data, or interact with web pages that block normal automation. Bypasses Google, Cloudflare, and most bot detection. Also supports YouTube transcript extraction and search macros.
allowed-tools: Bash, Read
---

# Camofox Browser — Anti-Detection Browsing for Agents

Camofox wraps [Camoufox](https://camoufox.com) (a Firefox fork with C++-level fingerprint spoofing) in a REST API designed for AI agents. It returns accessibility snapshots with stable element refs (`e1`, `e2`, ...) instead of raw HTML — ~90% smaller and easier to reason about.

**Install location:** `~/byteowlz/external-repos/camofox-browser`

## Starting the Server

```bash
# Start in background (default port 9377)
cd ~/byteowlz/external-repos/camofox-browser && node server.js > /tmp/camofox.log 2>&1 &
sleep 3

# Verify it's running
curl -s http://localhost:9377/
# → {"ok":true,"enabled":true,"running":true,"engine":"camoufox","browserConnected":true}
```

To stop: `pkill -f "node server.js"` or `curl -X POST http://localhost:9377/stop` (requires `CAMOFOX_ADMIN_KEY`).

## Core Workflow

All API calls require `userId` (isolates cookies/storage). Use `sessionKey` to group tabs by task.

### 1. Create a Tab

```bash
TAB=$(curl -s -X POST http://localhost:9377/tabs \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "userId": "agent1", "sessionKey": "task1"}')
TAB_ID=$(echo "$TAB" | jq -r .tabId)
echo "Tab: $TAB_ID"
```

### 2. Get Accessibility Snapshot

```bash
curl -s "http://localhost:9377/tabs/$TAB_ID/snapshot?userId=agent1" | jq -r .snapshot
```

Returns a tree with element refs:
```
- heading "Example Domain" [level=1]
- paragraph: This domain is for use in illustrative examples.
- link "More information..." [e1]
```

For large pages, the snapshot is auto-truncated. Use `offset=N` to paginate:
```bash
curl -s "http://localhost:9377/tabs/$TAB_ID/snapshot?userId=agent1&offset=5000"
```

### 3. Click an Element

```bash
curl -s -X POST "http://localhost:9377/tabs/$TAB_ID/click" \
  -H "Content-Type: application/json" \
  -d '{"userId": "agent1", "ref": "e1"}'
```

You can also use CSS selectors: `{"userId": "agent1", "selector": "button.submit"}`

### 4. Type Text

```bash
curl -s -X POST "http://localhost:9377/tabs/$TAB_ID/type" \
  -H "Content-Type: application/json" \
  -d '{"userId": "agent1", "ref": "e2", "text": "hello world"}'
```

Add `"pressEnter": true` to submit after typing.

### 5. Take a Screenshot

```bash
curl -s "http://localhost:9377/tabs/$TAB_ID/screenshot?userId=agent1" -o /tmp/screenshot.png
```

You can also include a screenshot in the snapshot:
```bash
curl -s "http://localhost:9377/tabs/$TAB_ID/snapshot?userId=agent1&includeScreenshot=true"
# → { "snapshot": "...", "screenshot": "data:image/png;base64,..." }
```

### 6. Navigate

```bash
curl -s -X POST "http://localhost:9377/tabs/$TAB_ID/navigate" \
  -H "Content-Type: application/json" \
  -d '{"userId": "agent1", "url": "https://other-site.com"}'
```

**Important:** Element refs reset after navigation. Always get a fresh snapshot.

### 7. Close Tab

```bash
curl -s -X DELETE "http://localhost:9377/tabs/$TAB_ID?userId=agent1"
```

## Full API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/tabs` | Create tab: `{userId, sessionKey, url}` |
| `GET` | `/tabs?userId=X` | List open tabs |
| `GET` | `/tabs/:id/snapshot?userId=X` | Accessibility snapshot. Params: `includeScreenshot=true`, `offset=N` |
| `GET` | `/tabs/:id/screenshot?userId=X` | PNG screenshot |
| `POST` | `/tabs/:id/click` | Click: `{userId, ref}` or `{userId, selector}` |
| `POST` | `/tabs/:id/type` | Type: `{userId, ref, text, pressEnter?}` |
| `POST` | `/tabs/:id/press` | Press key: `{userId, key}` |
| `POST` | `/tabs/:id/scroll` | Scroll: `{userId, direction, amount}` |
| `POST` | `/tabs/:id/navigate` | Navigate: `{userId, url}` or `{userId, macro, query}` |
| `POST` | `/tabs/:id/wait` | Wait for selector or timeout |
| `POST` | `/tabs/:id/back` | Go back |
| `POST` | `/tabs/:id/forward` | Go forward |
| `POST` | `/tabs/:id/refresh` | Refresh page |
| `GET` | `/tabs/:id/links?userId=X` | Extract all links. Param: `limit=N` |
| `GET` | `/tabs/:id/images?userId=X` | List images. Params: `includeData=true`, `maxBytes=N`, `limit=N` |
| `GET` | `/tabs/:id/downloads?userId=X` | List downloads. Params: `includeData=true`, `consume=true` |
| `DELETE` | `/tabs/:id?userId=X` | Close tab |
| `DELETE` | `/sessions/:userId` | Delete all user data |

## Search Macros

Instead of constructing URLs manually, use macros with navigate:

```bash
curl -s -X POST "http://localhost:9377/tabs/$TAB_ID/navigate" \
  -H "Content-Type: application/json" \
  -d '{"userId": "agent1", "macro": "@google_search", "query": "best coffee beans"}'
```

| Macro | Site |
|-------|------|
| `@google_search` | Google |
| `@youtube_search` | YouTube |
| `@amazon_search` | Amazon |
| `@reddit_search` | Reddit |
| `@reddit_subreddit` | Reddit subreddit |
| `@wikipedia_search` | Wikipedia |
| `@twitter_search` | Twitter/X |
| `@yelp_search` | Yelp |
| `@linkedin_search` | LinkedIn |

## YouTube Transcripts

Extract captions from any YouTube video (uses yt-dlp when available):

```bash
curl -s -X POST http://localhost:9377/youtube/transcript \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=VIDEO_ID", "languages": ["en"]}'
# → {"status":"ok","transcript":"[00:18] text...", "video_title":"...", "total_words": 548}
```

## Session Management

- **`userId`** — Isolates cookies/storage per user (required on all calls)
- **`sessionKey`** — Groups tabs by conversation/task within a user
- Sessions auto-expire after 30 minutes of inactivity
- Browser shuts down after 5 minutes with no active sessions, relaunches on next request

## Example: Full Browse Session

```bash
# 1. Start server if not running
cd ~/byteowlz/external-repos/camofox-browser
pgrep -f "node server.js" || (node server.js > /tmp/camofox.log 2>&1 & sleep 3)

# 2. Create tab
TAB_ID=$(curl -s -X POST http://localhost:9377/tabs \
  -H "Content-Type: application/json" \
  -d '{"url": "https://news.ycombinator.com", "userId": "agent1", "sessionKey": "browse"}' | jq -r .tabId)

# 3. Get snapshot
curl -s "http://localhost:9377/tabs/$TAB_ID/snapshot?userId=agent1" | jq -r .snapshot

# 4. Screenshot
curl -s "http://localhost:9377/tabs/$TAB_ID/screenshot?userId=agent1" -o /tmp/page.png

# 5. Click a link
curl -s -X POST "http://localhost:9377/tabs/$TAB_ID/click" \
  -H "Content-Type: application/json" \
  -d '{"userId": "agent1", "ref": "e3"}'

# 6. Get new snapshot after navigation
curl -s "http://localhost:9377/tabs/$TAB_ID/snapshot?userId=agent1" | jq -r .snapshot

# 7. Clean up
curl -s -X DELETE "http://localhost:9377/tabs/$TAB_ID?userId=agent1"
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CAMOFOX_PORT` | `9377` | Server port |
| `MAX_SESSIONS` | `50` | Max concurrent sessions |
| `MAX_TABS_PER_SESSION` | `10` | Max tabs per session |
| `SESSION_TIMEOUT_MS` | `1800000` | Session inactivity timeout (30min) |
| `BROWSER_IDLE_TIMEOUT_MS` | `300000` | Kill browser when idle (5min) |

## Tips

- **Always re-snapshot after navigation** — element refs reset when the page changes
- **Use refs over selectors** — refs are stable within a snapshot and more reliable
- **Prefer snapshots over screenshots** — snapshots are token-efficient and structured
- **Use search macros** — they handle URL construction and work better with anti-detection
- **Large pages** — if `truncated: true` in snapshot response, use `offset` to paginate
