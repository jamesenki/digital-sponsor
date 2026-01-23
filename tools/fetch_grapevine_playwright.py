#!/usr/bin/env python3
"""
Fetch AA Grapevine articles using Playwright (headless browser).
This handles JavaScript rendering and proper session authentication.
"""

import json
import re
import os
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

OUTPUT_DIR = Path("/home/enki/projects/digital-sponsor-investor-demo/data-preserve/grapevine-subscription")

# Credentials
EMAIL = "jamessimonster@gmail.com"
PASSWORD = "Lifeb4De@th"

# Articles to fetch - focusing on classic Step/Tradition content
ARTICLES_TO_FETCH = [
    # 1952 Tradition Series
    {"url": "https://www.aagrapevine.org/magazine/1952/apr/tradition-one", "title": "Tradition One (1952)", "type": "tradition"},
    {"url": "https://www.aagrapevine.org/magazine/1952/may/tradition-two", "title": "Tradition Two (1952)", "type": "tradition"},
    {"url": "https://www.aagrapevine.org/magazine/1952/dec/tradition-eight", "title": "Tradition Eight (1952)", "type": "tradition"},
    {"url": "https://www.aagrapevine.org/magazine/1953/jan/tradition-nine", "title": "Tradition Nine (1953)", "type": "tradition"},
    {"url": "https://www.aagrapevine.org/magazine/1953/feb/tradition-ten", "title": "Tradition Ten (1953)", "type": "tradition"},
    {"url": "https://www.aagrapevine.org/magazine/1953/mar/tradition-eleven", "title": "Tradition Eleven (1953)", "type": "tradition"},
    {"url": "https://www.aagrapevine.org/magazine/1953/apr/tradition-twelve", "title": "Tradition Twelve (1953)", "type": "tradition"},

    # 12 Steps Revisited Series
    {"url": "https://www.aagrapevine.org/magazine/1962/feb/twelve-steps-revisitedstep-6", "title": "Step 6 Revisited", "type": "step"},
    {"url": "https://www.aagrapevine.org/magazine/1962/oct/twelve-steps-revisited-step-10", "title": "Step 10 Revisited", "type": "step"},
    {"url": "https://www.aagrapevine.org/magazine/1963/oct/twelve-steps-revisitedstep-12", "title": "Step 12 Revisited", "type": "step"},

    # Classic articles
    {"url": "https://www.aagrapevine.org/magazine/1971/jan/8th-step", "title": "8th Step (1971)", "type": "step"},
    {"url": "https://www.aagrapevine.org/magazine/1992/mar/tradition-three", "title": "Tradition Three (1992)", "type": "tradition"},
    {"url": "https://www.aagrapevine.org/magazine/2020/nov/taking-first-step", "title": "Taking That First Step (2020)", "type": "step"},
]


def extract_article_content(page) -> dict:
    """Extract article content from the page"""
    try:
        # Wait for content to load
        page.wait_for_load_state('networkidle', timeout=10000)
        time.sleep(2)  # Extra wait for JS

        # Try multiple selectors for article content
        content = ""
        selectors = [
            'article .field--name-body',
            'article .content',
            '.article-content',
            '.node__content',
            'article',
            '.main-content'
        ]

        for selector in selectors:
            try:
                element = page.query_selector(selector)
                if element:
                    text = element.inner_text()
                    # Filter out navigation/UI text
                    lines = []
                    for line in text.split('\n'):
                        line = line.strip()
                        if line and len(line) > 30:
                            # Skip UI elements
                            skip_phrases = ['subscribe', 'login', 'sign in', 'customer service',
                                          'click here', 'read more', 'want to continue',
                                          'grapevine subscription', 'carry the message',
                                          'submit your story', 'follow grapevine']
                            if not any(p in line.lower() for p in skip_phrases):
                                lines.append(line)
                    if lines:
                        content = '\n\n'.join(lines)
                        if len(content) > 200:
                            break
            except:
                continue

        # Get title
        title = ""
        try:
            title_el = page.query_selector('h1')
            if title_el:
                title = title_el.inner_text().strip()
        except:
            pass

        # Get date/byline
        date = ""
        try:
            date_el = page.query_selector('.date, .byline, time')
            if date_el:
                date = date_el.inner_text().strip()
        except:
            pass

        return {
            "title": title,
            "content": content,
            "date": date,
            "word_count": len(content.split()) if content else 0
        }

    except Exception as e:
        print(f"  Extract error: {e}")
        return {"title": "", "content": "", "date": "", "word_count": 0}


def main():
    print("=" * 60)
    print("AA Grapevine Playwright Fetcher")
    print("=" * 60)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    articles = []

    with sync_playwright() as p:
        # Launch browser
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Login
        print("\nLogging in to AA Grapevine...")
        page.goto("https://www.aagrapevine.org/user/login", wait_until='networkidle')
        time.sleep(2)

        # Fill login form
        try:
            page.fill('input[name="name"]', EMAIL)
            page.fill('input[name="pass"]', PASSWORD)
            page.click('input[type="submit"], button[type="submit"]')
            page.wait_for_load_state('networkidle')
            time.sleep(3)

            # Check if logged in
            if 'logout' in page.content().lower() or 'my account' in page.content().lower():
                print("Login successful!")
            else:
                print("Login may have failed, continuing anyway...")

        except Exception as e:
            print(f"Login error: {e}")

        # Fetch articles
        print(f"\nFetching {len(ARTICLES_TO_FETCH)} articles...")
        print("-" * 40)

        for i, article_info in enumerate(ARTICLES_TO_FETCH):
            print(f"[{i+1}/{len(ARTICLES_TO_FETCH)}] {article_info['title']}...")

            try:
                page.goto(article_info['url'], wait_until='networkidle', timeout=30000)
                result = extract_article_content(page)

                if result['word_count'] > 100:
                    article_id = re.sub(r'[^a-z0-9]+', '_', article_info['title'].lower())[:50]

                    articles.append({
                        "id": f"gv_{article_id}",
                        "title": result['title'] or article_info['title'],
                        "content": result['content'],
                        "source": "AA Grapevine Magazine",
                        "date": result['date'] or article_info.get('date', ''),
                        "url": article_info['url'],
                        "content_type": article_info['type'],
                        "keywords": extract_keywords(result['content'], article_info['type']),
                        "word_count": result['word_count']
                    })
                    print(f"  Got {result['word_count']} words")
                else:
                    print(f"  Warning: Only {result['word_count']} words (may be paywalled)")

            except Exception as e:
                print(f"  Error: {e}")

            time.sleep(2)  # Rate limiting

        browser.close()

    # Save results
    if articles:
        json_path = OUTPUT_DIR / "grapevine_full_articles.json"
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(articles, f, indent=2, ensure_ascii=False)
        print(f"\nSaved JSON: {json_path}")

        # Generate Python module
        python_path = Path("/home/enki/projects/digital-sponsor-investor-demo/containers/literature-service/grapevine_subscription_content.py")
        with open(python_path, 'w', encoding='utf-8') as f:
            f.write('"""\n')
            f.write('AA Grapevine Subscription Articles\n')
            f.write('Classic Step and Tradition articles from the Grapevine archive\n')
            f.write('"""\n\n')
            f.write('GRAPEVINE_SUBSCRIPTION_ARTICLES = [\n')

            for article in articles:
                content = article['content'].replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')
                title = article['title'].replace('"', '\\"')

                f.write('    {\n')
                f.write(f'        "id": "{article["id"]}",\n')
                f.write(f'        "title": "{title}",\n')
                f.write(f'        "content": "{content}",\n')
                f.write(f'        "source": "{article["source"]}",\n')
                f.write(f'        "date": "{article["date"]}",\n')
                f.write(f'        "content_type": "{article["content_type"]}",\n')
                f.write(f'        "keywords": {article["keywords"]},\n')
                f.write('    },\n')

            f.write(']\n')
        print(f"Generated: {python_path}")

    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Articles with full content: {len(articles)}")
    if articles:
        print(f"Total words: {sum(a['word_count'] for a in articles):,}")


def extract_keywords(text: str, article_type: str) -> list:
    """Extract relevant keywords"""
    aa_terms = [
        "step", "steps", "tradition", "traditions", "sponsor", "higher power",
        "god", "prayer", "meditation", "inventory", "amends", "defects",
        "character", "sobriety", "recovery", "alcoholic", "alcoholism",
        "powerless", "spiritual", "experience", "fellowship", "unity",
        "service", "anonymity", "humility", "honesty", "willingness"
    ]

    found = [article_type]
    text_lower = text.lower()
    for term in aa_terms:
        if term in text_lower and term not in found:
            found.append(term)
    return found[:10]


if __name__ == "__main__":
    main()
