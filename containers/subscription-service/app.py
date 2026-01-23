"""
Digital Sponsor Subscription Service
Handles tier management, feature access, and service integration
"""

import os
import logging
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Set
from dataclasses import dataclass
from enum import Enum

from fastapi import FastAPI, HTTPException, Depends, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, EmailStr
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
PAYMENT_SERVICE_URL = os.getenv("PAYMENT_SERVICE_URL", "http://payment-service:8001")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://digitalsponsor.commonsolution.org")
SERVICE_NAME = "subscription-service"
VERSION = "1.0.0"

# FastAPI app initialization
app = FastAPI(
    title="Digital Sponsor Subscription Service",
    description="Tier management and feature access control",
    version=VERSION,
    docs_url="/docs" if os.getenv("ENVIRONMENT") != "production" else None
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000", PAYMENT_SERVICE_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global clients
cosmos_client: Optional[CosmosClient] = None
redis_client: Optional[redis.Redis] = None

# Data Models
class SubscriptionTier(str, Enum):
    FREE = "free"
    PRO = "pro"

class FeatureFlag(str, Enum):
    UNLIMITED_CHAT = "unlimited_chat"
    ADVANCED_STEP_WORK = "advanced_step_work"
    AD_FREE_EXPERIENCE = "ad_free_experience"
    PRIORITY_SUPPORT = "priority_support"
    CUSTOM_GOALS = "custom_goals"
    PROGRESS_ANALYTICS = "progress_analytics"
    EXPORT_DATA = "export_data"
    EARLY_ACCESS = "early_access"

class UsageMetric(str, Enum):
    CHAT_MESSAGES = "chat_messages"
    STEP_WORK_SESSIONS = "step_work_sessions"
    LITERATURE_SEARCHES = "literature_searches"
    AD_IMPRESSIONS = "ad_impressions"

@dataclass 
class TierConfiguration:
    """Configuration for subscription tiers"""
    tier: SubscriptionTier
    features: Set[FeatureFlag]
    usage_limits: Dict[UsageMetric, int]
    monthly_price: float
    description: str

class UserTierInfo(BaseModel):
    user_id: str
    tier: SubscriptionTier = SubscriptionTier.FREE
    features: List[FeatureFlag] = []
    usage_limits: Dict[UsageMetric, int] = {}
    current_usage: Dict[UsageMetric, int] = {}
    subscription_active: bool = True
    subscription_expires: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class FeatureAccessRequest(BaseModel):
    user_id: str = Field(..., description="User identifier")
    feature: FeatureFlag = Field(..., description="Feature to check access for")
    context: Optional[str] = Field(None, description="Usage context")

class UsageTrackingRequest(BaseModel):
    user_id: str = Field(..., description="User identifier")
    metric: UsageMetric = Field(..., description="Usage metric to track")
    amount: int = Field(1, description="Amount to add to usage")
    context: Optional[str] = Field(None, description="Usage context")

class UpgradeRecommendation(BaseModel):
    user_id: str
    tier: SubscriptionTier
    reason: str
    blocked_feature: Optional[FeatureFlag] = None
    usage_exceeded: Optional[UsageMetric] = None
    current_usage: int = 0
    limit: int = 0
    upgrade_benefits: List[str] = []

# Tier Configurations
TIER_CONFIGS = {
    SubscriptionTier.FREE: TierConfiguration(
        tier=SubscriptionTier.FREE,
        features={
            FeatureFlag.PRIORITY_SUPPORT,  # Basic support only
        },
        usage_limits={
            UsageMetric.CHAT_MESSAGES: 50,  # 50 messages per month
            UsageMetric.STEP_WORK_SESSIONS: 10,  # 10 sessions per month
            UsageMetric.LITERATURE_SEARCHES: 20,  # 20 searches per month
            UsageMetric.AD_IMPRESSIONS: 1000,  # Show ads to free users
        },
        monthly_price=0.0,
        description="Basic recovery support with limited usage"
    ),
    SubscriptionTier.PRO: TierConfiguration(
        tier=SubscriptionTier.PRO,
        features={
            FeatureFlag.UNLIMITED_CHAT,
            FeatureFlag.ADVANCED_STEP_WORK,
            FeatureFlag.AD_FREE_EXPERIENCE,
            FeatureFlag.PRIORITY_SUPPORT,
            FeatureFlag.CUSTOM_GOALS,
            FeatureFlag.PROGRESS_ANALYTICS,
            FeatureFlag.EXPORT_DATA,
            FeatureFlag.EARLY_ACCESS,
        },
        usage_limits={
            UsageMetric.CHAT_MESSAGES: -1,  # Unlimited
            UsageMetric.STEP_WORK_SESSIONS: -1,  # Unlimited
            UsageMetric.LITERATURE_SEARCHES: -1,  # Unlimited
            UsageMetric.AD_IMPRESSIONS: 0,  # No ads for Pro users
        },
        monthly_price=7.99,
        description="Premium recovery support with unlimited access"
    )
}

class SubscriptionManager:
    """Core subscription and tier management logic"""
    
    def __init__(self):
        self.tier_configs = TIER_CONFIGS
    
    async def get_user_tier_info(self, user_id: str) -> UserTierInfo:
        """Get user's current tier information"""
        try:
            # First check local cache (Redis)
            if redis_client:
                cached = await redis_client.get(f"tier:{user_id}")
                if cached:
                    return UserTierInfo.model_validate_json(cached)
            
            # Check payment service for subscription status
            tier_info = await self._fetch_user_subscription_status(user_id)
            
            # Cache the result
            if redis_client:
                await redis_client.setex(
                    f"tier:{user_id}", 
                    300,  # 5 minutes cache
                    tier_info.model_dump_json()
                )
            
            return tier_info
            
        except Exception as e:
            logger.error(f"Error getting user tier info: {str(e)}")
            # Default to free tier on error
            return UserTierInfo(user_id=user_id)
    
    async def _fetch_user_subscription_status(self, user_id: str) -> UserTierInfo:
        """Fetch subscription status from payment service"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{PAYMENT_SERVICE_URL}/api/subscription/{user_id}",
                    timeout=5.0
                )
                
                if response.status_code == 200:
                    sub_data = response.json()
                    
                    # Determine tier based on subscription status
                    is_pro = sub_data.get('is_pro', False)
                    tier = SubscriptionTier.PRO if is_pro else SubscriptionTier.FREE
                    
                    # Get tier configuration
                    config = self.tier_configs[tier]
                    
                    # Get current usage from database
                    current_usage = await self._get_current_usage(user_id)
                    
                    return UserTierInfo(
                        user_id=user_id,
                        tier=tier,
                        features=list(config.features),
                        usage_limits=config.usage_limits,
                        current_usage=current_usage,
                        subscription_active=is_pro,
                        subscription_expires=datetime.fromisoformat(sub_data['current_period_end'].replace('Z', '+00:00')) if sub_data.get('current_period_end') else None
                    )
                else:
                    logger.warning(f"Payment service returned {response.status_code} for user {user_id}")
                    
        except Exception as e:
            logger.error(f"Error fetching subscription status: {str(e)}")
        
        # Default to free tier
        config = self.tier_configs[SubscriptionTier.FREE]
        current_usage = await self._get_current_usage(user_id)
        
        return UserTierInfo(
            user_id=user_id,
            tier=SubscriptionTier.FREE,
            features=list(config.features),
            usage_limits=config.usage_limits,
            current_usage=current_usage,
            subscription_active=False
        )
    
    async def _get_current_usage(self, user_id: str) -> Dict[UsageMetric, int]:
        """Get user's current usage from database"""
        if not cosmos_client:
            return {metric: 0 for metric in UsageMetric}
        
        try:
            database = cosmos_client.get_database_client(COSMOS_DATABASE)
            container = database.get_container_client("user_usage")
            
            # Get current month's usage
            current_month = datetime.utcnow().strftime("%Y-%m")
            
            query = """
                SELECT c.metric, c.amount 
                FROM c 
                WHERE c.user_id = @user_id 
                AND c.period = @period
            """
            parameters = [
                {"name": "@user_id", "value": user_id},
                {"name": "@period", "value": current_month}
            ]
            
            usage = {metric: 0 for metric in UsageMetric}
            
            async for item in container.query_items(query, parameters=parameters, enable_cross_partition_query=True):
                metric = UsageMetric(item['metric'])
                usage[metric] = item['amount']
            
            return usage
            
        except Exception as e:
            logger.error(f"Error getting current usage: {str(e)}")
            return {metric: 0 for metric in UsageMetric}
    
    async def check_feature_access(self, user_id: str, feature: FeatureFlag) -> bool:
        """Check if user has access to a specific feature"""
        tier_info = await self.get_user_tier_info(user_id)
        return feature in tier_info.features
    
    async def check_usage_limit(self, user_id: str, metric: UsageMetric) -> tuple[bool, int, int]:
        """Check if user has reached usage limit for a metric"""
        tier_info = await self.get_user_tier_info(user_id)
        
        limit = tier_info.usage_limits.get(metric, 0)
        current = tier_info.current_usage.get(metric, 0)
        
        # -1 means unlimited
        if limit == -1:
            return True, current, -1
        
        # Check if under limit
        can_use = current < limit
        return can_use, current, limit
    
    async def track_usage(self, user_id: str, metric: UsageMetric, amount: int = 1) -> bool:
        """Track usage for a user and metric"""
        if not cosmos_client:
            return True  # Allow usage if database not available
        
        try:
            database = cosmos_client.get_database_client(COSMOS_DATABASE)
            container = database.get_container_client("user_usage")
            
            current_month = datetime.utcnow().strftime("%Y-%m")
            
            # Create or update usage record
            usage_id = f"{user_id}_{metric.value}_{current_month}"
            
            # Get existing usage
            try:
                existing = await container.read_item(usage_id, partition_key=user_id)
                new_amount = existing['amount'] + amount
            except:
                new_amount = amount
            
            # Update usage record
            usage_record = {
                "id": usage_id,
                "user_id": user_id,
                "metric": metric.value,
                "amount": new_amount,
                "period": current_month,
                "last_updated": datetime.utcnow().isoformat()
            }
            
            await container.upsert_item(usage_record)
            
            # Clear cache to ensure fresh data next time
            if redis_client:
                await redis_client.delete(f"tier:{user_id}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error tracking usage: {str(e)}")
            return False
    
    async def get_upgrade_recommendation(self, user_id: str, blocked_feature: Optional[FeatureFlag] = None, exceeded_metric: Optional[UsageMetric] = None) -> Optional[UpgradeRecommendation]:
        """Generate upgrade recommendation based on user needs"""
        tier_info = await self.get_user_tier_info(user_id)
        
        # Don't recommend upgrade if already Pro
        if tier_info.tier == SubscriptionTier.PRO:
            return None
        
        # Build recommendation
        if blocked_feature:
            reason = f"Access to {blocked_feature.value.replace('_', ' ').title()} requires Pro subscription"
        elif exceeded_metric:
            current = tier_info.current_usage.get(exceeded_metric, 0)
            limit = tier_info.usage_limits.get(exceeded_metric, 0)
            reason = f"You've reached your monthly limit for {exceeded_metric.value.replace('_', ' ')}"
        else:
            reason = "Upgrade to Pro for unlimited access and premium features"
        
        pro_benefits = [
            "Unlimited chat conversations",
            "Advanced step work guidance",
            "Ad-free experience",
            "Priority support",
            "Custom recovery goals",
            "Progress analytics",
            "Data export capabilities"
        ]
        
        return UpgradeRecommendation(
            user_id=user_id,
            tier=SubscriptionTier.PRO,
            reason=reason,
            blocked_feature=blocked_feature,
            usage_exceeded=exceeded_metric,
            current_usage=tier_info.current_usage.get(exceeded_metric, 0) if exceeded_metric else 0,
            limit=tier_info.usage_limits.get(exceeded_metric, 0) if exceeded_metric else 0,
            upgrade_benefits=pro_benefits
        )

# Global subscription manager instance
subscription_manager = SubscriptionManager()

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
    logger.info(f"Subscription Service {VERSION} started successfully")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Clean up resources on shutdown"""
    if cosmos_client:
        await cosmos_client.close()
    if redis_client:
        await redis_client.close()
    logger.info("Subscription Service shutdown completed")

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
            "redis": "connected" if redis_client else "disconnected",
            "payment_service": "configured" if PAYMENT_SERVICE_URL else "not configured"
        }
    }

@app.get("/api/user-tier/{user_id}")
async def get_user_tier(user_id: str):
    """Get user's current tier and feature access"""
    try:
        tier_info = await subscription_manager.get_user_tier_info(user_id)
        return tier_info.model_dump()
    except Exception as e:
        logger.error(f"Error getting user tier: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get user tier")

@app.post("/api/check-feature-access")
async def check_feature_access(request: FeatureAccessRequest):
    """Check if user has access to a specific feature"""
    try:
        has_access = await subscription_manager.check_feature_access(
            request.user_id, 
            request.feature
        )
        
        if not has_access:
            # Generate upgrade recommendation
            recommendation = await subscription_manager.get_upgrade_recommendation(
                request.user_id,
                blocked_feature=request.feature
            )
        else:
            recommendation = None
        
        return {
            "user_id": request.user_id,
            "feature": request.feature,
            "has_access": has_access,
            "recommendation": recommendation.model_dump() if recommendation else None
        }
        
    except Exception as e:
        logger.error(f"Error checking feature access: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to check feature access")

@app.post("/api/check-usage-limit")
async def check_usage_limit(request: UsageTrackingRequest):
    """Check usage limit for a specific metric"""
    try:
        can_use, current, limit = await subscription_manager.check_usage_limit(
            request.user_id, 
            request.metric
        )
        
        if not can_use:
            # Generate upgrade recommendation
            recommendation = await subscription_manager.get_upgrade_recommendation(
                request.user_id,
                exceeded_metric=request.metric
            )
        else:
            recommendation = None
        
        return {
            "user_id": request.user_id,
            "metric": request.metric,
            "can_use": can_use,
            "current_usage": current,
            "limit": limit,
            "unlimited": limit == -1,
            "recommendation": recommendation.model_dump() if recommendation else None
        }
        
    except Exception as e:
        logger.error(f"Error checking usage limit: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to check usage limit")

@app.post("/api/track-usage")
async def track_usage(request: UsageTrackingRequest):
    """Track usage for a user and metric"""
    try:
        # Check if user can use this feature (has access and under limit)
        can_use, current, limit = await subscription_manager.check_usage_limit(
            request.user_id,
            request.metric
        )
        
        if not can_use:
            recommendation = await subscription_manager.get_upgrade_recommendation(
                request.user_id,
                exceeded_metric=request.metric
            )
            
            return {
                "success": False,
                "reason": "usage_limit_exceeded",
                "current_usage": current,
                "limit": limit,
                "recommendation": recommendation.model_dump() if recommendation else None
            }
        
        # Track the usage
        success = await subscription_manager.track_usage(
            request.user_id,
            request.metric,
            request.amount
        )
        
        if success:
            return {
                "success": True,
                "current_usage": current + request.amount,
                "limit": limit,
                "unlimited": limit == -1
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to track usage")
            
    except Exception as e:
        logger.error(f"Error tracking usage: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to track usage")

@app.get("/api/tier-comparison")
async def get_tier_comparison():
    """Get comparison of all subscription tiers"""
    try:
        tiers = []
        for tier_enum, config in TIER_CONFIGS.items():
            tier_info = {
                "tier": tier_enum.value,
                "monthly_price": config.monthly_price,
                "description": config.description,
                "features": [feature.value for feature in config.features],
                "usage_limits": {
                    metric.value: limit for metric, limit in config.usage_limits.items()
                }
            }
            tiers.append(tier_info)
        
        return {"tiers": tiers}
        
    except Exception as e:
        logger.error(f"Error getting tier comparison: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get tier comparison")

@app.get("/api/user-analytics/{user_id}")
async def get_user_analytics(user_id: str):
    """Get user's usage analytics and tier insights"""
    try:
        tier_info = await subscription_manager.get_user_tier_info(user_id)
        
        # Calculate usage percentages
        usage_analytics = {}
        for metric, current in tier_info.current_usage.items():
            limit = tier_info.usage_limits.get(metric, 0)
            if limit > 0:
                percentage = min((current / limit) * 100, 100)
                usage_analytics[metric.value] = {
                    "current": current,
                    "limit": limit,
                    "percentage": round(percentage, 1),
                    "remaining": max(0, limit - current)
                }
            elif limit == -1:
                usage_analytics[metric.value] = {
                    "current": current,
                    "limit": "unlimited",
                    "percentage": 0,
                    "remaining": "unlimited"
                }
        
        return {
            "user_id": user_id,
            "tier": tier_info.tier.value,
            "subscription_active": tier_info.subscription_active,
            "usage_analytics": usage_analytics,
            "subscription_expires": tier_info.subscription_expires.isoformat() if tier_info.subscription_expires else None
        }
        
    except Exception as e:
        logger.error(f"Error getting user analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get user analytics")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)