#!/usr/bin/env python3
"""
Setup Stripe products and prices for Digital Sponsor Pro subscription
Run this once to configure Stripe with the correct products and pricing
"""

import stripe
import os
import json
from datetime import datetime

# Stripe configuration (set your keys as environment variables)
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")

if not stripe.api_key:
    print("❌ STRIPE_SECRET_KEY environment variable not set")
    print("💡 Set your Stripe secret key: export STRIPE_SECRET_KEY=sk_test_...")
    exit(1)

def setup_stripe_products():
    """Create Digital Sponsor Pro product and pricing in Stripe"""
    
    print("🚀 Setting up Digital Sponsor Pro subscription in Stripe")
    print("=" * 60)
    
    try:
        # Create the Digital Sponsor Pro product
        print("📦 Creating Digital Sponsor Pro product...")
        
        product = stripe.Product.create(
            name="Digital Sponsor Pro",
            description="Premium recovery support with unlimited access and ad-free experience",
            metadata={
                "service": "digital-sponsor",
                "tier": "pro",
                "features": json.dumps([
                    "Unlimited chat conversations",
                    "Advanced step work guidance",
                    "Ad-free experience", 
                    "Priority support",
                    "Custom recovery goals",
                    "Progress analytics"
                ])
            }
        )
        
        print(f"✅ Product created: {product.id}")
        print(f"📝 Name: {product.name}")
        print(f"📋 Description: {product.description}")
        
        # Create monthly pricing
        print(f"\n💰 Creating monthly pricing...")
        
        monthly_price = stripe.Price.create(
            product=product.id,
            unit_amount=799,  # $7.99 in cents
            currency='usd',
            recurring={'interval': 'month'},
            nickname='Pro Monthly',
            metadata={
                'plan': 'pro-monthly',
                'billing_period': 'monthly'
            }
        )
        
        print(f"✅ Monthly price created: {monthly_price.id}")
        print(f"💵 Amount: ${monthly_price.unit_amount / 100:.2f} USD")
        print(f"🔄 Interval: {monthly_price.recurring['interval']}")
        
        # Create annual pricing (with discount)
        print(f"\n💰 Creating annual pricing (with 2 months free)...")
        
        annual_price = stripe.Price.create(
            product=product.id,
            unit_amount=7990,  # $79.90 (10 months price for 12 months)
            currency='usd',
            recurring={'interval': 'year'},
            nickname='Pro Annual',
            metadata={
                'plan': 'pro-annual',
                'billing_period': 'annual',
                'discount': '2 months free'
            }
        )
        
        print(f"✅ Annual price created: {annual_price.id}")
        print(f"💵 Amount: ${annual_price.unit_amount / 100:.2f} USD")
        print(f"🔄 Interval: {annual_price.recurring['interval']}")
        print(f"💝 Discount: 2 months free (16.7% savings)")
        
        # Summary and configuration
        print(f"\n🎯 STRIPE CONFIGURATION SUMMARY")
        print("=" * 60)
        print(f"Product ID: {product.id}")
        print(f"Monthly Price ID: {monthly_price.id}")
        print(f"Annual Price ID: {annual_price.id}")
        
        print(f"\n🔧 UPDATE YOUR PAYMENT SERVICE CONFIGURATION:")
        print("Update the following in your payment service app.py:")
        print(f'PRO_MONTHLY_PRICE_ID = "{monthly_price.id}"')
        print(f'PRO_ANNUAL_PRICE_ID = "{annual_price.id}"')
        
        print(f"\n🌐 TEST YOUR CONFIGURATION:")
        print("1. Update the price_id in payment-service/app.py")
        print("2. Set environment variables:")
        print(f"   export STRIPE_SECRET_KEY={stripe.api_key}")
        print(f"   export STRIPE_PUBLISHABLE_KEY=pk_test_...")
        print(f"   export STRIPE_WEBHOOK_SECRET=whsec_...")
        print("3. Deploy and test checkout flow")
        
        # Create test checkout session for verification
        print(f"\n🧪 Creating test checkout session...")
        
        session = stripe.checkout.Session.create(
            line_items=[{
                'price': monthly_price.id,
                'quantity': 1,
            }],
            mode='subscription',
            success_url='https://digitalsponsor.commonsolution.org/success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url='https://digitalsponsor.commonsolution.org/cancel',
            metadata={'test': 'true'}
        )
        
        print(f"✅ Test checkout session: {session.id}")
        print(f"🔗 Test URL: {session.url}")
        print(f"⚠️ This is a test session - do not use for real payments")
        
        return {
            'product_id': product.id,
            'monthly_price_id': monthly_price.id,
            'annual_price_id': annual_price.id,
            'test_checkout_url': session.url
        }
        
    except stripe.error.StripeError as e:
        print(f"❌ Stripe error: {str(e)}")
        return None
    except Exception as e:
        print(f"❌ Setup error: {str(e)}")
        return None

def list_existing_products():
    """List existing Stripe products to avoid duplicates"""
    print("🔍 Checking existing Stripe products...")
    
    try:
        products = stripe.Product.list(active=True)
        
        if products.data:
            print(f"📦 Found {len(products.data)} existing products:")
            for product in products.data:
                print(f"   • {product.name} ({product.id})")
                
                # List prices for this product
                prices = stripe.Price.list(product=product.id, active=True)
                for price in prices.data:
                    amount = price.unit_amount / 100 if price.unit_amount else 0
                    interval = price.recurring['interval'] if price.recurring else 'one-time'
                    print(f"     └─ ${amount:.2f} {price.currency.upper()} / {interval} ({price.id})")
        else:
            print("📦 No existing products found")
        
        return len(products.data)
        
    except stripe.error.StripeError as e:
        print(f"❌ Error listing products: {str(e)}")
        return 0

def main():
    """Main setup function"""
    print("💳 Digital Sponsor Stripe Setup")
    print("=" * 60)
    
    # Check existing products
    existing_count = list_existing_products()
    
    if existing_count > 0:
        response = input(f"\n⚠️ Found {existing_count} existing products. Continue with setup? (y/N): ")
        if response.lower() != 'y':
            print("🚫 Setup canceled")
            return
    
    # Setup new products
    result = setup_stripe_products()
    
    if result:
        print(f"\n🎉 Stripe setup completed successfully!")
        print(f"💡 Don't forget to:")
        print(f"   1. Update payment-service configuration")
        print(f"   2. Configure webhook endpoints")
        print(f"   3. Test the checkout flow")
        print(f"   4. Set up production keys for live deployment")
    else:
        print(f"\n❌ Stripe setup failed")

if __name__ == "__main__":
    main()