#!/usr/bin/env python3
"""
Step 12 Service Tracker Module
Track service work, sponsorship, and carrying the message
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime, date, timedelta
from enum import Enum
import uuid


class ServiceCategory(Enum):
    """Categories of service work"""
    MEETING_SERVICE = "meeting_service"
    SPONSORSHIP = "sponsorship"
    TWELFTH_STEP_CALLS = "twelfth_step_calls"
    GENERAL_SERVICE = "general_service"
    INFORMAL_SERVICE = "informal_service"
    HOSPITAL_INSTITUTION = "hospital_institution"
    PHONE_SERVICE = "phone_service"
    OTHER = "other"


# Service type descriptions for UI
SERVICE_TYPE_INFO = {
    ServiceCategory.MEETING_SERVICE: {
        "name": "Meeting Service",
        "description": "Service positions at meetings",
        "examples": [
            "Greeter/Welcome",
            "Coffee Maker",
            "Chair/Meeting Leader",
            "Speaker",
            "Secretary",
            "Treasurer",
            "Literature Person",
            "Set Up/Clean Up"
        ]
    },
    ServiceCategory.SPONSORSHIP: {
        "name": "Sponsorship",
        "description": "Working with sponsees",
        "examples": [
            "Meeting with sponsee",
            "Taking phone calls",
            "Step work",
            "Being available for crisis"
        ]
    },
    ServiceCategory.TWELFTH_STEP_CALLS: {
        "name": "Twelfth Step Calls",
        "description": "Carrying the message directly",
        "examples": [
            "Visiting newcomers",
            "Hospital visits",
            "Treatment center panels",
            "Jail/prison meetings",
            "Speaking at outside meetings"
        ]
    },
    ServiceCategory.GENERAL_SERVICE: {
        "name": "General Service",
        "description": "AA structure service",
        "examples": [
            "GSR (Group Service Rep)",
            "District Committee",
            "Area Service",
            "Intergroup Rep",
            "Central Office volunteer",
            "Convention/Assembly work"
        ]
    },
    ServiceCategory.INFORMAL_SERVICE: {
        "name": "Informal Service",
        "description": "Everyday AA service",
        "examples": [
            "Phone list calls",
            "Picking up newcomers",
            "Taking someone to a meeting",
            "Fellowship/coffee after meeting",
            "Being available"
        ]
    },
    ServiceCategory.HOSPITAL_INSTITUTION: {
        "name": "Hospital & Institution",
        "description": "H&I Committee work",
        "examples": [
            "H&I Panel member",
            "H&I Committee chair",
            "Detox meetings",
            "Rehab meetings"
        ]
    },
    ServiceCategory.PHONE_SERVICE: {
        "name": "Phone Service",
        "description": "Hotline and phone work",
        "examples": [
            "AA Hotline volunteer",
            "Answering service",
            "12th Step call dispatcher"
        ]
    },
    ServiceCategory.OTHER: {
        "name": "Other Service",
        "description": "Other forms of service",
        "examples": []
    }
}


@dataclass
class ServiceLogEntry:
    """A logged service activity"""
    entry_id: str
    user_id: str
    date: date
    category: ServiceCategory
    service_type: str
    description: str
    duration_minutes: int
    notes: Optional[str] = None
    people_helped: int = 0
    created_at: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> Dict[str, Any]:
        return {
            'entryId': self.entry_id,
            'userId': self.user_id,
            'date': self.date.isoformat(),
            'category': self.category.value,
            'serviceType': self.service_type,
            'description': self.description,
            'durationMinutes': self.duration_minutes,
            'notes': self.notes,
            'peopleHelped': self.people_helped,
            'createdAt': self.created_at.isoformat()
        }


@dataclass
class Sponsee:
    """A person being sponsored"""
    sponsee_id: str
    user_id: str  # The sponsor's user ID
    name: str
    sobriety_date: Optional[date] = None
    current_step: int = 1
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True
    started_sponsoring: date = field(default_factory=date.today)
    created_at: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> Dict[str, Any]:
        return {
            'sponseeId': self.sponsee_id,
            'userId': self.user_id,
            'name': self.name,
            'sobrietyDate': self.sobriety_date.isoformat() if self.sobriety_date else None,
            'currentStep': self.current_step,
            'phone': self.phone,
            'email': self.email,
            'notes': self.notes,
            'isActive': self.is_active,
            'startedSponsoring': self.started_sponsoring.isoformat(),
            'createdAt': self.created_at.isoformat()
        }


@dataclass
class TwelfthStepExperience:
    """A documented 12th step experience"""
    experience_id: str
    user_id: str
    date: date
    situation: str  # What was the situation?
    what_shared: str  # What did you share?
    how_received: str  # How was it received?
    outcome: Optional[str] = None  # What happened?
    spiritual_growth: Optional[str] = None  # What did you learn?
    follow_up_needed: bool = False
    created_at: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> Dict[str, Any]:
        return {
            'experienceId': self.experience_id,
            'userId': self.user_id,
            'date': self.date.isoformat(),
            'situation': self.situation,
            'whatShared': self.what_shared,
            'howReceived': self.how_received,
            'outcome': self.outcome,
            'spiritualGrowth': self.spiritual_growth,
            'followUpNeeded': self.follow_up_needed,
            'createdAt': self.created_at.isoformat()
        }


@dataclass
class ServiceCommitment:
    """A recurring service commitment"""
    commitment_id: str
    user_id: str
    category: ServiceCategory
    service_type: str
    description: str
    frequency: str  # "weekly", "monthly", "as_needed"
    day_of_week: Optional[int] = None  # 0=Monday, 6=Sunday
    meeting_name: Optional[str] = None
    start_date: date = field(default_factory=date.today)
    end_date: Optional[date] = None
    is_active: bool = True
    created_at: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> Dict[str, Any]:
        return {
            'commitmentId': self.commitment_id,
            'userId': self.user_id,
            'category': self.category.value,
            'serviceType': self.service_type,
            'description': self.description,
            'frequency': self.frequency,
            'dayOfWeek': self.day_of_week,
            'meetingName': self.meeting_name,
            'startDate': self.start_date.isoformat(),
            'endDate': self.end_date.isoformat() if self.end_date else None,
            'isActive': self.is_active,
            'createdAt': self.created_at.isoformat()
        }


class Step12ServiceTracker:
    """Tracker for Step 12 service work"""

    # AA Responsibility Declaration
    RESPONSIBILITY_DECLARATION = """I am responsible. When anyone, anywhere, reaches out for help, I want the hand of A.A. always to be there. And for that: I am responsible."""

    def __init__(self):
        self.service_logs: Dict[str, List[ServiceLogEntry]] = {}  # user_id -> entries
        self.sponsees: Dict[str, List[Sponsee]] = {}  # user_id -> sponsees
        self.experiences: Dict[str, List[TwelfthStepExperience]] = {}  # user_id -> experiences
        self.commitments: Dict[str, List[ServiceCommitment]] = {}  # user_id -> commitments

    def get_responsibility_declaration(self) -> Dict[str, Any]:
        """Get the AA Responsibility Declaration"""
        return {
            'title': 'AA Responsibility Declaration',
            'text': self.RESPONSIBILITY_DECLARATION,
            'source': '1965 AA International Convention, Toronto'
        }

    def get_service_categories(self) -> List[Dict[str, Any]]:
        """Get all service categories with descriptions"""
        return [
            {
                'category': cat.value,
                'name': info['name'],
                'description': info['description'],
                'examples': info['examples']
            }
            for cat, info in SERVICE_TYPE_INFO.items()
        ]

    def log_service(
        self,
        user_id: str,
        category: str,
        service_type: str,
        description: str,
        duration_minutes: int,
        service_date: Optional[date] = None,
        notes: Optional[str] = None,
        people_helped: int = 0
    ) -> ServiceLogEntry:
        """Log a service activity"""
        entry = ServiceLogEntry(
            entry_id=str(uuid.uuid4()),
            user_id=user_id,
            date=service_date or date.today(),
            category=ServiceCategory(category),
            service_type=service_type,
            description=description,
            duration_minutes=duration_minutes,
            notes=notes,
            people_helped=people_helped
        )

        if user_id not in self.service_logs:
            self.service_logs[user_id] = []
        self.service_logs[user_id].append(entry)

        return entry

    def get_service_history(
        self,
        user_id: str,
        days: int = 90,
        category: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get service history for user"""
        entries = self.service_logs.get(user_id, [])
        cutoff = date.today() - timedelta(days=days)

        filtered = [e for e in entries if e.date >= cutoff]

        if category:
            filtered = [e for e in filtered if e.category.value == category]

        return [e.to_dict() for e in sorted(filtered, key=lambda x: x.date, reverse=True)]

    def get_service_summary(
        self,
        user_id: str,
        period: str = "month"  # "week", "month", "year", "all"
    ) -> Dict[str, Any]:
        """Get service summary statistics"""
        entries = self.service_logs.get(user_id, [])

        if period == "week":
            cutoff = date.today() - timedelta(days=7)
        elif period == "month":
            cutoff = date.today() - timedelta(days=30)
        elif period == "year":
            cutoff = date.today() - timedelta(days=365)
        else:
            cutoff = date.min

        filtered = [e for e in entries if e.date >= cutoff]

        # Total stats
        total_hours = sum(e.duration_minutes for e in filtered) / 60
        total_entries = len(filtered)
        total_people = sum(e.people_helped for e in filtered)

        # By category
        by_category = {}
        for entry in filtered:
            cat = entry.category.value
            if cat not in by_category:
                by_category[cat] = {'entries': 0, 'minutes': 0, 'peopleHelped': 0}
            by_category[cat]['entries'] += 1
            by_category[cat]['minutes'] += entry.duration_minutes
            by_category[cat]['peopleHelped'] += entry.people_helped

        return {
            'period': period,
            'totalHours': round(total_hours, 1),
            'totalEntries': total_entries,
            'totalPeopleHelped': total_people,
            'byCategory': by_category,
            'activeCommitments': len([c for c in self.commitments.get(user_id, []) if c.is_active]),
            'activeSponsees': len([s for s in self.sponsees.get(user_id, []) if s.is_active])
        }

    def add_sponsee(
        self,
        user_id: str,
        name: str,
        sobriety_date: Optional[date] = None,
        current_step: int = 1,
        phone: Optional[str] = None,
        email: Optional[str] = None,
        notes: Optional[str] = None
    ) -> Sponsee:
        """Add a new sponsee"""
        sponsee = Sponsee(
            sponsee_id=str(uuid.uuid4()),
            user_id=user_id,
            name=name,
            sobriety_date=sobriety_date,
            current_step=current_step,
            phone=phone,
            email=email,
            notes=notes
        )

        if user_id not in self.sponsees:
            self.sponsees[user_id] = []
        self.sponsees[user_id].append(sponsee)

        return sponsee

    def update_sponsee(
        self,
        sponsee_id: str,
        current_step: Optional[int] = None,
        notes: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> Optional[Sponsee]:
        """Update sponsee information"""
        for user_sponsees in self.sponsees.values():
            for sponsee in user_sponsees:
                if sponsee.sponsee_id == sponsee_id:
                    if current_step is not None:
                        sponsee.current_step = current_step
                    if notes is not None:
                        sponsee.notes = notes
                    if is_active is not None:
                        sponsee.is_active = is_active
                    return sponsee
        return None

    def get_sponsees(self, user_id: str, active_only: bool = True) -> List[Dict[str, Any]]:
        """Get list of sponsees"""
        sponsees = self.sponsees.get(user_id, [])
        if active_only:
            sponsees = [s for s in sponsees if s.is_active]
        return [s.to_dict() for s in sponsees]

    def log_twelfth_step_experience(
        self,
        user_id: str,
        situation: str,
        what_shared: str,
        how_received: str,
        experience_date: Optional[date] = None,
        outcome: Optional[str] = None,
        spiritual_growth: Optional[str] = None,
        follow_up_needed: bool = False
    ) -> TwelfthStepExperience:
        """Log a 12th step experience"""
        experience = TwelfthStepExperience(
            experience_id=str(uuid.uuid4()),
            user_id=user_id,
            date=experience_date or date.today(),
            situation=situation,
            what_shared=what_shared,
            how_received=how_received,
            outcome=outcome,
            spiritual_growth=spiritual_growth,
            follow_up_needed=follow_up_needed
        )

        if user_id not in self.experiences:
            self.experiences[user_id] = []
        self.experiences[user_id].append(experience)

        return experience

    def get_twelfth_step_experiences(
        self,
        user_id: str,
        days: int = 365
    ) -> List[Dict[str, Any]]:
        """Get 12th step experiences"""
        experiences = self.experiences.get(user_id, [])
        cutoff = date.today() - timedelta(days=days)
        filtered = [e for e in experiences if e.date >= cutoff]
        return [e.to_dict() for e in sorted(filtered, key=lambda x: x.date, reverse=True)]

    def add_commitment(
        self,
        user_id: str,
        category: str,
        service_type: str,
        description: str,
        frequency: str,
        day_of_week: Optional[int] = None,
        meeting_name: Optional[str] = None
    ) -> ServiceCommitment:
        """Add a service commitment"""
        commitment = ServiceCommitment(
            commitment_id=str(uuid.uuid4()),
            user_id=user_id,
            category=ServiceCategory(category),
            service_type=service_type,
            description=description,
            frequency=frequency,
            day_of_week=day_of_week,
            meeting_name=meeting_name
        )

        if user_id not in self.commitments:
            self.commitments[user_id] = []
        self.commitments[user_id].append(commitment)

        return commitment

    def get_commitments(self, user_id: str, active_only: bool = True) -> List[Dict[str, Any]]:
        """Get service commitments"""
        commitments = self.commitments.get(user_id, [])
        if active_only:
            commitments = [c for c in commitments if c.is_active]
        return [c.to_dict() for c in commitments]

    def get_step12_guide(self) -> Dict[str, Any]:
        """Get complete Step 12 guide content"""
        return {
            'stepNumber': 12,
            'stepText': "Having had a spiritual awakening as the result of these steps, we tried to carry this message to alcoholics, and to practice these principles in all our affairs.",
            'responsibilityDeclaration': self.get_responsibility_declaration(),
            'serviceCategories': self.get_service_categories(),
            'spiritualPrinciples': [
                {'step': 1, 'principle': 'Honesty'},
                {'step': 2, 'principle': 'Hope'},
                {'step': 3, 'principle': 'Faith'},
                {'step': 4, 'principle': 'Courage'},
                {'step': 5, 'principle': 'Integrity'},
                {'step': 6, 'principle': 'Willingness'},
                {'step': 7, 'principle': 'Humility'},
                {'step': 8, 'principle': 'Brotherly Love'},
                {'step': 9, 'principle': 'Justice'},
                {'step': 10, 'principle': 'Perseverance'},
                {'step': 11, 'principle': 'Spiritual Awareness'},
                {'step': 12, 'principle': 'Service'}
            ],
            'meditationTexts': [
                {
                    'source': 'Big Book',
                    'pageReference': 'p. 89',
                    'text': "Practical experience shows that nothing will so much insure immunity from drinking as intensive work with other alcoholics. It works when other activities fail."
                },
                {
                    'source': 'Big Book',
                    'pageReference': 'p. 89',
                    'text': "You can help when no one else can. You can secure their confidence when others fail. Remember they are very ill."
                },
                {
                    'source': '12&12',
                    'pageReference': 'Step 12',
                    'text': "The joy of living is the theme of A.A.'s Twelfth Step, and action is its key word. Here we turn outward toward our fellow alcoholics who are still in distress."
                }
            ],
            'journalQuestions': [
                "How would you describe your spiritual awakening?",
                "In what ways are you carrying the message to alcoholics?",
                "How are you practicing these principles in ALL your affairs?",
                "What service commitments do you currently have?",
                "How has service work affected your sobriety?",
                "What have you learned from those you sponsor?",
                "Where are you being called to serve next?"
            ]
        }


# ============================================================================
# TEST
# ============================================================================
if __name__ == "__main__":
    print("Step 12 Service Tracker Test")
    print("=" * 50)

    tracker = Step12ServiceTracker()

    # Get responsibility declaration
    print("\nResponsibility Declaration:")
    decl = tracker.get_responsibility_declaration()
    print(f"  {decl['text'][:50]}...")

    # Get service categories
    print("\nService Categories:")
    for cat in tracker.get_service_categories():
        print(f"  - {cat['name']}: {cat['description']}")

    # Log some service
    print("\nLogging service...")
    entry = tracker.log_service(
        user_id="test_user",
        category="meeting_service",
        service_type="Coffee Maker",
        description="Made coffee for Saturday morning meeting",
        duration_minutes=30
    )
    print(f"  Logged: {entry.service_type}")

    # Add sponsee
    print("\nAdding sponsee...")
    sponsee = tracker.add_sponsee(
        user_id="test_user",
        name="John D.",
        current_step=3
    )
    print(f"  Added: {sponsee.name} on Step {sponsee.current_step}")

    # Get summary
    print("\nService Summary:")
    summary = tracker.get_service_summary("test_user", "month")
    print(f"  Total Hours: {summary['totalHours']}")
    print(f"  Active Sponsees: {summary['activeSponsees']}")
