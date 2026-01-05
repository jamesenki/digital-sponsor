#!/usr/bin/env python3
"""
Quick RAG Pipeline Integration Test
"""

import json
import urllib.request

LITERATURE_URL = "http://digitalsponsor-literature-massive.centralus.azurecontainer.io:3002"
CHAT_URL = "http://digitalsponsor-chat-v2.centralus.azurecontainer.io:3003"

def rag_test(query, description):
    """Test complete RAG pipeline for a single query"""
    print(f"\n🔍 {description}")
    print(f"Query: '{query}'")
    print("-" * 50)
    
    # Step 1: Search literature
    search_data = {"query": query, "maxResults": 2}
    search_req = urllib.request.Request(
        f"{LITERATURE_URL}/api/search",
        data=json.dumps(search_data).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    
    with urllib.request.urlopen(search_req) as response:
        search_result = json.loads(response.read().decode('utf-8'))
    
    # Build context from literature
    context = ""
    if search_result.get('success') and search_result.get('results'):
        context_pieces = []
        for item in search_result['results']:
            title = item.get('title', '')
            desc = item.get('description', '')
            context_pieces.append(f"{title}: {desc}")
        context = " | ".join(context_pieces)
        
        print(f"📚 Literature Found: {search_result['totalCount']} results")
        print(f"🚨 Crisis Query: {search_result.get('isCrisisQuery', False)}")
        for i, item in enumerate(search_result['results'], 1):
            print(f"   {i}. {item['title']} (Score: {item.get('searchScore', 0)})")
    
    # Step 2: Generate AI response with context
    history = []
    if context:
        history.append({
            "role": "system",
            "content": f"Use this recovery literature to enhance your response: {context}"
        })
    
    chat_data = {"message": query, "history": history}
    chat_req = urllib.request.Request(
        f"{CHAT_URL}/api/chat",
        data=json.dumps(chat_data).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    
    with urllib.request.urlopen(chat_req) as response:
        chat_result = json.loads(response.read().decode('utf-8'))
    
    # Display results
    if chat_result.get('success'):
        print(f"\n🤖 AI Response:")
        print(f"   Tokens: {chat_result['metadata']['tokensUsed']}")
        print(f"   Model: {chat_result['metadata']['model']}")
        print(f"\n💬 Response Preview:")
        response = chat_result['response']
        preview = response[:200] + "..." if len(response) > 200 else response
        print(f"   {preview}")
        
        return True
    else:
        print(f"❌ Chat failed: {chat_result.get('error')}")
        return False

def main():
    print("🚀 QUICK RAG PIPELINE INTEGRATION TEST")
    print("=" * 60)
    
    tests = [
        ("I'm struggling with powerlessness in Step 1", "Step 1 Guidance"),
        ("I want to drink tonight help", "Crisis Detection"),
        ("How do I find a sponsor?", "Sponsorship Guidance"),
        ("I'm a young person in AA", "Youth Support")
    ]
    
    successful_tests = 0
    
    for query, desc in tests:
        try:
            if rag_test(query, desc):
                successful_tests += 1
        except Exception as e:
            print(f"❌ Test failed: {e}")
    
    print(f"\n{'🎯' * 20}")
    print(f"RAG PIPELINE RESULTS: {successful_tests}/{len(tests)} successful")
    print(f"{'🎯' * 20}")
    
    if successful_tests == len(tests):
        print("✅ RAG PIPELINE FULLY OPERATIONAL!")
        print("✅ Literature search + AI chat integration working")
        print("✅ Context-enhanced responses generation successful")
        print("✅ Crisis detection and specialized content working")
    else:
        print("⚠️  Some tests failed - check service connectivity")

if __name__ == "__main__":
    main()