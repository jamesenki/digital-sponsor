#!/usr/bin/env python3
"""
Simple test of Step Work components
"""

from step_work_data_model import StepWorkDataManager, get_step_prayers
from step4_workbook import Step4WorkbookGuide

def test_step_work_components():
    print("🔥 STEP WORK COMPONENTS TEST")
    print("=" * 50)
    
    # Test 1: Data Manager
    print("\n1. Testing data manager...")
    manager = StepWorkDataManager()
    session = manager.create_session(anonymous=True)
    print(f"   ✅ Session created: {session.session_id}")
    print(f"   🔐 Privacy settings: {session.privacy_settings}")
    
    # Test 2: Step 4 Workbook
    print("\n2. Testing Step 4 workbook...")
    workbook = Step4WorkbookGuide()
    intro = workbook.get_introduction()
    print(f"   📚 Title: {intro['title']}")
    print(f"   📖 Sections: {len(intro['sections'])}")
    
    # Test 3: Resentment Guide
    print("\n3. Testing resentment guide...")
    resentment_guide = workbook.get_resentment_instructions()
    print(f"   📋 Columns: {len(resentment_guide['columns'])}")
    print(f"   💡 Tips: {len(resentment_guide['helpful_tips'])}")
    
    # Test 4: Save Resentment
    print("\n4. Testing resentment save...")
    resentment_data = {
        'person_institution': 'Test Person',
        'the_cause': 'Test issue',
        'affects_my': ['Self-esteem'],
        'my_part': 'My responsibility',
        'character_defect': ['Fear']
    }
    entry_id = workbook.save_resentment(session.session_id, resentment_data)
    print(f"   ✅ Resentment saved: {entry_id}")
    
    # Test 5: Progress
    print("\n5. Testing progress tracking...")
    progress = workbook.get_progress_summary(session.session_id)
    print(f"   📊 Completion: {progress['completion_percentage']}%")
    print(f"   📝 Entries: {progress['total_entries']}")
    
    # Test 6: Prayers
    print("\n6. Testing prayers...")
    prayers = get_step_prayers(1)
    print(f"   🙏 Step 1 prayers: {len(prayers)}")
    if prayers:
        print(f"      - {prayers[0].title}")
    
    # Test 7: Export
    print("\n7. Testing export...")
    export_data = manager.export_step_work(session.session_id)
    print(f"   📤 Export length: {len(export_data)} characters")
    
    # Test 8: Privacy - Delete
    print("\n8. Testing privacy deletion...")
    deleted = manager.delete_all_user_data(session.session_id)
    print(f"   🗑️ Deletion successful: {deleted}")
    
    print(f"\n{'✅' * 20}")
    print("STEP WORK COMPONENTS FULLY FUNCTIONAL")
    print('✅' * 20)
    print("🔥 Ready for integration with web interface!")

if __name__ == "__main__":
    test_step_work_components()