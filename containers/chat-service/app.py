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
AZURE_OPENAI_DEPLOYMENT = os.environ.get('AZURE_OPENAI_DEPLOYMENT_NAME', 'gpt-4o')

def call_azure_openai(message, conversation_history=[]):
    """Call Azure OpenAI GPT-4o for chat completion"""
    try:
        url = f"{AZURE_OPENAI_ENDPOINT.rstrip('/')}/openai/deployments/{AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=2024-08-01-preview"
        
        headers = {
            'api-key': AZURE_OPENAI_API_KEY,
            'Content-Type': 'application/json'
        }
        
        # Create messages array with system prompt and user message
        messages = [
            {
                "role": "system",
                "content": "You are a helpful digital sponsor assistant for addiction recovery. Provide supportive, empathetic, and recovery-focused guidance. Draw from 12-step principles when appropriate."
            }
        ]
        
        # Add conversation history if provided
        messages.extend(conversation_history)
        
        # Add current user message
        messages.append({"role": "user", "content": message})
        
        data = {
            "messages": messages,
            "max_tokens": 1000,
            "temperature": 0.7,
            "top_p": 0.95,
            "frequency_penalty": 0,
            "presence_penalty": 0
        }
        
        req = urllib.request.Request(url, 
                                   data=json.dumps(data).encode('utf-8'),
                                   headers=headers)
        
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            
        if 'choices' in result and len(result['choices']) > 0:
            return {
                'success': True,
                'response': result['choices'][0]['message']['content'],
                'tokensUsed': result.get('usage', {}).get('total_tokens', 0),
                'model': f"azure-{AZURE_OPENAI_DEPLOYMENT}"
            }
        else:
            return {
                'success': False,
                'error': 'No response from Azure OpenAI',
                'response': 'I apologize, but I am having trouble processing your request right now. Please try again.'
            }
            
    except Exception as e:
        print(f"Azure OpenAI Error: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'response': 'I apologize, but I am having trouble connecting to my AI service right now. Please try again later.'
        }

class ChatHandler(http.server.BaseHTTPRequestHandler):
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
                'service': 'Digital Sponsor Chat Service',
                'region': 'Central US',
                'timestamp': datetime.now().isoformat(),
                'version': '1.0.0'
            }
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_error(404)
    
    def do_POST(self):
        if self.path == '/api/chat':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                message = data.get('message', '')
                if not message:
                    self.send_error(400, 'Message required')
                    return
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                # Get conversation history if provided
                history = data.get('history', [])
                
                # Call Azure OpenAI
                ai_response = call_azure_openai(message, history)
                
                response = {
                    'success': ai_response['success'],
                    'response': ai_response['response'],
                    'metadata': {
                        'region': 'Central US',
                        'timestamp': datetime.now().isoformat(),
                        'model': ai_response.get('model', 'azure-gpt-4o'),
                        'tokensUsed': ai_response.get('tokensUsed', 0),
                        'error': ai_response.get('error') if not ai_response['success'] else None
                    }
                }
                self.wfile.write(json.dumps(response).encode())
            except json.JSONDecodeError:
                self.send_error(400, 'Invalid JSON')
        else:
            self.send_error(404)

PORT = int(os.environ.get('PORT', 3003))
with socketserver.TCPServer(('', PORT), ChatHandler) as httpd:
    print(f'💬 Digital Sponsor Chat Service running on port {PORT}')
    print('🌍 Region: Central US (co-located with function apps)')
    httpd.serve_forever()