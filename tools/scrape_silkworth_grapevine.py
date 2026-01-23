#!/usr/bin/env python3
"""
Scrape free AA Grapevine articles from Silkworth.net
These are public domain / freely shared historical AA articles
"""

import json
import re
import os
import time
import urllib.request
import urllib.error
from pathlib import Path
from html.parser import HTMLParser

OUTPUT_DIR = Path("/home/enki/projects/digital-sponsor-investor-demo/data-preserve/grapevine")

# All Bill W. Grapevine articles from Silkworth.net
BILL_W_ARTICLES = [
    {"url": "https://silkworth.net/alcoholics-anonymous/tradition-ten/", "title": "Tradition Ten", "date": "September 1948"},
    {"url": "https://silkworth.net/alcoholics-anonymous/a-fragment-of-history/", "title": "A Fragment Of History", "date": "July 1953"},
    {"url": "https://silkworth.net/alcoholics-anonymous/the-next-frontier-emotional-sobriety/", "title": "The Next Frontier: Emotional Sobriety", "date": "January 1958"},
    {"url": "https://silkworth.net/alcoholics-anonymous/leadership-in-aa-ever-a-vital-need/", "title": "Leadership In AA: Ever A Vital Need", "date": "April 1959"},
    {"url": "https://silkworth.net/alcoholics-anonymous/bill-w-s-letter-to-dr-carl-gustav-jung/", "title": "Bill W.'s Letter To Dr. Carl Gustav Jung", "date": "January 1961"},
    {"url": "https://silkworth.net/alcoholics-anonymous/spiritual-experiences/", "title": "Spiritual Experiences", "date": "July 1962"},
    {"url": "https://silkworth.net/alcoholics-anonymous/in-remembrance-of-ebby/", "title": "In Remembrance of Ebby", "date": "June 1966"},
    {"url": "https://silkworth.net/alcoholics-anonymous/bill-w-s-comments-on-philip-wylies-article/", "title": "Bill W.'s Comments On Philip Wylie's Article", "date": "September 1944"},
    {"url": "https://silkworth.net/alcoholics-anonymous/philip-wylie-jabs-a-little-needle-into-complacency/", "title": "Philip Wylie Jabs A Little Needle Into Complacency", "date": "September 1944"},
    {"url": "https://silkworth.net/alcoholics-anonymous/bill-w-on-marty-m/", "title": "Bill W. On Marty M.", "date": "October 1944"},
    {"url": "https://silkworth.net/alcoholics-anonymous/modesty-one-plank-for-good-public-relations/", "title": "Modesty One Plank For Good Public Relations", "date": "August 1945"},
    {"url": "https://silkworth.net/alcoholics-anonymous/those-goof-balls/", "title": "Those 'Goof Balls'", "date": "November 1945"},
    {"url": "https://silkworth.net/alcoholics-anonymous/a-tradition-born-of-our-anonymity/", "title": "A Tradition Born Of Our Anonymity", "date": "January 1946"},
    {"url": "https://silkworth.net/alcoholics-anonymous/safe-use-of-money/", "title": "Safe Use of Money", "date": "May 1946"},
    {"url": "https://silkworth.net/alcoholics-anonymous/who-is-a-member-of-alcoholics-anonymous/", "title": "Who Is a Member of Alcoholics Anonymous?", "date": "August 1946"},
    {"url": "https://silkworth.net/alcoholics-anonymous/will-aa-ever-have-a-personal-government/", "title": "Will AA Ever Have A Personal Government?", "date": "January 1947"},
    {"url": "https://silkworth.net/alcoholics-anonymous/dangers-in-linking-aa-to-other-projects/", "title": "Dangers In Linking AA To Other Projects", "date": "March 1947"},
    {"url": "https://silkworth.net/alcoholics-anonymous/clubs-in-aa-are-they-with-us-to-stay/", "title": "Clubs in AA Are They With Us to Stay?", "date": "April 1947"},
    {"url": "https://silkworth.net/alcoholics-anonymous/adequate-hospitalization-one-great-need/", "title": "Adequate Hospitalization: One Great Need", "date": "May 1947"},
    {"url": "https://silkworth.net/alcoholics-anonymous/anne-s/", "title": "Anne S.", "date": "July 1949"},
    {"url": "https://silkworth.net/alcoholics-anonymous/why-alcoholics-anonymous-is-anonymous/", "title": "Why Alcoholics Anonymous is Anonymous", "date": "January 1955"},
    {"url": "https://silkworth.net/alcoholics-anonymous/a-fragment-of-history-and-a-tribute/", "title": "A Fragment Of History And A Tribute", "date": "May 1957"},
    {"url": "https://silkworth.net/alcoholics-anonymous/the-psychiatrists/", "title": "The Psychiatrists", "date": "July 1957"},
    {"url": "https://silkworth.net/alcoholics-anonymous/the-physicians/", "title": "The Physicians", "date": "August 1957"},
    {"url": "https://silkworth.net/alcoholics-anonymous/the-clergy/", "title": "The Clergy", "date": "September 1957"},
    {"url": "https://silkworth.net/alcoholics-anonymous/press-radio-television/", "title": "Press, Radio, Television", "date": "October 1957"},
    {"url": "https://silkworth.net/alcoholics-anonymous/a-letter-from-bill-w-on-depression/", "title": "A Letter From Bill W. On Depression", "date": "Unknown"},
    {"url": "https://silkworth.net/alcoholics-anonymous/problems-other-than-alcohol-what-can-be-done-about-them/", "title": "Problems Other Than Alcohol", "date": "February 1958"},
    {"url": "https://silkworth.net/alcoholics-anonymous/freedom-under-god-the-choice-is-ours/", "title": "Freedom Under God: The Choice is Ours", "date": "November 1960"},
    {"url": "https://silkworth.net/alcoholics-anonymous/the-shape-of-things-to-come/", "title": "The Shape Of Things To Come", "date": "February 1961"},
    {"url": "https://silkworth.net/alcoholics-anonymous/the-dilemma-of-no-faith-2/", "title": "The Dilemma Of No Faith", "date": "April 1961"},
    {"url": "https://silkworth.net/alcoholics-anonymous/this-matter-of-fear/", "title": "This Matter Of Fear", "date": "January 1962"},
    {"url": "https://silkworth.net/alcoholics-anonymous/the-legacy-of-recovery/", "title": "The Legacy of Recovery", "date": "March 1971"},
]

# 12 Traditions articles by Bill W.
TRADITIONS_ARTICLES = [
    {"url": "https://silkworth.net/alcoholics-anonymous/twelve-suggested-points-of-aa-tradition/", "title": "Twelve Suggested Points of AA Tradition", "date": "April 1946"},
    {"url": "https://silkworth.net/alcoholics-anonymous/traditions-stressed-in-memphis-talk/", "title": "Traditions Stressed in Memphis Talk", "date": "October 1947"},
    {"url": "https://silkworth.net/alcoholics-anonymous/tradition-one/", "title": "Tradition One", "date": "December 1947"},
    {"url": "https://silkworth.net/alcoholics-anonymous/tradition-two/", "title": "Tradition Two", "date": "January 1948"},
    {"url": "https://silkworth.net/alcoholics-anonymous/tradition-three/", "title": "Tradition Three", "date": "February 1948"},
    {"url": "https://silkworth.net/alcoholics-anonymous/tradition-four/", "title": "Tradition Four", "date": "March 1948"},
    {"url": "https://silkworth.net/alcoholics-anonymous/tradition-five/", "title": "Tradition Five", "date": "April 1948"},
    {"url": "https://silkworth.net/alcoholics-anonymous/tradition-six/", "title": "Tradition Six", "date": "May 1948"},
    {"url": "https://silkworth.net/alcoholics-anonymous/tradition-seven/", "title": "Tradition Seven", "date": "June 1948"},
    {"url": "https://silkworth.net/alcoholics-anonymous/tradition-eight/", "title": "Tradition Eight", "date": "July 1948"},
    {"url": "https://silkworth.net/alcoholics-anonymous/tradition-nine/", "title": "Tradition Nine", "date": "August 1948"},
    {"url": "https://silkworth.net/alcoholics-anonymous/tradition-eleven/", "title": "Tradition Eleven", "date": "October 1948"},
    {"url": "https://silkworth.net/alcoholics-anonymous/tradition-twelve/", "title": "Tradition Twelve", "date": "November 1948"},
    {"url": "https://silkworth.net/alcoholics-anonymous/tradition-five-our-primary-purpose/", "title": "Tradition Five – Our Primary Purpose", "date": "June 1970"},
]


class ArticleParser(HTMLParser):
    """Simple HTML parser to extract article content"""
    def __init__(self):
        super().__init__()
        self.in_content = False
        self.in_paragraph = False
        self.content_parts = []
        self.current_text = ""
        self.depth = 0

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        # Look for main content area
        if tag == 'div' and 'entry-content' in attrs_dict.get('class', ''):
            self.in_content = True
            self.depth = 0
        if self.in_content:
            if tag == 'div':
                self.depth += 1
            if tag in ['p', 'blockquote', 'h1', 'h2', 'h3', 'h4']:
                self.in_paragraph = True
                self.current_text = ""

    def handle_endtag(self, tag):
        if self.in_content:
            if tag == 'div':
                self.depth -= 1
                if self.depth < 0:
                    self.in_content = False
            if tag in ['p', 'blockquote', 'h1', 'h2', 'h3', 'h4'] and self.in_paragraph:
                self.in_paragraph = False
                text = self.current_text.strip()
                if text and len(text) > 10:
                    self.content_parts.append(text)

    def handle_data(self, data):
        if self.in_paragraph:
            self.current_text += data

    def get_content(self):
        return "\n\n".join(self.content_parts)


def fetch_article(url: str) -> str:
    """Fetch article HTML from URL"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return response.read().decode('utf-8', errors='ignore')
    except urllib.error.URLError as e:
        print(f"  Error fetching {url}: {e}")
        return ""


def extract_article_content(html: str) -> str:
    """Extract article text from HTML"""
    parser = ArticleParser()
    try:
        parser.feed(html)
        return parser.get_content()
    except Exception as e:
        print(f"  Parse error: {e}")
        return ""


def clean_text(text: str) -> str:
    """Clean up extracted text"""
    # Remove excessive whitespace
    text = re.sub(r'\s+', ' ', text)
    # Fix common issues
    text = text.replace('\\n', '\n')
    text = text.replace('  ', ' ')
    return text.strip()


def extract_keywords(text: str, title: str) -> list:
    """Extract relevant keywords"""
    aa_terms = [
        "step", "steps", "tradition", "traditions", "sponsor", "higher power",
        "god", "prayer", "meditation", "inventory", "amends", "defects",
        "character", "sobriety", "recovery", "alcoholic", "alcoholism",
        "powerless", "spiritual", "experience", "fellowship", "unity",
        "service", "anonymity", "humility", "honesty", "willingness",
        "fear", "resentment", "acceptance", "serenity", "bill w", "dr bob"
    ]

    combined = (text + " " + title).lower()
    found = []
    for term in aa_terms:
        if term in combined:
            found.append(term)
    return found[:10]


def scrape_articles(articles: list, category: str) -> list:
    """Scrape a list of articles"""
    results = []

    for i, article in enumerate(articles):
        print(f"  [{i+1}/{len(articles)}] {article['title'][:50]}...")

        html = fetch_article(article['url'])
        if not html:
            continue

        content = extract_article_content(html)
        if not content or len(content) < 100:
            print(f"    Warning: Short/empty content ({len(content)} chars)")
            continue

        content = clean_text(content)

        # Create article record
        article_id = re.sub(r'[^a-z0-9]+', '_', article['title'].lower())[:50]

        results.append({
            "id": f"grapevine_{category}_{article_id}",
            "title": article['title'],
            "content": content,
            "source": "AA Grapevine (via Silkworth.net)",
            "date": article.get('date', 'Unknown'),
            "author": "Bill W." if category in ['bill_w', 'traditions'] else "AA Member",
            "category": category,
            "url": article['url'],
            "keywords": extract_keywords(content, article['title']),
            "word_count": len(content.split())
        })

        # Be polite to the server
        time.sleep(0.5)

    return results


def generate_python_dict(articles: list, output_path: Path):
    """Generate Python dictionary file"""
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('"""\n')
        f.write('AA Grapevine Articles from Silkworth.net\n')
        f.write('Historical articles freely shared for AA education\n')
        f.write('"""\n\n')
        f.write('GRAPEVINE_ARTICLES = [\n')

        for article in articles:
            content = article['content'].replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')
            title = article['title'].replace('"', '\\"')

            f.write('    {\n')
            f.write(f'        "id": "{article["id"]}",\n')
            f.write(f'        "title": "{title}",\n')
            f.write(f'        "content": "{content}",\n')
            f.write(f'        "source": "{article["source"]}",\n')
            f.write(f'        "date": "{article["date"]}",\n')
            f.write(f'        "author": "{article["author"]}",\n')
            f.write(f'        "keywords": {article["keywords"]},\n')
            f.write('    },\n')

        f.write(']\n')

    print(f"Generated: {output_path}")


def main():
    print("=" * 60)
    print("Silkworth.net Grapevine Article Scraper")
    print("=" * 60)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    all_articles = []

    # Scrape Bill W. articles
    print("\nScraping Bill W. Grapevine Articles...")
    print("-" * 40)
    bill_w = scrape_articles(BILL_W_ARTICLES, "bill_w")
    all_articles.extend(bill_w)
    print(f"  Got {len(bill_w)} articles")

    # Scrape Traditions articles
    print("\nScraping 12 Traditions Articles...")
    print("-" * 40)
    traditions = scrape_articles(TRADITIONS_ARTICLES, "traditions")
    all_articles.extend(traditions)
    print(f"  Got {len(traditions)} articles")

    # Save JSON
    json_path = OUTPUT_DIR / "grapevine_articles.json"
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(all_articles, f, indent=2, ensure_ascii=False)
    print(f"\nSaved JSON: {json_path}")

    # Generate Python dict
    python_path = Path("/home/enki/projects/digital-sponsor-investor-demo/containers/literature-service/grapevine_content.py")
    generate_python_dict(all_articles, python_path)

    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Total articles: {len(all_articles)}")
    print(f"Total words: {sum(a['word_count'] for a in all_articles):,}")
    print(f"Bill W. articles: {len(bill_w)}")
    print(f"Traditions articles: {len(traditions)}")


if __name__ == "__main__":
    main()
