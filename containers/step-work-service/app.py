#!/usr/bin/env python3
"""
Digital Sponsor Step Work Service
Interactive step work with privacy-first design and Cosmos DB persistence
"""

import http.server
import socketserver
import json
import os
import urllib.parse
from datetime import datetime
from step_work_data_model import StepWorkDataManager, CosmosDBDataManager, get_step_prayers
from step4_workbook import Step4WorkbookGuide
from rag_integration import StepWorkRAGIntegration
from reflection_questions import (
    get_reflection_questions_dict,
    format_reflection_questions,
    has_reflection_questions,
    should_show_reflections,
    STEPS_WITH_REFLECTIONS
)
from step_workbook_content import (
    get_step_workbook,
    get_step_prayer,
    get_step_meditations,
    get_step_questions,
    STEP_WORKBOOKS
)
from step11_meditation import Step11MeditationGuide
from step12_service_tracker import Step12ServiceTracker, ServiceCategory
from step8_list_builder import Step8ListBuilder, get_step8_builder
from step9_amends_tracker import Step9AmendsTracker, get_step9_tracker


class StepWorkHandler(http.server.BaseHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        self.data_manager = StepWorkDataManager()
        self.step4_guide = Step4WorkbookGuide()
        self.step8_builder = get_step8_builder()
        super().__init__(*args, **kwargs)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def do_GET(self):
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path
        query_params = urllib.parse.parse_qs(parsed_path.query)

        if path == '/health':
            self.handle_health()

        elif path == '/api/step4/introduction':
            self.send_json_response(self.step4_guide.get_introduction())

        elif path == '/api/step4/resentment-guide':
            self.send_json_response(self.step4_guide.get_resentment_instructions())

        elif path == '/api/step4/fear-guide':
            self.send_json_response(self.step4_guide.get_fear_instructions())

        elif path == '/api/step4/sex-conduct-guide':
            self.send_json_response(self.step4_guide.get_sex_conduct_instructions())

        elif path.startswith('/api/prayers'):
            self.handle_get_prayers(query_params)

        elif path.startswith('/api/step4/progress/'):
            session_id = path.split('/')[-1]
            self.handle_get_progress(session_id)

        elif path.startswith('/api/guidance/step/'):
            self.handle_get_step_guidance(path, query_params)

        elif path == '/api/guidance/resentment':
            self.handle_get_resentment_guidance(query_params)

        elif path == '/api/guidance/fear':
            self.handle_get_fear_guidance(query_params)

        # New reflection endpoints
        elif path.startswith('/api/reflection/questions/'):
            step_number = int(path.split('/')[-1])
            self.handle_get_reflection_questions(step_number, query_params)

        elif path.startswith('/api/stepwork/history/'):
            self.handle_get_step_work_history(path, query_params)

        elif path.startswith('/api/stepwork/progress/'):
            user_id = path.split('/')[-1]
            self.handle_get_user_progress(user_id)

        # ========================================
        # Step Workbook Content endpoints
        # ========================================
        elif path.startswith('/api/workbook/step/'):
            self.handle_workbook_content(path, query_params)

        # ========================================
        # Step 11 Meditation endpoints
        # ========================================
        elif path == '/api/step11/prayers':
            self.handle_step11_prayers()

        elif path == '/api/step11/meditation/prompts':
            self.handle_step11_meditation_prompts()

        elif path.startswith('/api/step11/meditation/history/'):
            user_id = path.split('/')[-1]
            self.handle_step11_meditation_history(user_id)

        elif path.startswith('/api/step11/intentions/'):
            user_id = path.split('/')[-1]
            self.handle_step11_intentions(user_id, query_params)

        elif path.startswith('/api/step11/reviews/'):
            user_id = path.split('/')[-1]
            self.handle_step11_reviews(user_id, query_params)

        # ========================================
        # Step 12 Service Tracker endpoints
        # ========================================
        elif path == '/api/step12/prayer':
            self.handle_step12_prayer()

        elif path == '/api/step12/service/categories':
            self.handle_step12_service_categories()

        elif path.startswith('/api/step12/service/history/'):
            user_id = path.split('/')[-1]
            self.handle_step12_service_history(user_id, query_params)

        elif path.startswith('/api/step12/service/summary/'):
            user_id = path.split('/')[-1]
            self.handle_step12_service_summary(user_id)

        elif path.startswith('/api/step12/sponsees/'):
            user_id = path.split('/')[-1]
            self.handle_step12_sponsees(user_id)

        elif path.startswith('/api/step12/experiences/'):
            user_id = path.split('/')[-1]
            self.handle_step12_experiences(user_id, query_params)

        # ========================================
        # Step 8 List Builder endpoints
        # ========================================
        elif path.startswith('/api/step8/suggestions/'):
            user_id = path.split('/')[-1]
            self.handle_step8_suggestions(user_id)

        elif path.startswith('/api/step8/list/'):
            parts = path.split('/')
            if len(parts) >= 4:
                user_id = parts[3]
                session_id = parts[4] if len(parts) > 4 else None
                self.handle_step8_get_list(user_id, session_id)
            else:
                self.send_error(400)

        elif path == '/api/step8/reflection-questions':
            self.handle_step8_reflection_questions()

        # ========================================
        # Step 9 Amends Tracker endpoints
        # ========================================
        elif path.startswith('/api/step9/list/'):
            user_id = path.split('/')[-1]
            self.handle_step9_get_list(user_id)

        elif path.startswith('/api/step9/session/'):
            session_id = path.split('/')[-1]
            self.handle_step9_get_session(session_id)

        elif path.startswith('/api/step9/summary/'):
            user_id = path.split('/')[-1]
            self.handle_step9_get_summary(user_id)

        elif path == '/api/step9/guidance':
            self.handle_step9_guidance()

        elif path.startswith('/api/step9/prompts/'):
            status = path.split('/')[-1]
            self.handle_step9_reflection_prompts(status)

        else:
            self.send_error(404)

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)

        try:
            data = json.loads(post_data.decode('utf-8'))
        except json.JSONDecodeError:
            self.send_error(400, 'Invalid JSON')
            return

        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path

        if path == '/api/session/create':
            self.handle_create_session(data)

        elif path == '/api/step4/resentment':
            self.handle_save_resentment(data)

        elif path == '/api/step4/fear':
            self.handle_save_fear(data)

        elif path == '/api/step4/inventory':
            self.handle_get_inventory(data)

        elif path == '/api/export':
            self.handle_export(data)

        # New step work versioning endpoints
        elif path == '/api/stepwork/start':
            self.handle_start_step_work(data)

        elif path == '/api/stepwork/response':
            self.handle_save_response(data)

        elif path == '/api/stepwork/reflection':
            self.handle_save_reflection_response(data)

        elif path == '/api/stepwork/complete':
            self.handle_complete_step_work(data)

        # ========================================
        # Step Workbook Response endpoints
        # ========================================
        elif path == '/api/workbook/response':
            self.handle_workbook_response(data)

        # ========================================
        # Step 11 Meditation POST endpoints
        # ========================================
        elif path == '/api/step11/meditation/start':
            self.handle_step11_meditation_start(data)

        elif path == '/api/step11/meditation/complete':
            self.handle_step11_meditation_complete(data)

        elif path == '/api/step11/intention':
            self.handle_step11_save_intention(data)

        elif path == '/api/step11/review':
            self.handle_step11_save_review(data)

        # ========================================
        # Step 12 Service Tracker POST endpoints
        # ========================================
        elif path == '/api/step12/service/log':
            self.handle_step12_log_service(data)

        elif path == '/api/step12/sponsee':
            self.handle_step12_add_sponsee(data)

        elif path == '/api/step12/experience':
            self.handle_step12_add_experience(data)

        elif path == '/api/step12/commitment':
            self.handle_step12_add_commitment(data)

        # ========================================
        # Step 8 List Builder POST endpoints
        # ========================================
        elif path == '/api/step8/list/create':
            self.handle_step8_create_list(data)

        elif path == '/api/step8/entry':
            self.handle_step8_add_entry(data)

        elif path == '/api/step8/entry/update':
            self.handle_step8_update_entry(data)

        elif path == '/api/step8/list/complete':
            self.handle_step8_complete_list(data)

        # ========================================
        # Step 9 Amends Tracker POST endpoints
        # ========================================
        elif path == '/api/step9/session/create':
            self.handle_step9_create_session(data)

        elif path == '/api/step9/import-from-step8':
            self.handle_step9_import_from_step8(data)

        elif path == '/api/step9/entry':
            self.handle_step9_add_entry(data)

        elif path == '/api/step9/entry/update':
            self.handle_step9_update_entry(data)

        elif path == '/api/step9/session/complete':
            self.handle_step9_complete_session(data)

        else:
            self.send_error(404)

    def do_DELETE(self):
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path

        if path.startswith('/api/session/'):
            session_id = path.split('/')[-1]
            self.handle_delete_session(session_id)

        elif path.startswith('/api/stepwork/user/'):
            user_id = path.split('/')[-1]
            self.handle_delete_user_step_work(user_id)

        elif path.startswith('/api/step8/entry/'):
            entry_id = path.split('/')[-1]
            self.handle_step8_delete_entry(entry_id)

        elif path.startswith('/api/step9/entry/'):
            entry_id = path.split('/')[-1]
            self.handle_step9_delete_entry(entry_id)

        else:
            self.send_error(404)

    # ========================================
    # Response helpers
    # ========================================

    def send_json_response(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data, indent=2).encode())

    # ========================================
    # Health check
    # ========================================

    def handle_health(self):
        db_health = self.cosmos_data_manager.health_check()

        response = {
            'status': 'healthy',
            'service': 'Digital Sponsor Step Work Service',
            'version': '3.0.0 - Cosmos DB + Versioning',
            'region': 'Central US',
            'features': [
                'Interactive Step Work Workbooks (All 12 Steps)',
                'Step 4 Moral Inventory System',
                'Privacy-First Data Management',
                'Step-Specific Prayers and Meditations',
                'Progress Tracking and Resume',
                'Complete Data Deletion',
                'RAG-Enhanced Step Guidance',
                'Cosmos DB Persistence',
                'Step Work Version Control',
                'Reflection Questions for Repeat Work',
                'Step 11 Guided Meditation with Timer & Streak Tracking',
                'Step 12 Service Tracker with Categories',
                'Sponsorship Management',
                'Twelfth Step Experience Journal'
            ],
            'database': db_health,
            'rag_integration': {
                'literature_service': LITERATURE_SERVICE_URL,
                'chat_service': CHAT_SERVICE_URL,
            },
            'reflection_steps': STEPS_WITH_REFLECTIONS,
            'timestamp': datetime.now().isoformat()
        }
        self.send_json_response(response)

    # ========================================
    # Prayer endpoints
    # ========================================

    def handle_get_prayers(self, query_params):
        step_number = query_params.get('step', [None])[0]
        if step_number:
            try:
                step_num = int(step_number)
                prayers = get_step_prayers(step_num)
            except ValueError:
                prayers = get_step_prayers()
        else:
            prayers = get_step_prayers()

        response = {
            'success': True,
            'prayers': [prayer.to_dict() for prayer in prayers],
            'count': len(prayers)
        }
        self.send_json_response(response)

    # ========================================
    # Session endpoints
    # ========================================

    def handle_create_session(self, data):
        anonymous = data.get('anonymous', True)
        user_id = data.get('user_id') if not anonymous else None

        session = self.data_manager.create_session(user_id=user_id, anonymous=anonymous)

        response = {
            'success': True,
            'session': session.to_dict(),
            'privacy_notice': 'Your data is stored privately and can be deleted anytime'
        }
        self.send_json_response(response, status=201)

    def handle_delete_session(self, session_id):
        if not session_id:
            self.send_error(400, 'Session ID required')
            return

        success = self.data_manager.delete_all_user_data(session_id)

        if success:
            response = {
                'success': True,
                'message': 'All user data deleted successfully',
                'session_id': session_id
            }
            self.send_json_response(response)
        else:
            self.send_error(500, 'Failed to delete user data')

    # ========================================
    # Step 4 inventory endpoints
    # ========================================

    def handle_save_resentment(self, data):
        session_id = data.get('session_id')
        user_id = data.get('user_id')

        if not session_id:
            self.send_error(400, 'Session ID required')
            return

        resentment_data = {
            'person_institution': data.get('person_institution', ''),
            'the_cause': data.get('the_cause', ''),
            'affects_my': data.get('affects_my', []),
            'my_part': data.get('my_part', ''),
            'character_defect': data.get('character_defect', [])
        }

        # Use Cosmos DB if user_id provided
        if user_id:
            entry_id = self.cosmos_data_manager.save_resentment(session_id, user_id, resentment_data)
        else:
            entry_id = self.step4_guide.save_resentment(session_id, resentment_data)

        response = {
            'success': True,
            'entry_id': entry_id,
            'message': 'Resentment saved successfully'
        }
        self.send_json_response(response, status=201)

    def handle_save_fear(self, data):
        session_id = data.get('session_id')
        user_id = data.get('user_id')

        if not session_id:
            self.send_error(400, 'Session ID required')
            return

        fear_data = {
            'fear_description': data.get('fear_description', ''),
            'why_i_have_this_fear': data.get('why_i_have_this_fear', ''),
            'what_it_affects': data.get('what_it_affects', []),
            'new_thought_pattern': data.get('new_thought_pattern', '')
        }

        # Use Cosmos DB if user_id provided
        if user_id:
            entry_id = self.cosmos_data_manager.save_fear(session_id, user_id, fear_data)
        else:
            entry_id = self.step4_guide.save_fear(session_id, fear_data)

        response = {
            'success': True,
            'entry_id': entry_id,
            'message': 'Fear saved successfully'
        }
        self.send_json_response(response, status=201)

    def handle_get_inventory(self, data):
        session_id = data.get('session_id')
        user_id = data.get('user_id')

        if not session_id:
            self.send_error(400, 'Session ID required')
            return

        # Use Cosmos DB if user_id provided
        if user_id:
            inventory = self.cosmos_data_manager.get_inventory(session_id, user_id)
        else:
            inventory = self.data_manager.get_step4_inventory(session_id)
            if inventory:
                inventory = inventory.to_dict()

        if inventory:
            response = {
                'success': True,
                'inventory': inventory
            }
        else:
            response = {
                'success': True,
                'inventory': None,
                'message': 'No inventory found for this session'
            }

        self.send_json_response(response)

    def handle_get_progress(self, session_id):
        if not session_id:
            self.send_error(400, 'Session ID required')
            return

        progress = self.step4_guide.get_progress_summary(session_id)

        response = {
            'success': True,
            'session_id': session_id,
            'progress': progress
        }
        self.send_json_response(response)

    def handle_export(self, data):
        session_id = data.get('session_id')
        format_type = data.get('format', 'json')

        if not session_id:
            self.send_error(400, 'Session ID required')
            return

        export_data = self.data_manager.export_step_work(session_id, format_type)

        response = {
            'success': True,
            'export_data': export_data,
            'format': format_type,
            'generated_at': datetime.now().isoformat()
        }
        self.send_json_response(response)

    # ========================================
    # RAG guidance endpoints
    # ========================================

    def handle_get_step_guidance(self, path, query_params):
        try:
            step_number = int(path.split('/')[-1])
            specific_challenge = query_params.get('challenge', [''])[0]

            guidance = self.rag_integration.get_step_guidance(step_number, specific_challenge)
            self.send_json_response(guidance)

        except (ValueError, IndexError):
            self.send_error(400, 'Invalid step number')

    def handle_get_resentment_guidance(self, query_params):
        resentment_desc = query_params.get('description', [''])[0]
        if not resentment_desc:
            self.send_error(400, 'Resentment description required')
            return

        guidance = self.rag_integration.get_resentment_guidance(resentment_desc)
        self.send_json_response(guidance)

    def handle_get_fear_guidance(self, query_params):
        fear_desc = query_params.get('description', [''])[0]
        if not fear_desc:
            self.send_error(400, 'Fear description required')
            return

        guidance = self.rag_integration.get_fear_guidance(fear_desc)
        self.send_json_response(guidance)

    # ========================================
    # NEW: Step work versioning endpoints
    # ========================================

    def handle_start_step_work(self, data):
        """Start a new step work session with version tracking"""
        user_id = data.get('user_id')
        step_number = data.get('step_number')

        if not step_number:
            self.send_error(400, 'Step number required')
            return

        result = self.cosmos_data_manager.create_step_work_session(user_id, step_number)

        # Include reflection questions if this is repeat work
        if result.get('is_repeat') and has_reflection_questions(step_number):
            # Get previous responses for this step
            previous_responses = self.cosmos_data_manager.get_previous_responses(user_id, step_number)
            result['reflection_questions'] = format_reflection_questions(step_number, previous_responses)
            result['show_reflections'] = True
        else:
            result['show_reflections'] = False

        response = {
            'success': True,
            **result,
            'message': f"Started Step {step_number} work (Version {result['version_number']})"
        }
        self.send_json_response(response, status=201)

    def handle_save_response(self, data):
        """Save a Q&A response to a step work session"""
        session_id = data.get('session_id')
        user_id = data.get('user_id')
        prompt = data.get('prompt')
        response_text = data.get('response')
        section = data.get('section', 'general')

        if not session_id or not prompt or not response_text:
            self.send_error(400, 'session_id, prompt, and response required')
            return

        result = self.cosmos_data_manager.save_response(session_id, user_id, prompt, response_text, section)

        response = {
            'success': True,
            **result,
            'message': 'Response saved successfully'
        }
        self.send_json_response(response)

    def handle_save_reflection_response(self, data):
        """Save a reflection response for repeat step work"""
        session_id = data.get('session_id')
        user_id = data.get('user_id')
        question = data.get('question')
        response_text = data.get('response')
        previous_response = data.get('previous_response', '')
        change_noted = data.get('change_noted', '')

        if not session_id or not question or not response_text:
            self.send_error(400, 'session_id, question, and response required')
            return

        result = self.cosmos_data_manager.save_reflection_response(
            session_id, user_id, question, response_text, previous_response, change_noted
        )

        response = {
            'success': True,
            **result,
            'message': 'Reflection response saved successfully'
        }
        self.send_json_response(response)

    def handle_complete_step_work(self, data):
        """Mark a step work session as complete"""
        session_id = data.get('session_id')
        user_id = data.get('user_id')

        if not session_id:
            self.send_error(400, 'session_id required')
            return

        result = self.cosmos_data_manager.complete_step_work(session_id, user_id)

        response = {
            'success': True,
            **result,
            'message': 'Step work completed successfully'
        }
        self.send_json_response(response)

    # ========================================
    # NEW: Reflection question endpoints
    # ========================================

    def handle_get_reflection_questions(self, step_number, query_params):
        """Get reflection questions for a specific step"""
        if not has_reflection_questions(step_number):
            response = {
                'success': True,
                'step_number': step_number,
                'has_reflections': False,
                'questions': [],
                'message': f'Step {step_number} does not have reflection questions for repeat work'
            }
            self.send_json_response(response)
            return

        user_id = query_params.get('user_id', [''])[0]

        # If user_id provided, include previous responses
        if user_id:
            previous_responses = self.cosmos_data_manager.get_previous_responses(user_id, step_number)
            questions = format_reflection_questions(step_number, previous_responses)
        else:
            questions = get_reflection_questions_dict(step_number)

        response = {
            'success': True,
            'step_number': step_number,
            'has_reflections': True,
            'questions': questions,
            'count': len(questions)
        }
        self.send_json_response(response)

    # ========================================
    # NEW: History and progress endpoints
    # ========================================

    def handle_get_step_work_history(self, path, query_params):
        """Get step work history for a user"""
        parts = path.split('/')
        user_id = parts[-1] if len(parts) > 3 else None

        if not user_id:
            self.send_error(400, 'user_id required')
            return

        step_number = query_params.get('step', [None])[0]
        if step_number:
            try:
                step_number = int(step_number)
            except ValueError:
                step_number = None

        history = self.cosmos_data_manager.get_step_work_history(user_id, step_number)

        response = {
            'success': True,
            'user_id': user_id,
            'step_number': step_number,
            'history': history,
            'count': len(history)
        }
        self.send_json_response(response)

    def handle_get_user_progress(self, user_id):
        """Get overall step work progress for a user"""
        if not user_id:
            self.send_error(400, 'user_id required')
            return

        progress = self.cosmos_data_manager.get_user_progress(user_id)

        response = {
            'success': True,
            'user_id': user_id,
            'progress': progress
        }
        self.send_json_response(response)

    def handle_delete_user_step_work(self, user_id):
        """Delete all step work data for a user (GDPR)"""
        if not user_id:
            self.send_error(400, 'user_id required')
            return

        success = self.cosmos_data_manager.delete_all_user_data(user_id)

        response = {
            'success': success,
            'message': 'All step work data deleted' if success else 'Failed to delete data'
        }
        self.send_json_response(response)

    # ========================================
    # Step Workbook Content endpoints
    # ========================================

    def handle_workbook_content(self, path, query_params):
        """Handle workbook content requests"""
        parts = path.split('/')
        # /api/workbook/step/{N} or /api/workbook/step/{N}/prayer etc.
        if len(parts) < 5:
            self.send_error(400, 'Invalid workbook path')
            return

        try:
            step_number = int(parts[4])
        except (ValueError, IndexError):
            self.send_error(400, 'Invalid step number')
            return

        # Check for sub-resource
        sub_resource = parts[5] if len(parts) > 5 else None

        if sub_resource == 'prayer':
            prayer = get_step_prayer(step_number)
            if prayer:
                response = {
                    'success': True,
                    'step_number': step_number,
                    'prayer': prayer.to_dict()
                }
            else:
                response = {
                    'success': False,
                    'message': f'No prayer found for step {step_number}'
                }
            self.send_json_response(response)

        elif sub_resource == 'meditations':
            meditations = get_step_meditations(step_number)
            response = {
                'success': True,
                'step_number': step_number,
                'meditations': [m.to_dict() for m in meditations],
                'count': len(meditations)
            }
            self.send_json_response(response)

        elif sub_resource == 'questions':
            questions = get_step_questions(step_number)
            response = {
                'success': True,
                'step_number': step_number,
                'questions': [q.to_dict() for q in questions],
                'count': len(questions)
            }
            self.send_json_response(response)

        else:
            # Return full workbook
            workbook = get_step_workbook(step_number)
            if workbook:
                response = {
                    'success': True,
                    'workbook': workbook.to_dict()
                }
            else:
                response = {
                    'success': False,
                    'message': f'No workbook found for step {step_number}'
                }
            self.send_json_response(response)

    def handle_workbook_response(self, data):
        """Save a workbook question response"""
        user_id = data.get('user_id')
        step_number = data.get('step_number')
        question_id = data.get('question_id')
        response_text = data.get('response')

        if not all([step_number, question_id, response_text]):
            self.send_error(400, 'step_number, question_id, and response required')
            return

        # Save to Cosmos DB
        result = self.cosmos_data_manager.save_response(
            session_id=f"workbook_{user_id}_{step_number}",
            user_id=user_id,
            prompt=question_id,
            response=response_text,
            section=f"step{step_number}_workbook"
        )

        response = {
            'success': True,
            **result,
            'message': 'Workbook response saved successfully'
        }
        self.send_json_response(response)

    # ========================================
    # Step 11 Meditation endpoints
    # ========================================

    def handle_step11_prayers(self):
        """Get Step 11 morning and evening prayers"""
        response = {
            'success': True,
            'morning_prayer': self.step11_meditation.get_morning_prayer(),
            'evening_prayer': self.step11_meditation.get_evening_prayer()
        }
        self.send_json_response(response)

    def handle_step11_meditation_prompts(self):
        """Get available meditation prompts"""
        prompts = self.step11_meditation.get_meditation_prompts()
        response = {
            'success': True,
            'prompts': [p.to_dict() for p in prompts],
            'count': len(prompts)
        }
        self.send_json_response(response)

    def handle_step11_meditation_start(self, data):
        """Start a new meditation session"""
        user_id = data.get('user_id')
        duration_minutes = data.get('duration_minutes', 10)
        meditation_type = data.get('meditation_type', 'custom')

        if not user_id:
            self.send_error(400, 'user_id required')
            return

        session = self.step11_meditation.start_meditation(user_id, duration_minutes, meditation_type)

        # Get today's prompt
        daily_prompt = self.step11_meditation.get_daily_prompt()

        response = {
            'success': True,
            'session': session.to_dict(),
            'daily_prompt': daily_prompt.to_dict() if daily_prompt else None,
            'message': f'Meditation session started ({duration_minutes} minutes)'
        }
        self.send_json_response(response, status=201)

    def handle_step11_meditation_complete(self, data):
        """Complete a meditation session"""
        session_id = data.get('session_id')
        user_id = data.get('user_id')
        notes = data.get('notes', '')

        if not session_id:
            self.send_error(400, 'session_id required')
            return

        result = self.step11_meditation.complete_meditation(session_id, notes)

        if result:
            streak = self.step11_meditation.get_streak(user_id)
            response = {
                'success': True,
                'session': result.to_dict(),
                'streak': streak,
                'message': 'Meditation session completed'
            }
        else:
            response = {
                'success': False,
                'message': 'Session not found'
            }

        self.send_json_response(response)

    def handle_step11_meditation_history(self, user_id):
        """Get meditation history for a user"""
        if not user_id:
            self.send_error(400, 'user_id required')
            return

        history = self.step11_meditation.get_meditation_history(user_id)
        streak = self.step11_meditation.get_streak(user_id)
        stats = self.step11_meditation.get_meditation_stats(user_id)

        response = {
            'success': True,
            'user_id': user_id,
            'history': [s.to_dict() for s in history],
            'streak': streak,
            'stats': stats,
            'count': len(history)
        }
        self.send_json_response(response)

    def handle_step11_save_intention(self, data):
        """Save morning intention"""
        user_id = data.get('user_id')
        intention_text = data.get('intention')

        if not user_id or not intention_text:
            self.send_error(400, 'user_id and intention required')
            return

        intention = self.step11_meditation.save_morning_intention(user_id, intention_text)

        response = {
            'success': True,
            'intention': intention.to_dict(),
            'message': 'Morning intention saved'
        }
        self.send_json_response(response, status=201)

    def handle_step11_save_review(self, data):
        """Save evening review"""
        user_id = data.get('user_id')
        review_data = {
            'resentful': data.get('resentful', ''),
            'selfish': data.get('selfish', ''),
            'dishonest': data.get('dishonest', ''),
            'afraid': data.get('afraid', ''),
            'owe_apology': data.get('owe_apology', ''),
            'kept_secret': data.get('kept_secret', ''),
            'kind_loving': data.get('kind_loving', ''),
            'could_have_done_better': data.get('could_have_done_better', ''),
            'gratitude': data.get('gratitude', ''),
            'notes': data.get('notes', '')
        }

        if not user_id:
            self.send_error(400, 'user_id required')
            return

        review = self.step11_meditation.save_evening_review(user_id, review_data)

        response = {
            'success': True,
            'review': review.to_dict(),
            'message': 'Evening review saved'
        }
        self.send_json_response(response, status=201)

    def handle_step11_intentions(self, user_id, query_params):
        """Get morning intentions for a user"""
        if not user_id:
            self.send_error(400, 'user_id required')
            return

        limit = int(query_params.get('limit', [30])[0])
        intentions = self.step11_meditation.get_morning_intentions(user_id, limit)

        response = {
            'success': True,
            'user_id': user_id,
            'intentions': [i.to_dict() for i in intentions],
            'count': len(intentions)
        }
        self.send_json_response(response)

    def handle_step11_reviews(self, user_id, query_params):
        """Get evening reviews for a user"""
        if not user_id:
            self.send_error(400, 'user_id required')
            return

        limit = int(query_params.get('limit', [30])[0])
        reviews = self.step11_meditation.get_evening_reviews(user_id, limit)

        response = {
            'success': True,
            'user_id': user_id,
            'reviews': [r.to_dict() for r in reviews],
            'count': len(reviews)
        }
        self.send_json_response(response)

    # ========================================
    # Step 12 Service Tracker endpoints
    # ========================================

    def handle_step12_prayer(self):
        """Get the AA Responsibility Declaration"""
        prayer = self.step12_service_tracker.get_responsibility_declaration()
        response = {
            'success': True,
            'prayer': prayer
        }
        self.send_json_response(response)

    def handle_step12_service_categories(self):
        """Get available service categories"""
        categories = self.step12_service_tracker.get_service_categories()
        response = {
            'success': True,
            'categories': categories
        }
        self.send_json_response(response)

    def handle_step12_log_service(self, data):
        """Log a service activity"""
        user_id = data.get('user_id')
        service_type = data.get('service_type')
        description = data.get('description', '')
        duration_minutes = data.get('duration_minutes', 0)
        notes = data.get('notes', '')
        date_str = data.get('date')

        if not user_id or not service_type:
            self.send_error(400, 'user_id and service_type required')
            return

        # Parse date if provided
        service_date = None
        if date_str:
            try:
                service_date = datetime.fromisoformat(date_str)
            except ValueError:
                pass

        entry = self.step12_service_tracker.log_service(
            user_id=user_id,
            service_type=service_type,
            description=description,
            duration_minutes=duration_minutes,
            notes=notes,
            date=service_date
        )

        response = {
            'success': True,
            'entry': entry.to_dict(),
            'message': 'Service logged successfully'
        }
        self.send_json_response(response, status=201)

    def handle_step12_service_history(self, user_id, query_params):
        """Get service history for a user"""
        if not user_id:
            self.send_error(400, 'user_id required')
            return

        category = query_params.get('category', [None])[0]
        limit = int(query_params.get('limit', [50])[0])

        history = self.step12_service_tracker.get_service_history(user_id, category, limit)

        response = {
            'success': True,
            'user_id': user_id,
            'history': [e.to_dict() for e in history],
            'count': len(history)
        }
        self.send_json_response(response)

    def handle_step12_service_summary(self, user_id):
        """Get service summary stats for a user"""
        if not user_id:
            self.send_error(400, 'user_id required')
            return

        summary = self.step12_service_tracker.get_service_summary(user_id)

        response = {
            'success': True,
            'user_id': user_id,
            'summary': summary
        }
        self.send_json_response(response)

    def handle_step12_add_sponsee(self, data):
        """Add a sponsee"""
        user_id = data.get('user_id')
        name = data.get('name')
        sobriety_date = data.get('sobriety_date')
        current_step = data.get('current_step', 1)
        notes = data.get('notes', '')

        if not user_id or not name:
            self.send_error(400, 'user_id and name required')
            return

        sponsee = self.step12_service_tracker.add_sponsee(
            user_id=user_id,
            name=name,
            sobriety_date=sobriety_date,
            current_step=current_step,
            notes=notes
        )

        response = {
            'success': True,
            'sponsee': sponsee.to_dict(),
            'message': 'Sponsee added successfully'
        }
        self.send_json_response(response, status=201)

    def handle_step12_sponsees(self, user_id):
        """Get sponsees for a user"""
        if not user_id:
            self.send_error(400, 'user_id required')
            return

        sponsees = self.step12_service_tracker.get_sponsees(user_id)

        response = {
            'success': True,
            'user_id': user_id,
            'sponsees': [s.to_dict() for s in sponsees],
            'count': len(sponsees)
        }
        self.send_json_response(response)

    def handle_step12_add_experience(self, data):
        """Add a 12th step experience"""
        user_id = data.get('user_id')
        description = data.get('description')
        outcome = data.get('outcome', '')
        what_i_shared = data.get('what_i_shared', '')
        what_i_learned = data.get('what_i_learned', '')

        if not user_id or not description:
            self.send_error(400, 'user_id and description required')
            return

        experience = self.step12_service_tracker.add_twelfth_step_experience(
            user_id=user_id,
            description=description,
            outcome=outcome,
            what_i_shared=what_i_shared,
            what_i_learned=what_i_learned
        )

        response = {
            'success': True,
            'experience': experience.to_dict(),
            'message': 'Experience recorded successfully'
        }
        self.send_json_response(response, status=201)

    def handle_step12_experiences(self, user_id, query_params):
        """Get 12th step experiences for a user"""
        if not user_id:
            self.send_error(400, 'user_id required')
            return

        limit = int(query_params.get('limit', [50])[0])
        experiences = self.step12_service_tracker.get_twelfth_step_experiences(user_id, limit)

        response = {
            'success': True,
            'user_id': user_id,
            'experiences': [e.to_dict() for e in experiences],
            'count': len(experiences)
        }
        self.send_json_response(response)

    def handle_step12_add_commitment(self, data):
        """Add a service commitment"""
        user_id = data.get('user_id')
        commitment_type = data.get('commitment_type')
        description = data.get('description', '')
        frequency = data.get('frequency', 'weekly')
        start_date = data.get('start_date')
        end_date = data.get('end_date')

        if not user_id or not commitment_type:
            self.send_error(400, 'user_id and commitment_type required')
            return

        commitment = self.step12_service_tracker.add_service_commitment(
            user_id=user_id,
            commitment_type=commitment_type,
            description=description,
            frequency=frequency,
            start_date=start_date,
            end_date=end_date
        )

        response = {
            'success': True,
            'commitment': commitment.to_dict(),
            'message': 'Commitment added successfully'
        }
        self.send_json_response(response, status=201)

    # ========================================
    # Step 8 List Builder handlers
    # ========================================

    def handle_step8_suggestions(self, user_id):
        """Get suggestions for Step 8 list from Step 4 data"""
        # In production, this would fetch from Cosmos DB
        # For now, return demo suggestions
        demo_step4_data = {
            'resentments': [
                {'id': 'r1', 'who': 'Boss at work', 'cause': 'Passed me over for promotion'},
                {'id': 'r2', 'who': 'Ex-spouse', 'cause': 'Took the kids'},
                {'id': 'r3', 'who': 'Father', 'cause': 'Never showed approval'},
            ],
            'harms_done': [
                {'id': 'h1', 'who': 'Mother', 'what_i_did': 'Lied about drinking'},
                {'id': 'h2', 'who': 'Former employer', 'what_i_did': 'Called in sick when drinking'},
                {'id': 'h3', 'who': 'Children', 'what_i_did': 'Missed important events'},
            ]
        }

        suggestions = self.step8_builder.get_step4_suggestions(user_id, demo_step4_data)

        response = {
            'success': True,
            'suggestions': suggestions,
            'message': 'Pull suggestions from your Step 4 inventory'
        }
        self.send_json_response(response)

    def handle_step8_get_list(self, user_id, session_id=None):
        """Get Step 8 list for a user"""
        if session_id:
            step8_list = self.step8_builder.get_list(session_id)
        else:
            step8_list = self.step8_builder.get_latest_list(user_id)

        if step8_list:
            response = {
                'success': True,
                'list': step8_list.to_dict()
            }
        else:
            response = {
                'success': True,
                'list': None,
                'message': 'No Step 8 list found. Create one to get started.'
            }
        self.send_json_response(response)

    def handle_step8_reflection_questions(self):
        """Get Step 8 reflection questions"""
        questions = self.step8_builder.get_reflection_questions()
        response = {
            'success': True,
            'questions': questions
        }
        self.send_json_response(response)

    def handle_step8_create_list(self, data):
        """Create a new Step 8 list"""
        user_id = data.get('user_id')
        step4_session_id = data.get('step4_session_id')

        if not user_id:
            self.send_error(400, 'user_id required')
            return

        # Check for existing lists to determine version number
        existing_lists = self.step8_builder.get_user_lists(user_id)
        version_number = len(existing_lists) + 1

        new_list = self.step8_builder.create_list(
            user_id=user_id,
            step4_session_id=step4_session_id,
            version_number=version_number
        )

        response = {
            'success': True,
            'list': new_list.to_dict(),
            'message': f'Step 8 list created (Version {version_number})'
        }
        self.send_json_response(response, status=201)

    def handle_step8_add_entry(self, data):
        """Add an entry to a Step 8 list"""
        session_id = data.get('session_id')

        if not session_id:
            self.send_error(400, 'session_id required')
            return

        entry = self.step8_builder.add_entry(session_id, data)

        if entry:
            response = {
                'success': True,
                'entry': entry.to_dict(),
                'message': 'Entry added to your Step 8 list'
            }
            self.send_json_response(response, status=201)
        else:
            self.send_error(404, 'Step 8 list not found')

    def handle_step8_update_entry(self, data):
        """Update an existing Step 8 entry"""
        entry_id = data.get('entry_id')

        if not entry_id:
            self.send_error(400, 'entry_id required')
            return

        entry = self.step8_builder.update_entry(entry_id, data)

        if entry:
            response = {
                'success': True,
                'entry': entry.to_dict(),
                'message': 'Entry updated successfully'
            }
            self.send_json_response(response)
        else:
            self.send_error(404, 'Entry not found')

    def handle_step8_delete_entry(self, entry_id):
        """Delete a Step 8 entry"""
        success = self.step8_builder.delete_entry(entry_id)

        if success:
            response = {
                'success': True,
                'message': 'Entry deleted successfully'
            }
            self.send_json_response(response)
        else:
            self.send_error(404, 'Entry not found')

    def handle_step8_complete_list(self, data):
        """Mark a Step 8 list as completed"""
        session_id = data.get('session_id')

        if not session_id:
            self.send_error(400, 'session_id required')
            return

        completed_list = self.step8_builder.complete_list(session_id)

        if completed_list:
            response = {
                'success': True,
                'list': completed_list.to_dict(),
                'message': 'Step 8 list completed! You can now proceed to Step 9.'
            }
            self.send_json_response(response)
        else:
            self.send_error(404, 'Step 8 list not found')

    # ========================================
    # Step 9 Amends Tracker handlers
    # ========================================

    def handle_step9_get_list(self, user_id):
        """Get latest Step 9 session for a user"""
        session = self.step9_tracker.get_latest_session(user_id)

        if session:
            response = {
                'success': True,
                'session': session.to_dict()
            }
        else:
            response = {
                'success': True,
                'session': None,
                'message': 'No Step 9 session found. Import from Step 8 to get started.'
            }
        self.send_json_response(response)

    def handle_step9_get_session(self, session_id):
        """Get a specific Step 9 session"""
        session = self.step9_tracker.get_session(session_id)

        if session:
            response = {
                'success': True,
                'session': session.to_dict()
            }
        else:
            response = {
                'success': False,
                'message': 'Session not found'
            }
        self.send_json_response(response)

    def handle_step9_get_summary(self, user_id):
        """Get amends progress summary for a user"""
        session = self.step9_tracker.get_latest_session(user_id)

        if session:
            response = {
                'success': True,
                'user_id': user_id,
                'summary': session.get_summary()
            }
        else:
            response = {
                'success': True,
                'user_id': user_id,
                'summary': {
                    'total': 0,
                    'not_started': 0,
                    'in_progress': 0,
                    'completed': 0,
                    'living_amends': 0,
                    'not_appropriate': 0,
                    'completion_percentage': 0
                }
            }
        self.send_json_response(response)

    def handle_step9_guidance(self):
        """Get Step 9 general guidance"""
        guidance = self.step9_tracker.get_step9_guidance()
        response = {
            'success': True,
            'guidance': guidance
        }
        self.send_json_response(response)

    def handle_step9_reflection_prompts(self, status):
        """Get reflection prompts for a specific amend status"""
        prompts = self.step9_tracker.get_reflection_prompts(status)
        response = {
            'success': True,
            'status': status,
            'prompts': prompts
        }
        self.send_json_response(response)

    def handle_step9_create_session(self, data):
        """Create a new Step 9 session"""
        user_id = data.get('user_id')
        step8_session_id = data.get('step8_session_id')

        if not user_id:
            self.send_error(400, 'user_id required')
            return

        # Determine version number
        existing_sessions = self.step9_tracker.get_user_sessions(user_id)
        version_number = len(existing_sessions) + 1

        session = self.step9_tracker.create_session(
            user_id=user_id,
            step8_session_id=step8_session_id,
            version_number=version_number
        )

        response = {
            'success': True,
            'session': session.to_dict(),
            'message': f'Step 9 session created (Version {version_number})'
        }
        self.send_json_response(response, status=201)

    def handle_step9_import_from_step8(self, data):
        """Import entries from Step 8 list into Step 9"""
        session_id = data.get('session_id')
        step8_entries = data.get('step8_entries', [])

        if not session_id:
            self.send_error(400, 'session_id required')
            return

        if not step8_entries:
            self.send_error(400, 'step8_entries required')
            return

        imported = self.step9_tracker.import_from_step8(session_id, step8_entries)

        response = {
            'success': True,
            'imported_count': len(imported),
            'entries': [e.to_dict() for e in imported],
            'message': f'Imported {len(imported)} entries from Step 8'
        }
        self.send_json_response(response, status=201)

    def handle_step9_add_entry(self, data):
        """Add a new amend entry manually"""
        session_id = data.get('session_id')

        if not session_id:
            self.send_error(400, 'session_id required')
            return

        entry = self.step9_tracker.add_entry(session_id, data)

        if entry:
            response = {
                'success': True,
                'entry': entry.to_dict(),
                'message': 'Amend entry added'
            }
            self.send_json_response(response, status=201)
        else:
            self.send_error(404, 'Step 9 session not found')

    def handle_step9_update_entry(self, data):
        """Update an amend entry (status, reflections, etc.)"""
        entry_id = data.get('entry_id')

        if not entry_id:
            self.send_error(400, 'entry_id required')
            return

        entry = self.step9_tracker.update_entry(entry_id, data)

        if entry:
            # Get reflection prompts for the new status
            prompts = self.step9_tracker.get_reflection_prompts(entry.status)
            response = {
                'success': True,
                'entry': entry.to_dict(),
                'reflection_prompts': prompts,
                'message': 'Entry updated successfully'
            }
            self.send_json_response(response)
        else:
            self.send_error(404, 'Entry not found')

    def handle_step9_delete_entry(self, entry_id):
        """Delete an amend entry"""
        success = self.step9_tracker.delete_entry(entry_id)

        if success:
            response = {
                'success': True,
                'message': 'Entry deleted successfully'
            }
            self.send_json_response(response)
        else:
            self.send_error(404, 'Entry not found')

    def handle_step9_complete_session(self, data):
        """Mark Step 9 session as completed"""
        session_id = data.get('session_id')

        if not session_id:
            self.send_error(400, 'session_id required')
            return

        session = self.step9_tracker.complete_session(session_id)

        if session:
            response = {
                'success': True,
                'session': session.to_dict(),
                'message': 'Step 9 complete! The promises are coming true.'
            }
            self.send_json_response(response)
        else:
            self.send_error(404, 'Session not found')


# ========================================
# Global services to persist across requests
# ========================================

GLOBAL_DATA_MANAGER = StepWorkDataManager()
GLOBAL_COSMOS_DATA_MANAGER = CosmosDBDataManager()
GLOBAL_STEP4_GUIDE = Step4WorkbookGuide()

# RAG Integration - connect to deployed services
LITERATURE_SERVICE_URL = os.environ.get('LITERATURE_SERVICE_URL', 'http://digitalsponsor-literature-massive.centralus.azurecontainer.io:3002')
CHAT_SERVICE_URL = os.environ.get('CHAT_SERVICE_URL', 'http://digitalsponsor-chat-v2.centralus.azurecontainer.io:3003')
GLOBAL_RAG_INTEGRATION = StepWorkRAGIntegration(LITERATURE_SERVICE_URL, CHAT_SERVICE_URL)

# Step 11 Meditation Guide and Step 12 Service Tracker
GLOBAL_STEP11_MEDITATION = Step11MeditationGuide()
GLOBAL_STEP12_SERVICE_TRACKER = Step12ServiceTracker()

# Step 8 List Builder and Step 9 Amends Tracker
GLOBAL_STEP8_BUILDER = get_step8_builder()
GLOBAL_STEP9_TRACKER = get_step9_tracker()


class PersistentStepWorkHandler(StepWorkHandler):
    """Handler that uses global data managers for persistence"""
    def __init__(self, *args, **kwargs):
        # Set attributes BEFORE calling parent __init__ because it processes
        # the request immediately which may call handle_health() etc.
        self.data_manager = GLOBAL_DATA_MANAGER
        self.cosmos_data_manager = GLOBAL_COSMOS_DATA_MANAGER
        self.step4_guide = GLOBAL_STEP4_GUIDE
        self.rag_integration = GLOBAL_RAG_INTEGRATION
        self.step11_meditation = GLOBAL_STEP11_MEDITATION
        self.step12_service_tracker = GLOBAL_STEP12_SERVICE_TRACKER
        self.step8_builder = GLOBAL_STEP8_BUILDER
        self.step9_tracker = GLOBAL_STEP9_TRACKER
        # Don't call StepWorkHandler.__init__ to avoid creating new instances
        http.server.BaseHTTPRequestHandler.__init__(self, *args, **kwargs)


PORT = int(os.environ.get('PORT', 3003))

with socketserver.TCPServer(('', PORT), PersistentStepWorkHandler) as httpd:
    db_mode = "Cosmos DB" if not GLOBAL_COSMOS_DATA_MANAGER._in_memory_mode else "In-Memory"

    print(f'Digital Sponsor Step Work Service running on port {PORT}')
    print(f'Features:')
    print(f'   - Interactive Step Work Workbooks (All 12 Steps)')
    print(f'   - Complete Step 4 Moral Inventory System')
    print(f'   - Privacy-First Data Management')
    print(f'   - Step-Specific Prayers and Meditations')
    print(f'   - Progress Tracking and Resume Capability')
    print(f'   - Complete Data Deletion on Request')
    print(f'   - Cosmos DB Persistence ({db_mode})')
    print(f'   - Step Work Version Control')
    print(f'   - Reflection Questions for Repeat Work')
    print(f'   - Step 11 Guided Meditation with Timer & Streak Tracking')
    print(f'   - Step 12 Service Tracker with Categories')
    print(f'   - Sponsorship Management')
    print(f'   - Twelfth Step Experience Journal')
    print(f'Region: Central US')
    print(f'Reflection Steps: {STEPS_WITH_REFLECTIONS}')
    print()
    print(f'API Endpoints:')
    print(f'   GET  /health - Health check')
    print(f'   POST /api/session/create - Create new step work session')
    print(f'   GET  /api/step4/introduction - Get Step 4 introduction')
    print(f'   GET  /api/step4/resentment-guide - Resentment inventory guide')
    print(f'   POST /api/step4/resentment - Save resentment entry')
    print(f'   POST /api/step4/fear - Save fear entry')
    print(f'   GET  /api/prayers?step=N - Get prayers for specific step')
    print(f'   GET  /api/step4/progress/{{session_id}} - Get progress summary')
    print(f'   DELETE /api/session/{{session_id}} - Delete all user data')
    print()
    print(f'Step Work Versioning Endpoints:')
    print(f'   POST /api/stepwork/start - Start step work (creates version)')
    print(f'   POST /api/stepwork/response - Save Q&A response')
    print(f'   POST /api/stepwork/reflection - Save reflection response')
    print(f'   POST /api/stepwork/complete - Complete step work session')
    print(f'   GET  /api/stepwork/history/{{user_id}} - Get step work history')
    print(f'   GET  /api/stepwork/progress/{{user_id}} - Get overall progress')
    print(f'   GET  /api/reflection/questions/{{step}} - Get reflection questions')
    print(f'   DELETE /api/stepwork/user/{{user_id}} - Delete all step work (GDPR)')
    print()
    print(f'RAG-Enhanced Endpoints:')
    print(f'   GET  /api/guidance/step/{{N}}?challenge=text - AI guidance for step work')
    print(f'   GET  /api/guidance/resentment?description=text - Resentment analysis')
    print(f'   GET  /api/guidance/fear?description=text - Fear transformation help')
    print()
    print(f'Step Workbook Content Endpoints:')
    print(f'   GET  /api/workbook/step/{{N}} - Get complete workbook for step')
    print(f'   GET  /api/workbook/step/{{N}}/prayer - Get step prayer')
    print(f'   GET  /api/workbook/step/{{N}}/meditations - Get meditation texts')
    print(f'   GET  /api/workbook/step/{{N}}/questions - Get step questions')
    print(f'   POST /api/workbook/response - Save workbook response')
    print()
    print(f'Step 11 Meditation Endpoints:')
    print(f'   GET  /api/step11/prayers - Get morning and evening prayers')
    print(f'   GET  /api/step11/meditation/prompts - Get meditation prompts')
    print(f'   GET  /api/step11/meditation/history/{{user_id}} - Get meditation history')
    print(f'   POST /api/step11/meditation/start - Start meditation session')
    print(f'   POST /api/step11/meditation/complete - Complete meditation session')
    print(f'   POST /api/step11/intention - Save morning intention')
    print(f'   POST /api/step11/review - Save evening review')
    print(f'   GET  /api/step11/intentions/{{user_id}} - Get morning intentions')
    print(f'   GET  /api/step11/reviews/{{user_id}} - Get evening reviews')
    print()
    print(f'Step 12 Service Tracker Endpoints:')
    print(f'   GET  /api/step12/prayer - Get AA Responsibility Declaration')
    print(f'   GET  /api/step12/service/categories - Get service categories')
    print(f'   POST /api/step12/service/log - Log service activity')
    print(f'   GET  /api/step12/service/history/{{user_id}} - Get service history')
    print(f'   GET  /api/step12/service/summary/{{user_id}} - Get service summary')
    print(f'   POST /api/step12/sponsee - Add sponsee')
    print(f'   GET  /api/step12/sponsees/{{user_id}} - Get sponsees')
    print(f'   POST /api/step12/experience - Log 12th step experience')
    print(f'   GET  /api/step12/experiences/{{user_id}} - Get 12th step experiences')
    print(f'   POST /api/step12/commitment - Add service commitment')
    print()
    print(f'Step 8 List Builder Endpoints:')
    print(f'   GET  /api/step8/suggestions/{{user_id}} - Get suggestions from Step 4')
    print(f'   GET  /api/step8/list/{{user_id}} - Get user\'s latest Step 8 list')
    print(f'   GET  /api/step8/list/{{user_id}}/{{session_id}} - Get specific Step 8 list')
    print(f'   GET  /api/step8/reflection-questions - Get reflection questions')
    print(f'   POST /api/step8/list/create - Create new Step 8 list')
    print(f'   POST /api/step8/entry - Add entry to list')
    print(f'   POST /api/step8/entry/update - Update entry')
    print(f'   POST /api/step8/list/complete - Complete Step 8 list')
    print(f'   DELETE /api/step8/entry/{{entry_id}} - Delete entry')
    print()
    print(f'Step 9 Amends Tracker Endpoints:')
    print(f'   GET  /api/step9/list/{{user_id}} - Get user\'s latest Step 9 session')
    print(f'   GET  /api/step9/session/{{session_id}} - Get specific session')
    print(f'   GET  /api/step9/summary/{{user_id}} - Get amends progress summary')
    print(f'   GET  /api/step9/guidance - Get Step 9 guidance')
    print(f'   GET  /api/step9/prompts/{{status}} - Get reflection prompts for status')
    print(f'   POST /api/step9/session/create - Create new Step 9 session')
    print(f'   POST /api/step9/import-from-step8 - Import entries from Step 8')
    print(f'   POST /api/step9/entry - Add amend entry manually')
    print(f'   POST /api/step9/entry/update - Update amend entry')
    print(f'   POST /api/step9/session/complete - Complete Step 9')
    print(f'   DELETE /api/step9/entry/{{entry_id}} - Delete entry')
    print()

    httpd.serve_forever()
