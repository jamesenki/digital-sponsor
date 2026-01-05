#!/usr/bin/env python3
"""
Test the complete RAG pipeline:
1. Search literature service for relevant content
2. Use that content to enhance chat responses
"""
import json
import urllib.request
import urllib.parse

CHAT_URL = "http://digitalsponsor-chat-v2.centralus.azurecontainer.io:3003"
LITERATURE_URL = "http://digitalsponsor-literature-v2.centralus.azurecontainer.io:3002"

def search_literature(query, max_results=2):
    """Search literature service for relevant content"""
    url = f"{LITERATURE_URL}/api/search"
    data = {"query": query, "maxResults": max_results}
    
    req = urllib.request.Request(url, 
                               data=json.dumps(data).encode('utf-8'),
                               headers={'Content-Type': 'application/json'})
    
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode('utf-8'))

def chat_with_context(message, context=""):
    """Send message to chat service with optional context"""
    url = f"{CHAT_URL}/api/chat"
    
    # Build history with context if provided
    history = []
    if context:
        history.append({
            "role": "system", 
            "content": f"Use this recovery literature to help answer questions: {context}"
        })
    
    data = {"message": message, "history": history}
    
    req = urllib.request.Request(url,
                               data=json.dumps(data).encode('utf-8'),
                               headers={'Content-Type': 'application/json'})
    
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode('utf-8'))

def rag_pipeline_test():
    """Test the complete RAG pipeline"""
    user_question = "I'm struggling with resentments. How can Step 4 help me?"
    
    print(f"User Question: {user_question}")
    print("\n" + "="*60)
    
    # Step 1: Search literature for relevant content
    print("Step 1: Searching literature...")
    search_results = search_literature("resentments step 4 moral inventory", 2)
    
    if search_results.get('success') and search_results.get('results'):
        literature_context = " | ".join([
            f"{result['title']}: {result['content']}" 
            for result in search_results['results']
        ])
        print(f"Found {len(search_results['results'])} relevant documents")
    else:
        literature_context = ""
        print("No literature found")
    
    # Step 2: Send to chat with literature context
    print("\nStep 2: Getting AI response with literature context...")
    chat_response = chat_with_context(user_question, literature_context)
    
    if chat_response.get('success'):
        print("\n" + "="*60)
        print("RAG-Enhanced Response:")
        print("="*60)
        print(chat_response['response'])
        print("\n" + "="*60)
        print(f"Tokens used: {chat_response['metadata']['tokensUsed']}")
        print(f"Model: {chat_response['metadata']['model']}")
        print(f"Region: {chat_response['metadata']['region']}")
    else:
        print(f"Chat failed: {chat_response.get('error', 'Unknown error')}")

if __name__ == "__main__":
    rag_pipeline_test()