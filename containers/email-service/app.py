#!/usr/bin/env python3
"""
Digital Sponsor Email Service
Handles beta invitations, registration confirmations, and notification emails.
"""

import http.server
import socketserver
import json
import os
import urllib.request
import uuid
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field

# Email Configuration (Azure Communication Services or SMTP)
EMAIL_SERVICE_TYPE = os.environ.get('EMAIL_SERVICE_TYPE', 'azure')  # 'azure' or 'smtp'

# Azure Communication Services
AZURE_COMMUNICATION_ENDPOINT = os.environ.get('AZURE_COMMUNICATION_ENDPOINT', '')
AZURE_COMMUNICATION_KEY = os.environ.get('AZURE_COMMUNICATION_KEY', '')

# SMTP Configuration (fallback)
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')

# Application Configuration
APP_NAME = 'Digital Sponsor'
APP_URL = os.environ.get('APP_URL', 'https://digitalsponsor.commonsolution.org')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'noreply@digitalsponsor.commonsolution.org')
SENDER_NAME = os.environ.get('SENDER_NAME', 'Digital Sponsor')


@dataclass
class EmailTemplate:
    """Email template with subject and body"""
    subject: str
    html_body: str
    text_body: str


# ============================================================================
# EMAIL TEMPLATES
# ============================================================================

def get_beta_invite_template(name: str, invite_code: str) -> EmailTemplate:
    """Generate beta invite email template"""
    subject = "You're Invited to Digital Sponsor Beta!"

    html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; }}
        .invite-code {{ background: #edf2f7; padding: 15px 25px; border-radius: 8px; font-family: monospace; font-size: 1.2rem; font-weight: bold; color: #4a5568; text-align: center; margin: 20px 0; border: 2px dashed #667eea; }}
        .features {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }}
        .feature {{ padding: 8px 0; border-bottom: 1px solid #f0f0f0; }}
        .feature:last-child {{ border-bottom: none; }}
        .cta-button {{ display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0; }}
        .footer {{ text-align: center; padding: 20px; color: #718096; font-size: 0.9rem; }}
        .quote {{ font-style: italic; color: #667eea; border-left: 3px solid #667eea; padding-left: 15px; margin: 20px 0; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to Digital Sponsor</h1>
            <p>Your AI-Powered Recovery Companion</p>
        </div>
        <div class="content">
            <p>Dear {name or 'Friend'},</p>

            <p>You've been invited to join the <strong>Digital Sponsor Beta</strong> - an AI-powered recovery companion designed to support your journey in sobriety.</p>

            <div class="invite-code">
                Your Invite Code: <strong>{invite_code}</strong>
            </div>

            <div class="features">
                <h3>Current Features:</h3>
                <div class="feature">AI recovery guidance based on official AA literature</div>
                <div class="feature">Interactive Step Workbooks for all 12 Steps</div>
                <div class="feature">2,400+ pieces of AA-approved literature</div>
                <div class="feature">Meditation timer with streak tracking</div>
                <div class="feature">Service work tracker</div>
                <div class="feature">Sobriety date tracking & milestones</div>
            </div>

            <div class="features">
                <h3>Coming Soon:</h3>
                <div class="feature">Enhanced semantic search</div>
                <div class="feature">Sponsor discussion suggestions</div>
                <div class="feature">Mobile app</div>
            </div>

            <div style="text-align: center;">
                <a href="{APP_URL}" class="cta-button">Get Started Now</a>
            </div>

            <div class="quote">
                "One day at a time."
            </div>

            <p>We're honored to be part of your recovery journey.</p>

            <p>In fellowship,<br>
            <strong>The Digital Sponsor Team</strong></p>
        </div>
        <div class="footer">
            <p>This email was sent to you because someone invited you to Digital Sponsor.</p>
            <p>If you didn't request this invitation, you can safely ignore this email.</p>
        </div>
    </div>
</body>
</html>
"""

    text_body = f"""
Dear {name or 'Friend'},

You've been invited to join Digital Sponsor Beta - your AI-powered recovery companion.

Your Invite Code: {invite_code}

Current Features:
- AI recovery guidance based on AA literature
- Interactive Step Workbooks for all 12 Steps
- 2,400+ pieces of AA-approved literature
- Meditation timer with streak tracking
- Service work tracker

Coming Soon:
- Enhanced semantic search
- Sponsor discussion suggestions
- Mobile app

Get Started: {APP_URL}

"One day at a time."

The Digital Sponsor Team
"""

    return EmailTemplate(subject=subject, html_body=html_body, text_body=text_body)


def get_registration_confirmation_template(name: str, verification_link: str) -> EmailTemplate:
    """Generate registration confirmation email template"""
    subject = "Welcome to Digital Sponsor - Please Verify Your Email"

    html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; }}
        .cta-button {{ display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0; }}
        .footer {{ text-align: center; padding: 20px; color: #718096; font-size: 0.9rem; }}
        .warning {{ background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin: 20px 0; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to Digital Sponsor!</h1>
            <p>Your account has been created successfully</p>
        </div>
        <div class="content">
            <p>Dear {name or 'Friend'},</p>

            <p>Thank you for joining Digital Sponsor. To complete your registration and secure your account, please verify your email address.</p>

            <div style="text-align: center;">
                <a href="{verification_link}" class="cta-button">Verify Email Address</a>
            </div>

            <p style="text-align: center; color: #718096; font-size: 0.9rem;">
                Or copy and paste this link into your browser:<br>
                <span style="word-break: break-all;">{verification_link}</span>
            </p>

            <div class="warning">
                <strong>Didn't create this account?</strong><br>
                If you didn't sign up for Digital Sponsor, you can safely ignore this email. Your email address will not be used.
            </div>

            <p>Once verified, you'll have full access to:</p>
            <ul>
                <li>AI-powered recovery guidance</li>
                <li>Interactive 12 Step Workbooks</li>
                <li>AA literature library</li>
                <li>Meditation and journaling tools</li>
            </ul>

            <p>We're honored to be part of your recovery journey.</p>

            <p>In fellowship,<br>
            <strong>The Digital Sponsor Team</strong></p>
        </div>
        <div class="footer">
            <p>This verification link will expire in 24 hours.</p>
            <p>{APP_NAME} | Your AI Recovery Companion</p>
        </div>
    </div>
</body>
</html>
"""

    text_body = f"""
Welcome to Digital Sponsor!

Dear {name or 'Friend'},

Your account has been created successfully.

Please verify your email by clicking this link:
{verification_link}

This link will expire in 24 hours.

If you didn't create this account, please ignore this email.

The Digital Sponsor Team
"""

    return EmailTemplate(subject=subject, html_body=html_body, text_body=text_body)


def get_password_reset_template(name: str, reset_link: str) -> EmailTemplate:
    """Generate password reset email template"""
    subject = "Digital Sponsor - Password Reset Request"

    html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; }}
        .cta-button {{ display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0; }}
        .footer {{ text-align: center; padding: 20px; color: #718096; font-size: 0.9rem; }}
        .warning {{ background: #fed7d7; border: 1px solid #fc8181; padding: 15px; border-radius: 8px; margin: 20px 0; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Password Reset</h1>
        </div>
        <div class="content">
            <p>Dear {name or 'Friend'},</p>

            <p>We received a request to reset your Digital Sponsor password. Click the button below to create a new password.</p>

            <div style="text-align: center;">
                <a href="{reset_link}" class="cta-button">Reset Password</a>
            </div>

            <div class="warning">
                <strong>Didn't request this?</strong><br>
                If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
            </div>

            <p>In fellowship,<br>
            <strong>The Digital Sponsor Team</strong></p>
        </div>
        <div class="footer">
            <p>This link will expire in 1 hour.</p>
        </div>
    </div>
</body>
</html>
"""

    text_body = f"""
Password Reset Request

Dear {name or 'Friend'},

We received a request to reset your Digital Sponsor password.

Reset your password: {reset_link}

This link will expire in 1 hour.

If you didn't request this, please ignore this email.

The Digital Sponsor Team
"""

    return EmailTemplate(subject=subject, html_body=html_body, text_body=text_body)


def get_milestone_template(name: str, days: int, milestone_name: str) -> EmailTemplate:
    """Generate sobriety milestone congratulations email"""
    subject = f"Congratulations on {milestone_name}!"

    quotes = [
        "Progress, not perfection.",
        "One day at a time.",
        "Keep coming back, it works if you work it.",
        "You are on the path of happy destiny.",
        "First things first.",
    ]
    import random
    quote = random.choice(quotes)

    html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #f6d365 0%, #fda085 100%); color: white; padding: 40px; text-align: center; border-radius: 8px 8px 0 0; }}
        .header h1 {{ font-size: 2rem; margin-bottom: 10px; }}
        .celebration {{ font-size: 4rem; margin-bottom: 10px; }}
        .content {{ background: #fffdf7; padding: 30px; border: 1px solid #ffeeba; border-top: none; text-align: center; }}
        .days-count {{ font-size: 3rem; font-weight: bold; color: #d69e2e; margin: 20px 0; }}
        .quote {{ font-style: italic; color: #b7791f; border-left: 3px solid #d69e2e; padding-left: 15px; margin: 20px auto; text-align: left; max-width: 400px; }}
        .footer {{ text-align: center; padding: 20px; color: #718096; font-size: 0.9rem; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="celebration">🎉</div>
            <h1>Congratulations, {name or 'Friend'}!</h1>
            <p>You've reached an incredible milestone</p>
        </div>
        <div class="content">
            <div class="days-count">{days} Days</div>
            <h2>{milestone_name}</h2>

            <p>This achievement represents your courage, commitment, and the daily choice to stay on the path of recovery.</p>

            <div class="quote">
                "{quote}"
            </div>

            <p>Keep up the amazing work. Your recovery journey inspires us all.</p>

            <p>In fellowship,<br>
            <strong>The Digital Sponsor Team</strong></p>
        </div>
        <div class="footer">
            <p>{APP_NAME} | Your AI Recovery Companion</p>
        </div>
    </div>
</body>
</html>
"""

    text_body = f"""
Congratulations, {name or 'Friend'}!

You've reached an incredible milestone:

{days} Days - {milestone_name}

"{quote}"

Keep up the amazing work!

The Digital Sponsor Team
"""

    return EmailTemplate(subject=subject, html_body=html_body, text_body=text_body)


# ============================================================================
# EMAIL SENDING
# ============================================================================

def send_email_smtp(to_email: str, template: EmailTemplate) -> Dict[str, Any]:
    """Send email via SMTP"""
    if not SMTP_USER or not SMTP_PASSWORD:
        return {'success': False, 'error': 'SMTP credentials not configured'}

    try:
        message = MIMEMultipart("alternative")
        message["Subject"] = template.subject
        message["From"] = f"{SENDER_NAME} <{SENDER_EMAIL}>"
        message["To"] = to_email

        # Add both plain text and HTML versions
        part1 = MIMEText(template.text_body, "plain")
        part2 = MIMEText(template.html_body, "html")
        message.attach(part1)
        message.attach(part2)

        # Send email
        context = ssl.create_default_context()
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls(context=context)
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SENDER_EMAIL, to_email, message.as_string())

        return {'success': True, 'message': 'Email sent successfully'}

    except Exception as e:
        return {'success': False, 'error': str(e)}


def send_email_azure(to_email: str, template: EmailTemplate) -> Dict[str, Any]:
    """Send email via Azure Communication Services"""
    if not AZURE_COMMUNICATION_ENDPOINT or not AZURE_COMMUNICATION_KEY:
        # Fallback to SMTP if Azure not configured
        return send_email_smtp(to_email, template)

    try:
        url = f"{AZURE_COMMUNICATION_ENDPOINT.rstrip('/')}/emails:send?api-version=2023-03-31"

        headers = {
            'Authorization': f'Bearer {AZURE_COMMUNICATION_KEY}',
            'Content-Type': 'application/json'
        }

        data = {
            "senderAddress": SENDER_EMAIL,
            "content": {
                "subject": template.subject,
                "plainText": template.text_body,
                "html": template.html_body
            },
            "recipients": {
                "to": [{"address": to_email}]
            }
        }

        req = urllib.request.Request(
            url,
            data=json.dumps(data).encode('utf-8'),
            headers=headers,
            method='POST'
        )

        with urllib.request.urlopen(req, timeout=30) as response:
            result = json.loads(response.read().decode('utf-8'))

        return {'success': True, 'message': 'Email sent via Azure', 'result': result}

    except Exception as e:
        # Fallback to SMTP
        print(f"Azure email failed, falling back to SMTP: {str(e)}")
        return send_email_smtp(to_email, template)


def send_email(to_email: str, template: EmailTemplate) -> Dict[str, Any]:
    """Send email using configured service"""
    if EMAIL_SERVICE_TYPE == 'azure':
        return send_email_azure(to_email, template)
    else:
        return send_email_smtp(to_email, template)


# ============================================================================
# INVITE CODE MANAGEMENT
# ============================================================================

# In-memory store for invite codes (use Redis/DB in production)
INVITE_CODES: Dict[str, Dict[str, Any]] = {}


def generate_invite_code() -> str:
    """Generate a unique invite code"""
    code = str(uuid.uuid4())[:8].upper()
    return code


def create_invite(inviter_email: str, invitee_name: Optional[str] = None) -> Dict[str, Any]:
    """Create a new beta invite"""
    code = generate_invite_code()

    INVITE_CODES[code] = {
        'code': code,
        'inviter_email': inviter_email,
        'invitee_name': invitee_name,
        'created_at': datetime.now().isoformat(),
        'used': False,
        'used_by': None,
        'used_at': None
    }

    return INVITE_CODES[code]


def validate_invite_code(code: str) -> Dict[str, Any]:
    """Validate an invite code"""
    code = code.upper().strip()

    if code not in INVITE_CODES:
        return {'valid': False, 'error': 'Invalid invite code'}

    invite = INVITE_CODES[code]
    if invite['used']:
        return {'valid': False, 'error': 'Invite code already used'}

    return {'valid': True, 'invite': invite}


def use_invite_code(code: str, email: str) -> Dict[str, Any]:
    """Mark an invite code as used"""
    code = code.upper().strip()

    if code not in INVITE_CODES:
        return {'success': False, 'error': 'Invalid invite code'}

    invite = INVITE_CODES[code]
    if invite['used']:
        return {'success': False, 'error': 'Invite code already used'}

    invite['used'] = True
    invite['used_by'] = email
    invite['used_at'] = datetime.now().isoformat()

    return {'success': True, 'message': 'Invite code redeemed'}


# ============================================================================
# HTTP HANDLER
# ============================================================================

class EmailHandler(http.server.BaseHTTPRequestHandler):
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
                'service': 'Digital Sponsor Email Service',
                'region': 'Central US',
                'email_service_type': EMAIL_SERVICE_TYPE,
                'smtp_configured': bool(SMTP_USER and SMTP_PASSWORD),
                'azure_configured': bool(AZURE_COMMUNICATION_ENDPOINT and AZURE_COMMUNICATION_KEY),
                'active_invites': len([i for i in INVITE_CODES.values() if not i['used']]),
                'timestamp': datetime.now().isoformat(),
                'version': '1.0.0'
            }
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_error(404)

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length) if content_length else b'{}'

        try:
            data = json.loads(post_data.decode('utf-8'))
        except json.JSONDecodeError:
            self.send_error(400, 'Invalid JSON')
            return

        # Beta invite endpoints
        if self.path == '/api/invite/create':
            inviter_email = data.get('inviterEmail', 'admin@digitalsponsor.commonsolution.org')
            invitee_name = data.get('inviteeName')

            invite = create_invite(inviter_email, invitee_name)

            self.send_json_response({'success': True, 'invite': invite})

        elif self.path == '/api/invite/send':
            to_email = data.get('email')
            name = data.get('name')
            invite_code = data.get('inviteCode')

            if not to_email:
                self.send_error(400, 'Email required')
                return

            # Create invite code if not provided
            if not invite_code:
                invite = create_invite('system', name)
                invite_code = invite['code']

            # Generate and send email
            template = get_beta_invite_template(name, invite_code)
            result = send_email(to_email, template)

            self.send_json_response({
                'success': result['success'],
                'message': result.get('message', result.get('error')),
                'inviteCode': invite_code
            })

        elif self.path == '/api/invite/validate':
            code = data.get('code', '')
            result = validate_invite_code(code)
            self.send_json_response(result)

        elif self.path == '/api/invite/redeem':
            code = data.get('code', '')
            email = data.get('email', '')
            result = use_invite_code(code, email)
            self.send_json_response(result)

        # Registration emails
        elif self.path == '/api/email/registration':
            to_email = data.get('email')
            name = data.get('name')
            verification_token = data.get('verificationToken', str(uuid.uuid4()))
            verification_link = f"{APP_URL}/verify?token={verification_token}"

            if not to_email:
                self.send_error(400, 'Email required')
                return

            template = get_registration_confirmation_template(name, verification_link)
            result = send_email(to_email, template)

            self.send_json_response({
                'success': result['success'],
                'message': result.get('message', result.get('error'))
            })

        # Password reset
        elif self.path == '/api/email/password-reset':
            to_email = data.get('email')
            name = data.get('name')
            reset_token = data.get('resetToken', str(uuid.uuid4()))
            reset_link = f"{APP_URL}/reset-password?token={reset_token}"

            if not to_email:
                self.send_error(400, 'Email required')
                return

            template = get_password_reset_template(name, reset_link)
            result = send_email(to_email, template)

            self.send_json_response({
                'success': result['success'],
                'message': result.get('message', result.get('error'))
            })

        # Milestone celebration
        elif self.path == '/api/email/milestone':
            to_email = data.get('email')
            name = data.get('name')
            days = data.get('days', 0)
            milestone_name = data.get('milestoneName', f'{days} Days')

            if not to_email:
                self.send_error(400, 'Email required')
                return

            template = get_milestone_template(name, days, milestone_name)
            result = send_email(to_email, template)

            self.send_json_response({
                'success': result['success'],
                'message': result.get('message', result.get('error'))
            })

        else:
            self.send_error(404)

    def send_json_response(self, data: Dict[str, Any], status: int = 200):
        """Send JSON response with CORS headers"""
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())


# ============================================================================
# MAIN
# ============================================================================

PORT = int(os.environ.get('PORT', 3004))
with socketserver.TCPServer(('', PORT), EmailHandler) as httpd:
    print(f'📧 Digital Sponsor Email Service running on port {PORT}')
    print(f'📬 Email service type: {EMAIL_SERVICE_TYPE}')
    print(f'🔑 SMTP configured: {bool(SMTP_USER and SMTP_PASSWORD)}')
    print(f'☁️  Azure configured: {bool(AZURE_COMMUNICATION_ENDPOINT)}')
    print('🌍 Region: Central US')
    httpd.serve_forever()
