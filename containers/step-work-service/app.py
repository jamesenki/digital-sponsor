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


class StepWorkHandler(http.server.BaseHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        self.data_manager = StepWorkDataManager()
        self.step4_guide = Step4WorkbookGuide()
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
                'Interactive Step Work Workbooks',
                'Step 4 Moral Inventory System',
                'Privacy-First Data Management',
                'Step-Specific Prayers and Meditations',
                'Progress Tracking and Resume',
                'Complete Data Deletion',
                'RAG-Enhanced Step Guidance',
                'Cosmos DB Persistence',
                'Step Work Version Control',
                'Reflection Questions for Repeat Work'
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
# Global services to persist across requests
# ========================================

GLOBAL_DATA_MANAGER = StepWorkDataManager()
GLOBAL_COSMOS_DATA_MANAGER = CosmosDBDataManager()
GLOBAL_STEP4_GUIDE = Step4WorkbookGuide()

# RAG Integration - connect to deployed services
LITERATURE_SERVICE_URL = os.environ.get('LITERATURE_SERVICE_URL', 'http://digitalsponsor-literature-massive.centralus.azurecontainer.io:3002')
CHAT_SERVICE_URL = os.environ.get('CHAT_SERVICE_URL', 'http://digitalsponsor-chat-v2.centralus.azurecontainer.io:3003')
GLOBAL_RAG_INTEGRATION = StepWorkRAGIntegration(LITERATURE_SERVICE_URL, CHAT_SERVICE_URL)


class PersistentStepWorkHandler(StepWorkHandler):
    """Handler that uses global data managers for persistence"""
    def __init__(self, *args, **kwargs):
        # Set attributes BEFORE calling parent __init__ because it processes
        # the request immediately which may call handle_health() etc.
        self.data_manager = GLOBAL_DATA_MANAGER
        self.cosmos_data_manager = GLOBAL_COSMOS_DATA_MANAGER
        self.step4_guide = GLOBAL_STEP4_GUIDE
        self.rag_integration = GLOBAL_RAG_INTEGRATION
        # Don't call StepWorkHandler.__init__ to avoid creating new instances
        http.server.BaseHTTPRequestHandler.__init__(self, *args, **kwargs)


PORT = int(os.environ.get('PORT', 3003))

with socketserver.TCPServer(('', PORT), PersistentStepWorkHandler) as httpd:
    db_mode = "Cosmos DB" if not GLOBAL_COSMOS_DATA_MANAGER._in_memory_mode else "In-Memory"

    print(f'Digital Sponsor Step Work Service running on port {PORT}')
    print(f'Features:')
    print(f'   - Interactive Step Work Workbooks')
    print(f'   - Complete Step 4 Moral Inventory System')
    print(f'   - Privacy-First Data Management')
    print(f'   - Step-Specific Prayers and Meditations')
    print(f'   - Progress Tracking and Resume Capability')
    print(f'   - Complete Data Deletion on Request')
    print(f'   - Cosmos DB Persistence ({db_mode})')
    print(f'   - Step Work Version Control')
    print(f'   - Reflection Questions for Repeat Work')
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

    httpd.serve_forever()
