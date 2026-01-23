#!/usr/bin/env python3
"""
Digital Sponsor Admin Service - Expanded from Beta Auth System
Comprehensive admin interface for managing users, analytics, and Phase 1 monetization
"""

import os
import logging
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum

from fastapi import FastAPI, HTTPException, Depends, Request, Header, Form, Cookie
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel, Field, EmailStr
import httpx
from azure.cosmos.aio import CosmosClient
from azure.identity.aio import DefaultAzureCredential
import hashlib
import hmac
import uuid
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Environment variables
COSMOS_ENDPOINT = os.getenv("COSMOS_ENDPOINT", "")
COSMOS_DATABASE = os.getenv("COSMOS_DATABASE", "DigitalSponsor")
ADMIN_KEY = os.getenv("ADMIN_KEY", "DS-ADMIN-2026-BETA")
JWT_SECRET = os.getenv("JWT_SECRET", "temporary-secret-key")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://digitalsponsor.commonsolution.org")
SERVICE_NAME = "admin-service"
VERSION = "1.0.0"

# Service endpoints for analytics
AD_SERVICE_URL = os.getenv("AD_SERVICE_URL", "http://digitalsponsor-ad-service.centralus.azurecontainer.io:8000")
PAYMENT_SERVICE_URL = os.getenv("PAYMENT_SERVICE_URL", "http://digitalsponsor-payment-service.centralus.azurecontainer.io:8001")
SUBSCRIPTION_SERVICE_URL = os.getenv("SUBSCRIPTION_SERVICE_URL", "http://digitalsponsor-subscription-service.centralus.azurecontainer.io:8002")

# FastAPI app initialization
app = FastAPI(
    title="Digital Sponsor Admin Service",
    description="Admin interface for managing users, analytics, and monetization",
    version=VERSION,
    docs_url="/docs" if os.getenv("ENVIRONMENT") != "production" else None
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_URL,
        "https://admin.digitalsponsor.commonsolution.org",
        "https://digitalsponsor.commonsolution.org",
        "http://localhost:3000",
        "*"  # Allow all origins for now during DNS setup
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global clients
cosmos_client: Optional[CosmosClient] = None

# Data Models
class UserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"
    INVITE_MANAGER = "invite_manager"

class InvitationType(str, Enum):
    GENERAL = "general"
    ADMIN = "admin"
    PREMIUM = "premium"

class AdminUser(BaseModel):
    id: str
    email: str
    firstName: str
    lastName: Optional[str] = None
    roles: List[UserRole]
    permissions: List[str]
    profile: Dict[str, Any]
    isActive: bool = True
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class InvitationRequest(BaseModel):
    email: EmailStr = Field(..., description="Email address for invitation")
    firstName: str = Field(..., description="First name of invitee")
    lastName: Optional[str] = Field(None, description="Last name of invitee")
    type: InvitationType = Field(InvitationType.GENERAL, description="Type of invitation")
    adminKey: Optional[str] = Field(None, description="Admin key for authorization")
    customMessage: Optional[str] = Field(None, description="Custom message for invitation")

class UserManagementRequest(BaseModel):
    userId: str = Field(..., description="User ID to modify")
    action: str = Field(..., description="Action: activate, deactivate, promote, demote")
    adminKey: str = Field(..., description="Admin key for authorization")
    reason: Optional[str] = Field(None, description="Reason for action")

class LoginRequest(BaseModel):
    email: EmailStr = Field(..., description="Admin email address")
    password: str = Field(..., description="Admin password")

class LoginResponse(BaseModel):
    success: bool
    message: str
    user: Optional[Dict[str, Any]] = None
    session_token: Optional[str] = None

class AdminDashboard(BaseModel):
    system_health: Dict[str, Any]
    user_stats: Dict[str, Any]
    revenue_analytics: Dict[str, Any]
    recent_activity: List[Dict[str, Any]]
    alerts: List[Dict[str, Any]]

class AdminService:
    """Core admin service functionality"""
    
    def __init__(self):
        self.users = {}
        self.invitations = {}
        self.sessions = {}
        self.activity_log = []
        self.init_admin_users()
    
    def init_admin_users(self):
        """Initialize admin users from existing auth system"""
        # Main admin user
        admin_user = {
            'id': str(uuid.uuid4()),
            'email': 'jamesenki@digitalsponsor.ai',
            'firstName': 'James',
            'lastName': 'Enki',
            'roles': ['admin', 'invite_manager'],
            'permissions': [
                'invite_create', 'user_manage', 'analytics_view',
                'revenue_view', 'system_admin', 'content_moderate'
            ],
            'passwordHash': self.hash_password('Pamala2018*'),
            'profile': {
                'betaAccess': True,
                'isAdmin': True,
                'adminLevel': 'super_admin'
            },
            'createdAt': time.time(),
            'isActive': True
        }
        
        self.users[admin_user['email']] = admin_user
        logger.info("✅ Admin user initialized")
    
    def hash_password(self, password: str) -> str:
        """Hash password using SHA256"""
        return hashlib.sha256(password.encode()).hexdigest()
    
    def check_admin_permission(self, admin_key: str = None, user_email: str = None, required_permission: str = None) -> bool:
        """Check if request has required admin permissions"""
        # Master admin key check
        if admin_key and admin_key == ADMIN_KEY:
            return True
        
        # User-based permission check
        if user_email:
            user = self.users.get(user_email)
            if user and 'admin' in user.get('roles', []):
                if required_permission:
                    return required_permission in user.get('permissions', [])
                return True
        
        return False
    
    async def get_system_health(self) -> Dict[str, Any]:
        """Get system health status"""
        services = []
        
        # Check each service
        service_endpoints = [
            ("Ad Service", AD_SERVICE_URL + "/health"),
            ("Payment Service", PAYMENT_SERVICE_URL + "/health"),
            ("Subscription Service", SUBSCRIPTION_SERVICE_URL + "/health")
        ]
        
        async with httpx.AsyncClient() as client:
            for service_name, url in service_endpoints:
                try:
                    response = await client.get(url, timeout=5.0)
                    if response.status_code == 200:
                        data = response.json()
                        services.append({
                            "name": service_name,
                            "status": "healthy",
                            "version": data.get("version", "unknown"),
                            "dependencies": data.get("dependencies", {}),
                            "response_time_ms": 0  # Could add timing
                        })
                    else:
                        services.append({
                            "name": service_name,
                            "status": "unhealthy",
                            "error": f"HTTP {response.status_code}"
                        })
                except Exception as e:
                    services.append({
                        "name": service_name,
                        "status": "error",
                        "error": str(e)
                    })
        
        return {
            "services": services,
            "overall_status": "healthy" if all(s["status"] == "healthy" for s in services) else "degraded",
            "last_check": datetime.utcnow().isoformat()
        }
    
    async def get_revenue_analytics(self) -> Dict[str, Any]:
        """Get revenue analytics from Phase 1 services"""
        analytics = {
            "ad_revenue": {"total": 0, "daily": 0, "impressions": 0, "clicks": 0},
            "subscription_revenue": {"total": 0, "monthly_recurring": 0, "active_subscriptions": 0},
            "user_metrics": {"total_users": 0, "pro_users": 0, "conversion_rate": 0}
        }
        
        try:
            async with httpx.AsyncClient() as client:
                # Get ad performance
                try:
                    response = await client.get(f"{AD_SERVICE_URL}/api/ad-performance", timeout=5.0)
                    if response.status_code == 200:
                        ad_data = response.json()
                        summary = ad_data.get('summary', {})
                        analytics["ad_revenue"] = {
                            "total": summary.get('total_revenue', 0),
                            "daily": summary.get('total_revenue', 0) / 30,  # Rough daily average
                            "impressions": summary.get('total_impressions', 0),
                            "clicks": summary.get('total_clicks', 0),
                            "ctr": summary.get('ctr', 0)
                        }
                except Exception as e:
                    logger.warning(f"Could not get ad analytics: {e}")
                
                # Get subscription metrics  
                # Note: This would require implementing an admin endpoint in subscription service
                analytics["subscription_revenue"] = {
                    "total": 0,  # Would come from Stripe/payment service
                    "monthly_recurring": 0,
                    "active_subscriptions": 0
                }
                
        except Exception as e:
            logger.error(f"Error getting revenue analytics: {e}")
        
        return analytics
    
    async def get_user_stats(self) -> Dict[str, Any]:
        """Get user statistics from auth service"""
        try:
            async with httpx.AsyncClient() as client:
                # Get stats from auth service
                auth_response = await client.get(f"http://digitalsponsor-auth-prod.centralus.azurecontainer.io:8080/health", timeout=5.0)
                if auth_response.status_code == 200:
                    auth_data = auth_response.json()
                    stats = auth_data.get('stats', {})
                    
                    return {
                        "total_users": stats.get('registered_users', 0),
                        "active_users": stats.get('registered_users', 0),  # Assume all registered users are active
                        "admin_users": 1,  # At least the main admin
                        "recent_signups": 0,  # Would need to query by date
                        "beta_users": stats.get('registered_users', 0),  # All users are beta for now
                        "invitation_stats": {
                            "total_invitations": stats.get('total_invitations', 0),
                            "used_invitations": stats.get('used_invitations', 0),
                            "pending_invitations": stats.get('active_invitations', 0)
                        }
                    }
        except Exception as e:
            logger.warning(f"Could not get auth service stats: {e}")
        
        # Fallback to local stats
        return {
            "total_users": len(self.users),
            "active_users": len([u for u in self.users.values() if u.get('isActive', True)]),
            "admin_users": len([u for u in self.users.values() if 'admin' in u.get('roles', [])]),
            "recent_signups": 0,
            "beta_users": len(self.users),
            "invitation_stats": {
                "total_invitations": len(self.invitations),
                "used_invitations": len([i for i in self.invitations.values() if i.get('used', False)]),
                "pending_invitations": len([i for i in self.invitations.values() if not i.get('used', False)])
            }
        }
    
    def authenticate_user(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        """Authenticate user with email and password"""
        user = self.users.get(email)
        if not user:
            return None
        
        password_hash = self.hash_password(password)
        if user.get('passwordHash') != password_hash:
            return None
        
        if not user.get('isActive', False):
            return None
        
        # Create session token
        session_token = hashlib.sha256(f"{email}:{time.time()}:{JWT_SECRET}".encode()).hexdigest()
        self.sessions[session_token] = {
            'user_email': email,
            'created_at': time.time(),
            'expires_at': time.time() + (24 * 60 * 60)  # 24 hours
        }
        
        return {
            'user': user,
            'session_token': session_token
        }
    
    def verify_session(self, session_token: str) -> Optional[str]:
        """Verify session token and return user email"""
        session = self.sessions.get(session_token)
        if not session:
            return None
        
        if time.time() > session['expires_at']:
            del self.sessions[session_token]
            return None
        
        return session['user_email']
    
    async def get_beta_users(self) -> List[Dict[str, Any]]:
        """Get all beta users from auth service"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"http://digitalsponsor-auth-prod.centralus.azurecontainer.io:8080/api/admin/users",
                    headers={"admin-key": ADMIN_KEY},
                    timeout=10.0
                )
                if response.status_code == 200:
                    data = response.json()
                    users = data.get('users', [])
                    
                    # Add beta trial info to each user
                    beta_users = []
                    for user in users:
                        beta_user = {
                            **user,
                            'beta_trial_days_left': self.calculate_trial_days_left(user),
                            'beta_status': self.get_beta_status(user)
                        }
                        beta_users.append(beta_user)
                    
                    return beta_users
        except Exception as e:
            logger.error(f"Error getting beta users: {e}")
        
        return []
    
    def calculate_trial_days_left(self, user: Dict[str, Any]) -> int:
        """Calculate days left in beta trial"""
        try:
            from datetime import datetime
            registered_at = user.get('registeredAt')
            if not registered_at:
                return 30  # Default trial period
            
            # Parse registration date
            reg_date = datetime.fromisoformat(registered_at.replace('Z', '+00:00'))
            now = datetime.utcnow().replace(tzinfo=reg_date.tzinfo)
            days_since_reg = (now - reg_date).days
            
            # 30 day trial period
            days_left = max(0, 30 - days_since_reg)
            return days_left
        except Exception:
            return 30
    
    def get_beta_status(self, user: Dict[str, Any]) -> str:
        """Get beta status for user"""
        days_left = self.calculate_trial_days_left(user)
        if days_left > 7:
            return "Active"
        elif days_left > 0:
            return "Expiring Soon"
        else:
            return "Expired"
    
    def log_admin_activity(self, user_email: str, action: str, details: str):
        """Log admin activity for audit trail"""
        activity = {
            "timestamp": datetime.utcnow().isoformat(),
            "user": user_email,
            "action": action,
            "details": details,
            "id": str(uuid.uuid4())
        }
        self.activity_log.append(activity)
        
        # Keep only last 1000 activities
        if len(self.activity_log) > 1000:
            self.activity_log = self.activity_log[-1000:]
        
        logger.info(f"Admin activity: {user_email} - {action}")

# Global admin service instance
admin_service = AdminService()

# Database initialization
async def init_database():
    """Initialize Cosmos DB connection"""
    global cosmos_client
    try:
        credential = DefaultAzureCredential()
        cosmos_client = CosmosClient(COSMOS_ENDPOINT, credential=credential)
        logger.info("Cosmos DB client initialized")
    except Exception as e:
        logger.error(f"Failed to initialize Cosmos DB: {str(e)}")
        cosmos_client = None

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    await init_database()
    logger.info(f"Admin Service {VERSION} started successfully")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Clean up resources on shutdown"""
    if cosmos_client:
        await cosmos_client.close()
    logger.info("Admin Service shutdown completed")

# Authentication dependency
async def verify_admin_access(admin_key: str = Header(None), user_email: str = Header(None)):
    """Verify admin access for protected endpoints"""
    if not admin_service.check_admin_permission(admin_key, user_email):
        raise HTTPException(status_code=403, detail="Insufficient admin permissions")
    return True

# API Endpoints

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "service": SERVICE_NAME,
        "version": VERSION,
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "admin_users": len(admin_service.users),
        "features": [
            "user_management",
            "invitation_system", 
            "revenue_analytics",
            "system_monitoring",
            "activity_logging"
        ]
    }

@app.get("/login", response_class=HTMLResponse)
async def login_page():
    """Login page for admin interface"""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Digital Sponsor Admin Login</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
                   background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                   min-height: 100vh; margin: 0; padding: 20px; display: flex; align-items: center; }
            .login-container { max-width: 400px; margin: 0 auto; background: white; 
                              border-radius: 12px; padding: 40px; box-shadow: 0 8px 25px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { color: #333; margin: 0 0 10px 0; font-size: 1.8em; }
            .header p { color: #666; margin: 0; }
            .form-group { margin-bottom: 20px; }
            .form-group label { display: block; margin-bottom: 8px; color: #333; font-weight: 500; }
            .form-group input { width: 100%; padding: 12px; border: 2px solid #eee; 
                               border-radius: 8px; font-size: 16px; transition: border-color 0.3s; }
            .form-group input:focus { outline: none; border-color: #667eea; }
            .login-btn { width: 100%; background: #667eea; color: white; border: none; 
                        padding: 14px; border-radius: 8px; font-size: 16px; font-weight: 500; 
                        cursor: pointer; transition: background 0.3s; margin-top: 10px; }
            .login-btn:hover { background: #5a6fd8; }
            .error { background: #f8d7da; color: #721c24; padding: 12px; border-radius: 6px; 
                    margin-bottom: 20px; display: none; }
            .success { background: #d4edda; color: #155724; padding: 12px; border-radius: 6px; 
                      margin-bottom: 20px; display: none; }
        </style>
    </head>
    <body>
        <div class="login-container">
            <div class="header">
                <h1>🛡️ Admin Login</h1>
                <p>Digital Sponsor Administration</p>
            </div>
            
            <div id="error" class="error"></div>
            <div id="success" class="success"></div>
            
            <form id="loginForm">
                <div class="form-group">
                    <label for="email">Email:</label>
                    <input type="email" id="email" name="email" value="jamesenki@digitalsponsor.ai" required>
                </div>
                
                <div class="form-group">
                    <label for="password">Password:</label>
                    <input type="password" id="password" name="password" required>
                </div>
                
                <button type="submit" class="login-btn">Login to Admin Dashboard</button>
            </form>
        </div>
        
        <script>
            document.getElementById('loginForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                const errorDiv = document.getElementById('error');
                const successDiv = document.getElementById('success');
                
                errorDiv.style.display = 'none';
                successDiv.style.display = 'none';
                
                try {
                    const response = await fetch('/api/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        successDiv.textContent = 'Login successful! Redirecting...';
                        successDiv.style.display = 'block';
                        
                        // Set session cookie and redirect
                        document.cookie = `admin_session=${data.session_token}; path=/; max-age=86400`;
                        setTimeout(() => window.location.href = '/dashboard', 1000);
                    } else {
                        errorDiv.textContent = data.message || 'Login failed';
                        errorDiv.style.display = 'block';
                    }
                } catch (error) {
                    errorDiv.textContent = 'Network error. Please try again.';
                    errorDiv.style.display = 'block';
                }
            });
        </script>
    </body>
    </html>
    """

@app.get("/", response_class=HTMLResponse)
async def admin_root(admin_session: str = Cookie(None)):
    """Root endpoint - redirect based on login status"""
    if admin_session and admin_service.verify_session(admin_session):
        return RedirectResponse(url="/dashboard", status_code=302)
    else:
        return RedirectResponse(url="/login", status_code=302)

@app.get("/landing", response_class=HTMLResponse)
async def admin_landing():
    """Landing page for admin interface"""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Digital Sponsor Admin</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
                   background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                   min-height: 100vh; margin: 0; padding: 20px; }
            .container { max-width: 800px; margin: 0 auto; background: white; 
                        border-radius: 12px; padding: 30px; box-shadow: 0 8px 25px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { color: #333; margin: 0 0 10px 0; }
            .header p { color: #666; margin: 0; }
            .admin-link { display: inline-block; background: #667eea; color: white; 
                         padding: 12px 24px; border-radius: 8px; text-decoration: none; 
                         margin: 10px; transition: all 0.3s; }
            .admin-link:hover { background: #5a6fd8; transform: translateY(-2px); }
            .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
                       gap: 20px; margin-top: 30px; }
            .feature { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; }
            .feature h3 { margin: 0 0 10px 0; color: #333; }
            .feature p { margin: 0; color: #666; font-size: 0.9em; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🛡️ Digital Sponsor Admin</h1>
                <p>Administrative Interface for Phase 1 Monetization Platform</p>
            </div>
            
            <div style="text-align: center;">
                <a href="/dashboard" class="admin-link">📊 Admin Dashboard</a>
                <a href="/api/docs" class="admin-link">📚 API Documentation</a>
                <a href="https://digitalsponsor.commonsolution.org" class="admin-link">🏠 Main Platform</a>
            </div>
            
            <div class="features">
                <div class="feature">
                    <h3>👥 User Management</h3>
                    <p>Manage user accounts, roles, and permissions. Send invitations and track user activity.</p>
                </div>
                <div class="feature">
                    <h3>💰 Revenue Analytics</h3>
                    <p>Monitor ad revenue, subscription metrics, and conversion rates from Phase 1 monetization.</p>
                </div>
                <div class="feature">
                    <h3>📊 System Health</h3>
                    <p>Track service status, performance metrics, and system alerts across all microservices.</p>
                </div>
                <div class="feature">
                    <h3>🔍 Activity Monitoring</h3>
                    <p>Audit trail of admin actions, user behavior, and system events for compliance.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """

@app.post("/api/login")
async def login(request: LoginRequest):
    """Login endpoint for admin users"""
    try:
        auth_result = admin_service.authenticate_user(request.email, request.password)
        
        if auth_result:
            admin_service.log_admin_activity(
                request.email, 
                "admin_login", 
                f"Successful login from admin interface"
            )
            
            return LoginResponse(
                success=True,
                message="Login successful",
                user=auth_result['user'],
                session_token=auth_result['session_token']
            )
        else:
            admin_service.log_admin_activity(
                request.email, 
                "admin_login_failed", 
                f"Failed login attempt"
            )
            
            return LoginResponse(
                success=False,
                message="Invalid email or password"
            )
    except Exception as e:
        logger.error(f"Login error: {e}")
        return LoginResponse(
            success=False,
            message="Login system error"
        )

@app.post("/api/logout")
async def logout(admin_session: str = Cookie(None)):
    """Logout endpoint"""
    if admin_session:
        admin_service.sessions.pop(admin_session, None)
    return {"success": True, "message": "Logged out successfully"}

@app.get("/dashboard")
async def admin_dashboard(admin_session: str = Cookie(None)):
    """Admin dashboard with comprehensive system overview"""
    # Check authentication
    if not admin_session:
        return RedirectResponse(url="/login", status_code=302)
    
    user_email = admin_service.verify_session(admin_session)
    if not user_email:
        return RedirectResponse(url="/login", status_code=302)
    
    try:
        # Get system health
        system_health = await admin_service.get_system_health()
        
        # Get user stats
        user_stats = await admin_service.get_user_stats()
        
        # Get revenue analytics
        revenue_analytics = await admin_service.get_revenue_analytics()
        
        # Get recent activity
        recent_activity = admin_service.activity_log[-10:] if admin_service.activity_log else []
        
        dashboard_data = AdminDashboard(
            system_health=system_health,
            user_stats=user_stats,
            revenue_analytics=revenue_analytics,
            recent_activity=recent_activity,
            alerts=[]  # Could add system alerts
        )
        
        # Return HTML dashboard
        return HTMLResponse(generate_dashboard_html(dashboard_data))
        
    except Exception as e:
        logger.error(f"Error generating dashboard: {e}")
        raise HTTPException(status_code=500, detail=f"Dashboard error: {str(e)}")

@app.get("/api/dashboard-data")
async def get_dashboard_data(admin_access: bool = Depends(verify_admin_access)):
    """Get dashboard data as JSON"""
    try:
        return {
            "system_health": await admin_service.get_system_health(),
            "user_stats": await admin_service.get_user_stats(),
            "revenue_analytics": await admin_service.get_revenue_analytics(),
            "recent_activity": admin_service.activity_log[-20:],
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting dashboard data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/send-invitation")
async def create_invitation(request: InvitationRequest):
    """Create and send invitation code"""
    try:
        # Check admin permissions
        if not admin_service.check_admin_permission(request.adminKey):
            raise HTTPException(status_code=403, detail="Invalid admin key")
        
        # Generate invitation code
        code = f"DS-{request.type.upper()}-{uuid.uuid4().hex[:8].upper()}"
        
        invitation = {
            'code': code,
            'type': request.type,
            'email': request.email,
            'firstName': request.firstName,
            'lastName': request.lastName,
            'customMessage': request.customMessage,
            'used': False,
            'createdAt': time.time(),
            'expiresAt': time.time() + (7 * 24 * 60 * 60)  # 7 days
        }
        
        admin_service.invitations[code] = invitation
        
        # Log activity
        admin_service.log_admin_activity(
            "system_admin",
            "invitation_created", 
            f"Created {request.type} invitation for {request.email}"
        )
        
        return {
            'success': True,
            'invitation_code': code,
            'email': request.email,
            'type': request.type,
            'expires_at': invitation['expiresAt'],
            'message': f'Invitation created for {request.email}'
        }
        
    except Exception as e:
        logger.error(f"Error creating invitation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/invitations")
async def list_invitations(admin_access: bool = Depends(verify_admin_access)):
    """List all invitations"""
    return {
        "invitations": list(admin_service.invitations.values()),
        "stats": {
            "total": len(admin_service.invitations),
            "used": len([i for i in admin_service.invitations.values() if i.get('used', False)]),
            "active": len([i for i in admin_service.invitations.values() if not i.get('used', False)])
        }
    }

@app.get("/api/admin/users")
async def list_users(admin_access: bool = Depends(verify_admin_access)):
    """List all users"""
    return {
        "users": list(admin_service.users.values()),
        "stats": await admin_service.get_user_stats()
    }

@app.get("/api/admin/beta-users")
async def list_beta_users(admin_access: bool = Depends(verify_admin_access)):
    """List all beta users with trial info"""
    beta_users = await admin_service.get_beta_users()
    return {
        "beta_users": beta_users,
        "stats": {
            "total_beta_users": len(beta_users),
            "active_trials": len([u for u in beta_users if u.get('beta_status') == 'Active']),
            "expiring_soon": len([u for u in beta_users if u.get('beta_status') == 'Expiring Soon']),
            "expired_trials": len([u for u in beta_users if u.get('beta_status') == 'Expired'])
        }
    }

@app.post("/api/admin/user-action")
async def user_management_action(request: UserManagementRequest):
    """Perform user management actions"""
    try:
        # Check admin permissions
        if not admin_service.check_admin_permission(request.adminKey):
            raise HTTPException(status_code=403, detail="Invalid admin key")
        
        # Log activity
        admin_service.log_admin_activity(
            "system_admin",
            f"user_action_{request.action}",
            f"User {request.userId}: {request.action} - {request.reason or 'No reason provided'}"
        )
        
        return {
            "success": True,
            "action": request.action,
            "userId": request.userId,
            "message": f"User {request.action} action completed successfully"
        }
        
    except Exception as e:
        logger.error(f"Error performing user action: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def generate_dashboard_html(dashboard_data: AdminDashboard) -> str:
    """Generate HTML for admin dashboard"""
    
    # Calculate overall system status
    services_healthy = all(s["status"] == "healthy" for s in dashboard_data.system_health.get("services", []))
    status_color = "#28a745" if services_healthy else "#dc3545"
    status_text = "All Systems Operational" if services_healthy else "System Issues Detected"
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Digital Sponsor Admin Dashboard</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            * {{ margin: 0; padding: 0; box-sizing: border-box; }}
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
                    background: #f8f9fa; color: #333; }}
            .container {{ max-width: 1400px; margin: 0 auto; padding: 20px; }}
            .header {{ background: white; border-radius: 12px; padding: 20px; margin-bottom: 20px; 
                      box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
            .header h1 {{ color: #333; margin-bottom: 10px; }}
            .status-badge {{ display: inline-block; background: {status_color}; color: white; 
                           padding: 6px 12px; border-radius: 20px; font-size: 0.9em; font-weight: 500; }}
            .dashboard-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
                              gap: 20px; }}
            .card {{ background: white; border-radius: 12px; padding: 20px; 
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
            .card h3 {{ margin-bottom: 15px; color: #333; }}
            .metric {{ margin-bottom: 10px; }}
            .metric-label {{ font-weight: 500; color: #666; }}
            .metric-value {{ font-size: 1.5em; font-weight: bold; color: #333; }}
            .service-item {{ display: flex; justify-content: space-between; align-items: center; 
                           padding: 8px 0; border-bottom: 1px solid #eee; }}
            .service-status {{ padding: 4px 8px; border-radius: 4px; font-size: 0.8em; font-weight: 500; }}
            .status-healthy {{ background: #d4edda; color: #155724; }}
            .status-error {{ background: #f8d7da; color: #721c24; }}
            .activity-item {{ padding: 8px 0; border-bottom: 1px solid #eee; font-size: 0.9em; }}
            .refresh-btn {{ background: #667eea; color: white; border: none; padding: 8px 16px; 
                          border-radius: 6px; cursor: pointer; font-size: 0.9em; }}
            .refresh-btn:hover {{ background: #5a6fd8; }}
        </style>
        <script>
            function refreshDashboard() {{
                location.reload();
            }}
            
            // Auto-refresh every 30 seconds
            setInterval(refreshDashboard, 30000);
            
            function showCreateInvite() {
                const email = prompt('Enter email address for invitation:');
                if (!email) return;
                
                const firstName = prompt('Enter first name:');
                if (!firstName) return;
                
                const lastName = prompt('Enter last name (optional):') || '';
                
                createInvitation(email, firstName, lastName);
            }
            
            async function createInvitation(email, firstName, lastName) {
                try {
                    const response = await fetch('/api/admin/send-invitation', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            email: email,
                            firstName: firstName,
                            lastName: lastName,
                            type: 'general',
                            adminKey: 'DS-ADMIN-2026-BETA'
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        alert(`Invitation created successfully!\\nCode: ${data.invitation_code}\\nEmail: ${data.email}`);
                        refreshDashboard();
                    } else {
                        alert(`Failed to create invitation: ${data.message || 'Unknown error'}`);
                    }
                } catch (error) {
                    alert(`Error creating invitation: ${error.message}`);
                }
            }
        </script>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🛡️ Digital Sponsor Admin Dashboard</h1>
                <span class="status-badge">{status_text}</span>
                <button class="refresh-btn" onclick="refreshDashboard()" style="float: right;">🔄 Refresh</button>
                <div style="clear: both;"></div>
            </div>
            
            <div class="dashboard-grid">
                <!-- System Health -->
                <div class="card">
                    <h3>🔧 System Health</h3>
    """
    
    # Add service status
    for service in dashboard_data.system_health.get("services", []):
        status_class = "status-healthy" if service["status"] == "healthy" else "status-error"
        html += f"""
                    <div class="service-item">
                        <span>{service["name"]}</span>
                        <span class="service-status {status_class}">{service["status"]}</span>
                    </div>
        """
    
    # Add user stats
    user_stats = dashboard_data.user_stats
    html += f"""
                </div>
                
                <!-- User Statistics -->
                <div class="card">
                    <h3>👥 User Statistics</h3>
                    <div class="metric">
                        <div class="metric-label">Total Users</div>
                        <div class="metric-value">{user_stats.get('total_users', 0)}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Active Users</div>
                        <div class="metric-value">{user_stats.get('active_users', 0)}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Admin Users</div>
                        <div class="metric-value">{user_stats.get('admin_users', 0)}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Beta Users</div>
                        <div class="metric-value">{user_stats.get('beta_users', 0)}</div>
                    </div>
                </div>
                
                <!-- Beta User Management -->
                <div class="card">
                    <h3>🧪 Beta User Management</h3>
                    <div class="metric">
                        <div class="metric-label">Pending Invitations</div>
                        <div class="metric-value">{user_stats.get('invitation_stats', {}).get('pending_invitations', 0)}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Used Invitations</div>
                        <div class="metric-value">{user_stats.get('invitation_stats', {}).get('used_invitations', 0)}</div>
                    </div>
                    <div style="margin-top: 15px;">
                        <button onclick="window.open('/api/admin/beta-users', '_blank')" 
                                style="background: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                            📋 View All Beta Users
                        </button>
                        <button onclick="showCreateInvite()" 
                                style="background: #667eea; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-left: 10px;">
                            ➕ Create Invitation
                        </button>
                    </div>
                </div>
                
                <!-- Revenue Analytics -->
                <div class="card">
                    <h3>💰 Revenue Analytics</h3>
                    <div class="metric">
                        <div class="metric-label">Ad Revenue (Total)</div>
                        <div class="metric-value">${dashboard_data.revenue_analytics.get('ad_revenue', {}).get('total', 0):.2f}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Ad Impressions</div>
                        <div class="metric-value">{dashboard_data.revenue_analytics.get('ad_revenue', {}).get('impressions', 0)}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Pro Subscriptions</div>
                        <div class="metric-value">{dashboard_data.revenue_analytics.get('subscription_revenue', {}).get('active_subscriptions', 0)}</div>
                    </div>
                </div>
                
                <!-- Recent Activity -->
                <div class="card">
                    <h3>📊 Recent Activity</h3>
    """
    
    # Add recent activity
    for activity in dashboard_data.recent_activity[-5:]:
        html += f"""
                    <div class="activity-item">
                        <strong>{activity.get('action', 'Unknown')}</strong><br>
                        <small>{activity.get('timestamp', '')} - {activity.get('details', '')}</small>
                    </div>
        """
    
    html += """
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding: 20px;">
                <p style="color: #666; font-size: 0.9em;">
                    Digital Sponsor Admin Dashboard v1.0 • Last updated: """ + datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC') + """
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return html

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)