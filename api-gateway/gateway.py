#!/usr/bin/env python3
"""
Unified API Gateway for Digital Sponsor Services
Provides single entry point for all services with routing, rate limiting, and monitoring
"""

import http.server
import socketserver
import json
import urllib.request
import urllib.parse
import time
from urllib.parse import urlparse, parse_qs

class APIGatewayHandler(http.server.BaseHTTPRequestHandler):
    
    # Service endpoints
    SERVICES = {
        'literature': 'http://digitalsponsor-literature-massive.centralus.azurecontainer.io:3002',
        'chat': 'http://digitalsponsor-chat-v2.centralus.azurecontainer.io:3003',
        'stepwork': 'http://digitalsponsor-stepwork-v4.centralus.azurecontainer.io:3003'
    }
    
    # Rate limiting (simple in-memory storage)
    rate_limits = {}
    
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key")
        self.send_header("Access-Control-Max-Age", "86400")
        self.end_headers()

    def do_GET(self):
        if self.path == "/health":
            self.health_check()
        elif self.path == "/api/gateway/status":
            self.gateway_status()
        elif self.path.startswith("/api/literature/"):
            self.route_request('literature', self.path.replace('/api/literature', ''))
        elif self.path.startswith("/api/stepwork/"):
            self.route_request('stepwork', self.path.replace('/api/stepwork', ''))
        elif self.path.startswith("/api/chat/"):
            self.route_request('chat', self.path.replace('/api/chat', ''))
        else:
            self.send_error(404, "Endpoint not found")

    def do_POST(self):
        if self.path.startswith("/api/literature/"):
            self.route_request('literature', self.path.replace('/api/literature', ''))
        elif self.path.startswith("/api/stepwork/"):
            self.route_request('stepwork', self.path.replace('/api/stepwork', ''))
        elif self.path.startswith("/api/chat/"):
            self.route_request('chat', self.path.replace('/api/chat', ''))
        else:
            self.send_error(404, "Endpoint not found")

    def do_DELETE(self):
        if self.path.startswith("/api/stepwork/"):
            self.route_request('stepwork', self.path.replace('/api/stepwork', ''))
        else:
            self.send_error(404, "Endpoint not found")

    def health_check(self):
        """Gateway health check"""
        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        
        response = {
            "status": "healthy",
            "service": "api-gateway",
            "version": "1.0",
            "timestamp": time.time(),
            "services": {}
        }
        
        # Check all services
        for service_name, url in self.SERVICES.items():
            try:
                health_req = urllib.request.Request(f"{url}/health", method='GET')
                with urllib.request.urlopen(health_req, timeout=3) as health_response:
                    health_data = json.loads(health_response.read().decode('utf-8'))
                    response["services"][service_name] = {
                        "status": "healthy",
                        "details": health_data
                    }
            except Exception as e:
                response["services"][service_name] = {
                    "status": "unhealthy",
                    "error": str(e)
                }
        
        self.wfile.write(json.dumps(response).encode())

    def gateway_status(self):
        """Detailed gateway status and metrics"""
        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        
        response = {
            "gateway": {
                "name": "Digital Sponsor API Gateway",
                "version": "1.0",
                "uptime": time.time(),
                "routes": {
                    "/api/literature/*": "Literature Service - AA literature search and retrieval",
                    "/api/chat/*": "Chat Service - AI-powered spiritual guidance",
                    "/api/stepwork/*": "Step Work Service - Interactive step work and moral inventory",
                    "/health": "Gateway health check",
                    "/api/gateway/status": "Detailed gateway status"
                }
            },
            "services": self.SERVICES,
            "rate_limiting": {
                "enabled": True,
                "limit": "100 requests per minute per IP"
            },
            "cors": {
                "enabled": True,
                "allow_origin": "*"
            }
        }
        
        self.wfile.write(json.dumps(response).encode())

    def rate_limit_check(self, client_ip):
        """Simple rate limiting"""
        current_time = time.time()
        minute_window = int(current_time / 60)
        
        if client_ip not in self.rate_limits:
            self.rate_limits[client_ip] = {}
        
        if minute_window not in self.rate_limits[client_ip]:
            self.rate_limits[client_ip][minute_window] = 0
        
        self.rate_limits[client_ip][minute_window] += 1
        
        # Clean up old entries
        for ip in list(self.rate_limits.keys()):
            for window in list(self.rate_limits[ip].keys()):
                if window < minute_window - 5:  # Keep 5 minutes of history
                    del self.rate_limits[ip][window]
        
        return self.rate_limits[client_ip][minute_window] <= 100

    def route_request(self, service_name, path):
        """Route request to appropriate service"""
        client_ip = self.client_address[0]
        
        # Rate limiting
        if not self.rate_limit_check(client_ip):
            self.send_response(429)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            error_response = {"error": "Rate limit exceeded", "limit": "100 requests per minute"}
            self.wfile.write(json.dumps(error_response).encode())
            return
        
        if service_name not in self.SERVICES:
            self.send_error(404, f"Service {service_name} not found")
            return
        
        service_url = self.SERVICES[service_name]
        target_url = f"{service_url}{path}"
        
        try:
            # Prepare request
            if self.command == 'GET':
                req = urllib.request.Request(target_url, method='GET')
            elif self.command in ['POST', 'PUT']:
                content_length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_length) if content_length > 0 else b''
                req = urllib.request.Request(target_url, data=body, method=self.command)
                req.add_header('Content-Type', self.headers.get('Content-Type', 'application/json'))
            elif self.command == 'DELETE':
                req = urllib.request.Request(target_url, method='DELETE')
            
            # Forward request
            with urllib.request.urlopen(req, timeout=10) as response:
                # Forward response
                self.send_response(response.status)
                
                # Forward headers
                for header, value in response.headers.items():
                    if header.lower() not in ['content-encoding', 'transfer-encoding']:
                        self.send_header(header, value)
                
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("X-Gateway", "Digital-Sponsor-Gateway-v1.0")
                self.send_header("X-Service", service_name)
                self.end_headers()
                
                # Forward body
                response_data = response.read()
                self.wfile.write(response_data)
                
                # Log request
                print(f"🔗 {self.command} {service_name}{path} -> {response.status}")
                
        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            error_response = {
                "error": f"Service error: {e.reason}",
                "service": service_name,
                "code": e.code
            }
            self.wfile.write(json.dumps(error_response).encode())
            print(f"❌ {self.command} {service_name}{path} -> Error {e.code}: {e.reason}")
            
        except Exception as e:
            self.send_response(502)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            error_response = {
                "error": f"Gateway error: {str(e)}",
                "service": service_name
            }
            self.wfile.write(json.dumps(error_response).encode())
            print(f"❌ {self.command} {service_name}{path} -> Gateway Error: {str(e)}")

if __name__ == "__main__":
    print("🚀 Digital Sponsor API Gateway v1.0 starting...")
    
    PORT = 8080
    
    with socketserver.TCPServer(("", PORT), APIGatewayHandler) as httpd:
        print(f"✅ API Gateway running on port {PORT}")
        print("🔗 Routes:")
        print("   /health - Gateway health check")
        print("   /api/gateway/status - Detailed status")
        print("   /api/literature/* -> Literature Service")
        print("   /api/chat/* -> Chat Service")
        print("   /api/stepwork/* -> Step Work Service")
        print("🛡️ Features: Rate limiting, CORS, Service monitoring")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 API Gateway shutting down...")