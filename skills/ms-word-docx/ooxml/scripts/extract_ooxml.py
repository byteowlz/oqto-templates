#!/usr/bin/env python3
"""Extract and format XML contents of Office documents (.docx, .pptx, .xlsx)"""

import random
import sys
import defusedxml.minidom
import zipfile
from pathlib import Path

# Parse command line arguments
assert len(sys.argv) == 3, "Usage: python extract_ooxml.py <office_file> <output_dir>"
source_file, destination = sys.argv[1], sys.argv[2]

# Extract and format
dest_path = Path(destination)
dest_path.mkdir(parents=True, exist_ok=True)
zipfile.ZipFile(source_file).extractall(dest_path)

# Format all XML files
xml_docs = list(dest_path.rglob("*.xml")) + list(dest_path.rglob("*.rels"))
for xml_doc in xml_docs:
    data = xml_doc.read_text(encoding="utf-8")
    dom = defusedxml.minidom.parseString(data)
    xml_doc.write_bytes(dom.toprettyxml(indent="  ", encoding="ascii"))

# For .docx files, recommend an RSID for tracked changes
if source_file.endswith(".docx"):
    recommended_rsid = "".join(random.choices("0123456789ABCDEF", k=8))
    print(f"Recommended RSID for edit session: {recommended_rsid}")
