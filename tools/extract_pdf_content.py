#!/usr/bin/env python3
"""
Extract text from AA literature PDFs and convert to knowledge base format.
Outputs chunked content ready for the literature database.
"""

import json
import re
import os
from pypdf import PdfReader
from pathlib import Path

# Configuration
PDF_DIR = Path("/mnt/c/Users/NUC/Desktop/digitalsponsor")
OUTPUT_DIR = Path("/home/enki/projects/digital-sponsor-investor-demo/data-preserve/literature")

# PDF files to process
PDF_FILES = {
    "big_book": {
        "filename": "AA-BigBook-4th-Edition.pdf",
        "title": "Alcoholics Anonymous (Big Book) 4th Edition",
        "short_name": "Big Book"
    },
    "twelve_twelve": {
        "filename": "AA-12-Steps-12-Traditions.pdf",
        "title": "Twelve Steps and Twelve Traditions",
        "short_name": "12&12"
    },
    "joe_charlie": {
        "filename": "Joe and Charlie - Joe and Charlie.pdf",
        "title": "Joe and Charlie Big Book Study",
        "short_name": "Joe & Charlie"
    }
}

# Chunk configuration
MAX_CHUNK_WORDS = 800
MIN_CHUNK_WORDS = 200
OVERLAP_WORDS = 50


def clean_text(text: str) -> str:
    """Clean extracted PDF text."""
    # Remove excessive whitespace
    text = re.sub(r'\s+', ' ', text)
    # Remove page numbers and headers that repeat
    text = re.sub(r'\d+\s*ALCOHOLICS ANONYMOUS', '', text)
    text = re.sub(r'TWELVE STEPS AND TWELVE TRADITIONS\s*\d+', '', text)
    # Clean up hyphenation from line breaks
    text = re.sub(r'(\w)-\s+(\w)', r'\1\2', text)
    return text.strip()


def extract_pdf_text(pdf_path: Path) -> list[dict]:
    """Extract text from PDF, page by page."""
    reader = PdfReader(pdf_path)
    pages = []

    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        text = clean_text(text)
        if text and len(text) > 50:  # Skip nearly empty pages
            pages.append({
                "page_num": i + 1,
                "text": text
            })

    return pages


def chunk_text(pages: list[dict], source_key: str, source_info: dict) -> list[dict]:
    """Chunk pages into appropriately sized segments."""
    chunks = []
    current_chunk = ""
    current_pages = []
    chunk_id = 1

    for page_data in pages:
        page_num = page_data["page_num"]
        text = page_data["text"]
        words = text.split()

        # If adding this page would exceed max, save current chunk first
        current_words = len(current_chunk.split()) if current_chunk else 0

        if current_words + len(words) > MAX_CHUNK_WORDS and current_words >= MIN_CHUNK_WORDS:
            # Save current chunk
            chunks.append(create_chunk(
                chunk_id, current_chunk, current_pages, source_key, source_info
            ))
            chunk_id += 1

            # Start new chunk with overlap
            overlap_text = " ".join(current_chunk.split()[-OVERLAP_WORDS:])
            current_chunk = overlap_text + " " + text
            current_pages = [current_pages[-1], page_num] if current_pages else [page_num]
        else:
            # Add to current chunk
            current_chunk = (current_chunk + " " + text).strip()
            if page_num not in current_pages:
                current_pages.append(page_num)

    # Don't forget the last chunk
    if current_chunk and len(current_chunk.split()) >= MIN_CHUNK_WORDS:
        chunks.append(create_chunk(
            chunk_id, current_chunk, current_pages, source_key, source_info
        ))

    return chunks


def create_chunk(chunk_id: int, text: str, pages: list[int], source_key: str, source_info: dict) -> dict:
    """Create a chunk dictionary with metadata."""
    # Generate keywords from content
    keywords = extract_keywords(text)

    # Determine page range string
    if len(pages) == 1:
        page_ref = f"p. {pages[0]}"
    else:
        page_ref = f"pp. {min(pages)}-{max(pages)}"

    return {
        "id": f"{source_key}_chunk_{chunk_id}",
        "title": f"{source_info['short_name']} - {page_ref}",
        "content": text,
        "source": source_info["title"],
        "source_key": source_key,
        "page_start": min(pages),
        "page_end": max(pages),
        "page_ref": page_ref,
        "keywords": keywords,
        "word_count": len(text.split())
    }


def extract_keywords(text: str) -> list[str]:
    """Extract relevant AA keywords from text."""
    # Common AA terms to look for
    aa_terms = [
        "step", "steps", "tradition", "traditions", "sponsor", "sponsee",
        "higher power", "god", "prayer", "meditation", "inventory", "amends",
        "defects", "character", "shortcomings", "resentment", "fear", "sex",
        "sobriety", "recovery", "alcoholic", "alcoholism", "powerless",
        "unmanageable", "sanity", "restore", "decision", "will", "searching",
        "fearless", "moral", "admitted", "wrongs", "remove", "humbly",
        "direct", "amends", "continued", "promptly", "improve", "conscious",
        "contact", "knowledge", "power", "carry", "message", "practice",
        "principles", "spiritual", "experience", "awakening", "big book",
        "twelve", "service", "unity", "fellowship", "meeting", "home group",
        "serenity", "acceptance", "courage", "wisdom", "honesty", "hope",
        "faith", "willingness", "humility", "love", "discipline", "perseverance",
        "awareness", "fourth step", "fifth step", "ninth step", "tenth step",
        "eleventh step", "twelfth step", "first step", "second step", "third step"
    ]

    text_lower = text.lower()
    found = []
    for term in aa_terms:
        if term in text_lower:
            found.append(term)

    return found[:10]  # Limit to top 10 keywords


def process_pdf(source_key: str, source_info: dict) -> list[dict]:
    """Process a single PDF file."""
    pdf_path = PDF_DIR / source_info["filename"]

    if not pdf_path.exists():
        print(f"  ERROR: File not found: {pdf_path}")
        return []

    print(f"  Extracting text from {source_info['filename']}...")
    pages = extract_pdf_text(pdf_path)
    print(f"  Extracted {len(pages)} pages with content")

    print(f"  Chunking content...")
    chunks = chunk_text(pages, source_key, source_info)
    print(f"  Created {len(chunks)} chunks")

    return chunks


def save_json(chunks: list[dict], output_path: Path):
    """Save chunks to JSON file."""
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(chunks, f, indent=2, ensure_ascii=False)
    print(f"  Saved to {output_path}")


def generate_python_dict(all_chunks: list[dict], output_path: Path):
    """Generate Python dictionary file for literature database."""

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('"""\n')
        f.write('PDF-extracted AA Literature Content\n')
        f.write('Auto-generated from PDF extraction pipeline\n')
        f.write('"""\n\n')
        f.write('PDF_LITERATURE_ITEMS = [\n')

        for chunk in all_chunks:
            # Escape the content for Python string
            content = chunk['content'].replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')
            title = chunk['title'].replace('"', '\\"')
            source = chunk['source'].replace('"', '\\"')

            f.write('    {\n')
            f.write(f'        "id": "{chunk["id"]}",\n')
            f.write(f'        "title": "{title}",\n')
            f.write(f'        "content": "{content}",\n')
            f.write(f'        "source": "{source}",\n')
            f.write(f'        "page_ref": "{chunk["page_ref"]}",\n')
            f.write(f'        "keywords": {chunk["keywords"]},\n')
            f.write('    },\n')

        f.write(']\n')

    print(f"Generated Python dict: {output_path}")


def main():
    """Main extraction pipeline."""
    print("=" * 60)
    print("AA Literature PDF Extraction Pipeline")
    print("=" * 60)

    # Create output directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    all_chunks = []

    for source_key, source_info in PDF_FILES.items():
        print(f"\nProcessing: {source_info['title']}")
        print("-" * 40)

        chunks = process_pdf(source_key, source_info)

        if chunks:
            # Save individual JSON
            json_path = OUTPUT_DIR / f"{source_key}_content.json"
            save_json(chunks, json_path)
            all_chunks.extend(chunks)

    # Save combined JSON
    combined_path = OUTPUT_DIR / "all_literature_content.json"
    save_json(all_chunks, combined_path)

    # Generate Python dict for literature service
    python_path = Path("/home/enki/projects/digital-sponsor-investor-demo/containers/literature-service/pdf_literature_content.py")
    generate_python_dict(all_chunks, python_path)

    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Total chunks created: {len(all_chunks)}")
    print(f"Total words: {sum(c['word_count'] for c in all_chunks):,}")
    print(f"\nOutput files:")
    print(f"  - JSON: {OUTPUT_DIR}/")
    print(f"  - Python: {python_path}")
    print("\nNext steps:")
    print("  1. Review generated content")
    print("  2. Update massive_literature_database.py to import PDF content")
    print("  3. Rebuild and deploy literature service")


if __name__ == "__main__":
    main()
