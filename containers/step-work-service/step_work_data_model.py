#!/usr/bin/env python3
"""
Digital Sponsor Step Work Data Model
Comprehensive data structure for 12-step work with privacy-first design
Now with Cosmos DB persistence and version control
"""

from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
import json
import uuid
import os
import sys
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import shared Cosmos DB client (try to import, fall back to in-memory if not available)
try:
    sys.path.insert(0, '/app')
    from shared.cosmos_client import StepWorkRepository, CosmosDBClient
    COSMOS_AVAILABLE = True
except ImportError:
    COSMOS_AVAILABLE = False
    logger.warning("Cosmos DB client not available - using in-memory storage")


@dataclass
class StepWorkSession:
    """User session for step work - privacy first with local storage option"""
    session_id: str
    user_id: Optional[str]  # Can be None for anonymous sessions
    created_at: datetime
    last_accessed: datetime
    current_step: int
    step_progress: Dict[int, float]  # Step number -> completion percentage
    privacy_settings: Dict[str, bool]

    def to_dict(self) -> Dict[str, Any]:
        return {
            'session_id': self.session_id,
            'user_id': self.user_id,
            'created_at': self.created_at.isoformat(),
            'last_accessed': self.last_accessed.isoformat(),
            'current_step': self.current_step,
            'step_progress': self.step_progress,
            'privacy_settings': self.privacy_settings
        }


@dataclass
class StepWorkVersion:
    """Tracks each time a step is worked - enables history and reflection"""
    id: str
    user_id: str
    step_number: int
    version_number: int
    previous_version_id: Optional[str]
    status: str  # "in_progress", "completed"
    started_at: datetime
    completed_at: Optional[datetime]
    responses: List[Dict[str, Any]]
    reflection_responses: List[Dict[str, Any]]
    notes: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'user_id': self.user_id,
            'step_number': self.step_number,
            'version_number': self.version_number,
            'previous_version_id': self.previous_version_id,
            'status': self.status,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'responses': self.responses,
            'reflection_responses': self.reflection_responses,
            'notes': self.notes
        }


@dataclass
class ResentmentEntry:
    """Individual resentment for Step 4 inventory"""
    id: str
    person_institution: str
    the_cause: str  # What they did
    affects_my: List[str]  # Self-esteem, security, ambitions, personal relations, sex relations
    my_part: str  # What was my part in this
    character_defect: List[str]  # Fear, selfishness, dishonesty, inconsideration
    created_at: datetime
    last_modified: datetime


@dataclass
class FearEntry:
    """Individual fear for Step 4 inventory"""
    id: str
    fear_description: str
    why_i_have_this_fear: str
    what_it_affects: List[str]  # Self-esteem, security, ambitions, personal relations
    new_thought_pattern: str  # Replacement thought
    created_at: datetime
    last_modified: datetime


@dataclass
class SexConductEntry:
    """Sexual conduct review for Step 4"""
    id: str
    where_i_was_selfish: str
    where_i_was_dishonest: str
    where_i_was_inconsiderate: str
    whom_did_i_hurt: str
    where_i_was_unjustifiably_aroused: str
    what_should_i_have_done: str
    created_at: datetime
    last_modified: datetime


@dataclass
class HarmEntry:
    """Harm done to others for Step 8/9"""
    id: str
    person_harmed: str
    nature_of_harm: str
    my_part: str
    amends_needed: str
    direct_or_indirect: str  # "direct", "indirect", "never"
    amends_status: str  # "pending", "completed", "ongoing", "not_appropriate"
    notes: str
    created_at: datetime
    last_modified: datetime


@dataclass
class Step4Inventory:
    """Complete Step 4 moral inventory"""
    session_id: str
    resentments: List[ResentmentEntry]
    fears: List[FearEntry]
    sex_conduct: List[SexConductEntry]
    harms_done: List[HarmEntry]
    personal_reflection: str
    assets_and_liabilities: str
    completion_date: Optional[datetime]
    is_complete: bool

    def to_dict(self) -> Dict[str, Any]:
        return {
            'session_id': self.session_id,
            'resentments': [asdict(r) for r in self.resentments],
            'fears': [asdict(f) for f in self.fears],
            'sex_conduct': [asdict(s) for s in self.sex_conduct],
            'harms_done': [asdict(h) for h in self.harms_done],
            'personal_reflection': self.personal_reflection,
            'assets_and_liabilities': self.assets_and_liabilities,
            'completion_date': self.completion_date.isoformat() if self.completion_date else None,
            'is_complete': self.is_complete
        }


@dataclass
class StepWorkEntry:
    """General step work entry for any step"""
    id: str
    session_id: str
    step_number: int
    section: str  # "reading", "writing", "reflection", "prayer", "action"
    prompt: str
    response: str
    is_complete: bool
    created_at: datetime
    last_modified: datetime


@dataclass
class StepPrayer:
    """Step-specific prayers and meditations"""
    step_number: int
    prayer_type: str  # "morning", "evening", "specific"
    title: str
    text: str
    source: str  # "Big Book", "12&12", "Traditional"

    def to_dict(self) -> Dict[str, Any]:
        return {
            'step_number': self.step_number,
            'prayer_type': self.prayer_type,
            'title': self.title,
            'text': self.text,
            'source': self.source
        }


@dataclass
class StepQuestionSet:
    """Q&A for step comprehension"""
    step_number: int
    section: str
    questions: List[Dict[str, Any]]  # {"question": str, "hint": str, "reflection_points": List[str]}

    def to_dict(self) -> Dict[str, Any]:
        return {
            'step_number': self.step_number,
            'section': self.section,
            'questions': self.questions
        }


class StepWorkDataManager:
    """
    Manages step work data with privacy controls.
    This is the in-memory version for backward compatibility.
    """

    def __init__(self):
        self.sessions: Dict[str, StepWorkSession] = {}
        self.step4_inventories: Dict[str, Step4Inventory] = {}
        self.step_entries: Dict[str, List[StepWorkEntry]] = {}

    def create_session(self, user_id: Optional[str] = None, anonymous: bool = True) -> StepWorkSession:
        """Create new step work session"""
        session_id = str(uuid.uuid4())
        now = datetime.now()

        session = StepWorkSession(
            session_id=session_id,
            user_id=user_id if not anonymous else None,
            created_at=now,
            last_accessed=now,
            current_step=1,
            step_progress={i: 0.0 for i in range(1, 13)},
            privacy_settings={
                'allow_analytics': False,
                'auto_delete_after_days': 90,
                'require_manual_save': True,
                'encrypted_storage': True
            }
        )

        self.sessions[session_id] = session
        return session

    def delete_all_user_data(self, session_id: str) -> bool:
        """Complete data deletion - privacy first"""
        try:
            # Remove session
            if session_id in self.sessions:
                del self.sessions[session_id]

            # Remove Step 4 inventory
            if session_id in self.step4_inventories:
                del self.step4_inventories[session_id]

            # Remove all step entries
            if session_id in self.step_entries:
                del self.step_entries[session_id]

            return True
        except Exception:
            return False

    def save_step4_entry(self, session_id: str, entry_type: str, data: Dict[str, Any]) -> str:
        """Save Step 4 inventory entry"""
        if session_id not in self.step4_inventories:
            self.step4_inventories[session_id] = Step4Inventory(
                session_id=session_id,
                resentments=[],
                fears=[],
                sex_conduct=[],
                harms_done=[],
                personal_reflection="",
                assets_and_liabilities="",
                completion_date=None,
                is_complete=False
            )

        entry_id = str(uuid.uuid4())
        now = datetime.now()

        if entry_type == "resentment":
            entry = ResentmentEntry(
                id=entry_id,
                person_institution=data.get('person_institution', ''),
                the_cause=data.get('the_cause', ''),
                affects_my=data.get('affects_my', []),
                my_part=data.get('my_part', ''),
                character_defect=data.get('character_defect', []),
                created_at=now,
                last_modified=now
            )
            self.step4_inventories[session_id].resentments.append(entry)

        elif entry_type == "fear":
            entry = FearEntry(
                id=entry_id,
                fear_description=data.get('fear_description', ''),
                why_i_have_this_fear=data.get('why_i_have_this_fear', ''),
                what_it_affects=data.get('what_it_affects', []),
                new_thought_pattern=data.get('new_thought_pattern', ''),
                created_at=now,
                last_modified=now
            )
            self.step4_inventories[session_id].fears.append(entry)

        return entry_id

    def get_step4_inventory(self, session_id: str) -> Optional[Step4Inventory]:
        """Get complete Step 4 inventory"""
        return self.step4_inventories.get(session_id)

    def export_step_work(self, session_id: str, format: str = "json") -> str:
        """Export step work for user download"""
        data = {
            'session_info': self.sessions.get(session_id, {}).to_dict() if session_id in self.sessions else {},
            'step4_inventory': self.step4_inventories.get(session_id, {}).to_dict() if session_id in self.step4_inventories else {},
            'step_entries': [entry.__dict__ for entry in self.step_entries.get(session_id, [])],
            'export_date': datetime.now().isoformat()
        }

        if format == "json":
            return json.dumps(data, indent=2, default=str)

        return str(data)


class CosmosDBDataManager:
    """
    Step work data manager with Cosmos DB persistence.
    Uses StepWorkRepository for persistent storage with version control.
    """

    def __init__(self):
        if COSMOS_AVAILABLE:
            self.cosmos_client = CosmosDBClient()
            self.step_work_repo = StepWorkRepository(self.cosmos_client)
            self._in_memory_mode = self.cosmos_client._in_memory_mode
        else:
            self.cosmos_client = None
            self.step_work_repo = None
            self._in_memory_mode = True

        # Fallback in-memory storage for anonymous sessions
        self._fallback_manager = StepWorkDataManager()

    def create_step_work_session(self, user_id: str, step_number: int) -> Dict[str, Any]:
        """
        Create a new step work session for a specific step.
        Tracks version number if user has worked this step before.
        """
        if not user_id or not self.step_work_repo:
            # Fall back to in-memory for anonymous users
            session = self._fallback_manager.create_session(anonymous=True)
            return {
                'session_id': session.session_id,
                'step_number': step_number,
                'version_number': 1,
                'is_repeat': False,
                'anonymous': True
            }

        # Check if user has worked this step before
        previous = self.step_work_repo.get_latest_step_work(user_id, step_number)
        previous_version_id = previous['id'] if previous else None

        # Create new session in Cosmos DB
        session = self.step_work_repo.create_step_work_session(
            user_id=user_id,
            step_number=step_number,
            previous_version_id=previous_version_id
        )

        return {
            'session_id': session['id'],
            'step_number': step_number,
            'version_number': session['versionNumber'],
            'is_repeat': session['versionNumber'] > 1,
            'previous_version_id': previous_version_id,
            'anonymous': False
        }

    def get_step_work_history(self, user_id: str, step_number: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get all step work history for a user"""
        if not user_id or not self.step_work_repo:
            return []

        return self.step_work_repo.get_step_work_history(user_id, step_number)

    def has_worked_step_before(self, user_id: str, step_number: int) -> bool:
        """Check if user has completed this step before"""
        if not user_id or not self.step_work_repo:
            return False

        return self.step_work_repo.has_worked_step_before(user_id, step_number)

    def get_previous_responses(self, user_id: str, step_number: int) -> Dict[str, str]:
        """
        Get user's previous responses for a step (for reflection questions).
        Returns dict mapping question_id to response text.
        """
        if not user_id or not self.step_work_repo:
            return {}

        history = self.step_work_repo.get_step_work_history(user_id, step_number)
        if not history:
            return {}

        # Get the most recent completed version
        completed = [h for h in history if h.get('status') == 'completed']
        if not completed:
            return {}

        latest = completed[-1]
        responses = latest.get('responses', [])

        return {r['prompt'][:50]: r['response'] for r in responses}

    def save_response(self, session_id: str, user_id: str,
                      prompt: str, response: str, section: str = 'general') -> Dict[str, Any]:
        """Save a Q&A response to a step work session"""
        if not user_id or not self.step_work_repo:
            # Fall back to in-memory
            return {'success': True, 'mode': 'in_memory'}

        result = self.step_work_repo.add_response(session_id, user_id, prompt, response, section)
        return {'success': True, 'session': result}

    def save_reflection_response(self, session_id: str, user_id: str,
                                  question: str, response: str,
                                  previous_response: str = '',
                                  change_noted: str = '') -> Dict[str, Any]:
        """Save a reflection response (for repeat step work)"""
        if not user_id or not self.step_work_repo:
            return {'success': True, 'mode': 'in_memory'}

        result = self.step_work_repo.add_reflection_response(
            session_id, user_id, question, response, previous_response, change_noted
        )
        return {'success': True, 'session': result}

    def complete_step_work(self, session_id: str, user_id: str) -> Dict[str, Any]:
        """Mark a step work session as complete"""
        if not user_id or not self.step_work_repo:
            return {'success': True, 'mode': 'in_memory'}

        result = self.step_work_repo.complete_step_work_session(session_id, user_id)
        return {'success': True, 'session': result}

    def save_resentment(self, session_id: str, user_id: str, resentment: Dict[str, Any]) -> str:
        """Save a resentment entry to Step 4 inventory"""
        if not user_id or not self.step_work_repo:
            return self._fallback_manager.save_step4_entry(session_id, 'resentment', resentment)

        return self.step_work_repo.save_resentment(session_id, user_id, resentment)

    def save_fear(self, session_id: str, user_id: str, fear: Dict[str, Any]) -> str:
        """Save a fear entry to Step 4 inventory"""
        if not user_id or not self.step_work_repo:
            return self._fallback_manager.save_step4_entry(session_id, 'fear', fear)

        return self.step_work_repo.save_fear(session_id, user_id, fear)

    def get_inventory(self, session_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get the Step 4 inventory for a session"""
        if not user_id or not self.step_work_repo:
            inv = self._fallback_manager.get_step4_inventory(session_id)
            return inv.to_dict() if inv else None

        return self.step_work_repo.get_inventory(session_id, user_id)

    def get_user_progress(self, user_id: str) -> Dict[str, Any]:
        """Get overall step work progress for a user"""
        if not user_id or not self.step_work_repo:
            return {'totalSessions': 0, 'stepProgress': {}, 'currentSteps': [], 'completedSteps': []}

        return self.step_work_repo.get_user_progress(user_id)

    def delete_all_user_data(self, user_id: str) -> bool:
        """Delete all step work data for a user (GDPR)"""
        if not user_id or not self.step_work_repo:
            return True

        return self.step_work_repo.delete_all_user_data(user_id)

    def health_check(self) -> Dict[str, Any]:
        """Check database health"""
        if not self.cosmos_client:
            return {'healthy': True, 'mode': 'in_memory', 'message': 'Using in-memory fallback'}

        return self.cosmos_client.health_check()


# Step-specific prayer database
STEP_PRAYERS = [
    StepPrayer(
        step_number=1,
        prayer_type="specific",
        title="Step 1 Prayer",
        text="Higher Power, I admit that I am powerless over alcohol and my life has become unmanageable. Help me to have the honesty to see my condition as it really is. Give me the willingness to begin this journey of recovery. I surrender my will and my life to your care. Amen.",
        source="Traditional AA"
    ),
    StepPrayer(
        step_number=2,
        prayer_type="specific",
        title="Step 2 Prayer",
        text="Higher Power, help me to believe that you can restore me to sanity. Open my mind to the possibility of hope. Help me to understand that I need a power greater than myself to overcome this disease. Remove my stubborn self-will and replace it with faith. Amen.",
        source="Traditional AA"
    ),
    StepPrayer(
        step_number=3,
        prayer_type="specific",
        title="Step 3 Prayer",
        text="God, I offer myself to Thee - to build with me and to do with me as Thou wilt. Relieve me of the bondage of self, that I may better do Thy will. Take away my difficulties, that victory over them may bear witness to those I would help of Thy Power, Thy Love, and Thy Way of life. May I do Thy will always!",
        source="Big Book Page 63"
    ),
    StepPrayer(
        step_number=4,
        prayer_type="specific",
        title="Step 4 Prayer",
        text="Dear God, it is I who has made my life a mess. I have done it, but I cannot undo it. My mistakes are mine, and I will begin a searching and fearless moral inventory. I will write down my wrongs, but I will also include that which is good. I pray for the strength to complete this inventory with rigorous honesty. Amen.",
        source="Traditional AA"
    ),
    StepPrayer(
        step_number=7,
        prayer_type="specific",
        title="Step 7 Prayer",
        text="My Creator, I am now willing that you should have all of me, good and bad. I pray that you now remove from me every single defect of character which stands in the way of my usefulness to you and my fellows. Grant me strength, as I go out from here, to do your bidding. Amen.",
        source="Big Book Page 76"
    ),
    StepPrayer(
        step_number=11,
        prayer_type="morning",
        title="Morning Prayer",
        text="God, direct my thinking, especially that it be divorced from self-pity, dishonest or self-seeking motives. God, inspire my thinking, decisions and intuitions. Help me to relax and take it easy. Free me from doubt and indecision. Guide me through this day and show me my next step. God, give me what I need to take care of any problems. I ask all these things that I may be of maximum service to You and my fellow man. In Your name I pray, Amen.",
        source="Big Book Page 86-87"
    ),
    StepPrayer(
        step_number=11,
        prayer_type="evening",
        title="Evening Review",
        text="God, forgive me where I have been resentful, selfish, dishonest or afraid today. Help me not to keep anything to myself but to discuss it all openly with another person. God, show me where I owe an apology and help me make it. Help me to be helpful and loving to all people I encounter. Thy will, not mine, be done. Amen.",
        source="Big Book Page 86"
    )
]


def get_step_prayers(step_number: Optional[int] = None) -> List[StepPrayer]:
    """Get prayers for specific step or all prayers"""
    if step_number:
        return [prayer for prayer in STEP_PRAYERS if prayer.step_number == step_number]
    return STEP_PRAYERS


if __name__ == "__main__":
    # Test the data model
    print("Testing StepWorkDataManager (in-memory)...")
    manager = StepWorkDataManager()

    # Create session
    session = manager.create_session(anonymous=True)
    print(f"Created session: {session.session_id}")

    # Add Step 4 resentment
    resentment_data = {
        'person_institution': 'My boss',
        'the_cause': 'Criticized my work unfairly in front of others',
        'affects_my': ['Self-esteem', 'Security'],
        'my_part': 'I was defensive and argumentative instead of listening',
        'character_defect': ['Pride', 'Fear']
    }

    entry_id = manager.save_step4_entry(session.session_id, "resentment", resentment_data)
    print(f"Saved resentment: {entry_id}")

    # Get Step 4 inventory
    inventory = manager.get_step4_inventory(session.session_id)
    if inventory:
        print(f"Inventory has {len(inventory.resentments)} resentments")

    # Get prayers for Step 1
    step1_prayers = get_step_prayers(1)
    print(f"Step 1 has {len(step1_prayers)} prayers")
    for prayer in step1_prayers:
        print(f"  - {prayer.title}")

    print("\nTesting CosmosDBDataManager...")
    cosmos_manager = CosmosDBDataManager()
    health = cosmos_manager.health_check()
    print(f"Database health: {health}")
