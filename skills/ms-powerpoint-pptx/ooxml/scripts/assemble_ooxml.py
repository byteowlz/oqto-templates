#!/usr/bin/env python3
"""
Tool to assemble a directory into a .docx, .pptx, or .xlsx file with XML formatting undone.

Example usage:
    python assemble_ooxml.py <input_directory> <office_file> [--force]
"""

import argparse
import shutil
import subprocess
import sys
import tempfile
import defusedxml.minidom
import zipfile
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(
        description="Assemble a directory into an Office file"
    )
    parser.add_argument("source_directory", help="Unpacked Office document directory")
    parser.add_argument("target_file", help="Output Office file (.docx/.pptx/.xlsx)")
    parser.add_argument("--force", action="store_true", help="Skip validation")
    args = parser.parse_args()

    try:
        success = assemble_document(
            args.source_directory, args.target_file, validate=not args.force
        )

        # Show warning if validation was skipped
        if args.force:
            print("Warning: Skipped validation, file may be corrupt", file=sys.stderr)
        # Exit with error if validation failed
        elif not success:
            print("Contents would produce a corrupt file.", file=sys.stderr)
            print("Please validate XML before assembling.", file=sys.stderr)
            print(
                "Use --force to skip validation and assemble anyway.", file=sys.stderr
            )
            sys.exit(1)

    except ValueError as ex:
        sys.exit(f"Error: {ex}")


def assemble_document(source_dir, target_file, validate=False):
    """Assemble a directory into an Office file (.docx/.pptx/.xlsx).

    Args:
        source_dir: Path to unpacked Office document directory
        target_file: Path to output Office file
        validate: If True, validates with soffice (default: False)

    Returns:
        bool: True if successful, False if validation failed
    """
    source_dir = Path(source_dir)
    target_file = Path(target_file)

    if not source_dir.is_dir():
        raise ValueError(f"{source_dir} is not a directory")
    if target_file.suffix.lower() not in {".docx", ".pptx", ".xlsx"}:
        raise ValueError(f"{target_file} must be a .docx, .pptx, or .xlsx file")

    # Work in temporary directory to avoid modifying original
    with tempfile.TemporaryDirectory() as tmp_dir:
        temp_content = Path(tmp_dir) / "content"
        shutil.copytree(source_dir, temp_content)

        # Process XML files to remove pretty-printing whitespace
        for pattern in ["*.xml", "*.rels"]:
            for xml_doc in temp_content.rglob(pattern):
                minimize_xml(xml_doc)

        # Create final Office file as zip archive
        target_file.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(target_file, "w", zipfile.ZIP_DEFLATED) as archive:
            for item in temp_content.rglob("*"):
                if item.is_file():
                    archive.write(item, item.relative_to(temp_content))

        # Validate if requested
        if validate:
            if not check_document(target_file):
                target_file.unlink()  # Delete the corrupt file
                return False

    return True


def check_document(doc_path):
    """Validate document by converting to HTML with soffice."""
    # Determine the correct filter based on file extension
    match doc_path.suffix.lower():
        case ".docx":
            filter_name = "html:HTML"
        case ".pptx":
            filter_name = "html:impress_html_Export"
        case ".xlsx":
            filter_name = "html:HTML (StarCalc)"

    with tempfile.TemporaryDirectory() as tmp_dir:
        try:
            result = subprocess.run(
                [
                    "soffice",
                    "--headless",
                    "--convert-to",
                    filter_name,
                    "--outdir",
                    tmp_dir,
                    str(doc_path),
                ],
                capture_output=True,
                timeout=10,
                text=True,
            )
            if not (Path(tmp_dir) / f"{doc_path.stem}.html").exists():
                error_text = result.stderr.strip() or "Document validation failed"
                print(f"Validation error: {error_text}", file=sys.stderr)
                return False
            return True
        except FileNotFoundError:
            print("Warning: soffice not found. Skipping validation.", file=sys.stderr)
            return True
        except subprocess.TimeoutExpired:
            print("Validation error: Timeout during conversion", file=sys.stderr)
            return False
        except Exception as ex:
            print(f"Validation error: {ex}", file=sys.stderr)
            return False


def minimize_xml(xml_doc):
    """Strip unnecessary whitespace and remove comments."""
    with open(xml_doc, "r", encoding="utf-8") as file_handle:
        dom = defusedxml.minidom.parse(file_handle)

    # Process each element to remove whitespace and comment nodes
    for element in dom.getElementsByTagName("*"):
        # Skip w:t elements and their processing
        if element.tagName.endswith(":t"):
            continue

        # Remove whitespace-only text nodes and comment nodes
        for child in list(element.childNodes):
            if (
                child.nodeType == child.TEXT_NODE
                and child.nodeValue
                and child.nodeValue.strip() == ""
            ) or child.nodeType == child.COMMENT_NODE:
                element.removeChild(child)

    # Write back the minimized XML
    with open(xml_doc, "wb") as file_handle:
        file_handle.write(dom.toxml(encoding="UTF-8"))


if __name__ == "__main__":
    main()
