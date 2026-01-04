#!/usr/bin/env python3
"""
Massive Literature Service - Production-ready with 2,400+ AA literature pieces
Handles comprehensive AA literature database with advanced search capabilities
"""
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

# Import massive literature engine
from advanced_literature_engine import create_advanced_literature_engine

# Initialize advanced literature engine
LITERATURE_ENGINE = create_advanced_literature_engine()

class MassiveLiteratureHandler(http.server.BaseHTTPRequestHandler):
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
            
            # Get comprehensive database overview
            overview = LITERATURE_ENGINE.get_database_overview()
            
            response = {
                'status': 'healthy',
                'service': 'Digital Sponsor Massive Literature Service',
                'region': 'Central US',
                'databaseStats': overview['databaseStats'],
                'contentTypes': overview['contentTypes'],
                'searchCapabilities': overview['searchCapabilities'],
                'specialFeatures': overview['specialFeatures'],
                'timestamp': datetime.now().isoformat(),
                'version': '3.0.0 - MASSIVE'
            }
            self.wfile.write(json.dumps(response, indent=2).encode())
            
        elif self.path == '/api/content-types':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            content_types_result = LITERATURE_ENGINE._get_available_content_types()
            response = {
                'success': True,
                'contentTypes': content_types_result,
                'totalTypes': len(content_types_result)
            }
            self.wfile.write(json.dumps(response).encode())
            
        elif self.path == '/api/crisis-resources':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            crisis_result = LITERATURE_ENGINE.get_crisis_resources()
            self.wfile.write(json.dumps(crisis_result).encode())
            
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
                content_types = data.get('contentTypes', None)
                
                if not query:
                    self.send_error(400, 'Query required')
                    return
                
                # Use advanced semantic search
                search_result = LITERATURE_ENGINE.semantic_search(
                    query=query, 
                    max_results=max_results, 
                    content_types=content_types
                )
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                self.wfile.write(json.dumps(search_result, indent=2).encode())
                
            except json.JSONDecodeError:
                self.send_error(400, 'Invalid JSON')
                
        elif self.path == '/api/step-recommendations':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                step_number = data.get('stepNumber', 1)
                
                if not isinstance(step_number, int) or step_number < 1 or step_number > 12:
                    self.send_error(400, 'Step number must be between 1 and 12')
                    return
                
                recommendations = LITERATURE_ENGINE.get_recommendations_for_step(step_number)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                self.wfile.write(json.dumps(recommendations, indent=2).encode())
                
            except json.JSONDecodeError:
                self.send_error(400, 'Invalid JSON')
                
        elif self.path == '/api/content-type-search':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                content_type = data.get('contentType', '')
                max_results = data.get('maxResults', 10)
                
                if not content_type:
                    self.send_error(400, 'Content type required')
                    return
                
                type_result = LITERATURE_ENGINE.get_by_content_type(content_type, max_results)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                self.wfile.write(json.dumps(type_result, indent=2).encode())
                
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
                        'region': 'Central US',
                        'databaseSize': LITERATURE_ENGINE.stats['total_literature_items']
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
with socketserver.TCPServer(('', PORT), MassiveLiteratureHandler) as httpd:
    print(f'📚 Digital Sponsor MASSIVE Literature Service running on port {PORT}')
    
    # Print comprehensive startup information
    overview = LITERATURE_ENGINE.get_database_overview()
    print(f'📊 Database Statistics:')
    print(f'   Total Literature Items: {overview["databaseStats"]["total_literature_items"]}')
    print(f'   Individual Stories: ~{overview["databaseStats"]["estimated_individual_stories"]}')
    print(f'   Grapevine Articles: ~{overview["databaseStats"]["estimated_grapevine_articles"]}')
    print(f'   Total Content Pieces: ~{overview["databaseStats"]["estimated_individual_stories"] + overview["databaseStats"]["estimated_grapevine_articles"]}')
    print(f'   Content Types: {len(overview["contentTypes"])}')
    print(f'🚀 Advanced Features:')
    for feature in overview['specialFeatures']:
        print(f'   ✅ {feature}')
    print('🌍 Region: Central US (co-located with function apps)')
    print('🔗 Azure OpenAI: Integrated for embeddings')
    
    httpd.serve_forever()