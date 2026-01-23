#!/usr/bin/env python3
"""
Populate ad_inventory container with recovery-appropriate advertisements
Digital Sponsor Ad Service - Phase 1 Implementation
"""

import asyncio
import os
import json
from datetime import datetime
from azure.cosmos.aio import CosmosClient
from azure.identity.aio import DefaultAzureCredential

# Configuration
COSMOS_ENDPOINT = "https://digitalsponsor-cosmos.documents.azure.com:443/"
COSMOS_DATABASE = "DigitalSponsor"
CONTAINER_NAME = "ad_inventory"

# Recovery-appropriate ad inventory
INITIAL_ADS = [
    {
        "id": "recovery_lit_001",
        "ad_id": "recovery_lit_001",
        "title": "AA Big Book Study Guide",
        "description": "Enhanced study materials for working the 12 steps with interactive worksheets",
        "url": "https://aabigbookstudy.com/enhanced-guide",
        "image_url": "https://ads.digitalsponsor.ai/recovery-lit-001.jpg",
        "provider": "recovery_literature_provider",
        "ad_type": "recovery_literature", 
        "contexts": ["step_work", "literature_search"],
        "cpm_rate": 15.0,
        "cpc_rate": 0.25,
        "active": True,
        "targeting_rules": {
            "min_sobriety_days": 0,
            "max_frequency_daily": 2,
            "geographic_restrictions": [],
            "exclude_crisis_mode": True
        },
        "performance_metrics": {
            "total_impressions": 0,
            "total_clicks": 0,
            "ctr": 0.0,
            "total_revenue": 0.0,
            "last_updated": datetime.utcnow().isoformat()
        },
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    },
    {
        "id": "therapy_001",
        "ad_id": "therapy_001", 
        "title": "BetterHelp - Professional Therapy",
        "description": "Online therapy specialized in addiction recovery and mental health support",
        "url": "https://www.betterhelp.com/recovery-support",
        "image_url": "https://ads.digitalsponsor.ai/therapy-001.jpg",
        "provider": "betterhelp",
        "ad_type": "therapy_services",
        "contexts": ["chat_completion", "general"],
        "cpm_rate": 12.0,
        "cpc_rate": 0.50,
        "active": True,
        "targeting_rules": {
            "min_sobriety_days": 30,
            "max_frequency_daily": 1,
            "geographic_restrictions": ["US", "CA"],
            "exclude_crisis_mode": True
        },
        "performance_metrics": {
            "total_impressions": 0,
            "total_clicks": 0,
            "ctr": 0.0,
            "total_revenue": 0.0,
            "last_updated": datetime.utcnow().isoformat()
        },
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    },
    {
        "id": "meditation_001",
        "ad_id": "meditation_001",
        "title": "Calm - Meditation & Sleep",
        "description": "Mindfulness and meditation specifically designed for recovery journey",
        "url": "https://www.calm.com/recovery-meditation",
        "image_url": "https://ads.digitalsponsor.ai/meditation-001.jpg",
        "provider": "calm",
        "ad_type": "meditation_apps",
        "contexts": ["general", "step_work"],
        "cpm_rate": 8.0,
        "cpc_rate": 0.15,
        "active": True,
        "targeting_rules": {
            "min_sobriety_days": 0,
            "max_frequency_daily": 3,
            "geographic_restrictions": [],
            "exclude_crisis_mode": True
        },
        "performance_metrics": {
            "total_impressions": 0,
            "total_clicks": 0,
            "ctr": 0.0,
            "total_revenue": 0.0,
            "last_updated": datetime.utcnow().isoformat()
        },
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    },
    {
        "id": "local_services_001",
        "ad_id": "local_services_001",
        "title": "Find Local AA Meetings",
        "description": "Comprehensive meeting finder with real-time updates and directions",
        "url": "https://aa-intergroup.org/meetings",
        "image_url": "https://ads.digitalsponsor.ai/local-services-001.jpg", 
        "provider": "aa_intergroup",
        "ad_type": "local_services",
        "contexts": ["meeting_finder", "general"],
        "cpm_rate": 18.0,
        "cpc_rate": 0.30,
        "active": True,
        "targeting_rules": {
            "min_sobriety_days": 0,
            "max_frequency_daily": 2,
            "geographic_restrictions": [],
            "exclude_crisis_mode": False  # Important for crisis support
        },
        "performance_metrics": {
            "total_impressions": 0,
            "total_clicks": 0,
            "ctr": 0.0,
            "total_revenue": 0.0,
            "last_updated": datetime.utcnow().isoformat()
        },
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    },
    {
        "id": "wellness_001",
        "ad_id": "wellness_001",
        "title": "Recovery Nutrition Guide",
        "description": "Healthy eating habits to support your physical recovery journey",
        "url": "https://recovery-nutrition.org/guide",
        "image_url": "https://ads.digitalsponsor.ai/wellness-001.jpg",
        "provider": "recovery_wellness",
        "ad_type": "wellness_apps",
        "contexts": ["general"],
        "cpm_rate": 6.0,
        "cpc_rate": 0.10,
        "active": True,
        "targeting_rules": {
            "min_sobriety_days": 90,
            "max_frequency_daily": 1,
            "geographic_restrictions": [],
            "exclude_crisis_mode": True
        },
        "performance_metrics": {
            "total_impressions": 0,
            "total_clicks": 0,
            "ctr": 0.0,
            "total_revenue": 0.0,
            "last_updated": datetime.utcnow().isoformat()
        },
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }
]

async def populate_ad_inventory():
    """Populate the ad_inventory container with initial ads"""
    try:
        # Initialize Cosmos client
        credential = DefaultAzureCredential()
        client = CosmosClient(COSMOS_ENDPOINT, credential=credential)
        
        # Get database and container
        database = client.get_database_client(COSMOS_DATABASE)
        container = database.get_container_client(CONTAINER_NAME)
        
        print(f"📦 Populating {CONTAINER_NAME} container with {len(INITIAL_ADS)} recovery-appropriate ads...")
        
        # Insert each ad
        for ad_data in INITIAL_ADS:
            try:
                # Create/upsert the ad document
                await container.upsert_item(ad_data)
                print(f"✅ Inserted ad: {ad_data['ad_id']} - {ad_data['title']}")
                
            except Exception as e:
                print(f"❌ Failed to insert ad {ad_data['ad_id']}: {str(e)}")
        
        print(f"\n🎯 Successfully populated ad inventory!")
        print(f"📊 Ad breakdown by type:")
        
        # Summarize ads by type
        ad_types = {}
        for ad in INITIAL_ADS:
            ad_type = ad['ad_type']
            if ad_type not in ad_types:
                ad_types[ad_type] = []
            ad_types[ad_type].append(ad['title'])
        
        for ad_type, ads in ad_types.items():
            print(f"   {ad_type}: {len(ads)} ads")
            for ad_title in ads:
                print(f"     - {ad_title}")
        
        # Calculate total potential revenue
        total_cpm = sum(ad['cpm_rate'] for ad in INITIAL_ADS)
        avg_cmp = total_cpm / len(INITIAL_ADS)
        print(f"\n💰 Revenue potential:")
        print(f"   Average CPM: ${avg_cmp:.2f}")
        print(f"   Total inventory CPM: ${total_cpm:.2f}")
        
        print(f"\n🎨 Context coverage:")
        all_contexts = set()
        for ad in INITIAL_ADS:
            all_contexts.update(ad['contexts'])
        print(f"   Supported contexts: {', '.join(sorted(all_contexts))}")
        
        await client.close()
        
    except Exception as e:
        print(f"❌ Error populating ad inventory: {str(e)}")
        raise

async def verify_ad_inventory():
    """Verify the ad inventory was populated correctly"""
    try:
        # Initialize Cosmos client
        credential = DefaultAzureCredential()
        client = CosmosClient(COSMOS_ENDPOINT, credential=credential)
        
        database = client.get_database_client(COSMOS_DATABASE)
        container = database.get_container_client(CONTAINER_NAME)
        
        print(f"\n🔍 Verifying ad inventory...")
        
        # Query all ads
        query = "SELECT c.ad_id, c.title, c.provider, c.cpm_rate, c.active FROM c WHERE c.active = true"
        
        ads = []
        async for item in container.query_items(query, enable_cross_partition_query=True):
            ads.append(item)
        
        print(f"✅ Found {len(ads)} active ads in inventory")
        
        for ad in ads:
            print(f"   📝 {ad['ad_id']}: {ad['title']} (${ad['cpm_rate']} CPM) - {ad['provider']}")
        
        await client.close()
        
        return len(ads) == len(INITIAL_ADS)
        
    except Exception as e:
        print(f"❌ Error verifying ad inventory: {str(e)}")
        return False

async def main():
    """Main function to populate and verify ad inventory"""
    print("🚀 Digital Sponsor Ad Inventory Setup")
    print("=" * 50)
    
    try:
        # Populate the inventory
        await populate_ad_inventory()
        
        # Verify the population
        success = await verify_ad_inventory()
        
        if success:
            print(f"\n🎉 Ad inventory setup completed successfully!")
            print(f"🎯 Ready for Phase 1 ad serving")
        else:
            print(f"\n⚠️ Verification failed - please check manually")
            
    except Exception as e:
        print(f"\n❌ Setup failed: {str(e)}")

if __name__ == "__main__":
    asyncio.run(main())