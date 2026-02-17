---
name: ms-word-docx
description: Toolkit for working with Microsoft Word .docx files—crafting new documents, editing existing ones, managing tracked changes and comments, plus extracting content. Invoke when users need help with Word document generation, collaborative editing with revision marks, annotations, or any DOCX manipulation.
license: MIT
---

# Working with Word Documents

## What This Covers

This guide equips you to handle Microsoft Word document requests. DOCX files are essentially ZIP archives packed with XML and supporting files. Different tasks call for different tools.

## Choosing Your Path

| Task                                     | Approach                                             |
| ---------------------------------------- | ---------------------------------------------------- |
| Extract or analyze text                  | Use "Text Extraction" or "Direct XML" sections below |
| Build from scratch                       | Follow "Creating Documents" workflow                 |
| Edit your own simple docs                | Use "Basic OOXML Editing"                            |
| Edit someone else's docs                 | **Use "Tracked Changes Workflow"** (recommended)     |
| Legal/academic/corporate/government docs | **Use "Tracked Changes Workflow"** (required)        |

## Reading Documents

### Quick Text Extraction

For simple reading without formatting concerns, convert to Markdown with pandoc:

```bash
# Export to markdown with revision marks visible
pandoc --track-changes=all document.docx -o output.md
# Options: accept, reject, or all
```

### Accessing Raw XML

For comments, complex styling, document structure, embedded media, or metadata—you'll need direct XML access.

**Extract the archive:**

```bash
python ooxml/scripts/extract_ooxml.py <document> <folder>
```

**Key locations:**

- `word/document.xml` — Main content
- `word/comments.xml` — Comments
- `word/media/` — Images and media
- Tracked changes: `<w:ins>` for insertions, `<w:del>` for deletions

## Creating New Documents

For fresh documents, use **docx-js** (JavaScript/TypeScript library).

**Steps:**

1. **CRITICAL:** Read [`docx-js.md`](docx-js.md) completely (~500 lines). No line limits—read it all.
2. Write JS/TS using Document, Paragraph, TextRun components
3. Export with Packer.toBuffer()

## Editing Existing Documents

For modifications, use the **Document Library** (Python OOXML toolkit).

**Steps:**

1. **CRITICAL:** Read [`ooxml.md`](ooxml.md) completely (~600 lines). No line limits.
2. Extract: `python ooxml/scripts/extract_ooxml.py <doc> <folder>`
3. Write Python using the Document Library (see ooxml.md)
4. Repackage: `python ooxml/scripts/assemble_ooxml.py <folder> <doc>`

## Tracked Changes (Redlining)

Plan changes in Markdown first, then implement in OOXML. **IMPORTANT:** Implement ALL changes systematically.

**Batch Strategy:** Group 3-10 related changes. Debug each batch before proceeding.

**Precision Rule:** Only mark changed text. Structure as: [unchanged] + [deletion] + [insertion] + [unchanged]. Preserve original RSIDs.

**Example:** Changing "30 days" to "60 days":

```python
# WRONG - Replaces whole sentence
'<w:del><w:r><w:delText>The term is 30 days.</w:delText></w:r></w:del><w:ins><w:r><w:t>The term is 60 days.</w:t></w:r></w:ins>'

# RIGHT - Only changes modified text
'<w:r w:rsidR="00AB12CD"><w:t>The term is </w:t></w:r><w:del><w:r><w:delText>30</w:delText></w:r></w:del><w:ins><w:r><w:t>60</w:t></w:r></w:ins><w:r w:rsidR="00AB12CD"><w:t> days.</w:t></w:r>'
```

### Workflow

1. **Get markdown view:**

   ```bash
   pandoc --track-changes=all document.docx -o current.md
   ```

2. **Identify and batch changes:**
   - Find text via: section numbers, paragraph IDs, grep patterns, document landmarks
   - **DO NOT use markdown line numbers**—they don't map to XML
   - Group 3-10 changes per batch by: section, type, or location

3. **Read docs and extract:**
   - Read [`ooxml.md`](ooxml.md) fully
   - Extract: `python ooxml/scripts/extract_ooxml.py <doc> <folder>`
   - Note suggested RSID for your session

4. **Implement in batches:**
   - Grep `word/document.xml` to see text distribution across `<w:r>` elements
   - Use `get_node` to find targets, modify, then `doc.save()`
   - **Always grep before scripting**—line numbers shift after each run

5. **Repackage:**

   ```bash
   python ooxml/scripts/assemble_ooxml.py <folder> final.docx
   ```

6. **Verify:**

   ```bash
   pandoc --track-changes=all final.docx -o check.md
   grep "old phrase" check.md  # Should find nothing
   grep "new phrase" check.md  # Should find it
   ```

## Visual Inspection

Convert documents to images for visual checking:

```bash
# Step 1: DOCX to PDF
soffice --headless --convert-to pdf document.docx

# Step 2: PDF to JPEG
pdftoppm -jpeg -r 150 document.pdf page
```

Options:

- `-r 150`: DPI (adjust for quality/size tradeoff)
- `-jpeg` or `-png`: Output format
- `-f N`: First page
- `-l N`: Last page

## Code Standards

When writing DOCX code:

- Keep it concise
- No verbose variable names
- No unnecessary print statements

## Required Tools

- **pandoc**: Text extraction (`apt install pandoc`)
- **docx**: Document creation (`npm install -g docx`)
- **LibreOffice**: PDF conversion (`apt install libreoffice`)
- **Poppler**: PDF to images (`apt install poppler-utils`)
- **defusedxml**: Secure XML (`pip install defusedxml`)
