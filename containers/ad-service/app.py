"""
Digital Sponsor Ad Service
Contextual advertising system for recovery community
"""

import os
import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum

from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import httpx
from azure.cosmos.aio import CosmosClient
from azure.identity.aio import DefaultAzureCredential
import redis.asyncio as redis

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Environment variables
COSMOS_ENDPOINT = os.getenv("COSMOS_ENDPOINT", "")
COSMOS_DATABASE = os.getenv("COSMOS_DATABASE", "DigitalSponsor")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
SERVICE_NAME = "ad-service"
VERSION = "1.0.0"

# FastAPI app initialization
app = FastAPI(
    title="Digital Sponsor Ad Service",
    description="Contextual advertising system for recovery community",
    version=VERSION,
    docs_url="/docs" if os.getenv("ENVIRONMENT") != "production" else None
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global clients
cosmos_client: Optional[CosmosClient] = None
redis_client: Optional[redis.Redis] = None

# Data Models
class AdContext(str, Enum):
    STEP_WORK = "step_work"
    CHAT_COMPLETION = "chat_completion"
    LITERATURE_SEARCH = "literature_search"
    MEETING_FINDER = "meeting_finder"
    GENERAL = "general"
    CRISIS = "crisis"

class AdType(str, Enum):
    RECOVERY_LITERATURE = "recovery_literature"
    THERAPY_SERVICES = "therapy_services"
    MEDITATION_APPS = "meditation_apps"
    LOCAL_SERVICES = "local_services"
    WELLNESS_APPS = "wellness_apps"

class AdRequest(BaseModel):
    user_id: str = Field(..., description="User identifier")
    context: AdContext = Field(..., description="Current user context")
    crisis_mode: bool = Field(default=False, description="Crisis mode flag")
    location: Optional[str] = Field(None, description="User location (city, state)")
    session_id: Optional[str] = Field(None, description="Session identifier")

class AdResponse(BaseModel):
    ad_id: Optional[str] = Field(None, description="Ad identifier")
    title: Optional[str] = Field(None, description="Ad title")
    description: Optional[str] = Field(None, description="Ad description")
    url: Optional[str] = Field(None, description="Click destination URL")
    image_url: Optional[str] = Field(None, description="Ad image URL")
    provider: Optional[str] = Field(None, description="Ad provider")
    ad_type: Optional[AdType] = Field(None, description="Type of ad")
    cpm_rate: Optional[float] = Field(None, description="Cost per mille rate")

class ImpressionTrack(BaseModel):
    user_id: str
    ad_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    context: AdContext
    session_id: Optional[str] = None

class ClickTrack(BaseModel):
    user_id: str
    ad_id: str
    impression_id: str
    destination_url: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

@dataclass
class AdInventoryItem:
    ad_id: str
    title: str
    description: str
    url: str
    image_url: str
    provider: str
    ad_type: AdType
    contexts: List[AdContext]
    cpm_rate: float
    active: bool = True
    targeting_rules: Dict[str, Any] = None

class AdContextEngine:
    """Core ad selection and targeting engine"""
    
    def __init__(self):
        # Recovery-appropriate ad inventory
        self.ad_inventory = {
            "recovery_lit_001": AdInventoryItem(
                ad_id="recovery_lit_001",
                title="AA Big Book Study Guide",
                description="Enhanced study materials for working the 12 steps",
                url="https://example-recovery-literature.com/bigbook",
                image_url="/ads/recovery-lit-001.jpg",
                provider="recovery_literature_provider",
                ad_type=AdType.RECOVERY_LITERATURE,
                contexts=[AdContext.STEP_WORK, AdContext.LITERATURE_SEARCH],
                cpm_rate=15.0
            ),
            "therapy_001": AdInventoryItem(
                ad_id="therapy_001",
                title="BetterHelp - Online Therapy",
                description="Professional therapy for addiction recovery support",
                url="https://www.betterhelp.com/recovery",
                image_url="/ads/therapy-001.jpg",
                provider="betterhelp",
                ad_type=AdType.THERAPY_SERVICES,
                contexts=[AdContext.CHAT_COMPLETION, AdContext.GENERAL],
                cpm_rate=12.0
            ),
            "meditation_001": AdInventoryItem(
                ad_id="meditation_001",
                title="Calm - Meditation & Sleep",
                description="Mindfulness and meditation for recovery journey",
                url="https://www.calm.com/recovery",
                image_url="/ads/meditation-001.jpg",
                provider="calm",
                ad_type=AdType.MEDITATION_APPS,
                contexts=[AdContext.GENERAL, AdContext.STEP_WORK],
                cpm_rate=8.0
            )
        }
        
        # User frequency tracking (in-memory for MVP, should be Redis/DB in production)
        self.user_frequency = {}
    
    async def select_ad(self, request: AdRequest) -> Optional[AdResponse]:
        """Select appropriate ad based on context and user state"""
        try:
            # Crisis mode check - NEVER show ads in crisis
            if request.crisis_mode:
                logger.info(f"Crisis mode detected for user {request.user_id}, blocking ads")
                return None
            
            # Check frequency limits
            if await self._check_frequency_limits(request.user_id):
                logger.info(f"Frequency limit reached for user {request.user_id}")
                return None
            
            # Find contextually relevant ads
            relevant_ads = self._find_relevant_ads(request.context)
            
            if not relevant_ads:
                logger.info(f"No relevant ads found for context {request.context}")
                return None
            
            # Select highest value ad (simple algorithm for MVP)
            selected_ad = max(relevant_ads, key=lambda ad: ad.cpm_rate)
            
            # Convert to response format
            return AdResponse(
                ad_id=selected_ad.ad_id,
                title=selected_ad.title,
                description=selected_ad.description,
                url=selected_ad.url,
                image_url=selected_ad.image_url,
                provider=selected_ad.provider,
                ad_type=selected_ad.ad_type,
                cpm_rate=selected_ad.cpm_rate
            )
            
        except Exception as e:
            logger.error(f"Error selecting ad: {str(e)}")
            return None
    
    def _find_relevant_ads(self, context: AdContext) -> List[AdInventoryItem]:
        """Find ads relevant to current context"""
        relevant_ads = []
        for ad in self.ad_inventory.values():
            if ad.active and context in ad.contexts:
                relevant_ads.append(ad)
        return relevant_ads
    
    async def _check_frequency_limits(self, user_id: str) -> bool:
        """Check if user has reached frequency limits"""
        # MVP implementation - simple in-memory tracking
        # Production should use Redis with TTL
        now = datetime.utcnow()
        user_data = self.user_frequency.get(user_id, {"daily_count": 0, "last_ad": None})
        
        # Daily limit: 8 ads
        if user_data["daily_count"] >= 8:
            return True
        
        # Minimum interval: 10 minutes
        if user_data["last_ad"]:
            time_since_last = now - user_data["last_ad"]
            if time_since_last < timedelta(minutes=10):
                return True
        
        return False
    
    async def track_ad_request(self, user_id: str):
        """Track ad request for frequency limiting"""
        now = datetime.utcnow()
        if user_id not in self.user_frequency:
            self.user_frequency[user_id] = {"daily_count": 0, "last_ad": None}
        
        self.user_frequency[user_id]["daily_count"] += 1
        self.user_frequency[user_id]["last_ad"] = now

# Global ad engine instance
ad_engine = AdContextEngine()

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
        # For development, continue without DB
        cosmos_client = None

async def init_redis():
    """Initialize Redis connection"""
    global redis_client
    try:
        redis_client = redis.from_url(REDIS_URL)
        await redis_client.ping()
        logger.info("Redis client initialized")
    except Exception as e:
        logger.error(f"Failed to initialize Redis: {str(e)}")
        redis_client = None

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    await init_database()
    await init_redis()
    logger.info(f"Ad Service {VERSION} started successfully")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Clean up resources on shutdown"""
    if cosmos_client:
        await cosmos_client.close()
    if redis_client:
        await redis_client.close()
    logger.info("Ad Service shutdown completed")

# API Endpoints

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "service": SERVICE_NAME,
        "version": VERSION,
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "dependencies": {
            "cosmos_db": "connected" if cosmos_client else "disconnected",
            "redis": "connected" if redis_client else "disconnected"
        }
    }

@app.post("/api/request-ad", response_model=Optional[AdResponse])
async def request_ad(request: AdRequest):
    """Request a contextual ad for user"""
    try:
        # Track the ad request for frequency limiting
        await ad_engine.track_ad_request(request.user_id)
        
        # Select appropriate ad
        ad_response = await ad_engine.select_ad(request)
        
        if ad_response:
            logger.info(f"Served ad {ad_response.ad_id} to user {request.user_id} in context {request.context}")
        else:
            logger.info(f"No ad served to user {request.user_id} in context {request.context}")
        
        return ad_response
        
    except Exception as e:
        logger.error(f"Error in request_ad: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/api/track-impression")
async def track_impression(impression: ImpressionTrack):
    """Track ad impression for analytics and billing"""
    try:
        # TODO: Store in Cosmos DB for analytics
        impression_data = {
            "id": f"{impression.user_id}_{impression.ad_id}_{int(impression.timestamp.timestamp())}",
            "user_id": impression.user_id,
            "ad_id": impression.ad_id,
            "timestamp": impression.timestamp.isoformat(),
            "context": impression.context.value,
            "session_id": impression.session_id,
            "revenue_amount": 0.0  # Will be calculated based on CPM
        }
        
        logger.info(f"Tracked impression: {impression.ad_id} for user {impression.user_id}")
        
        return {"status": "success", "impression_id": impression_data["id"]}
        
    except Exception as e:
        logger.error(f"Error tracking impression: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to track impression")

@app.post("/api/track-click")
async def track_click(click: ClickTrack):
    """Track ad click for analytics and billing"""
    try:
        # TODO: Store in Cosmos DB for analytics
        click_data = {
            "id": f"click_{click.user_id}_{click.ad_id}_{int(click.timestamp.timestamp())}",
            "user_id": click.user_id,
            "ad_id": click.ad_id,
            "impression_id": click.impression_id,
            "destination_url": click.destination_url,
            "timestamp": click.timestamp.isoformat(),
            "revenue_amount": 0.0  # Will be calculated based on CPC
        }
        
        logger.info(f"Tracked click: {click.ad_id} for user {click.user_id}")
        
        return {"status": "success", "click_id": click_data["id"]}
        
    except Exception as e:
        logger.error(f"Error tracking click: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to track click")

@app.get("/api/ad-performance")
async def get_ad_performance(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    ad_id: Optional[str] = None
):
    """Get ad performance analytics (admin only)"""
    try:
        # TODO: Implement actual analytics from Cosmos DB
        # For MVP, return mock data
        performance_data = {
            "summary": {
                "total_impressions": 1234,
                "total_clicks": 56,
                "ctr": 4.5,
                "total_revenue": 12.34,
                "average_cpm": 10.0
            },
            "by_context": {
                "step_work": {"impressions": 456, "clicks": 23, "revenue": 6.84},
                "chat_completion": {"impressions": 789, "clicks": 33, "revenue": 5.50}
            }
        }
        
        return performance_data
        
    except Exception as e:
        logger.error(f"Error getting ad performance: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get performance data")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)