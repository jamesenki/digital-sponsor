#!/usr/bin/env python3
"""
Digital Sponsor Step Work Service
Interactive step work with privacy-first design
"""

import http.server
import socketserver
import json
import os
import urllib.parse
from datetime import datetime
from step_work_data_model import StepWorkDataManager, get_step_prayers
from step4_workbook import Step4WorkbookGuide
from rag_integration import StepWorkRAGIntegration

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
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = {
                'status': 'healthy',
                'service': 'Digital Sponsor Step Work Service with RAG Integration',
                'region': 'Central US',
                'features': [
                    'Interactive Step Work Workbooks',
                    'Step 4 Moral Inventory System',
                    'Privacy-First Data Management',
                    'Step-Specific Prayers and Meditations',
                    'Progress Tracking and Resume',
                    'Complete Data Deletion',
                    'RAG-Enhanced Step Guidance',
                    'AI-Powered Resentment Support',
                    'Contextual Fear Work Assistance',
                    'Literature-Based Spiritual Direction'
                ],
                'rag_integration': {
                    'literature_service': LITERATURE_SERVICE_URL,
                    'chat_service': CHAT_SERVICE_URL,
                    'capabilities': [
                        'Step-specific guidance with AA literature context',
                        'Resentment analysis with spiritual perspective',
                        'Fear transformation with faith-based approach',
                        'Progress-based completion guidance'
                    ]
                },
                'timestamp': datetime.now().isoformat(),
                'version': '2.0.0 - RAG Enhanced'
            }
            self.wfile.write(json.dumps(response, indent=2).encode())

        elif path == '/api/step4/introduction':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            intro = self.step4_guide.get_introduction()
            self.wfile.write(json.dumps(intro, indent=2).encode())

        elif path == '/api/step4/resentment-guide':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            guide = self.step4_guide.get_resentment_instructions()
            self.wfile.write(json.dumps(guide, indent=2).encode())

        elif path == '/api/step4/fear-guide':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            guide = self.step4_guide.get_fear_instructions()
            self.wfile.write(json.dumps(guide, indent=2).encode())

        elif path == '/api/step4/sex-conduct-guide':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            guide = self.step4_guide.get_sex_conduct_instructions()
            self.wfile.write(json.dumps(guide, indent=2).encode())

        elif path.startswith('/api/prayers'):
            step_number = query_params.get('step', [None])[0]
            if step_number:
                try:
                    step_num = int(step_number)
                    prayers = get_step_prayers(step_num)
                except ValueError:
                    prayers = get_step_prayers()
            else:
                prayers = get_step_prayers()

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = {
                'success': True,
                'prayers': [prayer.to_dict() for prayer in prayers],
                'count': len(prayers)
            }
            self.wfile.write(json.dumps(response, indent=2).encode())

        elif path.startswith('/api/step4/progress/'):
            session_id = path.split('/')[-1]
            if not session_id:
                self.send_error(400, 'Session ID required')
                return

            progress = self.step4_guide.get_progress_summary(session_id)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = {
                'success': True,
                'session_id': session_id,
                'progress': progress
            }
            self.wfile.write(json.dumps(response, indent=2).encode())

        elif path.startswith('/api/guidance/step/'):
            # Extract step number from path like /api/guidance/step/4
            try:
                step_number = int(path.split('/')[-1])
                specific_challenge = query_params.get('challenge', [''])[0]
                
                guidance = self.rag_integration.get_step_guidance(step_number, specific_challenge)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                self.wfile.write(json.dumps(guidance, indent=2).encode())
                
            except (ValueError, IndexError):
                self.send_error(400, 'Invalid step number')

        elif path == '/api/guidance/resentment':
            resentment_desc = query_params.get('description', [''])[0]
            if not resentment_desc:
                self.send_error(400, 'Resentment description required')
                return
                
            guidance = self.rag_integration.get_resentment_guidance(resentment_desc)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            self.wfile.write(json.dumps(guidance, indent=2).encode())

        elif path == '/api/guidance/fear':
            fear_desc = query_params.get('description', [''])[0]
            if not fear_desc:
                self.send_error(400, 'Fear description required')
                return
                
            guidance = self.rag_integration.get_fear_guidance(fear_desc)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            self.wfile.write(json.dumps(guidance, indent=2).encode())

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
            anonymous = data.get('anonymous', True)
            user_id = data.get('user_id') if not anonymous else None
            
            session = self.data_manager.create_session(user_id=user_id, anonymous=anonymous)
            
            self.send_response(201)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = {
                'success': True,
                'session': session.to_dict(),
                'privacy_notice': 'Your data is stored privately and can be deleted anytime'
            }
            self.wfile.write(json.dumps(response, indent=2).encode())

        elif path == '/api/step4/resentment':
            session_id = data.get('session_id')
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

            entry_id = self.step4_guide.save_resentment(session_id, resentment_data)
            
            self.send_response(201)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = {
                'success': True,
                'entry_id': entry_id,
                'message': 'Resentment saved successfully'
            }
            self.wfile.write(json.dumps(response).encode())

        elif path == '/api/step4/fear':
            session_id = data.get('session_id')
            if not session_id:
                self.send_error(400, 'Session ID required')
                return

            fear_data = {
                'fear_description': data.get('fear_description', ''),
                'why_i_have_this_fear': data.get('why_i_have_this_fear', ''),
                'what_it_affects': data.get('what_it_affects', []),
                'new_thought_pattern': data.get('new_thought_pattern', '')
            }

            entry_id = self.step4_guide.save_fear(session_id, fear_data)
            
            self.send_response(201)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = {
                'success': True,
                'entry_id': entry_id,
                'message': 'Fear saved successfully'
            }
            self.wfile.write(json.dumps(response).encode())

        elif path == '/api/step4/inventory':
            session_id = data.get('session_id')
            if not session_id:
                self.send_error(400, 'Session ID required')
                return

            inventory = self.data_manager.get_step4_inventory(session_id)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            if inventory:
                response = {
                    'success': True,
                    'inventory': inventory.to_dict()
                }
            else:
                response = {
                    'success': True,
                    'inventory': None,
                    'message': 'No inventory found for this session'
                }
            
            self.wfile.write(json.dumps(response, indent=2).encode())

        elif path == '/api/export':
            session_id = data.get('session_id')
            format_type = data.get('format', 'json')
            
            if not session_id:
                self.send_error(400, 'Session ID required')
                return

            export_data = self.data_manager.export_step_work(session_id, format_type)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = {
                'success': True,
                'export_data': export_data,
                'format': format_type,
                'generated_at': datetime.now().isoformat()
            }
            self.wfile.write(json.dumps(response).encode())

        else:
            self.send_error(404)

    def do_DELETE(self):
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path

        if path.startswith('/api/session/'):
            session_id = path.split('/')[-1]
            if not session_id:
                self.send_error(400, 'Session ID required')
                return

            success = self.data_manager.delete_all_user_data(session_id)
            
            if success:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                response = {
                    'success': True,
                    'message': 'All user data deleted successfully',
                    'session_id': session_id
                }
                self.wfile.write(json.dumps(response).encode())
            else:
                self.send_error(500, 'Failed to delete user data')

        else:
            self.send_error(404)

# Global services to persist across requests
GLOBAL_DATA_MANAGER = StepWorkDataManager()
GLOBAL_STEP4_GUIDE = Step4WorkbookGuide()

# RAG Integration - connect to deployed services
LITERATURE_SERVICE_URL = os.environ.get('LITERATURE_SERVICE_URL', 'http://digitalsponsor-literature-massive.centralus.azurecontainer.io:3002')
CHAT_SERVICE_URL = os.environ.get('CHAT_SERVICE_URL', 'http://digitalsponsor-chat-v2.centralus.azurecontainer.io:3003')
GLOBAL_RAG_INTEGRATION = StepWorkRAGIntegration(LITERATURE_SERVICE_URL, CHAT_SERVICE_URL)

class PersistentStepWorkHandler(StepWorkHandler):
    """Handler that uses global data manager for persistence"""
    def __init__(self, *args, **kwargs):
        # Don't call StepWorkHandler.__init__ to avoid creating new instances
        http.server.BaseHTTPRequestHandler.__init__(self, *args, **kwargs)
        self.data_manager = GLOBAL_DATA_MANAGER
        self.step4_guide = GLOBAL_STEP4_GUIDE
        self.rag_integration = GLOBAL_RAG_INTEGRATION

PORT = int(os.environ.get('PORT', 3003))

with socketserver.TCPServer(('', PORT), PersistentStepWorkHandler) as httpd:
    print(f'🔥 Digital Sponsor Step Work Service running on port {PORT}')
    print(f'📚 Features:')
    print(f'   ✅ Interactive Step Work Workbooks')
    print(f'   ✅ Complete Step 4 Moral Inventory System')
    print(f'   ✅ Privacy-First Data Management')
    print(f'   ✅ Step-Specific Prayers and Meditations')
    print(f'   ✅ Progress Tracking and Resume Capability')
    print(f'   ✅ Complete Data Deletion on Request')
    print(f'🌍 Region: Central US')
    print(f'🔐 Privacy: Anonymous sessions, encrypted storage, user-controlled deletion')
    print()
    print(f'📋 API Endpoints:')
    print(f'   GET  /health - Health check')
    print(f'   POST /api/session/create - Create new step work session')
    print(f'   GET  /api/step4/introduction - Get Step 4 introduction')
    print(f'   GET  /api/step4/resentment-guide - Resentment inventory guide')
    print(f'   POST /api/step4/resentment - Save resentment entry')
    print(f'   POST /api/step4/fear - Save fear entry')
    print(f'   GET  /api/prayers?step=N - Get prayers for specific step')
    print(f'   GET  /api/step4/progress/{{session_id}} - Get progress summary')
    print(f'   DELETE /api/session/{{session_id}} - Delete all user data')
    print(f'🤖 RAG-Enhanced Endpoints:')
    print(f'   GET  /api/guidance/step/{{N}}?challenge=text - AI guidance for step work')
    print(f'   GET  /api/guidance/resentment?description=text - Resentment analysis')
    print(f'   GET  /api/guidance/fear?description=text - Fear transformation help')
    print()
    
    httpd.serve_forever()