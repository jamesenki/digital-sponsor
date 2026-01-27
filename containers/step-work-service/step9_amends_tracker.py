"""
Step 9 Amends Tracker - Track and Reflect on Direct Amends

Transforms Step 9 from generic questions into an amends tracking tool
that pulls from Step 8 and helps users track their progress making amends.
"""

from dataclasses import dataclass, field, asdict
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum
import uuid


class AmendsStatus(Enum):
    """Status of an amends attempt"""
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    LIVING_AMENDS = "living_amends"  # Ongoing behavior change
    NOT_APPROPRIATE = "not_appropriate"  # Would injure them or others


@dataclass
class AmendEntry:
    """A single amend tracking entry"""
    id: str
    user_id: str
    session_id: str
    step8_entry_id: Optional[str]  # Link to Step 8 entry
    person_name: str
    nature_of_harm: str
    status: str  # AmendsStatus value
    date_attempted: Optional[str] = None
    date_completed: Optional[str] = None
    approach_plan: str = ""  # How I plan to make this amend
    how_it_went: str = ""  # What happened
    their_response: str = ""  # How they responded
    unexpected_outcomes: str = ""  # Anything unexpected
    what_i_learned: str = ""  # Reflection
    living_amends_commitment: str = ""  # For living amends
    why_not_appropriate: str = ""  # Reason if not appropriate
    notes: str = ""
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def to_dict(self) -> Dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict) -> 'AmendEntry':
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class Step9Session:
    """A Step 9 amends tracking session"""
    session_id: str
    user_id: str
    version_number: int
    entries: List[AmendEntry] = field(default_factory=list)
    step8_session_id: Optional[str] = None  # Link to source Step 8
    status: str = "in_progress"
    started_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    completed_at: Optional[str] = None

    def to_dict(self) -> Dict:
        return {
            'session_id': self.session_id,
            'user_id': self.user_id,
            'version_number': self.version_number,
            'entries': [e.to_dict() for e in self.entries],
            'step8_session_id': self.step8_session_id,
            'status': self.status,
            'started_at': self.started_at,
            'completed_at': self.completed_at,
            'summary': self.get_summary()
        }

    def get_summary(self) -> Dict:
        """Get progress summary"""
        total = len(self.entries)
        if total == 0:
            return {
                'total': 0,
                'not_started': 0,
                'in_progress': 0,
                'completed': 0,
                'living_amends': 0,
                'not_appropriate': 0,
                'completion_percentage': 0
            }

        not_started = sum(1 for e in self.entries if e.status == AmendsStatus.NOT_STARTED.value)
        in_progress = sum(1 for e in self.entries if e.status == AmendsStatus.IN_PROGRESS.value)
        completed = sum(1 for e in self.entries if e.status == AmendsStatus.COMPLETED.value)
        living = sum(1 for e in self.entries if e.status == AmendsStatus.LIVING_AMENDS.value)
        not_appropriate = sum(1 for e in self.entries if e.status == AmendsStatus.NOT_APPROPRIATE.value)

        # Completion = completed + living_amends + not_appropriate (resolved)
        resolved = completed + living + not_appropriate
        completion_pct = round((resolved / total) * 100) if total > 0 else 0

        return {
            'total': total,
            'not_started': not_started,
            'in_progress': in_progress,
            'completed': completed,
            'living_amends': living,
            'not_appropriate': not_appropriate,
            'completion_percentage': completion_pct
        }


class Step9AmendsTracker:
    """Manager for Step 9 Amends Tracker functionality"""

    def __init__(self):
        # In-memory storage (would be Cosmos DB in production)
        self.sessions: Dict[str, Step9Session] = {}  # session_id -> Step9Session
        self.entries: Dict[str, AmendEntry] = {}  # entry_id -> AmendEntry

    def create_session(self, user_id: str, step8_session_id: Optional[str] = None, version_number: int = 1) -> Step9Session:
        """Create a new Step 9 session"""
        session_id = str(uuid.uuid4())
        new_session = Step9Session(
            session_id=session_id,
            user_id=user_id,
            version_number=version_number,
            step8_session_id=step8_session_id
        )
        self.sessions[session_id] = new_session
        return new_session

    def get_session(self, session_id: str) -> Optional[Step9Session]:
        """Get a Step 9 session by ID"""
        return self.sessions.get(session_id)

    def get_user_sessions(self, user_id: str) -> List[Step9Session]:
        """Get all Step 9 sessions for a user"""
        return [s for s in self.sessions.values() if s.user_id == user_id]

    def get_latest_session(self, user_id: str) -> Optional[Step9Session]:
        """Get the most recent Step 9 session for a user"""
        user_sessions = self.get_user_sessions(user_id)
        if not user_sessions:
            return None
        return max(user_sessions, key=lambda x: x.started_at)

    def import_from_step8(self, session_id: str, step8_entries: List[Dict]) -> List[AmendEntry]:
        """Import entries from Step 8 list"""
        session = self.sessions.get(session_id)
        if not session:
            return []

        imported = []
        for s8_entry in step8_entries:
            # Only import if willing (level >= 5)
            willingness = s8_entry.get('willingness_level', 0)
            if willingness < 1:  # Import all, but note willingness
                continue

            entry = AmendEntry(
                id=str(uuid.uuid4()),
                user_id=session.user_id,
                session_id=session_id,
                step8_entry_id=s8_entry.get('id'),
                person_name=s8_entry.get('person_or_institution', ''),
                nature_of_harm=s8_entry.get('nature_of_harm', ''),
                status=AmendsStatus.NOT_STARTED.value
            )

            session.entries.append(entry)
            self.entries[entry.id] = entry
            imported.append(entry)

        return imported

    def add_entry(self, session_id: str, entry_data: Dict) -> Optional[AmendEntry]:
        """Add a new entry manually"""
        session = self.sessions.get(session_id)
        if not session:
            return None

        entry = AmendEntry(
            id=str(uuid.uuid4()),
            user_id=session.user_id,
            session_id=session_id,
            step8_entry_id=entry_data.get('step8_entry_id'),
            person_name=entry_data.get('person_name', ''),
            nature_of_harm=entry_data.get('nature_of_harm', ''),
            status=entry_data.get('status', AmendsStatus.NOT_STARTED.value),
            approach_plan=entry_data.get('approach_plan', ''),
            notes=entry_data.get('notes', '')
        )

        session.entries.append(entry)
        self.entries[entry.id] = entry
        return entry

    def update_entry(self, entry_id: str, updates: Dict) -> Optional[AmendEntry]:
        """Update an existing entry"""
        entry = self.entries.get(entry_id)
        if not entry:
            return None

        # Update allowed fields
        allowed_fields = [
            'person_name', 'nature_of_harm', 'status',
            'date_attempted', 'date_completed', 'approach_plan',
            'how_it_went', 'their_response', 'unexpected_outcomes',
            'what_i_learned', 'living_amends_commitment',
            'why_not_appropriate', 'notes'
        ]

        for field_name in allowed_fields:
            if field_name in updates:
                setattr(entry, field_name, updates[field_name])

        # Auto-set dates based on status
        if 'status' in updates:
            status = updates['status']
            if status == AmendsStatus.IN_PROGRESS.value and not entry.date_attempted:
                entry.date_attempted = datetime.utcnow().isoformat()
            elif status == AmendsStatus.COMPLETED.value and not entry.date_completed:
                entry.date_completed = datetime.utcnow().isoformat()

        entry.updated_at = datetime.utcnow().isoformat()
        return entry

    def delete_entry(self, entry_id: str) -> bool:
        """Delete an entry"""
        entry = self.entries.get(entry_id)
        if not entry:
            return False

        session = self.sessions.get(entry.session_id)
        if session:
            session.entries = [e for e in session.entries if e.id != entry_id]

        del self.entries[entry_id]
        return True

    def complete_session(self, session_id: str) -> Optional[Step9Session]:
        """Mark a session as completed"""
        session = self.sessions.get(session_id)
        if not session:
            return None

        session.status = "completed"
        session.completed_at = datetime.utcnow().isoformat()
        return session

    def get_reflection_prompts(self, status: str) -> List[Dict]:
        """Get reflection prompts based on amend status"""
        prompts = {
            AmendsStatus.NOT_STARTED.value: [
                {
                    "id": "s9_plan_1",
                    "question": "How do you plan to approach this person?",
                    "hint": "Consider timing, setting, and what you'll say."
                },
                {
                    "id": "s9_plan_2",
                    "question": "What fears do you have about making this amend?",
                    "hint": "Be honest about what's holding you back."
                },
                {
                    "id": "s9_plan_3",
                    "question": "Have you discussed this amend with your sponsor?",
                    "hint": "The Big Book recommends consulting others first (p.77)."
                }
            ],
            AmendsStatus.IN_PROGRESS.value: [
                {
                    "id": "s9_prog_1",
                    "question": "What have you done so far toward this amend?",
                    "hint": "Document your progress."
                },
                {
                    "id": "s9_prog_2",
                    "question": "What obstacles have you encountered?",
                    "hint": "What's making this difficult?"
                }
            ],
            AmendsStatus.COMPLETED.value: [
                {
                    "id": "s9_done_1",
                    "question": "How did the person respond?",
                    "hint": "Describe their reaction."
                },
                {
                    "id": "s9_done_2",
                    "question": "Were there any unexpected outcomes?",
                    "hint": "Sometimes amends lead to surprises."
                },
                {
                    "id": "s9_done_3",
                    "question": "What did you learn from this experience?",
                    "hint": "How has this changed you?"
                },
                {
                    "id": "s9_done_4",
                    "question": "The Big Book says 'we will comprehend the word serenity' (p.83). Did you experience any peace from this amend?",
                    "hint": "Reflect on the promises."
                }
            ],
            AmendsStatus.LIVING_AMENDS.value: [
                {
                    "id": "s9_living_1",
                    "question": "What specific behavior change does this living amend require?",
                    "hint": "Be concrete about what you're committing to."
                },
                {
                    "id": "s9_living_2",
                    "question": "How will you know if you're keeping this commitment?",
                    "hint": "Consider measurable ways to track progress."
                }
            ],
            AmendsStatus.NOT_APPROPRIATE.value: [
                {
                    "id": "s9_not_1",
                    "question": "Why would direct amends injure this person or others?",
                    "hint": "The Big Book says 'except when to do so would injure them or others' (p.59)."
                },
                {
                    "id": "s9_not_2",
                    "question": "Is there an indirect way to make amends?",
                    "hint": "Consider charitable acts or living differently."
                }
            ]
        }
        return prompts.get(status, [])

    def get_step9_guidance(self) -> List[Dict]:
        """Get general Step 9 guidance"""
        return [
            {
                "id": "s9_guide_1",
                "title": "The Approach",
                "content": "The Big Book says: 'We go to him in a helpful and forgiving spirit, confessing our former ill feeling and expressing our regret.' (p.77)"
            },
            {
                "id": "s9_guide_2",
                "title": "No Expectations",
                "content": "We make amends 'wherever possible' but we don't expect forgiveness. Our job is to clean up our side of the street."
            },
            {
                "id": "s9_guide_3",
                "title": "Timing Matters",
                "content": "Some amends require preparation. Discuss difficult cases with your sponsor before approaching."
            },
            {
                "id": "s9_guide_4",
                "title": "The Promises",
                "content": "As we work Step 9, the promises begin to materialize: freedom from regret, serenity, peace (Big Book p.83-84)."
            }
        ]


# Global instance
step9_tracker = Step9AmendsTracker()


def get_step9_tracker() -> Step9AmendsTracker:
    """Get the global Step 9 Amends Tracker instance"""
    return step9_tracker
