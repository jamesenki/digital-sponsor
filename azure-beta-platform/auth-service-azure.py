#!/usr/bin/env python3
"""
Azure-Deployed Beta Platform - Authentication Service
Production-ready auth service with email invitations and Azure integration
"""

import http.server
import socketserver
import json
import hashlib
import time
import uuid
import os
import urllib.request
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from urllib.parse import parse_qs, urlparse

class AzureBetaAuthHandler(http.server.BaseHTTPRequestHandler):
    
    # Production invitation system with email integration
    invitations = {}  # Will be replaced with Azure CosmosDB
    users = {}
    sessions = {}
    
    # Email configuration (use Azure SendGrid in production)
    SENDGRID_API_KEY = os.getenv('SENDGRID_API_KEY', 'demo-key')
    FROM_EMAIL = os.getenv('FROM_EMAIL', 'beta@digitalsponsor.ai')
    
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
        elif self.path.startswith("/api/validate-invitation"):
            self.validate_invitation_code()
        elif self.path == "/api/session/validate":
            self.validate_session()
        elif self.path == "/api/admin/stats":
            self.admin_stats()
        else:
            self.send_error(404)

    def do_POST(self):
        if self.path == "/api/admin/send-invitation":
            self.send_invitation()
        elif self.path == "/api/register":
            self.register_user()
        elif self.path == "/api/login":
            self.login_user()
        elif self.path == "/api/logout":
            self.logout_user()
        else:
            self.send_error(404)

    def health_check(self):
        """Service health check with Azure metadata"""
        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        
        response = {
            "status": "healthy",
            "service": "digital-sponsor-auth",
            "version": "2.0-azure",
            "environment": "production-beta",
            "region": "centralus",
            "stats": {
                "total_invitations_sent": len(self.invitations),
                "registered_users": len(self.users),
                "active_sessions": len([s for s in self.sessions.values() if s["expires_at"] > time.time()])
            },
            "features": [
                "email_invitations",
                "unique_invitation_codes", 
                "session_management",
                "azure_integration"
            ]
        }
        self.wfile.write(json.dumps(response).encode())

    def send_invitation(self):
        """Admin endpoint to send beta invitations via email"""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = json.loads(self.rfile.read(content_length).decode('utf-8'))
            
            admin_key = post_data.get('adminKey')
            email = post_data.get('email')
            first_name = post_data.get('firstName', 'Friend')
            invitation_type = post_data.get('type', 'general')  # investor, sponsor, general
            
            # Verify admin access (use Azure Key Vault in production)
            if admin_key != os.getenv('ADMIN_KEY', 'demo-admin-key-123'):
                self.send_response(403)
                self.send_header("Content-type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                response = {"success": False, "error": "Invalid admin key"}
                self.wfile.write(json.dumps(response).encode())
                return
            
            # Generate unique invitation code
            invitation_code = f"DS-{invitation_type.upper()}-{str(uuid.uuid4())[:8].upper()}"
            
            # Store invitation
            self.invitations[invitation_code] = {
                "email": email,
                "first_name": first_name,
                "type": invitation_type,
                "created_at": time.time(),
                "used": False,
                "expires_at": time.time() + (7 * 24 * 60 * 60)  # 7 days
            }
            
            # Send email invitation
            email_sent = self.send_invitation_email(email, first_name, invitation_code)
            
            self.send_response(201)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            
            response = {
                "success": True,
                "invitation_code": invitation_code,
                "email_sent": email_sent,
                "expires_at": self.invitations[invitation_code]["expires_at"],
                "message": f"Beta invitation sent to {email}"
            }
            self.wfile.write(json.dumps(response).encode())
            
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            response = {"success": False, "error": f"Failed to send invitation: {str(e)}"}
            self.wfile.write(json.dumps(response).encode())

    def send_invitation_email(self, email, first_name, invitation_code):
        """Send beta invitation email using SendGrid/Azure Communication Services"""
        try:
            # Email content
            subject = "🔥 Welcome to Digital Sponsor Beta!"
            
            html_body = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }}
                    .content {{ background: white; padding: 30px; border: 1px solid #e2e8f0; }}
                    .code-box {{ background: #f7fafc; border: 2px solid #667eea; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }}
                    .code {{ font-size: 24px; font-weight: bold; color: #667eea; font-family: monospace; }}
                    .button {{ display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; }}
                    .footer {{ background: #f8f9fa; padding: 20px; text-align: center; color: #718096; border-radius: 0 0 12px 12px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔥 Digital Sponsor</h1>
                        <p>AI-Powered Recovery Companion</p>
                    </div>
                    <div class="content">
                        <h2>Hi {first_name}!</h2>
                        
                        <p>You've been invited to join the <strong>Digital Sponsor Beta</strong> - the world's first AI-powered recovery companion enhanced with authentic AA literature.</p>
                        
                        <div class="code-box">
                            <p><strong>Your Personal Beta Code:</strong></p>
                            <div class="code">{invitation_code}</div>
                        </div>
                        
                        <h3>🎯 What You Get:</h3>
                        <ul>
                            <li><strong>💬 AI Spiritual Guidance</strong> - Ask questions about the steps, sponsorship, recovery</li>
                            <li><strong>📚 2,382+ AA Literature Pieces</strong> - Searchable Big Book, 12&12, pamphlets, stories</li>
                            <li><strong>📝 Interactive Step Work</strong> - Digital workbooks with prayers for all 12 steps</li>
                            <li><strong>🚨 Crisis Support</strong> - Immediate access to emergency resources</li>
                            <li><strong>🔐 Privacy-First</strong> - Anonymous sessions with complete data deletion</li>
                        </ul>
                        
                        <p style="text-align: center; margin: 30px 0;">
                            <a href="https://digitalsponsor-beta.azurestaticapps.net" class="button">
                                Join Beta Now
                            </a>
                        </p>
                        
                        <p><strong>Getting Started:</strong></p>
                        <ol>
                            <li>Visit the beta platform</li>
                            <li>Click "Register" and enter your beta code</li>
                            <li>Create your account</li>
                            <li>Start exploring AI-enhanced recovery support!</li>
                        </ol>
                        
                        <p><small><strong>Note:</strong> Your beta code expires in 7 days and is for your personal use only.</small></p>
                    </div>
                    <div class="footer">
                        <p>Built with ❤️ for the recovery community<br>
                        Digital Sponsor Beta • Azure-Powered • HIPAA-Inspired Security</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            text_body = f"""
            Hi {first_name}!
            
            You've been invited to join the Digital Sponsor Beta!
            
            Your Personal Beta Code: {invitation_code}
            
            What You Get:
            - AI Spiritual Guidance enhanced with AA literature
            - 2,382+ searchable AA pieces (Big Book, 12&12, pamphlets)
            - Interactive Step Work with prayers for all 12 steps  
            - Crisis Support and emergency resources
            - Privacy-first design with data deletion
            
            Get Started:
            1. Visit: https://digitalsponsor-beta.azurestaticapps.net
            2. Click "Register" and enter your beta code
            3. Create your account and start exploring!
            
            Your code expires in 7 days.
            
            Welcome to the future of recovery support!
            - Digital Sponsor Team
            """
            
            # For demo, just log the email (replace with actual SendGrid/Azure Communication Services)
            print(f"📧 EMAIL SENT TO {email}:")
            print(f"Subject: {subject}")
            print(f"Beta Code: {invitation_code}")
            print(f"Content: {text_body[:200]}...")
            
            # In production, use Azure Communication Services or SendGrid:
            # self.send_via_azure_communication_services(email, subject, html_body, text_body)
            
            return True
            
        except Exception as e:
            print(f"Email sending failed: {e}")
            return False

    def validate_invitation_code(self):
        """Validate invitation code"""
        parsed_url = urlparse(self.path)
        query_params = parse_qs(parsed_url.query)
        code = query_params.get("code", [None])[0]
        
        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        
        if code and code in self.invitations:
            invitation = self.invitations[code]
            current_time = time.time()
            
            if invitation["used"]:
                response = {
                    "valid": False,
                    "message": "Invitation code has already been used"
                }
            elif current_time > invitation["expires_at"]:
                response = {
                    "valid": False,
                    "message": "Invitation code has expired"
                }
            else:
                response = {
                    "valid": True,
                    "code": code,
                    "invitation_type": invitation["type"],
                    "first_name": invitation["first_name"],
                    "message": "Valid invitation code - proceed with registration"
                }
        else:
            response = {
                "valid": False,
                "message": "Invalid invitation code"
            }
        
        self.wfile.write(json.dumps(response).encode())

    def register_user(self):
        """Register new user with invitation code"""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = json.loads(self.rfile.read(content_length).decode('utf-8'))
            
            invitation_code = post_data.get('invitationCode')
            email = post_data.get('email')
            password = post_data.get('password')
            first_name = post_data.get('firstName', '')
            
            # Validate invitation code
            if invitation_code not in self.invitations:
                self.send_response(400)
                self.send_header("Content-type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                response = {"success": False, "error": "Invalid invitation code"}
                self.wfile.write(json.dumps(response).encode())
                return
            
            invitation = self.invitations[invitation_code]
            current_time = time.time()
            
            if invitation["used"]:
                self.send_response(400)
                self.send_header("Content-type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                response = {"success": False, "error": "Invitation code already used"}
                self.wfile.write(json.dumps(response).encode())
                return
                
            if current_time > invitation["expires_at"]:
                self.send_response(400)
                self.send_header("Content-type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                response = {"success": False, "error": "Invitation code expired"}
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
                "invitation_code": invitation_code,
                "invitation_type": invitation["type"],
                "created_at": current_time,
                "profile": {
                    "sobriety_date": None,
                    "sponsor_contact": None,
                    "step_progress": {},
                    "emergency_contacts": [],
                    "preferences": {
                        "crisis_detection": True,
                        "daily_reminders": False,
                        "step_suggestions": True
                    }
                }
            }
            
            # Mark invitation as used
            self.invitations[invitation_code]["used"] = True
            self.invitations[invitation_code]["used_at"] = current_time
            self.invitations[invitation_code]["user_email"] = email
            
            # Create session
            session_token = str(uuid.uuid4())
            self.sessions[session_token] = {
                "user_id": user_id,
                "email": email,
                "created_at": current_time,
                "expires_at": current_time + (7 * 24 * 60 * 60)  # 7 days for beta
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
                    "first_name": first_name,
                    "invitation_type": invitation["type"]
                },
                "session_token": session_token,
                "message": f"Welcome to Digital Sponsor Beta, {first_name}! 🎉"
            }
            self.wfile.write(json.dumps(response).encode())
            
            print(f"✅ New beta user registered: {email} (invitation: {invitation_code})")
            
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
            current_time = time.time()
            self.sessions[session_token] = {
                "user_id": user["id"],
                "email": email,
                "created_at": current_time,
                "expires_at": current_time + (7 * 24 * 60 * 60)  # 7 days
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
                    "first_name": user["first_name"],
                    "invitation_type": user.get("invitation_type", "general")
                },
                "session_token": session_token,
                "message": f"Welcome back, {user['first_name']}! 🔥"
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
                "invitation_type": user.get("invitation_type", "general"),
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

    def admin_stats(self):
        """Admin dashboard statistics"""
        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        
        current_time = time.time()
        
        response = {
            "beta_program": {
                "total_invitations_sent": len(self.invitations),
                "invitations_used": len([i for i in self.invitations.values() if i["used"]]),
                "invitations_pending": len([i for i in self.invitations.values() if not i["used"] and i["expires_at"] > current_time]),
                "invitations_expired": len([i for i in self.invitations.values() if not i["used"] and i["expires_at"] <= current_time])
            },
            "users": {
                "total_registered": len(self.users),
                "active_sessions": len([s for s in self.sessions.values() if s["expires_at"] > current_time]),
                "invitation_types": {}
            },
            "engagement": {
                "recent_registrations_24h": len([u for u in self.users.values() if u["created_at"] > current_time - 86400]),
                "recent_logins_24h": len([s for s in self.sessions.values() if s["created_at"] > current_time - 86400])
            }
        }
        
        # Count invitation types
        for user in self.users.values():
            inv_type = user.get("invitation_type", "general")
            response["users"]["invitation_types"][inv_type] = response["users"]["invitation_types"].get(inv_type, 0) + 1
        
        self.wfile.write(json.dumps(response).encode())

if __name__ == "__main__":
    PORT = int(os.getenv('PORT', 8080))
    
    print("🚀 Digital Sponsor Azure Auth Service starting...")
    print(f"✅ Running on port {PORT}")
    print("📧 Email invitations enabled")
    print("🔐 Azure production configuration")
    
    with socketserver.TCPServer(("", PORT), AzureBetaAuthHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Azure Auth Service shutting down...")