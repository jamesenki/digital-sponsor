#!/usr/bin/env python3
"""
Digital Sponsor Knowledge Graph Service
Neo4j-based literature knowledge graph for AA recovery content.

Phase 1: Static literature graph (read-only)
- 12 Steps with relationships
- 12 Traditions
- Concepts (character defects, spiritual principles)
- Literature passages with cross-references

Phase 2: User Journey Graph (read-write)
- Sync user step work to graph
- Track resentments → amends flow
- Generate personalized insights
- Suggest sponsor discussion topics
"""

import http.server
import socketserver
import json
import os
from datetime import datetime
from typing import Dict, Any, List, Optional
from dataclasses import dataclass

# Import user journey handlers
from user_journey import (
    handle_sync_step_work,
    handle_sync_resentment,
    handle_get_insights,
    handle_get_sponsor_topics,
    handle_get_dashboard,
    USER_JOURNEY
)

# Neo4j Configuration
NEO4J_URI = os.environ.get('NEO4J_URI', 'bolt://localhost:7687')
NEO4J_USER = os.environ.get('NEO4J_USER', 'neo4j')
NEO4J_PASSWORD = os.environ.get('NEO4J_PASSWORD', 'password')

# Try to import neo4j driver
try:
    from neo4j import GraphDatabase
    NEO4J_AVAILABLE = True
except ImportError:
    NEO4J_AVAILABLE = False
    print("⚠️ Neo4j driver not installed. Running in mock mode.")


class KnowledgeGraphService:
    """
    Service for querying the AA literature knowledge graph.
    Falls back to mock data if Neo4j is not available.
    """

    def __init__(self):
        self.driver = None
        self.is_connected = False

        if NEO4J_AVAILABLE:
            try:
                self.driver = GraphDatabase.driver(
                    NEO4J_URI,
                    auth=(NEO4J_USER, NEO4J_PASSWORD)
                )
                # Test connection
                self.driver.verify_connectivity()
                self.is_connected = True
                print(f"✅ Connected to Neo4j at {NEO4J_URI}")
            except Exception as e:
                print(f"⚠️ Neo4j connection failed: {e}")
                self.is_connected = False

    def close(self):
        if self.driver:
            self.driver.close()

    def _run_query(self, query: str, parameters: Dict = None) -> List[Dict]:
        """Execute a Cypher query and return results"""
        if not self.is_connected:
            return []

        with self.driver.session() as session:
            result = session.run(query, parameters or {})
            return [record.data() for record in result]

    # =========================================================================
    # STEP QUERIES
    # =========================================================================

    def get_step(self, step_number: int) -> Optional[Dict]:
        """Get a specific step with its relationships"""
        if not self.is_connected:
            return self._mock_get_step(step_number)

        query = """
        MATCH (s:Step {number: $number})
        OPTIONAL MATCH (s)-[:HAS_PRAYER]->(p:Prayer)
        OPTIONAL MATCH (s)-[:EMBODIES]->(sp:SpiritualPrinciple)
        OPTIONAL MATCH (s)-[:ADDRESSES]->(c:Concept)
        OPTIONAL MATCH (s)-[r]->(next:Step)
        RETURN s,
               p AS prayer,
               collect(DISTINCT sp.name) AS principles,
               collect(DISTINCT c.name) AS concepts,
               collect(DISTINCT {step: next.number, relationship: type(r)}) AS nextSteps
        """
        results = self._run_query(query, {"number": step_number})
        return results[0] if results else None

    def get_step_relationships(self) -> List[Dict]:
        """Get all step-to-step relationships"""
        if not self.is_connected:
            return self._mock_step_relationships()

        query = """
        MATCH (s1:Step)-[r]->(s2:Step)
        WHERE type(r) IN ['FOLLOWS', 'PREPARES_FOR', 'PROVIDES_INPUT_TO', 'BUILDS_ON']
        RETURN s1.number AS from,
               s2.number AS to,
               type(r) AS relationship,
               CASE type(r)
                 WHEN 'PROVIDES_INPUT_TO' THEN 'Step ' + s1.number + ' work feeds into Step ' + s2.number
                 WHEN 'PREPARES_FOR' THEN 'Step ' + s1.number + ' prepares you for Step ' + s2.number
                 WHEN 'FOLLOWS' THEN 'Step ' + s2.number + ' follows Step ' + s1.number
                 WHEN 'BUILDS_ON' THEN 'Step ' + s2.number + ' builds on Step ' + s1.number
                 ELSE 'Related'
               END AS explanation
        ORDER BY s1.number
        """
        return self._run_query(query)

    # =========================================================================
    # CONCEPT QUERIES
    # =========================================================================

    def get_concept(self, concept_name: str) -> Optional[Dict]:
        """Get a concept with all its relationships"""
        if not self.is_connected:
            return self._mock_get_concept(concept_name)

        query = """
        MATCH (c:Concept {name: $name})
        OPTIONAL MATCH (c)-[:OPPOSITE_OF]->(opposite:Concept)
        OPTIONAL MATCH (c)-[:RELATED_TO]->(related:Concept)
        OPTIONAL MATCH (c)<-[:ADDRESSES]-(s:Step)
        OPTIONAL MATCH (c)<-[:ILLUSTRATES]-(p:Passage)
        RETURN c,
               opposite.name AS opposite,
               collect(DISTINCT related.name) AS relatedConcepts,
               collect(DISTINCT s.number) AS addressedInSteps,
               collect(DISTINCT {text: p.text, source: p.source, page: p.pageReference})[0..5] AS passages
        """
        results = self._run_query(query, {"name": concept_name})
        return results[0] if results else None

    def trace_concept(self, concept_name: str) -> List[Dict]:
        """Trace a concept across all literature"""
        if not self.is_connected:
            return self._mock_trace_concept(concept_name)

        query = """
        MATCH (c:Concept {name: $name})
        OPTIONAL MATCH path = (c)<-[:ABOUT|ILLUSTRATES|ADDRESSES*1..3]-(content)
        WHERE content:Passage OR content:Step OR content:Prayer
        WITH content, [rel IN relationships(path) | type(rel)] AS connectionTypes, length(path) AS depth
        RETURN DISTINCT
               labels(content)[0] AS type,
               content.name AS name,
               content.text AS text,
               content.pageReference AS pageReference,
               content.source AS source,
               connectionTypes,
               depth
        ORDER BY depth, content.pageReference
        LIMIT 20
        """
        return self._run_query(query, {"name": concept_name})

    def get_concept_opposite(self, defect_name: str) -> Optional[Dict]:
        """Get the opposite of a character defect with actionable guidance"""
        if not self.is_connected:
            return self._mock_concept_opposite(defect_name)

        query = """
        MATCH (defect:CharacterDefect {name: $name})
        OPTIONAL MATCH (defect)-[:OPPOSITE_OF]->(principle:SpiritualPrinciple)
        OPTIONAL MATCH (principle)<-[:EMBODIES]-(step:Step)
        OPTIONAL MATCH (step)-[:HAS_PRAYER]->(prayer:Prayer)
        OPTIONAL MATCH (principle)<-[:ILLUSTRATES]-(passage:Passage)
        RETURN defect.name AS defect,
               defect.manifestations AS manifestations,
               principle.name AS remedy,
               principle.definition AS remedyDefinition,
               collect(DISTINCT step.number) AS stepsToWork,
               collect(DISTINCT {name: prayer.name, text: prayer.text})[0] AS prayer,
               collect(DISTINCT passage.pageReference)[0..5] AS readings
        """
        results = self._run_query(query, {"name": defect_name})
        return results[0] if results else None

    # =========================================================================
    # PASSAGE/LITERATURE QUERIES
    # =========================================================================

    def search_passages(self, query: str, limit: int = 10) -> List[Dict]:
        """Search passages by text content"""
        if not self.is_connected:
            return self._mock_search_passages(query)

        cypher = """
        CALL db.index.fulltext.queryNodes('passageIndex', $query)
        YIELD node, score
        WHERE node:Passage
        RETURN node.text AS text,
               node.source AS source,
               node.pageReference AS pageReference,
               score
        ORDER BY score DESC
        LIMIT $limit
        """
        return self._run_query(cypher, {"query": query, "limit": limit})

    def get_related_content(self, passage_id: str) -> Dict:
        """Get content related to a specific passage"""
        if not self.is_connected:
            return {}

        query = """
        MATCH (p:Passage {id: $id})
        OPTIONAL MATCH (p)-[:ABOUT]->(c:Concept)
        OPTIONAL MATCH (p)-[:EXPLAINS]->(s:Step)
        OPTIONAL MATCH (p)-[:REFERENCES]->(related:Passage)
        RETURN p,
               collect(DISTINCT c.name) AS concepts,
               collect(DISTINCT s.number) AS steps,
               collect(DISTINCT {text: related.text, page: related.pageReference}) AS relatedPassages
        """
        results = self._run_query(query, {"id": passage_id})
        return results[0] if results else {}

    # =========================================================================
    # ANALYTICS QUERIES
    # =========================================================================

    def get_graph_stats(self) -> Dict:
        """Get statistics about the knowledge graph"""
        if not self.is_connected:
            return self._mock_graph_stats()

        query = """
        MATCH (n)
        WITH labels(n) AS labels, count(n) AS count
        UNWIND labels AS label
        RETURN label, sum(count) AS count
        ORDER BY count DESC
        """
        node_counts = self._run_query(query)

        rel_query = """
        MATCH ()-[r]->()
        RETURN type(r) AS type, count(r) AS count
        ORDER BY count DESC
        """
        rel_counts = self._run_query(rel_query)

        return {
            "nodes": {item["label"]: item["count"] for item in node_counts},
            "relationships": {item["type"]: item["count"] for item in rel_counts},
            "lastUpdated": datetime.now().isoformat()
        }

    # =========================================================================
    # MOCK DATA (when Neo4j is not available)
    # =========================================================================

    def _mock_get_step(self, step_number: int) -> Dict:
        """Mock step data"""
        steps = {
            1: {
                "number": 1,
                "name": "Powerlessness & Unmanageability",
                "text": "We admitted we were powerless over alcohol—that our lives had become unmanageable.",
                "prayer": {"name": "Step 1 Prayer", "text": "God, I admit that I am powerless..."},
                "principles": ["Honesty", "Acceptance"],
                "concepts": ["Powerlessness", "Unmanageability", "Denial"],
                "nextSteps": [{"step": 2, "relationship": "FOLLOWS"}]
            },
            4: {
                "number": 4,
                "name": "Moral Inventory",
                "text": "Made a searching and fearless moral inventory of ourselves.",
                "prayer": {"name": "Step 4 Prayer", "text": "Dear God, it is I who has made my life a mess..."},
                "principles": ["Courage", "Honesty"],
                "concepts": ["Resentment", "Fear", "Character Defects"],
                "nextSteps": [
                    {"step": 5, "relationship": "PREPARES_FOR"},
                    {"step": 8, "relationship": "PROVIDES_INPUT_TO"}
                ]
            },
            8: {
                "number": 8,
                "name": "Made a List",
                "text": "Made a list of all persons we had harmed, and became willing to make amends to them all.",
                "prayer": {"name": "Step 8 Prayer", "text": "Higher Power, help me to see clearly..."},
                "principles": ["Willingness", "Accountability"],
                "concepts": ["Willingness", "Harm", "Amends"],
                "nextSteps": [{"step": 9, "relationship": "PREPARES_FOR"}]
            }
        }
        return steps.get(step_number, {"number": step_number, "name": f"Step {step_number}"})

    def _mock_step_relationships(self) -> List[Dict]:
        """Mock step relationships"""
        return [
            {"from": 1, "to": 2, "relationship": "FOLLOWS", "explanation": "Step 2 follows Step 1"},
            {"from": 2, "to": 3, "relationship": "FOLLOWS", "explanation": "Step 3 follows Step 2"},
            {"from": 3, "to": 4, "relationship": "FOLLOWS", "explanation": "Step 4 follows Step 3"},
            {"from": 4, "to": 5, "relationship": "PREPARES_FOR", "explanation": "Step 4 prepares you for Step 5"},
            {"from": 4, "to": 8, "relationship": "PROVIDES_INPUT_TO", "explanation": "Step 4 work feeds into Step 8"},
            {"from": 5, "to": 6, "relationship": "FOLLOWS", "explanation": "Step 6 follows Step 5"},
            {"from": 6, "to": 7, "relationship": "FOLLOWS", "explanation": "Step 7 follows Step 6"},
            {"from": 8, "to": 9, "relationship": "PREPARES_FOR", "explanation": "Step 8 prepares you for Step 9"},
            {"from": 9, "to": 10, "relationship": "FOLLOWS", "explanation": "Step 10 follows Step 9"},
            {"from": 10, "to": 11, "relationship": "FOLLOWS", "explanation": "Step 11 follows Step 10"},
            {"from": 11, "to": 12, "relationship": "FOLLOWS", "explanation": "Step 12 follows Step 11"},
        ]

    def _mock_get_concept(self, concept_name: str) -> Dict:
        """Mock concept data"""
        concepts = {
            "resentment": {
                "name": "Resentment",
                "category": "character_defect",
                "definition": "The 'number one' offender. It destroys more alcoholics than anything else.",
                "opposite": "Acceptance",
                "relatedConcepts": ["Fear", "Pride", "Self-pity"],
                "addressedInSteps": [4, 5, 10],
                "passages": [
                    {"text": "Resentment is the 'number one' offender...", "source": "Big Book", "page": "p.64"},
                    {"text": "It is plain that a life which includes deep resentment leads only to futility...", "source": "Big Book", "page": "p.66"}
                ]
            },
            "fear": {
                "name": "Fear",
                "category": "character_defect",
                "definition": "This short word somehow touches about every aspect of our lives.",
                "opposite": "Faith",
                "relatedConcepts": ["Resentment", "Self-centeredness"],
                "addressedInSteps": [4, 6, 7],
                "passages": [
                    {"text": "This short word somehow touches about every aspect of our lives...", "source": "Big Book", "page": "p.67"}
                ]
            }
        }
        return concepts.get(concept_name.lower(), {"name": concept_name, "definition": "Concept not found"})

    def _mock_trace_concept(self, concept_name: str) -> List[Dict]:
        """Mock trace concept results"""
        return [
            {"type": "Passage", "text": f"Discussion of {concept_name}...", "pageReference": "p.64", "source": "Big Book", "connectionTypes": ["ABOUT"], "depth": 1},
            {"type": "Step", "name": "Step 4", "text": "Made a searching and fearless moral inventory...", "pageReference": None, "connectionTypes": ["ADDRESSES"], "depth": 1},
        ]

    def _mock_concept_opposite(self, defect_name: str) -> Dict:
        """Mock concept opposite data"""
        opposites = {
            "pride": {
                "defect": "Pride",
                "manifestations": ["Ego", "Arrogance", "Self-importance"],
                "remedy": "Humility",
                "remedyDefinition": "Not thinking less of yourself, but thinking of yourself less.",
                "stepsToWork": [6, 7],
                "prayer": {"name": "Seventh Step Prayer", "text": "My Creator, I am now willing..."},
                "readings": ["p.76", "Step 7 in 12&12"]
            },
            "fear": {
                "defect": "Fear",
                "manifestations": ["Anxiety", "Worry", "Dread"],
                "remedy": "Faith",
                "remedyDefinition": "Trust in a Power greater than ourselves.",
                "stepsToWork": [2, 3, 11],
                "prayer": {"name": "Third Step Prayer", "text": "God, I offer myself to Thee..."},
                "readings": ["p.67-68", "Step 2 in 12&12"]
            }
        }
        return opposites.get(defect_name.lower(), {"defect": defect_name, "remedy": "Unknown"})

    def _mock_search_passages(self, query: str) -> List[Dict]:
        """Mock passage search"""
        return [
            {"text": f"Sample passage matching '{query}'...", "source": "Big Book", "pageReference": "p.64", "score": 0.9},
            {"text": f"Another passage about '{query}'...", "source": "12&12", "pageReference": "Step 4", "score": 0.8},
        ]

    def _mock_graph_stats(self) -> Dict:
        """Mock graph statistics"""
        return {
            "nodes": {
                "Step": 12,
                "Tradition": 12,
                "Concept": 50,
                "CharacterDefect": 15,
                "SpiritualPrinciple": 12,
                "Passage": 200,
                "Prayer": 15,
                "Book": 5,
                "Chapter": 40
            },
            "relationships": {
                "FOLLOWS": 11,
                "PREPARES_FOR": 8,
                "PROVIDES_INPUT_TO": 3,
                "ADDRESSES": 60,
                "ILLUSTRATES": 150,
                "OPPOSITE_OF": 15,
                "HAS_PRAYER": 12
            },
            "lastUpdated": datetime.now().isoformat()
        }


# Global service instance
KNOWLEDGE_GRAPH = KnowledgeGraphService()


# =========================================================================
# HTTP HANDLER
# =========================================================================

class KnowledgeGraphHandler(http.server.BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def send_json(self, data: Dict, status: int = 200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def do_GET(self):
        path = self.path.split('?')[0]

        if path == '/health':
            self.send_json({
                'status': 'healthy',
                'service': 'Digital Sponsor Knowledge Graph Service',
                'neo4jConnected': KNOWLEDGE_GRAPH.is_connected,
                'userJourneyConnected': USER_JOURNEY.is_connected,
                'mode': 'live' if KNOWLEDGE_GRAPH.is_connected else 'mock',
                'region': 'Central US',
                'timestamp': datetime.now().isoformat(),
                'version': '2.0.0',
                'phases': ['literature-graph', 'user-journey']
            })

        elif path == '/api/graph/stats':
            stats = KNOWLEDGE_GRAPH.get_graph_stats()
            self.send_json({'success': True, 'stats': stats})

        elif path == '/api/steps/relationships':
            relationships = KNOWLEDGE_GRAPH.get_step_relationships()
            self.send_json({'success': True, 'relationships': relationships})

        elif path.startswith('/api/step/'):
            try:
                step_number = int(path.split('/')[-1])
                step = KNOWLEDGE_GRAPH.get_step(step_number)
                if step:
                    self.send_json({'success': True, 'step': step})
                else:
                    self.send_json({'success': False, 'error': 'Step not found'}, 404)
            except ValueError:
                self.send_json({'success': False, 'error': 'Invalid step number'}, 400)

        elif path.startswith('/api/concept/'):
            concept_name = path.split('/')[-1].replace('%20', ' ')
            concept = KNOWLEDGE_GRAPH.get_concept(concept_name)
            if concept:
                self.send_json({'success': True, 'concept': concept})
            else:
                self.send_json({'success': False, 'error': 'Concept not found'}, 404)

        elif path.startswith('/api/concept-trace/'):
            concept_name = path.split('/')[-1].replace('%20', ' ')
            trace = KNOWLEDGE_GRAPH.trace_concept(concept_name)
            self.send_json({'success': True, 'concept': concept_name, 'trace': trace})

        elif path.startswith('/api/defect-remedy/'):
            defect_name = path.split('/')[-1].replace('%20', ' ')
            remedy = KNOWLEDGE_GRAPH.get_concept_opposite(defect_name)
            if remedy:
                self.send_json({'success': True, 'remedy': remedy})
            else:
                self.send_json({'success': False, 'error': 'Defect not found'}, 404)

        # =================================================================
        # USER JOURNEY ENDPOINTS (Phase 2)
        # =================================================================

        elif path.startswith('/api/user/') and path.endswith('/insights'):
            # GET /api/user/{userId}/insights
            parts = path.split('/')
            user_id = parts[3] if len(parts) >= 5 else None
            if user_id:
                result = handle_get_insights(user_id)
                self.send_json(result)
            else:
                self.send_json({'success': False, 'error': 'User ID required'}, 400)

        elif path.startswith('/api/user/') and path.endswith('/sponsor-topics'):
            # GET /api/user/{userId}/sponsor-topics
            parts = path.split('/')
            user_id = parts[3] if len(parts) >= 5 else None
            if user_id:
                result = handle_get_sponsor_topics(user_id)
                self.send_json(result)
            else:
                self.send_json({'success': False, 'error': 'User ID required'}, 400)

        elif path.startswith('/api/user/') and path.endswith('/dashboard'):
            # GET /api/user/{userId}/dashboard
            parts = path.split('/')
            user_id = parts[3] if len(parts) >= 5 else None
            if user_id:
                result = handle_get_dashboard(user_id)
                self.send_json(result)
            else:
                self.send_json({'success': False, 'error': 'User ID required'}, 400)

        else:
            self.send_json({'success': False, 'error': 'Not found'}, 404)

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length) if content_length else b'{}'

        try:
            data = json.loads(post_data.decode('utf-8'))
        except json.JSONDecodeError:
            self.send_json({'success': False, 'error': 'Invalid JSON'}, 400)
            return

        path = self.path

        if path == '/api/search/passages':
            query = data.get('query', '')
            limit = data.get('limit', 10)
            if not query:
                self.send_json({'success': False, 'error': 'Query required'}, 400)
                return
            results = KNOWLEDGE_GRAPH.search_passages(query, limit)
            self.send_json({'success': True, 'results': results, 'query': query})

        elif path == '/api/query':
            # Advanced: Run custom Cypher query (admin only, for debugging)
            admin_key = data.get('adminKey')
            if admin_key != os.environ.get('ADMIN_KEY', 'dev-admin-key'):
                self.send_json({'success': False, 'error': 'Unauthorized'}, 401)
                return

            cypher = data.get('query', '')
            params = data.get('parameters', {})
            if not cypher:
                self.send_json({'success': False, 'error': 'Query required'}, 400)
                return

            try:
                results = KNOWLEDGE_GRAPH._run_query(cypher, params)
                self.send_json({'success': True, 'results': results})
            except Exception as e:
                self.send_json({'success': False, 'error': str(e)}, 500)

        # =================================================================
        # USER JOURNEY SYNC ENDPOINTS (Phase 2)
        # =================================================================

        elif path == '/api/user/sync/step-work':
            # POST /api/user/sync/step-work
            result = handle_sync_step_work(data)
            status = 200 if result.get('success') else 400
            self.send_json(result, status)

        elif path == '/api/user/sync/resentment':
            # POST /api/user/sync/resentment
            result = handle_sync_resentment(data)
            status = 200 if result.get('success') else 400
            self.send_json(result, status)

        else:
            self.send_json({'success': False, 'error': 'Not found'}, 404)


# =========================================================================
# MAIN
# =========================================================================

PORT = int(os.environ.get('PORT', 3005))

if __name__ == '__main__':
    with socketserver.TCPServer(('', PORT), KnowledgeGraphHandler) as httpd:
        print(f'🔗 Digital Sponsor Knowledge Graph Service v2.0 running on port {PORT}')
        print(f'📊 Neo4j connected: {KNOWLEDGE_GRAPH.is_connected}')
        print(f'👤 User Journey service: {USER_JOURNEY.is_connected}')
        print(f'🔄 Mode: {"live" if KNOWLEDGE_GRAPH.is_connected else "mock (Neo4j not available)"}')
        print('🌍 Region: Central US')
        print('')
        print('📚 Phase 1 - Literature Graph Endpoints:')
        print(f'   GET  /health - Service health')
        print(f'   GET  /api/graph/stats - Graph statistics')
        print(f'   GET  /api/steps/relationships - Step relationships')
        print(f'   GET  /api/step/{{number}} - Get step details')
        print(f'   GET  /api/concept/{{name}} - Get concept details')
        print(f'   GET  /api/concept-trace/{{name}} - Trace concept across literature')
        print(f'   GET  /api/defect-remedy/{{name}} - Get remedy for character defect')
        print(f'   POST /api/search/passages - Search passages')
        print('')
        print('👤 Phase 2 - User Journey Endpoints:')
        print(f'   POST /api/user/sync/step-work - Sync step work session')
        print(f'   POST /api/user/sync/resentment - Sync resentment from Step 4')
        print(f'   GET  /api/user/{{userId}}/insights - Get personalized insights')
        print(f'   GET  /api/user/{{userId}}/sponsor-topics - Get sponsor discussion topics')
        print(f'   GET  /api/user/{{userId}}/dashboard - Get recovery dashboard')
        httpd.serve_forever()
