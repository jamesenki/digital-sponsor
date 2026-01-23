#!/usr/bin/env python3
"""
Fetch more Grapevine articles using Playwright with expanded article list.
"""

import json
import re
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

OUTPUT_DIR = Path("/home/enki/projects/digital-sponsor-investor-demo/data-preserve/grapevine-subscription")

EMAIL = "jamessimonster@gmail.com"
PASSWORD = "Lifeb4De@th"

# Expanded article list based on search results
ARTICLES = [
    # Early Bill W. articles
    {"url": "https://www.aagrapevine.org/magazine/1945/jul/grapevine", "title": "The Grapevine (1945)", "type": "history"},
    {"url": "https://www.aagrapevine.org/magazine/1945/oct/editorial", "title": "Editorial Oct 1945", "type": "editorial"},
    {"url": "https://www.aagrapevine.org/magazine/1945/sep/same-problem-all", "title": "Same Problem for All", "type": "personal_story"},
    {"url": "https://www.aagrapevine.org/magazine/1946/aug/ours-not-judge", "title": "Ours Not to Judge", "type": "membership"},
    {"url": "https://www.aagrapevine.org/magazine/1948/feb/editorial", "title": "Editorial Feb 1948", "type": "editorial"},
    {"url": "https://www.aagrapevine.org/magazine/1961/jun/humility-today", "title": "Humility for Today", "type": "spiritual"},

    # Classic Step articles
    {"url": "https://www.aagrapevine.org/magazine/1958/jan/next-frontier-emotional-sobriety", "title": "Emotional Sobriety", "type": "step"},
    {"url": "https://www.aagrapevine.org/magazine/1944/jun/alcoholics-anonymous", "title": "Alcoholics Anonymous (1944)", "type": "history"},

    # More Tradition articles from search
    {"url": "https://www.aagrapevine.org/magazine/1952/apr/tradition-one", "title": "Tradition One", "type": "tradition"},
    {"url": "https://www.aagrapevine.org/magazine/1952/may/tradition-two", "title": "Tradition Two", "type": "tradition"},
    {"url": "https://www.aagrapevine.org/magazine/1952/dec/tradition-eight", "title": "Tradition Eight", "type": "tradition"},
    {"url": "https://www.aagrapevine.org/magazine/1953/jan/tradition-nine", "title": "Tradition Nine", "type": "tradition"},
    {"url": "https://www.aagrapevine.org/magazine/1953/feb/tradition-ten", "title": "Tradition Ten", "type": "tradition"},
    {"url": "https://www.aagrapevine.org/magazine/1953/mar/tradition-eleven", "title": "Tradition Eleven", "type": "tradition"},
    {"url": "https://www.aagrapevine.org/magazine/1953/apr/tradition-twelve", "title": "Tradition Twelve", "type": "tradition"},

    # Step Revisited series
    {"url": "https://www.aagrapevine.org/magazine/1962/feb/twelve-steps-revisitedstep-6", "title": "Step 6 Revisited", "type": "step"},
    {"url": "https://www.aagrapevine.org/magazine/1963/oct/twelve-steps-revisitedstep-12", "title": "Step 12 Revisited", "type": "step"},
    {"url": "https://www.aagrapevine.org/magazine/1971/jan/8th-step", "title": "8th Step", "type": "step"},

    # Recent articles
    {"url": "https://www.aagrapevine.org/magazine/2020/nov/taking-first-step", "title": "Taking That First Step", "type": "step"},
]


def extract_content(page) -> dict:
    """Extract article content"""
    page.wait_for_load_state('networkidle', timeout=15000)
    time.sleep(2)

    content = ""
    title = ""

    # Get title
    try:
        h1 = page.query_selector('h1')
        if h1:
            title = h1.inner_text().strip()
    except:
        pass

    # Get main content - try multiple approaches
    selectors = [
        '.field--name-body',
        '.article-body',
        'article .content',
        '.node__content .field',
        'article'
    ]

    for sel in selectors:
        try:
            el = page.query_selector(sel)
            if el:
                text = el.inner_text()
                # Clean up
                lines = []
                for line in text.split('\n'):
                    line = line.strip()
                    if len(line) > 40:
                        skip = ['subscribe', 'login', 'customer service', 'want to continue',
                               'call 800', 'email:', 'carry the message', 'submit your',
                               'follow grapevine', 'podcasts', 'instagram']
                        if not any(s in line.lower() for s in skip):
                            lines.append(line)
                if lines:
                    candidate = '\n\n'.join(lines)
                    if len(candidate) > len(content):
                        content = candidate
        except:
            continue

    return {
        "title": title,
        "content": content,
        "word_count": len(content.split())
    }


def main():
    print("=" * 60)
    print("AA Grapevine Archive Fetcher (Extended)")
    print("=" * 60)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    articles = []
    seen_urls = set()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Login
        print("\nLogging in...")
        page.goto("https://www.aagrapevine.org/user/login")
        time.sleep(2)

        try:
            page.fill('input[name="name"]', EMAIL)
            page.fill('input[name="pass"]', PASSWORD)
            page.click('input[type="submit"], button[type="submit"]')
            time.sleep(4)
            print("Login submitted")
        except Exception as e:
            print(f"Login error: {e}")

        # Fetch articles
        print(f"\nFetching {len(ARTICLES)} articles...")

        for i, info in enumerate(ARTICLES):
            if info['url'] in seen_urls:
                continue
            seen_urls.add(info['url'])

            print(f"[{i+1}/{len(ARTICLES)}] {info['title']}...")

            try:
                page.goto(info['url'], timeout=30000)
                result = extract_content(page)

                if result['word_count'] >= 80:
                    aid = re.sub(r'[^a-z0-9]+', '_', info['title'].lower())[:40]
                    articles.append({
                        "id": f"gv_archive_{aid}",
                        "title": result['title'] or info['title'],
                        "content": result['content'],
                        "source": "AA Grapevine Magazine",
                        "url": info['url'],
                        "content_type": info['type'],
                        "keywords": extract_kw(result['content'], info['type']),
                        "word_count": result['word_count']
                    })
                    print(f"  {result['word_count']} words")
                else:
                    print(f"  Skipped ({result['word_count']} words)")

            except Exception as e:
                print(f"  Error: {str(e)[:50]}")

            time.sleep(1.5)

        browser.close()

    # Save
    if articles:
        # Merge with existing
        existing_path = OUTPUT_DIR / "grapevine_full_articles.json"
        existing = []
        if existing_path.exists():
            with open(existing_path) as f:
                existing = json.load(f)

        # Dedupe by URL
        existing_urls = {a.get('url') for a in existing}
        for a in articles:
            if a['url'] not in existing_urls:
                existing.append(a)

        with open(existing_path, 'w') as f:
            json.dump(existing, f, indent=2)

        # Generate Python
        py_path = Path("/home/enki/projects/digital-sponsor-investor-demo/containers/literature-service/grapevine_subscription_content.py")
        with open(py_path, 'w') as f:
            f.write('"""\nAA Grapevine Subscription Articles\n"""\n\n')
            f.write('GRAPEVINE_SUBSCRIPTION_ARTICLES = [\n')
            for a in existing:
                c = a['content'].replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')
                t = a['title'].replace('"', '\\"')
                f.write('    {\n')
                f.write(f'        "id": "{a["id"]}",\n')
                f.write(f'        "title": "{t}",\n')
                f.write(f'        "content": "{c}",\n')
                f.write(f'        "source": "{a["source"]}",\n')
                f.write(f'        "content_type": "{a["content_type"]}",\n')
                f.write(f'        "keywords": {a["keywords"]},\n')
                f.write('    },\n')
            f.write(']\n')

        print(f"\nTotal articles: {len(existing)}")
        print(f"Total words: {sum(a['word_count'] for a in existing):,}")


def extract_kw(text, atype):
    terms = ["step", "tradition", "sponsor", "god", "prayer", "inventory",
             "amends", "sobriety", "recovery", "alcoholic", "spiritual",
             "fellowship", "unity", "service", "anonymity", "humility"]
    found = [atype]
    for t in terms:
        if t in text.lower() and t not in found:
            found.append(t)
    return found[:8]


if __name__ == "__main__":
    main()
