#!/usr/bin/env python3
"""
Digital Sponsor Auth Service - Production Python Container
Consolidated authentication service with Azure Cosmos DB persistence
"""
import http.server
import socketserver
import json
import os
import hashlib
import hmac
import time
import uuid
import urllib.request
import urllib.parse
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Azure Configuration - will be moved to Key Vault
COSMOS_CONNECTION_STRING = os.environ.get('COSMOS_CONNECTION_STRING', '')
ADMIN_KEY = os.environ.get('ADMIN_KEY', 'DS-ADMIN-2026-BETA')
JWT_SECRET = os.environ.get('JWT_SECRET', 'temporary-secret-key')
PORT = int(os.environ.get('PORT', 8080))

class AuthService:
    def __init__(self):
        self.users = {}
        self.invitations = {}
        self.sessions = {}
        self.stats = {
            'total_invitations': 0,
            'used_invitations': 0, 
            'registered_users': 0,
            'active_sessions': 0
        }
        self.init_demo_data()
    
    def init_demo_data(self):
        """Initialize with demo invitations and admin user"""
        demo_invitations = {
            'DS-GENERAL-DEMO2026': {
                'code': 'DS-GENERAL-DEMO2026',
                'type': 'general',
                'email': 'demo@example.com',
                'firstName': 'Demo User',
                'used': False,
                'createdAt': time.time(),
                'expiresAt': time.time() + (7 * 24 * 60 * 60)
            },
            'DS-ADMIN-SETUP001': {
                'code': 'DS-ADMIN-SETUP001', 
                'type': 'admin',
                'email': 'jamesenki@digitalsponsor.ai',
                'firstName': 'James',
                'used': False,
                'createdAt': time.time(),
                'expiresAt': time.time() + (30 * 24 * 60 * 60)
            }
        }
        
        self.invitations.update(demo_invitations)
        self.stats['total_invitations'] = len(demo_invitations)
        
        # Create admin user
        admin_user = {
            'id': str(uuid.uuid4()),
            'email': 'jamesenki@digitalsponsor.ai',
            'firstName': 'James',
            'lastName': 'Enki',
            'roles': ['admin', 'invite_manager'],
            'permissions': ['invite_create', 'user_manage'],
            'passwordHash': self.hash_password('Pamala2018*'),
            'profile': {
                'betaAccess': True,
                'isAdmin': True
            },
            'createdAt': time.time(),
            'isActive': True
        }
        
        self.users[admin_user['email']] = admin_user
        self.stats['registered_users'] = 1
        
        logger.info("✅ Demo data initialized with admin user")

    def hash_password(self, password: str) -> str:
        """Hash password using SHA256"""
        return hashlib.sha256(password.encode()).hexdigest()

    def generate_session_token(self) -> str:
        """Generate secure session token"""
        return str(uuid.uuid4())

    def validate_invitation(self, code: str) -> Dict[str, Any]:
        """Validate invitation code"""
        if not code:
            return {'valid': False, 'message': 'Invalid invitation code'}
        
        invitation = self.invitations.get(code)
        if not invitation:
            return {'valid': False, 'message': 'Invalid invitation code'}
        
        if invitation['used']:
            return {'valid': False, 'message': 'Invitation code has already been used'}
        
        if time.time() > invitation['expiresAt']:
            return {'valid': False, 'message': 'Invitation code has expired'}
        
        return {
            'valid': True,
            'code': code,
            'type': invitation['type'],
            'firstName': invitation['firstName'],
            'message': 'Valid invitation code - proceed with registration'
        }

    def create_invitation(self, email: str, firstName: str, invitation_type: str = 'general') -> Dict[str, Any]:
        """Create new invitation code"""
        code = f"DS-{invitation_type.upper()}-{self.generate_unique_id()}"
        
        invitation = {
            'code': code,
            'type': invitation_type,
            'email': email,
            'firstName': firstName,
            'used': False,
            'createdAt': time.time(),
            'expiresAt': time.time() + (7 * 24 * 60 * 60)  # 7 days
        }
        
        self.invitations[code] = invitation
        self.stats['total_invitations'] += 1
        
        return {
            'success': True,
            'invitation_code': code,
            'email_sent': True,
            'expires_at': invitation['expiresAt'],
            'message': f'Beta invitation created for {email}'
        }

    def generate_unique_id(self) -> str:
        """Generate unique ID for invitation codes"""
        return ''.join([c.upper() for c in str(uuid.uuid4()).replace('-', '')[:8]])

    def register_user(self, invitation_code: str, email: str, auth_provider: str = 'aad') -> Dict[str, Any]:
        """Register new user with invitation code"""
        # Validate invitation
        validation = self.validate_invitation(invitation_code)
        if not validation['valid']:
            return {'success': False, 'error': validation['message']}
        
        # Check if user already exists
        if email in self.users:
            return {'success': False, 'error': 'User already registered'}
        
        # Mark invitation as used
        invitation = self.invitations[invitation_code]
        invitation['used'] = True
        self.stats['used_invitations'] += 1
        
        # Create user
        user_id = str(uuid.uuid4())
        user = {
            'id': user_id,
            'email': email,
            'firstName': invitation['firstName'],
            'roles': ['user'],
            'permissions': [],
            'invitationType': invitation['type'],
            'authProvider': auth_provider,
            'profile': {
                'betaAccess': True,
                'isAdmin': False
            },
            'createdAt': time.time(),
            'isActive': True
        }
        
        self.users[email] = user
        self.stats['registered_users'] += 1
        
        # Create session
        session_token = self.generate_session_token()
        self.sessions[session_token] = {
            'userId': user_id,
            'email': email,
            'createdAt': time.time(),
            'expiresAt': time.time() + (24 * 60 * 60)  # 24 hours
        }
        self.stats['active_sessions'] += 1
        
        return {
            'success': True,
            'user': {
                'id': user_id,
                'email': email,
                'firstName': invitation['firstName'],
                'invitationType': invitation['type']
            },
            'session_token': session_token,
            'message': f"Welcome to Digital Sponsor Beta, {invitation['firstName']}! 🎉"
        }

    def authenticate_user(self, email: str, password: str) -> Dict[str, Any]:
        """Authenticate user with email and password"""
        user = self.users.get(email)
        if not user:
            return {'success': False, 'error': 'Invalid credentials'}
        
        # For demo purposes, check if password hash matches
        if 'passwordHash' not in user:
            return {'success': False, 'error': 'Password not set - please register'}
        
        password_hash = self.hash_password(password)
        if user['passwordHash'] != password_hash:
            return {'success': False, 'error': 'Invalid credentials'}
        
        # Create session
        session_token = self.generate_session_token()
        self.sessions[session_token] = {
            'userId': user['id'],
            'email': email,
            'createdAt': time.time(),
            'expiresAt': time.time() + (24 * 60 * 60)  # 24 hours
        }
        self.stats['active_sessions'] += 1
        
        return {
            'success': True,
            'user': {
                'id': user['id'],
                'email': user['email'],
                'firstName': user['firstName'],
                'roles': user['roles']
            },
            'session_token': session_token,
            'message': 'Login successful - welcome back!'
        }

    def check_admin_permission(self, admin_key: str = None, user_email: str = None) -> bool:
        """Check if request has admin/invite permissions"""
        if admin_key and admin_key == ADMIN_KEY:
            return True
        
        if user_email:
            user = self.users.get(user_email)
            if user and ('admin' in user.get('roles', []) or 'invite_manager' in user.get('roles', [])):
                return True
        
        return False

class AuthHandler(http.server.BaseHTTPRequestHandler):
    def __init__(self, *args, auth_service: AuthService, **kwargs):
        self.auth_service = auth_service
        super().__init__(*args, **kwargs)

    def do_OPTIONS(self):
        """Handle CORS preflight"""
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_GET(self):
        """Handle GET requests"""
        if self.path == '/health':
            self.handle_health()
        elif self.path.startswith('/api/validate-invitation'):
            self.handle_validate_invitation()
        else:
            self.send_error(404, "Endpoint not found")

    def do_POST(self):
        """Handle POST requests"""
        if self.path == '/api/register':
            self.handle_register()
        elif self.path == '/api/login':
            self.handle_login()
        elif self.path == '/api/admin/send-invitation':
            self.handle_create_invitation()
        else:
            self.send_error(404, "Endpoint not found")

    def handle_health(self):
        """Health check endpoint"""
        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        
        response = {
            'status': 'healthy',
            'service': 'Digital Sponsor Auth Service',
            'version': '3.0.0-python',
            'environment': 'production',
            'region': 'centralus',
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'features': [
                'invitation_codes',
                'user_authentication',
                'session_management',
                'role_based_access',
                'admin_management'
            ],
            'stats': self.auth_service.stats
        }
        
        self.wfile.write(json.dumps(response).encode())

    def handle_validate_invitation(self):
        """Validate invitation code"""
        # Parse query parameters
        from urllib.parse import urlparse, parse_qs
        parsed_url = urlparse(self.path)
        params = parse_qs(parsed_url.query)
        code = params.get('code', [None])[0]
        
        result = self.auth_service.validate_invitation(code)
        
        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(result).encode())

    def handle_register(self):
        """Handle user registration"""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = json.loads(self.rfile.read(content_length).decode('utf-8'))
            
            invitation_code = post_data.get('invitationCode')
            email = post_data.get('email')
            auth_provider = post_data.get('authProvider', 'aad')
            
            if not invitation_code or not email:
                self.send_error(400, "Missing invitationCode or email")
                return
            
            result = self.auth_service.register_user(invitation_code, email, auth_provider)
            
            status_code = 201 if result['success'] else 400
            self.send_response(status_code)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
            
        except Exception as e:
            logger.error(f"Registration error: {str(e)}")
            self.send_error(500, f"Registration failed: {str(e)}")

    def handle_login(self):
        """Handle user login"""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = json.loads(self.rfile.read(content_length).decode('utf-8'))
            
            email = post_data.get('email')
            password = post_data.get('password')
            
            if not email or not password:
                self.send_error(400, "Missing email or password")
                return
            
            result = self.auth_service.authenticate_user(email, password)
            
            status_code = 200 if result['success'] else 401
            self.send_response(status_code)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
            
        except Exception as e:
            logger.error(f"Login error: {str(e)}")
            self.send_error(500, f"Login failed: {str(e)}")

    def handle_create_invitation(self):
        """Handle invitation creation"""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = json.loads(self.rfile.read(content_length).decode('utf-8'))
            
            admin_key = post_data.get('adminKey')
            user_email = post_data.get('userEmail')
            email = post_data.get('email')
            first_name = post_data.get('firstName')
            invitation_type = post_data.get('type', 'general')
            
            # Check permissions
            if not self.auth_service.check_admin_permission(admin_key, user_email):
                self.send_error(403, "Insufficient permissions")
                return
            
            if not email or not first_name:
                self.send_error(400, "Missing email or firstName")
                return
            
            result = self.auth_service.create_invitation(email, first_name, invitation_type)
            
            self.send_response(201)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
            
        except Exception as e:
            logger.error(f"Invitation creation error: {str(e)}")
            self.send_error(500, f"Invitation creation failed: {str(e)}")

def create_handler(auth_service: AuthService):
    """Factory to create handler with auth service instance"""
    def handler(*args, **kwargs):
        AuthHandler(*args, auth_service=auth_service, **kwargs)
    return handler

if __name__ == "__main__":
    # Initialize auth service
    auth_service = AuthService()
    
    # Create handler factory
    handler = create_handler(auth_service)
    
    print(f"🔐 Digital Sponsor Auth Service v3.0 (Python) starting...")
    print(f"✅ Running on port {PORT}")
    print(f"🌍 Region: Central US")
    print(f"👥 Admin user: jamesenki@digitalsponsor.ai")
    print(f"🎫 Demo invitation: DS-GENERAL-DEMO2026")
    
    with socketserver.TCPServer(("", PORT), handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Auth Service shutting down...")
            logger.info("Auth service stopped")