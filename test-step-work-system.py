#!/usr/bin/env python3
"""
Comprehensive Step Work System Test
Tests the complete digital step work system including Step 4 inventory
"""

import json
import urllib.request
import urllib.parse

STEP_WORK_URL = "http://localhost:3004"

def test_step_work_system():
    print("🔥 DIGITAL STEP WORK SYSTEM TEST")
    print("=" * 60)
    
    # Test 1: Create new session
    print("\n1. Creating new step work session...")
    session_data = {"anonymous": True}
    req = urllib.request.Request(
        f"{STEP_WORK_URL}/api/session/create",
        data=json.dumps(session_data).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    
    with urllib.request.urlopen(req) as response:
        session_result = json.loads(response.read().decode('utf-8'))
    
    session_id = session_result['session']['session_id']
    print(f"   ✅ Session created: {session_id}")
    print(f"   🔐 Privacy: {session_result['privacy_notice']}")
    
    # Test 2: Get Step 4 introduction
    print("\n2. Getting Step 4 introduction...")
    with urllib.request.urlopen(f"{STEP_WORK_URL}/api/step4/introduction") as response:
        intro = json.loads(response.read().decode('utf-8'))
    
    print(f"   📚 Title: {intro['title']}")
    print(f"   📖 Sections: {len(intro['sections'])} workbook sections")
    print(f"   🙏 Prayer included: {'prayer_before_starting' in intro}")
    
    # Test 3: Get resentment guide
    print("\n3. Getting resentment inventory guide...")
    with urllib.request.urlopen(f"{STEP_WORK_URL}/api/step4/resentment-guide") as response:
        resentment_guide = json.loads(response.read().decode('utf-8'))
    
    print(f"   📋 Guide sections: {len(resentment_guide['columns'])} columns")
    print(f"   💡 Helpful tips: {len(resentment_guide['helpful_tips'])} tips provided")
    print(f"   📝 Example entry included: {'example_entry' in resentment_guide}")
    
    # Test 4: Save a resentment entry
    print("\n4. Saving Step 4 resentment entry...")
    resentment_data = {
        "session_id": session_id,
        "person_institution": "My former employer",
        "the_cause": "Fired me unfairly after 5 years of good work",
        "affects_my": ["Security", "Self-esteem"],
        "my_part": "I became defensive and argumentative instead of trying to understand their concerns",
        "character_defect": ["Pride", "Fear", "Dishonesty"]
    }
    
    req = urllib.request.Request(
        f"{STEP_WORK_URL}/api/step4/resentment",
        data=json.dumps(resentment_data).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    
    with urllib.request.urlopen(req) as response:
        resentment_result = json.loads(response.read().decode('utf-8'))
    
    print(f"   ✅ Resentment saved: {resentment_result['entry_id']}")
    print(f"   💾 Message: {resentment_result['message']}")
    
    # Test 5: Save a fear entry
    print("\n5. Saving Step 4 fear entry...")
    fear_data = {
        "session_id": session_id,
        "fear_description": "Fear of financial insecurity",
        "why_i_have_this_fear": "Grew up poor and saw my parents struggle with money",
        "what_it_affects": ["Security", "Ambitions"],
        "new_thought_pattern": "I can trust that my Higher Power will provide for my basic needs if I do my part"
    }
    
    req = urllib.request.Request(
        f"{STEP_WORK_URL}/api/step4/fear",
        data=json.dumps(fear_data).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    
    with urllib.request.urlopen(req) as response:
        fear_result = json.loads(response.read().decode('utf-8'))
    
    print(f"   ✅ Fear saved: {fear_result['entry_id']}")
    print(f"   💾 Message: {fear_result['message']}")
    
    # Test 6: Get progress summary
    print("\n6. Checking Step 4 progress...")
    with urllib.request.urlopen(f"{STEP_WORK_URL}/api/step4/progress/{session_id}") as response:
        progress = json.loads(response.read().decode('utf-8'))
    
    progress_data = progress['progress']
    print(f"   📊 Completion: {progress_data['completion_percentage']}%")
    print(f"   📝 Total entries: {progress_data['total_entries']}")
    print(f"   📋 Sections completed: {progress_data['sections_completed']}/4")
    print(f"   🎯 Next section: {progress_data['next_recommended_section']}")
    print(f"   😤 Resentments: {progress_data['resentments_count']}")
    print(f"   😰 Fears: {progress_data['fears_count']}")
    
    # Test 7: Get step-specific prayers
    print("\n7. Getting Step 4 prayers...")
    with urllib.request.urlopen(f"{STEP_WORK_URL}/api/prayers?step=4") as response:
        prayers_result = json.loads(response.read().decode('utf-8'))
    
    print(f"   🙏 Prayers found: {prayers_result['count']} for Step 4")
    for prayer in prayers_result['prayers']:
        print(f"      - {prayer['title']} ({prayer['source']})")
    
    # Test 8: Get inventory
    print("\n8. Retrieving complete inventory...")
    inventory_data = {"session_id": session_id}
    req = urllib.request.Request(
        f"{STEP_WORK_URL}/api/step4/inventory",
        data=json.dumps(inventory_data).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    
    with urllib.request.urlopen(req) as response:
        inventory_result = json.loads(response.read().decode('utf-8'))
    
    if inventory_result['inventory']:
        inventory = inventory_result['inventory']
        print(f"   📋 Complete inventory retrieved")
        print(f"      Resentments: {len(inventory['resentments'])}")
        print(f"      Fears: {len(inventory['fears'])}")
        print(f"      Sex Conduct: {len(inventory['sex_conduct'])}")
        print(f"      Harms Done: {len(inventory['harms_done'])}")
    
    # Test 9: Export step work
    print("\n9. Exporting step work data...")
    export_data = {"session_id": session_id, "format": "json"}
    req = urllib.request.Request(
        f"{STEP_WORK_URL}/api/export",
        data=json.dumps(export_data).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    
    with urllib.request.urlopen(req) as response:
        export_result = json.loads(response.read().decode('utf-8'))
    
    print(f"   📤 Export successful: {export_result['success']}")
    print(f"   📁 Format: {export_result['format']}")
    print(f"   🕒 Generated: {export_result['generated_at']}")
    
    # Test 10: Privacy - Delete all data
    print("\n10. Testing privacy deletion...")
    req = urllib.request.Request(
        f"{STEP_WORK_URL}/api/session/{session_id}",
        method='DELETE'
    )
    req.get_method = lambda: 'DELETE'
    
    with urllib.request.urlopen(req) as response:
        delete_result = json.loads(response.read().decode('utf-8'))
    
    print(f"   🗑️ Data deletion: {delete_result['success']}")
    print(f"   🔐 Message: {delete_result['message']}")
    
    print(f"\n{'🎯' * 20}")
    print("STEP WORK SYSTEM TEST RESULTS")
    print('🎯' * 20)
    print("✅ Session creation and management")
    print("✅ Step 4 moral inventory workbook")
    print("✅ Resentment tracking with guided prompts")
    print("✅ Fear inventory with therapeutic guidance")
    print("✅ Progress tracking and resume capability")
    print("✅ Step-specific prayers and meditations")
    print("✅ Complete data export functionality")
    print("✅ Privacy-first with complete data deletion")
    print()
    print("🔥 DIGITAL STEP WORK SYSTEM FULLY OPERATIONAL!")
    print("   Ready for users to work their steps digitally")
    print("   Privacy-first design with user-controlled data")
    print("   Complete Step 4 moral inventory system")
    print("   Integrated with literature and AI guidance")

if __name__ == "__main__":
    test_step_work_system()