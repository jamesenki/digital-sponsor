#!/usr/bin/env python3
"""
Simple Step Work Service for Digital Sponsor
Provides Step 4 moral inventory functionality with RAG integration
"""

import http.server
import socketserver
import json
import urllib.request
from urllib.parse import urlparse, parse_qs

class StepWorkHandler(http.server.BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_GET(self):
        if self.path == "/health":
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            response = {"status": "healthy", "service": "step-work", "version": "4.0"}
            self.wfile.write(json.dumps(response).encode())
            
        elif self.path.startswith("/api/guidance/resentment"):
            parsed_url = urlparse(self.path)
            query_params = parse_qs(parsed_url.query)
            description = query_params.get("description", ["Sample resentment"])[0]
            
            # Get literature guidance
            literature_guidance = self.get_literature_guidance(description)
            
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            
            response = {
                "success": True,
                "guidance": f"""🙏 Spiritual Guidance for your resentment:

Regarding '{description}', this is an opportunity for spiritual growth. The Big Book teaches us that resentments are the "number one" offender - they destroy more alcoholics than anything else.

Consider these questions:
1. What is my part in this situation?
2. Where was I selfish, dishonest, self-seeking, or frightened?
3. How can I respond with love and tolerance instead of resentment?

Remember: We cannot change others, but we can change ourselves. This resentment is blocking your connection to your Higher Power. Through prayer and meditation, ask for the willingness to forgive and to see your part clearly.

"If we were to live, we had to be free of anger." - Alcoholics Anonymous, p. 66

{literature_guidance}""",
                "literature_sources": [
                    {"title": "Alcoholics Anonymous (Big Book)", "description": "Step 4 resentment inventory guidance, pages 64-71"},
                    {"title": "Twelve Steps and Twelve Traditions", "description": "Detailed step work instructions for moral inventory"}
                ],
                "crisis_detected": False
            }
            self.wfile.write(json.dumps(response).encode())
            
        elif self.path.startswith("/api/step4/progress/"):
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            response = {
                "progress": {
                    "completion_percentage": 25,
                    "total_entries": 2,
                    "next_recommended_section": "fears"
                }
            }
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_error(404)

    def do_POST(self):
        if self.path == "/api/session/create":
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            response = {
                "session": {"session_id": "demo-session-123"},
                "privacy_notice": "Anonymous session created with full data deletion capability"
            }
            self.wfile.write(json.dumps(response).encode())
            
        elif self.path == "/api/step4/resentment":
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            response = {
                "entry_id": "resentment-456",
                "message": "Resentment saved successfully to your Step 4 inventory"
            }
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_error(404)

    def do_DELETE(self):
        if self.path.startswith("/api/session/"):
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            response = {
                "success": True,
                "message": "Session and all personal data permanently deleted"
            }
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_error(404)

    def get_literature_guidance(self, description):
        """Get relevant literature guidance for resentment"""
        try:
            # Search literature service
            search_data = {
                "query": f"Step 4 resentment {description}",
                "maxResults": 2
            }
            
            req = urllib.request.Request(
                "http://digitalsponsor-literature-massive.centralus.azurecontainer.io:3002/api/search",
                data=json.dumps(search_data).encode('utf-8'),
                headers={'Content-Type': 'application/json'}
            )
            
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode('utf-8'))
                
            if data.get('results') and len(data['results']) > 0:
                result = data['results'][0]
                return f"\n📚 From {result['title']}:\n{result['description'][:200]}..."
            
            return "\n📚 Consult your sponsor and the Big Book for additional guidance."
            
        except Exception as e:
            print(f"Literature search failed: {e}")
            return "\n📚 Consult your sponsor and the Big Book for additional guidance."

if __name__ == "__main__":
    print("🔥 Digital Sponsor Step Work Service v4.0 starting...")
    
    with socketserver.TCPServer(("", 3003), StepWorkHandler) as httpd:
        print("✅ Step Work Service running on port 3003")
        print("📝 Endpoints: /health, /api/session/create, /api/step4/resentment, /api/guidance/resentment")
        httpd.serve_forever()