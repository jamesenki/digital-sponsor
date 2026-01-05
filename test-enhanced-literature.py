#!/usr/bin/env python3
"""
Test enhanced literature search capabilities
"""
import json
import urllib.request
import urllib.parse

# Current service endpoint
LITERATURE_URL = "http://digitalsponsor-literature-v2.centralus.azurecontainer.io:3002"
CHAT_URL = "http://digitalsponsor-chat-v2.centralus.azurecontainer.io:3003"

def test_literature_search(query, description):
    """Test literature search functionality"""
    print(f"\n{'='*60}")
    print(f"TEST: {description}")
    print(f"Query: '{query}'")
    print('='*60)
    
    url = f"{LITERATURE_URL}/api/search"
    data = {"query": query, "maxResults": 3}
    
    try:
        req = urllib.request.Request(url, 
                                   data=json.dumps(data).encode('utf-8'),
                                   headers={'Content-Type': 'application/json'})
        
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
        
        if result.get('success'):
            print(f"Found {result['totalCount']} results:")
            for i, item in enumerate(result['results'], 1):
                print(f"\n{i}. {item['title']}")
                print(f"   Type: {item['type']}")
                print(f"   Content: {item['content'][:150]}...")
                if 'searchScore' in item:
                    print(f"   Search Score: {item['searchScore']}")
        else:
            print(f"Search failed: {result.get('error', 'Unknown error')}")
            
    except Exception as e:
        print(f"Error: {e}")

def test_rag_with_enhanced_search(user_question):
    """Test RAG pipeline with enhanced search"""
    print(f"\n{'='*60}")
    print(f"RAG TEST: {user_question}")
    print('='*60)
    
    # Step 1: Search for relevant literature
    print("Step 1: Searching literature...")
    search_data = {"query": user_question, "maxResults": 2}
    
    try:
        search_req = urllib.request.Request(
            f"{LITERATURE_URL}/api/search",
            data=json.dumps(search_data).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        
        with urllib.request.urlopen(search_req) as response:
            search_result = json.loads(response.read().decode('utf-8'))
        
        if search_result.get('success') and search_result.get('results'):
            context = " | ".join([
                f"{result['title']}: {result['content'][:200]}"
                for result in search_result['results']
            ])
            print(f"Found context from {len(search_result['results'])} sources")
        else:
            context = ""
            print("No relevant literature found")
        
        # Step 2: Use context in chat
        print("\nStep 2: Generating AI response with literature context...")
        
        history = []
        if context:
            history.append({
                "role": "system",
                "content": f"Use this recovery literature to enhance your response: {context}"
            })
        
        chat_data = {"message": user_question, "history": history}
        chat_req = urllib.request.Request(
            f"{CHAT_URL}/api/chat",
            data=json.dumps(chat_data).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        
        with urllib.request.urlopen(chat_req) as response:
            chat_result = json.loads(response.read().decode('utf-8'))
        
        if chat_result.get('success'):
            print(f"\nEnhanced Response:")
            print('-' * 40)
            print(chat_result['response'])
            print('-' * 40)
            print(f"Tokens: {chat_result['metadata']['tokensUsed']} | Model: {chat_result['metadata']['model']}")
        else:
            print(f"Chat failed: {chat_result.get('error', 'Unknown error')}")
            
    except Exception as e:
        print(f"RAG Pipeline Error: {e}")

def main():
    print("🔍 ENHANCED LITERATURE SEARCH TESTING")
    print("Testing current v2 service capabilities...")
    
    # Test various search scenarios
    test_literature_search("powerless", "Step 1 - Powerlessness")
    test_literature_search("moral inventory", "Step 4 - Moral Inventory")  
    test_literature_search("unity", "Tradition 1 - Unity")
    test_literature_search("resentments", "Dealing with Resentments")
    test_literature_search("crisis help", "Crisis Support")
    
    # Test RAG pipeline with different scenarios
    test_rag_with_enhanced_search("I'm struggling with admitting I'm powerless. Can you help me understand Step 1?")
    test_rag_with_enhanced_search("How do I deal with resentments in my recovery?")
    test_rag_with_enhanced_search("I'm having thoughts of drinking tonight. What should I do?")
    
    print(f"\n{'='*60}")
    print("📊 ENHANCED CAPABILITIES DEMONSTRATION")
    print("="*60)
    print("✅ Current v2 Service Features:")
    print("   - Real Azure OpenAI embeddings")
    print("   - Basic keyword search in 3 literature items")
    print("   - RAG pipeline integration")
    print("")
    print("🚀 Planned v3 Service Enhancements:")
    print("   - 25 comprehensive literature items")
    print("   - All 12 Steps with detailed explanations")
    print("   - 12 Traditions content")
    print("   - Recovery concepts and principles")
    print("   - Crisis support resources")
    print("   - Enhanced search with themes and keywords")
    print("   - Weighted scoring algorithm")
    print("   - Fallback to crisis resources when needed")

if __name__ == "__main__":
    main()