#!/usr/bin/env python3
"""
Fetch AA Grapevine articles using subscription access.
Focuses on Step and Tradition articles which are most valuable for the knowledge base.
"""

import json
import re
import os
import time
import urllib.request
import urllib.parse
import http.cookiejar
from pathlib import Path
from html.parser import HTMLParser

OUTPUT_DIR = Path("/home/enki/projects/digital-sponsor-investor-demo/data-preserve/grapevine-subscription")

# High-value article URLs to fetch (Steps, Traditions, classic articles)
# These are publicly listed URLs that require subscription to read full content
STEP_TRADITION_ARTICLES = [
    # 1952 Tradition Series by Bill W.
    {"url": "https://www.aagrapevine.org/magazine/1952/apr/tradition-one", "title": "Tradition One", "date": "April 1952", "type": "tradition"},
    {"url": "https://www.aagrapevine.org/magazine/1952/may/tradition-two", "title": "Tradition Two", "date": "May 1952", "type": "tradition"},
    {"url": "https://www.aagrapevine.org/magazine/1952/jun/tradition-three", "title": "Tradition Three", "date": "June 1952", "type": "tradition"},
    {"url": "https://www.aagrapevine.org/magazine/1952/jul/tradition-four", "title": "Tradition Four", "date": "July 1952", "type": "tradition"},
    {"url": "https://www.aagrapevine.org/magazine/1952/aug/tradition-five", "title": "Tradition Five", "date": "August 1952", "type": "tradition"},
    {"url": "https://www.aagrapevine.org/magazine/1952/sep/tradition-six", "title": "Tradition Six", "date": "September 1952", "type": "tradition"},
    {"url": "https://www.aagrapevine.org/magazine/1952/oct/tradition-seven", "title": "Tradition Seven", "date": "October 1952", "type": "tradition"},
    {"url": "https://www.aagrapevine.org/magazine/1952/dec/tradition-eight", "title": "Tradition Eight", "date": "December 1952", "type": "tradition"},
    {"url": "https://www.aagrapevine.org/magazine/1953/jan/tradition-nine", "title": "Tradition Nine", "date": "January 1953", "type": "tradition"},
    {"url": "https://www.aagrapevine.org/magazine/1953/feb/tradition-ten", "title": "Tradition Ten", "date": "February 1953", "type": "tradition"},
    {"url": "https://www.aagrapevine.org/magazine/1953/mar/tradition-eleven", "title": "Tradition Eleven", "date": "March 1953", "type": "tradition"},
    {"url": "https://www.aagrapevine.org/magazine/1953/apr/tradition-twelve", "title": "Tradition Twelve", "date": "April 1953", "type": "tradition"},

    # 12 Steps Revisited Series (1962-1963)
    {"url": "https://www.aagrapevine.org/magazine/1962/jan/twelve-steps-revisited-step-1", "title": "Twelve Steps Revisited - Step 1", "date": "January 1962", "type": "step"},
    {"url": "https://www.aagrapevine.org/magazine/1962/feb/twelve-steps-revisitedstep-6", "title": "Twelve Steps Revisited - Step 6", "date": "February 1962", "type": "step"},
    {"url": "https://www.aagrapevine.org/magazine/1962/jul/twelve-steps-revisited-step-7", "title": "Twelve Steps Revisited - Step 7", "date": "July 1962", "type": "step"},
    {"url": "https://www.aagrapevine.org/magazine/1962/oct/twelve-steps-revisited-step-10", "title": "Twelve Steps Revisited - Step 10", "date": "October 1962", "type": "step"},
    {"url": "https://www.aagrapevine.org/magazine/1963/oct/twelve-steps-revisitedstep-12", "title": "Twelve Steps Revisited - Step 12", "date": "October 1963", "type": "step"},

    # Classic Step articles
    {"url": "https://www.aagrapevine.org/magazine/1971/jan/8th-step", "title": "8th Step", "date": "January 1971", "type": "step"},
    {"url": "https://www.aagrapevine.org/magazine/2020/nov/taking-first-step", "title": "Taking That First Step", "date": "November 2020", "type": "step"},

    # Tradition Three (1992 - different perspective)
    {"url": "https://www.aagrapevine.org/magazine/1992/mar/tradition-three", "title": "Tradition Three (1992)", "date": "March 1992", "type": "tradition"},
]


class GrapevineArticleParser(HTMLParser):
    """Parse article content from Grapevine HTML"""
    def __init__(self):
        super().__init__()
        self.in_article = False
        self.in_content = False
        self.content_parts = []
        self.current_text = ""
        self.depth = 0

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        class_name = attrs_dict.get('class', '')

        # Look for article content area
        if tag == 'article' or (tag == 'div' and 'article' in class_name):
            self.in_article = True
            self.depth = 0
        if tag == 'div' and ('content' in class_name or 'body' in class_name or 'text' in class_name):
            self.in_content = True
            self.depth = 0

        if self.in_article or self.in_content:
            if tag == 'div':
                self.depth += 1
            if tag in ['p', 'blockquote', 'h1', 'h2', 'h3']:
                self.current_text = ""

    def handle_endtag(self, tag):
        if self.in_article or self.in_content:
            if tag == 'div':
                self.depth -= 1
                if self.depth < 0:
                    self.in_article = False
                    self.in_content = False
            if tag in ['p', 'blockquote', 'h1', 'h2', 'h3']:
                text = self.current_text.strip()
                if text and len(text) > 20:
                    # Skip navigation/UI text
                    if not any(skip in text.lower() for skip in ['subscribe', 'login', 'sign in', 'click here', 'read more']):
                        self.content_parts.append(text)

    def handle_data(self, data):
        if self.in_article or self.in_content:
            self.current_text += data

    def get_content(self):
        return "\n\n".join(self.content_parts)


class GrapevineClient:
    """Client for accessing AA Grapevine with subscription"""

    def __init__(self, email: str, password: str):
        self.email = email
        self.password = password
        self.cookie_jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(self.cookie_jar)
        )
        self.opener.addheaders = [
            ('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
            ('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'),
        ]
        self.logged_in = False

    def login(self) -> bool:
        """Attempt to log in to AA Grapevine"""
        print("Attempting login...")

        # First, get the login page to get any CSRF tokens
        try:
            login_page_url = "https://www.aagrapevine.org/user/login"
            response = self.opener.open(login_page_url, timeout=30)
            html = response.read().decode('utf-8', errors='ignore')

            # Look for form action and any hidden fields
            # Drupal sites typically have form_build_id and form_id
            form_build_id = ""
            form_id = ""

            build_match = re.search(r'name="form_build_id"\s+value="([^"]+)"', html)
            if build_match:
                form_build_id = build_match.group(1)

            id_match = re.search(r'name="form_id"\s+value="([^"]+)"', html)
            if id_match:
                form_id = id_match.group(1)

            # Prepare login data
            login_data = {
                'name': self.email,
                'pass': self.password,
                'form_build_id': form_build_id,
                'form_id': form_id if form_id else 'user_login_form',
                'op': 'Log in'
            }

            encoded_data = urllib.parse.urlencode(login_data).encode('utf-8')

            # Submit login
            login_response = self.opener.open(login_page_url, data=encoded_data, timeout=30)
            result_html = login_response.read().decode('utf-8', errors='ignore')

            # Check if login successful (look for logout link or user menu)
            if 'logout' in result_html.lower() or 'my account' in result_html.lower():
                print("Login successful!")
                self.logged_in = True
                return True
            else:
                print("Login may have failed - checking cookie state...")
                # Check cookies
                for cookie in self.cookie_jar:
                    if 'SESS' in cookie.name or 'logged' in cookie.name.lower():
                        print(f"  Found session cookie: {cookie.name}")
                        self.logged_in = True
                        return True

                print("Login appears to have failed")
                return False

        except Exception as e:
            print(f"Login error: {e}")
            return False

    def fetch_article(self, url: str) -> str:
        """Fetch article HTML"""
        try:
            response = self.opener.open(url, timeout=30)
            return response.read().decode('utf-8', errors='ignore')
        except Exception as e:
            print(f"  Error fetching {url}: {e}")
            return ""

    def extract_article_content(self, html: str) -> str:
        """Extract article text from HTML"""
        parser = GrapevineArticleParser()
        try:
            parser.feed(html)
            content = parser.get_content()

            # If parser didn't get much, try regex fallback
            if len(content) < 200:
                # Look for article text between common markers
                patterns = [
                    r'<article[^>]*>(.*?)</article>',
                    r'class="[^"]*content[^"]*"[^>]*>(.*?)</div>',
                    r'class="[^"]*article-body[^"]*"[^>]*>(.*?)</div>',
                ]
                for pattern in patterns:
                    match = re.search(pattern, html, re.DOTALL | re.IGNORECASE)
                    if match:
                        raw = match.group(1)
                        # Strip HTML tags
                        text = re.sub(r'<[^>]+>', ' ', raw)
                        text = re.sub(r'\s+', ' ', text).strip()
                        if len(text) > len(content):
                            content = text

            return content
        except Exception as e:
            print(f"  Parse error: {e}")
            return ""


def clean_text(text: str) -> str:
    """Clean up extracted text"""
    text = re.sub(r'\s+', ' ', text)
    text = text.replace('\\n', '\n')
    return text.strip()


def extract_keywords(text: str, article_type: str) -> list:
    """Extract relevant keywords"""
    aa_terms = [
        "step", "steps", "tradition", "traditions", "sponsor", "higher power",
        "god", "prayer", "meditation", "inventory", "amends", "defects",
        "character", "sobriety", "recovery", "alcoholic", "alcoholism",
        "powerless", "spiritual", "experience", "fellowship", "unity",
        "service", "anonymity", "humility", "honesty", "willingness",
        "fear", "resentment", "acceptance", "serenity"
    ]

    combined = text.lower()
    found = [article_type]  # Always include the type
    for term in aa_terms:
        if term in combined and term not in found:
            found.append(term)
    return found[:10]


def main():
    print("=" * 60)
    print("AA Grapevine Subscription Content Fetcher")
    print("=" * 60)

    # Get credentials from environment or use provided
    email = os.environ.get('GRAPEVINE_EMAIL', 'jamessimonster@gmail.com')
    password = os.environ.get('GRAPEVINE_PASSWORD', 'Lifeb4De@th')

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Initialize client and login
    client = GrapevineClient(email, password)
    if not client.login():
        print("\nFailed to log in. Trying to fetch public previews instead...")

    articles = []

    print(f"\nFetching {len(STEP_TRADITION_ARTICLES)} articles...")
    print("-" * 40)

    for i, article_info in enumerate(STEP_TRADITION_ARTICLES):
        print(f"[{i+1}/{len(STEP_TRADITION_ARTICLES)}] {article_info['title']}...")

        html = client.fetch_article(article_info['url'])
        if not html:
            continue

        content = client.extract_article_content(html)
        content = clean_text(content)

        if len(content) < 100:
            print(f"  Warning: Short content ({len(content)} chars) - may need subscription")
            continue

        article_id = re.sub(r'[^a-z0-9]+', '_', article_info['title'].lower())[:50]

        articles.append({
            "id": f"grapevine_sub_{article_id}",
            "title": article_info['title'],
            "content": content,
            "source": "AA Grapevine Magazine",
            "date": article_info['date'],
            "url": article_info['url'],
            "content_type": article_info['type'],
            "keywords": extract_keywords(content, article_info['type']),
            "word_count": len(content.split())
        })

        print(f"  Got {len(content.split())} words")
        time.sleep(1)  # Be respectful

    if articles:
        # Save JSON
        json_path = OUTPUT_DIR / "grapevine_subscription_articles.json"
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(articles, f, indent=2, ensure_ascii=False)
        print(f"\nSaved: {json_path}")

        # Generate Python dict
        python_path = Path("/home/enki/projects/digital-sponsor-investor-demo/containers/literature-service/grapevine_subscription_content.py")
        with open(python_path, 'w', encoding='utf-8') as f:
            f.write('"""\n')
            f.write('AA Grapevine Subscription Content\n')
            f.write('Step and Tradition articles from the Grapevine archive\n')
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
    print(f"Articles fetched: {len(articles)}")
    print(f"Total words: {sum(a['word_count'] for a in articles):,}")


if __name__ == "__main__":
    main()
