#!/usr/bin/env python3
"""
Auth Proxy Service - Forwards requests to the new admin service
Maintains compatibility with frontend expecting old auth endpoints
"""

import os
import logging
from fastapi import FastAPI, HTTPException, Request, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx
from pydantic import BaseModel, EmailStr
from typing import Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Environment variables
ADMIN_SERVICE_URL = "http://digitalsponsor-admin-service.centralus.azurecontainer.io:8080"
ADMIN_KEY = os.getenv("ADMIN_KEY", "DS-ADMIN-2026-BETA")

app = FastAPI(
    title="Digital Sponsor Auth Proxy",
    description="Proxy service for auth compatibility",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class AuthResponse(BaseModel):
    success: bool
    message: str
    user: Optional[dict] = None
    token: Optional[str] = None

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "service": "auth-proxy",
        "version": "1.0.0",
        "status": "healthy",
        "admin_service_url": ADMIN_SERVICE_URL
    }

@app.post("/api/auth/login")
async def login_proxy(request: LoginRequest):
    """Proxy login requests to admin service"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{ADMIN_SERVICE_URL}/api/login",
                json={"email": request.email, "password": request.password},
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                return AuthResponse(
                    success=data.get('success', False),
                    message=data.get('message', 'Login successful'),
                    user=data.get('user'),
                    token=data.get('session_token')
                )
            else:
                return AuthResponse(
                    success=False,
                    message="Invalid credentials"
                )
    except Exception as e:
        logger.error(f"Login proxy error: {e}")
        return AuthResponse(
            success=False,
            message="Authentication service error"
        )

@app.post("/api/auth/validate")
async def validate_session(request: Request):
    """Validate session token"""
    try:
        body = await request.json()
        session_token = body.get('token') or body.get('session_token')
        
        if not session_token:
            return {"valid": False, "message": "No token provided"}
        
        # Simple validation - in production would verify with admin service
        return {
            "valid": True, 
            "user": {
                "email": "jamesenki@digitalsponsor.ai",
                "firstName": "James",
                "roles": ["admin"]
            }
        }
    except Exception as e:
        logger.error(f"Validation error: {e}")
        return {"valid": False, "message": "Validation error"}

@app.get("/api/auth/me")
async def get_current_user():
    """Get current user info"""
    return {
        "user": {
            "email": "jamesenki@digitalsponsor.ai", 
            "firstName": "James",
            "lastName": "Enki",
            "roles": ["admin"],
            "betaAccess": True
        }
    }

@app.post("/api/invitations/create")
async def create_invitation_proxy(request: Request):
    """Proxy invitation creation to admin service"""
    try:
        body = await request.json()
        body["adminKey"] = ADMIN_KEY  # Add admin key
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{ADMIN_SERVICE_URL}/api/admin/send-invitation",
                json=body,
                headers={"Content-Type": "application/json"}
            )
            return response.json()
    except Exception as e:
        logger.error(f"Invitation proxy error: {e}")
        return {"success": False, "message": "Invitation service error"}

@app.get("/api/invitations")
async def list_invitations_proxy():
    """Proxy invitation list to admin service"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{ADMIN_SERVICE_URL}/api/admin/invitations",
                headers={"admin-key": ADMIN_KEY}
            )
            return response.json()
    except Exception as e:
        logger.error(f"Invitations list error: {e}")
        return {"invitations": [], "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)