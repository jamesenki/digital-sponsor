"""
Digital Sponsor Payment Service
Stripe integration for Pro subscriptions and payment processing
"""

import os
import logging
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum

from fastapi import FastAPI, HTTPException, Depends, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, EmailStr
import stripe
from azure.cosmos.aio import CosmosClient
from azure.identity.aio import DefaultAzureCredential
import httpx

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Environment variables
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
COSMOS_ENDPOINT = os.getenv("COSMOS_ENDPOINT", "")
COSMOS_DATABASE = os.getenv("COSMOS_DATABASE", "DigitalSponsor")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://digitalsponsor.commonsolution.org")
SERVICE_NAME = "payment-service"
VERSION = "1.0.0"

# Stripe configuration
stripe.api_key = STRIPE_SECRET_KEY

# FastAPI app initialization
app = FastAPI(
    title="Digital Sponsor Payment Service",
    description="Stripe integration for Pro subscriptions and payment processing",
    version=VERSION,
    docs_url="/docs" if os.getenv("ENVIRONMENT") != "production" else None
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global clients
cosmos_client: Optional[CosmosClient] = None

# Data Models
class SubscriptionTier(str, Enum):
    FREE = "free"
    PRO = "pro"

class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    CANCELED = "canceled"
    PAST_DUE = "past_due"
    INCOMPLETE = "incomplete"
    TRIAL = "trial"

class CheckoutRequest(BaseModel):
    user_id: str = Field(..., description="User identifier")
    email: EmailStr = Field(..., description="User email")
    tier: SubscriptionTier = Field(..., description="Subscription tier")
    success_url: Optional[str] = Field(None, description="Success redirect URL")
    cancel_url: Optional[str] = Field(None, description="Cancel redirect URL")

class CheckoutResponse(BaseModel):
    checkout_url: str = Field(..., description="Stripe checkout session URL")
    session_id: str = Field(..., description="Stripe session ID")

class SubscriptionInfo(BaseModel):
    user_id: str
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    tier: SubscriptionTier = SubscriptionTier.FREE
    status: SubscriptionStatus = SubscriptionStatus.ACTIVE
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    cancel_at_period_end: bool = False
    trial_end: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class BillingHistoryItem(BaseModel):
    invoice_id: str
    amount: float
    currency: str = "usd"
    status: str
    invoice_date: datetime
    period_start: datetime
    period_end: datetime
    description: str

@dataclass
class ProSubscriptionConfig:
    """Pro subscription configuration"""
    price_id: str = "price_1QUmNsP8DjRhDMNOQx0M3YKN"  # Replace with actual Stripe price ID
    monthly_price: float = 7.99
    features: List[str] = None
    
    def __post_init__(self):
        if self.features is None:
            self.features = [
                "Unlimited chat conversations",
                "Advanced step work guidance", 
                "Ad-free experience",
                "Priority support",
                "Custom recovery goals",
                "Progress analytics"
            ]

# Subscription configuration
PRO_CONFIG = ProSubscriptionConfig()

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
    logger.info(f"Payment Service {VERSION} started successfully")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Clean up resources on shutdown"""
    if cosmos_client:
        await cosmos_client.close()
    logger.info("Payment Service shutdown completed")

# Helper functions
async def get_user_subscription(user_id: str) -> Optional[SubscriptionInfo]:
    """Get user's current subscription info from database"""
    if not cosmos_client:
        return None
    
    try:
        database = cosmos_client.get_database_client(COSMOS_DATABASE)
        container = database.get_container_client("user_subscriptions")
        
        query = "SELECT * FROM c WHERE c.user_id = @user_id"
        parameters = [{"name": "@user_id", "value": user_id}]
        
        async for item in container.query_items(query, parameters=parameters, enable_cross_partition_query=True):
            return SubscriptionInfo(**item)
        
        return None
        
    except Exception as e:
        logger.error(f"Error getting user subscription: {str(e)}")
        return None

async def save_user_subscription(subscription: SubscriptionInfo) -> bool:
    """Save user subscription to database"""
    if not cosmos_client:
        return False
        
    try:
        database = cosmos_client.get_database_client(COSMOS_DATABASE)
        container = database.get_container_client("user_subscriptions")
        
        subscription.updated_at = datetime.utcnow()
        subscription_dict = subscription.model_dump()
        subscription_dict["id"] = subscription.user_id  # Use user_id as document id
        
        # Convert datetime objects to ISO strings
        for field in ["current_period_start", "current_period_end", "trial_end", "created_at", "updated_at"]:
            if subscription_dict.get(field):
                subscription_dict[field] = subscription_dict[field].isoformat()
        
        await container.upsert_item(subscription_dict)
        return True
        
    except Exception as e:
        logger.error(f"Error saving user subscription: {str(e)}")
        return False

# API Endpoints

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    stripe_status = "connected" if STRIPE_SECRET_KEY else "not configured"
    
    return {
        "service": SERVICE_NAME,
        "version": VERSION,
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "dependencies": {
            "cosmos_db": "connected" if cosmos_client else "disconnected",
            "stripe": stripe_status
        }
    }

@app.post("/api/create-checkout-session", response_model=CheckoutResponse)
async def create_checkout_session(request: CheckoutRequest):
    """Create Stripe checkout session for Pro subscription"""
    try:
        # Get or create customer
        existing_subscription = await get_user_subscription(request.user_id)
        
        if existing_subscription and existing_subscription.stripe_customer_id:
            customer_id = existing_subscription.stripe_customer_id
        else:
            # Create new Stripe customer
            customer = stripe.Customer.create(
                email=request.email,
                metadata={'user_id': request.user_id}
            )
            customer_id = customer.id
        
        # Default URLs if not provided
        success_url = request.success_url or f"{FRONTEND_URL}/subscription/success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = request.cancel_url or f"{FRONTEND_URL}/subscription/cancel"
        
        # Create checkout session
        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=['card'],
            line_items=[{
                'price': PRO_CONFIG.price_id,
                'quantity': 1,
            }],
            mode='subscription',
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                'user_id': request.user_id,
                'tier': request.tier.value
            },
            allow_promotion_codes=True,
            billing_address_collection='auto',
            subscription_data={
                'metadata': {'user_id': request.user_id}
            }
        )
        
        logger.info(f"Created checkout session {session.id} for user {request.user_id}")
        
        return CheckoutResponse(
            checkout_url=session.url,
            session_id=session.id
        )
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating checkout session: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Payment error: {str(e)}")
    except Exception as e:
        logger.error(f"Error creating checkout session: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/subscription/{user_id}")
async def get_subscription_status(user_id: str):
    """Get user's current subscription status"""
    try:
        subscription = await get_user_subscription(user_id)
        
        if not subscription:
            # Return default free subscription
            return {
                "user_id": user_id,
                "tier": SubscriptionTier.FREE,
                "status": SubscriptionStatus.ACTIVE,
                "features": ["Basic chat support", "Limited step work guidance"],
                "is_pro": False
            }
        
        # Get Pro features if user has Pro subscription
        features = PRO_CONFIG.features if subscription.tier == SubscriptionTier.PRO else ["Basic chat support", "Limited step work guidance"]
        
        return {
            "user_id": subscription.user_id,
            "tier": subscription.tier,
            "status": subscription.status,
            "current_period_start": subscription.current_period_start,
            "current_period_end": subscription.current_period_end,
            "cancel_at_period_end": subscription.cancel_at_period_end,
            "trial_end": subscription.trial_end,
            "features": features,
            "is_pro": subscription.tier == SubscriptionTier.PRO and subscription.status == SubscriptionStatus.ACTIVE
        }
        
    except Exception as e:
        logger.error(f"Error getting subscription status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get subscription status")

@app.post("/api/cancel-subscription")
async def cancel_subscription(user_id: str):
    """Cancel user's subscription (at period end)"""
    try:
        subscription = await get_user_subscription(user_id)
        
        if not subscription or not subscription.stripe_subscription_id:
            raise HTTPException(status_code=404, detail="No active subscription found")
        
        # Cancel at period end
        stripe_subscription = stripe.Subscription.modify(
            subscription.stripe_subscription_id,
            cancel_at_period_end=True
        )
        
        # Update local database
        subscription.cancel_at_period_end = True
        await save_user_subscription(subscription)
        
        logger.info(f"Canceled subscription for user {user_id}")
        
        return {
            "status": "success",
            "message": "Subscription will cancel at the end of the current period",
            "period_end": subscription.current_period_end
        }
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error canceling subscription: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Payment error: {str(e)}")
    except Exception as e:
        logger.error(f"Error canceling subscription: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to cancel subscription")

@app.post("/api/reactivate-subscription")
async def reactivate_subscription(user_id: str):
    """Reactivate a canceled subscription"""
    try:
        subscription = await get_user_subscription(user_id)
        
        if not subscription or not subscription.stripe_subscription_id:
            raise HTTPException(status_code=404, detail="No subscription found")
        
        # Reactivate subscription
        stripe_subscription = stripe.Subscription.modify(
            subscription.stripe_subscription_id,
            cancel_at_period_end=False
        )
        
        # Update local database
        subscription.cancel_at_period_end = False
        await save_user_subscription(subscription)
        
        logger.info(f"Reactivated subscription for user {user_id}")
        
        return {
            "status": "success",
            "message": "Subscription reactivated successfully"
        }
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error reactivating subscription: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Payment error: {str(e)}")
    except Exception as e:
        logger.error(f"Error reactivating subscription: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to reactivate subscription")

@app.get("/api/billing-history/{user_id}")
async def get_billing_history(user_id: str):
    """Get user's billing history"""
    try:
        subscription = await get_user_subscription(user_id)
        
        if not subscription or not subscription.stripe_customer_id:
            return {"billing_history": []}
        
        # Get invoices from Stripe
        invoices = stripe.Invoice.list(
            customer=subscription.stripe_customer_id,
            limit=50
        )
        
        billing_history = []
        for invoice in invoices.data:
            if invoice.status in ['paid', 'open']:
                billing_history.append(BillingHistoryItem(
                    invoice_id=invoice.id,
                    amount=invoice.amount_paid / 100,  # Convert from cents
                    currency=invoice.currency,
                    status=invoice.status,
                    invoice_date=datetime.fromtimestamp(invoice.created),
                    period_start=datetime.fromtimestamp(invoice.period_start) if invoice.period_start else datetime.utcnow(),
                    period_end=datetime.fromtimestamp(invoice.period_end) if invoice.period_end else datetime.utcnow(),
                    description=invoice.description or "Digital Sponsor Pro Subscription"
                ))
        
        return {"billing_history": billing_history}
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error getting billing history: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Payment error: {str(e)}")
    except Exception as e:
        logger.error(f"Error getting billing history: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get billing history")

@app.post("/webhooks/stripe")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
    """Handle Stripe webhook events"""
    try:
        payload = await request.body()
        
        # Verify webhook signature
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, STRIPE_WEBHOOK_SECRET
        )
        
        logger.info(f"Received Stripe webhook: {event['type']}")
        
        # Handle different event types
        if event['type'] == 'checkout.session.completed':
            await handle_checkout_completed(event['data']['object'])
        
        elif event['type'] == 'invoice.payment_succeeded':
            await handle_payment_succeeded(event['data']['object'])
        
        elif event['type'] == 'invoice.payment_failed':
            await handle_payment_failed(event['data']['object'])
        
        elif event['type'] == 'customer.subscription.updated':
            await handle_subscription_updated(event['data']['object'])
        
        elif event['type'] == 'customer.subscription.deleted':
            await handle_subscription_deleted(event['data']['object'])
        
        else:
            logger.info(f"Unhandled webhook event: {event['type']}")
        
        return {"status": "success"}
        
    except ValueError as e:
        logger.error(f"Invalid payload in webhook: {str(e)}")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"Invalid signature in webhook: {str(e)}")
        raise HTTPException(status_code=400, detail="Invalid signature")
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        raise HTTPException(status_code=500, detail="Webhook processing failed")

# Webhook handlers
async def handle_checkout_completed(session):
    """Handle successful checkout session"""
    try:
        user_id = session['metadata']['user_id']
        customer_id = session['customer']
        subscription_id = session['subscription']
        
        # Get subscription details from Stripe
        stripe_subscription = stripe.Subscription.retrieve(subscription_id)
        
        # Create or update subscription record
        subscription = SubscriptionInfo(
            user_id=user_id,
            stripe_customer_id=customer_id,
            stripe_subscription_id=subscription_id,
            tier=SubscriptionTier.PRO,
            status=SubscriptionStatus.ACTIVE,
            current_period_start=datetime.fromtimestamp(stripe_subscription.current_period_start),
            current_period_end=datetime.fromtimestamp(stripe_subscription.current_period_end),
            cancel_at_period_end=stripe_subscription.cancel_at_period_end
        )
        
        await save_user_subscription(subscription)
        logger.info(f"Subscription activated for user {user_id}")
        
    except Exception as e:
        logger.error(f"Error handling checkout completed: {str(e)}")

async def handle_payment_succeeded(invoice):
    """Handle successful payment"""
    try:
        subscription_id = invoice['subscription']
        if subscription_id:
            stripe_subscription = stripe.Subscription.retrieve(subscription_id)
            user_id = stripe_subscription['metadata'].get('user_id')
            
            if user_id:
                subscription = await get_user_subscription(user_id)
                if subscription:
                    subscription.status = SubscriptionStatus.ACTIVE
                    subscription.current_period_start = datetime.fromtimestamp(stripe_subscription.current_period_start)
                    subscription.current_period_end = datetime.fromtimestamp(stripe_subscription.current_period_end)
                    await save_user_subscription(subscription)
                    logger.info(f"Payment succeeded for user {user_id}")
        
    except Exception as e:
        logger.error(f"Error handling payment succeeded: {str(e)}")

async def handle_payment_failed(invoice):
    """Handle failed payment"""
    try:
        subscription_id = invoice['subscription']
        if subscription_id:
            stripe_subscription = stripe.Subscription.retrieve(subscription_id)
            user_id = stripe_subscription['metadata'].get('user_id')
            
            if user_id:
                subscription = await get_user_subscription(user_id)
                if subscription:
                    subscription.status = SubscriptionStatus.PAST_DUE
                    await save_user_subscription(subscription)
                    logger.warning(f"Payment failed for user {user_id}")
        
    except Exception as e:
        logger.error(f"Error handling payment failed: {str(e)}")

async def handle_subscription_updated(stripe_subscription):
    """Handle subscription updates"""
    try:
        user_id = stripe_subscription['metadata'].get('user_id')
        if user_id:
            subscription = await get_user_subscription(user_id)
            if subscription:
                subscription.status = SubscriptionStatus(stripe_subscription['status'])
                subscription.cancel_at_period_end = stripe_subscription['cancel_at_period_end']
                subscription.current_period_start = datetime.fromtimestamp(stripe_subscription['current_period_start'])
                subscription.current_period_end = datetime.fromtimestamp(stripe_subscription['current_period_end'])
                await save_user_subscription(subscription)
                logger.info(f"Subscription updated for user {user_id}")
        
    except Exception as e:
        logger.error(f"Error handling subscription updated: {str(e)}")

async def handle_subscription_deleted(stripe_subscription):
    """Handle subscription deletion"""
    try:
        user_id = stripe_subscription['metadata'].get('user_id')
        if user_id:
            subscription = await get_user_subscription(user_id)
            if subscription:
                subscription.status = SubscriptionStatus.CANCELED
                subscription.tier = SubscriptionTier.FREE
                await save_user_subscription(subscription)
                logger.info(f"Subscription canceled for user {user_id}")
        
    except Exception as e:
        logger.error(f"Error handling subscription deleted: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)