"""
Step 10 Daily Inventory - Mini Step 4 for Daily Living

Transforms Step 10 into a daily spot-check inventory tool
with evening review (moved from Step 11).
"""

from dataclasses import dataclass, field, asdict
from typing import Optional, List, Dict
from datetime import datetime, date
import uuid


@dataclass
class DailyResentment:
    """A resentment from today's inventory"""
    id: str
    who: str
    what_happened: str
    affects_what: List[str]  # self_esteem, security, ambitions, etc.
    my_part: str
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def to_dict(self) -> Dict:
        return asdict(self)


@dataclass
class DailyFear:
    """A fear from today's inventory"""
    id: str
    fear: str
    why_i_have_it: str
    action_to_take: str
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def to_dict(self) -> Dict:
        return asdict(self)


@dataclass
class DailyAmend:
    """An amend owed from today"""
    id: str
    to_whom: str
    for_what: str
    amend_made: bool = False
    how_made: str = ""
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def to_dict(self) -> Dict:
        return asdict(self)


@dataclass
class EveningReview:
    """Evening review questions from Big Book p.86"""
    was_resentful: bool = False
    resentful_details: str = ""
    was_selfish: bool = False
    selfish_details: str = ""
    was_dishonest: bool = False
    dishonest_details: str = ""
    was_afraid: bool = False
    afraid_details: str = ""
    owe_apology: bool = False
    apology_to_whom: str = ""
    kept_to_myself: bool = False
    kept_what: str = ""
    was_kind_loving: bool = True
    kind_details: str = ""
    could_done_better: str = ""
    gratitude: str = ""
    notes: str = ""

    def to_dict(self) -> Dict:
        return asdict(self)


@dataclass
class DailyInventory:
    """A complete daily inventory for one day"""
    id: str
    user_id: str
    inventory_date: str  # YYYY-MM-DD format
    resentments: List[DailyResentment] = field(default_factory=list)
    fears: List[DailyFear] = field(default_factory=list)
    selfishness_notes: str = ""
    dishonesty_notes: str = ""
    amends_owed: List[DailyAmend] = field(default_factory=list)
    evening_review: Optional[EveningReview] = None
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def to_dict(self) -> Dict:
        return {
            'id': self.id,
            'user_id': self.user_id,
            'inventory_date': self.inventory_date,
            'resentments': [r.to_dict() for r in self.resentments],
            'fears': [f.to_dict() for f in self.fears],
            'selfishness_notes': self.selfishness_notes,
            'dishonesty_notes': self.dishonesty_notes,
            'amends_owed': [a.to_dict() for a in self.amends_owed],
            'evening_review': self.evening_review.to_dict() if self.evening_review else None,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
            'summary': self.get_summary()
        }

    def get_summary(self) -> Dict:
        """Get summary stats for this day"""
        return {
            'resentment_count': len(self.resentments),
            'fear_count': len(self.fears),
            'amends_count': len(self.amends_owed),
            'amends_made_count': sum(1 for a in self.amends_owed if a.amend_made),
            'has_evening_review': self.evening_review is not None,
            'has_selfishness_notes': bool(self.selfishness_notes),
            'has_dishonesty_notes': bool(self.dishonesty_notes)
        }


class Step10DailyInventoryManager:
    """Manager for Step 10 Daily Inventory functionality"""

    def __init__(self):
        # In-memory storage (would be Cosmos DB in production)
        self.inventories: Dict[str, DailyInventory] = {}  # id -> DailyInventory
        self.user_date_index: Dict[str, str] = {}  # "user_id:date" -> inventory_id

    def _get_key(self, user_id: str, inventory_date: str) -> str:
        """Generate lookup key for user+date"""
        return f"{user_id}:{inventory_date}"

    def get_or_create_today(self, user_id: str) -> DailyInventory:
        """Get or create today's inventory for a user"""
        today = date.today().isoformat()
        return self.get_or_create_for_date(user_id, today)

    def get_or_create_for_date(self, user_id: str, inventory_date: str) -> DailyInventory:
        """Get or create an inventory for a specific date"""
        key = self._get_key(user_id, inventory_date)

        if key in self.user_date_index:
            return self.inventories[self.user_date_index[key]]

        # Create new inventory
        inventory = DailyInventory(
            id=str(uuid.uuid4()),
            user_id=user_id,
            inventory_date=inventory_date
        )

        self.inventories[inventory.id] = inventory
        self.user_date_index[key] = inventory.id

        return inventory

    def get_inventory(self, inventory_id: str) -> Optional[DailyInventory]:
        """Get an inventory by ID"""
        return self.inventories.get(inventory_id)

    def get_user_inventory_for_date(self, user_id: str, inventory_date: str) -> Optional[DailyInventory]:
        """Get a user's inventory for a specific date"""
        key = self._get_key(user_id, inventory_date)
        if key in self.user_date_index:
            return self.inventories.get(self.user_date_index[key])
        return None

    def get_user_history(self, user_id: str, days: int = 30) -> List[DailyInventory]:
        """Get inventory history for a user"""
        user_inventories = [inv for inv in self.inventories.values() if inv.user_id == user_id]
        # Sort by date descending
        user_inventories.sort(key=lambda x: x.inventory_date, reverse=True)
        return user_inventories[:days]

    # ========================================
    # Resentment methods
    # ========================================

    def add_resentment(self, inventory_id: str, data: Dict) -> Optional[DailyResentment]:
        """Add a resentment to today's inventory"""
        inventory = self.inventories.get(inventory_id)
        if not inventory:
            return None

        resentment = DailyResentment(
            id=str(uuid.uuid4()),
            who=data.get('who', ''),
            what_happened=data.get('what_happened', ''),
            affects_what=data.get('affects_what', []),
            my_part=data.get('my_part', '')
        )

        inventory.resentments.append(resentment)
        inventory.updated_at = datetime.utcnow().isoformat()

        return resentment

    def update_resentment(self, inventory_id: str, resentment_id: str, data: Dict) -> Optional[DailyResentment]:
        """Update a resentment"""
        inventory = self.inventories.get(inventory_id)
        if not inventory:
            return None

        for r in inventory.resentments:
            if r.id == resentment_id:
                if 'who' in data:
                    r.who = data['who']
                if 'what_happened' in data:
                    r.what_happened = data['what_happened']
                if 'affects_what' in data:
                    r.affects_what = data['affects_what']
                if 'my_part' in data:
                    r.my_part = data['my_part']
                inventory.updated_at = datetime.utcnow().isoformat()
                return r

        return None

    def delete_resentment(self, inventory_id: str, resentment_id: str) -> bool:
        """Delete a resentment"""
        inventory = self.inventories.get(inventory_id)
        if not inventory:
            return False

        original_count = len(inventory.resentments)
        inventory.resentments = [r for r in inventory.resentments if r.id != resentment_id]

        if len(inventory.resentments) < original_count:
            inventory.updated_at = datetime.utcnow().isoformat()
            return True
        return False

    # ========================================
    # Fear methods
    # ========================================

    def add_fear(self, inventory_id: str, data: Dict) -> Optional[DailyFear]:
        """Add a fear to today's inventory"""
        inventory = self.inventories.get(inventory_id)
        if not inventory:
            return None

        fear = DailyFear(
            id=str(uuid.uuid4()),
            fear=data.get('fear', ''),
            why_i_have_it=data.get('why_i_have_it', ''),
            action_to_take=data.get('action_to_take', '')
        )

        inventory.fears.append(fear)
        inventory.updated_at = datetime.utcnow().isoformat()

        return fear

    def delete_fear(self, inventory_id: str, fear_id: str) -> bool:
        """Delete a fear"""
        inventory = self.inventories.get(inventory_id)
        if not inventory:
            return False

        original_count = len(inventory.fears)
        inventory.fears = [f for f in inventory.fears if f.id != fear_id]

        if len(inventory.fears) < original_count:
            inventory.updated_at = datetime.utcnow().isoformat()
            return True
        return False

    # ========================================
    # Amends owed methods
    # ========================================

    def add_amend(self, inventory_id: str, data: Dict) -> Optional[DailyAmend]:
        """Add an amend owed today"""
        inventory = self.inventories.get(inventory_id)
        if not inventory:
            return None

        amend = DailyAmend(
            id=str(uuid.uuid4()),
            to_whom=data.get('to_whom', ''),
            for_what=data.get('for_what', ''),
            amend_made=data.get('amend_made', False),
            how_made=data.get('how_made', '')
        )

        inventory.amends_owed.append(amend)
        inventory.updated_at = datetime.utcnow().isoformat()

        return amend

    def mark_amend_made(self, inventory_id: str, amend_id: str, how_made: str = "") -> Optional[DailyAmend]:
        """Mark an amend as made"""
        inventory = self.inventories.get(inventory_id)
        if not inventory:
            return None

        for a in inventory.amends_owed:
            if a.id == amend_id:
                a.amend_made = True
                a.how_made = how_made
                inventory.updated_at = datetime.utcnow().isoformat()
                return a

        return None

    # ========================================
    # Selfishness/Dishonesty notes
    # ========================================

    def update_selfishness_notes(self, inventory_id: str, notes: str) -> bool:
        """Update selfishness notes"""
        inventory = self.inventories.get(inventory_id)
        if not inventory:
            return False

        inventory.selfishness_notes = notes
        inventory.updated_at = datetime.utcnow().isoformat()
        return True

    def update_dishonesty_notes(self, inventory_id: str, notes: str) -> bool:
        """Update dishonesty notes"""
        inventory = self.inventories.get(inventory_id)
        if not inventory:
            return False

        inventory.dishonesty_notes = notes
        inventory.updated_at = datetime.utcnow().isoformat()
        return True

    # ========================================
    # Evening review methods
    # ========================================

    def save_evening_review(self, inventory_id: str, data: Dict) -> Optional[EveningReview]:
        """Save evening review for a day"""
        inventory = self.inventories.get(inventory_id)
        if not inventory:
            return None

        review = EveningReview(
            was_resentful=data.get('was_resentful', False),
            resentful_details=data.get('resentful_details', ''),
            was_selfish=data.get('was_selfish', False),
            selfish_details=data.get('selfish_details', ''),
            was_dishonest=data.get('was_dishonest', False),
            dishonest_details=data.get('dishonest_details', ''),
            was_afraid=data.get('was_afraid', False),
            afraid_details=data.get('afraid_details', ''),
            owe_apology=data.get('owe_apology', False),
            apology_to_whom=data.get('apology_to_whom', ''),
            kept_to_myself=data.get('kept_to_myself', False),
            kept_what=data.get('kept_what', ''),
            was_kind_loving=data.get('was_kind_loving', True),
            kind_details=data.get('kind_details', ''),
            could_done_better=data.get('could_done_better', ''),
            gratitude=data.get('gratitude', ''),
            notes=data.get('notes', '')
        )

        inventory.evening_review = review
        inventory.updated_at = datetime.utcnow().isoformat()

        return review

    # ========================================
    # Static content
    # ========================================

    def get_step10_prayer(self) -> Dict:
        """Get the Step 10 prayer"""
        return {
            'title': 'Step 10 Prayer',
            'text': 'God, help me to watch for selfishness, dishonesty, resentment, and fear. When these arise, let me ask You to remove them at once. Help me to discuss them with someone immediately and make amends quickly if I have harmed anyone. Help me to turn my thoughts to someone I can help.',
            'source': 'Based on Big Book, p. 84'
        }

    def get_affects_options(self) -> List[Dict]:
        """Get the 'affects my' options for resentment inventory"""
        return [
            {'id': 'self_esteem', 'label': 'Self-Esteem', 'description': 'My sense of self-worth'},
            {'id': 'security', 'label': 'Security', 'description': 'Financial, emotional, physical'},
            {'id': 'ambitions', 'label': 'Ambitions', 'description': 'My goals and desires'},
            {'id': 'personal_relations', 'label': 'Personal Relations', 'description': 'Relationships with others'},
            {'id': 'sex_relations', 'label': 'Sex Relations', 'description': 'Intimate relationships'},
            {'id': 'pride', 'label': 'Pride', 'description': 'My ego and self-image'}
        ]

    def get_evening_review_questions(self) -> List[Dict]:
        """Get the evening review questions based on Big Book p.86"""
        return [
            {
                'id': 'was_resentful',
                'question': 'Was I resentful today?',
                'follow_up': 'If so, what/who about?',
                'source': 'Big Book p.86'
            },
            {
                'id': 'was_selfish',
                'question': 'Was I selfish today?',
                'follow_up': 'How?',
                'source': 'Big Book p.86'
            },
            {
                'id': 'was_dishonest',
                'question': 'Was I dishonest today?',
                'follow_up': 'In what way?',
                'source': 'Big Book p.86'
            },
            {
                'id': 'was_afraid',
                'question': 'Was I afraid today?',
                'follow_up': 'Of what?',
                'source': 'Big Book p.86'
            },
            {
                'id': 'owe_apology',
                'question': 'Do I owe anyone an apology?',
                'follow_up': 'To whom and for what?',
                'source': 'Big Book p.86'
            },
            {
                'id': 'kept_to_myself',
                'question': 'Have I kept something to myself which should be discussed with another person at once?',
                'follow_up': 'What?',
                'source': 'Big Book p.86'
            },
            {
                'id': 'was_kind_loving',
                'question': 'Was I kind and loving toward all?',
                'follow_up': 'Reflect on your interactions.',
                'source': 'Big Book p.86'
            },
            {
                'id': 'could_done_better',
                'question': 'What could I have done better?',
                'follow_up': 'Think about your day.',
                'source': 'Big Book p.86'
            },
            {
                'id': 'gratitude',
                'question': 'What am I grateful for today?',
                'follow_up': 'List 3-5 things.',
                'source': 'Suggested addition'
            }
        ]

    def get_step10_guidance(self) -> List[Dict]:
        """Get Step 10 guidance"""
        return [
            {
                'id': 'continue_inventory',
                'title': 'Continue to Take Personal Inventory',
                'content': '"Continue to watch for selfishness, dishonesty, resentment, and fear. When these crop up, we ask God at once to remove them. We discuss them with someone immediately and make amends quickly if we have harmed anyone." (Big Book, p.84)'
            },
            {
                'id': 'spot_check',
                'title': 'Spot-Check Inventory',
                'content': 'Throughout the day, pause to check: Am I being resentful, dishonest, selfish, or afraid? If so, deal with it immediately.'
            },
            {
                'id': 'prompt_amends',
                'title': 'Prompt Amends',
                'content': '"Then we resolutely turn our thoughts to someone we can help." When we find we have harmed someone, we make amends promptly - don\'t let it fester.'
            },
            {
                'id': 'nightly_review',
                'title': 'Nightly Review',
                'content': '"After making our review... we ask God\'s forgiveness and inquire what corrective measures should be taken." (Big Book, p.86)'
            }
        ]


# Global instance
step10_manager = Step10DailyInventoryManager()


def get_step10_manager() -> Step10DailyInventoryManager:
    """Get the global Step 10 Daily Inventory Manager instance"""
    return step10_manager
