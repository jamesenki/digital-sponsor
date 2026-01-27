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
import time
import uuid
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import Dict, Any, Optional
import logging

# Import shared Cosmos DB client
import sys
sys.path.insert(0, '/app')
from shared.cosmos_client import UserRepository, CosmosDBClient, EncryptedDataRepository

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Azure Configuration
ADMIN_KEY = os.environ.get('ADMIN_KEY', 'DS-ADMIN-2026-BETA')
JWT_SECRET = os.environ.get('JWT_SECRET', 'temporary-secret-key')
PORT = int(os.environ.get('PORT', 8080))

# Email Configuration
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'noreply@commonsolution.org')
APP_URL = os.environ.get('APP_URL', 'https://commonsolution.org')


def send_beta_invitation_email(to_email: str, first_name: str, invite_code: str) -> bool:
    """Send beta invitation email with code and instructions"""
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.warning("SMTP not configured - email not sent")
        return False

    subject = "Welcome to Digital Sponsor Beta - Your Invitation Code"

    html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }}
        .code-box {{ background: #edf2f7; padding: 20px; border-radius: 8px; font-family: monospace; font-size: 1.4rem; font-weight: bold; color: #4a5568; text-align: center; margin: 20px 0; border: 2px dashed #667eea; }}
        .warning {{ background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin: 20px 0; }}
        .cta-button {{ display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; }}
        .section {{ background: white; padding: 20px; border-radius: 8px; margin: 15px 0; border: 1px solid #e2e8f0; }}
        .footer {{ text-align: center; padding: 20px; color: #718096; font-size: 0.85rem; }}
        ul {{ padding-left: 20px; }}
        li {{ margin: 8px 0; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>Welcome to Digital Sponsor Beta</h1>
        <p>Your AI-Powered Recovery Companion</p>
    </div>
    <div class="content">
        <p>Dear {first_name or 'Friend'},</p>

        <p>You've been invited to the <strong>Digital Sponsor Beta</strong> - an AI companion designed to support your recovery journey in Alcoholics Anonymous.</p>

        <div class="code-box">
            Your Invitation Code:<br>
            <span style="font-size: 1.6rem; letter-spacing: 2px;">{invite_code}</span>
        </div>

        <div style="text-align: center; margin: 25px 0;">
            <a href="{APP_URL}" class="cta-button">Register Now</a>
        </div>

        <div class="warning">
            <strong>Important:</strong> Digital Sponsor is a <em>supplement</em>, not a replacement for human sponsorship, AA meetings, or professional treatment. Nothing replaces the fellowship and wisdom of working with a human sponsor.
        </div>

        <div class="section">
            <h3>What You Can Do:</h3>
            <ul>
                <li><strong>Ask Questions:</strong> "What does the Big Book say about resentments?"</li>
                <li><strong>Work the Steps:</strong> Interactive worksheets for all 12 Steps</li>
                <li><strong>Search Literature:</strong> Big Book, 12&12, Daily Reflections</li>
                <li><strong>Track Progress:</strong> Sobriety counter, step work, daily inventory</li>
            </ul>
        </div>

        <div class="section">
            <h3>Getting Started:</h3>
            <ol>
                <li>Go to <a href="{APP_URL}">{APP_URL}</a></li>
                <li>Click "Register"</li>
                <li>Enter your invitation code: <strong>{invite_code}</strong></li>
                <li>Create your account</li>
            </ol>
        </div>

        <div class="section">
            <h3>Your Code Expires In:</h3>
            <p style="text-align: center; font-size: 1.2rem; color: #e53e3e;"><strong>72 Hours</strong></p>
        </div>

        <p>Questions? Reply to this email or reach out to us.</p>

        <p>In fellowship,<br>
        <strong>The Digital Sponsor Team</strong></p>
    </div>
    <div class="footer">
        <p>Digital Sponsor is not affiliated with Alcoholics Anonymous World Services, Inc.</p>
        <p>If you're in crisis, call the AA Hotline: 1-800-839-1686 or 911</p>
    </div>
</body>
</html>
"""

    text_body = f"""
Dear {first_name or 'Friend'},

Welcome to Digital Sponsor Beta!

Your Invitation Code: {invite_code}

Register at: {APP_URL}

IMPORTANT: Digital Sponsor is a supplement, not a replacement for human sponsorship, AA meetings, or professional treatment.

What You Can Do:
- Ask Questions: "What does the Big Book say about resentments?"
- Work the Steps: Interactive worksheets for all 12 Steps
- Search Literature: Big Book, 12&12, Daily Reflections
- Track Progress: Sobriety counter, step work, daily inventory

Getting Started:
1. Go to {APP_URL}
2. Click "Register"
3. Enter code: {invite_code}
4. Create your account

Your code expires in 72 hours.

In fellowship,
The Digital Sponsor Team

---
Digital Sponsor is not affiliated with AA World Services.
Crisis? Call AA Hotline: 1-800-839-1686 or 911
"""

    try:
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = f"Digital Sponsor <{SENDER_EMAIL}>"
        message["To"] = to_email

        message.attach(MIMEText(text_body, "plain"))
        message.attach(MIMEText(html_body, "html"))

        context = ssl.create_default_context()
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls(context=context)
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SENDER_EMAIL, to_email, message.as_string())

        logger.info(f"Invitation email sent to {to_email}")
        return True

    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return False


class AuthService:
    def __init__(self):
        # Initialize Cosmos DB repositories
        self.cosmos_client = CosmosDBClient()
        self.user_repo = UserRepository(self.cosmos_client)
        self.encrypted_data_repo = EncryptedDataRepository(self.cosmos_client)

        # Track stats
        self.stats = {
            'total_invitations': 0,
            'used_invitations': 0,
            'registered_users': 0,
            'active_sessions': 0
        }

        # Initialize demo data if needed
        self.init_demo_data()

    def init_demo_data(self):
        """Initialize with demo invitations and admin user"""
        # Check if admin user exists
        admin_email = 'jamesenki@digitalsponsor.ai'
        admin = self.user_repo.get_user_by_email(admin_email)

        if not admin:
            logger.info("Creating admin user...")
            admin = self.user_repo.create_user(
                email=admin_email,
                first_name='James',
                last_name='Enki',
                password_hash=self.hash_password('Pamala2018*'),
                roles=['admin', 'invite_manager'],
                invitation_type='admin',
                auth_provider='local'
            )
            self.stats['registered_users'] = 1
            logger.info("Admin user created")
        else:
            logger.info("Admin user already exists")
            self.stats['registered_users'] += 1

        # Check if demo invitation exists
        demo_code = 'DS-GENERAL-DEMO2026'
        demo_invitation = self.user_repo.get_invitation_by_code(demo_code)

        if not demo_invitation:
            logger.info("Creating demo invitation...")
            # Create demo invitation manually with specific code
            invitation_id = f"inv_{demo_code}"
            demo_inv = {
                'id': invitation_id,
                'docType': 'invitation',
                'userId': invitation_id,
                'code': demo_code,
                'type': 'general',
                'email': 'demo@example.com',
                'firstName': 'Demo User',
                'used': False,
                'usedBy': None,
                'usedAt': None,
                'expiresAt': time.time() + (7 * 24 * 60 * 60)
            }
            self.cosmos_client.create('UserSessions', demo_inv)
            self.stats['total_invitations'] = 1
            logger.info("Demo invitation created: DS-GENERAL-DEMO2026")
        else:
            logger.info("Demo invitation already exists")
            self.stats['total_invitations'] += 1

        # Check if admin setup invitation exists
        admin_code = 'DS-ADMIN-SETUP001'
        admin_invitation = self.user_repo.get_invitation_by_code(admin_code)

        if not admin_invitation:
            logger.info("Creating admin setup invitation...")
            invitation_id = f"inv_{admin_code}"
            admin_inv = {
                'id': invitation_id,
                'docType': 'invitation',
                'userId': invitation_id,
                'code': admin_code,
                'type': 'admin',
                'email': 'jamesenki@digitalsponsor.ai',
                'firstName': 'James',
                'used': False,
                'usedBy': None,
                'usedAt': None,
                'expiresAt': time.time() + (30 * 24 * 60 * 60)
            }
            self.cosmos_client.create('UserSessions', admin_inv)
            self.stats['total_invitations'] += 1
            logger.info("Admin setup invitation created: DS-ADMIN-SETUP001")

        logger.info("Demo data initialized")

    def hash_password(self, password: str) -> str:
        """Hash password using SHA256"""
        return hashlib.sha256(password.encode()).hexdigest()

    def validate_invitation(self, code: str) -> Dict[str, Any]:
        """Validate invitation code"""
        return self.user_repo.validate_invitation(code)

    def create_invitation(self, email: str, firstName: str, invitation_type: str = 'general') -> Dict[str, Any]:
        """Create new invitation code and send email"""
        invitation = self.user_repo.create_invitation(email, firstName, invitation_type)
        self.stats['total_invitations'] += 1

        # Send invitation email
        email_sent = send_beta_invitation_email(email, firstName, invitation['code'])

        return {
            'success': True,
            'invitation_code': invitation['code'],
            'email_sent': email_sent,
            'expires_at': invitation['expiresAt'],
            'message': f'Beta invitation created for {email}' + (' - email sent!' if email_sent else ' - email not sent (SMTP not configured)')
        }

    def register_user(self, invitation_code: str, email: str, auth_provider: str = 'aad',
                      display_name: str = '', phone: str = '', password: str = '') -> Dict[str, Any]:
        """Register new user with invitation code"""
        # Validate invitation
        validation = self.validate_invitation(invitation_code)
        if not validation['valid']:
            return {'success': False, 'error': validation['message']}

        # Check if user already exists
        existing = self.user_repo.get_user_by_email(email)
        if existing:
            return {'success': False, 'error': 'User already registered'}

        # Get invitation details
        invitation = self.user_repo.get_invitation_by_code(invitation_code)

        # Use display_name from form, fallback to invitation firstName
        final_display_name = display_name or invitation.get('firstName', '')

        # Hash password if provided
        password_hash = self.hash_password(password) if password else ''

        # Create user with new fields
        user = self.user_repo.create_user(
            email=email,
            first_name=invitation.get('firstName', final_display_name),
            roles=['user'],
            invitation_type=invitation['type'],
            auth_provider=auth_provider,
            display_name=final_display_name,
            phone=phone,
            password_hash=password_hash
        )

        # Mark invitation as used
        self.user_repo.mark_invitation_used(invitation_code, user['id'])
        self.stats['used_invitations'] += 1
        self.stats['registered_users'] += 1

        # Create session
        session = self.user_repo.create_session(user['id'], email)
        self.stats['active_sessions'] += 1

        return {
            'success': True,
            'user': {
                'id': user['id'],
                'email': email,
                'displayName': final_display_name,
                'firstName': invitation.get('firstName', final_display_name),
                'phone': phone,
                'encryptionSalt': user.get('encryptionSalt', ''),
                'invitationType': invitation['type']
            },
            'session_token': session['id'],
            'message': f"Welcome to Digital Sponsor Beta, {final_display_name}!"
        }

    def authenticate_user(self, email: str, password: str) -> Dict[str, Any]:
        """Authenticate user with email and password"""
        user = self.user_repo.get_user_by_email(email)
        if not user:
            return {'success': False, 'error': 'Invalid credentials'}

        # Check if password hash matches
        if 'passwordHash' not in user or not user['passwordHash']:
            return {'success': False, 'error': 'Password not set - please register'}

        password_hash = self.hash_password(password)
        if user['passwordHash'] != password_hash:
            return {'success': False, 'error': 'Invalid credentials'}

        # Create session
        session = self.user_repo.create_session(user['id'], email)
        self.stats['active_sessions'] += 1

        return {
            'success': True,
            'user': {
                'id': user['id'],
                'email': user['email'],
                'displayName': user.get('displayName', user.get('firstName', '')),
                'firstName': user.get('firstName', ''),
                'phone': user.get('phone', ''),
                'encryptionSalt': user.get('encryptionSalt', ''),
                'roles': user.get('roles', ['user']),
                'profile': user.get('profile', {})
            },
            'session_token': session['id'],
            'message': f"Login successful - welcome back, {user.get('displayName', user.get('firstName', 'friend'))}!"
        }

    def check_admin_permission(self, admin_key: str = None, user_email: str = None) -> bool:
        """Check if request has admin/invite permissions"""
        if admin_key and admin_key == ADMIN_KEY:
            return True

        if user_email:
            user = self.user_repo.get_user_by_email(user_email)
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
        elif self.path.startswith('/api/user/') and '/data/' in self.path:
            self.handle_get_encrypted_data()
        elif self.path.startswith('/api/user/') and '/history' in self.path:
            self.handle_get_user_history()
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
        elif self.path.startswith('/api/user/') and '/data/' in self.path:
            self.handle_save_encrypted_data()
        else:
            self.send_error(404, "Endpoint not found")

    def do_DELETE(self):
        """Handle DELETE requests"""
        if self.path.startswith('/api/user/') and '/data/' in self.path:
            self.handle_delete_encrypted_data()
        elif self.path.startswith('/api/user/') and '/data' == self.path.split('/')[-1]:
            self.handle_delete_all_user_data()
        elif self.path.startswith('/api/user/') and '/history' in self.path:
            self.handle_delete_user_history()
        else:
            self.send_error(404, "Endpoint not found")

    def handle_health(self):
        """Health check endpoint"""
        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()

        db_health = self.auth_service.cosmos_client.health_check()

        response = {
            'status': 'healthy',
            'service': 'Digital Sponsor Auth Service',
            'version': '4.0.0-cosmos',
            'environment': 'production',
            'region': 'centralus',
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'features': [
                'invitation_codes',
                'user_authentication',
                'session_management',
                'role_based_access',
                'admin_management',
                'cosmos_db_persistence'
            ],
            'database': db_health,
            'stats': self.auth_service.stats
        }

        self.wfile.write(json.dumps(response).encode())

    def handle_validate_invitation(self):
        """Validate invitation code"""
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
            auth_provider = post_data.get('authProvider', 'local')
            display_name = post_data.get('displayName', '')
            phone = post_data.get('phone', '')
            password = post_data.get('password', '')

            if not invitation_code or not email:
                self.send_error(400, "Missing invitationCode or email")
                return

            result = self.auth_service.register_user(
                invitation_code, email, auth_provider,
                display_name=display_name, phone=phone, password=password
            )

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

    def handle_get_user_history(self):
        """Get user search and chat history"""
        try:
            from urllib.parse import urlparse
            parsed_url = urlparse(self.path)
            # Path: /api/user/{userId}/history
            parts = parsed_url.path.split('/')
            user_id = parts[3] if len(parts) > 3 else None

            if not user_id:
                self.send_error(400, "Missing user ID")
                return

            history = self.auth_service.user_repo.get_user_history(user_id)

            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()

            response = {
                'success': True,
                'userId': user_id,
                'history': history
            }
            self.wfile.write(json.dumps(response).encode())

        except Exception as e:
            logger.error(f"Get history error: {str(e)}")
            self.send_error(500, f"Failed to get history: {str(e)}")

    def handle_delete_user_history(self):
        """Delete user search and chat history (GDPR)"""
        try:
            from urllib.parse import urlparse
            parsed_url = urlparse(self.path)
            parts = parsed_url.path.split('/')
            user_id = parts[3] if len(parts) > 3 else None

            if not user_id:
                self.send_error(400, "Missing user ID")
                return

            success = self.auth_service.user_repo.clear_user_history(user_id)

            self.send_response(200 if success else 500)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()

            response = {
                'success': success,
                'message': 'History cleared' if success else 'Failed to clear history'
            }
            self.wfile.write(json.dumps(response).encode())

        except Exception as e:
            logger.error(f"Delete history error: {str(e)}")
            self.send_error(500, f"Failed to delete history: {str(e)}")

    def _parse_user_data_path(self):
        """Parse /api/user/{userId}/data/{dataType} path"""
        from urllib.parse import urlparse
        parsed_url = urlparse(self.path)
        parts = parsed_url.path.split('/')
        # /api/user/{userId}/data/{dataType}
        # 0  /  1   /  2   /  3  /    4
        user_id = parts[3] if len(parts) > 3 else None
        data_type = parts[5] if len(parts) > 5 else None
        return user_id, data_type

    def handle_get_encrypted_data(self):
        """Get encrypted user data (step work or chat)"""
        try:
            user_id, data_type = self._parse_user_data_path()

            if not user_id or not data_type:
                self.send_error(400, "Missing user ID or data type")
                return

            if data_type not in ['stepwork', 'chat']:
                self.send_error(400, "Invalid data type. Use 'stepwork' or 'chat'")
                return

            items = self.auth_service.encrypted_data_repo.get_encrypted_data(user_id, data_type)

            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()

            response = {
                'success': True,
                'userId': user_id,
                'dataType': data_type,
                'items': items,
                'count': len(items)
            }
            self.wfile.write(json.dumps(response).encode())

        except Exception as e:
            logger.error(f"Get encrypted data error: {str(e)}")
            self.send_error(500, f"Failed to get encrypted data: {str(e)}")

    def handle_save_encrypted_data(self):
        """Save encrypted user data"""
        try:
            user_id, data_type = self._parse_user_data_path()

            if not user_id or not data_type:
                self.send_error(400, "Missing user ID or data type")
                return

            if data_type not in ['stepwork', 'chat']:
                self.send_error(400, "Invalid data type. Use 'stepwork' or 'chat'")
                return

            content_length = int(self.headers.get('Content-Length', 0))
            post_data = json.loads(self.rfile.read(content_length).decode('utf-8'))

            item_id = post_data.get('itemId')
            encrypted_payload = post_data.get('encryptedPayload')
            metadata = post_data.get('metadata', {})

            if not item_id or not encrypted_payload:
                self.send_error(400, "Missing itemId or encryptedPayload")
                return

            result = self.auth_service.encrypted_data_repo.save_encrypted_data(
                user_id, data_type, item_id, encrypted_payload, metadata
            )

            self.send_response(201)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()

            response = {
                'success': True,
                'message': f'{data_type} data saved successfully',
                'itemId': item_id
            }
            self.wfile.write(json.dumps(response).encode())

        except Exception as e:
            logger.error(f"Save encrypted data error: {str(e)}")
            self.send_error(500, f"Failed to save encrypted data: {str(e)}")

    def handle_delete_encrypted_data(self):
        """Delete encrypted user data of a specific type"""
        try:
            user_id, data_type = self._parse_user_data_path()

            if not user_id or not data_type:
                self.send_error(400, "Missing user ID or data type")
                return

            if data_type not in ['stepwork', 'chat']:
                self.send_error(400, "Invalid data type. Use 'stepwork' or 'chat'")
                return

            success = self.auth_service.encrypted_data_repo.delete_encrypted_data(user_id, data_type)

            self.send_response(200 if success else 500)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()

            response = {
                'success': success,
                'message': f'{data_type} data deleted' if success else f'Failed to delete {data_type} data'
            }
            self.wfile.write(json.dumps(response).encode())

        except Exception as e:
            logger.error(f"Delete encrypted data error: {str(e)}")
            self.send_error(500, f"Failed to delete encrypted data: {str(e)}")

    def handle_delete_all_user_data(self):
        """Delete ALL encrypted user data (GDPR compliance)"""
        try:
            from urllib.parse import urlparse
            parsed_url = urlparse(self.path)
            parts = parsed_url.path.split('/')
            user_id = parts[3] if len(parts) > 3 else None

            if not user_id:
                self.send_error(400, "Missing user ID")
                return

            success = self.auth_service.encrypted_data_repo.delete_all_user_data(user_id)

            self.send_response(200 if success else 500)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()

            response = {
                'success': success,
                'message': 'All user data deleted' if success else 'Failed to delete user data'
            }
            self.wfile.write(json.dumps(response).encode())

        except Exception as e:
            logger.error(f"Delete all user data error: {str(e)}")
            self.send_error(500, f"Failed to delete all user data: {str(e)}")


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

    db_mode = "Cosmos DB" if not auth_service.cosmos_client._in_memory_mode else "In-Memory"

    print(f"Digital Sponsor Auth Service v4.0 (Python) starting...")
    print(f"Running on port {PORT}")
    print(f"Region: Central US")
    print(f"Database: {db_mode}")
    print(f"Admin user: jamesenki@digitalsponsor.ai")
    print(f"Demo invitation: DS-GENERAL-DEMO2026")

    with socketserver.TCPServer(("", PORT), handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nAuth Service shutting down...")
            logger.info("Auth service stopped")
