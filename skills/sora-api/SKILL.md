---
name: sora-video-generator
description: Generate AI videos using OpenAI's Sora 2 API from text prompts. Use when the user wants to create videos with Sora, batch generate videos from prompts, or work with the generate_videos.py script in sora-api.
---

# Sora Video Generation

Generate videos from text prompts using the Sora 2 API.

## Prerequisites

- `OPENAI_API_KEY` environment variable set
- uv installed

## Usage

```bash
./generate_videos.py [-o OUTPUT_DIR] [-p PROMPTS_FILE]
```

Options:
- `-o, --output`: Output directory (default: `.`)
- `-p, --prompts`: Prompts file path (default: `./prompts.txt`)

Output directory is created automatically if it doesn't exist.

## Prompt format

```
Epic Battle: A cinematic space battle with lasers and explosions
```

Without a colon, the entire line becomes both title and prompt.

## Video settings

- Model: sora-2
- Resolution: 1280x720
- Duration: 12 seconds

## Prompt tips

Include: visual style, subject, action, mood, camera work.

```
VHS Commercial: A corny 1980s toy commercial with VHS static, fast zooms, cheap sound effects. Kids narrate excitedly. Terrible continuity and exaggerated acting.
```
