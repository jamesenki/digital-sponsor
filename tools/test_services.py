#!/usr/bin/env python3
"""
Test suite for Digital Sponsor Chat and Literature Search services.
Validates quality of responses from both services.
"""

import json
import urllib.request
import urllib.error
from datetime import datetime

# Service endpoints
LITERATURE_URL = "https://ca-literature-prod.nicesmoke-da12f415.centralus.azurecontainerapps.io"
CHAT_URL = "https://ca-chat-prod.nicesmoke-da12f415.centralus.azurecontainerapps.io"

# Test cases for Literature Search
LITERATURE_TESTS = [
    {
        "name": "Step 1 - Powerlessness",
        "query": "powerless over alcohol unmanageable",
        "expect_sources": ["Big Book", "Joe"],
        "expect_keywords": ["powerless", "step"],
    },
    {
        "name": "Step 4 - Moral Inventory",
        "query": "fourth step moral inventory resentments fears",
        "expect_sources": ["Big Book", "Joe"],
        "expect_keywords": ["inventory", "resentment", "fear"],
    },
    {
        "name": "Step 9 - Making Amends",
        "query": "making amends direct amends except when to do so would injure",
        "expect_sources": ["Big Book"],
        "expect_keywords": ["amends"],
    },
    {
        "name": "How It Works - Chapter 5",
        "query": "Rarely have we seen a person fail thoroughly followed",
        "expect_sources": ["Joe", "Big Book"],
        "expect_keywords": ["step", "recovery"],
    },
    {
        "name": "Tradition 3 - Membership",
        "query": "only requirement for membership desire to stop drinking",
        "expect_sources": ["Grapevine", "Tradition"],
        "expect_keywords": ["tradition", "membership"],
    },
    {
        "name": "Bill W. on Emotional Sobriety",
        "query": "emotional sobriety next frontier Bill W depression",
        "expect_sources": ["Grapevine"],
        "expect_keywords": ["emotional", "sobriety"],
    },
    {
        "name": "Joe & Charlie - Big Book Study",
        "query": "Joe Charlie Big Book study spiritual experience",
        "expect_sources": ["Joe and Charlie"],
        "expect_keywords": ["spiritual", "big book"],
    },
    {
        "name": "Serenity Prayer / Acceptance",
        "query": "serenity prayer acceptance courage wisdom",
        "expect_sources": [],
        "expect_keywords": ["serenity", "acceptance"],
    },
    {
        "name": "Sponsorship",
        "query": "sponsor sponsee working steps together guidance",
        "expect_sources": [],
        "expect_keywords": ["sponsor", "step"],
    },
    {
        "name": "Crisis - Relapse Prevention",
        "query": "struggling urges to drink relapse help",
        "expect_sources": [],
        "expect_keywords": ["recovery", "help"],
        "is_crisis": True,
    },
]

# Test cases for Chat service
CHAT_TESTS = [
    {
        "name": "Basic Greeting",
        "message": "Hello, I'm new to AA and feeling overwhelmed.",
        "expect_themes": ["welcome", "support", "meeting", "sponsor"],
    },
    {
        "name": "Step 1 Question",
        "message": "Can you explain what Step 1 means? I'm having trouble admitting I'm powerless.",
        "expect_themes": ["powerless", "unmanageable", "admission", "first step"],
    },
    {
        "name": "Step 4 Guidance",
        "message": "I'm working on my fourth step inventory. What should I include in my resentment list?",
        "expect_themes": ["resentment", "inventory", "column", "fear"],
    },
    {
        "name": "Emotional Support",
        "message": "I'm feeling really down today. 6 months sober but struggling with depression.",
        "expect_themes": ["feeling", "support", "meeting", "sponsor", "not alone"],
    },
    {
        "name": "Literature Question",
        "message": "What does the Big Book say about prayer and meditation?",
        "expect_themes": ["step 11", "prayer", "meditation", "conscious contact"],
    },
    {
        "name": "Amends Question",
        "message": "I need to make amends to my ex-wife but she won't talk to me. What should I do?",
        "expect_themes": ["amends", "willing", "harm", "sponsor"],
    },
]


def test_literature_search(test_case: dict) -> dict:
    """Run a literature search test"""
    result = {
        "name": test_case["name"],
        "query": test_case["query"],
        "passed": False,
        "issues": [],
        "response": None,
    }

    try:
        url = f"{LITERATURE_URL}/api/search"
        data = json.dumps({
            "query": test_case["query"],
            "maxResults": 5
        }).encode('utf-8')

        req = urllib.request.Request(url, data=data, headers={
            'Content-Type': 'application/json'
        })

        with urllib.request.urlopen(req, timeout=30) as response:
            resp_data = json.loads(response.read().decode('utf-8'))

        result["response"] = resp_data

        # Check if we got results
        if not resp_data.get("success"):
            result["issues"].append("Search returned success=false")
            return result

        results = resp_data.get("results", [])
        if len(results) == 0:
            result["issues"].append("No results returned")
            return result

        # Check for expected sources in results
        sources_found = []
        for r in results:
            source = r.get("source", "") or r.get("title", "")
            sources_found.append(source)

        for expected in test_case.get("expect_sources", []):
            if not any(expected.lower() in s.lower() for s in sources_found):
                result["issues"].append(f"Expected source '{expected}' not found")

        # Check for expected keywords in content
        all_content = " ".join([
            r.get("content", "") + " " + r.get("title", "") + " " + " ".join(r.get("keywords", []))
            for r in results
        ]).lower()

        for keyword in test_case.get("expect_keywords", []):
            if keyword.lower() not in all_content:
                result["issues"].append(f"Expected keyword '{keyword}' not in results")

        # Check crisis detection if applicable
        if test_case.get("is_crisis"):
            if not resp_data.get("isCrisisQuery"):
                result["issues"].append("Crisis query not detected")

        # Pass if no issues
        if len(result["issues"]) == 0:
            result["passed"] = True

    except Exception as e:
        result["issues"].append(f"Error: {str(e)}")

    return result


def test_chat(test_case: dict) -> dict:
    """Run a chat test with retry logic"""
    import time

    result = {
        "name": test_case["name"],
        "message": test_case["message"],
        "passed": False,
        "issues": [],
        "response": None,
    }

    max_retries = 2
    for attempt in range(max_retries + 1):
        if attempt > 0:
            print(f"   Retry {attempt}...")
            time.sleep(3)  # Wait before retry
            result["issues"] = []  # Clear issues for retry

        try:
            url = f"{CHAT_URL}/api/chat"
            data = json.dumps({
                "message": test_case["message"],
                "userId": "test_user",
                "conversationId": f"test_{datetime.now().timestamp()}"
            }).encode('utf-8')

            req = urllib.request.Request(url, data=data, headers={
                'Content-Type': 'application/json'
            })

            with urllib.request.urlopen(req, timeout=60) as response:
                resp_data = json.loads(response.read().decode('utf-8'))

            result["response"] = resp_data

            # Check if we got a response
            reply = resp_data.get("reply", "") or resp_data.get("message", "") or resp_data.get("response", "")
            if not reply:
                result["issues"].append("No reply in response")
                continue  # Retry

            # Check if it's an error message (retry if so)
            if "trouble connecting" in reply.lower() or "try again" in reply.lower():
                result["issues"].append("Service returned connection error")
                continue  # Retry

            # Check response length (should be substantive)
            if len(reply) < 50:
                result["issues"].append(f"Response too short ({len(reply)} chars)")

            # Check for expected themes
            reply_lower = reply.lower()
            themes_found = 0
            for theme in test_case.get("expect_themes", []):
                if theme.lower() in reply_lower:
                    themes_found += 1

            if themes_found == 0 and len(test_case.get("expect_themes", [])) > 0:
                result["issues"].append(f"None of expected themes found: {test_case['expect_themes']}")
            elif themes_found < len(test_case.get("expect_themes", [])) / 2:
                result["issues"].append(f"Only {themes_found}/{len(test_case['expect_themes'])} themes found")

            # Pass if no major issues
            if len(result["issues"]) == 0:
                result["passed"] = True
                break  # Success, no need to retry

        except urllib.error.HTTPError as e:
            result["issues"].append(f"HTTP Error {e.code}: {e.reason}")
        except Exception as e:
            result["issues"].append(f"Error: {str(e)}")

    return result


def print_result(result: dict, verbose: bool = True):
    """Print a test result"""
    status = "✅ PASS" if result["passed"] else "❌ FAIL"
    print(f"\n{status} - {result['name']}")

    if not result["passed"]:
        for issue in result["issues"]:
            print(f"   ⚠️  {issue}")

    if verbose and result["response"]:
        if "results" in result["response"]:
            # Literature result
            results = result["response"]["results"][:3]
            print(f"   📚 Top {len(results)} results:")
            for r in results:
                title = r.get("title", "Unknown")[:50]
                source = r.get("source", "")[:30] if r.get("source") else ""
                print(f"      - {title} ({source})")
        elif "reply" in result["response"] or "message" in result["response"] or "response" in result["response"]:
            # Chat result
            reply = result["response"].get("reply") or result["response"].get("message") or result["response"].get("response", "")
            preview = reply[:200] + "..." if len(reply) > 200 else reply
            print(f"   💬 Response preview: {preview}")


def main():
    print("=" * 70)
    print("DIGITAL SPONSOR SERVICE TESTS")
    print("=" * 70)
    print(f"Time: {datetime.now().isoformat()}")

    # Test Literature Search
    print("\n" + "=" * 70)
    print("LITERATURE SEARCH TESTS")
    print("=" * 70)

    lit_results = []
    for test in LITERATURE_TESTS:
        print(f"\nTesting: {test['name']}...")
        result = test_literature_search(test)
        lit_results.append(result)
        print_result(result)

    # Test Chat
    print("\n" + "=" * 70)
    print("CHAT SERVICE TESTS")
    print("=" * 70)

    import time
    chat_results = []
    for i, test in enumerate(CHAT_TESTS):
        if i > 0:
            time.sleep(2)  # Rate limit protection
        print(f"\nTesting: {test['name']}...")
        result = test_chat(test)
        chat_results.append(result)
        print_result(result)

    # Summary
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)

    lit_passed = sum(1 for r in lit_results if r["passed"])
    chat_passed = sum(1 for r in chat_results if r["passed"])

    print(f"\nLiterature Search: {lit_passed}/{len(lit_results)} passed")
    print(f"Chat Service: {chat_passed}/{len(chat_results)} passed")
    print(f"Total: {lit_passed + chat_passed}/{len(lit_results) + len(chat_results)} passed")

    if lit_passed == len(lit_results) and chat_passed == len(chat_results):
        print("\n🎉 All tests passed!")
    else:
        print("\n⚠️  Some tests failed - review above for details")


if __name__ == "__main__":
    main()
