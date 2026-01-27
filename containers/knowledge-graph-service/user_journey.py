#!/usr/bin/env python3
"""
User Journey Graph Integration for Digital Sponsor

Phase 5 Implementation:
- Sync user step work to Neo4j graph
- Track resentments → amends flow
- Generate personalized insights based on user's journey
- Suggest sponsor discussion topics
"""

import os
from datetime import datetime, date
from typing import Dict, Any, List, Optional
from dataclasses import dataclass

# Neo4j Configuration
NEO4J_URI = os.environ.get('NEO4J_URI', 'bolt://localhost:7687')
NEO4J_USER = os.environ.get('NEO4J_USER', 'neo4j')
NEO4J_PASSWORD = os.environ.get('NEO4J_PASSWORD', 'password')

try:
    from neo4j import GraphDatabase
    NEO4J_AVAILABLE = True
except ImportError:
    NEO4J_AVAILABLE = False


@dataclass
class UserInsight:
    """A personalized insight for the user"""
    type: str  # 'pattern', 'suggestion', 'milestone', 'warning'
    title: str
    description: str
    relevantSteps: List[int]
    literatureReferences: List[str]
    priority: int  # 1=high, 2=medium, 3=low

    def to_dict(self) -> Dict[str, Any]:
        return {
            'type': self.type,
            'title': self.title,
            'description': self.description,
            'relevantSteps': self.relevantSteps,
            'literatureReferences': self.literatureReferences,
            'priority': self.priority
        }


class UserJourneyService:
    """
    Service for tracking and analyzing user recovery journeys in Neo4j.
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
                self.driver.verify_connectivity()
                self.is_connected = True
            except Exception as e:
                print(f"Neo4j connection failed: {e}")

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

    def _run_write(self, query: str, parameters: Dict = None) -> None:
        """Execute a write query"""
        if not self.is_connected:
            return
        with self.driver.session() as session:
            session.run(query, parameters or {})

    # =========================================================================
    # USER MANAGEMENT
    # =========================================================================

    def create_or_update_user(self, user_id: str, sobriety_date: str = None,
                              home_group: str = None) -> Dict:
        """Create or update a user node in the graph"""
        if not self.is_connected:
            return {"success": False, "error": "Neo4j not connected"}

        query = """
        MERGE (u:User {id: $userId})
        SET u.lastUpdated = datetime()
        """
        params = {"userId": user_id}

        if sobriety_date:
            query += ", u.sobrietyDate = date($sobrietyDate)"
            params["sobrietyDate"] = sobriety_date

        if home_group:
            query += ", u.homeGroup = $homeGroup"
            params["homeGroup"] = home_group

        query += " RETURN u"

        self._run_write(query, params)
        return {"success": True, "userId": user_id}

    # =========================================================================
    # STEP WORK SYNC
    # =========================================================================

    def sync_step_work_session(self, user_id: str, step_number: int,
                               session_id: str, status: str,
                               version: int = 1) -> Dict:
        """Sync a step work session to the graph"""
        if not self.is_connected:
            return {"success": False}

        query = """
        MATCH (u:User {id: $userId})
        MATCH (s:Step {number: $stepNumber})
        MERGE (sw:StepWorkSession {id: $sessionId})
        SET sw.status = $status,
            sw.version = $version,
            sw.lastUpdated = datetime()
        MERGE (u)-[:WORKING_ON]->(sw)
        MERGE (sw)-[:FOR_STEP]->(s)
        """

        if status == 'completed':
            query += """
            MERGE (u)-[:COMPLETED]->(sw)
            """

        self._run_write(query, {
            "userId": user_id,
            "stepNumber": step_number,
            "sessionId": session_id,
            "status": status,
            "version": version
        })

        return {"success": True}

    def sync_resentment(self, user_id: str, session_id: str,
                        resentment_id: str, who: str, cause: str,
                        my_part: str = None, affects: List[str] = None) -> Dict:
        """Sync a resentment from Step 4 inventory"""
        if not self.is_connected:
            return {"success": False}

        query = """
        MATCH (sw:StepWorkSession {id: $sessionId})
        MERGE (r:Resentment {id: $resentmentId})
        SET r.whoOrWhat = $who,
            r.cause = $cause,
            r.myPart = $myPart,
            r.affects = $affects,
            r.userId = $userId
        MERGE (sw)-[:CONTAINS]->(r)
        """
        self._run_write(query, {
            "sessionId": session_id,
            "resentmentId": resentment_id,
            "who": who,
            "cause": cause,
            "myPart": my_part,
            "affects": affects or [],
            "userId": user_id
        })

        # Link to character defects if my_part reveals them
        if my_part:
            self._analyze_and_link_defects(resentment_id, my_part)

        return {"success": True}

    def _analyze_and_link_defects(self, resentment_id: str, my_part: str):
        """Analyze my_part text and link to character defects"""
        defect_keywords = {
            "Pride": ["pride", "ego", "arrogant", "superior", "better than"],
            "Fear": ["fear", "afraid", "scared", "worried", "anxious"],
            "Selfishness": ["selfish", "self-centered", "greedy", "wanting"],
            "Dishonesty": ["lied", "dishonest", "deceived", "manipulated"],
            "Resentment": ["resent", "bitter", "grudge", "angry"]
        }

        my_part_lower = my_part.lower()
        for defect, keywords in defect_keywords.items():
            if any(kw in my_part_lower for kw in keywords):
                query = """
                MATCH (r:Resentment {id: $resentmentId})
                MATCH (d:CharacterDefect {name: $defect})
                MERGE (r)-[:REVEALS]->(d)
                """
                self._run_write(query, {"resentmentId": resentment_id, "defect": defect})

    def sync_person_harmed(self, user_id: str, person_id: str, name: str,
                           harm_done: str, willingness: int,
                           from_resentment_id: str = None) -> Dict:
        """Sync a person harmed from Step 8 list"""
        if not self.is_connected:
            return {"success": False}

        query = """
        MERGE (ph:PersonHarmed {id: $personId})
        SET ph.name = $name,
            ph.harmDone = $harmDone,
            ph.willingnessLevel = $willingness,
            ph.userId = $userId
        """
        self._run_write(query, {
            "personId": person_id,
            "name": name,
            "harmDone": harm_done,
            "willingness": willingness,
            "userId": user_id
        })

        # Link to source resentment if provided
        if from_resentment_id:
            query = """
            MATCH (r:Resentment {id: $resentmentId})
            MATCH (ph:PersonHarmed {id: $personId})
            MERGE (r)-[:LED_TO_HARM]->(ph)
            """
            self._run_write(query, {
                "resentmentId": from_resentment_id,
                "personId": person_id
            })

        return {"success": True}

    def sync_amend(self, user_id: str, amend_id: str, person_id: str,
                   status: str, notes: str = None,
                   date_completed: str = None) -> Dict:
        """Sync an amend from Step 9"""
        if not self.is_connected:
            return {"success": False}

        query = """
        MATCH (ph:PersonHarmed {id: $personId})
        MERGE (a:Amend {id: $amendId})
        SET a.status = $status,
            a.notes = $notes,
            a.dateCompleted = $dateCompleted,
            a.userId = $userId
        MERGE (ph)-[:REQUIRES]->(a)
        """
        self._run_write(query, {
            "personId": person_id,
            "amendId": amend_id,
            "status": status,
            "notes": notes,
            "dateCompleted": date_completed,
            "userId": user_id
        })

        return {"success": True}

    # =========================================================================
    # PERSONALIZED INSIGHTS
    # =========================================================================

    def get_user_insights(self, user_id: str) -> List[UserInsight]:
        """Generate personalized insights for a user based on their journey"""
        insights = []

        # Get character defect patterns from Step 4
        defect_patterns = self._get_defect_patterns(user_id)
        for defect, count in defect_patterns:
            if count >= 3:
                insights.append(UserInsight(
                    type='pattern',
                    title=f'{defect} appears frequently',
                    description=f'{defect} showed up in {count} of your resentments. '
                                f'This might be a key area to work on with your sponsor.',
                    relevantSteps=[4, 6, 7],
                    literatureReferences=['p.64-66', '12&12 Step 6-7'],
                    priority=1
                ))

        # Get amends progress
        amends_stats = self._get_amends_progress(user_id)
        if amends_stats:
            total = amends_stats.get('total', 0)
            completed = amends_stats.get('completed', 0)
            if total > 0 and completed < total:
                pending = total - completed
                insights.append(UserInsight(
                    type='suggestion',
                    title=f'{pending} amends still pending',
                    description=f'You have made {completed} of {total} amends. '
                                f'Consider discussing the remaining ones with your sponsor.',
                    relevantSteps=[8, 9],
                    literatureReferences=['p.76-84', '12&12 Step 9'],
                    priority=2
                ))

        # Check for fear patterns
        fear_count = self._get_fear_count(user_id)
        if fear_count >= 5:
            insights.append(UserInsight(
                type='pattern',
                title='Fear is a significant theme',
                description=f'You identified {fear_count} fears in your inventory. '
                            f'The Big Book says fear "somehow touches about every aspect of our lives."',
                relevantSteps=[4, 11],
                literatureReferences=['p.67-68', '12&12 Step 11'],
                priority=2
            ))

        return insights

    def _get_defect_patterns(self, user_id: str) -> List[tuple]:
        """Get character defects revealed by user's resentments"""
        if not self.is_connected:
            return []

        query = """
        MATCH (u:User {id: $userId})-[:COMPLETED]->(sw:StepWorkSession {status: 'completed'})
        MATCH (sw)-[:CONTAINS]->(r:Resentment)-[:REVEALS]->(cd:CharacterDefect)
        WITH cd.name AS defect, count(r) AS frequency
        ORDER BY frequency DESC
        RETURN defect, frequency
        LIMIT 5
        """
        results = self._run_query(query, {"userId": user_id})
        return [(r['defect'], r['frequency']) for r in results]

    def _get_amends_progress(self, user_id: str) -> Dict:
        """Get amends progress statistics"""
        if not self.is_connected:
            return {}

        query = """
        MATCH (ph:PersonHarmed {userId: $userId})-[:REQUIRES]->(a:Amend)
        RETURN count(a) AS total,
               sum(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) AS completed
        """
        results = self._run_query(query, {"userId": user_id})
        return results[0] if results else {}

    def _get_fear_count(self, user_id: str) -> int:
        """Get count of fears in user's inventory"""
        if not self.is_connected:
            return 0

        query = """
        MATCH (u:User {id: $userId})-[:COMPLETED]->(sw:StepWorkSession)
        MATCH (sw)-[:CONTAINS]->(f:Fear)
        RETURN count(f) AS fearCount
        """
        results = self._run_query(query, {"userId": user_id})
        return results[0]['fearCount'] if results else 0

    def get_sponsor_discussion_topics(self, user_id: str) -> List[Dict]:
        """Generate suggested topics for sponsor discussion"""
        topics = []

        # Get top defects
        defect_patterns = self._get_defect_patterns(user_id)
        for defect, count in defect_patterns[:3]:
            # Get remedy for this defect
            remedy_query = """
            MATCH (d:CharacterDefect {name: $defect})-[:OPPOSITE_OF]->(p:SpiritualPrinciple)
            OPTIONAL MATCH (p)<-[:EMBODIES]-(s:Step)
            RETURN p.name AS remedy, collect(s.number) AS steps
            """
            results = self._run_query(remedy_query, {"defect": defect})
            if results:
                remedy = results[0]
                topics.append({
                    'topic': f'Working on {defect}',
                    'discussion_points': [
                        f'{defect} appeared {count} times in your inventory',
                        f'The remedy is {remedy["remedy"]}',
                        f'Steps {remedy["steps"]} can help address this'
                    ],
                    'priority': 1
                })

        # Get pending difficult amends
        if self.is_connected:
            amends_query = """
            MATCH (ph:PersonHarmed {userId: $userId})-[:REQUIRES]->(a:Amend)
            WHERE a.status IN ['not_started', 'in_progress']
            AND ph.willingnessLevel < 5
            RETURN ph.name AS person, ph.harmDone AS harm, ph.willingnessLevel AS willingness
            ORDER BY ph.willingnessLevel
            LIMIT 3
            """
            difficult_amends = self._run_query(amends_query, {"userId": user_id})
            for amend in difficult_amends:
                topics.append({
                    'topic': f'Amends to {amend["person"]}',
                    'discussion_points': [
                        f'Current willingness level: {amend["willingness"]}/10',
                        f'Harm caused: {amend["harm"]}',
                        'What fears are blocking this amends?',
                        'Would this amends injure them or others?'
                    ],
                    'priority': 2
                })

        return topics

    def get_recovery_dashboard(self, user_id: str) -> Dict:
        """Get comprehensive recovery dashboard data"""
        if not self.is_connected:
            return self._mock_dashboard(user_id)

        query = """
        MATCH (u:User {id: $userId})

        // Step progress
        OPTIONAL MATCH (u)-[:COMPLETED]->(completed:StepWorkSession)
        OPTIONAL MATCH (u)-[:WORKING_ON]->(current:StepWorkSession)-[:FOR_STEP]->(currentStep:Step)
        WHERE current.status = 'in_progress'

        // Character defect analysis
        OPTIONAL MATCH (u)-[:COMPLETED]->(s4:StepWorkSession)
                       -[:CONTAINS]->(r:Resentment)-[:REVEALS]->(cd:CharacterDefect)

        // Amends tracking
        OPTIONAL MATCH (ph:PersonHarmed {userId: $userId})-[:REQUIRES]->(a:Amend)

        WITH u,
             count(DISTINCT completed) AS stepsCompleted,
             collect(DISTINCT currentStep.number) AS currentSteps,
             collect(DISTINCT cd.name) AS defectsFound,
             count(DISTINCT ph) AS totalAmends,
             sum(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) AS amendsCompleted

        RETURN {
          sobrietyDate: u.sobrietyDate,
          stepsCompleted: stepsCompleted,
          currentSteps: currentSteps,
          topDefects: defectsFound[0..3],
          amendsProgress: {
            total: totalAmends,
            completed: amendsCompleted
          }
        } AS dashboard
        """

        results = self._run_query(query, {"userId": user_id})
        return results[0]['dashboard'] if results else self._mock_dashboard(user_id)

    def _mock_dashboard(self, user_id: str) -> Dict:
        """Return mock dashboard data when Neo4j unavailable"""
        return {
            "sobrietyDate": None,
            "stepsCompleted": 0,
            "currentSteps": [],
            "topDefects": [],
            "amendsProgress": {"total": 0, "completed": 0},
            "note": "Neo4j not connected - showing mock data"
        }


# Global instance
USER_JOURNEY = UserJourneyService()


# ============================================================================
# API HANDLERS (to be integrated with app.py)
# ============================================================================

def handle_sync_step_work(data: Dict) -> Dict:
    """Handle step work sync request"""
    user_id = data.get('userId')
    step_number = data.get('stepNumber')
    session_id = data.get('sessionId')
    status = data.get('status', 'in_progress')
    version = data.get('version', 1)

    if not all([user_id, step_number, session_id]):
        return {"success": False, "error": "Missing required fields"}

    return USER_JOURNEY.sync_step_work_session(
        user_id, step_number, session_id, status, version
    )


def handle_sync_resentment(data: Dict) -> Dict:
    """Handle resentment sync request"""
    user_id = data.get('userId')
    session_id = data.get('sessionId')
    resentment_id = data.get('resentmentId')
    who = data.get('who')
    cause = data.get('cause')
    my_part = data.get('myPart')
    affects = data.get('affects', [])

    if not all([user_id, session_id, resentment_id, who]):
        return {"success": False, "error": "Missing required fields"}

    return USER_JOURNEY.sync_resentment(
        user_id, session_id, resentment_id, who, cause, my_part, affects
    )


def handle_get_insights(user_id: str) -> Dict:
    """Handle insights request"""
    insights = USER_JOURNEY.get_user_insights(user_id)
    return {
        "success": True,
        "insights": [i.to_dict() for i in insights]
    }


def handle_get_sponsor_topics(user_id: str) -> Dict:
    """Handle sponsor discussion topics request"""
    topics = USER_JOURNEY.get_sponsor_discussion_topics(user_id)
    return {
        "success": True,
        "topics": topics
    }


def handle_get_dashboard(user_id: str) -> Dict:
    """Handle dashboard request"""
    dashboard = USER_JOURNEY.get_recovery_dashboard(user_id)
    return {
        "success": True,
        "dashboard": dashboard
    }
