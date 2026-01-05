#!/usr/bin/env python3
"""
Beta Testing Platform - Authentication Service
Handles beta invite codes, user registration, and login
"""

import http.server
import socketserver
import json
import hashlib
import time
import uuid
from urllib.parse import parse_qs, urlparse

class BetaAuthHandler(http.server.BaseHTTPRequestHandler):
    
    # In-memory storage for demo (use database in production)
    beta_codes = {
        "BETA2026": {"uses_left": 100, "created_by": "admin"},
        "INVESTOR": {"uses_left": 50, "created_by": "demo"},
        "SPONSOR": {"uses_left": 25, "created_by": "pilot"}
    }
    
    users = {}
    sessions = {}
    
    def do_OPTIONS(self):
        """Handle CORS preflight"""
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_GET(self):
        if self.path == "/health":
            self.health_check()
        elif self.path.startswith("/api/validate-beta-code"):
            self.validate_beta_code()
        elif self.path == "/api/session/validate":
            self.validate_session()
        else:
            self.send_error(404)

    def do_POST(self):
        if self.path == "/api/register":
            self.register_user()
        elif self.path == "/api/login":
            self.login_user()
        elif self.path == "/api/logout":
            self.logout_user()
        else:
            self.send_error(404)

    def health_check(self):
        """Service health check"""
        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        
        response = {
            "status": "healthy",
            "service": "beta-auth",
            "version": "1.0",
            "stats": {
                "registered_users": len(self.users),
                "active_sessions": len(self.sessions),
                "available_beta_codes": len(self.beta_codes)
            }
        }
        self.wfile.write(json.dumps(response).encode())

    def validate_beta_code(self):
        """Validate beta invite code"""
        parsed_url = urlparse(self.path)
        query_params = parse_qs(parsed_url.query)
        code = query_params.get("code", [None])[0]
        
        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        
        if code and code in self.beta_codes:
            beta_info = self.beta_codes[code]
            if beta_info["uses_left"] > 0:
                response = {
                    "valid": True,
                    "code": code,
                    "uses_left": beta_info["uses_left"],
                    "message": "Valid beta code - proceed with registration"
                }
            else:
                response = {
                    "valid": False,
                    "message": "Beta code has been fully used"
                }
        else:
            response = {
                "valid": False,
                "message": "Invalid beta code"
            }
        
        self.wfile.write(json.dumps(response).encode())

    def register_user(self):
        """Register new user with beta code"""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = json.loads(self.rfile.read(content_length).decode('utf-8'))
            
            beta_code = post_data.get('betaCode')
            email = post_data.get('email')
            password = post_data.get('password')
            first_name = post_data.get('firstName', '')
            
            # Validate beta code
            if beta_code not in self.beta_codes or self.beta_codes[beta_code]["uses_left"] <= 0:
                self.send_response(400)
                self.send_header("Content-type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                response = {"success": False, "error": "Invalid or expired beta code"}
                self.wfile.write(json.dumps(response).encode())
                return
            
            # Check if user exists
            if email in self.users:
                self.send_response(400)
                self.send_header("Content-type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                response = {"success": False, "error": "Email already registered"}
                self.wfile.write(json.dumps(response).encode())
                return
            
            # Create user
            user_id = str(uuid.uuid4())
            password_hash = hashlib.sha256(password.encode()).hexdigest()
            
            self.users[email] = {
                "id": user_id,
                "email": email,
                "first_name": first_name,
                "password_hash": password_hash,
                "beta_code": beta_code,
                "created_at": time.time(),
                "profile": {
                    "sobriety_date": None,
                    "sponsor_contact": None,
                    "step_progress": {},
                    "emergency_contacts": []
                }
            }
            
            # Use beta code
            self.beta_codes[beta_code]["uses_left"] -= 1
            
            # Create session
            session_token = str(uuid.uuid4())
            self.sessions[session_token] = {
                "user_id": user_id,
                "email": email,
                "created_at": time.time(),
                "expires_at": time.time() + (24 * 60 * 60)  # 24 hours
            }
            
            self.send_response(201)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            
            response = {
                "success": True,
                "user": {
                    "id": user_id,
                    "email": email,
                    "first_name": first_name
                },
                "session_token": session_token,
                "message": "Registration successful - welcome to Digital Sponsor beta!"
            }
            self.wfile.write(json.dumps(response).encode())
            
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            response = {"success": False, "error": f"Registration failed: {str(e)}"}
            self.wfile.write(json.dumps(response).encode())

    def login_user(self):
        """User login"""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = json.loads(self.rfile.read(content_length).decode('utf-8'))
            
            email = post_data.get('email')
            password = post_data.get('password')
            
            if email not in self.users:
                self.send_response(401)
                self.send_header("Content-type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                response = {"success": False, "error": "Invalid credentials"}
                self.wfile.write(json.dumps(response).encode())
                return
            
            user = self.users[email]
            password_hash = hashlib.sha256(password.encode()).hexdigest()
            
            if user["password_hash"] != password_hash:
                self.send_response(401)
                self.send_header("Content-type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                response = {"success": False, "error": "Invalid credentials"}
                self.wfile.write(json.dumps(response).encode())
                return
            
            # Create new session
            session_token = str(uuid.uuid4())
            self.sessions[session_token] = {
                "user_id": user["id"],
                "email": email,
                "created_at": time.time(),
                "expires_at": time.time() + (24 * 60 * 60)  # 24 hours
            }
            
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            
            response = {
                "success": True,
                "user": {
                    "id": user["id"],
                    "email": user["email"],
                    "first_name": user["first_name"]
                },
                "session_token": session_token,
                "message": "Login successful - welcome back!"
            }
            self.wfile.write(json.dumps(response).encode())
            
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            response = {"success": False, "error": f"Login failed: {str(e)}"}
            self.wfile.write(json.dumps(response).encode())

    def validate_session(self):
        """Validate user session token"""
        auth_header = self.headers.get('Authorization', '')
        
        if not auth_header.startswith('Bearer '):
            self.send_response(401)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            response = {"valid": False, "error": "No session token provided"}
            self.wfile.write(json.dumps(response).encode())
            return
        
        session_token = auth_header[7:]  # Remove "Bearer "
        
        if session_token not in self.sessions:
            self.send_response(401)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            response = {"valid": False, "error": "Invalid session token"}
            self.wfile.write(json.dumps(response).encode())
            return
        
        session = self.sessions[session_token]
        
        # Check if session expired
        if time.time() > session["expires_at"]:
            del self.sessions[session_token]
            self.send_response(401)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            response = {"valid": False, "error": "Session expired"}
            self.wfile.write(json.dumps(response).encode())
            return
        
        # Valid session
        user = self.users[session["email"]]
        
        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        
        response = {
            "valid": True,
            "user": {
                "id": user["id"],
                "email": user["email"],
                "first_name": user["first_name"],
                "profile": user["profile"]
            }
        }
        self.wfile.write(json.dumps(response).encode())

    def logout_user(self):
        """User logout"""
        auth_header = self.headers.get('Authorization', '')
        
        if auth_header.startswith('Bearer '):
            session_token = auth_header[7:]
            if session_token in self.sessions:
                del self.sessions[session_token]
        
        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        
        response = {"success": True, "message": "Logged out successfully"}
        self.wfile.write(json.dumps(response).encode())

if __name__ == "__main__":
    PORT = 8081
    
    print("🔐 Digital Sponsor Beta Auth Service starting...")
    print(f"✅ Running on port {PORT}")
    print("🎫 Available beta codes: BETA2026, INVESTOR, SPONSOR")
    
    with socketserver.TCPServer(("", PORT), BetaAuthHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Auth Service shutting down...")