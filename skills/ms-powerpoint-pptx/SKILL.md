---
name: ms-powerpoint-pptx
description: Comprehensive toolkit for PowerPoint operations—creating slides, editing content, managing layouts, adding comments and speaker notes. Use when handling .pptx files for presentation generation, content updates, design modifications, or any slide-related work.
license: MIT
---

# PowerPoint Operations

## Overview

This guide covers PowerPoint file manipulation. PPTX files are ZIP archives containing XML and resources. Choose the right approach based on your task.

## Content Access

### Quick Text Export

For simple reading without formatting:

```bash
python -m markitdown presentation.pptx
```

### Raw XML Access

For comments, notes, layouts, animations, or complex formatting:

**Extract:**

```bash
python ooxml/scripts/extract_ooxml.py <file> <folder>
```

**Key files:**

- `ppt/presentation.xml` — Metadata and slide list
- `ppt/slides/slideN.xml` — Individual slides
- `ppt/notesSlides/notesSlideN.xml` — Speaker notes
- `ppt/comments/` — Annotations
- `ppt/theme/` — Colors and fonts

**Design Analysis:**
When matching an existing design, check:

1. `ppt/theme/theme1.xml` for colors (`<a:clrScheme>`) and fonts
2. `ppt/slides/slide1.xml` for actual usage
3. Grep for patterns: `<a:solidFill>`, `<a:srgbClr>`

## Creating Presentations (No Template)

Use **html2pptx** workflow for precise HTML-to-PowerPoint conversion.

### Design Requirements

**CRITICAL:** Before coding:

1. Analyze subject matter, tone, industry, mood
2. Consider branding if mentioned
3. Choose colors reflecting the content
4. Explain your design approach first

**Must-haves:**

- State design approach BEFORE writing code
- Web-safe fonts only: Arial, Helvetica, Times, Georgia, Courier, Verdana, Tahoma, Trebuchet, Impact
- Clear hierarchy via size, weight, color
- Strong contrast and readability
- Consistent patterns across slides

### Color Palette Selection

Be creative—avoid defaults. Consider: topic, industry, mood, audience, brand.

**Example palettes:**

1. Classic Blue: Navy (#1C2833), slate (#2E4053), silver (#AAB7B8), off-white
2. Teal & Coral: Teal (#5EA8A7), deep teal (#277884), coral (#FE4447)
3. Bold Red: Red (#C0392B), bright red (#E74C3C), orange (#F39C12)
4. Warm Blush: Mauve (#A49393), blush (#EED6D3), rose (#E8B4B8)
5. Burgundy Luxury: Burgundy (#5D1D2E), crimson (#951233), gold (#997929)
6. Deep Purple & Emerald: Purple (#B165FB), dark blue (#181B24), emerald
7. Plus 12 more palettes...

### Visual Elements

**Patterns:** Diagonal dividers, asymmetric columns (30/70, 40/60), rotated headers (90°/270°), circular frames, overlapping shapes

**Borders:** Thick single-side borders (10-20pt), double lines, corner brackets, L-shapes, underlines

**Typography:** Extreme size contrast (72pt vs 11pt), all-caps headers, monospace for data, condensed fonts

**Charts:** Monochrome with accent, horizontal bars, dot plots, minimal/no gridlines, direct data labels

**Layouts:** Full-bleed images, sidebar columns (20-30%), modular grids (3×3, 4×4), magazine layouts

**Backgrounds:** Solid blocks (40-60%), gradients, split colors, edge-to-edge bands

### Layout Guidelines

For charts/tables:

- **Two-column (preferred):** Header full-width, content in two columns below (40%/60% split)
- **Full-slide:** Content occupies entire slide
- **NEVER stack vertically** in single column

### Workflow

1. **READ ALL OF** [`html2pptx.md`](html2pptx.md)—no line limits
2. Create HTML per slide (720pt × 405pt for 16:9)
   - Use `<p>`, `<h1>`-`<h6>`, `<ul>`, `<ol>` for text
   - `class="placeholder"` for chart/table areas
   - **CRITICAL:** Rasterize gradients/icons to PNG with Sharp first
3. Run JavaScript with `html2pptx.js` to convert
4. **Visual validation:**

   ```bash
   python scripts/slide_previews.py output.pptx workspace/thumbs --cols 4
   ```

   Check for: text cutoff, overlaps, positioning issues, contrast problems

## Editing Existing Presentations

Work with raw OOXML format.

**Steps:**

1. Read [`ooxml.md`](ooxml.md) completely (~500 lines)
2. Extract: `python ooxml/scripts/extract_ooxml.py <file> <folder>`
3. Edit XML (mainly `ppt/slides/slideN.xml`)
4. **CRITICAL:** Validate after each edit: `python ooxml/scripts/verify_ooxml.py <folder> --original <file>`
5. Repackage: `python ooxml/scripts/assemble_ooxml.py <folder> <file>`

## Using Templates

To create from existing template:

1. **Extract and visualize:**

   ```bash
   python -m markitdown template.pptx > content.md
   python scripts/thumbnail.py template.pptx
   ```

2. **Create inventory** at `template-inventory.md`:

   ```markdown
   # Template Inventory

   **Total: N slides** (0-indexed)

   ## Layouts

   - Slide 0: Title slide
   - Slide 1: Content with bullets
     ...
   ```

3. **Map content to slides** in `outline.md`:

   ```python
   template_mapping = [
       0,    # Title
       34,   # Content layout
       34,   # Reuse slide 34
       50,   # Quote layout
   ]
   ```

4. **Rearrange:**

   ```bash
   python scripts/rearrange.py template.pptx working.pptx 0,34,34,50
   ```

5. **Extract text inventory:**

```bash
python scripts/slide_previews.py deck.pptx [prefix]
```

6. **Create replacement JSON** with proper formatting (see SKILL.md for structure)

7. **Apply:**

   ```bash
   python scripts/replace.py working.pptx replacement.json final.pptx
   ```

## Thumbnails

```bash
python scripts/slide_previews.py template.pptx
```

- Default: 5 columns, 30 slides max
- Custom prefix: `python scripts/thumbnail.py deck.pptx my-deck`
- Columns: `--cols 4` (3-6 range)

## Slides to Images

```bash
# PPTX to PDF
soffice --headless --convert-to pdf deck.pptx

# PDF to images
pdftoppm -jpeg -r 150 deck.pdf slide
```

## Dependencies

- markitdown: `pip install "markitdown[pptx]"`
- pptxgenjs: `npm install -g pptxgenjs`
- playwright: `npm install -g playwright`
- react-icons: `npm install -g react-icons react react-dom`
- sharp: `npm install -g sharp`
- LibreOffice: `apt install libreoffice`
- Poppler: `apt install poppler-utils`
- defusedxml: `pip install defusedxml`
