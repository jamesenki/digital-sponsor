import http.server
import socketserver
import json
import os
import urllib.request
import urllib.parse
import threading
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

# Import vector search engine
from vector_search import (
    VECTOR_SEARCH_ENGINE,
    initialize_search_engine,
    search as vector_search,
    get_search_status
)

# Get all literature items from the comprehensive database
LITERATURE_DATABASE = get_all_literature_items()

# Initialize vector search engine in background
def init_search_engine_background():
    """Initialize search engine with embeddings in background"""
    print("🔄 Initializing vector search engine in background...")
    stats = initialize_search_engine(LITERATURE_DATABASE)
    print(f"✅ Vector search engine initialized: {stats}")

# Start background initialization
init_thread = threading.Thread(target=init_search_engine_background, daemon=True)
init_thread.start()

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

            # Get search engine status
            search_status = get_search_status()

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
                'search_engine': {
                    'semantic_enabled': search_status['is_initialized'],
                    'embeddings_computed': search_status['embeddings_computed'],
                    'last_precompute': search_status['last_precompute_time']
                },
                'timestamp': datetime.now().isoformat(),
                'version': '3.0.0'
            }
            self.wfile.write(json.dumps(response).encode())

        elif self.path == '/api/search/status':
            # Search engine status endpoint
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            response = get_search_status()
            self.wfile.write(json.dumps(response).encode())

        else:
            self.send_error(404)
    
    def do_POST(self):
        if self.path == '/api/search':
            # Default search - uses hybrid (keyword + semantic) when available
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                query = data.get('query', '')
                max_results = data.get('maxResults', 10)
                search_mode = data.get('mode', 'hybrid')  # 'keyword', 'semantic', or 'hybrid'

                if not query:
                    self.send_error(400, 'Query required')
                    return

                # Use vector search engine
                results = vector_search(query, mode=search_mode, top_k=max_results)

                # Fallback if no results
                if not results:
                    results = [item for item in LITERATURE_DATABASE if
                              item['type'] in ['crisis_support', 'twelve_steps']][:max_results]

                search_status = get_search_status()

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()

                response = {
                    'success': True,
                    'results': results,
                    'totalCount': len(results),
                    'query': query,
                    'searchMode': search_mode,
                    'semanticEnabled': search_status['is_initialized'],
                    'databaseSize': len(LITERATURE_DATABASE)
                }
                self.wfile.write(json.dumps(response).encode())

            except json.JSONDecodeError:
                self.send_error(400, 'Invalid JSON')

        elif self.path == '/api/search/keyword':
            # Keyword-only search (legacy compatibility)
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                query = data.get('query', '')
                max_results = data.get('maxResults', 10)

                if not query:
                    self.send_error(400, 'Query required')
                    return

                results = vector_search(query, mode='keyword', top_k=max_results)

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()

                response = {
                    'success': True,
                    'results': results,
                    'totalCount': len(results),
                    'query': query,
                    'searchMode': 'keyword',
                    'databaseSize': len(LITERATURE_DATABASE)
                }
                self.wfile.write(json.dumps(response).encode())

            except json.JSONDecodeError:
                self.send_error(400, 'Invalid JSON')

        elif self.path == '/api/search/semantic':
            # Semantic-only search
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                query = data.get('query', '')
                max_results = data.get('maxResults', 10)

                if not query:
                    self.send_error(400, 'Query required')
                    return

                results = vector_search(query, mode='semantic', top_k=max_results)
                search_status = get_search_status()

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()

                response = {
                    'success': True,
                    'results': results,
                    'totalCount': len(results),
                    'query': query,
                    'searchMode': 'semantic',
                    'semanticEnabled': search_status['is_initialized'],
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
    print(f'📖 Literature records: {len(LITERATURE_DATABASE)}')
    print('🔍 Search modes: keyword, semantic, hybrid (default)')
    print('🌍 Region: Central US (co-located with function apps)')
    httpd.serve_forever()