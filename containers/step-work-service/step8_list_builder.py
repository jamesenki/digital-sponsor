"""
Step 8 List Builder - Interactive Amends List Builder

Transforms Step 8 from generic questions into a structured list-building tool
that helps users create and reflect on their list of people to make amends to.
"""

from dataclasses import dataclass, field, asdict
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum
import uuid
import json


class WillingnessCategory(Enum):
    """Willingness levels for making amends"""
    NOT_YET = "not_yet"        # Not willing yet
    WILLING = "willing"         # Willing to make amends
    EAGER = "eager"             # Eager and ready to make amends


@dataclass
class Step8ListEntry:
    """A single entry in the Step 8 amends list"""
    id: str
    user_id: str
    session_id: str
    person_or_institution: str
    relationship: str  # e.g., "boss", "ex-wife", "bank"
    nature_of_harm: str  # What harm was done
    willingness_level: int  # 1-10 scale
    willingness_category: str  # "not_yet", "willing", "eager"
    from_step4_resentment_id: Optional[str] = None  # Link to Step 4 resentment
    from_step4_harm_id: Optional[str] = None  # Link to Step 4 harm entry
    fears_about_amends: str = ""  # What fears do I have about this amends?
    notes: str = ""
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def to_dict(self) -> Dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict) -> 'Step8ListEntry':
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class Step8List:
    """Complete Step 8 list for a user session"""
    session_id: str
    user_id: str
    version_number: int
    entries: List[Step8ListEntry] = field(default_factory=list)
    step4_session_id: Optional[str] = None  # Link to source Step 4
    status: str = "in_progress"  # "in_progress", "completed"
    started_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    completed_at: Optional[str] = None
    total_entries: int = 0
    willing_count: int = 0
    not_yet_count: int = 0

    def to_dict(self) -> Dict:
        return {
            'session_id': self.session_id,
            'user_id': self.user_id,
            'version_number': self.version_number,
            'entries': [e.to_dict() for e in self.entries],
            'step4_session_id': self.step4_session_id,
            'status': self.status,
            'started_at': self.started_at,
            'completed_at': self.completed_at,
            'total_entries': len(self.entries),
            'willing_count': sum(1 for e in self.entries if e.willingness_level >= 7),
            'not_yet_count': sum(1 for e in self.entries if e.willingness_level < 4)
        }

    def update_counts(self):
        """Update entry counts"""
        self.total_entries = len(self.entries)
        self.willing_count = sum(1 for e in self.entries if e.willingness_level >= 7)
        self.not_yet_count = sum(1 for e in self.entries if e.willingness_level < 4)


class Step8ListBuilder:
    """Manager for Step 8 List Builder functionality"""

    def __init__(self):
        # In-memory storage (would be Cosmos DB in production)
        self.lists: Dict[str, Step8List] = {}  # session_id -> Step8List
        self.entries: Dict[str, Step8ListEntry] = {}  # entry_id -> Step8ListEntry

    def create_list(self, user_id: str, step4_session_id: Optional[str] = None, version_number: int = 1) -> Step8List:
        """Create a new Step 8 list for a user"""
        session_id = str(uuid.uuid4())
        new_list = Step8List(
            session_id=session_id,
            user_id=user_id,
            version_number=version_number,
            step4_session_id=step4_session_id
        )
        self.lists[session_id] = new_list
        return new_list

    def get_list(self, session_id: str) -> Optional[Step8List]:
        """Get a Step 8 list by session ID"""
        return self.lists.get(session_id)

    def get_user_lists(self, user_id: str) -> List[Step8List]:
        """Get all Step 8 lists for a user"""
        return [lst for lst in self.lists.values() if lst.user_id == user_id]

    def get_latest_list(self, user_id: str) -> Optional[Step8List]:
        """Get the most recent Step 8 list for a user"""
        user_lists = self.get_user_lists(user_id)
        if not user_lists:
            return None
        return max(user_lists, key=lambda x: x.started_at)

    def add_entry(self, session_id: str, entry_data: Dict) -> Optional[Step8ListEntry]:
        """Add a new entry to a Step 8 list"""
        step8_list = self.lists.get(session_id)
        if not step8_list:
            return None

        # Calculate willingness category from level
        willingness_level = entry_data.get('willingness_level', 5)
        if willingness_level >= 8:
            willingness_category = WillingnessCategory.EAGER.value
        elif willingness_level >= 5:
            willingness_category = WillingnessCategory.WILLING.value
        else:
            willingness_category = WillingnessCategory.NOT_YET.value

        entry = Step8ListEntry(
            id=str(uuid.uuid4()),
            user_id=step8_list.user_id,
            session_id=session_id,
            person_or_institution=entry_data.get('person_or_institution', ''),
            relationship=entry_data.get('relationship', ''),
            nature_of_harm=entry_data.get('nature_of_harm', ''),
            willingness_level=willingness_level,
            willingness_category=willingness_category,
            from_step4_resentment_id=entry_data.get('from_step4_resentment_id'),
            from_step4_harm_id=entry_data.get('from_step4_harm_id'),
            fears_about_amends=entry_data.get('fears_about_amends', ''),
            notes=entry_data.get('notes', '')
        )

        step8_list.entries.append(entry)
        step8_list.update_counts()
        self.entries[entry.id] = entry

        return entry

    def update_entry(self, entry_id: str, updates: Dict) -> Optional[Step8ListEntry]:
        """Update an existing entry"""
        entry = self.entries.get(entry_id)
        if not entry:
            return None

        # Update allowed fields
        for field in ['person_or_institution', 'relationship', 'nature_of_harm',
                      'willingness_level', 'fears_about_amends', 'notes']:
            if field in updates:
                setattr(entry, field, updates[field])

        # Recalculate willingness category if level changed
        if 'willingness_level' in updates:
            level = updates['willingness_level']
            if level >= 8:
                entry.willingness_category = WillingnessCategory.EAGER.value
            elif level >= 5:
                entry.willingness_category = WillingnessCategory.WILLING.value
            else:
                entry.willingness_category = WillingnessCategory.NOT_YET.value

        entry.updated_at = datetime.utcnow().isoformat()

        # Update parent list counts
        step8_list = self.lists.get(entry.session_id)
        if step8_list:
            step8_list.update_counts()

        return entry

    def delete_entry(self, entry_id: str) -> bool:
        """Delete an entry from a Step 8 list"""
        entry = self.entries.get(entry_id)
        if not entry:
            return False

        # Remove from list
        step8_list = self.lists.get(entry.session_id)
        if step8_list:
            step8_list.entries = [e for e in step8_list.entries if e.id != entry_id]
            step8_list.update_counts()

        del self.entries[entry_id]
        return True

    def get_step4_suggestions(self, user_id: str, step4_data: Dict) -> List[Dict]:
        """
        Extract suggestions from Step 4 data (resentments and harms).
        This would integrate with the Step 4 workbook data.
        """
        suggestions = []

        # Extract from resentments
        resentments = step4_data.get('resentments', [])
        for r in resentments:
            suggestions.append({
                'person_or_institution': r.get('who', ''),
                'relationship': 'resentment',
                'nature_of_harm': f"Resentment: {r.get('cause', '')}",
                'from_step4_resentment_id': r.get('id'),
                'source': 'step4_resentment'
            })

        # Extract from harms done
        harms = step4_data.get('harms_done', [])
        for h in harms:
            suggestions.append({
                'person_or_institution': h.get('who', ''),
                'relationship': 'harm',
                'nature_of_harm': h.get('what_i_did', ''),
                'from_step4_harm_id': h.get('id'),
                'source': 'step4_harm'
            })

        # Deduplicate by person name
        seen = set()
        unique_suggestions = []
        for s in suggestions:
            name = s['person_or_institution'].lower().strip()
            if name and name not in seen:
                seen.add(name)
                unique_suggestions.append(s)

        return unique_suggestions

    def complete_list(self, session_id: str) -> Optional[Step8List]:
        """Mark a Step 8 list as completed"""
        step8_list = self.lists.get(session_id)
        if not step8_list:
            return None

        step8_list.status = "completed"
        step8_list.completed_at = datetime.utcnow().isoformat()

        return step8_list

    def get_reflection_questions(self) -> List[Dict]:
        """Get reflection questions for Step 8"""
        return [
            {
                "id": "s8_reflect_1",
                "question": "Looking at your list, what patterns do you notice in the types of harm you've caused?",
                "hint": "Consider relationships, work, finances, honesty, etc."
            },
            {
                "id": "s8_reflect_2",
                "question": "For those you marked as 'not yet willing,' what is blocking your willingness?",
                "hint": "Fear? Resentment? Pride? Justify to yourself?"
            },
            {
                "id": "s8_reflect_3",
                "question": "The Big Book says we must be willing to make amends to 'ALL' persons (p.76). Are you willing to go to any lengths?",
                "hint": "Consider what 'any lengths' means to you."
            },
            {
                "id": "s8_reflect_4",
                "question": "Have you included yourself on this list? How have you harmed yourself?",
                "hint": "Self-harm includes neglect, self-destructive behavior, broken promises to self."
            }
        ]


# Global instance
step8_builder = Step8ListBuilder()


def get_step8_builder() -> Step8ListBuilder:
    """Get the global Step 8 List Builder instance"""
    return step8_builder
