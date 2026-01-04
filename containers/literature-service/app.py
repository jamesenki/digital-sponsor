import http.server
import socketserver
import json
import os
import urllib.request
import urllib.parse
from datetime import datetime

# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT = os.environ.get('AZURE_OPENAI_ENDPOINT', 'https://eastus2.api.cognitive.microsoft.com/')
AZURE_OPENAI_API_KEY = os.environ.get('AZURE_OPENAI_API_KEY', '')
AZURE_OPENAI_EMBEDDING_DEPLOYMENT = os.environ.get('AZURE_OPENAI_EMBEDDING_DEPLOYMENT', 'text-embedding-ada-002')

def call_azure_openai_embedding(text):
    """Call Azure OpenAI text-embedding-ada-002 for embeddings"""
    try:
        url = f"{AZURE_OPENAI_ENDPOINT.rstrip('/')}/openai/deployments/{AZURE_OPENAI_EMBEDDING_DEPLOYMENT}/embeddings?api-version=2024-08-01-preview"
        
        headers = {
            'api-key': AZURE_OPENAI_API_KEY,
            'Content-Type': 'application/json'
        }
        
        data = {
            "input": text
        }
        
        req = urllib.request.Request(url, 
                                   data=json.dumps(data).encode('utf-8'),
                                   headers=headers)
        
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            
        if 'data' in result and len(result['data']) > 0:
            return {
                'success': True,
                'embeddings': [result['data'][0]['embedding']],
                'tokensUsed': result.get('usage', {}).get('total_tokens', 0),
                'model': f"azure-{AZURE_OPENAI_EMBEDDING_DEPLOYMENT}"
            }
        else:
            return {
                'success': False,
                'error': 'No embedding response from Azure OpenAI'
            }
            
    except Exception as e:
        print(f"Azure OpenAI Embedding Error: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }

# Import comprehensive literature database
from literature_database import get_all_literature_items

# Get all literature items from the comprehensive database
LITERATURE_DATABASE = get_all_literature_items()

class LiteratureHandler(http.server.BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            response = {
                'status': 'healthy',
                'service': 'Digital Sponsor Literature Service',
                'region': 'Central US',
                'literature_count': len(LITERATURE_DATABASE),
                'literature_types': {
                    'twelve_steps': len([item for item in LITERATURE_DATABASE if item['type'] == 'twelve_steps']),
                    'twelve_traditions': len([item for item in LITERATURE_DATABASE if item['type'] == 'twelve_traditions']),
                    'recovery_concepts': len([item for item in LITERATURE_DATABASE if item['type'] == 'recovery_concepts']),
                    'crisis_support': len([item for item in LITERATURE_DATABASE if item['type'] == 'crisis_support'])
                },
                'timestamp': datetime.now().isoformat(),
                'version': '2.0.0'
            }
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_error(404)
    
    def do_POST(self):
        if self.path == '/api/search':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                query = data.get('query', '')
                max_results = data.get('maxResults', 5)
                
                if not query:
                    self.send_error(400, 'Query required')
                    return
                
                # Enhanced keyword search with themes and keywords
                results = []
                query_terms = [term.lower().strip() for term in query.split()]
                
                for item in LITERATURE_DATABASE:
                    score = 0
                    search_text = (item['title'] + ' ' + item['content']).lower()
                    
                    # Check title matches (higher weight)
                    for term in query_terms:
                        if term in item['title'].lower():
                            score += 3
                    
                    # Check content matches
                    for term in query_terms:
                        if term in item['content'].lower():
                            score += 2
                    
                    # Check keyword matches (if available)
                    if 'keywords' in item:
                        for keyword in item['keywords']:
                            for term in query_terms:
                                if term in keyword.lower():
                                    score += 2
                    
                    # Check theme matches (if available)
                    if 'themes' in item:
                        for theme in item['themes']:
                            for term in query_terms:
                                if term in theme.lower():
                                    score += 1
                    
                    if score > 0:
                        # Add dynamic relevance score based on search match
                        item_copy = item.copy()
                        item_copy['searchScore'] = score
                        results.append(item_copy)
                
                # Sort by search score (descending)
                results.sort(key=lambda x: x.get('searchScore', 0), reverse=True)
                
                # Return top results or fallback to general recovery content
                if not results:
                    # Return crisis resources and steps if no match
                    results = [item for item in LITERATURE_DATABASE if 
                              item['type'] in ['crisis_support', 'twelve_steps']][:max_results]
                else:
                    results = results[:max_results]
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                response = {
                    'success': True,
                    'results': results,
                    'totalCount': len(results),
                    'query': query,
                    'searchMode': 'enhanced_keyword_search',
                    'databaseSize': len(LITERATURE_DATABASE)
                }
                self.wfile.write(json.dumps(response).encode())
                
            except json.JSONDecodeError:
                self.send_error(400, 'Invalid JSON')
                
        elif self.path == '/api/embed':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                text = data.get('text', '')
                
                if not text:
                    self.send_error(400, 'Text required')
                    return
                
                # Call Azure OpenAI for real embeddings
                embedding_result = call_azure_openai_embedding(text)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                if embedding_result['success']:
                    response = {
                        'success': True,
                        'embeddings': embedding_result['embeddings'],
                        'model': embedding_result['model'],
                        'tokensUsed': embedding_result['tokensUsed'],
                        'region': 'Central US'
                    }
                else:
                    response = {
                        'success': False,
                        'error': embedding_result['error'],
                        'fallback_message': 'Embedding service temporarily unavailable'
                    }
                self.wfile.write(json.dumps(response).encode())
                
            except json.JSONDecodeError:
                self.send_error(400, 'Invalid JSON')
        else:
            self.send_error(404)

PORT = int(os.environ.get('PORT', 3002))
with socketserver.TCPServer(('', PORT), LiteratureHandler) as httpd:
    print(f'📚 Digital Sponsor Literature Service running on port {PORT}')
    print(f'📖 Mock literature records: {len(MOCK_LITERATURE)}')
    print('🌍 Region: Central US (co-located with function apps)')
    httpd.serve_forever()